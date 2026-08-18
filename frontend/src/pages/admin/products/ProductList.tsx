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
  Package,
  Eye
} from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import HeicImage from '../../../components/HeicImage';
import { deleteProduct, downloadCsvTemplate } from './productApi';
import { useProducts } from './useProducts';
import type { AdminProduct, Category } from './productTypes';
import { Card } from '../../../components/ui/card';
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
    pageSize: 15
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
    showToast('info', 'Template Downloaded', 'Use template for batch catalog sync.');
  };

  return (
    <div className="space-y-2.5 antialiased">
      {/* Unified Compact Control Bar */}
      <Card className="p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          <div className="flex items-center gap-1.5 mr-1">
            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Products</span>
            <span className="px-1.5 py-0 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {pagination.total}
            </span>
          </div>

          <div className="relative flex-1 max-w-xs min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchRef}
              type="text"
              value={searchText}
              placeholder="Filter title, SKU..."
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-7 text-xs"
            />
          </div>

          <select
            value={categorySel}
            onChange={(e) => handleCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none h-7"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleTemplate} className="h-7 text-xs px-2 font-medium">
            <Download className="w-3 h-3 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenBulk} className="h-7 text-xs px-2 font-medium">
            <FileText className="w-3 h-3 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={onAdd} className="h-7 text-xs px-2.5 font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
          </Button>
        </div>
      </Card>

      {/* Product List Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[320px]">Product / Style</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock (EU/UK)</TableHead>
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
                    <div className="flex items-center gap-2.5">
                      {p.images?.[0] ? (
                        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <button
                          onClick={() => onDetail(p)}
                          className="font-semibold text-slate-900 dark:text-white text-xs hover:text-indigo-600 dark:hover:text-indigo-400 text-left truncate block max-w-[220px]"
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
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

                  <TableCell>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.category || 'Footwear'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="font-mono text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{(p.price / 100).toFixed(0)}
                      </span>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-[10px] text-slate-400 line-through ml-1.5">
                          ₹{(p.original_price / 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={totalStock <= 0 ? 'destructive' : totalStock <= 5 ? 'warning' : 'success'}
                        className="px-1.5 py-0 text-[10px] font-mono"
                      >
                        {totalStock} in stock
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={p.active ? 'success' : 'outline'} className="text-[10px] px-1.5 py-0">
                      {p.active ? 'Active' : 'Draft'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDetail(p)}
                        className="h-6 w-6 text-slate-500 hover:text-indigo-600"
                        title="Quick View Specs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(p)}
                        className="h-6 w-6 text-slate-500 hover:text-indigo-600"
                        title="Edit Style"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p)}
                        className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {data.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                  No products found matching query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Compact Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 text-xs">
            <span className="text-[11px] text-slate-500">
              Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
                className="h-6 w-6 p-0"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => goToPage(pagination.page + 1)}
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}