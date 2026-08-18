// frontend/src/utils/activityTracker.ts
// Comprehensive Visitor Journey, Telemetry & Error Tracking Engine for HeelsUp

export interface ActivityEvent {
  id: string;
  session_id: string;
  timestamp: string;
  type: 'PAGE_VIEW' | 'PRODUCT_VIEW' | 'CART' | 'CHECKOUT' | 'PAYMENT' | 'ORDER' | 'ERROR' | 'SEARCH' | 'ADMIN';
  title: string;
  description: string;
  user_identifier?: string;
  user_phone?: string;
  user_name?: string;
  url: string;
  duration_seconds?: number;
  metadata?: Record<string, any>;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

const STORAGE_KEY = 'heelsup_activity_telemetry_logs_v2';
const SESSION_KEY = 'heelsup_visitor_session_id';
const MAX_LOGS = 500;

// Get or create persistent session ID
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'ses_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// Load all recorded activity logs
export function getStoredActivities(): ActivityEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDemoActivities();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDemoActivities();
  } catch {
    return getInitialDemoActivities();
  }
}

// Save an activity event
export function recordActivity(event: Omit<ActivityEvent, 'id' | 'session_id' | 'timestamp'> & { session_id?: string; timestamp?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredActivities();
    const fullEvent: ActivityEvent = {
      id: 'act_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      session_id: event.session_id || getSessionId(),
      timestamp: event.timestamp || new Date().toISOString(),
      ...event,
    };

    const updated = [fullEvent, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also output to console for developer inspect
    if (event.type === 'ERROR') {
      console.error(`🚨 [ActivityTracker Error] ${event.title}:`, event.description, event.metadata);
    } else {
      console.log(`📊 [ActivityTracker] ${event.type}: ${event.title}`);
    }
  } catch (err) {
    console.warn('[ActivityTracker] Failed to persist activity log:', err);
  }
}

// Quick Helper Loggers
export function logPageView(pagePath: string, pageTitle: string, durationSec = 0): void {
  recordActivity({
    type: 'PAGE_VIEW',
    title: `Visited ${pageTitle || pagePath}`,
    description: `User browsed "${pagePath}" and stayed for ${durationSec > 0 ? `${durationSec}s` : 'a few moments'}.`,
    url: pagePath,
    duration_seconds: durationSec,
    severity: 'info',
  });
}

export function logProductView(product: { id?: number | string; name: string; sku?: string; price: number; category?: string }): void {
  recordActivity({
    type: 'PRODUCT_VIEW',
    title: `Viewed Product: ${product.name}`,
    description: `Examined specifications for ${product.name} (SKU: ${product.sku || 'N/A'}, Price: ₹${Math.round(product.price / 100)}).`,
    url: `/product/${product.id || ''}`,
    metadata: { productId: product.id, sku: product.sku, price: product.price, category: product.category },
    severity: 'info',
  });
}

export function logCartAction(action: 'ADD' | 'REMOVE', item: { name: string; size?: string; price: number; quantity: number }): void {
  recordActivity({
    type: 'CART',
    title: action === 'ADD' ? `Added to Bag: ${item.name}` : `Removed from Bag: ${item.name}`,
    description: `${action === 'ADD' ? 'Added' : 'Removed'} ${item.quantity}x ${item.name} (Size: ${item.size || 'STD'}, ₹${Math.round(item.price / 100)}).`,
    url: '/cart',
    metadata: item,
    severity: action === 'ADD' ? 'success' : 'info',
  });
}

export function logOrderSuccess(order: { order_number: string; customer_name: string; customer_phone: string; total_amount: number; payment_method: string; is_cod?: boolean }): void {
  const isCOD = (order.payment_method || '').toLowerCase().includes('cod') || order.is_cod;
  const advance = isCOD ? Math.round((order.total_amount * 0.1) / 100) : Math.round(order.total_amount / 100);
  const balance = isCOD ? Math.round((order.total_amount * 0.9) / 100) : 0;

  recordActivity({
    type: 'ORDER',
    title: `New Order Placed: #${order.order_number}`,
    description: `Customer ${order.customer_name} (${order.customer_phone}) completed order. ${isCOD ? `10% Advance ₹${advance} Paid via Razorpay • ₹${balance} COD Balance to collect.` : `100% Prepaid Online ₹${advance} received.`}`,
    user_name: order.customer_name,
    user_phone: order.customer_phone,
    url: `/order/${order.order_number}`,
    metadata: order,
    severity: 'success',
  });
}

export function logSystemError(title: string, errorObj: any, contextUrl = window.location.pathname): void {
  recordActivity({
    type: 'ERROR',
    title: `Error Encountered: ${title}`,
    description: errorObj?.message || String(errorObj) || 'Unexpected system failure occurred.',
    url: contextUrl,
    metadata: {
      stack: errorObj?.stack || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    },
    severity: 'error',
  });
}

// Global auto-listener for uncaught exceptions & API rejections
export function initGlobalErrorTracking(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (e) => {
    // Ignore benign browser extension scripts or resize errors
    if (e.message?.includes('ResizeObserver') || e.filename?.includes('extension:')) return;
    logSystemError(`Frontend Exception in ${e.filename?.split('/').pop() || 'script'}`, e.error || e.message);
  });

  window.addEventListener('unhandledrejection', (e) => {
    logSystemError('Async Promise / API Rejection', e.reason);
  });
}

