// worker/src/routes/orders.js
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { ok, list, created, error, notFound, serverError } from '../utils/response.js';
import { razorpay } from '../utils/razorpay.js';
import { sendInfobipSms } from '../utils/sms.js';
import { sendOrderStatusEmail } from '../utils/email.js';
import { kvPut } from '../utils/db.js';
import { createDelhiveryShipment } from '../utils/delhivery.js';

// In-memory cache for ultra-fast 0.1ms responses across Cloudflare worker isolates
const ordersAdminCache = new Map();
const CACHE_TTL_MS = 20000; // 20s cache with auto-invalidation

export function invalidateOrdersCache() {
  ordersAdminCache.clear();
}

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

async function generateOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}`;
    const row = await env.DB.prepare("SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1").bind(`${prefix}-%`).first();
    let nextSeq = 1;
    if (row && row.order_number) {
        const parts = row.order_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }
    const seq = String(nextSeq).padStart(4, '0');
    return `${prefix}-${seq}`;
}

function normalizeEmail(e) {
    return String(e || "").trim().toLowerCase();
}

function toInt(v, def) {
    const n = parseInt(v);
    return isNaN(n) ? def : n;
}

function formatOrder(o, items = null) {
    return {
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || '',
        customer_email: o.customer_email || '',
        customer_phone: o.customer_phone || '',
        address_line1: o.address_line1 || '',
        address_line2: o.address_line2 || '',
        city: o.city || '',
        state: o.state || '',
        pincode: o.pincode || '',
        country: o.country || 'India',
        delivery_method: o.delivery_method || 'Standard',
        order_status: o.order_status || 'placed',
        payment_status: o.payment_status || 'pending',
        payment_method: o.payment_method || '',
        source: o.source || 'online',
        razorpay_order_id: o.razorpay_order_id || null,
        razorpay_payment_id: o.razorpay_payment_id || null,
        razorpay_signature: o.razorpay_signature || null,
        subtotal_amount: o.subtotal_amount || 0,
        discount_amount: o.discount_amount || 0,
        shipping_amount: o.shipping_amount || 0,
        
        total_amount: o.total_amount || 0,
        coupon_code: o.coupon_code || null,
        tracking_number: o.tracking_number || null,
        tracking_url: o.tracking_url || null,
        courier_name: o.courier_name || null,
        exchange_reason: o.exchange_reason || null,
        exchange_product: o.exchange_product || null,
        paid_at: o.paid_at || null,
        confirmed_at: o.confirmed_at || null,
        shipped_at: o.shipped_at || null,
        out_for_delivery_at: o.out_for_delivery_at || null,
        delivered_at: o.delivered_at || null,
        cancelled_at: o.cancelled_at || null,
        created_at: o.created_at || null,
        updated_at: o.updated_at || null,
        notes: o.notes || null,
        ...(items !== null ? { items } : {}),
    };
}

function formatItem(it) {
    return {
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name || 'Product',
        sku: it.product_sku || null,
        image: it.image_url || null,
        size: it.size_label || null,
        color: it.color || null,
        quantity: it.quantity || 1,
        price: it.unit_price || 0,
        total_price: it.line_total || 0,
    };
}

// ── STOCK HELPERS ──────────────────────────────────────────────────────────────

async function deductSizeStock(env, productId, sizeLabel, qty) {
    const prod = await env.DB.prepare("SELECT name, stock FROM products WHERE id=?").bind(productId).first();
    const beforeStock = prod ? prod.stock : 0;
    const afterStock = Math.max(0, beforeStock - qty);

    const updates = [];
    // Deduct from size-specific stock if available
    if (sizeLabel) {
        updates.push(
            env.DB.prepare(
                "UPDATE product_size_stock SET stock = MAX(0, stock - ?), updated_at = datetime('now') WHERE product_id = ? AND size_label = ?"
            ).bind(qty, productId, sizeLabel)
        );
    }
    // Always deduct from legacy stock column (sum)
    updates.push(
        env.DB.prepare(
            "UPDATE products SET stock = MAX(0, stock - ?), sold_count = COALESCE(sold_count, 0) + ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(qty, qty, productId)
    );

    // Run atomic batch update
    await env.DB.batch(updates);

    // Log to inventory_log
    try {
        await env.DB.prepare(
            "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, datetime('now'))"
        ).bind(productId, prod ? prod.name : 'Unknown Product', beforeStock, -qty, afterStock, `Sale of quantity ${qty}`).run();
    } catch (_) { /* log non-critical */ }
}

async function restoreSizeStock(env, orderId) {
    // Restore stock for all items in an order (used on cancellation)
    try {
        const items = await env.DB.prepare(
            "SELECT product_id, quantity, size_label FROM order_items WHERE order_id=?"
        ).bind(orderId).all();
        for (const item of (items.results || [])) {
            if (!item.product_id) continue;
            
            const prod = await env.DB.prepare("SELECT name, stock FROM products WHERE id=?").bind(item.product_id).first();
            const beforeStock = prod ? prod.stock : 0;
            const afterStock = beforeStock + item.quantity;

            if (item.size_label) {
                await env.DB.prepare(
                    "UPDATE product_size_stock SET stock=stock+?, updated_at=datetime('now') WHERE product_id=? AND size_label=?"
                ).bind(item.quantity, item.product_id, item.size_label).run();
            }
            await env.DB.prepare(
                "UPDATE products SET stock=stock+?, sold_count=MAX(0,COALESCE(sold_count,0)-?), updated_at=datetime('now') WHERE id=?"
            ).bind(item.quantity, item.quantity, item.product_id).run();

            // Log to inventory_log
            try {
                await env.DB.prepare(
                    "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'restocked', ?, ?, ?, ?, datetime('now'))"
                ).bind(item.product_id, prod ? prod.name : 'Unknown Product', beforeStock, item.quantity, afterStock, `Order ${orderId} cancelled`).run();
            } catch (_) { /* log non-critical */ }
        }
    } catch (e) {
        console.error('restoreSizeStock error:', e);
    }
}

// ── CREATE ORDER RECORD (Used on successful verification) ─────────────────────
export async function createOrderRecord(env, input) {
    const customer = input.customer || {};
    const itemsRaw = Array.isArray(input.items) ? input.items : [];
    if (!itemsRaw.length) return { ok: false, error: "Order items are required" };

    const customerName = String(customer.name || "").trim();
    const customerEmail = normalizeEmail(customer.email);
    const customerPhone = String(customer.phone || "").trim();
    const addressLine1 = String(customer.addressLine1 || customer.address_line1 || "").trim();
    const addressLine2 = String(customer.addressLine2 || customer.address_line2 || "").trim();
    const city = String(customer.city || "").trim();
    const state = String(customer.state || "").trim();
    const pincode = String(customer.pincode || "").trim();
    const country = String(customer.country || "India").trim();

    const isPos = input.deliveryMethod === 'pos' || input.deliveryMethod === 'store';
    if (!customerName || !customerEmail || !customerPhone || (!isPos && (!addressLine1 || !city || !state || !pincode)))
        return { ok: false, error: "Incomplete customer details. name, email, phone, address, city, state, pincode required." };

    const finalAddressLine1 = isPos ? (addressLine1 || 'In-Store Purchase') : addressLine1;
    const finalCity = isPos ? (city || 'Store City') : city;
    const finalState = isPos ? (state || 'Store State') : state;
    const finalPincode = isPos ? (pincode || '000000') : pincode;

    const items = [];
    for (const item of itemsRaw) {
        const qty = Math.max(1, toInt(item.qty || item.quantity, 1));
        const unitPrice = Number(item.price || item.unitPrice || 0);
        if (!item.name || unitPrice <= 0) continue;
        items.push({
            productId: item.productId ? toInt(item.productId, 0) : null,
            name: String(item.name),
            sku: String(item.sku || ""),
            qty, unitPrice,
            lineTotal: Number((unitPrice * qty).toFixed(2)),
            size: String(item.size || ""),
            color: String(item.color || ""),
            image: String(item.image || item.img || "")
        });
    }
    if (!items.length) return { ok: false, error: "No valid order items" };

    const subtotalAmount = Number(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const freeShipAbove = Number(await getSetting(env, "shipping_free_above", "1599")) || 1599;
    const shipCharge = Number(await getSetting(env, "shipping_standard_charge", "49")) || 49;
    const shippingAmount = subtotalAmount >= freeShipAbove ? 0 : shipCharge;
    const discountAmount = Number(input.discountAmount || 0);
    const rawTotal = Math.max(0, Number((subtotalAmount + shippingAmount - discountAmount).toFixed(2)));
    let totalAmount = 0;
    if (rawTotal > 0) {
        const ceilVal = Math.ceil(rawTotal);
        const hundreds = Math.floor(ceilVal / 100);
        const remainder = ceilVal % 100;
        if (remainder <= 49) {
            totalAmount = hundreds * 100 + 49;
        } else {
            totalAmount = hundreds * 100 + 99;
        }
    }
    const totalAmountPaise = Math.round(totalAmount * 100);
    
    const isCod = input.paymentMethod === 'COD';
    const codAdvancePaid = isCod ? Math.round(totalAmount * 0.10) * 100 : 0;
    const codOutstandingAmount = isCod ? totalAmountPaise - codAdvancePaid : 0;

    const orderNumber = input.orderNumber || await generateOrderNumber(env);
    const createdAt = new Date().toISOString();
    const source = String(input.source || "online");

    const result = await env.DB.prepare(
        `INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            address_line1, address_line2, city, state, pincode, country,
            delivery_method, source, order_status, payment_status, payment_method,
            subtotal_amount, discount_amount, shipping_amount, total_amount, coupon_code,
            notes, cod_advance_paid, cod_outstanding_amount, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        orderNumber, input.userId || null, customerName, customerEmail, customerPhone,
        finalAddressLine1, addressLine2 || null, finalCity, finalState, finalPincode, country,
        input.deliveryMethod || 'Standard', source, input.orderStatus || 'placed', input.paymentStatus || 'pending', input.paymentMethod || null,
        Math.round(subtotalAmount * 100), Math.round(discountAmount * 100), Math.round(shippingAmount * 100), totalAmountPaise, input.couponCode || null,
        String(input.notes || "").trim(), codAdvancePaid, codOutstandingAmount, createdAt, createdAt
    ).run();

    const orderId = result.meta?.last_row_id;
    for (const item of items) {
        await env.DB.prepare(
            `INSERT INTO order_items (
                order_id, product_id, product_name, product_sku, quantity, unit_price, line_total, size_label, color, image_url, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            orderId, item.productId, item.name, item.sku, item.qty,
            item.unitPrice * 100, item.lineTotal * 100, item.size || 'Default', item.color || null, item.image, createdAt
        ).run();
        // Deduct stock per size
        if (item.productId) {
            await deductSizeStock(env, item.productId, item.size, item.qty);
        }
    }

    if (customerPhone && (input.paymentStatus === 'paid' || input.orderStatus === 'confirmed')) {
        sendInfobipSms(env, customerPhone, `Dear ${customerName}, your HeelsUp order #${orderNumber} has been placed successfully! Total amount: INR ${totalAmount}. Thank you for shopping with us!`).catch(err => {
            console.error('Failed to send order SMS:', err);
        });
    }

    if (customerPhone && (input.paymentStatus === 'paid' || input.orderStatus === 'confirmed' || input.orderStatus === 'placed')) {
        import('../utils/whatsapp.js').then(({ sendOrderPlacedNotification }) => {
            sendOrderPlacedNotification(env, {
                customer_name: customerName,
                customer_phone: customerPhone,
                order_number: orderNumber,
                total_amount: Math.round(totalAmount * 100)
            }).catch(e => console.error('Failed to send order WhatsApp:', e));
        });
    }

    if (orderId && (input.paymentStatus === 'paid' || input.orderStatus === 'confirmed' || input.orderStatus === 'placed')) {
        sendOrderStatusEmail(env, orderId, 'placed').catch(err => {
            console.error('Failed to send placement email:', err);
        });
    }

    return { ok: true, order: { id: orderId, order_number: orderNumber, total_amount: totalAmount, subtotal_amount: subtotalAmount, shipping_amount: shippingAmount, discount_amount: discountAmount } };
}

