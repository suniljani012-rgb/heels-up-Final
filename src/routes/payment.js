// worker/src/routes/payment.js
import { razorpay } from '../utils/razorpay.js';
import { ok, error as err } from '../utils/response.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createOrderRecord } from './orders.js';
import { kvGet, kvDelete } from '../utils/db.js';

export async function paymentRouter(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/payment', '');
  const method = request.method;

  // ── GET /api/payment/key ─────────────────────────────────
  if (method === 'GET' && path === '/key') {
    return ok({ key_id: env.RAZORPAY_KEY_ID });
  }

  // ── POST /api/payment/verify ─────────────────────────────
  if (method === 'POST' && path === '/verify') {
    let body;
    try { body = await request.json(); }
    catch { return err('Invalid JSON', 400); }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return err('Missing payment fields', 400);

    // Verify Razorpay signature
    const isValid = await razorpay.verifySignature(env, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) return err('Invalid payment signature', 400);

    // Concurrency protection: Check if order already processed in database
    const existingOrder = await env.DB.prepare(
      "SELECT id, order_number FROM orders WHERE razorpay_order_id = ?"
    ).bind(razorpay_order_id).first();

    if (existingOrder) {
      return ok({
        success: true,
        order_number: existingOrder.order_number,
        order_id: existingOrder.id,
        message: 'Payment successful! Order placed.',
      });
    }

    // Get pending order details from KV
    const pendingStr = await kvGet(env, `pending_order:${razorpay_order_id}`);
    if (!pendingStr) {
      return err("Order details not found or expired. If amount was debited, please contact support.", 404);
    }
    const pending = JSON.parse(pendingStr);

    // Now create the actual order record in D1 DB
    const createdRes = await createOrderRecord(env, {
      userId: pending.userId,
      customer: pending.customer,
      items: pending.items,
      deliveryMethod: pending.deliveryMethod,
      notes: pending.notes,
      paymentMethod: pending.paymentMethod,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      couponCode: pending.couponCode,
      discountAmount: pending.discountAmount,
      orderNumber: pending.orderNumber
    });

    if (!createdRes.ok) {
      return err("Failed to place order in database: " + createdRes.error, 500);
    }

    const orderId = createdRes.order.id;
    const paidAt = new Date().toISOString();

    // Update order with razorpay details
    await env.DB.prepare(
      "UPDATE orders SET payment_status='paid', order_status='confirmed', razorpay_order_id=?, razorpay_payment_id=?, razorpay_signature=?, paid_at=?, updated_at=? WHERE id=?"
    ).bind(razorpay_order_id, razorpay_payment_id, razorpay_signature, paidAt, paidAt, orderId).run();

    // Insert payment record
    const actualPaidAmount = pending.paymentMethod === 'COD' ? Math.round(pending.totalAmount * 0.10) : pending.totalAmount;
    await env.DB.prepare(
      "INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, raw_payload, created_at) VALUES (?,'RAZORPAY',?,?,?,'INR','captured',?,?)"
    ).bind(orderId, razorpay_order_id, razorpay_payment_id, actualPaidAmount, JSON.stringify(body), paidAt).run();

    // Increment coupon usage
    if (pending.couponCode) {
      await env.DB.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?").bind(pending.couponCode).run();
    }

    // Delete pending KV draft order
    await kvDelete(env, `pending_order:${razorpay_order_id}`);

    return ok({
      success: true,
      order_number: createdRes.order.order_number,
      order_id: orderId,
      message: 'Payment successful! Order placed.',
    });
  }

  // ── POST /api/payment/fail ───────────────────────────────
  if (method === 'POST' && path === '/fail') {
    let body;
    try { body = await request.json(); }
    catch { return err('Invalid JSON', 400); }

    const { user, error: authErr } = await requireAuth(request, env);
    if (authErr) return authErr;

    const rzpOrderId = String(body.razorpay_order_id || "").trim();
    if (rzpOrderId) {
      await kvDelete(env, `pending_order:${rzpOrderId}`);
    }

    const localOrderId = parseInt(body.orderId || 0);
    if (localOrderId) {
      const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?").bind(localOrderId).first();
      if (order && order.user_id === user.id) {
        if (order.payment_status === 'paid') return err("Already paid", 400);
        await env.DB.prepare("UPDATE orders SET status='cancelled', payment_status='failed', updated_at=? WHERE id=?").bind(new Date().toISOString(), localOrderId).run();
      }
    }

    return ok({ ok: true });
  }

  // ── POST /api/payment/webhook ────────────────────────────
  if (method === 'POST' && (path === '/webhook' || path === '/api/payment/webhook')) {
    const signature = request.headers.get('x-razorpay-signature');
    const rawBody = await request.text();

    const isValid = await razorpay.verifyWebhook(env, rawBody, signature);
    if (!isValid) return err('Invalid webhook signature', 400);

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return err('Invalid JSON webhook body', 400);
    }

    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const refundEntity = event.payload?.refund?.entity;

    // 1. Payment Captured or Order Paid (Auto-confirms order if browser closed early)
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const existingOrder = await env.DB.prepare(
          "SELECT id FROM orders WHERE razorpay_order_id = ?"
        ).bind(rzpOrderId).first();

        if (existingOrder) {
          await env.DB.prepare(
            "UPDATE orders SET payment_status='paid', order_status=CASE WHEN order_status='pending' THEN 'confirmed' ELSE order_status END, razorpay_payment_id=COALESCE(razorpay_payment_id, ?), updated_at=datetime('now') WHERE id = ?"
          ).bind(rzpPaymentId || '', existingOrder.id).run();
        } else {
          // Check KV draft if customer completed payment but tab closed before verify POST
          const pendingStr = await kvGet(env, `pending_order:${rzpOrderId}`);
          if (pendingStr) {
            const pending = JSON.parse(pendingStr);
            const createdRes = await createOrderRecord(env, {
              userId: pending.userId,
              customer: pending.customer,
              items: pending.items,
              deliveryMethod: pending.deliveryMethod,
              notes: pending.notes,
              paymentMethod: pending.paymentMethod,
              paymentStatus: "paid",
              orderStatus: "confirmed",
              couponCode: pending.couponCode,
              discountAmount: pending.discountAmount,
              orderNumber: pending.orderNumber
            });

            if (createdRes.ok) {
              const orderId = createdRes.order.id;
              const paidAt = new Date().toISOString();
              await env.DB.prepare(
                "UPDATE orders SET payment_status='paid', order_status='confirmed', razorpay_order_id=?, razorpay_payment_id=?, paid_at=?, updated_at=? WHERE id=?"
              ).bind(rzpOrderId, rzpPaymentId || '', paidAt, paidAt, orderId).run();
              await kvDelete(env, `pending_order:${rzpOrderId}`);
            }
          }
        }
      }
    }
    // 2. Payment Failed
    else if (eventType === 'payment.failed') {
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        await env.DB.prepare(
          "UPDATE orders SET payment_status='failed', order_status=CASE WHEN order_status='pending' THEN 'cancelled' ELSE order_status END, updated_at=datetime('now') WHERE razorpay_order_id = ?"
        ).bind(rzpOrderId).run();
      }
    }
    // 3. Refund Processed / Refund Created
    else if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const rzpPaymentId = refundEntity?.payment_id;
      if (rzpPaymentId) {
        await env.DB.prepare(
          "UPDATE orders SET payment_status='refunded', updated_at=datetime('now') WHERE razorpay_payment_id = ?"
        ).bind(rzpPaymentId).run();
        await env.DB.prepare(
          "UPDATE payments SET status='refunded' WHERE provider_payment_id = ?"
        ).bind(rzpPaymentId).run();
      }
    }

    return ok({ received: true, event: eventType });
  }

  return err('Not found', 404);
}
