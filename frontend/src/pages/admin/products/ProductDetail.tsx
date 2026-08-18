// frontend/src/pages/admin/products/ProductDetail.tsx
import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ArrowLeft, Edit3, Package, Layers } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { fetchProductDetail } from './productApi';
import type { AdminProduct } from './productTypes';
import type { Category } from '../types';
import ProductImages from './ProductImages';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../components/ui/table';

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
      <Card className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <CardTitle className="text-lg">Product Not Found</CardTitle>
        <CardDescription>{error || `Product #${id} could not be loaded.`}</CardDescription>
        <Button onClick={() => window.history.back()} size="sm">
          Go Back
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.history.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <CardDescription className="font-mono text-xs">SKU: {product.sku}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            Stock: {product.stock} units
          </Badge>
          <Badge variant={product.active ? 'success' : 'outline'}>
            {product.active ? 'Active' : 'Draft'}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Product Images & Key Metrics */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Media Showcase
            </CardTitle>
            <ProductImages
              images={(product.images || []).map((url: string) => ({ url, alt: '' }))}
              token={token}
              onChange={() => {}}
            />
          </Card>

          <Card className="p-5 space-y-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Financial Matrix
            </CardTitle>
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
          </Card>
        </div>

        {/* Right: Specifications & Variant Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Product Overview & Specifications
            </CardTitle>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {product.category || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Brand</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {product.brand || 'HeelsUp'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Primary Color</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {product.color || '—'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block text-xs mb-1">Product Description</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {product.description || 'No description provided.'}
              </p>
            </div>
          </Card>

          {/* Size Stock Grid Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Footwear Size Grid & Inventory Matrix
              </h4>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shoe Size (UK)</TableHead>
                  <TableHead>In Stock Units</TableHead>
                  <TableHead>Reserved Orders</TableHead>
                  <TableHead className="text-right">Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(product.size_stock || []).map((sz: any) => (
                  <TableRow key={sz.size_label}>
                    <TableCell className="font-mono font-bold text-xs">
                      UK-{sz.size_label}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sz.stock} units</TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">{sz.reserved || 0} reserved</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={sz.stock > 0 ? 'success' : 'destructive'}>
                        {sz.stock > 0 ? 'Available' : 'Sold Out'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}