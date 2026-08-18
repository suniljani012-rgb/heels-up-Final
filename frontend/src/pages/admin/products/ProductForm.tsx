// frontend/src/pages/admin/products/ProductForm.tsx
import React, { useMemo, useState } from 'react';
import { X, Box, RefreshCw } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { createProduct, updateProduct } from './productApi';
import { validateProduct, toErrorMessage } from './productValidation';
import ProductImages, { type ManagedImage } from './ProductImages';
import type { AdminProduct, Category } from './productTypes';

const EU_SIZES = ['36', '37', '38', '39', '40', '41'];
const HEEL_HEIGHTS = ['Flat', 'Low (1-2")', 'Medium (2-3")', 'High (3-4")', 'Very High (4"+)'];
const WIDTH_OPTIONS = ['Standard', 'Narrow (B)', 'Wide (E)', 'Extra Wide (EE)', 'Extra Extra Wide (EEE)'];

type Tab = 'basic' | 'stock' | 'media' | 'seo';

interface FormState {
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: string;
  original_price: string;
  cost_price: string;
  color: string;
  material: string;
  heel_height: string;
  width_option: string;
  description: string;
  detailed_description: string;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  show_mrp: boolean;
  size_stock: { size_label: string; stock: number }[];
  images: ManagedImage[];
  tags: string[];
  meta_title: string;
  meta_description: string;
  seo_keywords: string;
  supplier_id: string;
}

interface ProductFormProps {
  product: AdminProduct | null;
  categories: Category[];
  token: string;
  onSaved: () => void;
  onCancel: () => void;
}

function emptyForm(): FormState {
  return {
    name: '',
    sku: '',
    category: '',
    brand: 'HeelsUp',
    price: '',
    original_price: '',
    cost_price: '',
    color: '',
    material: '',
    heel_height: '',
    width_option: '',
    description: '',
    detailed_description: '',
    active: true,
    featured: false,
    is_new: true,
    is_trending: false,
    show_mrp: true,
    size_stock: EU_SIZES.map(sz => ({ size_label: sz, stock: 0 })),
    images: [],
    tags: [],
    meta_title: '',
    meta_description: '',
    seo_keywords: '',
    supplier_id: '',
  };
}

function loadFromProduct(p: AdminProduct): FormState {
  const sizeMap = new Map((p.size_stock || []).map(s => [s.size_label, s.stock]));
  const altByUrl = new Map((p.image_records || []).map(r => [r.url, r.alt]));
  return {
    name: p.name,
    sku: p.sku,
    category: p.category,
    brand: p.brand || 'HeelsUp',
    price: (p.price / 100).toString(),
    original_price: p.original_price ? (p.original_price / 100).toString() : '',
    cost_price: p.cost_price != null ? (p.cost_price / 100).toString() : '',
    color: p.color || '',
    material: p.material || '',
    heel_height: p.heel_height || '',
    width_option: p.width_option || '',
    description: p.description || '',
    detailed_description: p.detailed_description || '',
    active: p.active,
    featured: p.featured,
    is_new: p.is_new,
    is_trending: p.is_trending,
    show_mrp: p.show_mrp,
    size_stock: EU_SIZES.map(sz => ({
      size_label: sz,
      stock: sizeMap.get(sz) ?? 0,
    })),
    images: (p.images || []).map(url => ({ url, alt: altByUrl.get(url) || '' })),
    tags: p.tags || [],
    meta_title: p.meta_title || '',
    meta_description: p.meta_description || '',
    seo_keywords: p.seo_keywords || '',
    supplier_id: p.supplier_id ? String(p.supplier_id) : '',
  };
}

