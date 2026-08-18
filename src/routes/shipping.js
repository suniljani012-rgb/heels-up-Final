// ============================================================
// HeelsUp — Shipping Routes
// /api/shipping/*
// ============================================================

import { adminGuard } from '../middleware/adminAuth.js';
import { query, queryOne, run, now } from '../utils/db.js';
import { ok, error } from '../utils/response.js';
import { checkPincodeServiceability, trackDelhiveryShipment, getDeliveryEstimate } from '../utils/delhivery.js';

export async function handleShipping(request, env, path, method) {

    // ── GET /api/shipping/estimate — delivery estimate for a pincode ──────────
    if (method === 'GET' && path === '/api/shipping/estimate') {
        const url = new URL(request.url);
        const pincode = url.searchParams.get('pincode') || '';
        const total = parseInt(url.searchParams.get('total') || '0'); // in paise

        if (!pincode || !/^\d{6}$/.test(pincode)) {
            return error('Invalid pincode — must be 6 digits');
        }

        const estimate = await getDeliveryEstimate(env, pincode, total);

        return ok({
            pincode,
            serviceable: estimate.serviceable,
            cod_available: estimate.cod,
            prepaid_available: estimate.prepaid,
            fee_paise: estimate.feePaise,
            fee_rupees: estimate.feeRupees,
            is_free: estimate.isFree,
            zone: estimate.zone,
            estimated_days: estimate.estimatedDays,
            city: estimate.city,
            state: estimate.state,
            free_above_paise: estimate.freeAbovePaise,
            free_above_rupees: estimate.freeAboveRupees,
        });
    }

    // ── GET /api/shipping/rates — calculate shipping for cart ──────
    if (method === 'GET' && path === '/api/shipping/rates') {
        const url = new URL(request.url);
        const pincode = url.searchParams.get('pincode') || '';
        const total = parseInt(url.searchParams.get('total') || '0'); // in paise

        // Free shipping above ₹1599 (159900 paise)
        const freeThreshold = 159900;
        const isFree = total >= freeThreshold;

        const rates = [
            {
                id: 'standard',
                name: 'Standard Delivery',
                description: '5–7 business days',
                price: isFree ? 0 : 4900, // ₹49
                is_free: isFree,
                estimated_days: '5-7',
            },
            {
                id: 'express',
                name: 'Express Delivery',
                description: '2–3 business days',
                price: 9900, // ₹99
                is_free: false,
                estimated_days: '2-3',
            },
        ];

        // Check if pincode is serviceable (basic check)
        const pinAvailable = pincode.length === 6 && /^\d{6}$/.test(pincode);

        return ok({
            rates,
            pincode_serviceable: pinAvailable,
            free_shipping_above: freeThreshold,
            cart_total: total,
        });
    }

    // ── POST /api/shipping/check-pincode ───────────────────────────
    if (method === 'POST' && path === '/api/shipping/check-pincode') {
        const { pincode } = await request.json();
        if (!pincode || !/^\d{6}$/.test(String(pincode))) {
            return error('Invalid pincode — must be 6 digits');
        }

        // Call live Delhivery pincode serviceability check
        const result = await checkPincodeServiceability(env, String(pincode));
        if (result.error) {
            return error(`Serviceability check failed: ${result.error}`, 502);
        }

        return ok({
            pincode,
            serviceable: result.serviceable,
            cod_available: result.cod,
            prepaid_available: result.prepaid,
            estimated_days: result.serviceable ? '3-5' : 'N/A',
        });
    }

    // ── GET /api/shipping/track/:awb ──────────────────────────────
    const trackMatch = path.match(/^\/api\/shipping\/track\/(.+)$/);
    if (method === 'GET' && trackMatch) {
        const awb = trackMatch[1];

        // Call live Delhivery tracking API
        const result = await trackDelhiveryShipment(env, awb);
        if (!result.success) {
            return error(result.error || 'Tracking details not found', 404);
        }

        return ok({
            awb,
            status: result.status || 'In Transit',
            courier: result.courier_name || 'Delhivery',
            events: (result.tracking_history || []).map(event => ({
                timestamp: event.actrecT || event.actdate || new Date().toISOString(),
                location: event.lc || event.scan_location || 'Transit Hub',
                description: event.sd || event.instructions || event.status || 'Package in transit',
            })),
        });
    }

    // ── Admin: GET /api/shipping/zones ────────────────────────────
    if (method === 'GET' && path === '/api/shipping/zones') {
        const { user, earlyReturn } = await adminGuard(request, env);
        if (earlyReturn) return earlyReturn;

        const zones = await query(env.DB, 'SELECT * FROM shipping_zones ORDER BY name');
        return ok({ zones });
    }

    // ── Admin: POST /api/shipping/zones ───────────────────────────
    if (method === 'POST' && path === '/api/shipping/zones') {
        const { user, earlyReturn } = await adminGuard(request, env);
        if (earlyReturn) return earlyReturn;

        const body = await request.json();
        const { name, states, base_rate, free_above } = body;

        if (!name || !states) return error('name and states are required');

        const result = await run(env.DB,
            'INSERT INTO shipping_zones (name, states, base_rate, free_above, created_at) VALUES (?,?,?,?,?)',
            [name, JSON.stringify(states), base_rate || 4900, free_above || 159900, now()]
        );

        return ok({ id: result.meta.last_row_id, message: 'Shipping zone created' }, 201);
    }

    // ── Admin: PUT /api/shipping/zones/:id ────────────────────────
    const zoneMatch = path.match(/^\/api\/shipping\/zones\/(\d+)$/);
    if (method === 'PUT' && zoneMatch) {
        const { user, earlyReturn } = await adminGuard(request, env);
        if (earlyReturn) return earlyReturn;

        const id = parseInt(zoneMatch[1]);
        const body = await request.json();
        const { name, states, base_rate, free_above, is_active } = body;

        await run(env.DB,
            'UPDATE shipping_zones SET name=?, states=?, base_rate=?, free_above=?, is_active=?, updated_at=? WHERE id=?',
            [name, JSON.stringify(states), base_rate, free_above, is_active ?? 1, now(), id]
        );

        return ok({ message: 'Shipping zone updated' });
    }

    // ── Admin: GET /api/shipping/methods ──────────────────────────
    if (method === 'GET' && path === '/api/shipping/methods') {
        const { user, earlyReturn } = await adminGuard(request, env);
        if (earlyReturn) return earlyReturn;

        const methods = await query(env.DB, 'SELECT * FROM shipping_methods ORDER BY sort_order');
        return ok({ methods });
    }

    // ── POST /api/shipping/webhook (Delhivery Automatic Webhook Listener) ──
    if (method === 'POST' && (path === '/api/shipping/webhook' || path === '/api/shipping/delhivery-webhook')) {
        try {
            const payload = await request.json();
            const waybill = payload.waybill || payload.Shipment?.Waybill || payload.awb || payload.Waybill;
            const statusType = (payload.Status?.StatusType || payload.Status?.Status || payload.status || '').toLowerCase();
            
            if (waybill && env.DB) {
                let mappedStatus = null;
                if (statusType.includes('dl') || statusType.includes('delivered')) mappedStatus = 'delivered';
                else if (statusType.includes('oo') || statusType.includes('out for delivery') || statusType.includes('dispatched')) mappedStatus = 'out_for_delivery';
                else if (statusType.includes('it') || statusType.includes('in transit') || statusType.includes('transit') || statusType.includes('hub')) mappedStatus = 'in_transit';
                else if (statusType.includes('pu') || statusType.includes('picked up') || statusType.includes('manifest')) mappedStatus = 'picked_up';
                else if (statusType.includes('rt') || statusType.includes('rto') || statusType.includes('return')) mappedStatus = 'returned';
                else if (statusType.includes('ud') || statusType.includes('failed') || statusType.includes('undelivered') || statusType.includes('ndr')) mappedStatus = 'delivery_failed';

                if (mappedStatus) {
                    await env.DB.prepare(`
                        UPDATE orders 
                        SET order_status = ?, updated_at = ?
                        WHERE tracking_number = ?
                    `).bind(mappedStatus, new Date().toISOString(), String(waybill).trim()).run();
                }
            }
            return ok({ success: true, message: 'Delhivery webhook processed successfully' });
        } catch (err) {
            return ok({ success: true, warning: err.message });
        }
    }

    return error('Not found', 404);
}