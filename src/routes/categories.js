// worker/src/routes/categories.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

export async function categoriesRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/categories', '').replace('/api/categories', '') || '/';
    const method = request.method;

    if (path === '/' && method === 'GET') {
        try {
            let isAdmin = false;
            try {
                const authHeader = request.headers.get('Authorization') || '';
                if (authHeader.startsWith('Bearer ')) {
                    const { verifyJWT } = await import('../utils/jwt.js');
                    const payload = await verifyJWT(authHeader.slice(7), env.JWT_SECRET);
                    isAdmin = payload && ['admin', 'staff', 'manager'].includes(payload.role);
                }
            } catch {}

            if (!isAdmin && env.KV) {
                try {
                    const cached = await env.KV.get('cache:categories', 'json');
                    if (cached) return list(cached);
                } catch (err) {
                    console.warn('KV get failed for categories:', err);
                }
            }

            const cats = await env.DB.prepare(
                `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE (LOWER(p.category) = LOWER(c.name) OR LOWER(p.category) = LOWER(c.slug) OR LOWER(p.category) || 's' = LOWER(c.slug) OR LOWER(p.category) = LOWER(c.slug) || 's' OR LOWER(p.category) || 's' = LOWER(c.name) OR LOWER(p.category) = LOWER(c.name) || 's')` + (isAdmin ? '' : ' AND p.active = 1') + `) as product_count
          FROM categories c` + (isAdmin ? '' : ' WHERE c.active = 1') + ` ORDER BY c.sort_order ASC`
            ).all();

            if (!isAdmin && env.KV && cats.results) {
                try {
                    await env.KV.put('cache:categories', JSON.stringify(cats.results), { expirationTtl: 3600 });
                } catch (err) {
                    console.warn('KV put failed for categories:', err);
                }
            }

            return list(cats.results);
        } catch (e) {
            console.error('Failed to fetch categories:', e);
            return serverError('Failed to fetch categories');
        }
    }

    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { name, slug, description, image_url, sort_order, active } = await request.json();
            if (!name || !slug) return error('Name and slug are required');
            const result = await env.DB.prepare(
                "INSERT INTO categories (name, slug, description, image_url, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *"
            ).bind(name, slug.toLowerCase(), description || null, image_url || null, sort_order || 0, active !== undefined ? (active ? 1 : 0) : 1).first();
            if (env.KV) await env.KV.delete('cache:categories');
            return created(result, 'Category created');
        } catch (e) {
            if (e.message?.includes('UNIQUE')) return error('Slug already exists', 409);
            return serverError('Failed to create category');
        }
    }

    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        const { name, slug, description, image_url, sort_order, active, is_active } = await request.json();
        const activeVal = active !== undefined ? active : is_active;
        await env.DB.prepare(
            "UPDATE categories SET name=?, slug=?, description=?, image_url=?, sort_order=?, active=?, updated_at=datetime('now') WHERE id=?"
        ).bind(name, slug, description, image_url, sort_order, activeVal ? 1 : 0, id).run();
        if (env.KV) await env.KV.delete('cache:categories');
        return ok(null, 'Category updated');
    }

    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
        if (env.KV) await env.KV.delete('cache:categories');
        return ok(null, 'Category deleted');
    }

    return error('Route not found', 404);
}