export default function ProductForm({ product, categories, token, onSaved, onCancel }: ProductFormProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [form, setForm] = useState<FormState>(() => (product ? loadFromProduct(product) : emptyForm()));
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const totalStock = useMemo(() => form.size_stock.reduce((sum, s) => sum + (s.stock || 0), 0), [form.size_stock]);
  const profitMargin = useMemo(() => {
    const price = parseFloat(form.price) || 0;
    const cost = parseFloat(form.cost_price) || 0;
    if (price <= 0) return null;
    return Math.round(((price - cost) / price) * 100);
  }, [form.price, form.cost_price]);

  const handleStockChange = (label: string, stock: number) => {
    set({
      size_stock: form.size_stock.map(s => (s.size_label === label ? { ...s, stock: Math.max(0, stock) } : s)),
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set({ tags: [...form.tags, t] });
      setTagInput('');
    }
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      brand: form.brand.trim() || 'HeelsUp',
      price: Math.round((parseFloat(form.price) || 0) * 100),
      original_price: form.original_price ? Math.round((parseFloat(form.original_price) || 0) * 100) : null,
      cost_price: form.cost_price ? Math.round((parseFloat(form.cost_price) || 0) * 100) : null,
      color: form.color.trim(),
      material: form.material.trim(),
      heel_height: form.heel_height,
      width_option: form.width_option,
      description: form.description.trim(),
      detailed_description: form.detailed_description.trim(),
      active: form.active,
      featured: form.featured,
      is_new: form.is_new,
      is_trending: form.is_trending,
      show_mrp: form.show_mrp,
      size_stock: form.size_stock,
      stock: form.size_stock.reduce((sum, s) => sum + s.stock, 0),
      sizes: form.size_stock.filter(s => s.stock > 0).map(s => s.size_label),
      images: form.images.map((img, i) => ({ url: img.url, alt: img.alt, position: i })),
      tags: form.tags,
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      seo_keywords: form.seo_keywords.trim(),
      supplier_id: form.supplier_id ? parseInt(form.supplier_id, 10) : null,
    };

    const errors = validateProduct(payload);
    if (errors.length > 0) {
      showToast('error', 'Validation Failed', toErrorMessage(errors));
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await updateProduct(token, product.id, payload);
        showToast('success', 'Product Updated', `"${payload.name}" saved successfully.`);
      } else {
        await createProduct(token, payload);
        showToast('success', 'Product Created', `"${payload.name}" added to catalog.`);
      }
      onSaved();
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Server rejected changes.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none';
  const labelCls = 'block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div onClick={onCancel} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="w-full max-w-xl bg-white border-l border-neutral-200 shadow-2xl relative z-10 flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{product ? `Edit: ${product.name}` : 'Add New Product'}</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Total stock: <strong>{totalStock}</strong> units
              {profitMargin !== null && profitMargin !== undefined && (
                <span className="ml-2 font-mono">
                  Margin: <strong className={profitMargin < 0 ? 'text-rose-600' : profitMargin < 20 ? 'text-amber-600' : 'text-emerald-600'}>{profitMargin}%</strong>
                </span>
              )}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 shrink-0">
          {(['basic', 'stock', 'media', 'seo'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${activeTab === tab ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}>
              {tab === 'stock' && <Box className="w-3 h-3" />}
              {tab === 'basic' ? 'Basic Info' : tab === 'stock' ? 'Sizes & Stock' : tab === 'media' ? 'Images' : 'SEO'}
            </button>
          ))}
        </div>

        {/* Content */}
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {activeTab === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Style Name *</label>
                  <input required type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Oxford Double Strap" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>SKU *</label>
                  <input required type="text" value={form.sku} onChange={e => set({ sku: e.target.value })} placeholder="HU-OX-01-BLK" className={`${inputCls} font-mono`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={form.category} onChange={e => set({ category: e.target.value })} className={inputCls}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Brand</label>
                  <input type="text" value={form.brand} onChange={e => set({ brand: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Color</label>
                  <input type="text" value={form.color} onChange={e => set({ color: e.target.value })} placeholder="e.g. Black, Tan" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Material</label>
                  <input type="text" value={form.material} onChange={e => set({ material: e.target.value })} placeholder="e.g. Leather, Suede" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Supplier ID</label>
                  <input type="number" min={0} value={form.supplier_id} onChange={e => set({ supplier_id: e.target.value })} placeholder="Optional" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Heel Height</label>
                  <select value={form.heel_height} onChange={e => set({ heel_height: e.target.value })} className={inputCls}>
                    <option value="">Not specified</option>
                    {HEEL_HEIGHTS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Width Option</label>
                  <select value={form.width_option} onChange={e => set({ width_option: e.target.value })} className={inputCls}>
                    <option value="">Not specified</option>
                    {WIDTH_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Price (₹) *</label>
                  <input required type="number" step="0.01" min="0" value={form.price} onChange={e => set({ price: e.target.value })} placeholder="4999" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>MRP (Optional)</label>
                  <input type="number" step="0.01" min="0" value={form.original_price} onChange={e => set({ original_price: e.target.value })} placeholder="8999" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cost Price (Optional)</label>
                  <input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => set({ cost_price: e.target.value })} placeholder="2500" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Show MRP Badge</label>
                  <label className="relative inline-flex items-center cursor-pointer pt-2">
                    <input type="checkbox" checked={form.show_mrp} onChange={e => set({ show_mrp: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                    <span className="ml-2 text-neutral-600 text-[10px] font-semibold">{form.show_mrp ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-4 uppercase tracking-wider text-[9px] font-bold text-neutral-500">
                  {[
                    { label: 'Publish', value: form.active, setter: (v: boolean) => set({ active: v }) },
                    { label: 'Featured', value: form.featured, setter: (v: boolean) => set({ featured: v }) },
                    { label: 'New', value: form.is_new, setter: (v: boolean) => set({ is_new: v }) },
                    { label: 'Trending', value: form.is_trending, setter: (v: boolean) => set({ is_trending: v }) },
                  ].map(({ label, value, setter }) => (
                    <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} className="rounded border-neutral-300 w-3.5 h-3.5 accent-neutral-900" /> {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Short Description</label>
                <textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Describe design features, sole quality..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Detailed Description</label>
                <textarea rows={4} value={form.detailed_description} onChange={e => set({ detailed_description: e.target.value })} placeholder="Full description for product page..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Tags</label>
                <div className="flex flex-wrap items-center gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl min-h-[44px]">
                  {form.tags.map((tag, idx) => (
                    <span key={idx} className="bg-white border border-neutral-300 text-neutral-700 font-mono text-[9px] py-0.5 px-2 rounded-lg flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => set({ tags: form.tags.filter((_, i) => i !== idx) })} className="text-rose-400 font-black">×</button>
                    </span>
                  ))}
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag, Enter to add..." className="bg-transparent border-0 text-neutral-900 placeholder-neutral-400 focus:outline-none py-0.5 flex-1 min-w-[120px]" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">Per-Size Inventory (EU)</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Specify stock counts per EU size</p>
                </div>
                <span className="text-[11px] font-bold text-neutral-600 font-mono bg-neutral-100 px-3 py-1 rounded-lg">Total: {totalStock} units</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {EU_SIZES.map(sz => {
                  const row = form.size_stock.find(s => s.size_label === sz);
                  return (
                    <div key={sz} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-col justify-between items-center text-center">
                      <label className="block text-[10px] font-bold text-neutral-500 font-mono uppercase mb-1">EU {sz}</label>
                      <input
                        type="number" min={0}
                        value={row?.stock ?? 0}
                        onChange={e => handleStockChange(sz, parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-neutral-200 rounded-lg py-1.5 px-2 text-center text-neutral-900 font-semibold font-mono text-xs focus:outline-none focus:border-neutral-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500">Product Gallery</label>
              <ProductImages images={form.images} onChange={images => set({ images })} token={token} />
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">SEO parameters</h4>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-1">Meta Title</label>
                  <input type="text" value={form.meta_title} onChange={e => set({ meta_title: e.target.value })} placeholder="Premium Jodhpur Boots | HeelsUp" className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none" />
                  <p className="text-[9px] text-neutral-400 mt-1">{form.meta_title.length}/60 characters</p>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-1">Meta Description</label>
                  <textarea rows={3} value={form.meta_description} onChange={e => set({ meta_description: e.target.value })} placeholder="Buy premium hand-crafted jodhpur boots at HeelsUp..." className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none leading-relaxed" />
                  <p className="text-[9px] text-neutral-400 mt-1">{form.meta_description.length}/160 characters</p>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-1">SEO Keywords</label>
                  <input type="text" value={form.seo_keywords} onChange={e => set({ seo_keywords: e.target.value })} placeholder="jodhpur boots, premium leather, heels" className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none" />
                  <p className="text-[9px] text-neutral-400 mt-1">Comma-separated keywords</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 shrink-0 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {product ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}