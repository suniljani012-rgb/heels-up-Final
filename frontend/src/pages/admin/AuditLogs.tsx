import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Bug,
  Globe,
  Smartphone,
  Laptop
} from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { getStoredActivities, type ActivityEvent } from '../../utils/activityTracker';

export interface AuditLog {
  id: number;
  action: string;
  admin_email?: string;
  details: string;
  created_at: string;
}

interface AuditLogsProps {
  logs: AuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export default function AuditLogs({ logs = [], loading, onRefresh }: AuditLogsProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'browsing' | 'errors' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Real-time visitor activity telemetry events from localStorage + backend
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // Load local visitor telemetry activities
    const localActs = getStoredActivities();

    // Map backend database audit logs into uniform ActivityEvent structure
    const backendActs: ActivityEvent[] = logs.map((l) => ({
      id: `backend_${l.id}`,
      session_id: 'ses_admin_portal',
      timestamp: l.created_at || new Date().toISOString(),
      type: 'ADMIN',
      title: `Admin: ${l.action || 'Settings Update'}`,
      description: l.details || 'Administrative configuration changed.',
      user_name: l.admin_email?.split('@')[0] || 'Admin',
      url: '/admin',
      severity: 'info',
    }));

    // Merge and sort newest first
    const merged = [...localActs, ...backendActs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    setActivities(unique);
  }, [logs]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Tab filter
      let matchesTab = true;
      if (activeTab === 'orders') matchesTab = act.type === 'ORDER' || act.type === 'PAYMENT' || act.type === 'CHECKOUT';
      else if (activeTab === 'browsing') matchesTab = act.type === 'PRODUCT_VIEW' || act.type === 'PAGE_VIEW' || act.type === 'CART' || act.type === 'SEARCH';
      else if (activeTab === 'errors') matchesTab = act.type === 'ERROR';
      else if (activeTab === 'admin') matchesTab = act.type === 'ADMIN';

      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        (act.user_name && act.user_name.toLowerCase().includes(q)) ||
        (act.user_phone && act.user_phone.includes(q)) ||
        (act.session_id && act.session_id.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [activities, activeTab, searchQuery]);

  // Paginated activities
  const paginatedActivities = useMemo(() => {
    const start = page * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, page]);

  // Metrics summary
  const summary = useMemo(() => {
    return {
      total: activities.length,
      orders: activities.filter((a) => a.type === 'ORDER').length,
      browsing: activities.filter((a) => a.type === 'PRODUCT_VIEW' || a.type === 'CART').length,
      errors: activities.filter((a) => a.type === 'ERROR').length,
      admin: activities.filter((a) => a.type === 'ADMIN').length,
    };
  }, [activities]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredActivities.length === 0) return;
    const headers = ['Timestamp', 'Session ID', 'Category', 'Title', 'Customer Name', 'Phone', 'Page URL', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredActivities.map((a) => [
        a.timestamp,
        `"${a.session_id}"`,
        a.type,
        `"${a.title.replace(/"/g, '""')}"`,
        `"${(a.user_name || 'Visitor').replace(/"/g, '""')}"`,
        a.user_phone || '',
        `"${a.url || ''}"`,
        `"${a.description.replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `heelsup_visitor_activity_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', `Exported ${filteredActivities.length} activity records.`);
  };

  const getEventBadge = (type: ActivityEvent['type'], severity?: string) => {
    switch (type) {
      case 'ORDER':
        return <Badge variant="success" className="font-mono text-[10px] uppercase font-bold">🛒 Order Placed</Badge>;
      case 'PAYMENT':
        return <Badge variant="success" className="font-mono text-[10px] uppercase font-bold">💳 10% Advance</Badge>;
      case 'CHECKOUT':
        return <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold">📦 Checkout</Badge>;
      case 'CART':
        return <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold">🛍️ Bag Action</Badge>;
      case 'PRODUCT_VIEW':
        return <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200">👠 Viewed Product</Badge>;
      case 'PAGE_VIEW':
        return <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">🌐 Visited Page</Badge>;
      case 'SEARCH':
        return <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">🔍 Searched</Badge>;
      case 'ERROR':
        return <Badge variant="destructive" className="font-mono text-[10px] uppercase font-bold">🚨 Bug / Issue</Badge>;
      case 'ADMIN':
        return <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold">⚙️ Admin Action</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-3.5 antialiased font-sans">
      {/* KPI Activity Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total User Actions</span>
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">{summary.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded user interactions</p>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Orders & Advance</span>
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.orders}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Completed order checkouts</p>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Products Browsed</span>
            <Eye className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{summary.browsing}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Style views & bag additions</p>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Errors & Warnings</span>
            <Bug className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">{summary.errors}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Automated issue telemetry</p>
        </Card>
      </div>

      {/* Control & Tab Filter Bar */}
      <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Action Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all', label: 'All Activity', count: summary.total },
              { id: 'orders', label: 'Orders & Payments', count: summary.orders },
              { id: 'browsing', label: 'Product Views & Cart', count: summary.browsing },
              { id: 'errors', label: 'Website Issues', count: summary.errors },
              { id: 'admin', label: 'Admin Actions', count: summary.admin },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setPage(0);
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search visitor, phone, order..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="h-7 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-56 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 border-slate-200 dark:border-slate-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Export
            </Button>

            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Activity Log"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Activity Stream Table */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="w-36">Time & Session</TableHead>
              <TableHead className="w-36">Event Type</TableHead>
              <TableHead className="min-w-[200px]">Customer / Action Summary</TableHead>
              <TableHead className="min-w-[250px]">Detailed Activity Description</TableHead>
              <TableHead className="text-right w-24">Page / Channel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActivities.map((act) => {
              const timeFormatted = new Date(act.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dateFormatted = new Date(act.timestamp).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <TableRow key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  {/* Time & Session */}
                  <TableCell className="py-2.5">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{timeFormatted}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{dateFormatted} • {act.session_id.slice(0, 12)}</p>
                    </div>
                  </TableCell>

                  {/* Event Type Badge */}
                  <TableCell className="py-2.5">
                    {getEventBadge(act.type, act.severity)}
                  </TableCell>

                  {/* Customer / Action Summary */}
                  <TableCell className="py-2.5">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        {act.title}
                      </p>
                      {act.user_name && (
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">👤 {act.user_name}</span>
                          {act.user_phone && (
                            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                              ({act.user_phone})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Detailed Description */}
                  <TableCell className="py-2.5">
                    <p className={`text-xs leading-relaxed ${act.type === 'ERROR' ? 'text-rose-600 dark:text-rose-400 font-mono text-[11px]' : 'text-slate-600 dark:text-slate-300'}`}>
                      {act.description}
                    </p>
                    {act.duration_seconds && act.duration_seconds > 0 && (
                      <span className="inline-block mt-1 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        ⏱️ Time Spent: {Math.floor(act.duration_seconds / 60)}m {act.duration_seconds % 60}s
                      </span>
                    )}
                  </TableCell>

                  {/* URL / Context */}
                  <TableCell className="py-2.5 text-right font-mono text-[11px] text-slate-400">
                    <span className="truncate max-w-[120px] inline-block" title={act.url}>
                      {act.url || '—'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}

            {paginatedActivities.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs italic">
                  No activity records found matching filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredActivities.length > pageSize && (
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {Math.ceil(filteredActivities.length / pageSize)}
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
                disabled={(page + 1) * pageSize >= filteredActivities.length}
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
