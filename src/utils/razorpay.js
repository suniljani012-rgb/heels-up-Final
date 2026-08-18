// ============================================================
// HeelsUp — Razorpay Utility Helpers
// Cloudflare Workers runtime (NO Node.js crypto — use WebCrypto)
// ============================================================

async function getRazorpayCredentials(env) {
  let keyId = (env.RAZORPAY_KEY_ID || "").trim();
  let keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();
  try {
    const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('razorpay_key_id', 'razorpay_key_secret')").all();
    for (const row of (rows.results || [])) {
      if (row.key === 'razorpay_key_id' && row.value) keyId = row.value.trim();
      if (row.key === 'razorpay_key_secret' && row.value) keySecret = row.value.trim();
    }
  } catch {}
  return { keyId, keySecret };
}

export const razorpay = {

  // ── Create a Razorpay Order ─────────────────────────────────
  // Returns: { id, amount, currency, receipt, status }
  async createOrder(env, { amount, currency = 'INR', receipt, notes = {} }) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Razorpay createOrder failed:', errBody);
      return {};
    }

    return res.json();
  },

  // ── Verify Payment Signature (HMAC-SHA256) ──────────────────
  // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
  async verifySignature(env, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const { keySecret } = await getRazorpayCredentials(env);
    return _hmacVerify(keySecret, message, razorpay_signature);
  },

  // ── Verify Webhook Signature ────────────────────────────────
  // Razorpay signs the raw request body with webhook secret
  async verifyWebhook(env, rawBody, signature) {
    let secret = (env.RAZORPAY_WEBHOOK_SECRET || "").trim();
    try {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'razorpay_webhook_secret'").first();
      if (row && row.value) secret = row.value.trim();
    } catch {}
    return _hmacVerify(secret, rawBody, signature);
  },

  // ── Fetch a Razorpay Order (for admin/debugging) ────────────
  async fetchOrder(env, razorpayOrderId) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    return res.ok ? res.json() : null;
  },

  // ── Fetch a Razorpay Payment ────────────────────────────────
  async fetchPayment(env, razorpayPaymentId) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    const credentials = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    return res.ok ? res.json() : null;
  },

  // ── Fetch Payments List (for admin ledger & sync with date range support) ───
  async fetchPaymentsList(env, options = {}) {
    const count = typeof options === 'number' ? options : (options.count || 100);
    const from = typeof options === 'object' ? options.from : null;
    const to = typeof options === 'object' ? options.to : null;

    const { keyId, keySecret } = await getRazorpayCredentials(env);
    if (!keyId || !keySecret) return [];
    const credentials = btoa(`${keyId}:${keySecret}`);
    let url = `https://api.razorpay.com/v1/payments?count=${count}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    }).catch(() => null);
    if (!res || !res.ok) return [];
    const data = await res.json().catch(() => ({ items: [] }));
    return data.items || [];
  },

  // ── Fetch Settlements List (with date range support) ────────
  async fetchSettlementsList(env, options = {}) {
    const count = typeof options === 'number' ? options : (options.count || 50);
    const from = typeof options === 'object' ? options.from : null;
    const to = typeof options === 'object' ? options.to : null;

    const { keyId, keySecret } = await getRazorpayCredentials(env);
    if (!keyId || !keySecret) return [];
    const credentials = btoa(`${keyId}:${keySecret}`);
    let url = `https://api.razorpay.com/v1/settlements?count=${count}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    }).catch(() => null);
    if (!res || !res.ok) return [];
    const data = await res.json().catch(() => ({ items: [] }));
    return data.items || [];
  },

  // ── Initiate Refund ─────────────────────────────────────────
  async createRefund(env, razorpayPaymentId, amount = null, notes = {}) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    if (!keyId || !keySecret) return null;
    const credentials = btoa(`${keyId}:${keySecret}`);
    const body = { notes };
    if (amount) body.amount = amount; // partial refund in paise

    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    }).catch(() => null);

    return res && res.ok ? res.json() : null;
  },

  // ── Create Standard Razorpay Payment Link (for WhatsApp / SMS sharing) ──
  async createPaymentLink(env, { amount, currency = 'INR', description, customer = {}, notes = {} }) {
    const { keyId, keySecret } = await getRazorpayCredentials(env);
    if (!keyId || !keySecret) {
      return { success: false, error: 'Razorpay Key ID or Secret not configured in Settings' };
    }
    const credentials = btoa(`${keyId}:${keySecret}`);

    const rawContact = String(customer.contact || '').replace(/\D/g, '');
    const cleanPhone = rawContact.length >= 10 ? rawContact.slice(-10) : '';

    const custPayload = {};
    if (customer.name && customer.name.trim()) custPayload.name = customer.name.trim();
    if (cleanPhone) custPayload.contact = `+91${cleanPhone}`;
    if (customer.email && customer.email.includes('@')) custPayload.email = customer.email.trim();

    const payload = {
      amount: Math.round(Number(amount)), // in paise
      currency: currency || 'INR',
      accept_partial: false,
      description: description || 'HEELSUP Footwear Order Payment',
      notify: {
        sms: Boolean(cleanPhone),
        email: Boolean(customer.email && customer.email.includes('@'))
      },
      reminder_enable: true,
      notes: notes || {}
    };

    if (Object.keys(custPayload).length > 0) {
      payload.customer = custPayload;
    }

    try {
      const res = await fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data && (data.short_url || data.id)) {
        return { success: true, ...data };
      } else {
        console.error('Razorpay payment link error:', data);
        const errDesc = data?.error?.description || data?.error?.code || 'Failed to generate link on Razorpay';
        return { success: false, error: errDesc };
      }
    } catch (e) {
      console.error('Razorpay payment link network error:', e);
      return { success: false, error: e.message || 'Network error communicating with Razorpay' };
    }
  },
};

// ── Internal: HMAC-SHA256 using WebCrypto (Workers compatible) ──
async function _hmacVerify(secret, message, expectedHex) {
  try {
    const enc     = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature  = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hexSig     = Array.from(new Uint8Array(signature))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');

    // Constant-time comparison to prevent timing attacks
    if (hexSig.length !== expectedHex.length) return false;
    let result = 0;
    for (let i = 0; i < hexSig.length; i++) {
        result |= hexSig.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
