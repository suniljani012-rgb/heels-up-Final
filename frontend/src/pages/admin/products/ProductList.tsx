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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Products Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage product styles with color variants, size grids, inventory, and pricing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTemplate}
            className="px-3 py-2 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV Template
          </button>
          <button
            onClick={onOpenBulk}
            className="px-3 py-2 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter & Pagination Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchText}
              placeholder="Search products by title, SKU..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {pagination.total} total items
          </span>
          <button
            disabled={pagination.page <= 1 || loading}
            onClick={() => goToPage(pagination.page - 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {pagination.page} / {Math.max(pagination.pages, 1)}
          </span>
          <button
            disabled={pagination.page >= pagination.pages || loading}
            onClick={() => goToPage(pagination.page + 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 rounded-xl p-4 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 w-14">Image</th>
                <th className="p-3.5">Style & Variant Name</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    {p.images && p.images.length > 0 ? (
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-700 flex items-center justify-center">
                        <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 font-bold font-mono text-[9px]">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{p.name}</h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mt-0.5">
                      {p.brand || 'HeelsUp'}
                      {p.color ? ` • ${p.color}` : ''}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">{p.sku}</td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400">{p.category}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    ₹{(p.price / 100).toFixed(0)}
                    {p.original_price && (
                      <span className="text-[10px] text-slate-400 line-through ml-2">
                        ₹{(p.original_price / 100).toFixed(0)}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        p.stock <= 5
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                      }`}
                    >
                      {p.stock} units
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Product"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDetail(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Product Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400 italic">
                    No products match the filter.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400 italic">
                    Loading products...
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