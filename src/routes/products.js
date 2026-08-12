// worker/src/routes/products.js
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';

function isValidEuSize(size) {
    const s = String(size).trim();
    const num = parseFloat(s);
    if (isNaN(num)) return false;
    if (num < 3 || num > 45) return false;
    if (!/^\d+(\.\d+)?$/.test(s)) return false;
    return true;
}

function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Converts worker proxy URLs to direct R2 CDN URLs for ultra-fast image loading.
 * E.g. /api/upload?key=products/abc.jpg  →  https://media.heelsup.in/products/abc.jpg
 * E.g. https://x.workers.dev/api/upload?key=products/abc.jpg  →  https://media.heelsup.in/products/abc.jpg
 * Direct CDN URLs and data:/blob: are returned as-is.
 */
function normalizeImageUrl(url, r2PublicUrl) {
  if (!url || typeof url !== 'string') return url;
  if (!r2PublicUrl) return url;
  // Already a direct CDN URL
  if (url.startsWith(r2PublicUrl)) return url;
  // data: or blob:
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  // /api/upload?key=... or /api/admin/upload?key=...
  try {
    const parsed = new URL(url, 'https://x.invalid');
    const key = parsed.searchParams.get('key');
    if (key) return `${r2PublicUrl}/${key}`;
    // /api/upload/products/abc.jpg (path-based)
    for (const prefix of ['/api/admin/upload/', '/api/upload/']) {
      if (parsed.pathname.startsWith(prefix)) {
        const k = parsed.pathname.slice(prefix.length);
        if (k) return `${r2PublicUrl}/${k}`;
      }
    }
  } catch {}
  return url;
}

function mapProduct(p, sizeStock = [], colors = [], r2PublicUrl = '') {
  if (!p) return null;
  const sizes = safeJsonParse(p.sizes_json, []);

  // Build size_stock array & map
  let sizeStockArray = [];
  let sizeStockMap = {};
  if (sizeStock && sizeStock.length > 0) {
    for (const row of sizeStock) {
      sizeStockArray.push({
        size_label: row.size_label,
        stock: row.stock,
        reserved: row.reserved || 0
      });
      sizeStockMap[row.size_label] = row.stock;
    }
  } else {
    // If no size-specific stocks are recorded, auto-distribute based on product total stock
    const perSize = sizes.length ? Math.floor(Number(p.stock || 0) / sizes.length) : 0;
    for (const s of sizes) {
      sizeStockArray.push({
        size_label: String(s),
        stock: perSize,
        reserved: 0
      });
      sizeStockMap[String(s)] = perSize;
    }
  }

  // Compute overall effective stock from size stock if available, else use product.stock
  const effectiveStock = sizeStock && sizeStock.length > 0
    ? sizeStock.reduce((s, r) => s + r.stock, 0)
    : Number(p.stock || 0);

  // Normalize image URLs: convert any worker proxy URLs to direct CDN URLs
  const rawImages = safeJsonParse(p.images_json, p.image_url ? [p.image_url] : []);
  const images = rawImages.map(img => normalizeImageUrl(img, r2PublicUrl));

  return {
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    category: p.category || "",
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
    
    category_id: p.category_id || null,
    description: p.description || "",
    sizes: sizes,
    size_stock: sizeStockArray,      // Array for Admin.tsx
    size_stock_map: sizeStockMap,    // Object for Product.tsx
    images: images,
    colors: colors,
  };
}

// Helper: fetch size stock for one product
async function fetchSizeStock(env, productId) {
  try {
    const res = await env.DB.prepare(
      "SELECT size_label, stock FROM product_size_stock WHERE product_id = ? ORDER BY size_label ASC"
    ).bind(productId).all();
    return res.results || [];
  } catch {
    return [];
  }
}

