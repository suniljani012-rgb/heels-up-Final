import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Search, ChevronLeft, ChevronRight, UserMinus, UserCheck, Users, Mail, Phone, ShoppingBag } from 'lucide-react';

interface Customer {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
  is_blocked: boolean;
}

interface CustomersManagerProps {
  customers: Customer[];
  onToggleBlock: (cust: Customer) => void;
}

export default function CustomersManager({ customers, onToggleBlock }: CustomersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const itemsPerPage = 15;

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const term = searchQuery.toLowerCase();
      return (
        (c.first_name || '').toLowerCase().includes(term) ||
        (c.last_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term)
      );
    });
  }, [customers, searchQuery]);

  const paginated = useMemo(() => {
    const start = page * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page]);

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Customer Directory & Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Moderate customer accounts, monitor spending lifetime value (LTV), and review purchase histories
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Total Accounts: {customers.length}
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search customers by name, email, phone..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Page {page + 1} of {Math.ceil(filtered.length / itemsPerPage) || 1}
          </span>
          <button
            disabled={(page + 1) * itemsPerPage >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5 text-center">Orders</th>
                <th className="p-3.5 text-center">Lifetime Spend</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginated.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {c.first_name ? c.first_name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {c.first_name} {c.last_name || ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: #{c.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{c.email}</td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{c.phone || '—'}</td>
                  <td className="p-3.5 text-center font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {c.orders_count || 0} orders
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                    ₹{((c.total_spent || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {new Date(c.created_at || Date.now()).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleBlock(c)}
                      className={`px-3 py-1.5 font-bold uppercase rounded-xl text-[10px] inline-flex items-center gap-1.5 tracking-wider transition-colors border ${
                        c.is_blocked
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      {c.is_blocked ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Unblock
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-3.5 h-3.5" /> Block
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 italic">
                    No customer profiles match criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
