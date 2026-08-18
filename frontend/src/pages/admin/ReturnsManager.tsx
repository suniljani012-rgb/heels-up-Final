import { useToastStore } from '../../store/useToastStore';
import { useState, useMemo } from 'react';
import { RotateCw, Search, Eye, RefreshCw, X, Phone, Mail, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

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
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Exchanges & Returns Pipeline
          </CardTitle>
          <CardDescription>
            Track customer size exchange claims, inspect return conditions, and process refunds
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Pipeline
        </Button>
      </Card>

      {/* Search and Filters Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, customer phone, reason..."
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Claims</option>
            <option value="approved">Approved For Return</option>
            <option value="received">Parcel Received</option>
            <option value="completed">Completed & Settled</option>
            <option value="rejected">Rejected Claims</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredReturns.length} return claims
        </span>
      </Card>

      {/* Returns Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Reference</TableHead>
              <TableHead>Customer Details</TableHead>
              <TableHead>Claim Type</TableHead>
              <TableHead>Claim Reason</TableHead>
              <TableHead>Claimed Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReturns.map((ret) => (
              <TableRow key={ret.id}>
                <TableCell className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  #{ret.order_number}
                </TableCell>

                <TableCell>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">{ret.customer_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{ret.customer_phone}</div>
                </TableCell>

                <TableCell>
                  <Badge variant={ret.return_type === 'exchange' ? 'info' : 'secondary'} className="capitalize">
                    {ret.return_type}
                  </Badge>
                </TableCell>

                <TableCell className="text-slate-600 dark:text-slate-300 max-w-xs truncate text-xs">
                  {ret.reason || 'Size mismatch'}
                </TableCell>

                <TableCell className="text-slate-500 font-mono text-[11px]">
                  {new Date(ret.created_at).toLocaleDateString()}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      ret.status === 'completed'
                        ? 'success'
                        : ret.status === 'approved'
                        ? 'info'
                        : ret.status === 'rejected'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {ret.status}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openReturnDrawer(ret)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 h-7"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Review Claim
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredReturns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center text-slate-400 italic">
                  No return or exchange claims found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Slide-over Drawer using Sheet */}
      <Sheet open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
        {selectedReturn && (
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Claim #{selectedReturn.order_number}</SheetTitle>
              <SheetDescription>
                {selectedReturn.return_type.toUpperCase()} Request filed on{' '}
                {new Date(selectedReturn.created_at).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 my-4 text-xs">
              {/* Customer Contact Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Contact
                </span>
                <p className="font-semibold text-slate-900 dark:text-white text-xs">{selectedReturn.customer_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{selectedReturn.customer_phone}</p>
              </div>

              {/* Claim Description & Reason */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Reason for Claim
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {selectedReturn.reason || 'No description provided.'}
                </p>
              </div>

              {/* Items in Claim */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Claimed Products
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {parseItems(selectedReturn.items).map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{it.product_name || 'Footwear Style'}</p>
                        <Badge variant="outline" className="text-[9px] font-mono mt-1">
                          Size: {it.size}
                        </Badge>
                      </div>
                      <span className="font-mono text-slate-500 font-bold">Qty: {it.quantity || 1}</span>
                    </div>
                  ))}
                  {parseItems(selectedReturn.items).length === 0 && (
                    <div className="p-3 text-slate-400 italic">Entire Order Package</div>
                  )}
                </div>
              </div>

              {/* Merchant / Admin Resolution Notes */}
              <div>
                <Label className="mb-1">Merchant Resolution Notes</Label>
                <Textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Notes on return parcel condition, courier pickup, or exchange dispatch..."
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Resolution Decision
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={updatingStatus}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Approve Return
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updatingStatus}
                    className="text-xs font-bold"
                  >
                    Reject Claim
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('received')}
                    disabled={updatingStatus}
                    className="text-xs font-bold"
                  >
                    Parcel Received
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updatingStatus}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Mark Settled
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
