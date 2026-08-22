// HeelsUp Google Analytics 4 (GA4) & Microsoft Clarity Telemetry Tracker

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
    CLARITY_PROJECT_ID?: string;
  }
}

// GA4 Measurement ID & Clarity Project ID
export const GA_MEASUREMENT_ID =
  (typeof window !== 'undefined' && window.GA_MEASUREMENT_ID) ||
  import.meta.env?.VITE_GA_MEASUREMENT_ID ||
  import.meta.env?.VITE_GA4_ID ||
  'G-XVQQHDGV99';

export const CLARITY_PROJECT_ID =
  (typeof window !== 'undefined' && window.CLARITY_PROJECT_ID) ||
  import.meta.env?.VITE_CLARITY_ID ||
  import.meta.env?.VITE_CLARITY_PROJECT_ID ||
  '';

/**
 * Check if running in a local/dev environment where analytics should be suppressed
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.endsWith('.local');
}

/**
 * Check if the current route is within the admin panel
 */
export function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/admin');
}

/**
 * Initialize Google Analytics GA4 script asynchronously (Non-blocking, deferred to idle)
 */
export function initGA4(measurementId: string = GA_MEASUREMENT_ID): void {
  if (typeof window === 'undefined') return;
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') return;
  if (isAdminRoute()) return;
  if (isDevEnvironment()) {
    console.debug('[HeelsUp Analytics] Dev mode detected — GA4 tracking suppressed on localhost.');
    return;
  }

  window.GA_MEASUREMENT_ID = measurementId;

  // Prevent duplicate script insertion
  if (document.getElementById('ga-gtag-script')) return;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false, // Handled manually on SPA route transitions
    anonymize_ip: true,
  });

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

/**
 * Initialize Microsoft Clarity asynchronously
 */
export function initClarity(projectId: string = CLARITY_PROJECT_ID): void {
  if (typeof window === 'undefined') return;
  if (!projectId || projectId === 'xxxxxxxxxx' || projectId.trim().length < 5) return;
  if (isAdminRoute()) return;
  if (isDevEnvironment()) {
    console.debug('[HeelsUp Analytics] Dev mode detected — Clarity recording suppressed on localhost.');
    return;
  }

  // Prevent duplicate script insertion
  if (document.getElementById('ms-clarity-script')) return;

  (function (c: any, l: any, a: any, r: any, i: any, t?: any, y?: any) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
    t = l.createElement(r);
    t.id = 'ms-clarity-script';
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', projectId);
}

/**
 * Initialize all telemetry & analytics during browser idle time (0ms impact on FCP/LCP)
 */
export function initAnalytics(
  gaId: string = GA_MEASUREMENT_ID,
  clarityId: string = CLARITY_PROJECT_ID
): void {
  if (typeof window === 'undefined') return;

  const loadScripts = () => {
    initGA4(gaId);
    initClarity(clarityId);
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadScripts, { timeout: 3000 });
  } else {
    setTimeout(loadScripts, 1000);
  }
}

/**
 * Track Page Views for Single-Page Application (SPA) navigation
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Track Product View (GA4 E-commerce view_item)
 */
export function trackViewItem(product: {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  sku?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  const priceRupees = product.price > 1000 ? product.price / 100 : product.price;
  window.gtag('event', 'view_item', {
    currency: 'INR',
    value: priceRupees,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_category: product.category || 'Heels',
        price: priceRupees,
        item_sku: product.sku || undefined,
      },
    ],
  });
}

/**
 * Track Add to Cart (GA4 E-commerce add_to_cart)
 */
export function trackAddToCart(item: {
  id: string | number;
  name: string;
  price: number;
  size?: string;
  color?: string;
  qty?: number;
  category?: string;
}): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  const priceRupees = item.price > 1000 ? item.price / 100 : item.price;
  const quantity = item.qty || 1;
  window.gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: priceRupees * quantity,
    items: [
      {
        item_id: String(item.id),
        item_name: item.name,
        item_category: item.category || 'Heels',
        price: priceRupees,
        quantity,
        item_variant: [item.color, item.size].filter(Boolean).join(' / ') || 'Default',
      },
    ],
  });
}

/**
 * Track Begin Checkout (GA4 E-commerce begin_checkout)
 */
export function trackCheckout(
  totalAmountRupees: number,
  itemCount: number,
  items?: Array<{ id: string | number; name: string; price: number; qty?: number; size?: string; color?: string }>
): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  window.gtag('event', 'begin_checkout', {
    currency: 'INR',
    value: totalAmountRupees,
    num_items: itemCount,
    items: items?.map((it) => ({
      item_id: String(it.id),
      item_name: it.name,
      price: it.price > 1000 ? it.price / 100 : it.price,
      quantity: it.qty || 1,
      item_variant: [it.color, it.size].filter(Boolean).join(' / ') || 'Default',
    })),
  });
}

/**
 * Track Completed Purchase (GA4 E-commerce purchase)
 */
export function trackPurchase(order: {
  transaction_id: string;
  value: number; // in Rupees
  shipping?: number;
  tax?: number;
  coupon?: string;
  items?: Array<{
    product_id: string | number;
    product_name: string;
    price: number;
    quantity: number;
    size?: string | null;
    color?: string | null;
  }>;
}): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  window.gtag('event', 'purchase', {
    transaction_id: order.transaction_id,
    currency: 'INR',
    value: order.value,
    shipping: order.shipping || 0,
    tax: order.tax || 0,
    coupon: order.coupon || undefined,
    items: order.items?.map((it) => ({
      item_id: String(it.product_id),
      item_name: it.product_name,
      price: it.price > 1000 ? it.price / 100 : it.price,
      quantity: it.quantity || 1,
      item_variant: [it.color, it.size].filter(Boolean).join(' / ') || 'Default',
    })),
  });
}

/**
 * Track Search Queries typed by users
 */
export function trackSearchQuery(query: string, resultCount?: number): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  window.gtag('event', 'search', {
    search_term: query,
    result_count: resultCount !== undefined ? resultCount : -1,
  });
}

/**
 * Generic Custom Event Tracker
 */
export function trackCustomEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined' || !window.gtag || isAdminRoute()) return;
  window.gtag('event', eventName, params);
}
