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
  Plus
} from 'lucide-react';

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
        showToast('success', 'Stock Saved', `Inventory counts updated for '${prod.name}'.`);

        // Remove from modifications tracker
        setModifiedStocks((prev) => {
          const copy = { ...prev };
          delete copy[prod.id];
          return copy;
        });
        onRefresh();
      } else {
        showToast('error', 'Save Denied', data.error || 'Server rejected stock updates.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to database.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Stock & Inventory Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inline size-by-size inventory adjustments and warehouse restock management
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Total Catalog: {products.length}
          </span>
          {lowStockCount > 0 && (
            <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-semibold border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock: {lowStockCount}
            </span>
          )}
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog styles by SKU, name, or category..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Stock Matrix Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">SKU / Code</th>
                <th className="p-3.5">Product Style</th>
                {standardSizes.map((size) => (
                  <th key={size} className="p-3.5 text-center">
                    UK-{size}
                  </th>
                ))}
                <th className="p-3.5 text-center">Total Stock</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredProducts.map((p) => {
                const hasChanges = modifiedStocks[p.id] && Object.keys(modifiedStocks[p.id]).length > 0;

                const totalCalculatedStock = standardSizes.reduce((sum, size) => {
                  return sum + getSizeStock(p, size);
                }, 0);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">{p.sku}</td>
                    <td className="p-3.5">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{p.name}</h4>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mt-0.5 block">
                        {p.category}
                      </span>
                    </td>

                    {standardSizes.map((size) => {
                      const stockVal = getSizeStock(p, size);
                      return (
                        <td key={size} className="p-3.5 text-center">
                          <div className="inline-flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg p-1 w-20">
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id, size, stockVal - 1)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="text"
                              value={stockVal}
                              onChange={(e) =>
                                handleStockChange(p.id, size, parseInt(e.target.value) || 0)
                              }
                              className="bg-transparent border-0 w-7 text-center text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id, size, stockVal + 1)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    <td className="p-3.5 text-center font-mono">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          totalCalculatedStock <= 5
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                        }`}
                      >
                        {totalCalculatedStock} units
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      {hasChanges ? (
                        <button
                          onClick={() => handleSaveStock(p)}
                          disabled={savingId === p.id}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs ml-auto"
                        >
                          <Save className="w-3 h-3" />
                          {savingId === p.id ? 'Saving...' : 'Save'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Synced</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={standardSizes.length + 3} className="py-20 text-center text-slate-400 italic">
                    No catalog products found matching criteria.
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
