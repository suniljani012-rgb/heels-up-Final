import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Tag,
  Star,
  Image,
  FileText,
  Settings,
  Shield,
  ExternalLink,
  ArrowRight,
  PlusCircle,
  X,
  Command
} from 'lucide-react';
import type { Product, Order } from './types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  products: Product[];
  orders: Order[];
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon: any;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  products,
  orders,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keybinding Ctrl+K / Cmd+K
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const navCommands = useMemo<CommandItem[]>(() => [
    { id: 'dashboard', title: 'Home / Overview', subtitle: 'Executive store summary', category: 'Navigation', icon: LayoutDashboard, action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'orders', title: 'Orders Hub', subtitle: 'Manage fulfillments & invoices', category: 'Navigation', icon: ShoppingCart, action: () => { onNavigate('orders'); onClose(); } },
    { id: 'products', title: 'Products Catalog', subtitle: 'Inventory styles & pricing', category: 'Navigation', icon: Package, action: () => { onNavigate('products'); onClose(); } },
    { id: 'stock', title: 'Inventory & Stock Matrix', subtitle: 'Size-wise stock levels', category: 'Navigation', icon: Boxes, action: () => { onNavigate('stock'); onClose(); } },
    { id: 'pos', title: 'Point of Sale (POS)', subtitle: 'Fast retail checkout register', category: 'Navigation', icon: CreditCard, action: () => { onNavigate('pos'); onClose(); } },
    { id: 'customers', title: 'Customers Directory', subtitle: 'CRM & Client accounts', category: 'Navigation', icon: Users, action: () => { onNavigate('customers'); onClose(); } },
    { id: 'analysis', title: 'Analytics & Financial Reports', subtitle: 'Sales velocity & GMV', category: 'Navigation', icon: BarChart3, action: () => { onNavigate('analysis'); onClose(); } },
    { id: 'coupons', title: 'Discount Codes & Promotions', subtitle: 'Marketing coupons & vouchers', category: 'Navigation', icon: Tag, action: () => { onNavigate('coupons'); onClose(); } },
    { id: 'reviews', title: 'Customer Reviews Moderation', subtitle: 'Product reviews & ratings', category: 'Navigation', icon: Star, action: () => { onNavigate('reviews'); onClose(); } },
    { id: 'banners', title: 'Banners & Announcements', subtitle: 'Homepage hero sliders', category: 'Navigation', icon: Image, action: () => { onNavigate('banners'); onClose(); } },
    { id: 'staff', title: 'Staff & Team Permissions', subtitle: 'User roles & access', category: 'Navigation', icon: Shield, action: () => { onNavigate('staff'); onClose(); } },
    { id: 'settings', title: 'Store Settings', subtitle: 'Store configuration & APIs', category: 'Navigation', icon: Settings, action: () => { onNavigate('settings'); onClose(); } },
  ], [onNavigate, onClose]);

  // Filtered results
  const filteredResults = useMemo<CommandItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return navCommands.slice(0, 8);
    }

    const results: CommandItem[] = [];

    // 1. Navigation Matches
    navCommands.forEach((cmd) => {
      if (cmd.title.toLowerCase().includes(q) || (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))) {
        results.push(cmd);
      }
    });

    // 2. Orders Matches
    orders.forEach((o) => {
      const ordNum = (o.order_number || '').toLowerCase();
      const custName = (o.customer_name || '').toLowerCase();
      const phone = (o.customer_phone || '').toLowerCase();

      if (ordNum.includes(q) || custName.includes(q) || phone.includes(q)) {
        results.push({
          id: `order_${o.id}`,
          title: `Order #${o.order_number}`,
          subtitle: `${o.customer_name || 'Buyer'} • ₹${Math.round((o.total_amount || 0) / 100).toLocaleString('en-IN')} • ${o.order_status || 'placed'}`,
          category: 'Orders',
          icon: ShoppingCart,
          action: () => {
            onNavigate('orders');
            onClose();
          },
        });
      }
    });

    // 3. Product Matches
    products.forEach((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();

      if (name.includes(q) || sku.includes(q) || cat.includes(q)) {
        results.push({
          id: `prod_${p.id}`,
          title: p.name,
          subtitle: `${p.sku || 'SKU'} • ${p.category || 'Footwear'} • ${p.stock || 0} in stock`,
          category: 'Products',
          icon: Package,
          action: () => {
            onNavigate('products');
            onClose();
          },
        });
      }
    });

    return results.slice(0, 10);
  }, [query, navCommands, orders, products, onNavigate, onClose]);

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % (filteredResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search orders, products, customers, navigation... (↑↓ to move, Enter to open)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-semibold placeholder:text-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No matching orders, products, or commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const Icon = item.icon || Package;
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Footer Helper */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>HeelsUp Global Command</span>
          <div className="flex items-center gap-2">
            <span>[↑↓] Navigate</span>
            <span>[↵] Open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
