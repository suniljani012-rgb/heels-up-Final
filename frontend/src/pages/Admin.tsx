import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Menu,
  RefreshCw,
  X,
  Search,
  Radio,
  Home,
  ChevronRight,
  Sparkles,
  Command,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

// --- Modular Admin Panel Components ---
import AdminAuth from './admin/AdminAuth';
import AdminSidebar from './admin/AdminSidebar';
import AdminRouter from './admin/AdminRouter';
import CommandPalette from './admin/CommandPalette';

// --- TypeScript Interfaces ---
import type {
  Product, Order, Category, Coupon, Banner, PageConfig,
  Staff, Customer, ReturnRequest, Review, AuditLog, PosSale,
  Setting, DashboardData
} from './admin/types';

type ActiveTab = 'dashboard' | 'products' | 'stock' | 'orders' | 'categories' | 'customers' | 'reviews' | 'coupons' | 'banners' | 'pages' | 'settings' | 'pos' | 'audits' | 'returns' | 'analysis' | 'staff' | 'payments' | 'logistics';

export default function Admin() {
  const showToast = useToastStore((state) => state.showToast);

  // Authentication State
  const [user, setUser] = useState<{ name: string; role: string; email: string; permissions?: string[] } | null>(() => {
    const savedUser = localStorage.getItem('heelsup_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });

  // Active Panel Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('admin_active_tab') as ActiveTab) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Lists & States for Dashboard - Hydrated instantly from local session cache
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() => {
    try {
      const s = sessionStorage.getItem('heelsup_cache_dashboard');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [productsList, setProductsList] = useState<Product[]>(() => {
    try {
      const s = sessionStorage.getItem('heelsup_cache_products');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [ordersList, setOrdersList] = useState<Order[]>(() => {
    try {
      const s = sessionStorage.getItem('heelsup_cache_orders');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [categoriesList, setCategoriesList] = useState<Category[]>(() => {
    try {
      const s = sessionStorage.getItem('heelsup_cache_categories');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [bannersList, setBannersList] = useState<Banner[]>([]);
  const [pagesList, setPageConfigsList] = useState<PageConfig[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);
  const [settingsList, setSettingsList] = useState<Setting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [posSalesList, setPosSalesList] = useState<PosSale[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);

  // Update session caches on change
  useEffect(() => {
    if (dashboardData) sessionStorage.setItem('heelsup_cache_dashboard', JSON.stringify(dashboardData));
  }, [dashboardData]);

  useEffect(() => {
    if (ordersList.length > 0) sessionStorage.setItem('heelsup_cache_orders', JSON.stringify(ordersList));
  }, [ordersList]);

  useEffect(() => {
    if (productsList.length > 0) sessionStorage.setItem('heelsup_cache_products', JSON.stringify(productsList));
  }, [productsList]);

  useEffect(() => {
    if (categoriesList.length > 0) sessionStorage.setItem('heelsup_cache_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  // Real-time alerts states
  const [unseenOrders, setUnseenOrders] = useState<number>(0);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [showOrderBanner, setShowOrderBanner] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const token = localStorage.getItem('heelsup_token');

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

// Global In-Memory Cache for Instant 0-ms Admin Navigation & Tab Switching
const ADMIN_API_CACHE = new Map<string, any>();

// In Admin.tsx component
  const fetchSec = async (endpoint: string, setter: Function, silent = false) => {
    // 1. Instant Cache Hit (0ms UI Render)
    if (ADMIN_API_CACHE.has(endpoint)) {
      const cached = ADMIN_API_CACHE.get(endpoint);
      setter(cached);
    }

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(endpoint, { headers });
      
      // Fallback for catalog endpoints if admin router is restricted
      if (!res.ok && endpoint.startsWith('/api/admin/')) {
        const fallbackEndpoint = endpoint.replace('/api/admin/', '/api/');
        try {
          const fallbackRes = await fetch(fallbackEndpoint);
          if (fallbackRes.ok) res = fallbackRes;
        } catch (_) {}
      }

      const data = await res.json();
      if (data && data.success !== false) {
        let payload = data;
        if (data.data !== undefined) payload = data.data;
        else if (data.results !== undefined) payload = data.results;
        else if (data.products !== undefined) payload = data.products;
        else if (data.orders !== undefined) payload = data.orders;
        else if (data.customers !== undefined) payload = data.customers;

        // Update memory cache & state
        ADMIN_API_CACHE.set(endpoint, payload);
        setter(payload);
      }
    } catch (e) {
      console.error(`Fetch error at ${endpoint}:`, e);
    }
  };

  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.error('Audio failed:', e);
    }
  };

  // Track which tabs have already been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Map: tab name → API endpoint + setter
  const TAB_DATA_MAP: Record<string, { endpoint: string; setter: Function }[]> = {
    dashboard: [
      { endpoint: '/api/admin/dashboard', setter: setDashboardData },
      { endpoint: '/api/admin/orders?limit=250', setter: setOrdersList },
      { endpoint: '/api/admin/products?limit=250&all=true', setter: setProductsList },
      { endpoint: '/api/admin/returns', setter: setReturnsList },
      { endpoint: '/api/admin/categories', setter: setCategoriesList },
    ],
    products:  [{ endpoint: '/api/admin/products?limit=250&all=true', setter: setProductsList }],
    stock:     [{ endpoint: '/api/admin/products?limit=250&all=true', setter: setProductsList }],
    orders:    [{ endpoint: '/api/admin/orders?limit=250', setter: setOrdersList }],
    customers: [{ endpoint: '/api/admin/customers?limit=250', setter: setCustomersList }],
    categories:[{ endpoint: '/api/admin/categories', setter: setCategoriesList }],
    coupons:   [{ endpoint: '/api/admin/coupons', setter: setCouponsList }],
    banners:   [{ endpoint: '/api/admin/banners', setter: setBannersList }],
    reviews:   [{ endpoint: '/api/admin/reviews', setter: setReviewsList }],
    pages:     [{ endpoint: '/api/admin/pages', setter: setPageConfigsList }],
    staff:     [{ endpoint: '/api/admin/staff', setter: setStaffList }],
    settings:  [{ endpoint: '/api/admin/settings', setter: setSettingsList }],
    returns:   [{ endpoint: '/api/admin/returns', setter: setReturnsList }],
    pos:       [{ endpoint: '/api/admin/pos/sales?all=true', setter: setPosSalesList }],
    audits:    [{ endpoint: '/api/admin/audit-logs', setter: setAuditLogs }],
    payments:  [{ endpoint: '/api/admin/payments', setter: setPaymentsList }],
    logistics: [{ endpoint: '/api/admin/orders?limit=250', setter: setOrdersList }],
    analysis:  [
      { endpoint: '/api/admin/orders?limit=250', setter: setOrdersList },
      { endpoint: '/api/admin/products?limit=250&all=true', setter: setProductsList },
    ],
  };

  // Load data for a specific tab with 0ms cache rendering
  const loadTabData = async (tab: string, force = false) => {
    const entries = TAB_DATA_MAP[tab];
    if (!entries) return;

    const hasAnyCache = entries.every(e => ADMIN_API_CACHE.has(e.endpoint));
    if (!hasAnyCache && !force) {
      setDataLoading(true);
    }

    try {
      await Promise.allSettled(entries.map(({ endpoint, setter }) => fetchSec(endpoint, setter)));
      setLoadedTabs(prev => new Set([...prev, tab]));
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setDataLoading(false);
    }
  };

  // Single-Trip Ultra-Fast Bootstrap (One single round trip for all admin data)
  const loadAllData = async () => {
    const hasInitialCache = ADMIN_API_CACHE.has('/api/admin/bootstrap');
    if (!hasInitialCache) setDataLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/bootstrap', { headers });
      const data = await res.json();

      if (data && data.success && data.data) {
        const d = data.data;
        ADMIN_API_CACHE.set('/api/admin/bootstrap', d);
        if (d.dashboard) setDashboardData(d.dashboard);
        if (d.orders) setOrdersList(d.orders);
        if (d.products) setProductsList(d.products);
        if (d.categories) setCategoriesList(d.categories);
        if (d.customers) setCustomersList(d.customers);
        if (d.returns) setReturnsList(d.returns);
        if (d.coupons) setCouponsList(d.coupons);
        if (d.banners) setBannersList(d.banners);
        if (d.settings) setSettingsList(d.settings);
        if (d.reviews) setReviewsList(d.reviews);
        if (d.payments) setPaymentsList(d.payments);

        // Pre-warm individual API endpoint caches so tab switches never need any network fetch
        if (d.dashboard) ADMIN_API_CACHE.set('/api/admin/dashboard', d.dashboard);
        if (d.orders) ADMIN_API_CACHE.set('/api/admin/orders?limit=250', d.orders);
        if (d.products) ADMIN_API_CACHE.set('/api/admin/products?limit=250&all=true', d.products);
        if (d.categories) ADMIN_API_CACHE.set('/api/admin/categories', d.categories);
        if (d.customers) ADMIN_API_CACHE.set('/api/admin/customers?limit=250', d.customers);
        if (d.returns) ADMIN_API_CACHE.set('/api/admin/returns', d.returns);
        if (d.coupons) ADMIN_API_CACHE.set('/api/admin/coupons', d.coupons);
        if (d.banners) ADMIN_API_CACHE.set('/api/admin/banners', d.banners);
        if (d.settings) ADMIN_API_CACHE.set('/api/admin/settings', d.settings);
        if (d.reviews) ADMIN_API_CACHE.set('/api/admin/reviews', d.reviews);
        if (d.payments) ADMIN_API_CACHE.set('/api/admin/payments', d.payments);

        setLoadedTabs(new Set([
          'dashboard', 'products', 'stock', 'orders', 'returns', 'categories',
          'customers', 'coupons', 'banners', 'settings', 'reviews', 'analysis', 'payments', 'logistics'
        ]));
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        // Fallback parallel fetch if bootstrap is not available
        await Promise.allSettled([
          fetchSec('/api/admin/dashboard', setDashboardData),
          fetchSec('/api/admin/orders?limit=250', setOrdersList),
          fetchSec('/api/admin/products?limit=250&all=true', setProductsList),
          fetchSec('/api/admin/returns', setReturnsList),
          fetchSec('/api/admin/categories', setCategoriesList),
        ]);
      }
    } catch (e) {
      console.warn('Bootstrap fetch failed, falling back:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // On login: load only dashboard
  useEffect(() => {
    if (token && user) loadAllData();
  }, [token, user]);

  // When tab changes: load that tab's data if not yet loaded
  useEffect(() => {
    if (token && user) loadTabData(activeTab);
  }, [activeTab, token, user]);

  useEffect(() => {
    if (ordersList.length > 0 && lastOrderCount === null) {
      setLastOrderCount(ordersList.length);
    }
  }, [ordersList]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/orders?limit=250', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const fetchedOrders = data.data;
          if (lastOrderCount !== null && fetchedOrders.length > lastOrderCount) {
            const diff = fetchedOrders.length - lastOrderCount;
            const latest = fetchedOrders[0];
            playAlertSound();
            setShowOrderBanner(`New Order #${latest.order_number} (${latest.customer_name})`);
            setUnseenOrders(prev => prev + diff);
            setOrdersList(fetchedOrders);
            setLastOrderCount(fetchedOrders.length);
            setTimeout(() => setShowOrderBanner(null), 8000);
          } else if (lastOrderCount === null) {
            setLastOrderCount(fetchedOrders.length);
          }
        }
      } catch (e) {
        console.error('Error polling for new orders:', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token, lastOrderCount]);

  useEffect(() => {
    const handleUnauth = () => {
      setUser(null);
      showToast('error', 'Session Expired', 'Please verify your administrative credentials again.');
    };
    window.addEventListener('heelsup_unauthorized', handleUnauth);
    return () => window.removeEventListener('heelsup_unauthorized', handleUnauth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('heelsup_token');
    localStorage.removeItem('heelsup_user');
    setUser(null);
    showToast('info', 'Logged Out', 'You have securely terminated the admin session.');
  };

  const handleToggleBlockCustomer = async (cust: Customer) => {
    try {
      const res = await fetch(`/api/admin/customers/${cust.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'User Modified', `Customer block status updated.`);
        loadAllData();
      } else {
        showToast('error', 'Blocked', data.error);
      }
    } catch {
      showToast('error', 'Sync Error', 'Failed to save customer configuration.');
    }
  };

  const hasPermission = (tabId: string) => {
    if (!user) return false;
    if (user.email === 'support@heelsup.in') return true;
    return user.permissions ? user.permissions.includes(tabId) : ['dashboard', 'orders', 'pos'].includes(tabId);
  };

  useEffect(() => {
    if (user) {
      const allowedTabs = [
        'dashboard', 'products', 'stock', 'orders', 'categories', 'customers',
        'reviews', 'coupons', 'banners', 'pages', 'pos', 'returns',
        'audits', 'settings', 'analysis', 'staff', 'payments', 'logistics'
      ].filter(hasPermission);
      if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
        setActiveTab(allowedTabs[0] as ActiveTab);
      }
    }
  }, [user, activeTab]);

  // Auth Guard
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative text-slate-900">
        <AdminAuth onAuthSuccess={setUser} />
      </div>
    );
  }

  // Format tab label
  const tabTitles: Record<string, { title: string; category: string }> = {
    dashboard: { title: 'Executive Overview', category: 'Operations' },
    analysis: { title: 'Business Analytics & Reports', category: 'Operations' },
    pos: { title: 'Retail POS Terminal', category: 'Operations' },
    products: { title: 'Products Catalog', category: 'Catalog' },
    stock: { title: 'Inventory & Stock Level', category: 'Catalog' },
    categories: { title: 'Product Categories', category: 'Catalog' },
    orders: { title: 'Orders Registry', category: 'Orders' },
    returns: { title: 'Exchanges & Returns', category: 'Orders' },
    customers: { title: 'Customer Accounts', category: 'Clients' },
    reviews: { title: 'Reviews Moderation', category: 'Clients' },
    coupons: { title: 'Discount Coupons', category: 'Marketing' },
    banners: { title: 'Homepage Hero Banners', category: 'Marketing' },
    pages: { title: 'Content & CMS Pages', category: 'CMS' },
    staff: { title: 'Team & Staff Permissions', category: 'Admin' },
    audits: { title: 'Security & Audit Logs', category: 'Admin' },
    settings: { title: 'Store Configuration', category: 'Admin' },
    payments: { title: 'Bank Settlements & Razorpay Ledger', category: 'Finance' },
    logistics: { title: 'Delhivery Shipping & Logistics', category: 'Logistics' },
  };

  const currentTabMeta = tabTitles[activeTab] || { title: activeTab, category: 'Admin' };

  return (
    <div className="flex h-screen max-h-screen w-full bg-slate-100/70 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Floating alert banner for incoming real-time orders */}
      {showOrderBanner && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300 bg-slate-900 text-white dark:bg-indigo-600 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 dark:border-indigo-500">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold">{showOrderBanner}</span>
          <button
            onClick={() => {
              setActiveTab('orders');
              setShowOrderBanner(null);
            }}
            className="text-xs font-bold underline ml-1 hover:text-indigo-200"
          >
            View Order
          </button>
        </div>
      )}

      {/* Modern Sidebar (Collapsible & High-Density) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab as ActiveTab);
          if (tab === 'orders') setUnseenOrders(0);
        }}
        unseenOrders={unseenOrders}
        pendingReturnsCount={returnsList.filter(r => r.status === 'pending').length}
        lowStockCount={productsList.filter((p) => p.stock <= 5).length}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        hasPermission={hasPermission}
        handleLogout={handleLogout}
      />

      {/* Main Content Area - Guaranteed Scrollable */}
      <div className="flex-1 flex flex-col h-screen max-h-screen overflow-y-auto min-w-0 p-3 md:p-4 space-y-3.5">
        {/* Top Header Navbar - Professional SaaS Standard */}
        <header className="sticky top-0 z-30 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 transition-all">
          {/* Left: Mobile Toggle & Clean Heading */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {currentTabMeta.title}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                HeelsUp Boutique Management
              </p>
            </div>
          </div>

          {/* Center: Clean Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-400 flex items-center justify-between text-xs transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">Search orders, products, customers...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Actions & User Meta */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Live Store */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Live Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>

            {/* Sync Refresh Button */}
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              title="Sync Live Data"
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 w-full mx-auto pb-6">
          <AdminRouter
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dashboardData={dashboardData}
            productsList={productsList}
            ordersList={ordersList}
            categoriesList={categoriesList}
            couponsList={couponsList}
            bannersList={bannersList}
            pagesList={pagesList}
            staffList={staffList}
            customersList={customersList}
            reviewsList={reviewsList}
            returnsList={returnsList}
            settingsList={settingsList}
            auditLogs={auditLogs}
            paymentsList={paymentsList}
            token={token || ""}
            dataLoading={dataLoading}
            loadAllData={loadAllData}
            handleToggleBlockCustomer={handleToggleBlockCustomer}
          />
        </main>
      </div>

      {/* Global Shopify Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
        products={productsList}
        orders={ordersList}
      />
    </div>
  );
}
