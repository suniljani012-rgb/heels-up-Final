// worker/src/routes/reviews.js
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function reviewsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/reviews', '') || '/';
    const method = request.method;

    // GET /api/reviews/latest — latest approved reviews (publicly accessible)
    if (path === '/latest' && method === 'GET') {
        try {
            // Check KV edge cache first (10 min TTL — reviews don't change every second)
            if (env.KV) {
                try {
                    const cached = await env.KV.get('cache:reviews:latest', 'json');
                    if (cached) return list(cached);
                } catch {}
            }

            const reviews = await env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply,
                        (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name,
                        p.name as product_name, p.id as product_id
                 FROM product_reviews r 
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN products p ON r.product_id = p.id
                 WHERE r.status = 'approved' 
                 ORDER BY r.created_at DESC 
                 LIMIT 20`
            ).all();
            const results = reviews.results || [];

            // Store in KV for 10 minutes
            if (env.KV && results.length > 0) {
                try {
                    await env.KV.put('cache:reviews:latest', JSON.stringify(results), { expirationTtl: 600 });
                } catch {}
            }

            return list(results);
        } catch (e) {
            console.error('Fetch latest reviews error:', e);
            return serverError('Failed to fetch latest reviews');
        }
    }

    // GET /api/reviews?product_id=X
    if (path === '/' && method === 'GET') {
        const productId = url.searchParams.get('product_id');
        if (!productId) return list([]);
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
           FROM product_reviews r LEFT JOIN users u ON r.user_id = u.id
           WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC`
            ).bind(productId).all();
            return list(reviews.results || []);
        } catch (e) {
            console.error('Fetch reviews error:', e);
            return serverError('Failed to fetch reviews');
        }
    }

    // POST /api/reviews
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAuth(request, env);
        if (authError) return authError;
        try {
            const { product_id, rating, title, body, order_id } = await request.json();
            if (!product_id || !rating) return error('Product ID and rating required');
            if (rating < 1 || rating > 5) return error('Rating must be 1-5');

            await env.DB.prepare(
                "INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))"
            ).bind(product_id, user.id, order_id || null, rating, title || null, body || null).run();

            return created(null, 'Review submitted — pending approval');
        } catch (e) {
            console.error('Submit review error:', e);
            return serverError('Failed to submit review');
        }
    }

    // GET /api/reviews/admin/all
    if (path === '/admin/all' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.*, p.name as product_name, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
           FROM product_reviews r JOIN products p ON r.product_id = p.id LEFT JOIN users u ON r.user_id = u.id
           ORDER BY r.created_at DESC`
            ).all();
            const formatted = (reviews.results || []).map(r => ({
                ...r,
                approved: r.status === 'approved'
            }));
            return list(formatted);
        } catch (e) {
            console.error('Admin fetch reviews error:', e);
            return serverError('Failed to fetch reviews');
        }
    }

    // PATCH /api/reviews/:id/approve
    if (path.match(/^\/\d+\/approve$/) && method === 'PATCH') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.match(/(\d+)/)[1];
        try {
            let status = 'approved';
            try {
                const body = await request.json();
                if (body.status) status = body.status;
            } catch {}
            
            const review = await env.DB.prepare("SELECT product_id FROM product_reviews WHERE id = ?").bind(id).first();
            await env.DB.prepare("UPDATE product_reviews SET status = ? WHERE id = ?").bind(status, id).run();
            
            if (review && review.product_id) {
                const prodId = review.product_id;
                await env.DB.prepare(`
                    UPDATE products SET 
                        rating = (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM product_reviews WHERE product_id = ? AND status = 'approved'),
                        review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ? AND status = 'approved')
                    WHERE id = ?
                `).bind(prodId, prodId, prodId).run();
            }

            // Invalidate latest reviews cache so home page reflects the new approval
            if (env.KV) { try { await env.KV.delete('cache:reviews:latest'); } catch {} }
            
            return ok(null, `Review status updated to ${status}`);
        } catch (e) {
            console.error('Approve review error:', e);
            return serverError('Failed to approve review');
        }
    }

    // PATCH /api/reviews/:id/reply
    if (path.match(/^\/\d+\/reply$/) && method === 'PATCH') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.match(/(\d+)/)[1];
        try {
            const { reply } = await request.json();
            await env.DB.prepare("UPDATE product_reviews SET merchant_reply = ? WHERE id = ?").bind(reply, id).run();
            return ok(null, 'Merchant reply submitted');
        } catch (e) {
            console.error('Reply review error:', e);
            return serverError('Failed to save reply');
        }
    }

    // DELETE /api/reviews/:id
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const review = await env.DB.prepare("SELECT product_id FROM product_reviews WHERE id = ?").bind(id).first();
            await env.DB.prepare('DELETE FROM product_reviews WHERE id = ?').bind(id).run();
            
            if (review && review.product_id) {
                const prodId = review.product_id;
                await env.DB.prepare(`
                    UPDATE products SET 
                        rating = (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM product_reviews WHERE product_id = ? AND status = 'approved'),
                        review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ? AND status = 'approved')
                    WHERE id = ?
                `).bind(prodId, prodId, prodId).run();
            }

            // Invalidate latest reviews cache
            if (env.KV) { try { await env.KV.delete('cache:reviews:latest'); } catch {} }
            
        } catch (e) {
            console.error('Delete review error:', e);
            return serverError('Failed to delete review');
        }
    }

    // ============================================================
    // GOOGLE REVIEWS API ENDPOINTS
    // ============================================================

    // GET /api/reviews/google — Public endpoint to get all approved Google Reviews & rating stats
    if (path === '/google' && method === 'GET') {
        try {
            if (env.KV) {
                try {
                    const cached = await env.KV.get('cache:reviews:google', 'json');
                    if (cached) return list(cached);
                } catch {}
            }

            // Check if google_reviews table exists and fetch
            let reviews = [];
            try {
                const res = await env.DB.prepare(
                    `SELECT id, google_review_id, author_name, author_photo_url, rating, review_text, review_date, relative_time_description, merchant_reply, is_featured, created_at
                     FROM google_reviews 
                     WHERE status = 'approved' 
                     ORDER BY is_featured DESC, created_at DESC`
                ).all();
                reviews = res.results || [];
            } catch (err) {
                console.warn('google_reviews table query error (fallback default):', err);
            }

            if (reviews.length === 0) {
                reviews = [
                    { id: 1, author_name: 'Diya Nihalani', author_photo_url: 'https://ui-avatars.com/api/?name=Diya+Nihalani&background=8C6239&color=FFFFFF', rating: 5, review_text: 'Very affordable and best designs here.. must visit recommended. Great visit. Cooperative staff and helpful', relative_time_description: '2 years ago', merchant_reply: null },
                    { id: 2, author_name: 'Hitesh Kumar', author_photo_url: 'https://ui-avatars.com/api/?name=Hitesh+Kumar&background=4A148C&color=FFFFFF', rating: 5, review_text: 'I purchase shoes and heels for my sister she love the product very much ❤comfortable soft and classy shoes and heels you can have here so go ahead do shoping 😁 😚', relative_time_description: '4 years ago', merchant_reply: null },
                    { id: 3, author_name: 'Hemant Hotchandani', author_photo_url: 'https://ui-avatars.com/api/?name=Hemant+Hotchandani&background=1A237E&color=FFFFFF', rating: 5, review_text: 'One Stop store for girl\'s foot wear', relative_time_description: '2 years ago', merchant_reply: null },
                    { id: 4, author_name: 'Ajayraj Prajapat', author_photo_url: 'https://ui-avatars.com/api/?name=Ajayraj+Prajapat&background=E65100&color=FFFFFF', rating: 5, review_text: 'Best& primium smrat look shoes and sleeper collaction i like this and bast range i am happy to shoping in heels up 😋', relative_time_description: '4 years ago', merchant_reply: null },
                    { id: 5, author_name: 'Pratibha Bamaniya', author_photo_url: 'https://ui-avatars.com/api/?name=Pratibha+Bamaniya&background=AA00FF&color=FFFFFF', rating: 5, review_text: 'Best quality shoes with affordable prices. Highly recommend!', relative_time_description: '3 years ago', merchant_reply: null },
                    { id: 6, author_name: 'Bhanu pratap', author_photo_url: 'https://ui-avatars.com/api/?name=Bhanu+pratap&background=0288D1&color=FFFFFF', rating: 5, review_text: 'Very good shop for girls... Highly recommend !', relative_time_description: 'Edited 2 years ago', merchant_reply: null },
                    { id: 7, author_name: 'Kumer Detha', author_photo_url: 'https://ui-avatars.com/api/?name=Kumer+Detha&background=795548&color=FFFFFF', rating: 5, review_text: 'Good', relative_time_description: '7 months ago', merchant_reply: null },
                    { id: 8, author_name: 'Mitesh Khatri', author_photo_url: 'https://ui-avatars.com/api/?name=Mitesh+Khatri&background=BF360C&color=FFFFFF', rating: 5, review_text: 'Best and superior quality products on affordable prices.', relative_time_description: '4 years ago', merchant_reply: null },
                    { id: 9, author_name: 'Rajkumar', author_photo_url: 'https://ui-avatars.com/api/?name=Rajkumar&background=00897B&color=FFFFFF', rating: 5, review_text: 'Nice shop and Osm collection h', relative_time_description: 'a year ago', merchant_reply: null },
                    { id: 10, author_name: 'Smart techno gaming king', author_photo_url: 'https://ui-avatars.com/api/?name=Smart+techno&background=37474F&color=FFFFFF', rating: 5, review_text: 'Good collection of footwear Service is Also good .', relative_time_description: '4 years ago', merchant_reply: null },
                    { id: 11, author_name: 'Reena Rajwani', author_photo_url: 'https://ui-avatars.com/api/?name=Reena+Rajwani&background=5E35B1&color=FFFFFF', rating: 5, review_text: 'Amazing products and outstanding quality of the products 👌 👌', relative_time_description: '4 years ago', merchant_reply: null },
                    { id: 12, author_name: 'surbhi chouhan', author_photo_url: 'https://ui-avatars.com/api/?name=surbhi+chouhan&background=212121&color=FFFFFF', rating: 5, review_text: 'Great service and awesome collection 👌', relative_time_description: '4 years ago', merchant_reply: null }
                ];
            }

            const total = reviews.length;
            const avgRating = total > 0 
                ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / total).toFixed(1) 
                : '4.9';

            const payload = {
                reviews,
                stats: {
                    average_rating: parseFloat(avgRating),
                    total_reviews: total > 0 ? total : 36,
                    google_business_name: 'Heels Up Jodhpur',
                    verified_badge: true
                }
            };

            if (env.KV && reviews.length > 0) {
                try {
                    await env.KV.put('cache:reviews:google', JSON.stringify(payload), { expirationTtl: 600 });
                } catch {}
            }

            return list(payload);
        } catch (e) {
            console.error('Fetch google reviews error:', e);
            return serverError('Failed to fetch google reviews');
        }
    }

    // POST /api/reviews/google/bulk — Admin endpoint to bulk import Google reviews into D1
    if (path === '/google/bulk' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;

        try {
            const { reviews } = await request.json();
            if (!Array.isArray(reviews) || reviews.length === 0) {
                return error('Valid array of reviews required');
            }

            let inserted = 0;
            const stmt = env.DB.prepare(`
                INSERT OR REPLACE INTO google_reviews 
                (google_review_id, author_name, author_photo_url, rating, review_text, review_date, relative_time_description, merchant_reply, is_featured, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))
            `);

            for (const r of reviews) {
                const gId = r.google_review_id || ('g_rev_' + Math.random().toString(36).substring(2, 9));
                const name = r.author_name || r.name || 'Anonymous Customer';
                const avatar = r.author_photo_url || r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                const rating = Math.min(5, Math.max(1, parseInt(r.rating || 5)));
                const text = r.review_text || r.body || r.text || '';
                const dateStr = r.review_date || new Date().toISOString().split('T')[0];
                const relTime = r.relative_time_description || r.time || 'Recently';
                const reply = r.merchant_reply || null;
                const featured = r.is_featured ? 1 : 1;

                await stmt.bind(gId, name, avatar, rating, text, dateStr, relTime, reply, featured).run();
                inserted++;
            }

            if (env.KV) { try { await env.KV.delete('cache:reviews:google'); } catch {} }

            return ok({ count: inserted }, `Successfully imported ${inserted} Google reviews into database`);
        } catch (e) {
            console.error('Bulk import google reviews error:', e);
            return serverError('Failed to bulk import google reviews: ' + e.message);
        }
    }

    // DELETE /api/reviews/google/:id — Admin endpoint to delete a Google review
    if (path.match(/^\/google\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.split('/')[2];

        try {
            await env.DB.prepare('DELETE FROM google_reviews WHERE id = ?').bind(id).run();
            if (env.KV) { try { await env.KV.delete('cache:reviews:google'); } catch {} }
            return ok(null, 'Google review deleted successfully');
        } catch (e) {
            console.error('Delete google review error:', e);
            return serverError('Failed to delete google review');
        }
    }

    return error('Route not found', 404);
}