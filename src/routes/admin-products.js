// worker/src/routes/admin-products.js
// ============================================================
// HeelsUp — Comprehensive Admin Product Management Router
// Handles /api/admin/products/* with full field support, bulk
// operations, per-size stock adjustments with audit trail, and
// image management. Returns `null` for unmatched sub-paths so
// admin.js can fall back to the legacy products router.
// ============================================================

import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

const DEFAULT_SIZES = ['6', '7', '8', '9', '10', '11'];
const MAX_BULK_ROWS = 500;

// ── Small helpers ─────────────────────────────────────────────

function isValidEuSize(size) {
    const s = String(size).trim();
    const num = parseFloat(s);
    if (isNaN(num)) return false;
    if (num < 3 || num > 45) return false;
    if (!/^\d+(\.\d+)?$/.test(s)) return false;
    return true;
}

function safeJsonParse(str, fallback = []) {
    if (!str) return fallback;
    try {
        const parsed = JSON.parse(str);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function normalizeImageUrl(url, r2PublicUrl) {
    if (!url || typeof url !== 'string') return url;
    const baseCdn = (r2PublicUrl || 'https://media.heelsup.in').replace(/\/$/, '');
    if (url.startsWith(baseCdn)) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const cleanKey = url.replace(/^\//, '');
        if (cleanKey.includes('key=')) {
            try {
                const parsed = new URL(url, 'https://x.invalid');
                const k = parsed.searchParams.get('key');
                if (k) return `${baseCdn}/${k.replace(/^\//, '')}`;
            } catch {}
        }
        return `${baseCdn}/${cleanKey}`;
    }
    try {
        const parsed = new URL(url);
        const key = parsed.searchParams.get('key');
        if (key) return `${baseCdn}/${key.replace(/^\//, '')}`;
        for (const prefix of ['/api/admin/upload/', '/api/upload/']) {
            if (parsed.pathname.startsWith(prefix)) {
                const k = parsed.pathname.slice(prefix.length);
                if (k) return `${baseCdn}/${k.replace(/^\//, '')}`;
            }
        }
    } catch {}
    return url;
}

function toBool(value, fallback = false) {
    if (value === undefined || value === null) return fallback;
    return !!value;
}

// ── Stock helpers ─────────────────────────────────────────────

async function fetchSizeStock(env, productId) {
    try {
        const res = await env.DB.prepare(
            'SELECT size_label, stock, reserved FROM product_size_stock WHERE product_id = ? ORDER BY size_label ASC'
        ).bind(productId).all();
        return res.results || [];
    } catch {
        return [];
    }
}

async function fetchSizeStockBatch(env, productIds) {
    if (!productIds.length) return {};
    try {
        const placeholders = productIds.map(() => '?').join(',');
        const res = await env.DB.prepare(
            `SELECT product_id, size_label, stock, reserved FROM product_size_stock WHERE product_id IN (${placeholders}) ORDER BY product_id, size_label ASC`
        ).bind(...productIds).all();
        const map = {};
        for (const row of (res.results || [])) {
            if (!map[row.product_id]) map[row.product_id] = [];
            map[row.product_id].push(row);
        }
        return map;
    } catch {
        return {};
    }
}

async function fetchSizeStockMap(env, productId) {
    const rows = await fetchSizeStock(env, productId);
    const map = {};
    for (const r of rows) map[r.size_label] = Number(r.stock) || 0;
    return map;
}

// Keep products.stock in sync with the sum of per-size stock
async function syncLegacyStock(env, productId) {
    try {
        await env.DB.prepare(
            `UPDATE products SET stock = (
                SELECT COALESCE(SUM(stock), 0) FROM product_size_stock WHERE product_id = ?
            ), updated_at = datetime('now') WHERE id = ?`
        ).bind(productId, productId).run();
    } catch {}
}

// Upsert per-size stock and write a per-size audit trail
async function upsertSizeStock(env, productId, sizeStockArray, userId = null, reason = 'Admin stock update') {
    const before = await fetchSizeStockMap(env, productId);
    for (const row of sizeStockArray) {
        const label = String(row.size_label);
        const after = Math.max(0, parseInt(row.stock ?? 0, 10) || 0);
        const prev = before[label] || 0;
        const change = after - prev;

        await env.DB.prepare(
            `INSERT INTO product_size_stock (product_id, size_label, stock, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(product_id, size_label) DO UPDATE SET stock=excluded.stock, updated_at=datetime('now')`
        ).bind(productId, label, after).run();

        if (change !== 0) {
            await env.DB.prepare(
                `INSERT INTO stock_audit_log (product_id, size_label, quantity_before, quantity_change, quantity_after, reason, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(productId, label, prev, change, after, String(reason || 'Admin stock update'), userId).run();
        }
    }
    await syncLegacyStock(env, productId);
}

// ── Image helpers ─────────────────────────────────────────────

// Accepts both string URLs and { url, alt, position } objects.
// Existing rows keep their alt/position metadata when a plain URL is passed.
async function syncProductImages(env, productId, imageUrls) {
    try {
        const existingRows = await env.DB.prepare(
            'SELECT url, alt, sort_order FROM product_images WHERE product_id = ?'
        ).bind(productId).all();
        const existing = new Map();
        for (const r of (existingRows.results || [])) {
            existing.set(r.url, { alt: r.alt || '', position: r.sort_order });
        }

        await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId).run();
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

        const rows = imageUrls.map((item, i) => {
            const entry = typeof item === 'string' ? { url: item, alt: '', position: i } : item;
            const url = entry.url;
            const prior = existing.get(url);
            const alt = entry.alt || prior?.alt || '';
            const position = entry.position !== undefined ? parseInt(entry.position, 10) : (prior?.position ?? i);
            const ext = String(url || '').split('.').pop().toLowerCase();
            let mimeType = 'image/webp';
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif') mimeType = 'image/jpeg';
            else if (ext === 'gif') mimeType = 'image/gif';
            else if (ext === 'heic') mimeType = 'image/heic';
            else if (ext === 'heif') mimeType = 'image/heif';
            else if (ext === 'avif') mimeType = 'image/avif';
            else if (ext === 'svg') mimeType = 'image/svg+xml';
            return { url, alt, position, mimeType, ext };
        });

        for (const r of rows) {
            await env.DB.prepare(
                `INSERT INTO product_images (product_id, url, alt, sort_order, is_primary, mime_type, format, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(productId, r.url, r.alt, r.position, r.position === 0 ? 1 : 0, r.mimeType, r.ext).run();
        }
    } catch (err) {
        console.error('syncProductImages error for product:', productId, err);
    }
}

function extractR2Key(url) {
    if (!url || typeof url !== 'string') return null;
    const marker = 'products/';
    const idx = url.indexOf(marker);
    if (idx !== -1) return url.substring(idx);
    try {
        const urlObj = new URL(url, 'https://heelsup.in');
        const k = urlObj.searchParams.get('key');
        if (k) return decodeURIComponent(k);
    } catch {}
    return null;
}

async function deleteR2Object(env, url) {
    const bucket = env.MEDIA || env.BUCKET;
    const key = extractR2Key(url);
    if (bucket && key) {
        try {
            await bucket.delete(key);
        } catch (err) {
            console.error('[R2] Failed to delete:', key, err);
        }
    }
}

// ── Audit helpers ─────────────────────────────────────────────

async function writeAudit(env, user, action, entity, entityId, details, changes = null) {
    try {
        await env.DB.prepare(
            `INSERT INTO audit_log (user_id, action, entity, entity_id, details, changes_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(user?.id || null, action, entity, entityId != null ? String(entityId) : null, details, changes ? JSON.stringify(changes) : null).run();
    } catch (err) {
        console.error('writeAudit error:', err);
    }
}

async function clearProductCache(env) {
    if (!env.KV) return;
    try {
        const keys = await env.KV.list({ prefix: 'cache:products' });
        if (keys.keys && keys.keys.length > 0) {
            await Promise.all(keys.keys.map(k => env.KV.delete(k.name).catch(() => {})));
        }
    } catch {}
}

// ── Product mapper (full field set for admin) ─────────────────

function mapAdminProduct(p, sizeStock = [], colors = [], r2PublicUrl = '') {
    if (!p) return null;
    const sizes = safeJsonParse(p.sizes_json, []);
    let sizeStockArray = [];
    if (sizeStock && sizeStock.length > 0) {
        for (const row of sizeStock) {
            sizeStockArray.push({ size_label: row.size_label, stock: Number(row.stock || 0), reserved: Number(row.reserved || 0) });
        }
    } else {
        const perSize = sizes.length ? Math.floor(Number(p.stock || 0) / sizes.length) : 0;
        for (const s of sizes) {
            sizeStockArray.push({ size_label: String(s), stock: perSize, reserved: 0 });
        }
    }

    const effectiveStock = sizeStock && sizeStock.length > 0
        ? sizeStock.reduce((s, r) => s + Number(r.stock || 0), 0)
        : Number(p.stock || 0);

    const rawImages = safeJsonParse(p.images_json, p.image_url ? [p.image_url] : []);
    const images = rawImages.map(img => normalizeImageUrl(img, r2PublicUrl));

    return {
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        category: p.category || '',
        category_id: p.category_id || null,
        price: Number(p.price),
        original_price: p.original_price ? Number(p.original_price) : null,
        mrp: p.original_price ? Number(p.original_price) : null,
        show_mrp: p.show_mrp !== undefined ? !!p.show_mrp : true,
        stock: effectiveStock,
        active: !!p.active,
        is_active: !!p.active,
        featured: !!p.featured,
        is_featured: !!p.featured,
        is_new: !!p.is_new,
        is_trending: !!p.is_trending,
        rating: Number(p.rating || 0),
        review_count: Number(p.review_count || 0),
        sold_count: Number(p.sold_count || 0),
        sales: Number(p.sold_count || 0),
        sales_count: Number(p.sold_count || 0),

        description: p.description || '',
        detailed_description: p.detailed_description || '',
        brand: p.brand || 'HeelsUp',
        tags: safeJsonParse(p.tags, []),
        tags_json: p.tags_json || '[]',

        color: p.color || '',
        material: p.material || '',
        heel_height: p.heel_height || '',
        width_option: p.width_option || '',
        cost_price: p.cost_price != null ? Number(p.cost_price) : null,
        supplier_id: p.supplier_id || null,

        sizes: sizes,
        size_stock: sizeStockArray,
        size_stock_map: sizeStockArray.reduce((m, s) => { m[s.size_label] = s.stock; return m; }, {}),
        images: images,
        colors: colors || [],

        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
        meta_desc: p.meta_description || '',
        seo_keywords: p.seo_keywords || '',
        created_at: p.created_at,
        updated_at: p.updated_at,
    };
}

const ADMIN_PRODUCT_SELECT = `
  SELECT p.*, c.id as category_id
  FROM products p
  LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category)
`;

// ── Validation helper for single product payloads ─────────────

function validateProductPayload(body) {
    const errors = [];
    if (!body.name || !String(body.name).trim()) errors.push('name is required');
    if (!body.sku || !String(body.sku).trim()) errors.push('sku is required');
    if (body.price === undefined || body.price === null || body.price === '') errors.push('price is required');
    else if (isNaN(Number(body.price)) || Number(body.price) < 0) errors.push('price must be a positive number');

    if (body.original_price != null && body.original_price !== '' && (isNaN(Number(body.original_price)) || Number(body.original_price) < 0)) {
        errors.push('original_price must be a positive number');
    }
    if (body.cost_price != null && body.cost_price !== '' && (isNaN(Number(body.cost_price)) || Number(body.cost_price) < 0)) {
        errors.push('cost_price must be a positive number');
    }
    if (body.sizes && Array.isArray(body.sizes) && body.sizes.some(s => !isValidEuSize(s))) {
        errors.push('Invalid size label. Must be a numeric size between 3 and 45.');
    }
    if (body.size_stock && Array.isArray(body.size_stock) && body.size_stock.some(s => !isValidEuSize(s.size_label))) {
        errors.push('Invalid size label in size_stock.');
    }
    return errors;
}

// ── Router ────────────────────────────────────────────────────

export async function adminProductsRouter(request, env, ctx) {
    const { user, error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin/products', '') || '/';
    const method = request.method;
    const params = url.searchParams;

    // ============================================================
    // GET /api/admin/products — paginated, filterable admin list
    // ============================================================
    if (path === '/' && method === 'GET') {
        try {
            const page = Math.max(1, parseInt(params.get('page') || '1', 10));
            let limit = Math.min(parseInt(params.get('limit') || '50', 10), 250);
            const offset = (page - 1) * limit;
            const search = params.get('q') || params.get('search') || '';
            const category = params.get('category') || '';
            const active = params.get('active'); // 'true' | 'false' | '' (all)
            const minPrice = params.get('min_price');
            const maxPrice = params.get('max_price');
            const sortBy = params.get('sort') || 'updated_at';
            const sortOrder = (params.get('order') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const where = [];
            const binds = [];

            if (search) {
                where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)');
                binds.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            if (category) {
                where.push('(LOWER(p.category) = LOWER(?) OR LOWER(p.category) = LOWER(?) || \'s\')');
                binds.push(category, category);
            }
            if (active === 'true') { where.push('p.active = 1'); }
            else if (active === 'false') { where.push('p.active = 0'); }
            if (minPrice) { where.push('p.price >= ?'); binds.push(parseFloat(minPrice)); }
            if (maxPrice) { where.push('p.price <= ?'); binds.push(parseFloat(maxPrice)); }

            const allowedSort = new Set(['id', 'name', 'sku', 'price', 'stock', 'created_at', 'updated_at', 'sold_count', 'featured']);
            const safeSort = allowedSort.has(sortBy) ? `p.${sortBy}` : 'p.updated_at';
            const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

            const countResult = await env.DB.prepare(
                `SELECT COUNT(*) as total FROM products p ${whereStr}`
            ).bind(...binds).first();

            const productRes = await env.DB.prepare(
                `${ADMIN_PRODUCT_SELECT} ${whereStr} ORDER BY ${safeSort} ${sortOrder} LIMIT ? OFFSET ?`
            ).bind(...binds, limit, offset).all();

            const rawProducts = productRes.results || [];
            const ids = rawProducts.map(p => p.id);
            const [sizeStockBatch, colorsBatch] = await Promise.all([
                fetchSizeStockBatch(env, ids),
                fetchCategoryColors(env, rawProducts)
            ]);

            const data = rawProducts.map(p => mapAdminProduct(p, sizeStockBatch[p.id] || [], colorsBatch[p.id] || [], env.R2_PUBLIC_URL || ''));

            return list(data, {
                page,
                limit,
                total: countResult ? countResult.total : 0,
                pages: Math.ceil((countResult ? countResult.total : 0) / limit)
            });
        } catch (e) {
            console.error('Admin product list error:', e);
            return serverError('Failed to fetch products');
        }
    }

    // ============================================================
    // POST /api/admin/products/bulk/import — validated bulk import
    // ============================================================
    if (path === '/bulk/import' && method === 'POST') {
        try {
            const { products: items } = await request.json();
            if (!Array.isArray(items) || items.length === 0) return error('products array is required', 400);
            if (items.length > MAX_BULK_ROWS) return error(`Bulk import limited to ${MAX_BULK_ROWS} rows per request`, 400);

            // 1. Validation pass — build clean rows, catch per-row errors
            const results = { success: 0, failed: 0, errors: [] };
            const cleanRows = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rowNum = i + 2; // 1-indexed including header
                const rowErrors = validateProductPayload(item);
                if (rowErrors.length > 0) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum} (${item.sku || 'unknown'}): ${rowErrors.join(', ')}`);
                    continue;
                }
                cleanRows.push({ rowNum, item });
            }

            // 2. Duplicate SKU detection (within batch + existing DB)
            const existingRows = await env.DB.prepare('SELECT UPPER(sku) as sku FROM products WHERE sku IS NOT NULL').all();
            const existingSkus = new Set((existingRows.results || []).map(r => r.sku));
            const seenSkus = new Set();

            const finalRows = [];
            for (const { rowNum, item } of cleanRows) {
                const cleanSku = String(item.sku).trim().toUpperCase();
                if (seenSkus.has(cleanSku) || existingSkus.has(cleanSku)) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum} (${cleanSku}): Duplicate SKU`);
                    continue;
                }
                seenSkus.add(cleanSku);
                finalRows.push({ rowNum, item, cleanSku });
            }

            // 3. Execution pass
            const createdIds = [];
            for (const { item, cleanSku } of finalRows) {
                try {
                    const stock = Array.isArray(item.size_stock)
                        ? item.size_stock.reduce((s, r) => s + Math.max(0, parseInt(r.stock || 0, 10)), 0)
                        : Math.max(0, parseInt(item.stock || 0, 10));
                    const derivedSizes = Array.isArray(item.size_stock)
                        ? item.size_stock.filter(r => Math.max(0, parseInt(r.stock || 0, 10)) > 0).map(r => String(r.size_label))
                        : (Array.isArray(item.sizes) ? item.sizes : []);

                    const result = await env.DB.prepare(
                        `INSERT INTO products (
                            name, sku, category, description, detailed_description,
                            price, original_price, cost_price, stock, color, material,
                            heel_height, width_option, supplier_id, active, featured,
                            is_new, is_trending, show_mrp, sizes_json, images_json,
                            brand, tags, meta_title, meta_description, seo_keywords,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
                    ).bind(
                        item.name.trim(), cleanSku, item.category || null,
                        item.description || null, item.detailed_description || null,
                        Number(item.price), item.original_price != null ? Number(item.original_price) : null,
                        item.cost_price != null ? Number(item.cost_price) : null,
                        stock, item.color || null, item.material || null,
                        item.heel_height || null, item.width_option || null,
                        item.supplier_id || null,
                        item.featured ? 1 : 0, item.is_new ? 1 : 0, item.is_trending ? 1 : 0,
                        JSON.stringify(derivedSizes), JSON.stringify(item.images || []),
                        item.brand || 'HeelsUp', JSON.stringify(item.tags || []),
                        item.meta_title || null, item.meta_description || null,
                        item.seo_keywords || null
                    ).first();

                    if (result) {
                        if (Array.isArray(item.size_stock) && item.size_stock.length > 0) {
                            await upsertSizeStock(env, result.id, item.size_stock, user?.id, 'Bulk import');
                        }
                        await syncProductImages(env, result.id, item.images || []);
                        createdIds.push(result.id);
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push(`Row (${cleanSku}): insert failed`);
                    }
                } catch (err) {
                    results.failed++;
                    results.errors.push(`Row (${cleanSku}): ${err.message}`);
                }
            }

            await writeAudit(env, user, 'BULK_IMPORT', 'product', null,
                `${results.success} products imported, ${results.failed} failed`, results);
            await clearProductCache(env);

            if (results.success > 0) {
                return ok({ results, created_ids: createdIds }, `${results.success} products imported`);
            }
            return error(`Import failed: ${results.errors[0] || 'no valid rows'}`, 400);
        } catch (e) {
            console.error('Bulk import error:', e);
            return serverError('Failed to import products');
        }
    }

    // ============================================================
    // POST /api/admin/products/bulk/update — batch price/stock edit
    // ============================================================
    if (path === '/bulk/update' && method === 'POST') {
        try {
            const { products: items } = await request.json();
            if (!Array.isArray(items) || items.length === 0) return error('products array is required', 400);

            let updated = 0;
            const errors = [];
            for (const item of items) {
                const id = parseInt(item.id, 10);
                if (!id || !item.sku) { errors.push(`Invalid item: ${JSON.stringify(item)}`); continue; }
                try {
                    const prod = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
                    if (!prod) { errors.push(`Product ${id} not found`); continue; }
                    const sets = [];
                    const binds = [];
                    if (item.price !== undefined) { sets.push('price=?'); binds.push(Number(item.price)); }
                    if (item.original_price !== undefined) { sets.push('original_price=?'); binds.push(item.original_price != null ? Number(item.original_price) : null); }
                    if (item.cost_price !== undefined) { sets.push('cost_price=?'); binds.push(item.cost_price != null ? Number(item.cost_price) : null); }
                    if (item.active !== undefined) { sets.push('active=?'); binds.push(item.active ? 1 : 0); }
                    if (item.featured !== undefined) { sets.push('featured=?'); binds.push(item.featured ? 1 : 0); }
                    if (item.is_new !== undefined) { sets.push('is_new=?'); binds.push(item.is_new ? 1 : 0); }
                    if (item.is_trending !== undefined) { sets.push('is_trending=?'); binds.push(item.is_trending ? 1 : 0); }
                    if (item.show_mrp !== undefined) { sets.push('show_mrp=?'); binds.push(item.show_mrp ? 1 : 0); }
                    if (item.supplier_id !== undefined) { sets.push('supplier_id=?'); binds.push(item.supplier_id || null); }

                    if (Array.isArray(item.size_stock)) {
                        await upsertSizeStock(env, id, item.size_stock, user?.id, 'Bulk update');
                    }
                    if (sets.length > 0) {
                        sets.push('updated_at=datetime(\'now\')');
                        binds.push(id);
                        await env.DB.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id=?`).bind(...binds).run();
                    }
                    updated++;
                } catch (err) {
                    errors.push(`Product ${id}: ${err.message}`);
                }
            }

            await writeAudit(env, user, 'BULK_UPDATE', 'product', null, `${updated} products updated`, errors);
            await clearProductCache(env);
            return ok({ updated, errors }, `${updated} products updated`);
        } catch (e) {
            console.error('Bulk update error:', e);
            return serverError('Failed to bulk update products');
        }
    }

    // ============================================================
    // POST /api/admin/products — create single product
    // ============================================================
    if (path === '/' && method === 'POST') {
        try {
            const body = await request.json();
            const errors = validateProductPayload(body);
            if (errors.length > 0) return error(errors[0], 400);

            const cleanSku = String(body.sku).trim().toUpperCase();
            if (cleanSku === 'NULL' || cleanSku === 'UNDEFINED') return error('Invalid SKU', 400);

            const existing = await env.DB.prepare('SELECT id FROM products WHERE UPPER(sku) = ?').bind(cleanSku).first();
            if (existing) return error('Product with this SKU already exists', 409);

            const stock = Array.isArray(body.size_stock)
                ? body.size_stock.reduce((s, r) => s + Math.max(0, parseInt(r.stock || 0, 10)), 0)
                : Math.max(0, parseInt(body.stock || 0, 10));

            const result = await env.DB.prepare(
                `INSERT INTO products (
                    name, sku, category, description, detailed_description,
                    price, original_price, cost_price, stock, color, material,
                    heel_height, width_option, supplier_id, active, featured,
                    is_new, is_trending, show_mrp, sizes_json, images_json,
                    brand, tags, meta_title, meta_description, seo_keywords,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
            ).bind(
                body.name.trim(), cleanSku, body.category || null,
                body.description || null, body.detailed_description || null,
                Number(body.price), body.original_price != null ? Number(body.original_price) : null,
                body.cost_price != null ? Number(body.cost_price) : null,
                stock, body.color || null, body.material || null,
                body.heel_height || null, body.width_option || null,
                body.supplier_id || null,
                toBool(body.active, true) ? 1 : 0, toBool(body.featured, false) ? 1 : 0,
                toBool(body.is_new, false) ? 1 : 0, toBool(body.is_trending, false) ? 1 : 0,
                toBool(body.show_mrp, true) ? 1 : 0,
                JSON.stringify(body.sizes || []), JSON.stringify(body.images || []),
                body.brand || 'HeelsUp', JSON.stringify(body.tags || []),
                body.meta_title || null, body.meta_description || null,
                body.seo_keywords || null
            ).first();

            if (!result) return serverError('Failed to create product');

            if (Array.isArray(body.size_stock) && body.size_stock.length > 0) {
                await upsertSizeStock(env, result.id, body.size_stock, user?.id, 'Product created');
            } else if (Array.isArray(body.sizes) && body.sizes.length > 0 && stock > 0) {
                const perSize = Math.floor(stock / body.sizes.length);
                await upsertSizeStock(env, result.id, body.sizes.map(s => ({ size_label: String(s), stock: perSize })), user?.id, 'Product created');
            }
            await syncProductImages(env, result.id, body.images || []);
            await writeAudit(env, user, 'CREATE', 'product', result.id, `Created product "${result.name}"`, body);
            await clearProductCache(env);

            const sizeStockRows = await fetchSizeStock(env, result.id);
            return created(mapAdminProduct(result, sizeStockRows, [], env.R2_PUBLIC_URL || ''), 'Product created');
        } catch (e) {
            console.error('Create product error:', e);
            if (e.message?.includes('UNIQUE')) return error('SKU already exists', 409);
            return serverError('Failed to create product');
        }
    }

    // ============================================================
    // POST /api/admin/products/:id/stock — per-size stock adjust
    // ============================================================
    const stockMatch = path.match(/^\/(\d+)\/stock$/);
    if (stockMatch && method === 'POST') {
        const id = parseInt(stockMatch[1], 10);
        try {
            const body = await request.json();
            let sizeStockArray = [];
            if (Array.isArray(body.size_stock)) sizeStockArray = body.size_stock;
            else if (body.size_stock && typeof body.size_stock === 'object') {
                sizeStockArray = Object.entries(body.size_stock).map(([size_label, stock]) => ({
                    size_label: String(size_label),
                    stock: Math.max(0, parseInt(stock, 10) || 0)
                }));
            }
            if (sizeStockArray.length === 0) return error('size_stock required (array or object)', 400);
            if (sizeStockArray.some(s => !isValidEuSize(s.size_label))) return error('Invalid size label. Must be a numeric size between 3 and 45.', 400);

            const prod = await env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(id).first();
            if (!prod) return notFound('Product not found');

            const reason = body.reason || 'Manual stock adjustment';
            await upsertSizeStock(env, id, sizeStockArray, user?.id, reason);
            await writeAudit(env, user, 'STOCK_UPDATE', 'product', id, `Stock updated for "${prod.name}": ${reason}`, body);

            // Aggregate log for the existing inventory_log consumers
            const totalBefore = await env.DB.prepare('SELECT stock FROM products WHERE id = ?').bind(id).first();
            const totalAfter = sizeStockArray.reduce((s, r) => s + Math.max(0, parseInt(r.stock || 0, 10)), 0);
            if (totalBefore) {
                await env.DB.prepare(
                    `INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, admin_id, created_at)
                     VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, datetime('now'))`
                ).bind(id, prod.name, totalBefore.stock || 0, totalAfter - (totalBefore.stock || 0), totalAfter, reason, user?.id).run();
            }

            await clearProductCache(env);
            const sizeStockRows = await fetchSizeStock(env, id);
            return ok({ product_id: id, size_stock: sizeStockRows, total_stock: totalAfter }, 'Stock updated');
        } catch (e) {
            console.error('Stock update error:', e);
            return serverError('Failed to update stock');
        }
    }

    // ============================================================
    // GET /api/admin/products/:id/stock-history — audit trail
    // ============================================================
    const historyMatch = path.match(/^\/(\d+)\/stock-history$/);
    if (historyMatch && method === 'GET') {
        const id = parseInt(historyMatch[1], 10);
        try {
            const rows = await env.DB.prepare(
                `SELECT id, size_label, quantity_before, quantity_change, quantity_after, reason, created_by, created_at
                 FROM stock_audit_log WHERE product_id = ? ORDER BY id DESC LIMIT 100`
            ).bind(id).all();
            return ok(rows.results || []);
        } catch (e) {
            return serverError('Failed to fetch stock history');
        }
    }

    // ============================================================
    // POST /api/admin/products/:id/images — attach uploaded URLs
    // ============================================================
    const attachImagesMatch = path.match(/^\/(\d+)\/images$/);
    if (attachImagesMatch && method === 'POST') {
        const id = parseInt(attachImagesMatch[1], 10);
        try {
            const prod = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
            if (!prod) return notFound('Product not found');
            const body = await request.json();
            if (!Array.isArray(body.images) || body.images.length === 0) return error('images array required', 400);
            const existing = safeJsonParse((await env.DB.prepare('SELECT images_json FROM products WHERE id = ?').bind(id).first())?.images_json, []);
            const merged = [...existing, ...body.images.map(i => typeof i === 'string' ? i : i.url).filter(Boolean)];
            await env.DB.prepare('UPDATE products SET images_json = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(JSON.stringify(merged), id).run();
            await syncProductImages(env, id, merged);
            await clearProductCache(env);
            return ok({ images: merged }, 'Images attached');
        } catch (e) {
            return serverError('Failed to attach images');
        }
    }

    // ============================================================
    // PUT /api/admin/products/:id/images/:imgId — update alt/position
    // ============================================================
    const imageMetaMatch = path.match(/^\/(\d+)\/images\/(\d+)$/);
    if (imageMetaMatch && (method === 'PUT' || method === 'PATCH')) {
        const productId = parseInt(imageMetaMatch[1], 10);
        const imageId = parseInt(imageMetaMatch[2], 10);
        try {
            const body = await request.json();
            const sets = [];
            const binds = [];
            if (body.alt !== undefined) { sets.push('alt=?'); binds.push(String(body.alt).slice(0, 200)); }
            if (body.position !== undefined) {
                const position = parseInt(body.position, 10);
                sets.push('sort_order=?');
                sets.push('is_primary=?');
                binds.push(position, position === 0 ? 1 : 0);
            }
            if (sets.length === 0) return error('No fields to update (alt, position)', 400);
            sets.push('created_at=created_at');
            binds.push(imageId, productId);
            await env.DB.prepare(`UPDATE product_images SET ${sets.join(', ')} WHERE id = ? AND product_id = ?`).bind(...binds).run();

            // Rebuild images_json from product_images ordering
            const rows = await env.DB.prepare(
                'SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC'
            ).bind(productId).all();
            const urls = (rows.results || []).map(r => r.url);
            await env.DB.prepare('UPDATE products SET images_json = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(JSON.stringify(urls), productId).run();
            await clearProductCache(env);
            return ok({ updated: true }, 'Image updated');
        } catch (e) {
            return serverError('Failed to update image');
        }
    }

    // ============================================================
    // DELETE /api/admin/products/:id/images/:imgId
    // ============================================================
    if (imageMetaMatch && method === 'DELETE') {
        const productId = parseInt(imageMetaMatch[1], 10);
        const imageId = parseInt(imageMetaMatch[2], 10);
        try {
            const img = await env.DB.prepare('SELECT id, url FROM product_images WHERE id = ? AND product_id = ?').bind(imageId, productId).first();
            if (!img) return notFound('Image not found');
            await env.DB.prepare('DELETE FROM product_images WHERE id = ?').bind(imageId).run();

            const rows = await env.DB.prepare(
                'SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC'
            ).bind(productId).all();
            const urls = (rows.results || []).map(r => r.url);
            await env.DB.prepare('UPDATE products SET images_json = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(JSON.stringify(urls), productId).run();
            await deleteR2Object(env, img.url);
            await clearProductCache(env);
            return ok({ deleted: true }, 'Image removed');
        } catch (e) {
            return serverError('Failed to delete image');
        }
    }

    // ============================================================
    // PATCH /api/admin/products/:id/status — toggle flags
    // ============================================================
    const statusMatch = path.match(/^\/(\d+)\/status$/);
    if (statusMatch && method === 'PATCH') {
        const id = parseInt(statusMatch[1], 10);
        try {
            const body = await request.json();
            const prod = await env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(id).first();
            if (!prod) return notFound('Product not found');

            const sets = [];
            const binds = [];
            if (body.active !== undefined) { sets.push('active=?'); binds.push(body.active ? 1 : 0); }
            if (body.featured !== undefined) { sets.push('featured=?'); binds.push(body.featured ? 1 : 0); }
            if (body.is_new !== undefined) { sets.push('is_new=?'); binds.push(body.is_new ? 1 : 0); }
            if (body.is_trending !== undefined) { sets.push('is_trending=?'); binds.push(body.is_trending ? 1 : 0); }
            if (body.show_mrp !== undefined) { sets.push('show_mrp=?'); binds.push(body.show_mrp ? 1 : 0); }
            if (sets.length === 0) return error('No status fields provided', 400);

            sets.push('updated_at=datetime(\'now\')');
            binds.push(id);
            await env.DB.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
            await writeAudit(env, user, 'STATUS_UPDATE', 'product', id, `Status updated for "${prod.name}"`, body);
            await clearProductCache(env);
            return ok({ updated: true }, 'Product status updated');
        } catch (e) {
            return serverError('Failed to update product status');
        }
    }

    // ============================================================
    // GET /api/admin/products/:id — full detail
    // ============================================================
    const singleMatch = path.match(/^\/(\d+)$/);
    if (singleMatch && method === 'GET') {
        const id = parseInt(singleMatch[1], 10);
        try {
            const product = await env.DB.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).bind(id).first();
            if (!product) return notFound('Product not found');
            const [sizeStockRows, colorsList, images] = await Promise.all([
                fetchSizeStock(env, id),
                fetchCategoryColors(env, [product]),
                env.DB.prepare(
                    'SELECT id, url, alt, sort_order, is_primary, mime_type, format FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC'
                ).bind(id).all()
            ]);
            const mapped = mapAdminProduct(product, sizeStockRows, colorsList[id] || [], env.R2_PUBLIC_URL || '');
            mapped.image_records = (images.results || []).map(r => ({
                id: r.id, url: normalizeImageUrl(r.url, env.R2_PUBLIC_URL || ''), alt: r.alt || '',
                position: r.sort_order, is_primary: !!r.is_primary, mime_type: r.mime_type, format: r.format
            }));
            return ok(mapped);
        } catch (e) {
            console.error('Admin product detail error:', e);
            return serverError('Failed to fetch product');
        }
    }

    // ============================================================
    // PUT /api/admin/products/:id — full update
    // ============================================================
    if (singleMatch && method === 'PUT') {
        const id = parseInt(singleMatch[1], 10);
        try {
            const body = await request.json();
            const errors = validateProductPayload(body);
            if (errors.length > 0) return error(errors[0], 400);

            const prod = await env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(id).first();
            if (!prod) return notFound('Product not found');

            const cleanSku = String(body.sku).trim().toUpperCase();
            if (cleanSku !== 'NULL' && cleanSku !== 'UNDEFINED') {
                const clash = await env.DB.prepare('SELECT id FROM products WHERE UPPER(sku) = ? AND id != ?').bind(cleanSku, id).first();
                if (clash) return error('Product with this SKU already exists', 409);
            }

            const stock = Array.isArray(body.size_stock)
                ? body.size_stock.reduce((s, r) => s + Math.max(0, parseInt(r.stock || 0, 10)), 0)
                : Math.max(0, parseInt(body.stock ?? 0, 10));

            await env.DB.prepare(
                `UPDATE products SET
                    name=?, sku=?, category=?, description=?, detailed_description=?,
                    price=?, original_price=?, cost_price=?, stock=?, color=?, material=?,
                    heel_height=?, width_option=?, supplier_id=?, active=?, featured=?,
                    is_new=?, is_trending=?, show_mrp=?, sizes_json=?, images_json=?,
                    brand=?, tags=?, meta_title=?, meta_description=?, seo_keywords=?,
                    updated_at=datetime('now'), updated_by=?
                 WHERE id=?`
            ).bind(
                body.name.trim(), cleanSku, body.category || null,
                body.description || null, body.detailed_description || null,
                Number(body.price), body.original_price != null ? Number(body.original_price) : null,
                body.cost_price != null ? Number(body.cost_price) : null,
                stock, body.color || null, body.material || null,
                body.heel_height || null, body.width_option || null,
                body.supplier_id || null,
                toBool(body.active, true) ? 1 : 0, toBool(body.featured, false) ? 1 : 0,
                toBool(body.is_new, false) ? 1 : 0, toBool(body.is_trending, false) ? 1 : 0,
                toBool(body.show_mrp, true) ? 1 : 0,
                JSON.stringify(body.sizes || []), JSON.stringify(body.images || []),
                body.brand || 'HeelsUp', JSON.stringify(body.tags || []),
                body.meta_title || null, body.meta_description || null,
                body.seo_keywords || null,
                user?.id || null, id
            ).run();

            if (Array.isArray(body.size_stock) && body.size_stock.length > 0) {
                await upsertSizeStock(env, id, body.size_stock, user?.id, 'Product updated');
            } else if (body.stock !== undefined) {
                await env.DB.prepare('UPDATE products SET stock=?, updated_at=datetime(\'now\') WHERE id=?').bind(Math.max(0, parseInt(body.stock || 0, 10)), id).run();
            }
            await syncProductImages(env, id, body.images || []);
            await writeAudit(env, user, 'UPDATE', 'product', id, `Updated product "${body.name}"`, body);
            await clearProductCache(env);

            const product = await env.DB.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).bind(id).first();
            const sizeStockRows = await fetchSizeStock(env, id);
            return ok(mapAdminProduct(product, sizeStockRows, [], env.R2_PUBLIC_URL || ''), 'Product updated');
        } catch (e) {
            console.error('Update product error:', e);
            return serverError('Failed to update product');
        }
    }

    // ============================================================
    // DELETE /api/admin/products/:id — soft/hard delete
    // ============================================================
    if (singleMatch && method === 'DELETE') {
        const id = parseInt(singleMatch[1], 10);
        try {
            const prod = await env.DB.prepare('SELECT id, name FROM products WHERE id = ?').bind(id).first();
            if (!prod) return notFound('Product not found');

            const saleCheck = await env.DB.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').bind(id).first();
            const hasSales = saleCheck && (saleCheck.count || 0) > 0;

            await writeAudit(env, user, 'DELETE', 'product', id, `Deleted product "${prod.name}" (${hasSales ? 'soft' : 'hard'})`);
            await clearProductCache(env);

            if (hasSales) {
                await env.DB.prepare('UPDATE products SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').bind(id).run();
                return ok({ soft_deleted: true }, 'Product has order history. Deactivated (soft-deleted).');
            }

            const imageRows = await env.DB.prepare('SELECT url FROM product_images WHERE product_id = ?').bind(id).all();
            await env.DB.batch([
                env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_size_stock WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_reviews WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_attributes WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM stock_audit_log WHERE product_id = ?').bind(id)
            ]);
            for (const img of (imageRows.results || [])) {
                await deleteR2Object(env, img.url);
            }
            return ok(null, 'Product and associated images deleted');
        } catch (e) {
            console.error('Delete product error:', e);
            return serverError('Failed to delete product');
        }
    }

    // Unmatched sub-path — let the legacy router handle it
    return null;
}

// ── Color variant discovery (category-scoped) ─────────────────

async function fetchCategoryColors(env, products) {
    if (!products || !products.length) return {};
    try {
        const categories = [...new Set(products.map(p => (p.category || '').toLowerCase()).filter(Boolean))];
        if (!categories.length) return {};
        const placeholders = categories.map(() => '?').join(',');
        const res = await env.DB.prepare(
            `SELECT id, name, sku, category FROM products WHERE active = 1 AND LOWER(category) IN (${placeholders})`
        ).bind(...categories).all();
        const categoryProducts = res.results || [];

        const baseSkuOf = (sku) => sku ? String(sku).split('-')[0].trim() : '';
        const colorOf = (name) => {
            if (!name) return 'Default';
            const parts = name.split(' - ');
            return parts.length > 1 ? parts[parts.length - 1].trim() : 'Default';
        };

        const map = {};
        for (const p of products) {
            const baseSku = baseSkuOf(p.sku);
            if (!baseSku) { map[p.id] = []; continue; }
            const variants = categoryProducts.filter(
                v => v.category.toLowerCase() === (p.category || '').toLowerCase() && baseSkuOf(v.sku) === baseSku && v.id !== p.id
            );
            const colors = [];
            for (const v of variants) {
                const color = colorOf(v.name);
                if (color && color !== 'Default' && color !== 'Nude/Default' && !colors.includes(color)) {
                    colors.push(color);
                }
            }
            map[p.id] = colors;
        }
        return map;
    } catch (e) {
        console.error('fetchCategoryColors error:', e);
        return {};
    }
}