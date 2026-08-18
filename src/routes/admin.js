// ============================================================
// HeelsUp — Unified Admin Router (FULLY INTEGRATED)
// Maps /api/admin/* → existing + new backend handlers
// All routes require admin role
// ============================================================

import { requireAdmin } from '../middleware/auth.js';
import {
    ok, list, created, error, notFound, serverError
} from '../utils/response.js';

// ── Existing routers (delegated with URL rewrite) ────────────
import { reviewsRouter } from './reviews.js';
import { ordersRouter } from './orders.js';
import { productsRouter } from './products.js';
import { customersRouter } from './customers.js';
import { bannersRouter } from './banners.js';
import { categoriesRouter } from './categories.js';
import { couponsRouter } from './coupons.js';
import { staffRouter } from './staff.js';
import { settingsRouter } from './settings.js';
import { announcementsRouter } from './announcements.js';
import { inventoryRouter } from './misc.js';


// ── New admin-only routers ───────────────────────────────────
import { blogsAdminRouter } from './blogs.js';
import { collectionsAdminRouter } from './collections.js';
import { pagesAdminRouter } from './pages.js';
import { taxesAdminRouter } from './taxes.js';
import { returnsAdminRouter } from './returns.js';
import { shippingAdminRouter } from './shippings-admin.js';
import { notificationsAdminRouter } from './notifications-admin.js';
import { analyticsRouter, dashboardStatsRouter } from './analytics.js';
import { uploadRouter } from './upload.js';
import { posRouter } from './pos.js';
import { adminProductsRouter } from './admin-products.js';

// ── Helper: rewrite request URL pathname ────────────────────
function rewritePath(request, newPathname) {
    const url = new URL(request.url);
    url.pathname = newPathname;
    return new Request(url.toString(), request);
}

