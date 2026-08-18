import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, Tag, Percent, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  used_count: number;
  active: boolean;
  expires_at?: string;
  description?: string;
}

interface CouponsManagerProps {
  coupons: Coupon[];
  token: string;
  onRefresh: () => void;
}

export default function CouponsManager({ coupons, token, onRefresh }: CouponsManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');

  // Filter coupons
  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open add
  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setCode('');
    setType('percentage');
    setValue('');
    setMinOrder('0');
    setMaxDiscount('');
    setMaxUses('');
    setActive(true);
    setExpiresAt('');
    setDescription('');
    setDrawerOpen(true);
  };

  // Open edit
  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setType(c.type);
    setValue(c.value.toString());
    setMinOrder(c.min_order.toString());
    setMaxDiscount(c.max_discount ? c.max_discount.toString() : '');
    setMaxUses(c.max_uses ? c.max_uses.toString() : '');
    setActive(c.active);
    setExpiresAt(c.expires_at ? c.expires_at.split(' ')[0] : '');
    setDescription(c.description || '');
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value) {
      showToast('error', 'Missing Fields', 'Coupon Code and Value are required.');
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      type,
      value: parseFloat(value),
      min_order: parseFloat(minOrder || '0'),
      max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      active,
      expires_at: expiresAt ? expiresAt + ' 23:59:59' : null,
      description: description.trim(),
    };

    try {
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Promo Code Saved', `Promo Code '${code}' recorded.`);
        setDrawerOpen(false);
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to coupon service.');
    }
  };

  // Delete coupon
  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this promo code? Usage histories for completed orders will remain in the database.'
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Promo Code Purged', 'Promo Code removed successfully.');
        onRefresh();
      } else {
        showToast('error', 'Delete Denied', data.error || 'Access denied.');
      }
    } catch {
      showToast('error', 'Sync Failure', 'Failed to submit delete query.');
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Promo Coupons & Marketing Discounts
          </CardTitle>
          <CardDescription>
            Configure promotional vouchers, influencer discount codes, and minimum order rules
          </CardDescription>
        </div>

        <Button onClick={handleOpenAdd} className="text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" /> Add Promo Code
        </Button>
      </Card>

      {/* Filter Row */}
      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promo codes by voucher code..."
            className="pl-9 text-xs font-mono"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filtered.length} promo codes registered
        </span>
      </Card>

      {/* Coupons Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher Code</TableHead>
              <TableHead>Benefit Type</TableHead>
              <TableHead>Discount Value</TableHead>
              <TableHead>Min Spend Threshold</TableHead>
              <TableHead>Usage Counter</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                    {c.code}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {c.type === 'percentage' ? '% Percentage' : '₹ Fixed Flat'}
                  </Badge>
                </TableCell>

                <TableCell className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                  {c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                  {c.max_discount ? (
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Capped at ₹{c.max_discount}
                    </span>
                  ) : null}
                </TableCell>

                <TableCell className="font-mono text-slate-600 dark:text-slate-300 text-xs">
                  {c.min_order > 0 ? `₹${c.min_order}` : 'No Min Limit'}
                </TableCell>

                <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">{c.used_count}</span>
                  {c.max_uses ? ` / ${c.max_uses}` : ' / ∞'}
                </TableCell>

                <TableCell className="text-slate-500 font-mono text-[11px]">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                </TableCell>

                <TableCell>
                  <Badge variant={c.active ? 'success' : 'outline'}>
                    {c.active ? 'Active' : 'Disabled'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(c)}
                      title="Edit Coupon"
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(c.id)}
                      title="Delete Coupon"
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-20 text-center text-slate-400 italic">
                  No promo vouchers found matching search query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Slide-over Drawer using Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingCoupon ? 'Modify Promo Code' : 'Create Promo Code'}</SheetTitle>
            <SheetDescription>Configure discount logic and promotional thresholds</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
            <div>
              <Label className="mb-1">Promo Code Identifier *</Label>
              <Input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. FESTIVE20"
                className="font-mono text-xs uppercase font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Discount Type</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Flat Discount (₹)</option>
                </select>
              </div>

              <div>
                <Label className="mb-1">Discount Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'percentage' ? '20' : '500'}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Min Order Amount (₹)</Label>
                <Input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="0"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="mb-1">Max Discount Cap (₹)</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="Optional limit"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Total Max Usage Limit</Label>
                <Input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="mb-1">Expiration Date</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1">Visibility & Activation State</Label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
              >
                <option value="true">Active (Can be applied at checkout)</option>
                <option value="false">Inactive (Disabled / Paused)</option>
              </select>
            </div>

            <Button type="submit" className="w-full py-2.5 font-bold text-xs">
              Save Promo Configuration
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
