// worker/src/routes/pos.js
import { requireAdmin } from '../middleware/auth.js';
import { ok, list, created, error, serverError } from '../utils/response.js';
import { razorpay } from '../utils/razorpay.js';

async function getSetting(env, key, fallback = '') {
    try {
        const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
        return row ? row.value : fallback;
    } catch {
        return fallback;
    }
}

async function genOrderNumber(env) {
    const today = new Date();
    const prefix = `HU-OFL-${today.getUTCFullYear()}`;
    const row = await env.DB.prepare("SELECT sale_number FROM offline_sales WHERE sale_number LIKE ? ORDER BY id DESC LIMIT 1").bind(`${prefix}%`).first();
    let nextSeq = 1;
    if (row && row.sale_number) {
        // e.g. HU-OFL-20260005 -> last 4 digits are 0005
        const lastSeqStr = row.sale_number.replace(prefix, '');
        const lastSeq = parseInt(lastSeqStr);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }
    const seq = String(nextSeq).padStart(4, "0");
    return `${prefix}${seq}`;
}

export async function posRouter(request, env) {
    const url = new URL(request.url);
    // Support both /api/admin/pos and /api/pos namespaces
    const path = url.pathname.replace('/api/admin/pos', '').replace('/api/pos', '') || '/';
    const method = request.method;

    // POST /api/pos/initiate-payment or /api/pos/create-upi-link — initiate Razorpay UPI payment for POS
    if ((path === '/initiate-payment' || path === '/create-upi-link' || path === '/create-link') && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const rawAmt = parseFloat(body.amount || (body.amount_paise ? body.amount_paise / 100 : 0) || body.total_amount || 0);
            const amountPaise = Math.round(rawAmt * 100);
            if (!amountPaise || amountPaise <= 0) return error('Invalid amount');

            const custName = (body.customer_name || 'POS Walk-in').trim();
            const custPhone = (body.customer_phone || '').trim();
            const receipt = `POS-${Date.now().toString().slice(-6)}`;

            const linkRes = await razorpay.createPaymentLink(env, {
                amount: amountPaise,
                currency: 'INR',
                description: `HEELSUP In-Store POS Bill #${receipt}`,
                customer: {
                    name: custName,
                    contact: custPhone.length >= 10 ? custPhone.slice(-10) : undefined
                },
                notes: { receipt, source: 'pos_terminal' }
            });

            if (linkRes && linkRes.short_url) {
                return ok({
                    success: true,
                    payment_link: linkRes.short_url,
                    payment_link_id: linkRes.id,
                    amount_paise: amountPaise,
                    receipt
                });
            }

            // Fallback to Razorpay order creation
            const rzpOrder = await razorpay.createOrder(env, {
                amount: amountPaise,
                currency: 'INR',
                receipt,
                notes: { receipt, source: 'pos_terminal' }
            });

            if (rzpOrder && rzpOrder.id) {
                return ok({
                    success: true,
                    razorpayOrder: rzpOrder,
                    receipt
                });
            }

            return ok({
                success: false,
                error: linkRes?.error || 'Could not generate Razorpay payment link. Check API keys in Settings.'
            });
        } catch (e) {
            console.error('POS initiate payment error:', e);
            return serverError('Failed to initiate POS payment: ' + e.message);
        }
    }

    // POST /api/pos/sale or /api/pos/create-sale — create POS/offline sale
    if ((path === '/sale' || path === '/create-sale' || path === '/') && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const body = await request.json();
            const customer_name = (body.customer_name || 'Walk-in Customer').trim();
            const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null;
            const items = body.items || [];
            const payment_method = body.payment_method || 'Cash';
            const discountAmt = parseFloat(body.discount || body.discount_amount || 0) || 0;
            const notes = body.notes || 'In-Store POS Sale';
            const created_at = body.created_at;
            const sales_channel = body.sales_channel || body.source || 'POS';

            if (!items || items.length === 0) return error('No items in sale');

            // Validate stock availability for all items first
            for (const item of items) {
                const product = await env.DB.prepare(
                    'SELECT id, name, sku, price, stock FROM products WHERE id = ? AND active = 1'
                ).bind(item.product_id).first();
                if (!product) return error(`Product ${item.product_id} not found`, 400);

                const qty = item.quantity || item.qty || 1;
                
                if (item.size && item.size !== 'Default' && item.size !== 'Nude/Default') {
                    const sizeRow = await env.DB.prepare(
                        "SELECT stock FROM product_size_stock WHERE product_id=? AND size_label=?"
                    ).bind(item.product_id, item.size).first();
                    if (sizeRow) {
                        if (sizeRow.stock < qty) {
                            return error(`Insufficient stock for product "${product.name}" (Size: ${item.size}). Available: ${sizeRow.stock}, Requested: ${qty}`, 400);
                        }
                    } else if (product.stock < qty) {
                        return error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${qty}`, 400);
                    }
                } else if (product.stock < qty) {
                    return error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${qty}`, 400);
                }
            }

            let channel = 'POS';
            if (sales_channel !== undefined && sales_channel !== null) {
                if (!['POS', 'WhatsApp', 'Instagram'].includes(sales_channel)) {
                    return error('Invalid channel name', 400);
                }
                channel = sales_channel;
            }

            // Find staff entry mapping to logged-in user (admin/staff/manager)
            let servedByStaffId = null;
            const staffRow = await env.DB.prepare("SELECT id FROM staff WHERE user_id = ?").bind(user.id).first();
            if (staffRow) {
                servedByStaffId = staffRow.id;
            }

            let subtotal = 0;
            const processedItems = [];

            for (const item of items) {
                const product = await env.DB.prepare(
                    'SELECT id, name, sku, price, stock FROM products WHERE id = ? AND active = 1'
                ).bind(item.product_id).first();
                if (!product) return error(`Product ${item.product_id} not found`);

                const unitPrice = item.unit_price || product.price; // in Rupees/Paise (as stored)
                const qty = item.quantity || item.qty || 1;
                const totalPrice = unitPrice * qty;
                subtotal += totalPrice;

                processedItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    product_code: product.sku || '',
                    color: item.color || '',
                    size: item.size || 'Default',
                    quantity: qty,
                    unit_price: unitPrice,
                    total_price: totalPrice
                });
            }

            const total = subtotal - discountAmt;
            const saleNumber = await genOrderNumber(env);
            const itemsJson = JSON.stringify(processedItems);

            // Format timestamp matching SQLite datetime
            const rawDate = created_at || new Date().toISOString();
            const finalCreatedAt = rawDate.replace('T', ' ').substring(0, 19);

            // Insert offline_sales matching remote schema
            const saleRes = await env.DB.prepare(`
                INSERT INTO offline_sales (
                    sale_number, customer_name, customer_phone, items_json,
                    subtotal, discount, total, payment_method, sales_channel, notes,
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                saleNumber, customer_name || 'Walk-in', customer_phone || null, itemsJson,
                subtotal, discountAmt, total, payment_method || 'Cash', channel, notes || null,
                user ? user.id : null, finalCreatedAt
            ).run();

            const saleId = saleRes.meta?.last_row_id;

            // Insert items and adjust stock
            for (const item of processedItems) {
                try {
                    await env.DB.prepare(`
                        INSERT INTO offline_sale_items (
                            sale_id, product_id, product_code, product_name, color, size, quantity, unit_price, total_price
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        saleId, item.product_id, item.product_code, item.product_name,
                        item.color, item.size, item.quantity, item.unit_price, item.total_price
                    ).run();
                } catch (itemErr) {
                    console.warn('Offline sale item insert non-critical error:', itemErr);
                }

                // Deduct size-specific stock if available
                try {
                    if (item.size) {
                        const row = await env.DB.prepare(
                            "SELECT stock FROM product_size_stock WHERE product_id=? AND size_label=?"
                        ).bind(item.product_id, item.size).first();
                        if (row) {
                            const newStock = Math.max(0, (row.stock || 0) - item.quantity);
                            await env.DB.prepare(
                                "UPDATE product_size_stock SET stock=?, updated_at=datetime('now') WHERE product_id=? AND size_label=?"
                            ).bind(newStock, item.product_id, item.size).run();
                        }
                    }

                    // Deduct global stock
                    const prod = await env.DB.prepare("SELECT stock, name FROM products WHERE id=?").bind(item.product_id).first();
                    const beforeStock = prod ? prod.stock : 0;
                    const afterStock = Math.max(0, beforeStock - item.quantity);

                    await env.DB.prepare(
                        "UPDATE products SET stock=?, sold_count=COALESCE(sold_count,0)+?, updated_at=datetime('now') WHERE id=?"
                    ).bind(afterStock, item.quantity, item.product_id).run();

                    // Log inventory change
                    await env.DB.prepare(
                        "INSERT INTO inventory_log (product_id, product_name, change_type, quantity_before, quantity_change, quantity_after, reason, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, datetime('now'))"
                    ).bind(item.product_id, prod ? prod.name : 'Unknown Product', beforeStock, -item.quantity, afterStock, `POS sale: Bill ${saleNumber}`).run();
                } catch (stockErr) {
                    console.warn('Stock adjustment non-critical error:', stockErr);
                }
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'POS sale recorded successfully',
                data: {
                    order_number: saleNumber,
                    id: saleId,
                    total_amount: total
                },
                order: {
                    order_number: saleNumber,
                    id: saleId,
                    total_amount: total
                }
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error('POS sale error:', e);
            return serverError('Failed to record sale');
        }
    }

    // GET /api/pos/sales — recent POS sales
    if (path === '/sales' && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const all = url.searchParams.get('all') === 'true';
            const limit = all ? 1000 : parseInt(url.searchParams.get('limit') || '100');
            const sales = await env.DB.prepare(
                `SELECT * FROM offline_sales ORDER BY id DESC LIMIT ?`
            ).bind(limit).all();
            return list(sales.results || []);
        } catch (e) {
            console.error('Fetch POS sales error:', e);
            return serverError('Failed to fetch sales');
        }
    }

    // GET /api/pos/:id — get specific offline sale details with items
    if (path.match(/^\/\d+$/) && method === 'GET') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        const id = path.slice(1);
        try {
            const sale = await env.DB.prepare('SELECT * FROM offline_sales WHERE id = ?').bind(id).first();
            if (!sale) return error('Sale not found', 404);
            const items = await env.DB.prepare('SELECT * FROM offline_sale_items WHERE sale_id = ?').bind(id).all();
            sale.items = items.results || [];
            return ok(sale);
        } catch (e) {
            console.error('Fetch POS sale details error:', e);
            return serverError('Failed to fetch sale details');
        }
    }

    return error('Route not found', 404);
}