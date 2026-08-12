// worker/src/routes/announcements.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';

export async function announcementsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/announcements', '').replace('/api/announcements', '') || '/';
    const method = request.method;

    // GET /api/announcements — public list of active announcements
    if (path === '/' && method === 'GET') {
        try {
            const rows = await env.DB.prepare(
                "SELECT * FROM announcements WHERE active = 1 ORDER BY sort_order ASC, id DESC"
            ).all();
            return list(rows.results || []);
        } catch (e) {
            console.error('Fetch announcements error:', e);
            return serverError('Failed to fetch announcements');
        }
    }

    // GET /api/announcements/admin/all — all announcements for admin
    if (path === '/admin/all' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const rows = await env.DB.prepare(
                "SELECT * FROM announcements ORDER BY sort_order ASC, id DESC"
            ).all();
            return list(rows.results || []);
        } catch (e) {
            return serverError('Failed to fetch admin announcements');
        }
    }

    // POST /api/announcements — create new announcement (admin only)
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { text, active, sort_order } = await request.json();
            if (!text) return error('Announcement text is required');

            const res = await env.DB.prepare(
                "INSERT INTO announcements (text, active, sort_order) VALUES (?, ?, ?) RETURNING *"
            ).bind(
                text,
                active !== undefined ? (active ? 1 : 0) : 1,
                sort_order !== undefined ? sort_order : 0
            ).first();

            return created(res, 'Announcement created');
        } catch (e) {
            return serverError('Failed to create announcement');
        }
    }

    // PUT /api/announcements/:id — update announcement (admin only)
    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const { text, active, sort_order } = await request.json();
            await env.DB.prepare(
                "UPDATE announcements SET text = COALESCE(?, text), active = COALESCE(?, active), sort_order = COALESCE(?, sort_order), updated_at = datetime('now') WHERE id = ?"
            ).bind(
                text !== undefined ? text : null,
                active !== undefined ? (active ? 1 : 0) : null,
                sort_order !== undefined ? sort_order : null,
                id
            ).run();

            return ok(null, 'Announcement updated');
        } catch (e) {
            return serverError('Failed to update announcement');
        }
    }

    // DELETE /api/announcements/:id — delete announcement (admin only)
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
            return ok(null, 'Announcement deleted');
        } catch (e) {
            return serverError('Failed to delete announcement');
        }
    }

    return error('Route not found', 404);
}
