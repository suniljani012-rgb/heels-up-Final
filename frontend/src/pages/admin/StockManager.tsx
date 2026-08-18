import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  Search,
  Save,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowUpRight,
  Minus,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  sizes: string[];
  size_stock?: { size_label: string; stock: number; reserved?: number }[];
}

interface StockManagerProps {
  products: Product[];
  token: string;
  onRefresh: () => void;
}

export default function StockManager({ products, token, onRefresh }: StockManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');

  // Track modified stocks in local state before saving: { [productId]: { [sizeLabel]: stock } }
  const [modifiedStocks, setModifiedStocks] = useState<{ [key: number]: { [key: string]: number } }>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const standardSizes = ['6', '7', '8', '9', '10', '11'];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const term = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  // Handle stock value change locally
  const handleStockChange = (prodId: number, size: string, value: number) => {
    setModifiedStocks((prev) => {
      const prodStocks = prev[prodId] || {};
      return {
        ...prev,
        [prodId]: {
          ...prodStocks,
          [size]: Math.max(0, value),
        },
      };
    });
  };

  // Get current stock for size (either modified or original)
  const getSizeStock = (prod: Product, size: string) => {
    if (modifiedStocks[prod.id]?.[size] !== undefined) {
      return modifiedStocks[prod.id][size];
    }
    const found = prod.size_stock?.find((ss) => ss.size_label === size);
    return found ? found.stock : 0;
  };

  // Save modified stocks for a single product
  const handleSaveStock = async (prod: Product) => {
    const prodChanges = modifiedStocks[prod.id];
    if (!prodChanges) return;

    setSavingId(prod.id);

    // Construct size stock array
    const updatedSizeStock = standardSizes.map((size) => {
      const stockVal =
        prodChanges[size] !== undefined
          ? prodChanges[size]
          : prod.size_stock?.find((ss) => ss.size_label === size)?.stock || 0;
      return { size_label: size, stock: stockVal };
    });

    const totalStock = updatedSizeStock.reduce((sum, s) => sum + s.stock, 0);

    try {
      // Fetch current product details to retain other fields
      const detailRes = await fetch(`/api/admin/products/${prod.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailData = await detailRes.json();
      if (!detailData.success || !detailData.data) {
        showToast('error', 'Fetch Failure', 'Failed to retrieve product details.');
        return;
      }

      const product = detailData.data;

      // Update payload
      const payload = {
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price,
        original_price: product.original_price,
        stock: totalStock,
        active: product.active,
        featured: product.featured,
        is_new: product.is_new,
        is_trending: product.is_trending,
        sizes: updatedSizeStock.filter((s) => s.stock > 0).map((s) => s.size_label),
        images: product.images || [],
        description: product.description || '',
        brand: product.brand || 'HeelsUp',
        tags: product.tags || [],
        show_mrp: product.show_mrp !== undefined ? product.show_mrp : true,
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || '',
        size_stock: updatedSizeStock,
      };

      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Stock Synchronized', `Updated inventory for ${prod.name}`);
        setModifiedStocks((prev) => {
          const next = { ...prev };
          delete next[prod.id];
          return next;
        });
        onRefresh();
      } else {
        showToast('error', 'Sync Failed', data.error || 'Server rejected changes.');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', err.message || 'Could not update inventory.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Size-by-Size Inventory Matrix
          </CardTitle>
          <CardDescription>
            Live stock levels across footwear sizes (UK-6 to UK-11)
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockCount} Styles Low On Stock
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs font-semibold">
            Refresh Matrix
          </Button>
        </div>
      </Card>

      {/* Filter Row */}
      <Card className="p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or category..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredProducts.length}</span> styles
        </div>
      </Card>

      {/* Main Stock Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Product & Category</TableHead>
              <TableHead className="text-center">Total Stock</TableHead>
              {standardSizes.map((sz) => (
                <TableHead key={sz} className="text-center font-mono w-24">
                  UK-{sz}
                </TableHead>
              ))}
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((prod) => {
              const hasModifications = modifiedStocks[prod.id] !== undefined;
              const isSaving = savingId === prod.id;

              // Calculate dynamic total stock based on modifications
              const currentTotalStock = standardSizes.reduce(
                (sum, sz) => sum + getSizeStock(prod, sz),
                0
              );

              return (
                <TableRow
                  key={prod.id}
                  className={hasModifications ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}
                >
                  <TableCell>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{prod.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>SKU: {prod.sku}</span>
                      <span>•</span>
                      <span>{prod.category}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant={
                        currentTotalStock <= 5
                          ? 'destructive'
                          : currentTotalStock <= 15
                          ? 'warning'
                          : 'success'
                      }
                      className="font-mono text-[11px]"
                    >
                      {currentTotalStock} units
                    </Badge>
                  </TableCell>

                  {standardSizes.map((sz) => {
                    const currentVal = getSizeStock(prod, sz);
                    const isLow = currentVal <= 2;

                    return (
                      <TableCell key={sz} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod.id, sz, Math.max(0, currentVal - 1))}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={currentVal}
                            onChange={(e) =>
                              handleStockChange(prod.id, sz, parseInt(e.target.value) || 0)
                            }
                            className={`w-12 py-1 text-center text-xs font-bold font-mono rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isLow
                                ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod.id, sz, currentVal + 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={!hasModifications || isSaving}
                      onClick={() => handleSaveStock(prod)}
                      className={`text-xs font-bold ${
                        hasModifications
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'opacity-40'
                      }`}
                    >
                      {isSaving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-20 text-center text-slate-400 italic">
                  No catalog items found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
