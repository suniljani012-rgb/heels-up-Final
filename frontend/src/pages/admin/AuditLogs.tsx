import { useState, useMemo } from 'react';
import { Activity, Search, Filter, Download, RefreshCw, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

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

export default function AuditLogs({ logs, loading, onRefresh }: AuditLogsProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const emailMatch = l.admin_email
        ? l.admin_email.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      const actionMatch = l.action
        ? l.action.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      const detailMatch = l.details
        ? l.details.toLowerCase().includes(searchQuery.toLowerCase())
        : false;

      const queryMatch = emailMatch || actionMatch || detailMatch;
      const filterMatch = selectedAction ? l.action === selectedAction : true;

      return queryMatch && filterMatch;
    });
  }, [logs, searchQuery, selectedAction]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const start = page * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page]);

  // Action options for filter
  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Admin Email', 'Action Category', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map((l) => [
        l.id,
        l.created_at,
        `"${String(l.admin_email || 'System').replace(/"/g, '""')}"`,
        `"${String(l.action || 'Unknown').replace(/"/g, '""')}"`,
        `"${String(l.details || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      'download',
      `heelsup_audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Audit Exported', 'CSV report successfully downloaded.');
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Audit Logs & Security Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable chronicle of administrative actions, catalog modifications, and login attempts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filteredLogs.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by admin email, action or details..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">All Actions</option>
              {actionOptions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Page {page + 1} of {Math.ceil(filteredLogs.length / pageSize) || 1}
          </span>
          <button
            disabled={(page + 1) * pageSize >= filteredLogs.length}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Retrieving audit log trail...</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 italic">
            No audit records match the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5 w-40">Timestamp</th>
                  <th className="p-3.5 w-48">Administrator</th>
                  <th className="p-3.5 w-40">Action Category</th>
                  <th className="p-3.5">Details & Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedLogs.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(l.created_at || Date.now()).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      {l.admin_email || 'System / Automated'}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
