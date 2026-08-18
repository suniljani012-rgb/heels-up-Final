// frontend/src/pages/admin/products/ProductList.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  AlertTriangle,
  Info,
  Package,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import HeicImage from '../../../components/HeicImage';
import { deleteProduct, downloadCsvTemplate } from './productApi';
import { useProducts } from './useProducts';
import type { AdminProduct, Category } from './productTypes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../components/ui/table';

interface ProductListProps {
  categories: Category[];
  token: string;
  onAdd: () => void;
  onEdit: (product: AdminProduct) => void;
  onDetail: (product: AdminProduct) => void;
  onOpenBulk: () => void;
  onChanged: () => void;
}

export default function ProductList({
  categories,
  token,
  onAdd,
  onEdit,
  onDetail,
  onOpenBulk,
  onChanged
}: ProductListProps) {
  const showToast = useToastStore((state) => state.showToast);
  const { data, pagination, loading, error, reload, goToPage, setSearch, setCategory } = useProducts({
    token,
    pageSize: 12
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const [categorySel, setCategorySel] = useState('');

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleSearch = (q: string) => {
    setSearchText(q);
    setSearch(q);
  };
  const handleCategory = (c: string) => {
    setCategorySel(c);
    setCategory(c);
  };

  const handleDelete = async (p: AdminProduct) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    try {
      const result = await deleteProduct(token, p.id);
      showToast(
        'success',
        'Deleted',
        result.soft_deleted ? 'Product deactivated (has order history).' : 'Product removed successfully.'
      );
      reload();
      onChanged();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || 'Operation failed.');
    }
  };

  const handleTemplate = async () => {
    await downloadCsvTemplate();
    showToast('info', 'Template Downloaded', 'Use the downloaded template for bulk updates.');
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Products Catalog
          </CardTitle>
          <CardDescription>
            Manage product styles with color variants, size grids, inventory, and pricing
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTemplate} className="text-xs font-semibold">
            <Download className="w-3.5 h-3.5 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenBulk} className="text-xs font-semibold">
            <FileText className="w-3.5 h-3.5 mr-1" /> Bulk CSV
          </Button>
          <Button size="sm" onClick={onAdd} className="text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" /> Add Style
          </Button>
        </div>
      </Card>

      {/* Filter & Search Card */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchRef}
              type="text"
              value={searchText}
              placeholder="Search products by title, SKU..."
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={categorySel}
            onChange={(e) => handleCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> products
        </div>
      </Card>

      {/* Product List Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Style & SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => {
              const totalStock = (p.size_stock || []).reduce((sum, s) => sum + s.stock, 0) || p.stock;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <button
                          onClick={() => onDetail(p)}
                          className="font-semibold text-slate-900 dark:text-white text-xs hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>{p.sku}</span>
                          {p.color && (
                            <>
                              <span>•</span>
                              <span>{p.color}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-600 dark:text-slate-300 font-medium">
                    {p.category || '—'}
                  </TableCell>

                  <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{(p.price / 100).toFixed(2)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        totalStock === 0 ? 'destructive' : totalStock <= 5 ? 'warning' : 'success'
                      }
                      className="font-mono"
                    >
                      {totalStock} in stock
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={p.active ? 'success' : 'outline'}>
                      {p.active ? 'Active' : 'Draft'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(p)}
                        title="Edit Product"
                        className="text-slate-500 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p)}
                        title="Delete Product"
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {data.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400 italic">
                  No catalog products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}