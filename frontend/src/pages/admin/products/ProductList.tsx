// frontend/src/pages/admin/products/ProductList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, Trash2, Edit3, ChevronLeft, ChevronRight, Download, FileText, AlertTriangle, Info } from 'lucide-react';
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

export default function ProductList({ categories, token, onAdd, onEdit, onOpenBulk, onChanged }: ProductListProps) {
  const showToast = useToastStore((state) => state.showToast);
  const { data, pagination, loading, error, reload, goToPage, setSearch, setCategory } = useProducts({ token, pageSize: 12 });
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const [categorySel, setCategorySel] = useState('');

  useEffect(() => { searchRef.current?.focus(); }, []);

  const handleSearch = (q: string) => { setSearchText(q); setSearch(q); };
  const handleCategory = (c: string) => { setCategorySel(c); setCategory(c); };

  const handleDelete = async (p: AdminProduct) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    try {
      const result = await deleteProduct(token, p.id);
      showToast('success', 'Deleted', result.soft_deleted ? 'Product deactivated (has order history).' : 'Product removed successfully.');
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
    <div className="space-y-6 text-neutral-900 animate-fade-in">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-neutral-900 font-display italic">Products Catalog</h1>
            <p className="text-xs text-neutral-500">Manage product styles with color, material, sizing and pricing</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleTemplate}
              className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all">
              <Download className="w-3.5 h-3.5" /> CSV Template
            </button>
            <button onClick={onOpenBulk}
              className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all">
              <FileText className="w-3.5 h-3.5" /> Bulk Import
            </button>
            <button onClick={onAdd}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input ref={searchRef} type="text" value={searchText} placeholder="Search by name, SKU..."
                onChange={e => handleSearch(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none" />
            </div>
            <select value={categorySel} onChange={e => handleCategory(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <span className="text-neutral-400">{pagination.total} products</span>
            <button disabled={pagination.page <= 1 || loading} onClick={() => goToPage(pagination.page - 1)}
              className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{pagination.page} / {Math.max(pagination.pages, 1)}</span>
            <button disabled={pagination.page >= pagination.pages || loading} onClick={() => goToPage(pagination.page + 1)}
              className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono uppercase tracking-widest text-[10px]">
                <th className="p-4 w-14">Image</th>
                <th className="p-4">Style & Variant Name</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map(p => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-4">
                    {p.images && p.images.length > 0 ? (
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 flex items-center justify-center">
                        <HeicImage src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 font-bold font-mono text-[8px]">N/A</div>
                    )}
                  </td>
                  <td className="p-4">
                    <h4 className="font-semibold text-neutral-900">{p.name}</h4>
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-mono block mt-0.5">
                      {p.brand || 'HeelsUp'}{p.color ? ` · ${p.color}` : ''}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-neutral-700 font-semibold">{p.sku}</td>
                  <td className="p-4 text-neutral-500">{p.category}</td>
                  <td className="p-4 font-mono font-bold text-neutral-900">
                    ₹{(p.price / 100).toFixed(0)}
                    {p.original_price && <span className="text-[10px] text-neutral-400 line-through ml-2">₹{(p.original_price / 100).toFixed(0)}</span>}
                  </td>
                  <td className="p-4 font-mono">
                    <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${p.stock <= 5 ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.active ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-neutral-100 border border-neutral-200 text-neutral-500'}`}>
                      {p.active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(p)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDetail(p)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="p-1.5 bg-neutral-100 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan={8} className="py-24 text-center text-neutral-400 italic font-mono">No products match the filter.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={8} className="py-24 text-center text-neutral-400 italic font-mono">Loading products...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}