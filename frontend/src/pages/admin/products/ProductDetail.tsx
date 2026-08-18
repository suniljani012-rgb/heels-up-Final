// frontend/src/pages/admin/products/ProductDetail.tsx
import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ArrowLeft, Edit3, Package, Layers } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { fetchProductDetail, type AdminProduct } from './productApi';
import type { Category } from '../types';
import ProductImages from './ProductImages';

interface ProductDetailProps {
  id: number;
  categories: Category[];
  token: string;
}

export default function ProductDetail({ id, categories, token }: ProductDetailProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await fetchProductDetail(token, id);
        setProduct(data);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to load product');
        setLoading(false);
        showToast('error', 'Load Failed', e?.message || 'Could not load product');
      }
    }
    loadProduct();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-500 text-xs font-semibold">Loading product specs...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-xs text-slate-500">{error || `Product #${id} could not be loaded.`}</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {product.name}
            </h2>
            <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
            Stock: {product.stock} units
          </span>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold border ${
              product.active
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {product.active ? 'Active' : 'Draft'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Product Images & Key Metrics */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Media Showcase
            </h4>
            <ProductImages
              images={(product.images || []).map((url) => ({ url, alt: '' }))}
              token={token}
              onChange={() => {}}
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Financial Matrix
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Selling Price</span>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  ₹{(product.price / 100).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">MRP Strike</span>
                <p className="text-base font-bold font-mono text-slate-500 mt-0.5">
                  {product.original_price ? `₹${(product.original_price / 100).toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Cost Price</span>
                <p className="text-base font-bold font-mono text-slate-500 mt-0.5">
                  {product.cost_price ? `₹${(product.cost_price / 100).toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock</span>
                <p className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {product.stock} units
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Specifications Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Catalog Specifications
            </h4>
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 font-bold text-slate-400 w-44">Category</td>
                  <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                    {product.category || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Brand</td>
                  <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                    {product.brand || 'HeelsUp'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Color Variant</td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{product.color || '—'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Material</td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{product.material || '—'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Heel Height</td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{product.heel_height || '—'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Width Option</td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{product.width_option || '—'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Description</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {product.description || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">SEO Meta Title</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {product.meta_title || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">SEO Meta Description</td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                    {product.meta_description || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}