// frontend/src/pages/admin/products/ProductForm.tsx
import React, { useMemo, useState } from 'react';
import { X, Box, RefreshCw, Sparkles, Image as ImageIcon, Search, Tag } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { createProduct, updateProduct } from './productApi';
import { validateProduct, toErrorMessage } from './productValidation';
import ProductImages, { type ManagedImage } from './ProductImages';
import type { AdminProduct, Category } from './productTypes';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../../components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

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
    size_stock: EU_SIZES.map((sz) => ({ size_label: sz, stock: 0 })),
    images: [],
    tags: [],
    meta_title: '',
    meta_description: '',
    seo_keywords: '',
    supplier_id: '',
  };
}

function loadFromProduct(p: AdminProduct): FormState {
  const sizeMap = new Map((p.size_stock || []).map((s) => [s.size_label, s.stock]));
  const altByUrl = new Map((p.image_records || []).map((r) => [r.url, r.alt]));
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
    size_stock: EU_SIZES.map((sz) => ({
      size_label: sz,
      stock: sizeMap.get(sz) ?? 0,
    })),
    images: (p.images || []).map((url) => ({ url, alt: altByUrl.get(url) || '' })),
    tags: p.tags || [],
    meta_title: p.meta_title || '',
    meta_description: p.meta_description || '',
    seo_keywords: p.seo_keywords || '',
    supplier_id: p.supplier_id ? String(p.supplier_id) : '',
  };
}

