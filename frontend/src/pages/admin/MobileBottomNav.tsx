import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Truck,
  MoreHorizontal,
  Package,
  Boxes,
  Tags,
  Users,
  Star,
  Percent,
  Image as ImageIcon,
  FileText,
  RotateCcw,
  TrendingUp,
  Settings,
  ShieldCheck,
  History,
  Store,
  ExternalLink,
  LogOut,
  X
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  unseenOrders: number;
  lowStockCount: number;
  pendingReturnsCount: number;
  handleLogout: () => void;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  unseenOrders,
  lowStockCount,
  pendingReturnsCount,
  handleLogout,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // 4 Primary bottom tabs
  const primaryTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: unseenOrders > 0 ? unseenOrders : null },
    { id: 'pos', label: 'POS', icon: CreditCard },
    { id: 'logistics', label: 'Delivery', icon: Truck },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMoreOpen(false);
  };

  const isPrimaryActive = primaryTabs.some((t) => t.id === activeTab);

  // All grouped menu items for "More" bottom sheet
  const moreSections = [
    {
      title: 'Finance & Logistics',
      items: [
        { id: 'payments', label: 'Razorpay Settlements', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' },
        { id: 'logistics', label: 'Delhivery Shipping', icon: Truck, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60' },
        { id: 'returns', label: 'Returns & Exchange', icon: RotateCcw, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60', badge: pendingReturnsCount > 0 ? pendingReturnsCount : null },
        { id: 'analysis', label: 'Analytics & Reports', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
      ]
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { id: 'products', label: 'Products Catalog', icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60' },
        { id: 'stock', label: 'Size Stock Matrix', icon: Boxes, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60', badge: lowStockCount > 0 ? `${lowStockCount} Low` : null },
        { id: 'categories', label: 'Categories & Tags', icon: Tags, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' },
        { id: 'reviews', label: 'Customer Reviews', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' },
      ]
    },
    {
      title: 'Marketing & Storefront',
      items: [
        { id: 'coupons', label: 'Discount Coupons', icon: Percent, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
        { id: 'banners', label: 'Hero Banners & Tickers', icon: ImageIcon, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60' },
        { id: 'pages', label: 'CMS & Legal Pages', icon: FileText, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
        { id: 'customers', label: 'Customer Accounts', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' },
      ]
    },
    {
      title: 'Store Settings & Admin',
      items: [
        { id: 'settings', label: 'Store Settings & Keys', icon: Settings, color: 'text-slate-700 bg-slate-100 dark:bg-slate-800' },
        { id: 'staff', label: 'Staff & Team Roles', icon: ShieldCheck, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60' },
        { id: 'audits', label: 'Activity Logs', icon: History, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
      ]
    }
  ];

  return (
    <>
      {/* ── 1. BOTTOM 5-BUTTON BAR (Mobile Only) ────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* 4 Primary Buttons */}
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !moreOpen;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-black flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          );
        })}

        {/* 5th Button: More (•••) */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all active:scale-95 ${
            moreOpen || !isPrimaryActive
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className={`w-5 h-5 transition-transform ${moreOpen || !isPrimaryActive ? 'scale-110' : ''}`} />
            {(lowStockCount > 0 || pendingReturnsCount > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          {(moreOpen || !isPrimaryActive) && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* ── 2. "MORE" BOTTOM SHEET / FULL DRAWER ─────────────────────── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            onClick={() => setMoreOpen(false)}
            className="flex-1 w-full"
            aria-hidden="true"
          />

          <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  <Store className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Store Sections</h3>
                  <p className="text-[10px] text-slate-400">Tap any module to navigate</p>
                </div>
              </div>

              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Items Grid */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-8rem)]">
              {moreSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    {section.title}
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all active:scale-95 ${
                            isItemActive
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-xs'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate ${isItemActive ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                              {item.label}
                            </p>
                            {item.badge && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bottom Quick Links (Live Store & Logout) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>View Live Store</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  onClick={() => {
                    setMoreOpen(false);
                    handleLogout();
                  }}
                  className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
