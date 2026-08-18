import { useState, useMemo } from 'react';
import { Activity, Search, Filter, Download, RefreshCw, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';

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
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Audit Logs & Security Trail
          </CardTitle>
          <CardDescription>
            Immutable chronicle of administrative actions, catalog modifications, and login attempts
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {filteredLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Refresh Logs"
            className="h-8 w-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Filter Row */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by admin email, action or details..."
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(0);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Action Types</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 px-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Page {page + 1} of {Math.ceil(filteredLogs.length / pageSize) || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * pageSize >= filteredLogs.length}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-2"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Timestamp</TableHead>
              <TableHead className="w-56">Admin Account</TableHead>
              <TableHead className="w-44">Action Event</TableHead>
              <TableHead>Audit Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>

                <TableCell>
                  <span className="font-mono text-slate-900 dark:text-white text-xs font-semibold">
                    {l.admin_email || 'System'}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {l.action}
                  </Badge>
                </TableCell>

                <TableCell className="text-slate-600 dark:text-slate-300 text-xs font-mono break-all">
                  {l.details || '—'}
                </TableCell>
              </TableRow>
            ))}

            {paginatedLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-20 text-center text-slate-400 italic">
                  No security audit trail logs found matching search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