export default function ProductForm({
  product,
  categories,
  token,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [form, setForm] = useState<FormState>(() => (product ? loadFromProduct(product) : emptyForm()));
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const totalStock = useMemo(
    () => form.size_stock.reduce((sum, s) => sum + (s.stock || 0), 0),
    [form.size_stock]
  );
  const profitMargin = useMemo(() => {
    const price = parseFloat(form.price) || 0;
    const cost = parseFloat(form.cost_price) || 0;
    if (price <= 0) return null;
    return Math.round(((price - cost) / price) * 100);
  }, [form.price, form.cost_price]);

  const handleStockChange = (size: string, value: number) => {
    const validVal = Math.max(0, value);
    set({
      size_stock: form.size_stock.map((s) =>
        s.size_label === size ? { ...s, stock: validVal } : s
      ),
    });
  };

  const addTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!form.tags.includes(clean)) {
      set({ tags: [...form.tags, clean] });
    }
    setTagInput('');
  };

  const handleSave = async () => {
    const errors = validateProduct(form as any);
    if (errors.length > 0) {
      showToast('error', 'Validation Error', toErrorMessage(errors));
      return;
    }

    setSaving(true);
    try {
      const pricePaise = Math.round(parseFloat(form.price) * 100);
      const origPaise = form.original_price ? Math.round(parseFloat(form.original_price) * 100) : null;
      const costPaise = form.cost_price ? Math.round(parseFloat(form.cost_price) * 100) : null;

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        brand: form.brand.trim() || 'HeelsUp',
        price: pricePaise,
        original_price: origPaise,
        cost_price: costPaise,
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
        sizes: form.size_stock.filter((s) => s.stock > 0).map((s) => s.size_label),
        images: form.images.map((img, idx) => ({
          url: img.url,
          alt: img.alt || form.name,
          position: idx,
        })),
        tags: form.tags,
        meta_title: form.meta_title.trim(),
        meta_description: form.meta_description.trim(),
        seo_keywords: form.seo_keywords.trim(),
        supplier_id: form.supplier_id ? parseInt(form.supplier_id, 10) : null,
      };

      if (product) {
        await updateProduct(token, product.id, payload as any);
        showToast('success', 'Product Updated', `"${payload.name}" saved successfully.`);
      } else {
        await createProduct(token, payload as any);
        showToast('success', 'Product Created', `"${payload.name}" added to catalog.`);
      }
      onSaved();
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Server rejected changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <SheetTitle className="text-sm font-bold">
            {product ? `Edit: ${product.name}` : 'Add New Catalog Style'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Total inventory: <strong className="text-slate-900 dark:text-white font-mono">{totalStock}</strong> units
            {profitMargin !== null && profitMargin !== undefined && (
              <span className="ml-2 font-mono">
                Margin:{' '}
                <strong
                  className={
                    profitMargin < 0
                      ? 'text-rose-600'
                      : profitMargin < 20
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }
                >
                  {profitMargin}%
                </strong>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
            <TabsList className="w-full justify-start h-9 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
              <TabsTrigger value="stock" className="text-xs flex items-center gap-1">
                <Box className="w-3.5 h-3.5 mr-1" /> Sizes & Stock
              </TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Images</TabsTrigger>
              <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          {activeTab === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Product Name *</Label>
                  <Input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="e.g. Oxford Double Buckle"
                  />
                </div>
                <div>
                  <Label className="mb-1">SKU Code *</Label>
                  <Input
                    required
                    type="text"
                    value={form.sku}
                    onChange={(e) => set({ sku: e.target.value })}
                    placeholder="HU-OX-01-BLK"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Category</Label>
                  <select
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1">Brand</Label>
                  <Input
                    type="text"
                    value={form.brand}
                    onChange={(e) => set({ brand: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1">Color</Label>
                  <Input
                    type="text"
                    value={form.color}
                    onChange={(e) => set({ color: e.target.value })}
                    placeholder="e.g. Tan Brown"
                  />
                </div>
                <div>
                  <Label className="mb-1">Material</Label>
                  <Input
                    type="text"
                    value={form.material}
                    onChange={(e) => set({ material: e.target.value })}
                    placeholder="e.g. Full Grain Leather"
                  />
                </div>
                <div>
                  <Label className="mb-1">Supplier ID</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.supplier_id}
                    onChange={(e) => set({ supplier_id: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Heel Height</Label>
                  <select
                    value={form.heel_height}
                    onChange={(e) => set({ heel_height: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                  >
                    <option value="">Not specified</option>
                    {HEEL_HEIGHTS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1">Width Option</Label>
                  <select
                    value={form.width_option}
                    onChange={(e) => set({ width_option: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none text-xs"
                  >
                    <option value="">Not specified</option>
                    {WIDTH_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1">Selling Price (₹) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => set({ price: e.target.value })}
                    placeholder="4999"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="mb-1">MRP / Strike (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.original_price}
                    onChange={(e) => set({ original_price: e.target.value })}
                    placeholder="8999"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="mb-1">Cost Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) => set({ cost_price: e.target.value })}
                    placeholder="2500"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="mb-1">Show MRP Strike</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="mrpCheck"
                      checked={form.show_mrp}
                      onChange={(e) => set({ show_mrp: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="mrpCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {form.show_mrp ? 'Visible MRP' : 'Hidden MRP'}
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 uppercase tracking-wider text-[10px] font-bold text-slate-500">
                  {[
                    { label: 'Publish', value: form.active, setter: (v: boolean) => set({ active: v }) },
                    { label: 'Featured', value: form.featured, setter: (v: boolean) => set({ featured: v }) },
                    { label: 'New', value: form.is_new, setter: (v: boolean) => set({ is_new: v }) },
                    { label: 'Trending', value: form.is_trending, setter: (v: boolean) => set({ is_trending: v }) },
                  ].map(({ label, value, setter }) => (
                    <label key={label} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded text-indigo-600 w-3.5 h-3.5"
                      />{' '}
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-1">Short Summary</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Summary of leather quality, stitch finish..."
                />
              </div>

              <div>
                <Label className="mb-1">Detailed Description</Label>
                <Textarea
                  rows={4}
                  value={form.detailed_description}
                  onChange={(e) => set({ detailed_description: e.target.value })}
                  placeholder="Comprehensive craftsmanship details..."
                />
              </div>

              <div>
                <Label className="mb-1">Tags</Label>
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl min-h-[44px]">
                  {form.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] py-0.5 px-2 rounded-lg flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => set({ tags: form.tags.filter((_, i) => i !== idx) })}
                        className="text-rose-500 font-black"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Type tag & press Enter..."
                    className="bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none py-0.5 flex-1 min-w-[120px]"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Per-Size Inventory Matrix (EU/UK)
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Specify stock counts per size</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Total: {totalStock} units
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {EU_SIZES.map((sz) => {
                  const row = form.size_stock.find((s) => s.size_label === sz);
                  return (
                    <div
                      key={sz}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 flex flex-col justify-between items-center text-center"
                    >
                      <Label className="font-mono mb-1">
                        Size {sz}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={row?.stock ?? 0}
                        onChange={(e) => handleStockChange(sz, parseInt(e.target.value) || 0)}
                        className="text-center font-mono font-bold text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <Label>Product Image Gallery</Label>
              <ProductImages
                images={form.images}
                onChange={(images) => set({ images })}
                token={token}
              />
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400">SEO & Metadata</h4>
                <div>
                  <Label className="mb-1">Meta Title</Label>
                  <Input
                    type="text"
                    value={form.meta_title}
                    onChange={(e) => set({ meta_title: e.target.value })}
                    placeholder="Premium Jodhpur Boots | HeelsUp"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">{form.meta_title.length}/60 characters</p>
                </div>
                <div>
                  <Label className="mb-1">Meta Description</Label>
                  <Textarea
                    rows={3}
                    value={form.meta_description}
                    onChange={(e) => set({ meta_description: e.target.value })}
                    placeholder="Handcrafted premium footwear at HeelsUp..."
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    {form.meta_description.length}/160 characters
                  </p>
                </div>
                <div>
                  <Label className="mb-1">SEO Keywords</Label>
                  <Input
                    type="text"
                    value={form.seo_keywords}
                    onChange={(e) => set({ seo_keywords: e.target.value })}
                    placeholder="jodhpur boots, premium leather, heels"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 font-bold text-xs uppercase tracking-wider"
          >
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {product ? 'Update Style' : 'Save Style'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}