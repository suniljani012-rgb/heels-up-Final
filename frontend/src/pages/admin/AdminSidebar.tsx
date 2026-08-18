import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Truck,
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
  Store,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '../../components/ui/button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  unseenOrders: number;
  pendingReturnsCount?: number;
  lowStockCount?: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  hasPermission: (tabId: string) => boolean;
  handleLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeCount?: string;
  badgeColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  unseenOrders,
  pendingReturnsCount = 0,
  lowStockCount = 0,
  sidebarOpen,
  setSidebarOpen,
  hasPermission,
  handleLogout
}: SidebarProps) {
  // Collapsed mini sidebar state on desktop
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuSections: MenuSection[] = [
    {
      title: 'CORE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'analysis', label: 'Analytics & Reports', icon: TrendingUp },
        { id: 'pos', label: 'POS Terminal', icon: CreditCard, badge: 'POS' },
      ]
    },
    {
      title: 'SALES',
      items: [
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingBag,
          badgeCount: unseenOrders > 0 ? `+${unseenOrders}` : undefined,
          badgeColor: 'bg-rose-600 text-white animate-pulse'
        },
        {
          id: 'returns',
          label: 'Returns & Claims',
          icon: RotateCcw,
          badgeCount: pendingReturnsCount > 0 ? `${pendingReturnsCount}` : undefined,
          badgeColor: 'bg-amber-500 text-white'
        },
      ]
    },
    {
      title: 'CATALOG',
      items: [
        { id: 'products', label: 'Products', icon: Package },
        {
          id: 'stock',
          label: 'Size Stock Matrix',
          icon: Boxes,
          badgeCount: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono'
        },
        { id: 'categories', label: 'Categories', icon: Tags },
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { id: 'customers', label: 'Customer Accounts', icon: Users },
        { id: 'reviews', label: 'Customer Reviews', icon: Star },
      ]
    },
    {
      title: 'MARKETING',
      items: [
        { id: 'coupons', label: 'Discount Coupons', icon: Percent },
        { id: 'banners', label: 'Banners & Top Ticker', icon: ImageIcon },
        { id: 'pages', label: 'CMS & Legal Pages', icon: FileText },
      ]
    },
    {
      title: 'FINANCE & LOGISTICS',
      items: [
        { id: 'payments', label: 'Bank Settlements (Razorpay)', icon: CreditCard },
        { id: 'logistics', label: 'Delhivery Shipping', icon: Truck },
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings },
        { id: 'staff', label: 'Staff & Roles', icon: ShieldCheck },
        { id: 'audits', label: 'Activity & Error Logs', icon: History },
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
        className={`bg-white dark:bg-slate-900 flex flex-col shrink-0 h-screen max-h-screen border-r border-slate-200/90 dark:border-slate-800 z-40 transition-all duration-200 fixed left-0 top-0 md:sticky md:top-0 overflow-hidden ${
          collapsed ? 'w-16' : 'w-56'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand & Collapse Header */}
        <div className="h-12 flex items-center justify-between px-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/80 dark:bg-slate-900">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6.5 h-6.5 rounded-md bg-slate-950 dark:bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Store className="w-3.5 h-3.5 text-amber-400" />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">
                    Heels<span className="text-indigo-600 dark:text-indigo-400">Up</span>
                  </span>
                  <span className="px-1 py-0 rounded text-[7.5px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                    Admin
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 h-6 w-6"
              aria-label="Close Sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Navigation List - 100% Guaranteed Scroll */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 space-y-2.5"
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {menuSections.map((section, sIdx) => {
            const allowedItems = section.items.filter((item) => hasPermission(item.id));
            if (allowedItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-0.5">
                {!collapsed && (
                  <div className="px-2 py-0.5">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                      {section.title}
                    </span>
                  </div>
                )}

                <div className="space-y-0.5">
                  {allowedItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        title={collapsed ? item.label : undefined}
                        className={`w-full flex items-center ${
                          collapsed ? 'justify-center px-1.5' : 'justify-between px-2'
                        } py-1.5 rounded-md text-[11px] font-medium transition-all group ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white font-semibold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                            }`}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!collapsed && (
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {item.badgeCount && (
                              <span
                                className={`px-1 py-0 rounded text-[8px] font-bold ${
                                  item.badgeColor || 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {item.badgeCount}
                              </span>
                            )}
                            {item.badge && !item.badgeCount && !isActive && (
                              <span className="px-1 py-0 text-[7.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Sign Out Section */}
        <div className="px-1.5 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out Session' : undefined}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center' : 'gap-2 px-2'
            } py-1.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-rose-600" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
