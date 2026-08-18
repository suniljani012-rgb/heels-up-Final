import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  Search,
  Save,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Package,
  Minus,
  Plus,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';

interface SizeStock {
  size_label: string;
  stock: number;
  reserved?: number;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  sizes: string[];
  size_stock?: SizeStock[];
  images?: string[];
  active: boolean;
}

interface StockManagerProps {
  products: Product[];
  token: string;
  onRefresh: () => void;
}

// Standard Footwear Size mappings
const SIZES = [
  { key: '36', alt: '6', label: '36' },
  { key: '37', alt: '7', label: '37' },
  { key: '38', alt: '8', label: '38' },
  { key: '39', alt: '9', label: '39' },
  { key: '40', alt: '10', label: '40' },
  { key: '41', alt: '11', label: '41' },
];

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function StockManager({ products, token, onRefresh }: StockManagerProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Track modified stocks in local state: { [productId]: { [sizeKey]: stockNumber } }
  const [modifiedStocks, setModifiedStocks] = useState<{ [key: number]: { [key: string]: number } }>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Helper to read size stock accurately from database objects
  const getSizeStock = (prod: Product, sizeObj: typeof SIZES[0]): number => {
    if (modifiedStocks[prod.id]?.[sizeObj.key] !== undefined) {
      return modifiedStocks[prod.id][sizeObj.key];
    }

    if (prod.size_stock && Array.isArray(prod.size_stock) && prod.size_stock.length > 0) {
      const match = prod.size_stock.find(
        (s) => s.size_label === sizeObj.key || s.size_label === sizeObj.alt
      );
      if (match && typeof match.stock === 'number') {
        return match.stock;
      }
    }

    if (prod.sizes && (prod.sizes.includes(sizeObj.key) || prod.sizes.includes(sizeObj.alt))) {
      return Math.max(1, Math.floor(prod.stock / (prod.sizes.length || 1)));
    }

    return 0;
  };

  // Helper to get total stock for a product
  const getTotalStock = (prod: Product): number => {
    if (modifiedStocks[prod.id]) {
      return Object.values(modifiedStocks[prod.id]).reduce((sum, v) => sum + v, 0);
    }
    if (typeof prod.stock === 'number') {
      return prod.stock;
    }
    return SIZES.reduce((sum, s) => sum + getSizeStock(prod, s), 0);
  };

  // Handle size stock change
  const handleStockChange = (prodId: number, sizeKey: string, newQty: number, prod: Product) => {
    const val = Math.max(0, newQty);
    setModifiedStocks((prev) => {
      const currentMap = prev[prodId] ? { ...prev[prodId] } : {};
      if (Object.keys(currentMap).length === 0) {
        SIZES.forEach((s) => {
          currentMap[s.key] = getSizeStock(prod, s);
        });
      }
      currentMap[sizeKey] = val;
      return {
        ...prev,
        [prodId]: currentMap,
      };
    });
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Overall Inventory Metrics
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    (products || []).forEach((p) => {
      const stock = getTotalStock(p);
      totalUnits += stock;
      if (stock === 0) outOfStockCount++;
      else if (stock <= 5) lowStockCount++;
      else inStockCount++;
    });

    return {
      totalUnits,
      totalStyles: products.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [products, modifiedStocks]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      const total = getTotalStock(p);
      let matchesStatus = true;
      if (activeFilter === 'in_stock') matchesStatus = total > 5;
      else if (activeFilter === 'low_stock') matchesStatus = total > 0 && total <= 5;
      else if (activeFilter === 'out_of_stock') matchesStatus = total === 0;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, activeFilter, modifiedStocks]);

  const modifiedCount = Object.keys(modifiedStocks).length;

  // Save stock for a product
  const handleSaveStock = async (prod: Product) => {
    const changes = modifiedStocks[prod.id];
    if (!changes) return;

    setSavingId(prod.id);

    const updatedSizeStock = SIZES.map((s) => ({
      size_label: s.key,
      stock: changes[s.key] !== undefined ? changes[s.key] : getSizeStock(prod, s),
    }));

    const totalStock = updatedSizeStock.reduce((sum, s) => sum + s.stock, 0);

    try {
      const detailRes = await fetch(`/api/admin/products/${prod.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailData = await detailRes.json();
      const current = detailData.data || prod;

      const payload = {
        ...current,
        stock: totalStock,
        sizes: updatedSizeStock.filter((s) => s.stock > 0).map((s) => s.size_label),
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
        showToast('success', 'Inventory Saved', `${prod.name} updated.`);
        setModifiedStocks((prev) => {
          const next = { ...prev };
          delete next[prod.id];
          return next;
        });
        onRefresh();
      } else {
        showToast('error', 'Save Failed', data.error || 'Server error.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to save inventory updates.');
    } finally {
      setSavingId(null);
    }
  };

  // Bulk save all modified products
  const handleBulkSave = async () => {
    const ids = Object.keys(modifiedStocks).map(Number);
    if (ids.length === 0) return;

    setBulkSaving(true);
    let successCount = 0;

    for (const id of ids) {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        await handleSaveStock(prod);
        successCount++;
      }
    }

    setBulkSaving(false);
    showToast('success', 'All Changes Saved', `Saved stock updates for ${successCount} products.`);
  };

  return (
    <div className="space-y-3 antialiased font-sans">
      {/* ── 1. E-COMMERCE SUMMARY CARDS (Shopify Style) ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Inventory Units
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics.totalUnits.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{metrics.totalStyles} catalog styles</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            In Stock
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.inStockCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Healthy inventory</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Low Stock (≤ 5)
          </span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {metrics.lowStockCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Needs restock</span>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Out of Stock
          </span>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {metrics.outOfStockCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">0 units available</span>
        </Card>
      </div>

      {/* ── 2. FILTER & ACTION TOOLBAR (Shopify Inventory Style) ─────── */}
      <Card className="p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5">
        {/* Status Filter Tabs & Bulk Save */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all', label: 'All Inventory', count: metrics.totalStyles },
              { id: 'in_stock', label: 'In Stock', count: metrics.inStockCount },
              { id: 'low_stock', label: 'Low Stock', count: metrics.lowStockCount },
              { id: 'out_of_stock', label: 'Out of Stock', count: metrics.outOfStockCount },
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as StockFilter)}
                  className={`h-7 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unsaved Changes & Bulk Save */}
          {modifiedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {modifiedCount} unsaved updates
              </span>
              <Button
                size="sm"
                disabled={bulkSaving}
                onClick={handleBulkSave}
                className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                <span>{bulkSaving ? 'Saving...' : 'Save All Changes'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by product name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 px-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none capitalize text-slate-700 dark:text-slate-300"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
            Showing <strong>{filteredProducts.length}</strong> of {products.length} products
          </span>
        </div>
      </Card>

      {/* ── 3. E-COMMERCE INVENTORY MATRIX TABLE ──────────────────────── */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
              <TableHead className="w-[300px]">Product</TableHead>
              <TableHead className="w-[120px]">SKU</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
              <TableHead className="text-center w-[110px]">Available</TableHead>
              {SIZES.map((s) => (
                <TableHead key={s.key} className="text-center font-mono w-[80px]">
                  UK {s.label}
                </TableHead>
              ))}
              <TableHead className="text-right w-[90px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((prod) => {
              const isModified = !!modifiedStocks[prod.id];
              const total = getTotalStock(prod);
              const isOutOfStock = total === 0;
              const isLowStock = total > 0 && total <= 5;

              return (
                <TableRow
                  key={prod.id}
                  className={`transition-colors ${
                    isModified
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/60'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Product Info (Thumbnail + Name + Category + Price) */}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        {prod.images && prod.images.length > 0 ? (
                          <HeicImage
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 m-2.5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[200px]">
                          {prod.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="capitalize">{prod.category || 'Footwear'}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                            ₹{Math.round(prod.price / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* SKU */}
                  <TableCell className="py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {prod.sku}
                    </span>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="text-center py-2.5">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        In Stock
                      </span>
                    )}
                  </TableCell>

                  {/* Total Units Badge */}
                  <TableCell className="text-center py-2.5">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {total} units
                    </span>
                  </TableCell>

                  {/* Size Stock Steppers */}
                  {SIZES.map((s) => {
                    const currentQty = getSizeStock(prod, s);

                    return (
                      <TableCell key={s.key} className="text-center p-1 py-2.5">
                        <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 h-7">
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod.id, s.key, currentQty - 1, prod)}
                            className="px-1.5 h-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={(e) =>
                              handleStockChange(
                                prod.id,
                                s.key,
                                parseInt(e.target.value) || 0,
                                prod
                              )
                            }
                            className={`w-7 text-center text-xs font-mono font-bold bg-transparent focus:outline-none ${
                              currentQty === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod.id, s.key, currentQty + 1, prod)}
                            className="px-1.5 h-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </TableCell>
                    );
                  })}

                  {/* Save / Status Action */}
                  <TableCell className="text-right py-2.5">
                    {isModified ? (
                      <Button
                        size="sm"
                        disabled={savingId === prod.id}
                        onClick={() => handleSaveStock(prod)}
                        className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
                      >
                        {savingId === prod.id ? 'Saving...' : 'Save'}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" /> Synced
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs italic">
                  No matching inventory products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
