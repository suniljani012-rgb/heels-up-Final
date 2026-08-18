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
  CheckCircle2
} from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

// --- Modular Admin Panel Components ---
import AdminAuth from './admin/AdminAuth';
import AdminSidebar from './admin/AdminSidebar';
import AdminRouter from './admin/AdminRouter';

// --- TypeScript Interfaces ---
import type {
  Product, Order, Category, Coupon, Banner, PageConfig,
  Staff, Customer, ReturnRequest, Review, AuditLog, PosSale,
  Setting, DashboardData
} from './admin/types';

type ActiveTab = 'dashboard' | 'products' | 'stock' | 'orders' | 'categories' | 'customers' | 'reviews' | 'coupons' | 'banners' | 'pages' | 'settings' | 'pos' | 'audits' | 'returns' | 'analysis' | 'staff';

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

  // ── Auth guard ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative text-neutral-900">
        <AdminAuth onAuthSuccess={setUser} />
      </div>
    );
  }

  // Active Panel Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('admin_active_tab') as ActiveTab) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Lists & States for Dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
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

  // Real-time alerts states
  const [unseenOrders, setUnseenOrders] = useState<number>(0);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);
  const [showOrderBanner, setShowOrderBanner] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const token = localStorage.getItem('heelsup_token');

  const fetchSec = async (endpoint: string, setter: Function) => {
    if (!token) return;
    try {
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) setter(data.data);
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

  // Track which tabs have already been loaded (avoid repeat API calls)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Map: tab name → API endpoint + setter
  const TAB_DATA_MAP: Record<string, { endpoint: string; setter: Function }[]> = {
    dashboard: [{ endpoint: '/api/admin/dashboard', setter: setDashboardData }],
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
    analysis:  [
      { endpoint: '/api/admin/orders?limit=250', setter: setOrdersList },
      { endpoint: '/api/admin/products?limit=250&all=true', setter: setProductsList },
    ],
  };

  // Load data for a specific tab (called when tab is clicked)
  const loadTabData = async (tab: string, force = false) => {
    if (!token) return;
    if (!force && loadedTabs.has(tab)) return; // Already loaded, skip
    const entries = TAB_DATA_MAP[tab];
    if (!entries) return;
    setDataLoading(true);
    try {
      await Promise.allSettled(entries.map(({ endpoint, setter }) => fetchSec(endpoint, setter)));
      setLoadedTabs(prev => new Set([...prev, tab]));
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setDataLoading(false);
    }
  };

  // Full refresh (called by Refresh button)
  const loadAllData = async () => {
    if (!token) return;
    setDataLoading(true);
    setLoadedTabs(new Set()); // Reset cache
    try {
      await fetchSec('/api/admin/dashboard', setDashboardData);
      setDataLoading(false);
      setLoadedTabs(new Set(['dashboard']));
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const entries = TAB_DATA_MAP[activeTab] || [];
      if (activeTab !== 'dashboard' && entries.length > 0) {
        Promise.allSettled(entries.map(({ endpoint, setter }) => fetchSec(endpoint, setter))).then(() => {
          setLoadedTabs(prev => new Set([...prev, activeTab]));
        });
      }
    } catch (e) {
      showToast('error', 'Sync Failure', 'Failed to retrieve administrative data.');
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
        'audits', 'settings', 'analysis', 'staff'
      ].filter(hasPermission);
      if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
        setActiveTab(allowedTabs[0] as ActiveTab);
      }
    }
  }, [user, activeTab]);

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
  };

  const currentTabMeta = tabTitles[activeTab] || { title: activeTab, category: 'Admin' };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative antialiased">
      {/* Realtime Order Notification Banner */}
      {showOrderBanner && (
        <div className="fixed top-5 right-6 z-50 animate-bounce pointer-events-auto bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-3 w-84 max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 dark:text-emerald-600">
                Incoming Order
              </h5>
            </div>
            <p className="text-xs font-semibold truncate mt-0.5">{showOrderBanner}</p>
          </div>
          <button
            onClick={() => setShowOrderBanner(null)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'orders') setUnseenOrders(0);
        }}
        unseenOrders={unseenOrders}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        hasPermission={hasPermission}
        handleLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 p-3 md:p-5 space-y-5">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl px-5 py-3 flex items-center justify-between transition-all">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Home className="w-3 h-3" />
                <span>Admin</span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                <span className="text-slate-500 dark:text-slate-400">{currentTabMeta.category}</span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{activeTab}</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {currentTabMeta.title}
              </h1>
            </div>
          </div>

          {/* Right: Actions & User Meta */}
          <div className="flex items-center gap-3">
            {/* Live Sync Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Engine</span>
              <span className="text-slate-400 text-[10px]">({lastSyncTime})</span>
            </div>

            {/* Sync Refresh Button */}
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              title="Sync Live Data"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* User Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto pb-10">
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
            token={token || ""}
            dataLoading={dataLoading}
            loadAllData={loadAllData}
            handleToggleBlockCustomer={handleToggleBlockCustomer}
          />
        </main>
      </div>
    </div>
  );
}
