// HeelsUp Google Analytics 4 (GA4) & Telemetry Tracker

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

// Default GA4 Measurement ID (Can be overridden via window.GA_MEASUREMENT_ID or env)
export const GA_MEASUREMENT_ID =
  (typeof window !== 'undefined' && window.GA_MEASUREMENT_ID) ||
  import.meta.env?.VITE_GA_MEASUREMENT_ID ||
  'G-XVQQHDGV99';


/**
 * Initialize Google Analytics GA4 script dynamically if not already loaded
 */
export function initAnalytics(measurementId: string = GA_MEASUREMENT_ID): void {
  if (typeof window === 'undefined') return;

  window.GA_MEASUREMENT_ID = measurementId;

  // Prevent duplicate script insertion
  if (document.getElementById('ga-gtag-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false, // We handle single-page app route changes manually
  });

  console.log(`[HeelsUp Analytics] Initialized GA4 with ID: ${measurementId}`);
}

/**
 * Track Page Views for Single-Page Application (SPA) navigation
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Track Search Queries typed by users
 */
export function trackSearchQuery(query: string, resultCount?: number): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'search', {
    search_term: query,
    result_count: resultCount !== undefined ? resultCount : -1,
  });
}

/**
 * Track Add to Cart Events
 */
export function trackAddToCart(item: { id: string | number; name: string; price: number; size?: string }): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: item.price,
    items: [
      {
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        item_variant: item.size || 'N/A',
      },
    ],
  });
}

/**
 * Track Checkout Initiated
 */
export function trackCheckout(totalAmount: number, itemCount: number): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'begin_checkout', {
    currency: 'INR',
    value: totalAmount,
    num_items: itemCount,
  });
}

/**
 * Track Backend API Call & Query Performance from Client
 */
export function trackApiPerformance(endpoint: string, method: string, status: number, durationMs: number): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'api_performance', {
    event_category: 'API Telemetry',
    event_label: `${method} ${endpoint}`,
    value: durationMs,
    status_code: status,
    duration_ms: durationMs,
  });
}

/**
 * Generic Event Tracker
 */
export function trackCustomEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}
