// frontend/src/pages/admin/products/ProductDetail.tsx
import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Edit3, Package } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { fetchProductDetail } from './productApi';
import type { AdminProduct } from './productTypes';
import type { Category } from '../types';
import ProductImages from './ProductImages';
import { Card, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../components/ui/table';

interface ProductDetailProps {
  id: number;
  initialProduct?: AdminProduct | null;
  categories: Category[];
  token: string;
  onBack?: () => void;
  onEdit?: () => void;
}

export default function ProductDetail({
  id,
  initialProduct,
  categories,
  token,
  onBack,
  onEdit,
}: ProductDetailProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [product, setProduct] = useState<AdminProduct | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await fetchProductDetail(token, id);
        if (data) {
          setProduct(data);
        }
      } catch (e: any) {
        // If we already have initialProduct, keep showing it without crashing
        if (!initialProduct && !product) {
          setError(e?.message || 'Failed to load product');
        }
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, token, initialProduct]);

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-500 text-xs font-semibold">Loading product specs...</span>
      </div>
    );
  }

  if (error && !product) {
    return (
      <Card className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <CardTitle className="text-lg text-slate-900 dark:text-white">Product Not Available</CardTitle>
        <CardDescription className="text-xs text-slate-500">
          {error || `Product #${id} could not be loaded.`}
        </CardDescription>
        <Button onClick={handleBack} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
          Go Back
        </Button>
      </Card>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-4 antialiased font-sans">
      {/* Top Header */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 text-slate-600 dark:text-slate-300"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{product.name}</CardTitle>
            <CardDescription className="font-mono text-xs text-slate-400 mt-0.5">
              SKU: {product.sku} • {product.category || 'Footwear'}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={product.stock <= 0 ? 'destructive' : product.stock <= 5 ? 'warning' : 'secondary'}
            className="font-mono text-xs px-2 py-0.5"
          >
            Stock: {product.stock} units
          </Badge>
          <Badge variant={product.active ? 'success' : 'outline'} className="text-xs px-2 py-0.5">
            {product.active ? 'Active' : 'Draft'}
          </Badge>
          {onEdit && (
            <Button
              size="sm"
              onClick={onEdit}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs ml-1"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Edit Style
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Product Images & Financials */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Media Showcase
            </CardTitle>
            <ProductImages
              images={(product.images || []).map((url: string) => ({ url, alt: '' }))}
              token={token}
              onChange={() => {}}
            />
          </Card>

          <Card className="p-4 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Pricing Overview
            </CardTitle>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Selling Price</span>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  ₹{Math.round(product.price / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">MRP Strike</span>
                <p className="text-base font-bold font-mono text-slate-400 mt-0.5">
                  {product.original_price ? `₹${Math.round(product.original_price / 100).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock</span>
                <p className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {product.stock} units
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Brand</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  {product.brand || 'HeelsUp'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Specifications & Variant Matrix */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Product Details & Description
            </CardTitle>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block capitalize">
                  {product.category || 'Footwear'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">SKU Identifier</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {product.sku}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Primary Color</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                  {product.color || 'Standard'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block text-xs mb-1">Product Description</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {product.description || 'No description provided for this style.'}
              </p>
            </div>
          </Card>

          {/* Size Stock Grid Table */}
          <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Size Breakdown & Stock Availability
              </h4>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {product.stock} total units
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                  <TableHead>Shoe Size (UK)</TableHead>
                  <TableHead>In Stock Units</TableHead>
                  <TableHead className="text-right">Availability Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(product.size_stock || []).map((sz: any) => (
                  <TableRow key={sz.size_label}>
                    <TableCell className="font-mono font-bold text-xs">
                      UK-{sz.size_label}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sz.stock} units</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={sz.stock > 0 ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5">
                        {sz.stock > 0 ? 'In Stock' : 'Sold Out'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {(!product.size_stock || product.size_stock.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-slate-400 text-xs italic">
                      Standard size breakdown not configured. Total stock: {product.stock} units.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}