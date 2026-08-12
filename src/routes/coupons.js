// worker/src/routes/coupons.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function couponsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/coupons', '').replace('/api/coupons', '') || '/';
    const method = request.method;

    // POST /api/coupons/validate — validate a coupon code
    if (path === '/validate' && method === 'POST') {
        try {
            const { code, cart_total } = await request.json();
            if (!code) return error('Coupon code required');

            const coupon = await env.DB.prepare(
                `SELECT * FROM coupons WHERE code = ? AND active = 1
          AND (expires_at IS NULL OR expires_at >= datetime('now'))`
            ).bind(code.toUpperCase()).first();

            if (!coupon) return error('Invalid or expired coupon code');
            if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return error('Coupon usage limit reached');
            
            const minOrderPaise = (coupon.min_order || 0) * 100;
            if (cart_total && cart_total < minOrderPaise) {
                return error(`Minimum order ₹${coupon.min_order || 0} required for this coupon`);
            }

            let discount = 0;
            const isPercent = coupon.type === 'percent' || coupon.type === 'percentage';
            const isFlat = coupon.type === 'flat' || coupon.type === 'fixed';
            
            if (isPercent) {
                discount = Math.floor((cart_total || 0) * coupon.value / 100);
            } else if (isFlat) {
                discount = coupon.value * 100; // convert Rupees to Paise
            }

            // Apply max discount constraint if applicable
            if (coupon.max_discount && discount > (coupon.max_discount * 100)) {
                discount = coupon.max_discount * 100;
            }

            return ok({
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                discount,
                message: coupon.type === 'free_shipping' ? 'Free shipping applied!' : `You save ₹${(discount / 100).toFixed(0)}!`
            }, 'Coupon valid');
        } catch (e) { return serverError('Coupon validation failed'); }
    }

    // GET /api/coupons — admin list
    if (path === '/' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const coupons = await env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
        return list(coupons.results);
    }

    // POST /api/coupons — admin create
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { code, type, value, min_order, max_uses, expires_at, description } = await request.json();
            if (!code || !type || !value) return error('Code, type, and value required');
            const result = await env.DB.prepare(
                "INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now')) RETURNING *"
            ).bind(code.toUpperCase(), type, value, min_order || 0, max_uses || null, expires_at || null, description || '').first();
            return created(result, 'Coupon created');
        } catch (e) {
            if (e.message?.includes('UNIQUE')) return error('Coupon code already exists', 409);
            return serverError('Failed to create coupon');
        }
    }

    // PUT /api/coupons/:id
    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const { code, type, value, min_order, max_uses, expires_at, description, active } = await request.json();
            if (!code || !type || value === undefined) return error('Code, type, and value required');
            await env.DB.prepare(
                'UPDATE coupons SET code=?, type=?, value=?, min_order=?, max_uses=?, expires_at=?, description=?, active=? WHERE id=?'
            ).bind(code.toUpperCase(), type, value, min_order || 0, max_uses || null, expires_at || null, description || '', active ? 1 : 0, id).run();
            const result = await env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
            return ok(result, 'Coupon updated');
        } catch (e) {
            console.error('Coupon update error:', e);
            return serverError('Failed to update coupon');
        }
    }

    // DELETE /api/coupons/:id
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        await env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
        return ok(null, 'Coupon deleted');
    }

    return error('Route not found', 404);
}