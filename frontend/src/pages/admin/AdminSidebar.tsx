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
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';

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
                <Badge variant="info" className="px-1.5 py-0 text-[9px] font-bold">
                  PRO
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Enterprise Control Hub</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
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
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.id === 'orders' && unseenOrders > 0 && (
                            <Badge variant="destructive" className="animate-pulse px-1.5 py-0 text-[9px] font-mono">
                              +{unseenOrders}
                            </Badge>
                          )}
                          {item.badge && !isActive && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Footer / Sign Out Section */}
        <div className="p-3 shrink-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out Session</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
