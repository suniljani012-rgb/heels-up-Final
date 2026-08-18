import { useToastStore } from '../../store/useToastStore';
import { useState, useMemo } from 'react';
import { RotateCw, Search, Eye, RefreshCw, X, Phone, Mail, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_type: 'refund' | 'exchange';
  reason: string;
  items: string; // JSON string representing array of items
  status: 'pending' | 'approved' | 'received' | 'completed' | 'rejected';
  action_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnsManagerProps {
  returns: ReturnRequest[];
  onRefresh: () => void;
}

export default function ReturnsManager({ returns, onRefresh }: ReturnsManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Return Details Drawer
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filter returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const term = searchQuery.toLowerCase();
      const matchSearch =
        r.order_number?.toLowerCase().includes(term) ||
        r.customer_name?.toLowerCase().includes(term) ||
        r.customer_phone?.toLowerCase().includes(term) ||
        r.reason?.toLowerCase().includes(term);

      const matchStatus = filterStatus ? r.status === filterStatus : true;
      return matchSearch && matchStatus;
    });
  }, [returns, searchQuery, filterStatus]);

  // Parse items from JSON
  const parseItems = (itemsJson: string): any[] => {
    try {
      return JSON.parse(itemsJson || '[]');
    } catch {
      return [];
    }
  };

  // Status transitions handler
  const handleUpdateStatus = async (status: 'approved' | 'received' | 'completed' | 'rejected') => {
    if (!selectedReturn) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/returns/${selectedReturn.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('heelsup_token')}`,
        },
        body: JSON.stringify({
          status,
          admin_note: actionNotes.trim(),
          admin_notes: actionNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          'Status Updated',
          `Return request #${selectedReturn.order_number} marked as ${status}.`
        );
        setSelectedReturn(null);
        setActionNotes('');
        onRefresh();
      } else {
        showToast('error', 'Update Failed', data.error || 'Database transaction error.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not save return status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openReturnDrawer = (ret: ReturnRequest) => {
    setSelectedReturn(ret);
    setActionNotes(ret.action_notes || '');
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Exchanges & Returns Pipeline
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track customer size exchange claims, inspect return conditions, and process refunds
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
          title="Refresh Returns"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, customer phone, reason..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Filter:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">All Claims</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="received">Items Received</option>
              <option value="completed">Completed / Shipped</option>
              <option value="rejected">Rejected Claim</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {filteredReturns.length} claims
        </span>
      </div>

      {/* Claims List Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Order No</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Claim Type</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Filed Date</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredReturns.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {r.order_number}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{r.customer_name}</div>
                    <span className="text-[10px] text-slate-400 block font-mono">{r.customer_phone}</span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        r.return_type === 'exchange'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                      }`}
                    >
                      {r.return_type === 'exchange' ? '🔄 Exchange' : '💵 Refund'}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate text-[11px]">
                    {r.reason}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        r.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                          : r.status === 'approved'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60'
                          : r.status === 'received'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/60'
                          : r.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(r.created_at || Date.now()).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => openReturnDrawer(r)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 italic">
                    No return claims found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Review Drawer */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setSelectedReturn(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Return Request Review
                </h3>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order and Customer Contact Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                    ORDER #{selectedReturn.order_number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedReturn.created_at).toLocaleString()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                  {selectedReturn.customer_name}
                </h4>
                <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {selectedReturn.customer_phone}
                  </span>
                  {selectedReturn.customer_email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {selectedReturn.customer_email}
                    </span>
                  )}
                </div>
              </div>

              {/* Returning Items */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Returning Items Details
                </span>
                <div className="space-y-2">
                  {parseItems(selectedReturn.items).map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="text-slate-900 dark:text-white block font-semibold">
                          {it.product_name || 'HeelsUp Footwear'}
                        </span>
                        <span className="text-slate-400 text-[10px] font-mono">
                          Size: UK {it.size} | Qty: {it.quantity || 1}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{it.price ? (it.price / 100).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason card */}
              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl space-y-1">
                <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Claim Reason
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed italic">
                  "{selectedReturn.reason}"
                </p>
              </div>

              {/* Action Notes */}
              <div className="space-y-2 pt-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Internal Processing Notes
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Record package condition, replacement AWB tracking, or refund transaction ID..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Pipeline Buttons */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Action Pipeline
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReturn.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('approved')}
                        disabled={updatingStatus}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs"
                      >
                        Approve Claim
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('rejected')}
                        disabled={updatingStatus}
                        className="py-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-rose-100 transition-colors"
                      >
                        Reject Claim
                      </button>
                    </>
                  )}
                  {selectedReturn.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus('received')}
                      disabled={updatingStatus}
                      className="col-span-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs"
                    >
                      Confirm Items Received in Hub
                    </button>
                  )}
                  {selectedReturn.status === 'received' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updatingStatus}
                      className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs"
                    >
                      {selectedReturn.return_type === 'exchange'
                        ? 'Dispatch Replacement Pair'
                        : 'Issue Net Bank Refund'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedReturn(null)}
              className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs uppercase transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
