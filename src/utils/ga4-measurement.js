/**
 * Google Analytics 4 (GA4) Measurement Protocol for Server-side Telemetry
 * Tracks API hits, database query durations, search terms, and server errors directly from Worker/Backend.
 */

export async function sendGA4ServerEvent(env, eventName, params = {}) {
  try {
    const measurementId = env.GA_MEASUREMENT_ID || 'G-XVQQHDGV99';
    const apiSecret = env.GA_API_SECRET || '';


    // Generate or derive a consistent client_id
    const clientId = params.client_id || 'server-' + Math.random().toString(36).substring(2, 15);

    const payload = {
      client_id: clientId,
      events: [
        {
          name: eventName,
          params: {
            engagement_time_msec: '100',
            session_id: params.session_id || 'server_session',
            ...params,
          },
        },
      ],
    };

    // If API secret is present, send directly to Google Analytics Measurement Protocol API
    if (apiSecret) {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.warn('[GA4 Server Event Error]:', err));
    }

    // Always log to server stdout/telemetry log stream
    console.log(`📊 [GA4 Server Telemetry] Event: "${eventName}"`, {
      measurementId,
      endpoint: params.endpoint || 'N/A',
      query: params.search_term || 'N/A',
      duration_ms: params.duration_ms || 0,
      status: params.status_code || 200,
    });
  } catch (err) {
    console.warn('[GA4 Telemetry Exception]:', err);
  }
}

/**
 * Middleware helper to measure API performance & latency
 */
export function trackApiRequest(env, request, urlPath, status, durationMs, extraParams = {}) {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

  sendGA4ServerEvent(env, 'api_request_telemetry', {
    endpoint: urlPath,
    http_method: request.method,
    status_code: status,
    duration_ms: Math.round(durationMs),
    user_agent: userAgent.substring(0, 100),
    ip_hash: btoa(ip).substring(0, 12),
    ...extraParams,
  });
}
