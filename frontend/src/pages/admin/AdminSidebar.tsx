import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Package,
  Boxes,
  Tags,
  ShoppingBag,
  RotateCcw,
  Users,
  Star,
  Percent,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  unseenOrders: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  hasPermission: (tabId: string) => boolean;
  handleLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  unseenOrders,
  sidebarOpen,
  setSidebarOpen,
  hasPermission,
  handleLogout
}: SidebarProps) {
  const menuSections = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'analysis', label: 'Executive Analytics', icon: TrendingUp },
        { id: 'pos', label: 'Retail POS Terminal', icon: CreditCard, badge: 'Live POS' },
      ]
    },
    {
      title: 'STORE CATALOG',
      items: [
        { id: 'products', label: 'Products Catalog', icon: Package },
        { id: 'stock', label: 'Stock Inventory', icon: Boxes },
        { id: 'categories', label: 'Categories', icon: Tags },
      ]
    },
    {
      title: 'ORDERS & CLIENTS',
      items: [
        { id: 'orders', label: 'Orders Registry', icon: ShoppingBag },
        { id: 'returns', label: 'Exchanges & Returns', icon: RotateCcw },
        { id: 'customers', label: 'Customer Accounts', icon: Users },
        { id: 'reviews', label: 'Reviews Moderation', icon: Star },
        { id: 'coupons', label: 'Promo Coupons', icon: Percent },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'banners', label: 'Homepage Banners', icon: ImageIcon },
        { id: 'pages', label: 'CMS Pages', icon: FileText },
        { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
        { id: 'audits', label: 'System Audit Logs', icon: History },
        { id: 'settings', label: 'Store Settings', icon: Settings },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-72 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-[calc(100vh-1.5rem)] my-3 ml-3 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 z-40 transition-all duration-300 fixed left-0 top-0 md:sticky md:top-3 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-slate-900/10 dark:shadow-indigo-500/20">
              <Sparkles className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  HEELS<span className="text-indigo-600 dark:text-indigo-400">UP</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Enterprise Control Hub</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {menuSections.map((section, sIdx) => {
            const allowedItems = section.items.filter((item) => hasPermission(item.id));
            if (allowedItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                    {section.title}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {allowedItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    const isOrderTab = item.id === 'orders';

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 relative ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white font-semibold shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {/* Badges / Realtime count */}
                        {isOrderTab && unseenOrders > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse shadow-xs">
                            {unseenOrders} NEW
                          </span>
                        ) : item.badge ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-tight bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                            {item.badge}
                          </span>
                        ) : isActive ? (
                          <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Session Action */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-semibold text-xs transition-colors border border-rose-200/50 dark:border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Admin Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
