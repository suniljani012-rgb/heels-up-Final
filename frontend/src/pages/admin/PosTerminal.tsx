import React, { useState, useMemo, useRef } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  X,
  Printer,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Package,
  Receipt,
  MessageCircle,
  Phone
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent } from '../../components/ui/dialog';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  stock: number;
  active: boolean;
  images: string[];
  sizes: string[];
  colors?: string[];
  color_variants?: { color: string; size_stock: { size_label: string; stock: number }[] }[];
  size_stock?: { size_label: string; stock: number }[];
}

interface CartItem {
  id: string;
  product: Product;
  size: string;
  color?: string;
  qty: number;
  unitPricePaise: number;
}

interface PosTerminalProps {
  products: Product[];
  categories: any[];
  coupons: any[];
  onOrderCreated: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card';

export default function PosTerminal({ products, onOrderCreated }: PosTerminalProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Selected item size picker state (inline on product card)
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});

  // Customer & Bill Information
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountRupees, setDiscountRupees] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  // Categories list
  const categoryList = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.active && p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = (products || []).filter((p) => p.active);

    if (selectedCategory !== 'all') {
      list = list.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, selectedCategory, searchQuery]);

  // Helper to get product sizes
  const getProductSizes = (prod: Product): string[] => {
    if (prod.sizes && prod.sizes.length > 0) return prod.sizes;
    if (prod.size_stock && prod.size_stock.length > 0) return prod.size_stock.map((s) => s.size_label);
    return ['36', '37', '38', '39', '40', '41'];
  };

  // Add product to cart directly with chosen size
  const handleAddToCart = (prod: Product, sizeToUse?: string) => {
    if (prod.stock <= 0) {
      showToast('error', 'Out of Stock', 'This product is currently out of stock.');
      return;
    }

    const availableSizes = getProductSizes(prod);
    const chosenSize = sizeToUse || selectedSizes[prod.id] || availableSizes[0] || '38';
    const itemKey = `${prod.id}_${chosenSize}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((it) => it.id === itemKey);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].qty += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: itemKey,
          product: prod,
          size: chosenSize,
          qty: 1,
          unitPricePaise: prod.price,
        },
      ];
    });

    showToast('success', 'Added to Bill', `${prod.name} (UK ${chosenSize})`);
  };

  // Quantity and remove controls
  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountRupees(0);
    setCashGiven('');
  };

  // Calculations
  const subtotalPaise = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.unitPricePaise * it.qty, 0);
  }, [cart]);

  const subtotalRupees = Math.round(subtotalPaise / 100);
  const discountAmountRupees = Math.min(subtotalRupees, Math.max(0, discountRupees || 0));
  const grandTotalRupees = Math.max(0, subtotalRupees - discountAmountRupees);

  const cashGivenNum = parseFloat(cashGiven) || 0;
  const changeDueRupees = Math.max(0, cashGivenNum - grandTotalRupees);

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'Empty Cart', 'Please add items before billing.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customer_name: customerName.trim() || 'Walk-in Customer',
      customer_phone: customerPhone.trim() || '9999999999',
      customer_email: 'pos-customer@heelsup.in',
      subtotal_amount: subtotalRupees,
      discount_amount: discountAmountRupees,
      total_amount: grandTotalRupees,
      payment_method: paymentMethod,
      source: 'in-store',
      order_status: 'delivered',
      notes: 'In-Store POS Sale',
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.size,
        color: item.color || '',
        quantity: item.qty,
        price: item.unitPricePaise,
      })),
    };

    try {
      const token = localStorage.getItem('heelsup_token');
      const res = await fetch('/api/admin/pos/create-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Bill Created!', `Receipt #${data.data?.order_number || ''}`);
        setPrintedOrder({
          ...payload,
          order_number: data.data?.order_number || `POS-${Date.now().toString().slice(-6)}`,
          created_at: new Date().toISOString(),
        });
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscountRupees(0);
        setCashGiven('');
        onOrderCreated();
      } else {
        showToast('error', 'Sale Failed', data.error || 'Could not record sale.');
      }
    } catch {
      showToast('error', 'Error', 'Failed to connect to billing server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col md:flex-row gap-3 antialiased select-none font-sans overflow-hidden text-slate-900 dark:text-slate-100">
      {/* ── LEFT: PRODUCT CATALOG (Simple & Clean) ──────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Search & Category Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {categoryList.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
              <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
              <p className="text-xs font-semibold">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((prod) => {
                const inStock = prod.stock > 0;
                const priceRupees = Math.round(prod.price / 100);
                const sizes = getProductSizes(prod);
                const currentSize = selectedSizes[prod.id] || sizes[0] || '38';

                return (
                  <div
                    key={prod.id}
                    className={`bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 p-2 flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all ${
                      !inStock ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {/* Image & Price */}
                    <div>
                      <div className="relative aspect-square w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                        {prod.images && prod.images.length > 0 ? (
                          <HeicImage
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono font-bold text-[10px]">
                          ₹{priceRupees.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">{prod.sku}</p>
                    </div>

                    {/* Inline Size Selector & Add Button */}
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                      {/* Size Chips */}
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                        {sizes.slice(0, 5).map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSizes((prev) => ({ ...prev, [prod.id]: s }))}
                            className={`h-5 px-1.5 rounded text-[9px] font-mono font-bold transition-colors ${
                              currentSize === s
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <Button
                        size="sm"
                        disabled={!inStock}
                        onClick={() => handleAddToCart(prod, currentSize)}
                        className="w-full h-7 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        <span>Add (UK {currentSize})</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: BILLING CART & CHECKOUT (Simple & Clean) ─────────── */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs shrink-0">
        {/* Customer Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> Customer Details
            </span>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Phone (Optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-7 px-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-800">
          {cart.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center text-slate-400">
              <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
              <p className="text-xs font-medium">Cart is empty</p>
              <p className="text-[10px] text-slate-400">Click Add button on any item</p>
            </div>
          ) : (
            cart.map((item) => {
              const itemPriceRupees = Math.round(item.unitPricePaise / 100);
              const lineTotal = itemPriceRupees * item.qty;

              return (
                <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">UK {item.size}</span>
                      <span>•</span>
                      <span className="font-mono">₹{itemPriceRupees} each</span>
                    </div>
                  </div>

                  {/* Quantity & Total */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 h-6">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="px-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="px-1.5 text-xs font-mono font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="px-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white min-w-[50px] text-right">
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </span>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bill Summary & Payment */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          {/* Subtotal & Discount Row */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} items)</span>
              <span className="font-mono">₹{subtotalRupees.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Discount (₹):</span>
              <input
                type="number"
                placeholder="0"
                value={discountRupees || ''}
                onChange={(e) => setDiscountRupees(parseFloat(e.target.value) || 0)}
                className="w-20 h-6 text-right font-mono text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 focus:outline-none"
              />
            </div>

            {/* Total Amount */}
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline font-bold">
              <span className="text-sm text-slate-900 dark:text-white uppercase tracking-wider">Total</span>
              <span className="text-xl font-mono text-indigo-600 dark:text-indigo-400">
                ₹{grandTotalRupees.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method Pills */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'upi', label: 'UPI', icon: Smartphone },
              { id: 'card', label: 'Card', icon: CreditCard },
            ].map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Change (If Cash Selected) */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold">Cash Tendered:</span>
              <input
                type="number"
                placeholder="Received ₹"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-24 h-5 text-right font-mono text-xs bg-slate-50 dark:bg-slate-900 rounded px-1 focus:outline-none"
              />
              {cashGivenNum > 0 && (
                <span className="text-[10px] font-mono text-emerald-600 font-bold ml-1">
                  Change: ₹{changeDueRupees}
                </span>
              )}
            </div>
          )}

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            {isSubmitting ? (
              <span>Creating Bill...</span>
            ) : (
              <div className="flex items-center justify-between w-full px-1">
                <span>Complete Bill</span>
                <span className="font-mono">₹{grandTotalRupees.toLocaleString('en-IN')}</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* ── SIMPLE RECEIPT MODAL ────────────────────────────────────── */}
      <Dialog open={!!printedOrder} onOpenChange={(open) => !open && setPrintedOrder(null)}>
        {printedOrder && (
          <DialogContent className="sm:max-w-xs bg-white text-slate-900 p-4 font-mono">
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2 mb-2 text-[10px]">
              <h3 className="font-bold text-xs uppercase">HeelsUp Boutique</h3>
              <p className="text-[9px] text-slate-500">Retail Billing Receipt</p>
              <p className="font-bold text-indigo-600">#{printedOrder.order_number}</p>
              <p className="text-[9px]">{new Date().toLocaleString()}</p>
            </div>

            <div className="text-[9px] border-b border-dashed border-slate-300 pb-2 mb-2">
              <p>Customer: {printedOrder.customer_name}</p>
              <p>Phone: {printedOrder.customer_phone}</p>
              <p>Mode: {printedOrder.payment_method?.toUpperCase()}</p>
            </div>

            <div className="text-[9px] border-b border-dashed border-slate-300 pb-2 mb-2 space-y-1">
              {printedOrder.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate max-w-[140px]">{it.product_name} (UK {it.size})</span>
                  <span>x{it.quantity}</span>
                  <span>₹{((it.price * it.quantity) / 100).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2 mb-2 font-bold">
              <div className="flex justify-between text-xs">
                <span>TOTAL:</span>
                <span>₹{printedOrder.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={() => window.print()} className="flex-1 h-7 text-xs font-bold font-sans">
                <Printer className="w-3 h-3 mr-1" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={() => setPrintedOrder(null)}
                className="flex-1 h-7 text-xs font-bold font-sans"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
