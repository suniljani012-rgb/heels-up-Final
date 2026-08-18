import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  UserCheck,
  Users,
  Mail,
  Phone,
  ShoppingBag,
  MessageSquare,
  Crown,
  Sparkles,
  Download,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import type { Customer } from './types';

interface CustomersManagerProps {
  customers: Customer[];
  onToggleBlock: (cust: Customer) => void;
}

type CustomerSegment = 'all' | 'vip' | 'repeat' | 'new';

// Helper to get real customer name or clean name from email
export const getCustomerDisplayName = (cust: Customer): string => {
  if (cust.name && cust.name.trim().length > 0) {
    return cust.name.trim();
  }
  if (cust.full_name && cust.full_name.trim().length > 0) {
    return cust.full_name.trim();
  }
  const fromFirstLast = `${cust.first_name || ''} ${cust.last_name || ''}`.trim();
  if (fromFirstLast.length > 0) {
    return fromFirstLast;
  }
  // Clean readable name fallback from email handle
  if (cust.email) {
    const handle = cust.email.split('@')[0];
    const cleanWords = handle
      .replace(/[0-9]+/g, ' ')
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    if (cleanWords.length > 0) {
      return cleanWords.join(' ');
    }
  }
  return 'Customer';
};

export default function CustomersManager({ customers, onToggleBlock }: CustomersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [page, setPage] = useState(0);
  const itemsPerPage = 15;

  // Calculate Metrics
  const metrics = useMemo(() => {
    let vipCount = 0;
    let repeatCount = 0;
    let newCount = 0;
    let totalLtv = 0;

    customers.forEach((c) => {
      const spent = (c.total_spent || 0) / 100;
      const orders = c.orders_count ?? c.order_count ?? 0;
      totalLtv += spent;
      if (spent >= 5000) vipCount++;
      if (orders > 1) repeatCount++;
      if (orders <= 1) newCount++;
    });

    return {
      total: customers.length,
      vipCount,
      repeatCount,
      newCount,
      avgLtv: customers.length ? Math.round(totalLtv / customers.length) : 0,
    };
  }, [customers]);

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const term = searchQuery.toLowerCase().trim();
      const displayName = getCustomerDisplayName(c).toLowerCase();
      const matchesSearch =
        !term ||
        displayName.includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term);

      const spent = (c.total_spent || 0) / 100;
      const orders = c.orders_count ?? c.order_count ?? 0;
      let matchesSegment = true;
      if (activeSegment === 'vip') matchesSegment = spent >= 5000;
      else if (activeSegment === 'repeat') matchesSegment = orders > 1;
      else if (activeSegment === 'new') matchesSegment = orders <= 1;

      return matchesSearch && matchesSegment;
    });
  }, [customers, searchQuery, activeSegment]);

  const paginated = useMemo(() => {
    const start = page * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page]);

  // Export Customers CSV
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      showToast('error', 'Empty', 'No customers to export.');
      return;
    }

    const headers = ['Customer Name', 'Email', 'Phone', 'Orders Count', 'Total Spent (INR)', 'Blocked Status', 'Joined Date'];
    const rows = filtered.map((c) => {
      const orders = c.orders_count ?? c.order_count ?? 0;
      const isBlocked = c.is_blocked || c.is_active === 0 || c.is_active === false;
      return [
        `"${getCustomerDisplayName(c)}"`,
        c.email,
        c.phone || '',
        orders,
        ((c.total_spent || 0) / 100).toFixed(2),
        isBlocked ? 'BLOCKED' : 'ACTIVE',
        new Date(c.created_at).toLocaleDateString('en-IN'),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `heelsup_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Exported', `Exported ${filtered.length} customers to CSV.`);
  };

  return (
    <div className="space-y-3 antialiased font-sans">
      {/* ── 1. CUSTOMER METRIC CARDS (Shopify CRM Style) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Customers
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Registered client accounts</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            VIP Clients (≥₹5,000)
          </span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {metrics.vipCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">High lifetime value</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            Repeat Buyers
          </span>
          <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.repeatCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">&gt; 1 order placed</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Average Customer LTV
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{metrics.avgLtv.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Per customer spend</span>
        </Card>
      </div>

      {/* ── 2. SEGMENT TABS & SEARCH BAR ─────────────────────────────── */}
      <Card className="p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Segment Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all', label: 'All Customers', count: metrics.total },
              { id: 'vip', label: 'VIP (High LTV)', count: metrics.vipCount },
              { id: 'repeat', label: 'Repeat Buyers', count: metrics.repeatCount },
              { id: 'new', label: 'New / First-Time', count: metrics.newCount },
            ].map((tab) => {
              const active = activeSegment === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSegment(tab.id as CustomerSegment);
                    setPage(0);
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-7 px-2.5 text-xs font-semibold"
          >
            <Download className="w-3 h-3 mr-1" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
            Showing <strong>{filtered.length}</strong> of {customers.length} customers
          </span>
        </div>
      </Card>

      {/* ── 3. SHOPIFY-STYLE CUSTOMERS TABLE ─────────────────────────── */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
              <TableHead className="w-[280px]">Customer</TableHead>
              <TableHead className="w-[180px]">Contact</TableHead>
              <TableHead className="text-center w-28">Segment</TableHead>
              <TableHead className="text-center w-24">Orders</TableHead>
              <TableHead className="text-right w-28">Total Spent</TableHead>
              <TableHead className="text-right w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((cust) => {
              const spentInRupees = (cust.total_spent || 0) / 100;
              const ordersCount = cust.orders_count ?? cust.order_count ?? 0;
              const isVip = spentInRupees >= 5000;
              const isRepeat = ordersCount > 1;
              const fullName = getCustomerDisplayName(cust);
              const initial = fullName[0]?.toUpperCase() || 'C';
              const isBlocked = cust.is_blocked || cust.is_active === 0 || cust.is_active === false;

              return (
                <TableRow key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Customer Avatar & Real Name */}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {fullName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {cust.email || 'No email registered'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Phone & WhatsApp */}
                  <TableCell className="py-2.5">
                    {cust.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {cust.phone}
                        </span>
                        <a
                          href={`https://wa.me/91${cust.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(fullName)},%20greetings%20from%20HeelsUp!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No phone</span>
                    )}
                  </TableCell>

                  {/* Segment Badge */}
                  <TableCell className="text-center py-2.5">
                    {isVip ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Crown className="w-2.5 h-2.5" /> VIP
                      </span>
                    ) : isRepeat ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        Repeat
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        New
                      </span>
                    )}
                  </TableCell>

                  {/* Orders Count */}
                  <TableCell className="text-center py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {ordersCount}
                  </TableCell>

                  {/* Total Spent */}
                  <TableCell className="text-right py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    ₹{Math.round(spentInRupees).toLocaleString('en-IN')}
                  </TableCell>

                  {/* Block / Unblock Toggle */}
                  <TableCell className="text-right py-2.5">
                    <Button
                      size="sm"
                      variant={isBlocked ? 'destructive' : 'outline'}
                      onClick={() => onToggleBlock(cust)}
                      className="h-7 px-2 text-[11px] font-semibold"
                    >
                      {isBlocked ? 'Unblock' : 'Block'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs italic">
                  No customers found matching filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {filtered.length > itemsPerPage && (
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {Math.ceil(filtered.length / itemsPerPage)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * itemsPerPage >= filtered.length}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