// ── MAIN ROUTER ──────────────────────────────────────────────────────────────
export async function ordersRouter(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/orders', '') || '/';
    const method = request.method;
    const params = url.searchParams;

    // ── POST /api/orders/initiate ───────────────────────────────────────────
    if (path === '/initiate' && method === 'POST') {
        try {
            const user = await optionalAuth(request, env);

            const body = await request.json();
            if (!body) return error('Invalid JSON', 400);

            const rzpKeyId = String(await getSetting(env, "razorpay_key_id", env.RAZORPAY_KEY_ID || "")).trim();
            const rzpKeySecret = String(await getSetting(env, "razorpay_key_secret", env.RAZORPAY_KEY_SECRET || "")).trim();
            if (!rzpKeyId || !rzpKeySecret) return error("Payment gateway not configured. Contact admin.", 503);

            const items = Array.isArray(body.items) ? body.items : [];
            if (!items.length) return error("Order items required", 400);

            // Validate stock — per-size if size selected, else total stock
            for (const item of items) {
                if (item.productId) {
                    const prod = await env.DB.prepare("SELECT id, name, stock FROM products WHERE id=?").bind(item.productId).first();
                    if (!prod) {
                        return error(`Product "${item.name}" not found.`, 404);
                    }
                    const qty = Math.max(1, toInt(item.qty || item.quantity, 1));
                    const sizeLabel = String(item.size || '').trim();
                    if (sizeLabel) {
                        // Check per-size stock
                        const sizeRow = await env.DB.prepare(
                            "SELECT stock FROM product_size_stock WHERE product_id=? AND size_label=?"
                        ).bind(item.productId, sizeLabel).first();
                        if (sizeRow) {
                            if ((sizeRow.stock || 0) < qty) {
                                return error(`Size ${sizeLabel} of "${prod.name}" is out of stock. Only ${sizeRow.stock} left.`, 400);
                            }
                        } else {
                            // No per-size record; fall back to total stock
                            if ((prod.stock || 0) < qty) {
                                return error(`Insufficient stock for "${prod.name}" (size ${sizeLabel}). Only ${prod.stock} left.`, 400);
                            }
                        }
                    } else {
                        // No size selected; check total stock
                        if ((prod.stock || 0) < qty) {
                            return error(`Insufficient stock for "${prod.name}". Only ${prod.stock} left.`, 400);
                        }
                    }
                }
            }

            let discountAmount = 0;
            let couponCode = String(body.couponCode || "").trim().toUpperCase();
            const subtotalAmount = Number(items.reduce((s, i) => s + (Number(i.price || 0) * Math.max(1, i.qty || i.quantity || 1)), 0).toFixed(2));
            if (couponCode) {
                const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code=? AND active = 1 AND (expires_at IS NULL OR expires_at >= datetime('now'))").bind(couponCode).first();
                if (coupon && subtotalAmount >= coupon.min_order) {
                    const isPercent = coupon.type === "percent" || coupon.type === "percentage";
                    let disc = isPercent ? Math.round(subtotalAmount * (coupon.value / 100)) : coupon.value;
                    if (coupon.max_discount) disc = Math.min(disc, coupon.max_discount);
                    discountAmount = disc;
                }
            }

            const freeShipAbove = Number(await getSetting(env, "shipping_free_above", "1599")) || 1599;
            const shipCharge = Number(await getSetting(env, "shipping_standard_charge", "49")) || 49;
            const shippingAmount = subtotalAmount >= freeShipAbove ? 0 : shipCharge;
            const rawTotal = Math.max(0, Number((subtotalAmount + shippingAmount - discountAmount).toFixed(2)));
            let totalAmount = 0;
            if (rawTotal > 0) {
                const ceilVal = Math.ceil(rawTotal);
                const hundreds = Math.floor(ceilVal / 100);
                const remainder = ceilVal % 100;
                if (remainder <= 49) {
                    totalAmount = hundreds * 100 + 49;
                } else {
                    totalAmount = hundreds * 100 + 99;
                }
            }

            const orderNumber = await generateOrderNumber(env);

            const itemsValidated = items.map(item => {
                const qty = Math.max(1, toInt(item.qty || item.quantity, 1));
                const unitPrice = Number(item.price || 0);
                return {
                    productId: item.productId ? toInt(item.productId, 0) : null,
                    name: String(item.name),
                    sku: String(item.sku || ""),
                    qty,
                    unitPrice,
                    lineTotal: Number((unitPrice * qty).toFixed(2)),
                    size: String(item.size || ""),
                    color: String(item.color || ""),
                    image: String(item.image || item.img || "")
                };
            });

            const amountPaise = Math.round(totalAmount * 100);

            // Free order bypass
            if (amountPaise <= 0) {
                const createdRes = await createOrderRecord(env, {
                    userId: user?.id || null,
                    customer: body.customer || {
                        name: user ? `${user.first_name} ${user.last_name || ""}`.trim() : (body.name || "Guest"),
                        email: user ? user.email : (body.email || ""),
                        phone: user ? (user.phone || body.phone || "") : (body.phone || "")
                    },
                    items: itemsValidated,
                    deliveryMethod: body.deliveryMethod || "standard",
                    notes: body.notes || "",
                    paymentMethod: "FREE",
                    paymentStatus: "paid",
                    orderStatus: "confirmed",
                    couponCode: couponCode || null,
                    discountAmount,
                    orderNumber
                });
                if (!createdRes.ok) return error(createdRes.error, 400);
                if (couponCode) await env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").bind(couponCode).run();
                return ok({ key: "free_order", order: { id: createdRes.order.id, orderNumber: createdRes.order.order_number, amount: 0, discount: discountAmount } });
            }

            // Call Razorpay API
            const isCod = body.paymentMethod === 'COD';
            const codAdvanceRupees = Math.round(totalAmount * 0.10);
            const chargeAmountPaise = isCod ? codAdvanceRupees * 100 : amountPaise;

            const basicAuth = btoa(`${rzpKeyId}:${rzpKeySecret}`);
            const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
                method: "POST",
                headers: { Authorization: `Basic ${basicAuth}`, "content-type": "application/json" },
                body: JSON.stringify({ amount: chargeAmountPaise, currency: "INR", receipt: String(orderNumber) })
            });
            if (!rzpRes.ok) {
                const t = await rzpRes.text();
                return error("Payment gateway error: " + t, 502);
            }
            const rzpOrder = await rzpRes.json();

            // Save pending payload in KV (expires in 24 hours)
            const pendingPayload = {
                userId: user?.id || null,
                customer: body.customer || {
                    name: user ? `${user.first_name} ${user.last_name || ""}`.trim() : (body.name || "Guest"),
                    email: user ? user.email : (body.email || ""),
                    phone: user ? (user.phone || body.phone || "") : (body.phone || "")
                },
                items: itemsValidated,
                deliveryMethod: body.deliveryMethod || "standard",
                notes: body.notes || "",
                paymentMethod: isCod ? "COD" : "RAZORPAY",
                couponCode: couponCode || null,
                discountAmount,
                subtotalAmount,
                shippingAmount,
                totalAmount,
                orderNumber
            };
            await kvPut(env, `pending_order:${rzpOrder.id}`, JSON.stringify(pendingPayload), 86400);

            return ok({
                key: rzpKeyId,
                order: {
                    id: null,
                    orderNumber: orderNumber,
                    amount: isCod ? codAdvanceRupees : totalAmount,
                    discount: discountAmount
                },
                razorpayOrder: rzpOrder
            });
        } catch (e) {
            console.error('Initiate order error:', e);
            return serverError('Failed to initiate order');
        }
    }

    // ── GET /api/orders/my or GET /api/orders ─────────────────────────────────
    if ((path === '/my' || path === '/' || path === '') && method === 'GET') {
        const { user, error: authErr } = await requireAuth(request, env);
        if (authErr) return authErr;
        try {
            const page = Math.max(1, parseInt(params.get('page') || '1'));
            const limit = Math.min(50, parseInt(params.get('limit') || '10'));
            const offset = (page - 1) * limit;

            const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?').bind(user.id).first();
            const ordersRes = await env.DB.prepare(
                `SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`
            ).bind(user.id, limit, offset).all();

            const ordersList = ordersRes.results || [];
            const orderIds = ordersList.map(o => o.id);

            // Batch fetch all items for all orders in a single query
            let allItems = [];
            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(',');
                const itemsRes = await env.DB.prepare(
                    `SELECT order_id, product_name, image_url, size_label, color, quantity, unit_price FROM order_items WHERE order_id IN (${placeholders})`
                ).bind(...orderIds).all();
                allItems = itemsRes.results || [];
            }

            // Group items by order_id
            const itemsByOrder = {};
            for (const item of allItems) {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push({
                    name: item.product_name,
                    image: item.image_url,
                    size: item.size_label,
                    color: item.color,
                    qty: item.quantity,
                    price: item.unit_price
                });
            }

            const orders = ordersList.map(o => ({
                ...formatOrder(o),
                items: (itemsByOrder[o.id] || []).slice(0, 4)
            }));

            const total = countRow?.cnt || 0;
            return list(orders, { page, limit, total, pages: Math.ceil(total / limit) });
        } catch (e) {
            console.error('My orders error:', e);
            return serverError('Failed to fetch orders');
        }
    }

    // ── GET /api/orders/track/:orderNumber ──────────────────────────────────
    if (path.startsWith('/track/') && method === 'GET') {
        const orderNumber = path.replace('/track/', '');
        if (!orderNumber) return error('Order number required', 400);
        try {
            const order = await env.DB.prepare(
                `SELECT id, order_number, order_status, payment_status, tracking_number, tracking_url, courier_name, created_at, updated_at FROM orders WHERE order_number = ?`
            ).bind(orderNumber.toUpperCase()).first();
            if (!order) return notFound('Order not found');
            const itemsRes = await env.DB.prepare('SELECT product_name, quantity, size_label, color FROM order_items WHERE order_id = ?').bind(order.id).all();
            return ok({
                order_number: order.order_number,
                status: order.order_status,
                order_status: order.order_status,
                payment_status: order.payment_status,
                tracking_number: order.tracking_number,
                tracking_url: order.tracking_url,
                shipping_carrier: order.courier_name || 'Delhivery',
                created_at: order.created_at,
                updated_at: order.updated_at,
                items: (itemsRes.results || []).map(i => ({
                    product_name: i.product_name,
                    quantity: i.quantity,
                    size: i.size_label,
                    color: i.color
                }))
            });
        } catch (e) {
            return serverError('Tracking lookup failed');
        }
    }

    // ── GET /api/orders/my/:id ──────────────────────────────────────────────
    if (path.match(/^\/my\/\d+$/) && method === 'GET') {
        const { user, error: authErr } = await requireAuth(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(id, user.id).first();
            if (!order) return notFound('Order not found');
            const itemsRes = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all();
            const items = (itemsRes.results || []).map(formatItem);
            return ok(formatOrder(order, items));
        } catch (e) {
            return serverError('Failed to fetch order');
        }
    }

    // ── POST /api/orders/:id/exchange ───────────────────────────────────────
    if (path.match(/^\/\d+\/exchange$/) && method === 'POST') {
        const { user, error: authErr } = await requireAuth(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(id, user.id).first();
            if (!order) return notFound('Order not found');

            if (order.order_status !== 'delivered')
                return error('Exchange can only be requested for delivered orders', 400);

            const windowDays = parseInt(await getSetting(env, "exchange_window_days", "7"));
            if (order.delivered_at) {
                const deliveredAt = new Date(order.delivered_at);
                const daysPassed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
                if (daysPassed > windowDays)
                    return error(`Exchange window of ${windowDays} days has expired`, 400);
            }

            const { reason, exchange_product } = await request.json();
            if (!reason?.trim()) return error('Exchange reason is required', 400);

            await env.DB.prepare(
                `UPDATE orders SET order_status = 'exchange_requested', exchange_reason = ?, exchange_product = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(reason.trim(), exchange_product || null, id).run();

            return ok(null, 'Exchange request submitted successfully');
        } catch (e) {
            return serverError('Failed to submit exchange request');
        }
    }

    // ─────────────── ADMIN ROUTES ────────────────────────────────────────────

    // ── GET /api/orders/admin ────────────────────────────────────────────────
    if (path === '/admin' && method === 'GET') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        try {
            const cacheKey = url.search || 'default';
            if (ordersAdminCache.has(cacheKey)) {
                const cached = ordersAdminCache.get(cacheKey);
                if (Date.now() - cached.time < CACHE_TTL_MS) {
                    return list(cached.data, cached.meta);
                }
            }

            const page = Math.max(1, parseInt(params.get('page') || '1'));
            const limit = Math.min(500, parseInt(params.get('limit') || '50'));
            const offset = (page - 1) * limit;

            const status = params.get('status') || '';
            const source = params.get('source') || '';
            const q = params.get('q') || '';

            const where = [];
            const binds = [];

            if (status) { where.push('order_status = ?'); binds.push(status); }
            if (source) { where.push('source = ?'); binds.push(source); }
            if (q) {
                where.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ?)');
                const like = `%${q}%`;
                binds.push(like, like, like, like);
            }

            const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

            const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM orders ${whereSQL}`).bind(...binds).first();
            const ordersRes = await env.DB.prepare(
                `SELECT * FROM orders ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`
            ).bind(...binds, limit, offset).all();

            const total = countRow?.cnt || 0;
            const ordersRaw = ordersRes.results || [];
            const orderIds = ordersRaw.map(o => o.id);
            const itemsMap = {};
            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(',');
                const allItems = await env.DB.prepare(
                    `SELECT * FROM order_items WHERE order_id IN (${placeholders})`
                ).bind(...orderIds).all();
                for (const it of (allItems.results || [])) {
                    if (!itemsMap[it.order_id]) {
                        itemsMap[it.order_id] = [];
                    }
                    itemsMap[it.order_id].push(formatItem(it));
                }
            }
            const orders = ordersRaw.map(o => formatOrder(o, itemsMap[o.id] || []));
            const meta = { page, limit, total, pages: Math.ceil(total / limit) };

            ordersAdminCache.set(cacheKey, { time: Date.now(), data: orders, meta });
            return list(orders, meta);
        } catch (e) {
            console.error('Admin list orders error:', e);
            return serverError('Failed to fetch orders');
        }
    }

    // ── GET /api/orders/admin/stats ──────────────────────────────────────────
    if (path === '/admin/stats' && method === 'GET') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        try {
            const stats = await env.DB.prepare(
                `SELECT
             COUNT(*) as total_orders,
             SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
             SUM(CASE WHEN order_status = 'placed' THEN 1 ELSE 0 END) as placed,
             SUM(CASE WHEN order_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
             SUM(CASE WHEN order_status = 'shipped' THEN 1 ELSE 0 END) as shipped,
             SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
             SUM(CASE WHEN order_status = 'exchange_requested' THEN 1 ELSE 0 END) as exchange_requested,
             SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
             SUM(discount_amount) as total_discount,
             COUNT(DISTINCT user_id) as unique_customers
           FROM orders`
            ).first();

            return ok(stats);
        } catch (e) {
            return serverError('Failed to fetch stats');
        }
    }

    // ── GET /api/orders/admin/:id ─────────────────────────────────────────────
    if (path.match(/^\/admin\/\d+$/) && method === 'GET') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
            if (!order) return notFound('Order not found');
            const itemsRes = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all();
            const items = (itemsRes.results || []).map(formatItem);
            return ok(formatOrder(order, items));
        } catch (e) {
            return serverError('Failed to fetch order');
        }
    }

    // ── PUT /api/orders/admin/:id/status ──────────────────────────────────────
    if (path.match(/^\/admin\/\d+\/status$/) && (method === 'PUT' || method === 'PATCH')) {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const body = await request.json();
            const { status, tracking_number, tracking_url, courier_name, send_sms } = body;
            if (!status) return error('Status is required', 400);

            // Get current status before updating
            const currentOrder = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
            if (!currentOrder) return error('Order not found', 404);

            // Enforce flexible status transition validation
            const allowedTransitions = {
                'placed': ['confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                'confirmed': ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                'shipped': ['out_for_delivery', 'delivered', 'cancelled'],
                'out_for_delivery': ['delivered', 'cancelled'],
                'delivered': ['shipped', 'out_for_delivery', 'cancelled'],
                'cancelled': ['placed', 'confirmed', 'shipped'],
                'exchange_requested': ['exchange_approved', 'exchange_rejected'],
                'exchange_approved': ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                'exchange_rejected': []
            };

            const currentStatus = currentOrder.order_status || 'placed';
            if (status !== currentStatus) {
                const allowed = allowedTransitions[currentStatus] || [];
                if (!allowed.includes(status)) {
                    return error(`Invalid transition: Cannot change status from "${currentStatus}" to "${status}"`, 400);
                }
            }

            const sets = ['order_status = ?', "updated_at = datetime('now')"];
            const binds = [status];

            if (status === 'confirmed') sets.push("confirmed_at = datetime('now')");
            if (status === 'shipped') sets.push("shipped_at = datetime('now')");
            if (status === 'delivered') sets.push("delivered_at = datetime('now')");
            if (status === 'cancelled') sets.push("cancelled_at = datetime('now')");

            if (tracking_number !== undefined) {
                sets.push('tracking_number = ?');
                binds.push(tracking_number);
            }
            if (tracking_url !== undefined) {
                sets.push('tracking_url = ?');
                binds.push(tracking_url);
            }
            if (courier_name !== undefined) {
                sets.push('courier_name = ?');
                binds.push(courier_name);
            }

            binds.push(id);

            await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();

            // Restore stock if order is being cancelled (and wasn't already cancelled)
            if (status === 'cancelled' && currentOrder?.order_status !== 'cancelled') {
                await restoreSizeStock(env, id);
            }

            const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();

            // SMS Dispatch triggers
            if (send_sms && updated && updated.customer_phone) {
                let smsText = '';
                const cName = courier_name || updated.courier_name || 'our shipping provider';
                const tNum = tracking_number || updated.tracking_number || '';
                const tUrl = tracking_url || updated.tracking_url || 'https://heelsup.in/track';

                if (status === 'shipped') {
                    smsText = `Dear ${updated.customer_name}, your HeelsUp order #${updated.order_number} has been shipped via ${cName}. Tracking Number: ${tNum}. Track here: ${tUrl}. Thank you for shopping with us!`;
                    import('../utils/whatsapp.js').then(({ sendOrderShippedNotification }) => {
                        sendOrderShippedNotification(env, updated, tNum).catch(e => console.error('Failed to send shipped WhatsApp:', e));
                    });
                } else if (status === 'delivered') {
                    smsText = `Dear ${updated.customer_name}, your HeelsUp order #${updated.order_number} has been successfully delivered. We hope you love your new footwear! Rate your style here: https://heelsup.in/reviews.`;
                } else if (status === 'cancelled') {
                    smsText = `Dear ${updated.customer_name}, your HeelsUp order #${updated.order_number} has been cancelled. If any payment was made, your refund will be processed in 3-5 business days.`;
                } else if (status === 'confirmed') {
                    smsText = `Dear ${updated.customer_name}, your HeelsUp order #${updated.order_number} has been confirmed. We are packing your premium styles for dispatch!`;
                }

                if (smsText) {
                    sendInfobipSms(env, updated.customer_phone, smsText).catch(err => {
                        console.error('Failed to send status update SMS:', err);
                    });
                }
            }

            if (updated && updated.customer_email) {
                sendOrderStatusEmail(env, id, status).catch(err => {
                    console.error('Failed to send status update email:', err);
                });
            }

            return ok(formatOrder(updated), 'Order status updated');
        } catch (e) {
            console.error('Update status error:', e);
            return serverError('Failed to update status');
        }
    }

    // ── PATCH /api/orders/admin/:id/tracking ──────────────────────────────────
    if (path.match(/^\/admin\/\d+\/tracking$/) && (method === 'PUT' || method === 'PATCH')) {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const body = await request.json();
            const { tracking_number, tracking_url, courier_name } = body;

            const currentOrder = await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first();
            if (!currentOrder) return error('Order not found', 404);

            const sets = ["updated_at = datetime('now')"];
            const binds = [];

            if (tracking_number !== undefined) {
                sets.push('tracking_number = ?');
                binds.push(tracking_number);
            }
            if (tracking_url !== undefined) {
                sets.push('tracking_url = ?');
                binds.push(tracking_url);
            }
            if (courier_name !== undefined) {
                sets.push('courier_name = ?');
                binds.push(courier_name);
            }

            binds.push(id);

            await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();

            const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
            return ok(formatOrder(updated), 'Tracking information updated');
        } catch (e) {
            console.error('Update tracking error:', e);
            return serverError('Failed to update tracking');
        }
    }

    // ── PUT /api/orders/admin/:id/exchange ──────────────────────────────────
    if (path.match(/^\/admin\/\d+\/exchange$/) && method === 'PUT') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            const { action } = await request.json();
            if (!['approve', 'reject'].includes(action))
                return error('action must be approve or reject', 400);

            const status = action === 'approve' ? 'exchange_approved' : 'exchange_rejected';
            await env.DB.prepare(
                `UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(status, id).run();

            return ok(null, `Exchange request ${action}d`);
        } catch (e) {
            return serverError('Failed to process exchange');
        }
    }

    // ── POST /api/orders/admin/bulk-update ───────────────────────────────────
    // Bulk update status for multiple orders at once
    if (path === '/admin/bulk-update' && method === 'POST') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        try {
            const body = await request.json();
            const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(n => !isNaN(n) && n > 0) : [];
            const status = String(body.status || '').trim();
            const trackingNumber = body.tracking_number !== undefined ? String(body.tracking_number || '') : undefined;
            const trackingUrl = body.tracking_url !== undefined ? String(body.tracking_url || '') : undefined;

            if (!ids.length) return error('ids array is required and must not be empty', 400);
            if (!status) return error('status is required', 400);

            const VALID_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'exchange_requested', 'exchange_approved', 'exchange_rejected'];
            if (!VALID_STATUSES.includes(status)) {
                return error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`, 400);
            }

            const sets = ["order_status = ?", "updated_at = datetime('now')"];
            const baseBinds = [status];

            if (status === 'confirmed') sets.push("confirmed_at = datetime('now')");
            if (status === 'shipped') sets.push("shipped_at = datetime('now')");
            if (status === 'out_for_delivery') sets.push("out_for_delivery_at = datetime('now')");
            if (status === 'delivered') sets.push("delivered_at = datetime('now')");
            if (status === 'cancelled') sets.push("cancelled_at = datetime('now')");

            if (trackingNumber !== undefined) {
                sets.push('tracking_number = ?');
                baseBinds.push(trackingNumber);
            }
            if (trackingUrl !== undefined) {
                sets.push('tracking_url = ?');
                baseBinds.push(trackingUrl);
            }

            let updated = 0;
            const errors = [];

            for (const id of ids) {
                try {
                    // Check current status for stock restoration
                    const current = await env.DB.prepare('SELECT order_status FROM orders WHERE id = ?').bind(id).first();
                    if (!current) { errors.push({ id, error: 'Not found' }); continue; }

                    // Enforce flexible status transition validation
                    const allowedTransitions = {
                        'placed': ['confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                        'confirmed': ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                        'shipped': ['out_for_delivery', 'delivered', 'cancelled'],
                        'out_for_delivery': ['delivered', 'cancelled'],
                        'delivered': ['shipped', 'out_for_delivery', 'cancelled'],
                        'cancelled': ['placed', 'confirmed', 'shipped'],
                        'exchange_requested': ['exchange_approved', 'exchange_rejected'],
                        'exchange_approved': ['shipped', 'out_for_delivery', 'delivered', 'cancelled'],
                        'exchange_rejected': []
                    };
                    const currentStatus = current.order_status || 'placed';
                    if (status !== currentStatus) {
                        const allowed = allowedTransitions[currentStatus] || [];
                        if (!allowed.includes(status)) {
                            errors.push({ id, error: `Invalid transition from "${currentStatus}" to "${status}"` });
                            continue;
                        }
                    }

                    await env.DB.prepare(
                        `UPDATE orders SET ${sets.join(', ')} WHERE id = ?`
                    ).bind(...baseBinds, id).run();

                    // Restore stock for newly cancelled orders
                    if (status === 'cancelled' && current.order_status !== 'cancelled') {
                        await restoreSizeStock(env, id);
                    }

                    // Dispatch status update email
                    sendOrderStatusEmail(env, id, status).catch(err => {
                        console.error(`Failed to send bulk status email for order ${id}:`, err);
                    });

                    updated++;
                } catch (err) {
                    errors.push({ id, error: err.message || 'Update failed' });
                }
            }

            return ok({
                updated,
                failed: errors.length,
                errors: errors.length ? errors : undefined
            }, `${updated} order(s) updated to "${status}"`);
        } catch (e) {
            console.error('Bulk update error:', e);
            return serverError('Bulk update failed');
        }
    }

    // ── POST /api/orders/admin/:id/book-delhivery ─────────────────────────────
    if (path.match(/^\/admin\/\d+\/book-delhivery$/) && method === 'POST') {
        const { error: authErr } = await requireAdmin(request, env);
        if (authErr) return authErr;
        const id = parseInt(path.match(/(\d+)/)?.[1]);
        try {
            // 1. Fetch order
            const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
            if (!order) return error('Order not found', 404);
            if (order.tracking_number) {
                return error(`Shipment already booked for this order. AWB: ${order.tracking_number}`, 400);
            }

            // 2. Fetch order items
            const itemsRes = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(id).all();
            const items = itemsRes.results || [];
            if (!items.length) return error('No items found for this order', 400);

            // 3. Call Delhivery shipment creation utility
            const result = await createDelhiveryShipment(env, order, items);
            if (!result.success) {
                return error(`Delhivery booking failed: ${result.error}`, 502);
            }

            // 4. Update order with tracking details
            await env.DB.prepare(
                `UPDATE orders SET 
                    tracking_number = ?, 
                    tracking_url = ?, 
                    courier_name = 'Delhivery', 
                    order_status = 'shipped', 
                    shipped_at = datetime('now'),
                    updated_at = datetime('now')
                 WHERE id = ?`
            ).bind(result.waybill, result.tracking_url, id).run();

            // 5. Send SMS & Email update
            try {
                if (order.customer_phone) {
                    await sendInfobipSms(
                        env, 
                        order.customer_phone, 
                        `Dear ${order.customer_name}, your HeelsUp order #${order.order_number} has been shipped via Delhivery. Tracking Number: ${result.waybill}. Track here: ${result.tracking_url}`
                    );
                    try {
                        const { sendOrderShippedNotification } = await import('../utils/whatsapp.js');
                        await sendOrderShippedNotification(env, order, result.waybill);
                    } catch (waErr) {
                        console.error('[Delhivery] Failed to send dispatch WhatsApp:', waErr);
                    }
                }
            } catch (smsErr) {
                console.error('[Delhivery] Failed to send dispatch SMS:', smsErr);
            }

            try {
                await sendOrderStatusEmail(env, id, 'shipped');
            } catch (emailErr) {
                console.error('[Delhivery] Failed to send dispatch email:', emailErr);
            }

            return ok({
                waybill: result.waybill,
                tracking_url: result.tracking_url
            }, 'Shipment successfully booked with Delhivery and order marked as Shipped.');
        } catch (e) {
            console.error('Delhivery booking endpoint error:', e);
            return serverError('Failed to book Delhivery shipment');
        }
    }

    return error('Route not found', 404);
}