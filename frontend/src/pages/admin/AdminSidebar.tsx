import React from 'react';
import { X, LogOut } from 'lucide-react';

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
      title: 'MAIN MENU',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: 'fas fa-chart-pie' },
        { id: 'analysis', label: 'Executive Analytics', icon: 'fas fa-chart-line' },
        { id: 'pos', label: 'Retail POS Terminal', icon: 'fas fa-cash-register' },
      ]
    },
    {
      title: 'STORE CATALOG',
      items: [
        { id: 'products', label: 'Products Catalog', icon: 'fas fa-shoe-prints' },
        { id: 'stock', label: 'Stock Inventory', icon: 'fas fa-boxes' },
        { id: 'categories', label: 'Categories', icon: 'fas fa-tags' },
      ]
    },
    {
      title: 'ORDERS & CLIENTS',
      items: [
        { id: 'orders', label: 'Orders Registry', icon: 'fas fa-shopping-cart' },
        { id: 'returns', label: 'Exchanges & Returns', icon: 'fas fa-exchange-alt' },
        { id: 'customers', label: 'Customer Accounts', icon: 'fas fa-users' },
        { id: 'reviews', label: 'Reviews Moderation', icon: 'fas fa-star' },
        { id: 'coupons', label: 'Promo Coupons', icon: 'fas fa-percentage' },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'banners', label: 'Homepage Banners', icon: 'fas fa-images' },
        { id: 'pages', label: 'CMS Pages', icon: 'fas fa-file-alt' },
        { id: 'staff', label: 'Staff Management', icon: 'fas fa-user-shield' },
        { id: 'audits', label: 'System Audit Logs', icon: 'fas fa-history' },
        { id: 'settings', label: 'Store Settings', icon: 'fas fa-cog' },
      ]
    }
  ];

  return (
    <aside className={`w-72 bg-white dark:bg-[#111C44] flex flex-col shrink-0 h-[calc(100vh-2rem)] my-4 ml-4 rounded-[20px] shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 z-40 transition-all fixed left-0 top-0 md:sticky md:top-4 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="h-20 flex items-center justify-between px-7 border-b border-slate-100 dark:border-navy-700 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="HeelsUp" className="h-8 w-auto object-contain" />
          <span className="text-xl font-extrabold text-[#2B3674] dark:text-white tracking-tight font-sans">
            HEELS<span className="text-[#422AFB]">UP</span>
          </span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-6">
        {menuSections.map((sect, sIdx) => {
          const allowedItems = sect.items.filter(item => hasPermission(item.id));
          if (allowedItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-widest px-4 block">
                {sect.title}
              </span>
              <div className="space-y-1 pt-1">
                {allowedItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const isOrderTab = item.id === 'orders';

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs transition-all relative font-sans ${
                        isActive
                          ? 'bg-[#F4F7FE] dark:bg-navy-700 text-[#422AFB] dark:text-white font-bold shadow-sm'
                          : 'text-[#A3AED0] hover:text-[#2B3674] dark:hover:text-white font-semibold hover:bg-slate-50 dark:hover:bg-navy-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${item.icon} text-sm ${isActive ? 'text-[#422AFB] dark:text-white' : 'text-[#A3AED0]'}`}></i>
                        <span>{item.label}</span>
                      </div>

                      {isOrderTab && unseenOrders > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EE5D50] text-white animate-pulse">
                          {unseenOrders} NEW
                        </span>
                      )}

                      {isActive && (
                        <span className="h-7 w-1.5 bg-[#422AFB] rounded-l-md absolute right-0 top-1/2 -translate-y-1/2"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-navy-700 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-all"
        >
          <LogOut className="w-4 h-4" /> End Admin Session
        </button>
      </div>
    </aside>
  );
}
