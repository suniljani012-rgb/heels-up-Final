import React, { useState, useEffect } from 'react';
import { ShoppingCart, Sliders, RefreshCw, X } from 'lucide-react';
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

  // Active Panel Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('admin_active_tab') as ActiveTab) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      // Load dashboard first for instant display
      await fetchSec('/api/admin/dashboard', setDashboardData);
      setDataLoading(false);
      setLoadedTabs(new Set(['dashboard']));
      // Load currently active tab data in background
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
            setShowOrderBanner(`New Order! #${latest.order_number} placed by ${latest.customer_name}`);
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
      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative text-neutral-900">
        <AdminAuth onAuthSuccess={setUser} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f4] text-neutral-900 font-sans relative">
      {showOrderBanner && (
        <div className="fixed top-18 right-6 z-50 animate-slide-left pointer-events-auto bg-white text-neutral-900 p-4 rounded-xl shadow-2xl border border-neutral-200 flex items-center gap-3 w-80 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-neutral-50 border border-primary/30 flex items-center justify-center animate-pulse text-neutral-900">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[9px] uppercase font-extrabold text-neutral-900 tracking-wider">New Order Alert</h5>
            <p className="text-[11px] font-semibold leading-snug mt-0.5">{showOrderBanner}</p>
          </div>
          <button onClick={() => setShowOrderBanner(null)} className="text-neutral-500 hover:text-neutral-900 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f5f5f4] min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200/80 flex items-center justify-between px-6 sticky top-0 z-20 md:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-neutral-500 hover:bg-neutral-50 rounded-lg transition-colors">
              <Sliders className="w-5 h-5 rotate-90" />
            </button>
            <span className="text-xs text-neutral-500 capitalize font-mono">admin &middot; {activeTab}</span>
          </div>
          <button onClick={loadAllData} disabled={dataLoading} className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
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
