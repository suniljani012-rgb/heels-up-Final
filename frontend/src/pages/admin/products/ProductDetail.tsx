// frontend/src/pages/admin/products/ProductDetail.tsx
import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { fetchProductDetail, deleteProduct, type AdminProduct } from './productApi';
import type { Category } from '../types';
import ProductForm from './ProductForm';
import ProductImages from './ProductImages';

interface ProductDetailProps {
  id: number;
  categories: Category[];
  token: string;
}

export default function ProductDetail({ id, categories }: ProductDetailProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        <span className="ml-4 text-neutral-600">Loading product...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-[#0B1437] p-8">
        <AlertCircle className="w-6 h-6 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Product Not Found</h2>
        <p className="text-neutral-500">{error}</p>
        <button onClick={() => window.history.back()}, className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded">
          Go Back
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] dark:bg-[#0B1437] p-8">
        <AlertCircle className="w-6 h-6 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Product Not Found</h2>
        <p className="text-neutral-500">Product with id #{id} could not be loaded.</p>
        <button onClick={() => window.history.back()}, className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-[#0B1437] p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">
          Product #{product.id}: {product.name}
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Stock: {product.stock} units</span>
          {product.active ? (
            <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-50 text-emerald-700 font-mono">Active</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[9px] bg-rose-50 text-rose-600 font-mono">Draft</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product details and images */}
        <div className="space-y-4">
          <ProductImages
            images={product.images || []}
            token=""
            onChange={(_images) => {
              showToast('info', 'Update', 'Image changes not supported in detail view');
            }}
          />

          {/* Key product stats */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">Product Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-sm">
              <div>
                <div className="font-medium">Price</div>
                <div>₹{(product.price / 100).toFixed(0)}</div>
              </div>
              <div>
                <div className="font-medium">MRP</div>
                {product.original_price && <div>₹{(product.original_price / 100).toFixed(0)}</div>}
              </div>
              <div>
                <div className="font-medium">SKU</div>
                <div className="font-mono capitalize">{product.sku}</div>
              </div>
              <div>
                <div className="font-medium">Category</div>
                <div>{product.category || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Product info table */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Basic Info</div>
            <table className="w-full text-left border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="p-2 font-bold text-neutral-500 w-40">Name</td>
                  <td className="p-2">{product.name}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">SKU</td>
                  <td className="p-2 font-mono capitalize">{product.sku}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Brand</td>
                  <td className="p-2">{product.brand || 'HeelsUp'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Category</td>
                  <td className="p-2">{product.category || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Description</td>
                  <td className="p-2">{product.description?.substring(0, 100) || '—'}{product.description && product.description.length > 100 ? '...' : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Pricing & Stock</div>
            <table className="w-full text-left border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Price (₹)</td>
                  <td className="p-2">₹{(product.price / 100).toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">MRP (₹)</td>
                  {product.original_price ? (
                    <td className="p-2">₹{(product.original_price / 100).toFixed(0)}</td>
                  ) : (
                    <td className="p-2 text-neutral-500">—</td>
                  )}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Cost Price (₹)</td>
                  {product.cost_price ? (
                    <td className="p-2">₹{(product.cost_price / 100).toFixed(0)}</td>
                  ) : (
                    <td className="p-2 text-neutral-500">—</td>
                  )}
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Stock</td>
                  <td className="p-2 font-mono">{product.stock} units</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Active</td>
                  <td className="p-2">
                    {product.active
                      ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-mono">Active</span>'
                      : '<span class="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-mono">Draft</span>'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Featured</td>
                  <td className="p-2">
                    {product.featured
                      ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-mono">Yes</span>'
                      : '<span class="px-2 py-0.5 rounded bg-neutral-200 text-neutral-500 text-[9px] font-mono">No</span>'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">SEO & Metadata</div>
            <table className="w-full text-left border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Meta Title</td>
                  <td className="p-2">{product.meta_title || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Meta Description</td>
                  <td className="p-2">{product.meta_description || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">SEO Keywords</td>
                  <td className="p-2">{product.seo_keywords || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Color</td>
                  <td className="p-2">{product.color || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Material</td>
                  <td className="p-2">{product.material || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Heel Height</td>
                  <td className="p-2">{product.heel_height || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-neutral-500">Width Option</td>
                  <td className="p-2">{product.width_option || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {editing ? (
            <div className="mt-4">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-sm mr-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-neutral-900 text-white text-sm"
              >
                Edit Product
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-neutral-900 text-white text-sm"
              >
                Edit Product
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}