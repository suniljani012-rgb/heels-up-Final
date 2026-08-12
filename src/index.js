// src/index.js - HeelsUp Cloudflare Worker (Production-ready — all routes wired)
import { handleOptions, addCors } from './middleware/cors.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { customersRouter } from './routes/customers.js';
import { cartRouter } from './routes/cart.js';
import { wishlistRouter } from './routes/wishlist.js';
import { categoriesRouter } from './routes/categories.js';
import { couponsRouter } from './routes/coupons.js';
import { reviewsRouter } from './routes/reviews.js';
import { uploadRouter } from './routes/upload.js';
import { paymentRouter } from './routes/payment.js';
import { posRouter } from './routes/pos.js';
import { analyticsRouter } from './routes/analytics.js';
import { bannersRouter } from './routes/banners.js';
import { staffRouter } from './routes/staff.js';
import { settingsRouter } from './routes/settings.js';
import { contactRouter, newsletterRouter, inventoryRouter } from './routes/misc.js';
import { handleReports } from './routes/reports.js';
import { handleNotifications } from './routes/notifications.js';
import { handleShipping } from './routes/shipping.js';
import { blogsPublicRouter } from './routes/blogs.js';
import { pagesPublicRouter } from './routes/pages.js';
import { adminRouter } from './routes/admin.js';
import { announcementsRouter } from './routes/announcements.js';

import { addressesRouter } from './routes/addresses.js';
import { returnsCustomerRouter } from './routes/returns.js';
import { json } from './utils/response.js';
import { authRateLimit, apiRateLimit, paymentRateLimit, adminRateLimit } from './middleware/ratelimit.js';
import { trackApiRequest } from './utils/ga4-measurement.js';

// ── Admin alias helper ────────────────────────────────────────────────────────
// Frontend uses /api/admin/* — backend has routes at /api/* — this bridges them.
// It rewrites the URL path so existing routers work unchanged.
function rewriteAdminPath(request, fromPrefix, toPrefix) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(fromPrefix, toPrefix);
  return new Request(url.toString(), request);
}

// In-memory time-gate to avoid KV sub-requests on every fetch event
let lastMaintRunInMemory = 0;

