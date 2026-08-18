import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Edit3, Trash2, X, Search, Tag, Percent, Calendar } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Promo Coupons & Marketing Discounts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create promotional coupon codes, percentage discounts, flat credits, and minimum spend limits
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Promo Code
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promo codes..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {filtered.length} coupons
        </span>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Coupon Code</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Value</th>
                <th className="p-3.5">Min Spend</th>
                <th className="p-3.5">Uses Limit</th>
                <th className="p-3.5">Expires</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                      {c.code}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400 capitalize">{c.type}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    {c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value}`}
                  </td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                    ₹{c.min_order.toFixed(0)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {c.used_count} / {c.max_uses || '∞'}
                  </td>
                  <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                    {c.expires_at ? c.expires_at.split(' ')[0] : 'Never'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        c.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {c.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400 italic">
                    No promo codes match criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingCoupon ? 'Modify Promo Code' : 'Create Promo Code'}
                </h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. JODHPUR50"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Price (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={type === 'percentage' ? '15' : '500'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Min Spend Required (₹)
                    </label>
                    <input
                      type="number"
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Max Discount Cap (₹)
                    </label>
                    <input
                      type="number"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      placeholder="500"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Max Uses Limit
                    </label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="100"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Campaign Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 15% off Oxford Jodhpurs on orders above 3999"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Promo Code Active & Redeemable
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Save Promo Code
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