// Clean Initial Seed Data for immediate operator readability
function getInitialDemoActivities(): ActivityEvent[] {
  const now = Date.now();
  return [
    {
      id: 'act_seed_1',
      session_id: 'ses_kalyan_98a',
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
      type: 'ORDER',
      title: 'Order Placed: #HU-20260818-0001',
      description: 'Customer Kalyan Singh (7891470935) placed order for Saint Laurent Paris YSL Heels - Black (Size 7). 10% Advance ₹230 Paid via Razorpay • ₹2,069 COD Balance to collect on delivery.',
      user_name: 'Kalyan Singh',
      user_phone: '7891470935',
      url: '/checkout',
      severity: 'success',
      metadata: { order_id: '#HU-20260818-0001', total: 229900, advance: 23000, balance: 206900 }
    },
    {
      id: 'act_seed_2',
      session_id: 'ses_kalyan_98a',
      timestamp: new Date(now - 14 * 60 * 1000).toISOString(),
      type: 'PAYMENT',
      title: 'Razorpay Payment Captured: ₹230.00',
      description: '10% COD Partial Advance received successfully via UPI (pay_Px9238ka9128).',
      user_name: 'Kalyan Singh',
      user_phone: '7891470935',
      url: '/checkout/payment',
      severity: 'success',
    },
    {
      id: 'act_seed_3',
      session_id: 'ses_kalyan_98a',
      timestamp: new Date(now - 16 * 60 * 1000).toISOString(),
      type: 'CHECKOUT',
      title: 'Initiated Checkout with Address',
      description: 'Entered shipping address: 25, Raghunayakulu St, Sowcarpet, Chennai, Tamil Nadu - 600003.',
      user_name: 'Kalyan Singh',
      url: '/checkout',
      severity: 'info',
    },
    {
      id: 'act_seed_4',
      session_id: 'ses_kalyan_98a',
      timestamp: new Date(now - 18 * 60 * 1000).toISOString(),
      type: 'CART',
      title: 'Added to Bag: Saint Laurent Paris YSL Heels - Black',
      description: 'Selected UK Size 7 • Quantity: 1 • Cart Subtotal: ₹2,299.00.',
      url: '/product/1',
      severity: 'info',
    },
    {
      id: 'act_seed_5',
      session_id: 'ses_kalyan_98a',
      timestamp: new Date(now - 22 * 60 * 1000).toISOString(),
      type: 'PRODUCT_VIEW',
      title: 'Viewed Product: Saint Laurent Paris YSL Heels - Black',
      description: 'Customer browsed high-resolution photos, size guide, and customer reviews for 3m 40s.',
      url: '/product/1',
      duration_seconds: 220,
      severity: 'info',
    },
    {
      id: 'act_seed_6',
      session_id: 'ses_user_78b',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      type: 'SEARCH',
      title: 'Search Query: "Block Heels Black"',
      description: 'Visitor searched catalog for "Block Heels Black" — 6 matching styles displayed.',
      url: '/shop?q=Block+Heels+Black',
      severity: 'info',
    },
    {
      id: 'act_seed_7',
      session_id: 'ses_admin_01',
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
      type: 'ADMIN',
      title: 'Inventory Updated: Size 38 (+5 units)',
      description: 'Admin updated stock matrix for Classy Block Heels - Black.',
      url: '/admin/stock',
      severity: 'info',
    }
  ];
}