export default {
  async fetch(request, env, ctx) {
    // Auto-update DB settings to ₹1599 threshold and fix announcements text.
    // TIME-GATED IN-MEMORY: avoids KV sub-requests and Worker CPU overhead on every fetch event.
    const now = Date.now();
    if (now - lastMaintRunInMemory > 3600_000 && ctx && typeof ctx.waitUntil === 'function' && env.DB) {
      lastMaintRunInMemory = now;
      ctx.waitUntil((async () => {
        try {
          await env.DB.prepare("UPDATE settings SET value = '1599' WHERE key = 'shipping_free_above'").run();
          await env.DB.prepare("UPDATE settings SET value = '159900' WHERE key = 'free_shipping_above'").run();
          await env.DB.prepare("UPDATE announcements SET text = '🚚 FREE Shipping on orders above ₹1599' WHERE text LIKE '%above %999%' OR text LIKE '%above %799%'").run();
          await env.DB.prepare("ALTER TABLE orders ADD COLUMN cod_advance_paid INTEGER DEFAULT 0").run().catch(() => {});
          await env.DB.prepare("ALTER TABLE orders ADD COLUMN cod_outstanding_amount INTEGER DEFAULT 0").run().catch(() => {});
          await env.DB.prepare("UPDATE products SET rating = 0 WHERE review_count = 0 OR review_count IS NULL").run().catch(() => {});
          await env.DB.prepare("UPDATE products SET active = 1 WHERE sku LIKE 'HU-%'").run().catch(() => {});
        } catch (err) {
          console.warn('DB settings auto-update failed:', err);
        }
      })());
    }

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 2. Health check
    if (path === '/api/health') {
      return addCors(json({ success: true, message: 'HeelsUp API is running!', ts: new Date().toISOString() }), request);
    }

    // 3. API Router Logic
    if (path.startsWith('/api/')) {
      const pathNormalized = path.replace(/\/$/, "");
      const isCacheable = method === "GET" && !pathNormalized.startsWith("/api/admin") && (
        pathNormalized === "/api/banners" ||
        pathNormalized === "/api/categories" ||

        pathNormalized === "/api/settings" ||
        pathNormalized === "/api/settings/public" ||
        pathNormalized === "/api/products" ||
        pathNormalized === "/api/reviews" ||
        pathNormalized === "/api/reviews/latest" ||
        pathNormalized === "/api/search" ||
        pathNormalized === "/api/upload" ||
        /^\/api\/products\/(\d+)$/.test(pathNormalized) ||
        /^\/api\/products\/(\d+)\/reviews$/.test(pathNormalized)
      );

      let cache = null;
      let cacheKey = null;
      if (isCacheable) {
        try {
          cache = caches.default;
          cacheKey = new Request(url.toString(), request);
          const cachedRes = await cache.match(cacheKey);
          if (cachedRes) return cachedRes;
        } catch (err) {
          console.warn("Cache match failed:", err);
        }
      }

      // Rate limiting
      let rlRes = null;
      try {
        if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register') || path.startsWith('/api/auth/forgot-password')) {
          rlRes = await authRateLimit(request, env);
        } else if (path.startsWith('/api/payment')) {
          rlRes = await paymentRateLimit(request, env);
        } else if (path.startsWith('/api/admin')) {
          rlRes = await adminRateLimit(request, env);
        } else {
          rlRes = await apiRateLimit(request, env);
        }
      } catch (e) {
        console.warn('Rate limit error:', e);
      }
      if (rlRes) {
        return addCors(rlRes, request);
      }

      let response;
      try {

        // ── /api/admin/* ── Delegated to unified adminRouter ─────────────────────
        // adminRouter handles: dashboard, reviews, orders, products, customers,
        // banners, categories, coupons, staff, settings, inventory, notifications,
        // shipping, blogs, collections, pages, taxes, returns, analytics, upload, pos
        if (path.startsWith('/api/admin/')) {
          response = await adminRouter(request, env, ctx);
        }
        else if (path.startsWith('/api/payments/razorpay/')) {
          const rewritten = rewriteAdminPath(request, '/api/payments/razorpay', '/api/payment');
          response = await paymentRouter(rewritten, env);
        }

        // ── Standard routes ──────────────────────────────────────────────────
        else if (path.startsWith('/api/config')) {
          try {
            const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'google_client_id'").first();
            response = json({ googleClientId: row ? row.value : '' });
          } catch (e) {
            response = json({ googleClientId: '' });
          }
        }
        else if (path.startsWith('/api/auth')) response = await authRouter(request, env);
        else if (path.startsWith('/api/products')) response = await productsRouter(request, env, ctx);

        else if (path.startsWith('/api/addresses')) response = await addressesRouter(request, env);
        else if (path.startsWith('/api/returns')) response = await returnsCustomerRouter(request, env);
        else if (path.startsWith('/api/orders')) response = await ordersRouter(request, env);
        else if (path.startsWith('/api/customers')) response = await customersRouter(request, env);
        else if (path.startsWith('/api/cart')) response = await cartRouter(request, env);
        else if (path.startsWith('/api/wishlist')) response = await wishlistRouter(request, env);
        else if (path.startsWith('/api/categories')) response = await categoriesRouter(request, env);
        else if (path.startsWith('/api/coupons')) response = await couponsRouter(request, env);
        else if (path.startsWith('/api/reviews')) response = await reviewsRouter(request, env);
        else if (path.startsWith('/api/upload')) response = await uploadRouter(request, env, ctx);
        else if (path.startsWith('/api/payment')) response = await paymentRouter(request, env);
        else if (path.startsWith('/api/pos')) response = await posRouter(request, env);
        else if (path.startsWith('/api/analytics')) response = await analyticsRouter(request, env);
        else if (path.startsWith('/api/banners')) response = await bannersRouter(request, env);
        else if (path.startsWith('/api/announcements')) response = await announcementsRouter(request, env);
        else if (path.startsWith('/api/staff')) response = await staffRouter(request, env);
        else if (path.startsWith('/api/settings')) response = await settingsRouter(request, env);
        else if (path.startsWith('/api/notifications')) response = await handleNotifications(request, env, path, method);
        else if (path.startsWith('/api/shipping')) response = await handleShipping(request, env, path, method);
        else if (path.startsWith('/api/contact')) response = await contactRouter(request, env);
        else if (path.startsWith('/api/newsletter')) response = await newsletterRouter(request, env);
        else if (path.startsWith('/api/inventory')) response = await inventoryRouter(request, env);
        else if (path.startsWith('/api/reports')) response = await handleReports(request, env, path, method);
        else if (path.startsWith('/api/blogs')) response = await blogsPublicRouter(request, env);
        else if (path.startsWith('/api/pages')) response = await pagesPublicRouter(request, env);
        else response = json({ success: false, error: 'API route not found' }, 404);

      } catch (err) {
        console.error('API Error:', err);
        response = json({ success: false, error: 'Internal server error' }, 500);
      }

      const corsResponse = addCors(response, request);

      // Add security headers to API responses
      const apiHeaders = new Headers(corsResponse.headers);
      apiHeaders.set('X-Content-Type-Options', 'nosniff');
      apiHeaders.set('X-Frame-Options', 'DENY');
      apiHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      apiHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      apiHeaders.set('X-XSS-Protection', '1; mode=block');

      if (isCacheable && response && response.status === 200) {
        if (pathNormalized === "/api/upload") {
          apiHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
          apiHeaders.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
        } else {
          apiHeaders.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
          apiHeaders.set("CDN-Cache-Control", "public, max-age=300");
        }
      }

      const secureCorsResponse = new Response(corsResponse.body, {
        status: corsResponse.status,
        statusText: corsResponse.statusText,
        headers: apiHeaders
      });

      // Store in Cloudflare Edge Cache if cacheable and status is 200 OK
      if (isCacheable && response && response.status === 200 && cache && cacheKey) {
        try {
          if (ctx && ctx.waitUntil) {
            ctx.waitUntil(cache.put(cacheKey, secureCorsResponse.clone()).catch(() => {}));
          } else {
            await cache.put(cacheKey, secureCorsResponse.clone()).catch(() => {});
          }
        } catch (e) {
          console.warn("Cache write failed:", e);
        }
      }

      // Clear cache on mutations (POST, PUT, DELETE, PATCH) if response is 2xx
      if (method !== "GET" && method !== "OPTIONS" && secureCorsResponse.status >= 200 && secureCorsResponse.status < 300) {
        try {
          const cache = caches.default;
          const pathsToInvalidate = [];

          if (pathNormalized.startsWith("/api/products") || pathNormalized.startsWith("/api/admin/products")) {
            pathsToInvalidate.push(new URL("/api/products", url.origin).toString());
            const match = pathNormalized.match(/^\/api\/(admin\/)?products\/(\d+)/);
            if (match) {
              pathsToInvalidate.push(new URL(`/api/products/${match[2]}`, url.origin).toString());
            }
          }
          if (pathNormalized.startsWith("/api/settings") || pathNormalized.startsWith("/api/admin/settings")) {
            pathsToInvalidate.push(new URL("/api/settings", url.origin).toString());
            pathsToInvalidate.push(new URL("/api/settings/public", url.origin).toString());
          }
          for (const p of pathsToInvalidate) {
            await cache.delete(new Request(p));
          }
        } catch (e) {
          console.warn("Cache invalidation failed:", e);
        }
      }

      return secureCorsResponse;
    }

    // 4. Static files via Cloudflare Assets
    let assetRes = await env.ASSETS.fetch(request);

    // Fallback clean SPA paths or legacy .html pages to index.html if not found
    if (assetRes.status === 404 && (!url.pathname.includes('.') || url.pathname.endsWith('.html'))) {
      const indexReq = new Request(new URL('/index.html', request.url).toString(), request);
      assetRes = await env.ASSETS.fetch(indexReq);
    }

    const headers = new Headers(assetRes.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    headers.set('X-XSS-Protection', '1; mode=block');

    if (url.pathname.endsWith('.html') || !url.pathname.includes('.')) {
      headers.set('Content-Security-Policy', "default-src 'self' https: http: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https: http:; style-src 'self' 'unsafe-inline' https: http:; style-src-elem 'self' 'unsafe-inline' https: http:; font-src 'self' data: https: http:; img-src 'self' data: blob: https: http:; connect-src 'self' https: http:; frame-src 'self' https: http:; worker-src 'self' blob:; manifest-src 'self'; base-uri 'self'; form-action 'self';");
    }


    return new Response(assetRes.body, { status: assetRes.status, headers });
  },

  async scheduled(event, env, ctx) {
    console.log('[Cron] Triggered cart recovery scheduled task...');
    ctx.waitUntil((async () => {
      try {
        const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        
        const inactiveCarts = await env.DB.prepare(`
          SELECT c.id, c.user_id, c.items_json, u.email, u.first_name
          FROM carts c
          JOIN users u ON c.user_id = u.id
          WHERE c.updated_at <= ? AND c.updated_at >= ?
            AND c.items_json != '[]'
        `).bind(twoHoursAgo, oneDayAgo).all();

        if (inactiveCarts.results && inactiveCarts.results.length > 0) {
          console.log(`[Cron] Found ${inactiveCarts.results.length} abandoned carts to process.`);
          for (const cart of inactiveCarts.results) {
            const items = JSON.parse(cart.items_json || '[]');
            if (items.length === 0) continue;

            const name = cart.first_name || 'there';
            const email = cart.email;
            const itemsList = items.map(item => `<li>${item.name || 'Shoe'} (Size: ${item.size || 'Default'}, Qty: ${item.qty})</li>`).join('');
            const resendApiKey = env.RESEND_API_KEY;

            if (resendApiKey) {
              const emailHtml = `
                <h2>Hi ${name},</h2>
                <p>You left some beautiful heels in your cart! They are waiting for you.</p>
                <ul>${itemsList}</ul>
                <p>Use coupon code <b>COMEBACK5</b> for an extra 5% off on your checkout!</p>
                <p><a href="https://heelsup.in/cart" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Return to Cart</a></p>
                <p>Best regards,<br/>HeelsUp Support</p>
              `;

              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'HeelsUp Store <noreply@heelsup.in>',
                  to: [email],
                  subject: 'You left something in your HeelsUp cart!',
                  html: emailHtml
                })
              });
              console.log(`[Cron] Sent recovery email to ${email}`);
            }
          }
        }
      } catch (err) {
        console.error('[Cron] Cart recovery task failed:', err);
      }
    })());
  }
};