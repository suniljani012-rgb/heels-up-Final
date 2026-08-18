import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Search, Save, Sliders, AlertTriangle } from 'lucide-react';

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
  const filteredProducts = products.filter(p => {
    const term = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
  });

  // Handle stock value change locally
  const handleStockChange = (prodId: number, size: string, value: number) => {
    setModifiedStocks(prev => {
      const prodStocks = prev[prodId] || {};
      return {
        ...prev,
        [prodId]: {
          ...prodStocks,
          [size]: Math.max(0, value)
        }
      };
    });
  };

  // Get current stock for size (either modified or original)
  const getSizeStock = (prod: Product, size: string) => {
    if (modifiedStocks[prod.id]?.[size] !== undefined) {
      return modifiedStocks[prod.id][size];
    }
    const found = prod.size_stock?.find(ss => ss.size_label === size);
    return found ? found.stock : 0;
  };

  // Save modified stocks for a single product
  const handleSaveStock = async (prod: Product) => {
    const prodChanges = modifiedStocks[prod.id];
    if (!prodChanges) return;

    setSavingId(prod.id);
    
    // Construct size stock array
    const updatedSizeStock = standardSizes.map(size => {
      const stockVal = prodChanges[size] !== undefined 
        ? prodChanges[size] 
        : (prod.size_stock?.find(ss => ss.size_label === size)?.stock || 0);
      return { size_label: size, stock: stockVal };
    });

    const totalStock = updatedSizeStock.reduce((sum, s) => sum + s.stock, 0);

    try {
      // Fetch current product details to retain other fields
      const detailRes = await fetch(`/api/admin/products/${prod.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
        sizes: updatedSizeStock.filter(s => s.stock > 0).map(s => s.size_label),
        images: product.images || [],
        description: product.description || '',
        brand: product.brand || 'HeelsUp',
        tags: product.tags || [],
        show_mrp: product.show_mrp !== undefined ? product.show_mrp : true,
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || '',
        size_stock: updatedSizeStock
      };

      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Stock Saved', `Inventory counts updated for '${prod.name}'.`);
        
        // Remove from modifications tracker
        setModifiedStocks(prev => {
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
    <div className="space-y-6 text-neutral-900 animate-fade-in relative">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-3xl font-light text-neutral-900 font-display italic">Stock Inventory</h1>
          <p className="text-xs text-neutral-500">Quick-adjust sizing quantities and warehouse allocations</p>
        </div>

        {/* Filter Row */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog styles by SKU, name, or category..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-mono">
                <th className="p-4">SKU / Code</th>
                <th className="p-4">Product Style</th>
                {standardSizes.map(size => (
                  <th key={size} className="p-4 text-center">UK-{size}</th>
                ))}
                <th className="p-4 text-center">Total Stock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map((p) => {
                const hasChanges = modifiedStocks[p.id] && Object.keys(modifiedStocks[p.id]).length > 0;
                
                // Calculate current sum of sizes (modified + unchanged)
                const totalCalculatedStock = standardSizes.reduce((sum, size) => {
                  return sum + getSizeStock(p, size);
                }, 0);

                return (
                  <tr key={p.id} className="hover:bg-neutral-50/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-neutral-700">{p.sku}</td>
                    <td className="p-4">
                      <h4 className="font-bold text-neutral-900 text-xs">{p.name}</h4>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono mt-0.5 block">{p.category}</span>
                    </td>
                    {standardSizes.map(size => {
                      const stockVal = getSizeStock(p, size);
                      return (
                        <td key={size} className="p-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 bg-white border border-neutral-200 rounded-lg p-1 w-20">
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id, size, stockVal - 1)}
                              className="text-neutral-500 hover:text-neutral-900 font-bold px-1"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              value={stockVal}
                              onChange={(e) => handleStockChange(p.id, size, parseInt(e.target.value) || 0)}
                              className="bg-transparent border-0 w-8 text-center text-neutral-900 font-mono font-bold text-xs focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleStockChange(p.id, size, stockVal + 1)}
                              className="text-neutral-500 hover:text-neutral-900 font-bold px-1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center font-mono">
                      <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] ${totalCalculatedStock <= 5 ? 'bg-[#ef4444]/15 border border-[#ef4444]/25 text-rose-600 animate-pulse' : 'bg-neutral-100 text-neutral-700'}`}>
                        {totalCalculatedStock} units
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {hasChanges && (
                        <button
                          onClick={() => handleSaveStock(p)}
                          disabled={savingId === p.id}
                          className="px-3 py-1.5 bg-white hover:bg-neutral-900 text-white border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 ml-auto shadow-md"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === p.id ? 'Saving' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={standardSizes.length + 3} className="py-24 text-center text-neutral-500 italic font-mono bg-white">No catalog styles found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