// Helper: fetch size stock for multiple products as a map { productId: [rows] }
async function fetchSizeStockBatch(env, productIds) {
  if (!productIds.length) return {};
  try {
    const placeholders = productIds.map(() => '?').join(',');
    const res = await env.DB.prepare(
      `SELECT product_id, size_label, stock FROM product_size_stock WHERE product_id IN (${placeholders}) ORDER BY product_id, size_label ASC`
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

function getBaseSku(sku) {
  if (!sku) return '';
  return sku.split('-')[0].trim();
}

function extractColor(name) {
  if (!name) return 'Default';
  const parts = name.split(' - ');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return 'Default';
}

async function fetchColorVariants(env, product) {
  const baseSku = getBaseSku(product.sku);
  if (!baseSku) return { colors: [], color_to_id: {} };

  // Query other active products in the same category
  const res = await env.DB.prepare(
    "SELECT id, name, sku FROM products WHERE category = ? AND active = 1"
  ).bind(product.category).all();

  const variants = (res.results || []).filter(p => getBaseSku(p.sku) === baseSku);
  if (variants.length <= 1) {
    return { colors: [], color_to_id: {} };
  }

  const colorsSet = new Set();
  const colorToId = {};
  for (const v of variants) {
    const color = extractColor(v.name);
    if (color && color !== 'Default' && color !== 'Nude/Default') {
      colorsSet.add(color);
      colorToId[color] = v.id;
    }
  }

  return { colors: Array.from(colorsSet), color_to_id: colorToId };
}

// Helper: fetch distinct colors for multiple products as a map { productId: [colors] }
// OPTIMIZED: queries only the categories present on the current page instead of
// fetching all active products (avoids full-table-scan as catalog grows).
async function fetchColorsBatch(env, products) {
  if (!products || !products.length) return {};
  try {
    // Collect unique categories from the current page of products
    const categories = [...new Set(products.map(p => (p.category || '').toLowerCase()).filter(Boolean))];
    if (!categories.length) return {};

    // Query only products in those categories — much smaller result set
    const placeholders = categories.map(() => '?').join(',');
    const res = await env.DB.prepare(
      `SELECT id, name, sku, category FROM products WHERE active = 1 AND LOWER(category) IN (${placeholders})`
    ).bind(...categories).all();
    const categoryProducts = res.results || [];

    const map = {};
    for (const p of products) {
      const baseSku = getBaseSku(p.sku);
      if (!baseSku) {
        map[p.id] = [];
        continue;
      }
      const variants = categoryProducts.filter(
        v => v.category.toLowerCase() === (p.category || '').toLowerCase() && getBaseSku(v.sku) === baseSku
      );
      const colors = [];
      for (const v of variants) {
        const color = extractColor(v.name);
        if (color && color !== 'Default' && color !== 'Nude/Default') {
          colors.push(color);
        }
      }
      map[p.id] = colors;
    }
    return map;
  } catch (e) {
    console.error('fetchColorsBatch error:', e);
    return {};
  }
}

// Helper: fetch distinct colors for a single product
async function fetchColorsForProduct(env, productId) {
  try {
    const product = await env.DB.prepare("SELECT sku, category FROM products WHERE id = ?").bind(productId).first();
    if (!product) return [];
    const baseSku = getBaseSku(product.sku);
    if (!baseSku) return [];

    const res = await env.DB.prepare(
      "SELECT name, sku FROM products WHERE category = ? AND active = 1"
    ).bind(product.category).all();

    const variants = (res.results || []).filter(p => getBaseSku(p.sku) === baseSku);
    const colors = [];
    for (const v of variants) {
      const color = extractColor(v.name);
      if (color && color !== 'Default' && color !== 'Nude/Default') {
        colors.push(color);
      }
    }
    return colors;
  } catch {
    return [];
  }
}

// Helper: upsert size stock rows for a product
async function upsertSizeStock(env, productId, sizeStockArray) {
  // sizeStockArray: [{ size_label, stock }, ...]
  for (const row of sizeStockArray) {
    await env.DB.prepare(
      `INSERT INTO product_size_stock (product_id, size_label, stock, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(product_id, size_label) DO UPDATE SET stock=excluded.stock, updated_at=datetime('now')`
    ).bind(productId, String(row.size_label), Math.max(0, parseInt(row.stock || 0))).run();
  }
  // Also sync the legacy products.stock column to the sum of all size stocks
  await syncLegacyStock(env, productId);
}

// Sync product_images detail table with product images_json array
async function syncProductImages(env, productId, imageUrls) {
  try {
    // Delete existing images for this product to prevent duplicates
    await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(productId).run();

    if (!imageUrls || !Array.isArray(imageUrls)) return;

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      if (!url || typeof url !== 'string') continue;

      const fileExt = url.split('.').pop().toLowerCase();
      let mimeType = 'image/jpeg';
      if (fileExt === 'png') mimeType = 'image/png';
      else if (fileExt === 'webp') mimeType = 'image/webp';
      else if (fileExt === 'gif') mimeType = 'image/gif';
      else if (fileExt === 'heic') mimeType = 'image/heic';
      else if (fileExt === 'heif') mimeType = 'image/heif';

      await env.DB.prepare(
        `INSERT INTO product_images (product_id, url, sort_order, is_primary, mime_type, format, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(productId, url, i, i === 0 ? 1 : 0, mimeType, fileExt).run();
    }
  } catch (err) {
    console.error('syncProductImages error for product:', productId, err);
  }
}

// Keep products.stock in sync with total size stock sum
async function syncLegacyStock(env, productId) {
  try {
    await env.DB.prepare(
      `UPDATE products SET stock = (
        SELECT COALESCE(SUM(stock), 0) FROM product_size_stock WHERE product_id = ?
      ), updated_at = datetime('now') WHERE id = ?`
    ).bind(productId, productId).run();
  } catch { /* non-critical */ }
}

export async function productsRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/products', '') || '/';
    const method = request.method;
    const params = url.searchParams;

    // GET /api/products/:id/reviews
    if (path.match(/^\/\d+\/reviews$/) && method === 'GET') {
        const id = parseInt(path.split('/')[1]);
        try {
            const reviews = await env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name 
                FROM product_reviews r 
                LEFT JOIN users u ON r.user_id = u.id 
                WHERE r.product_id = ? AND r.status = 'approved' 
                ORDER BY r.created_at DESC`
            ).bind(id).all();
            return ok(reviews.results || []);
        } catch (e) {
            console.error('Fetch reviews error:', e);
            return serverError('Failed to fetch reviews');
        }
    }

    // POST /api/products/:id/reviews
    if (path.match(/^\/\d+\/reviews$/) && method === 'POST') {
        const { user, error: authError } = await requireAuth(request, env);
        if (authError) return authError;
        const id = parseInt(path.split('/')[1]);
        try {
            const { rating, title, body, order_id } = await request.json();
            
            // Perform input type-checks and length-sanitization (prevent SQL injections and overflow)
            const ratingInt = Number(rating);
            if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
                return error('Rating must be an integer between 1 and 5', 400);
            }
            
            let cleanTitle = null;
            if (title !== undefined && title !== null) {
                cleanTitle = String(title).trim().slice(0, 100);
            }
            let cleanBody = null;
            if (body !== undefined && body !== null) {
                cleanBody = String(body).trim().slice(0, 1000);
            }
            
            await env.DB.prepare(
                `INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, body, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
            ).bind(id, user.id, order_id || null, ratingInt, cleanTitle, cleanBody).run();
            
            return created(null, 'Review submitted — pending approval');
        } catch (e) {
            console.error('Submit review error:', e);
            return serverError('Failed to submit review');
        }
    }

    // GET /api/products — public listing with filters
    if (path === '/' && method === 'GET') {
        try {
            const page = parseInt(params.get('page') || '1');
            const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
            const offset = (page - 1) * limit;
            const cat = params.get('cat') || params.get('category');
            const featured = params.get('featured');
            const isNew = params.get('is_new');
            const trending = params.get('trending');
            const search = params.get('q') || params.get('search');
            const sort = params.get('sort') || 'newest';
            const tag = params.get('tag');
            const minPrice = params.get('min_price');
            const maxPrice = params.get('max_price');
            const sizeFilter = params.get('size');
            const color = params.get('color');
            // Verify real admin auth — don't trust client headers
            let isAdmin = false;
            try {
                const authHeader = request.headers.get('Authorization') || '';
                if (authHeader.startsWith('Bearer ')) {
                    const { verifyJWT } = await import('../utils/jwt.js');
                    const payload = await verifyJWT(authHeader.slice(7), env.JWT_SECRET);
                    isAdmin = payload && ['admin', 'staff', 'manager'].includes(payload.role);
                }
            } catch {}
            let where = isAdmin ? [] : ['p.active = 1'];
            let binds = [];

            if (cat) {
                where.push(`(
                    LOWER(p.category) = LOWER(?)
                    OR LOWER(p.category) = LOWER(?) || 's'
                    OR LOWER(p.category) || 's' = LOWER(?)
                    OR EXISTS (
                        SELECT 1 FROM categories c2 
                        WHERE (LOWER(c2.name) = LOWER(?) OR LOWER(c2.slug) = LOWER(?)) 
                          AND (
                            LOWER(p.category) = LOWER(c2.name) 
                            OR LOWER(p.category) = LOWER(c2.slug) 
                            OR LOWER(p.category) || 's' = LOWER(c2.slug) 
                            OR LOWER(p.category) = LOWER(c2.slug) || 's'
                            OR LOWER(p.category) || 's' = LOWER(c2.name)
                            OR LOWER(p.category) = LOWER(c2.name) || 's'
                          )
                    )
                )`);
                binds.push(cat, cat, cat, cat, cat);
            }
            if (featured === 'true' || featured === '1') {
                where.push('p.featured = 1');
            }
            if (isNew === 'true' || isNew === '1') {
                where.push('p.is_new = 1');
            }
            if (trending === 'true' || trending === '1') {
                where.push('p.is_trending = 1');
            }
            if (search) {
                where.push("(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)");
                binds.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            if (tag) {
                where.push("p.tags LIKE ?");
                binds.push(`%"${tag}"%`);
            }
            if (minPrice) {
                where.push('p.price >= ?');
                binds.push(parseFloat(minPrice));
            }
            if (maxPrice) {
                where.push('p.price <= ?');
                binds.push(parseFloat(maxPrice));
            }
            // Filter by size: only show products that have stock for a given size
            if (sizeFilter) {
                where.push(`EXISTS (SELECT 1 FROM product_size_stock pss WHERE pss.product_id = p.id AND pss.size_label = ? AND pss.stock > 0)`);
                binds.push(sizeFilter);
            }
            if (color) {
                where.push('LOWER(p.name) LIKE ?');
                binds.push(`% - ${color.toLowerCase()}`);
            }

            const sortMap = {
                newest: 'p.id DESC',
                oldest: 'p.id ASC',
                price_low: 'p.price ASC',
                price_high: 'p.price DESC',
                name: 'p.name ASC',
                rating: 'avg_rating DESC',
            };
            const orderBy = sortMap[sort] || 'p.id DESC';
            const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

            // Check KV Edge Cache for all public listing/filter calls (0.01s latency)
            const isPublicList = !isAdmin;
            const kvKey = `cache:products:v2:${page}:${limit}:${cat||'all'}:${featured||'0'}:${isNew||'0'}:${trending||'0'}:${sort}:${search||''}:${tag||''}:${minPrice||''}:${maxPrice||''}:${sizeFilter||''}:${color||''}`;

            if (env.KV && isPublicList) {
                try {
                    const cached = await env.KV.get(kvKey, 'json');
                    if (cached && Array.isArray(cached.data)) {
                        return list(cached.data, cached.meta);
                    }
                } catch {}
            }

            const countResult = await env.DB.prepare(
                `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) ${whereStr}`
            ).bind(...binds).first();

            const productsRes = await env.DB.prepare(
                `SELECT p.*, c.id as category_id,
                p.rating as avg_rating,
                p.review_count as review_count
          FROM products p
          LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category)
          ${whereStr}
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?`
            ).bind(...binds, limit, offset).all();

            const rawProducts = productsRes.results || [];
            const productIds = rawProducts.map(p => p.id);
            const sizeStockBatch = await fetchSizeStockBatch(env, productIds);
            const colorsBatch = await fetchColorsBatch(env, rawProducts);
            const products = rawProducts.map(p => mapProduct(p, sizeStockBatch[p.id] || [], colorsBatch[p.id] || [], env.R2_PUBLIC_URL || ''));

            const responseMeta = {
                page, limit,
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            };

            // Store in KV cache for 30 minutes (1800s) asynchronously.
            // Product lists are ultra-fast (~10ms) and invalidated on admin mutation.
            if (env.KV && isPublicList && products.length > 0) {
                try {
                    const kvPayload = JSON.stringify({ data: products, meta: responseMeta });
                    if (ctx && typeof ctx.waitUntil === 'function') {
                        ctx.waitUntil(env.KV.put(kvKey, kvPayload, { expirationTtl: 1800 }).catch(() => {}));
                    } else {
                        env.KV.put(kvKey, kvPayload, { expirationTtl: 1800 }).catch(() => {});
                    }
                } catch {}
            }

            return list(products, responseMeta);
        } catch (e) {
            console.error('Products list error:', e);
            return serverError('Failed to fetch products');
        }
    }

    // GET /api/products/slug/:slug
    if (path.startsWith('/slug/') && method === 'GET') {
        const productSlug = path.replace('/slug/', '');
        try {
            // Verify real admin auth — don't trust client headers
            let isAdmin = false;
            try {
                const authHeader = request.headers.get('Authorization') || '';
                if (authHeader.startsWith('Bearer ')) {
                    const { verifyJWT } = await import('../utils/jwt.js');
                    const payload = await verifyJWT(authHeader.slice(7), env.JWT_SECRET);
                    isAdmin = payload && ['admin', 'staff', 'manager'].includes(payload.role);
                }
            } catch {}
            let matched = null;
            if (/^\d+$/.test(productSlug)) {
                matched = await env.DB.prepare("SELECT id, name FROM products WHERE id = ?" + (isAdmin ? '' : ' AND active = 1')).bind(parseInt(productSlug)).first();
            } else {
                matched = await env.DB.prepare("SELECT id, name FROM products WHERE (LOWER(REPLACE(name, ' ', '-')) = LOWER(?) OR LOWER(name) = LOWER(?))" + (isAdmin ? '' : ' AND active = 1') + " LIMIT 1").bind(productSlug, productSlug).first();
                if (!matched) {
                    const allProducts = await env.DB.prepare("SELECT id, name FROM products" + (isAdmin ? '' : ' WHERE active = 1')).all();
                    matched = (allProducts.results || []).find(p => slug(p.name) === productSlug);
                }
            }
            if (!matched) return notFound('Product not found');
            const id = matched.id;


            const product = await env.DB.prepare(
                `SELECT p.*, c.id as category_id,
                p.rating as avg_rating,
                p.review_count as review_count
          FROM products p
          LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category)
          WHERE p.id = ?` + (isAdmin ? '' : ' AND p.active = 1')
            ).bind(id).first();
            if (!product) return notFound('Product not found');

            const [reviews, images, related, sizeStock, colors] = await Promise.all([
              env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
          FROM product_reviews r LEFT JOIN users u ON r.user_id = u.id
          WHERE r.product_id = ? AND r.status = 'approved'
          ORDER BY r.created_at DESC LIMIT 10`
              ).bind(product.id).all(),
              env.DB.prepare(
                "SELECT id, url, alt, sort_order, is_primary, COALESCE(mime_type, 'image/webp') as mime_type, COALESCE(format, 'webp') as format FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC"
              ).bind(product.id).all(),
              env.DB.prepare(
                "SELECT p.*, c.id as category_id FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) WHERE p.category=? AND p.id!=? AND p.active=1 ORDER BY p.featured DESC LIMIT 4"
              ).bind(product.category, product.id).all(),
              fetchSizeStock(env, product.id),
              fetchColorsForProduct(env, product.id)
            ]);

            const relatedRaw = related.results || [];
            const relatedIds = relatedRaw.map(r => r.id);
            const relatedSizeStock = await fetchSizeStockBatch(env, relatedIds);
            const relatedColors = await fetchColorsBatch(env, relatedIds);

            const variantsData = await fetchColorVariants(env, product);
            const mappedProduct = mapProduct(product, sizeStock, variantsData.colors.length > 0 ? variantsData.colors : colors, env.R2_PUBLIC_URL || '');
            mappedProduct.color_to_id = variantsData.color_to_id;

            return ok({
                product: mappedProduct,
                reviews: reviews.results || [],
                images: images.results || [],
                related: relatedRaw.map(r => mapProduct(r, relatedSizeStock[r.id] || [], relatedColors[r.id] || [], env.R2_PUBLIC_URL || ''))
            });
        } catch (e) {
            console.error('Slug fetch error:', e);
            return serverError('Failed to fetch product');
        }
    }

    // GET /api/products/:id
    if (path.match(/^\/\d+$/) && method === 'GET') {
        const id = parseInt(path.slice(1));
        try {
            // Verify real admin auth — don't trust client headers
            let isAdmin = false;
            try {
                const authHeader = request.headers.get('Authorization') || '';
                if (authHeader.startsWith('Bearer ')) {
                    const { verifyJWT } = await import('../utils/jwt.js');
                    const payload = await verifyJWT(authHeader.slice(7), env.JWT_SECRET);
                    isAdmin = payload && ['admin', 'staff', 'manager'].includes(payload.role);
                }
            } catch {}
            const product = await env.DB.prepare(
                `SELECT p.*, c.id as category_id,
                COALESCE(p.rating, (SELECT ROUND(AVG(rating),1) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved')) as avg_rating,
                COALESCE(p.review_count, (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved')) as review_count
         FROM products p
         LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category)
         WHERE p.id = ?` + (isAdmin ? '' : ' AND p.active = 1')
            ).bind(id).first();
            if (!product) return notFound('Product not found');

            const [reviews, images, sizeStock, colors, related] = await Promise.all([
              env.DB.prepare(
                `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.merchant_reply, (u.first_name || ' ' || COALESCE(u.last_name, '')) as reviewer_name
         FROM product_reviews r LEFT JOIN users u ON r.user_id = u.id
         WHERE r.product_id = ? AND r.status = 'approved'
         ORDER BY r.created_at DESC LIMIT 10`
              ).bind(id).all(),
              env.DB.prepare(
                "SELECT id, url, alt, sort_order, is_primary, COALESCE(mime_type, 'image/webp') as mime_type, COALESCE(format, 'webp') as format FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC"
              ).bind(id).all(),
              fetchSizeStock(env, id),
              fetchColorsForProduct(env, id),
              env.DB.prepare(
                "SELECT p.*, c.id as category_id FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) WHERE (LOWER(p.category) = LOWER(?) OR LOWER(p.category) = LOWER(?)) AND p.id != ? AND p.active = 1 ORDER BY p.featured DESC LIMIT 4"
              ).bind(product.category || '', product.category || '', id).all()
            ]);

            const relatedRaw = related.results || [];
            const relatedIds = relatedRaw.map(r => r.id);
            const [relatedSizeStock, relatedColors] = await Promise.all([
              fetchSizeStockBatch(env, relatedIds),
              fetchColorsBatch(env, relatedIds)
            ]);

            const variantsData = await fetchColorVariants(env, product);
            const mappedProduct = mapProduct(product, sizeStock, variantsData.colors.length > 0 ? variantsData.colors : colors, env.R2_PUBLIC_URL || '');
            mappedProduct.color_to_id = variantsData.color_to_id;

            return ok({
                product: mappedProduct,
                reviews: reviews.results || [],
                images: images.results || [],
                related: relatedRaw.map(r => mapProduct(r, relatedSizeStock[r.id] || [], relatedColors[r.id] || [], env.R2_PUBLIC_URL || ''))
            });

        } catch (e) {
            console.error('ID fetch error:', e);
            return serverError('Failed to fetch product');
        }
    }

    // GET /api/products/:id/size-stock — get per-size stock for a product (admin)
    if (path.match(/^\/\d+\/size-stock$/) && method === 'GET') {
        const id = parseInt(path.split('/')[1]);
        try {
            const rows = await fetchSizeStock(env, id);
            return ok({ product_id: id, size_stock: rows });
        } catch (e) {
            return serverError('Failed to fetch size stock');
        }
    }

    // PUT /api/products/:id/size-stock — update size stock (admin only)
    if (path.match(/^\/\d+\/size-stock$/) && method === 'PUT') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = parseInt(path.split('/')[1]);
        try {
            const body = await request.json();
            // Accept both array format: [{ size_label, stock }, ...]
            // and map format: { "36": 5, "37": 0, ... }
            let sizeStockArray = [];
            if (Array.isArray(body.size_stock)) {
                sizeStockArray = body.size_stock;
            } else if (body.size_stock && typeof body.size_stock === 'object') {
                // Map format: convert to array
                sizeStockArray = Object.entries(body.size_stock).map(([size_label, stock]) => ({
                    size_label: String(size_label),
                    stock: Math.max(0, parseInt(stock) || 0)
                }));
            }
            if (!sizeStockArray.length) return error('size_stock required (array or object)', 400);
            if (sizeStockArray.some(s => !isValidEuSize(s.size_label))) {
                return error('Invalid size label. Must be a numeric size between 3 and 45.', 400);
            }

            const prod = await env.DB.prepare('SELECT name, stock FROM products WHERE id = ?').bind(id).first();
            const beforeStock = prod ? prod.stock : 0;

            await upsertSizeStock(env, id, sizeStockArray);
            // Also update aggregate stock on products table
            const total = sizeStockArray.reduce((sum, r) => sum + (parseInt(r.stock) || 0), 0);
            await env.DB.prepare('UPDATE products SET stock = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(total, id).run();

            const change = total - beforeStock;
            if (change !== 0) {
                await env.DB.prepare(
                    "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'adjustment', ?, ?, ?, 'Size stock update', datetime('now'))"
                ).bind(id, prod ? prod.name : 'Unknown Product', beforeStock, change, total).run();
            }
            const rows = await fetchSizeStock(env, id);
            return ok({ product_id: id, size_stock: rows, total_stock: total }, 'Size stock updated');
        } catch (e) {
            console.error('Size stock update error:', e);
            return serverError('Failed to update size stock');
        }
    }

    // POST /api/products/bulk — admin only: bulk upload products
    if (path === '/bulk' && method === 'POST') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const { products } = body;
            if (!products || !Array.isArray(products)) {
                return error('products array is required', 400);
            }

            const results = [];
            // 1. Validation Pass
            for (const item of products) {
                const { name, price, mrp, sizes, size_stock } = item;
                if (!name || !price) {
                    return error('Name and price are required for all products', 400);
                }
                const parsedPrice = parseFloat(price);
                if (isNaN(parsedPrice) || parsedPrice < 0) {
                    return error('Price must be a valid positive number', 400);
                }
                if (mrp && (isNaN(parseFloat(mrp)) || parseFloat(mrp) < 0)) {
                    return error('MRP must be a valid positive number', 400);
                }
                if (sizes && sizes.some(s => !isValidEuSize(s))) {
                    return error('Invalid size label in sizes list', 400);
                }
                if (size_stock && size_stock.some(s => !isValidEuSize(s.size_label))) {
                    return error('Invalid size label in size_stock list', 400);
                }
            }

            // 2. Execution Pass (with duplicate & blank SKU skipping)
            // Fetch all existing SKUs in a single query for O(1) lightning-fast memory check
            const dbSkuRows = await env.DB.prepare('SELECT UPPER(sku) as sku FROM products WHERE sku IS NOT NULL').all();
            const dbSkus = new Set((dbSkuRows.results || []).map(r => r.sku));
            
            const seenSkus = new Set();
            for (const item of products) {
                const { name, sku, category, description, price, mrp, stock, sizes, images, brand, tags, is_new, is_trending, is_featured, size_stock } = item;
                
                const cleanSku = sku ? String(sku).trim().toUpperCase() : '';
                if (cleanSku === '' || cleanSku === 'NULL' || cleanSku === 'UNDEFINED') {
                    continue; // Skip blank/null/undefined SKUs
                }
                if (seenSkus.has(cleanSku)) {
                    continue; // Skip duplicate SKUs in the same batch
                }
                seenSkus.add(cleanSku);

                if (dbSkus.has(cleanSku)) {
                    continue; // Skip duplicate SKUs already in the database
                }

                try {

                    const result = await env.DB.prepare(
                        `INSERT INTO products (name, sku, category, description, price, original_price, stock, active, featured, is_new, is_trending, show_mrp, sizes_json, images_json, brand, tags, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
                    ).bind(
                        name, cleanSku, category || null, description || null,
                        parseFloat(price), mrp ? parseFloat(mrp) : null,
                        parseInt(stock || 0), is_featured ? 1 : 0, is_new ? 1 : 0, is_trending ? 1 : 0,
                        JSON.stringify(sizes || []), JSON.stringify(images || []),
                        brand || null, JSON.stringify(tags || [])
                    ).first();

                    if (result) {
                        if (size_stock && Array.isArray(size_stock) && size_stock.length > 0) {
                            await upsertSizeStock(env, result.id, size_stock);
                        } else if (sizes && sizes.length > 0 && stock) {
                            const perSize = Math.floor(parseInt(stock || 0) / sizes.length);
                            const autoSizeStock = sizes.map(s => ({ size_label: String(s), stock: perSize }));
                            await upsertSizeStock(env, result.id, autoSizeStock);
                        }

                        // Sync images to product_images table
                        await syncProductImages(env, result.id, images || []);

                        const sizeStockRows = await fetchSizeStock(env, result.id);
                        const colorsList = await fetchColorsForProduct(env, result.id);
                        results.push(mapProduct(result, sizeStockRows, colorsList, env.R2_PUBLIC_URL || ''));
                        
                        // Log inventory creation
                        await env.DB.prepare(
                            "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'restock', 0, ?, ?, 'Product bulk created', datetime('now'))"
                        ).bind(result.id, name, parseInt(stock || 0), parseInt(stock || 0)).run();
                    }
                } catch (err) {
                    if (err.message?.includes('UNIQUE')) continue;
                    throw err;
                }
            }

            return ok(results, `${results.length} products created successfully`);
        } catch (e) {
            console.error('Bulk product create error:', e);
            return serverError('Failed to bulk upload products');
        }
    }

    // POST /api/products — admin only
    if (path === '/' && method === 'POST') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const { name, sku, category, description, price, mrp, stock, sizes, images, brand, tags, is_new, is_trending, is_featured, meta_title, meta_desc, size_stock } = body;
            const cleanSku = sku ? String(sku).trim().toUpperCase() : '';
            if (!name || !cleanSku || !price) return error('Name, SKU and price are required');
            if (cleanSku === 'NULL' || cleanSku === 'UNDEFINED') return error('Invalid SKU', 400);

            // Check database for uniqueness
            const existing = await env.DB.prepare('SELECT id FROM products WHERE UPPER(sku) = ?').bind(cleanSku).first();
            if (existing) {
                return error('Product with this SKU already exists', 409);
            }

            // Size Validation
            if (sizes && sizes.some(s => !isValidEuSize(s))) {
                return error('Invalid size label. Must be a numeric size between 3 and 45.', 400);
            }
            if (size_stock && size_stock.some(s => !isValidEuSize(s.size_label))) {
                return error('Invalid size label in size stock.', 400);
            }

            // Price/MRP Validation
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return error('Price must be a valid positive number', 400);
            }
            if (mrp && (isNaN(parseFloat(mrp)) || parseFloat(mrp) < 0)) {
                return error('MRP must be a valid positive number', 400);
            }



            const result = await env.DB.prepare(
                `INSERT INTO products (name, sku, category, description, price, original_price, stock, active, featured, is_new, is_trending, show_mrp, sizes_json, images_json, brand, tags, meta_title, meta_description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
            ).bind(
                name, cleanSku, category || null, description || null,
                parsedPrice, mrp ? parseFloat(mrp) : null,
                parseInt(stock || 0), is_featured ? 1 : 0, is_new ? 1 : 0, is_trending ? 1 : 0,
                body.show_mrp !== false ? 1 : 0,
                JSON.stringify(sizes || []), JSON.stringify(images || []),
                brand || null, JSON.stringify(tags || []),
                meta_title || null, meta_desc || null
            ).first();

            // If size_stock provided, insert those rows
            if (size_stock && Array.isArray(size_stock) && size_stock.length > 0) {
                await upsertSizeStock(env, result.id, size_stock);
            } else if (sizes && sizes.length > 0 && stock) {
                // Auto-distribute stock evenly across sizes if no explicit size_stock given
                const perSize = Math.floor(parseInt(stock || 0) / sizes.length);
                const autoSizeStock = sizes.map(s => ({ size_label: String(s), stock: perSize }));
                await upsertSizeStock(env, result.id, autoSizeStock);
            }

            // Sync images to product_images table
            await syncProductImages(env, result.id, images || []);

            // Log inventory creation
            await env.DB.prepare(
                "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'restock', 0, ?, ?, 'Product created', datetime('now'))"
            ).bind(result.id, name, parseInt(stock || 0), parseInt(stock || 0)).run();

            const sizeStock2 = await fetchSizeStock(env, result.id);
            const colorsList = await fetchColorsForProduct(env, result.id);
            return created(mapProduct(result, sizeStock2, colorsList, env.R2_PUBLIC_URL || ''), 'Product created');
        } catch (e) {
            console.error('Create product error:', e);
            if (e.message?.includes('UNIQUE')) return error('SKU already exists', 409);
            return serverError('Failed to create product');
        }
    }

    // PUT /api/products/:id — admin only
    if (path.match(/^\/\d+$/) && method === 'PUT') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = parseInt(path.slice(1));
        try {
            const body = await request.json();
            const { name, category, description, price, mrp, stock, sizes, images, brand, tags, is_new, is_trending, is_featured, meta_title, meta_desc, size_stock } = body;

            // Size Validation
            if (sizes && sizes.some(s => !isValidEuSize(s))) {
                return error('Invalid size label. Must be a numeric size between 3 and 45.', 400);
            }
            if (size_stock && size_stock.some(s => !isValidEuSize(s.size_label))) {
                return error('Invalid size label in size stock.', 400);
            }

            // Price/MRP Validation
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return error('Price must be a valid positive number', 400);
            }
            if (mrp && (isNaN(parseFloat(mrp)) || parseFloat(mrp) < 0)) {
                return error('MRP must be a valid positive number', 400);
            }



            await env.DB.prepare(
                `UPDATE products SET name=?, category=?, description=?, price=?, original_price=?,
         show_mrp=?, sizes_json=?, images_json=?, brand=?, tags=?, is_new=?, is_trending=?, featured=?,
         meta_title=?, meta_description=?, updated_at=datetime('now') WHERE id=?`
            ).bind(
                name, category || null, description || null, parseFloat(price), mrp ? parseFloat(mrp) : null,
                body.show_mrp !== false ? 1 : 0,
                JSON.stringify(sizes || []), JSON.stringify(images || []),
                brand || null, JSON.stringify(tags || []),
                is_new ? 1 : 0, is_trending ? 1 : 0, is_featured ? 1 : 0,
                meta_title || null, meta_desc || null, id
            ).run();

            // Update size stock if provided
            if (size_stock && Array.isArray(size_stock) && size_stock.length > 0) {
                await upsertSizeStock(env, id, size_stock);
            } else if (stock !== undefined) {
                // fallback: update legacy stock column
                await env.DB.prepare("UPDATE products SET stock=?, updated_at=datetime('now') WHERE id=?").bind(parseInt(stock || 0), id).run();
            }

            // Sync images to product_images table
            await syncProductImages(env, id, images || []);

            const product = await env.DB.prepare(
                "SELECT p.*, c.id as category_id FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) WHERE p.id=?"
            ).bind(id).first();
            const sizeStockRows = await fetchSizeStock(env, id);
            const colorsList = await fetchColorsForProduct(env, id);
            return ok(mapProduct(product, sizeStockRows, colorsList, env.R2_PUBLIC_URL || ''), 'Product updated');
        } catch (e) {
            console.error('Update product error:', e);
            return serverError('Failed to update product');
        }
    }

    // PATCH /api/products/:id — admin toggle/status/stock update
    if (path.match(/^\/\d+$/) && method === 'PATCH') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = parseInt(path.slice(1));
        try {
            const body = await request.json();
            const updates = [];
            const binds = [];

            // If size_stock provided, update per-size
            if (body.size_stock && Array.isArray(body.size_stock)) {
                await upsertSizeStock(env, id, body.size_stock);
                // Log inventory change
                const prod = await env.DB.prepare("SELECT id, name, stock FROM products WHERE id=?").bind(id).first();
                if (prod) {
                    const newStock = body.size_stock.reduce((s, r) => s + (r.stock || 0), 0);
                    const diff = newStock - (prod.stock || 0);
                    await env.DB.prepare(
                        "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?,?,'adjustment',?,?,?,?,datetime('now'))"
                    ).bind(prod.id, prod.name, prod.stock || 0, diff, newStock, String(body.reason || "Admin size-stock adjustment")).run();
                }
            } else if (body.stock !== undefined) {
                updates.push("stock=?");
                binds.push(Math.max(0, parseInt(body.stock)));
            }

            if (body.active !== undefined) {
                updates.push("active=?");
                binds.push(body.active ? 1 : 0);
            } else if (body.is_active !== undefined) {
                updates.push("active=?");
                binds.push(body.is_active ? 1 : 0);
            }
            if (body.featured !== undefined) {
                updates.push("featured=?");
                binds.push(body.featured ? 1 : 0);
            } else if (body.is_featured !== undefined) {
                updates.push("featured=?");
                binds.push(body.is_featured ? 1 : 0);
            }
            if (body.is_new !== undefined) {
                updates.push("is_new=?");
                binds.push(body.is_new ? 1 : 0);
            }
            if (body.is_trending !== undefined) {
                updates.push("is_trending=?");
                binds.push(body.is_trending ? 1 : 0);
            }
            if (body.show_mrp !== undefined) {
                updates.push("show_mrp=?");
                binds.push(body.show_mrp ? 1 : 0);
            }

            // Log legacy stock change
            if (body.stock !== undefined && !body.size_stock) {
                const prod = await env.DB.prepare("SELECT id, name, stock FROM products WHERE id=?").bind(id).first();
                if (prod) {
                    const newStock = Math.max(0, parseInt(body.stock));
                    const diff = newStock - (prod.stock || 0);
                    await env.DB.prepare(
                        "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?,?,'adjustment',?,?,?,?,datetime('now'))"
                    ).bind(prod.id, prod.name, prod.stock || 0, diff, newStock, String(body.reason || "Admin adjustment")).run();
                }
            }

            if (updates.length > 0) {
                updates.push("updated_at=datetime('now')");
                binds.push(id);
                await env.DB.prepare(
                    `UPDATE products SET ${updates.join(', ')} WHERE id=?`
                ).bind(...binds).run();
            }

            const product = await env.DB.prepare(
                "SELECT p.*, c.id as category_id FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) WHERE p.id=?"
            ).bind(id).first();
            const sizeStockRows = await fetchSizeStock(env, id);
            const colorsList = await fetchColorsForProduct(env, id);
            return ok(mapProduct(product, sizeStockRows, colorsList, env.R2_PUBLIC_URL || ''), 'Product updated');
        } catch (e) {
            console.error('PATCH product error:', e);
            return serverError('Failed to patch product');
        }
    }

    // PATCH /api/products/:id/mrp-visibility — admin only: toggle MRP display to customers
    if (path.match(/^\/\d+\/mrp-visibility$/) && method === 'PATCH') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = parseInt(path.split('/')[1]);
        try {
            const body = await request.json();
            const showMrp = body.show_mrp !== undefined ? (body.show_mrp ? 1 : 0) : null;
            if (showMrp === null) return error('show_mrp (boolean) is required', 400);

            await env.DB.prepare(
                "UPDATE products SET show_mrp=?, updated_at=datetime('now') WHERE id=?"
            ).bind(showMrp, id).run();

            const product = await env.DB.prepare(
                "SELECT p.*, c.id as category_id FROM products p LEFT JOIN categories c ON LOWER(c.name) = LOWER(p.category) WHERE p.id=?"
            ).bind(id).first();
            if (!product) return notFound('Product not found');
            const sizeStockRows = await fetchSizeStock(env, id);
            const colorsList = await fetchColorsForProduct(env, id);
            return ok(mapProduct(product, sizeStockRows, colorsList, env.R2_PUBLIC_URL || ''), showMrp ? 'MRP is now visible to customers' : 'MRP is now hidden from customers');
        } catch (e) {
            console.error('MRP visibility toggle error:', e);
            return serverError('Failed to update MRP visibility');
        }
    }

    // DELETE /api/products/:id — admin only
    if (path.match(/^\/\d+$/) && method === 'DELETE') {
        const { error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = parseInt(path.slice(1));
        try {
            // Check if product is referenced in any existing orders
            const saleCheck = await env.DB.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').bind(id).first();
            const hasSales = saleCheck && (saleCheck.count || 0) > 0;

            if (hasSales) {
                // Soft-delete: deactivate the product so order history is preserved
                await env.DB.prepare('UPDATE products SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').bind(id).run();
                return ok({ soft_deleted: true }, 'Product has order history. Deactivated (soft-deleted) to preserve order records.');
            }

            // Hard-delete: retrieve all associated image URLs before deleting the product
            const imageRows = await env.DB.prepare('SELECT url FROM product_images WHERE product_id = ?').bind(id).all();
            const images = imageRows.results || [];
            
            // Delete product, size stock, images, and reviews from database
            await env.DB.batch([
                env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_size_stock WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id),
                env.DB.prepare('DELETE FROM product_reviews WHERE product_id = ?').bind(id)
            ]);

            // Delete files from R2
            const bucket = env.MEDIA || env.BUCKET;
            if (bucket) {
                const helper = (urlStr) => {
                    const marker = 'products/';
                    const idx = urlStr.indexOf(marker);
                    if (idx !== -1) return urlStr.substring(idx);
                    try {
                        const urlObj = new URL(urlStr, 'https://heelsup.in');
                        const k = urlObj.searchParams.get('key');
                        if (k) return decodeURIComponent(k);
                    } catch {}
                    return null;
                };

                for (const img of images) {
                    const key = helper(img.url);
                    if (key) {
                        try {
                            await bucket.delete(key);
                            console.log(`[R2] Deleted product image key: ${key}`);
                        } catch (r2Err) {
                            console.error(`[R2] Failed to delete image key: ${key}`, r2Err);
                        }
                    }
                }
            }

            return ok(null, 'Product and associated R2 images deleted');
        } catch (e) {
            console.error('Delete product error:', e);
            return serverError('Failed to delete product');
        }
    }

    return error('Route not found', 404);
}