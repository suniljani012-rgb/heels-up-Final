import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Search, ChevronLeft, ChevronRight, UserMinus, UserCheck, Users, Mail, Phone, ShoppingBag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';

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
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Customer Directory & Accounts
          </CardTitle>
          <CardDescription>
            Moderate customer accounts, monitor spending lifetime value (LTV), and review purchase histories
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs">
            Total Accounts: {customers.length}
          </Badge>
        </div>
      </Card>

      {/* Filter Row */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search customers by name, email, phone..."
            className="pl-9 text-xs"
          />
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
            Page {page + 1} of {Math.ceil(filtered.length / itemsPerPage) || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * itemsPerPage >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-2"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      {/* Customer List Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Profile</TableHead>
              <TableHead>Email Contact</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-center">Lifetime Spend (LTV)</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-right">Account Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {c.first_name ? c.first_name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                        {c.first_name} {c.last_name || ''}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: #{c.id}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                  {c.email}
                </TableCell>

                <TableCell className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                  {c.phone || '—'}
                </TableCell>

                <TableCell className="text-center font-mono">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {c.orders_count || 0} orders
                  </Badge>
                </TableCell>

                <TableCell className="text-center font-mono font-bold text-slate-900 dark:text-white text-xs">
                  ₹{((c.total_spent || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </TableCell>

                <TableCell className="text-slate-500 font-mono text-[11px]">
                  {new Date(c.created_at).toLocaleDateString()}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={c.is_blocked ? 'outline' : 'ghost'}
                    onClick={() => onToggleBlock(c)}
                    className={`text-xs font-semibold h-7 ${
                      c.is_blocked
                        ? 'border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400'
                        : 'text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    {c.is_blocked ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> Unblock
                      </>
                    ) : (
                      <>
                        <UserMinus className="w-3.5 h-3.5 mr-1" /> Block
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center text-slate-400 italic">
                  No customer records found matching query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
