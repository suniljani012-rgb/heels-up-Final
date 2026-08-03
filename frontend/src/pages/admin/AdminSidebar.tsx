import React from 'react';
import { X } from 'lucide-react';

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
      title: 'Dashboard & Reports',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'analysis', label: 'Advanced Analysis', icon: 'fas fa-chart-line' },
      ]
    },
    {
      title: 'E-commerce & POS',
      items: [
        { id: 'pos', label: 'POS Terminal', icon: 'fas fa-cash-register' },
        { id: 'orders', label: 'Orders Registry', icon: 'fas fa-shopping-cart' },
        { id: 'returns', label: 'Exchanges Manager', icon: 'fas fa-exchange-alt' },
      ]
    },
    {
      title: 'Catalog & Stock',
      items: [
        { id: 'products', label: 'Products Catalog', icon: 'fas fa-shoe-prints' },
        { id: 'stock', label: 'Stock Inventory', icon: 'fas fa-boxes' },
        { id: 'categories', label: 'Categories', icon: 'fas fa-tags' },
      ]
    },
    {
      title: 'Customers & Reviews',
      items: [
        { id: 'customers', label: 'Customers', icon: 'fas fa-users' },
        { id: 'reviews', label: 'Reviews Moderation', icon: 'fas fa-star' },
        { id: 'coupons', label: 'Promo Codes', icon: 'fas fa-percentage' },
      ]
    },
    {
      title: 'Content & System',
      items: [
        { id: 'banners', label: 'Homepage Banners', icon: 'fas fa-images' },
        { id: 'pages', label: 'Static Pages', icon: 'fas fa-file-alt' },
        { id: 'staff', label: 'Staff Management', icon: 'fas fa-user-shield' },
        { id: 'audits', label: 'Audit Logs', icon: 'fas fa-history' },
        { id: 'settings', label: 'Settings', icon: 'fas fa-cogs' },
      ]
    }
  ];

  return (
    <aside className={`w-64 bg-white border-r border-neutral-200/80 flex flex-col shrink-0 h-screen max-h-screen z-30 transition-transform fixed left-0 top-0 md:sticky md:top-0 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200/80 shrink-0">
        <span className="text-xl font-bold tracking-tight text-neutral-900 font-sans uppercase flex items-center gap-3">
          <img src="/logo.png" alt="HeelsUp Logo" className="h-9 w-auto object-contain" /> Admin
        </span>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-8rem)] px-4 py-6 space-y-6">
        {menuSections.map((sect, sIdx) => {
          const allowedItems = sect.items.filter(item => hasPermission(item.id));
          if (allowedItems.length === 0) return null;
          return (
            <div key={sIdx} className="space-y-2">
              <span className="text-[9px] uppercase tracking-widest font-black text-neutral-500 block px-3">{sect.title}</span>
              <div className="space-y-1">
                {allowedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeTab === item.id ? 'text-neutral-900 bg-neutral-100 border border-neutral-200/80 font-bold' : 'text-neutral-500 hover:text-neutral-250 hover:bg-neutral-50/50 border border-transparent'
                    }`}
                  >
                    <i className={`${item.icon} text-sm`}></i>
                    <span>{item.label}</span>
                    {item.id === 'orders' && unseenOrders > 0 && (
                      <span className="ml-auto bg-rose-500 text-neutral-900 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">{unseenOrders}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-neutral-200/80 shrink-0">
        <button onClick={handleLogout} className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">Sign Out</button>
      </div>
    </aside>
  );
}