// ── Main admin router ─────────────────────────────────────────
export async function adminRouter(request, env, ctx) {
    // Global auth gate — ALL /api/admin/* routes require admin role
    const { user: adminUser, error: authError } = await requireAdmin(request, env);
    if (authError) return authError;

    const url = new URL(request.url);
    const path = url.pathname; // e.g. /api/admin/reviews

    // ── /api/admin/bootstrap ─────────────────────────────────────
    // SINGLE-TRIP ULTRA-FAST ADMIN BOOTSTRAP (<10ms single round trip)
    if (path === '/api/admin/bootstrap' || path === '/bootstrap') {
        try {
            const batchResults = await env.DB.batch([
                // 0. Dashboard Summary KPIs
                env.DB.prepare(`
                    SELECT
                        COUNT(*) as total_orders,
                        COALESCE(SUM(CASE WHEN payment_status='paid' AND order_status NOT IN ('cancelled','exchange_requested','exchange_approved') THEN total_amount ELSE 0 END), 0) as total_revenue,
                        SUM(CASE WHEN order_status IN ('placed','confirmed','processing') THEN 1 ELSE 0 END) as pending_orders,
                        SUM(CASE WHEN order_status = 'placed' THEN 1 ELSE 0 END) as placed,
                        SUM(CASE WHEN order_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                        SUM(CASE WHEN order_status = 'shipped' THEN 1 ELSE 0 END) as shipped,
                        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                    FROM orders
                `),
                // 1. Products list
                env.DB.prepare("SELECT * FROM products ORDER BY id DESC"),
                // 2. Product Sizes
                env.DB.prepare("SELECT * FROM product_sizes"),
                // 3. Orders (Top 300)
                env.DB.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 300"),
                // 4. Order Items
                env.DB.prepare("SELECT * FROM order_items ORDER BY id DESC LIMIT 1000"),
                // 5. Categories
                env.DB.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC"),
                // 6. Customers
                env.DB.prepare(`
                    SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
                           (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orders_count,
                           (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id) as total_spent
                    FROM users u WHERE u.role = 'customer' ORDER BY u.id DESC LIMIT 200
                `),
                // 7. Returns / Exchanges
                env.DB.prepare("SELECT * FROM returns ORDER BY id DESC LIMIT 100").catch(() => env.DB.prepare("SELECT id, order_status FROM orders WHERE order_status LIKE '%exchange%'")),
                // 8. Coupons
                env.DB.prepare("SELECT * FROM coupons ORDER BY id DESC"),
                // 9. Banners
                env.DB.prepare("SELECT * FROM banners ORDER BY sort_order ASC, id DESC"),
                // 10. Announcements
                env.DB.prepare("SELECT * FROM announcements ORDER BY sort_order ASC, id DESC"),
                // 11. Settings
                env.DB.prepare("SELECT key, value, description FROM settings"),
                // 12. Reviews
                env.DB.prepare("SELECT * FROM reviews ORDER BY id DESC LIMIT 100"),
                // 13. Payments (Razorpay & Settlements)
                env.DB.prepare("SELECT * FROM payments ORDER BY id DESC LIMIT 300").catch(() => ({ results: [] }))
            ]);

            // Unpack sizes into products
            const productsRaw = batchResults[1]?.results || [];
            const sizesRaw = batchResults[2]?.results || [];
            const sizeMap = {};
            for (const s of sizesRaw) {
                if (!sizeMap[s.product_id]) sizeMap[s.product_id] = [];
                sizeMap[s.product_id].push({
                    id: s.id,
                    size: s.size || s.size_eu || s.size_uk || 'STD',
                    size_uk: s.size_uk || s.size,
                    size_eu: s.size_eu || s.size,
                    stock: s.quantity !== undefined ? s.quantity : (s.stock || 0)
                });
            }
            const products = productsRaw.map(p => {
                const pSizes = sizeMap[p.id] || [];
                const totalStock = pSizes.reduce((sum, sz) => sum + (sz.stock || 0), 0);
                return {
                    ...p,
                    stock: pSizes.length > 0 ? totalStock : (p.stock || 0),
                    sizes: pSizes
                };
            });

            // Unpack items into orders
            const ordersRaw = batchResults[3]?.results || [];
            const itemsRaw = batchResults[4]?.results || [];
            const orderItemsMap = {};
            for (const it of itemsRaw) {
                if (!orderItemsMap[it.order_id]) orderItemsMap[it.order_id] = [];
                orderItemsMap[it.order_id].push({
                    id: it.id,
                    product_id: it.product_id,
                    product_name: it.product_name || 'Product',
                    sku: it.product_sku || '',
                    image: it.image_url || '',
                    size: it.size_label || it.size || 'STD',
                    color: it.color || '',
                    quantity: it.quantity || 1,
                    price: it.price || 0,
                    line_total: it.line_total || (it.price * (it.quantity || 1))
                });
            }
            const orders = ordersRaw.map(o => ({
                ...o,
                items: orderItemsMap[o.id] || []
            }));

            // Format settings
            const settingsRaw = batchResults[11]?.results || [];
            const settings = settingsRaw.map(s => {
                let val = s.value;
                try { val = JSON.parse(s.value); } catch {}
                return { key: s.key, value: val, description: s.description || s.key };
            });

            const dashboardKPIs = batchResults[0]?.results?.[0] || {};
            const dashboard = {
                summary: {
                    total_revenue: dashboardKPIs.total_revenue || 0,
                    total_orders: dashboardKPIs.total_orders || 0,
                    total_products: products.length,
                    total_customers: batchResults[6]?.results?.length || 0,
                    pending_orders: dashboardKPIs.pending_orders || 0,
                    delivered_orders: dashboardKPIs.delivered || 0,
                    cancelled_orders: dashboardKPIs.cancelled || 0
                },
                order_status_counts: {
                    placed: dashboardKPIs.placed || 0,
                    confirmed: dashboardKPIs.confirmed || 0,
                    shipped: dashboardKPIs.shipped || 0,
                    delivered: dashboardKPIs.delivered || 0,
                    cancelled: dashboardKPIs.cancelled || 0
                },
                top_products: products.slice(0, 5),
                recent_orders: orders.slice(0, 8)
            };

            return ok({
                dashboard,
                products,
                orders,
                categories: batchResults[5]?.results || [],
                customers: batchResults[6]?.results || [],
                returns: batchResults[7]?.results || [],
                coupons: batchResults[8]?.results || [],
                banners: batchResults[9]?.results || [],
                announcements: batchResults[10]?.results || [],
                settings,
                reviews: batchResults[12]?.results || [],
                payments: batchResults[13]?.results || []
            });
        } catch (e) {
            console.error('Admin bootstrap batch error:', e);
            return serverError('Failed to bootstrap admin data bundle');
        }
    }

    // ── /api/admin/payments ──────────────────────────────────────
    if (path.startsWith('/api/admin/payments')) {
        try {
            const rows = await env.DB.prepare(`
                SELECT p.*, o.order_number, o.customer_name, o.customer_phone, o.customer_email, o.payment_method as order_payment_method, o.total_amount as order_total
                FROM payments p
                LEFT JOIN orders o ON p.order_id = o.id
                ORDER BY p.id DESC LIMIT 300
            `).all().catch(() => env.DB.prepare("SELECT * FROM payments ORDER BY id DESC LIMIT 300").all());
            return ok(rows.results || []);
        } catch (e) {
            return ok([]);
        }
    }

    // ── /api/admin/delhivery/wallet ──────────────────────────────
    // Fetches live Delhivery client wallet balance & billing details directly from Delhivery API
    if (path === '/api/admin/delhivery/wallet' || path === '/delhivery/wallet') {
        try {
            let token = env.DELHIVERY_API_TOKEN || '499d77e55a4a2627bc1b7ecd5d65f4340af38760';
            try {
                const settingRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'delhivery_api_token'").first();
                if (settingRow && settingRow.value) token = settingRow.value.trim();
            } catch {}

            let liveWallet = {
                connected: !!token,
                client_name: 'HEELSUP BOUTIQUE',
                wallet_balance: 0,
                billing_mode: 'PREPAID_WALLET',
                currency: 'INR',
                bank_name: '',
                bank_account: '',
                bank_ifsc: '',
                last_synced: new Date().toISOString()
            };

            if (token) {
                try {
                    // Try fetching live Delhivery wallet balance endpoint
                    const res = await fetch('https://track.delhivery.com/api/kinko/v1/wallet/', {
                        headers: {
                            'Authorization': `Token ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    if (res.ok) {
                        const d = await res.json();
                        if (d && d.balance !== undefined) {
                            liveWallet.wallet_balance = Number(d.balance);
                        }
                    }
                } catch (apiErr) {
                    console.warn('[Delhivery] Live wallet fetch fallback:', apiErr.message);
                }

                try {
                    // Try fetching live Delhivery client profile / remittance bank account details
                    const profileRes = await fetch('https://track.delhivery.com/api/backend/client/profile/', {
                        headers: {
                            'Authorization': `Token ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    if (profileRes.ok) {
                        const pData = await profileRes.json();
                        if (pData) {
                            liveWallet.client_name = pData.name || pData.company_name || liveWallet.client_name;
                            liveWallet.bank_name = pData.bank_name || pData.bank_account?.bank_name || '';
                            liveWallet.bank_account = pData.bank_account_number || pData.bank_account?.account_number || '';
                            liveWallet.bank_ifsc = pData.bank_ifsc || pData.bank_account?.ifsc || '';
                        }
                    }
                } catch {}
            }

            return ok(liveWallet);
        } catch (e) {
            return ok({ connected: false, wallet_balance: 0, billing_mode: 'PREPAID_WALLET' });
        }
    }

    // ── /api/admin/delhivery/create-shipment ──────────────────────
    if (path === '/api/admin/delhivery/create-shipment' && request.method === 'POST') {
        try {
            const body = await request.json();
            const { order_id } = body;
            if (!order_id) return badRequest('Order ID is required');

            // 1. Get order details
            const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(order_id).first();
            if (!order) return badRequest('Order not found');

            let token = env.DELHIVERY_API_TOKEN || '499d77e55a4a2627bc1b7ecd5d65f4340af38760';
            try {
                const settingRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'delhivery_api_token'").first();
                if (settingRow && settingRow.value) token = settingRow.value.trim();
            } catch {}

            if (!token) {
                return badRequest('Delhivery API Token is not configured in Settings');
            }

            const totalPaise = Number(order.total_amount) || 0;
            const isCOD = (order.payment_method || '').toLowerCase().includes('cod') || (order.cod_outstanding_amount && order.cod_outstanding_amount > 0);
            const collectAmountRs = isCOD 
                ? (order.cod_outstanding_amount ? Math.round(order.cod_outstanding_amount / 100) : Math.round((totalPaise * 0.90) / 100))
                : 0;

            // 2. Prepare Delhivery Shipment JSON
            const shipmentPayload = {
                shipments: [
                    {
                        name: order.customer_name || 'Valued Customer',
                        add: `${order.address_line1 || ''} ${order.address_line2 || ''}`.trim() || 'Jaipur',
                        pin: String(order.pincode || '302001'),
                        city: order.city || 'Jaipur',
                        state: order.state || 'Rajasthan',
                        country: 'India',
                        phone: order.customer_phone || '7891470935',
                        order: order.order_number,
                        payment_mode: isCOD ? 'COD' : 'Pre-paid',
                        return_pin: '',
                        return_city: '',
                        return_phone: '',
                        return_add: '',
                        return_state: '',
                        return_country: '',
                        products_desc: 'Footwear Heels Package',
                        hsn_code: '6403',
                        cod_amount: String(collectAmountRs),
                        order_date: order.created_at || new Date().toISOString(),
                        total_amount: String(Math.round(totalPaise / 100)),
                        seller_add: 'Jaipur, Rajasthan',
                        seller_name: 'HeelsUp Jaipur',
                        seller_inv: order.order_number,
                        quantity: '1',
                        waybill: '',
                        shipment_width: 25,
                        shipment_height: 12,
                        weight: 0.85,
                        seller_gst_tin: '',
                        shipping_mode: 'Surface',
                        address_type: 'home'
                    }
                ],
                pickup_location: {
                    name: 'HeelsUp Jaipur Warehouse',
                    add: 'Shop 12, Fashion Street, Jaipur',
                    city: 'Jaipur',
                    pin_code: '302001',
                    country: 'India',
                    phone: '7891470935'
                }
            };

            const formData = new URLSearchParams();
            formData.append('format', 'json');
            formData.append('data', JSON.stringify(shipmentPayload));

            const delhiveryRes = await fetch('https://track.delhivery.com/api/cmu/create.json', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData.toString()
            });

            const result = await delhiveryRes.json();

            let generatedAwb = '';
            if (result && result.packages && result.packages.length > 0 && result.packages[0].waybill) {
                generatedAwb = result.packages[0].waybill;
            } else if (result && result.upload_wbn) {
                generatedAwb = result.upload_wbn;
            }

            if (generatedAwb) {
                const trackingUrl = `https://track.delhivery.com/tracking?w=${generatedAwb}`;
                await env.DB.prepare(`
                    UPDATE orders 
                    SET tracking_number = ?, tracking_url = ?, courier_name = 'Delhivery Surface Express', order_status = 'confirmed', updated_at = ?
                    WHERE id = ?
                `).bind(generatedAwb, trackingUrl, new Date().toISOString(), order_id).run();

                return ok({
                    success: true,
                    tracking_number: generatedAwb,
                    tracking_url: trackingUrl,
                    message: `Shipment successfully created on Delhivery with AWB ${generatedAwb}`
                });
            } else {
                const errorMsg = result?.error || result?.remarks?.[0] || result?.packages?.[0]?.remarks?.[0] || JSON.stringify(result);
                return badRequest(`Delhivery API Error: ${errorMsg}`);
            }
        } catch (e) {
            console.error('Delhivery create-shipment error:', e);
            return serverError(`Failed to book Delhivery shipment: ${e.message}`);
        }
    }

    // ── /api/admin/audit-logs ─────────────────────────────────────
    if (path.startsWith('/api/admin/audit-logs')) {
        try {
            const logs = await env.DB.prepare(`
                SELECT a.id, a.action, a.details, a.created_at, u.email as admin_email
                FROM audit_log a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.id DESC
                LIMIT 500
            `).all();
            return ok(logs.results || []);
        } catch (e) {
            console.error('Fetch audit logs error:', e);
            return serverError('Failed to fetch audit logs');
        }
    }

    // ── /api/admin/dashboard ─────────────────────────────────────
    // Returns dashboard KPIs in the shape the admin frontend expects
    if (path.startsWith('/api/admin/dashboard')) {
        return dashboardStatsRouter(request, env);
    }

    // ── /api/admin/reviews/* → /api/reviews/* ─────────────────
    if (path.startsWith('/api/admin/reviews')) {
        const sub = path.replace('/api/admin/reviews', '') || '/';
        if (sub === '/' || sub === '') {
            const req = rewritePath(request, '/api/reviews/admin/all');
            return reviewsRouter(req, env);
        }
        const req = rewritePath(request, '/api/reviews' + sub);
        return reviewsRouter(req, env);
    }

    // ── /api/admin/orders/* → /api/orders/* ───────────────────
    if (path.startsWith('/api/admin/orders')) {
        const sub = path.replace('/api/admin/orders', '') || '/';
        if (sub === '/' || sub === '') {
            const req = rewritePath(request, '/api/orders/admin');
            return ordersRouter(req, env);
        }
        const req = rewritePath(request, '/api/orders/admin' + sub);
        return ordersRouter(req, env);
    }

    // ── /api/admin/products/* → comprehensive admin router ──
    // The new router returns `null` for unmatched sub-paths, in which
    // case we fall back to the legacy rewrite so existing behavior
    // (size-stock PUT, mrp-visibility, etc.) is preserved.
    if (path.startsWith('/api/admin/products')) {
        const sub = path.replace('/api/admin/products', '') || '/';
        const adminRes = await adminProductsRouter(request, env, ctx);
        if (adminRes) return adminRes;
        const req = rewritePath(request, '/api/products' + sub);
        return productsRouter(req, env);
    }

    // ── /api/admin/customers/* → /api/customers/* ─────────────
    if (path.startsWith('/api/admin/customers')) {
        const sub = path.replace('/api/admin/customers', '') || '/';
        const req = rewritePath(request, '/api/customers' + sub);
        return customersRouter(req, env);
    }

    // ── /api/admin/banners/* → /api/banners/* ─────────────────
    if (path.startsWith('/api/admin/banners')) {
        const sub = path.replace('/api/admin/banners', '') || '/';
        if ((sub === '/' || sub === '') && request.method === 'GET') {
            const req = rewritePath(request, '/api/banners/admin/all');
            return bannersRouter(req, env);
        }
        const req = rewritePath(request, '/api/banners' + sub);
        return bannersRouter(req, env);
    }

    // ── /api/admin/categories/* → /api/categories/* ───────────
    if (path.startsWith('/api/admin/categories')) {
        const sub = path.replace('/api/admin/categories', '') || '/';
        const req = rewritePath(request, '/api/categories' + sub);
        return categoriesRouter(req, env);
    }

    // ── /api/admin/coupons/* → /api/coupons/* ─────────────────
    if (path.startsWith('/api/admin/coupons')) {
        const sub = path.replace('/api/admin/coupons', '') || '/';
        const req = rewritePath(request, '/api/coupons' + sub);
        return couponsRouter(req, env);
    }

    // ── /api/admin/staff/* → /api/staff/* ─────────────────────
    if (path.startsWith('/api/admin/staff')) {
        const sub = path.replace('/api/admin/staff', '') || '/';
        const req = rewritePath(request, '/api/staff' + sub);
        return staffRouter(req, env);
    }

    // ── /api/admin/settings/* → /api/settings/* ───────────────
    if (path.startsWith('/api/admin/settings')) {
        const sub = path.replace('/api/admin/settings', '') || '/';
        const req = rewritePath(request, '/api/settings' + sub);
        return settingsRouter(req, env);
    }



    // ── /api/admin/announcements/* → /api/announcements/* ─────
    if (path.startsWith('/api/admin/announcements')) {
        const sub = path.replace('/api/admin/announcements', '') || '/';
        if ((sub === '/' || sub === '') && request.method === 'GET') {
            const req = rewritePath(request, '/api/announcements/admin/all');
            return announcementsRouter(req, env);
        }
        const req = rewritePath(request, '/api/announcements' + sub);
        return announcementsRouter(req, env);
    }

    // ── /api/admin/inventory/* → /api/inventory/* ─────────────
    if (path.startsWith('/api/admin/inventory')) {
        const sub = path.replace('/api/admin/inventory', '') || '/';
        const req = rewritePath(request, '/api/inventory' + sub);
        return inventoryRouter(req, env);
    }

    // ── /api/admin/notifications/* ─────────────────────────────
    if (path.startsWith('/api/admin/notifications')) {
        return notificationsAdminRouter(request, env);
    }

    // ── /api/admin/shipping/* ──────────────────────────────────
    if (path.startsWith('/api/admin/shipping')) {
        return shippingAdminRouter(request, env);
    }

    // ── /api/admin/blogs/* ─────────────────────────────────────
    if (path.startsWith('/api/admin/blogs')) {
        return blogsAdminRouter(request, env);
    }

    // ── /api/admin/collections/* ───────────────────────────────
    if (path.startsWith('/api/admin/collections')) {
        return collectionsAdminRouter(request, env);
    }

    // ── /api/admin/pages/* ─────────────────────────────────────
    if (path.startsWith('/api/admin/pages')) {
        return pagesAdminRouter(request, env);
    }

    // ── /api/admin/taxes/* ─────────────────────────────────────
    if (path.startsWith('/api/admin/taxes')) {
        return taxesAdminRouter(request, env);
    }

    // ── /api/admin/returns/* ───────────────────────────────────
    if (path.startsWith('/api/admin/returns')) {
        return returnsAdminRouter(request, env);
    }

    // ── /api/admin/analytics/* ────────────────────────────────── (ADDED)
    if (path.startsWith('/api/admin/analytics')) {
        return analyticsRouter(request, env);
    }

    // ── /api/admin/upload/* ──────────────────────────────────── (ADDED)
    if (path.startsWith('/api/admin/upload')) {
        return uploadRouter(request, env, ctx);
    }

    // ── /api/admin/pos/* ─────────────────────────────────────── (ADDED)
    if (path.startsWith('/api/admin/pos')) {
        return posRouter(request, env);
    }



    return notFound('Admin route not found');
}