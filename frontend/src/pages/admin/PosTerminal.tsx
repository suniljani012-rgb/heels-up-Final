import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  X,
  Printer,
  User,
  DollarSign,
  MessageCircle,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Package,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Layers,
  Tag,
  Percent
} from 'lucide-react';
import HeicImage from '../../components/HeicImage';

// Instagram SVG icon
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface ColorVariant {
  color: string;
  size_stock: { size_label: string; stock: number }[];
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  original_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  images: string[];
  sizes: string[];
  colors?: string[];
  color_variants?: ColorVariant[];
  size_stock?: { size_label: string; stock: number }[];
}

interface PosTerminalProps {
  products: Product[];
  categories: any[];
  coupons: any[];
  onOrderCreated: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'whatsapp' | 'instagram';
type SaleChannel = 'in-store' | 'whatsapp' | 'instagram' | 'phone';

export default function PosTerminal({ products, categories, coupons, onOrderCreated }: PosTerminalProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Cart/Billing list state
  const [cart, setCart] = useState<
    { product: Product; size: string; color: string; qty: number; customPrice?: number }[]
  >([]);

  // Item selector form states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [itemPriceOverride, setItemPriceOverride] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saleChannel, setSaleChannel] = useState<SaleChannel>('in-store');

  // Billing and discounts
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('In-Store POS Sale');

  // Drawer float and drops
  const [drawerStartCash, setDrawerStartCash] = useState<number>(5000);
  const [cashDrops, setCashDrops] = useState<{ amount: number; reason: string; time: string }[]>([]);
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState('');
  const [showDrawerManager, setShowDrawerManager] = useState(false);

  // Print invoice modal state
  const [printedOrder, setPrintedOrder] = useState<any | null>(null);

  // Filter products for the searchable dropdown
  const filteredProductOptions = useMemo(() => {
    if (!searchProductQuery.trim()) {
      return products.filter((p) => p.active);
    }
    const q = searchProductQuery.toLowerCase();
    return products.filter(
      (p) => p.active && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  }, [products, searchProductQuery]);

  // Derived colors for the selected product
  const availableColors = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.color_variants && selectedProduct.color_variants.length > 0) {
      return selectedProduct.color_variants.map((cv) => cv.color);
    }
    return selectedProduct.colors || [];
  }, [selectedProduct]);

  // Derived sizes & stocks based on selected product and selected color
  const sizeStockOptions = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.color_variants && selectedProduct.color_variants.length > 0) {
      const cv = selectedProduct.color_variants.find((v) => v.color === selectedColor);
      return cv ? cv.size_stock : [];
    }
    // Fallback: If no color_variants, return size_stock from main product
    return selectedProduct.sizes.map((sz) => {
      const found = selectedProduct.size_stock?.find((ss: any) => ss.size_label === sz);
      return { size_label: sz, stock: found ? found.stock : 99 };
    });
  }, [selectedProduct, selectedColor]);

  // Set default color/size when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      if (availableColors.length > 0) {
        setSelectedColor(availableColors[0]);
      } else {
        setSelectedColor('');
      }
      setItemPriceOverride('');
    }
  }, [selectedProduct, availableColors]);

  useEffect(() => {
    if (sizeStockOptions.length > 0) {
      setSelectedSize(sizeStockOptions[0].size_label);
    } else {
      setSelectedSize('');
    }
  }, [sizeStockOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add Item to Cart
  const handleAddItemToBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('error', 'Select Product', 'Please choose a product to bill.');
      return;
    }
    if (!selectedSize) {
      showToast('error', 'Select Size', 'Please select a size for this item.');
      return;
    }

    const priceOverride = itemPriceOverride.trim() ? parseFloat(itemPriceOverride) : undefined;
    const finalPrice = priceOverride !== undefined ? priceOverride : selectedProduct.price / 100;

    // Check if item exists in cart
    const existingIndex = cart.findIndex(
      (c) =>
        c.product.id === selectedProduct.id &&
        c.size === selectedSize &&
        c.color === selectedColor &&
        c.customPrice === priceOverride
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += itemQty;
      setCart(updated);
    } else {
      setCart((prev) => [
        ...prev,
        {
          product: selectedProduct,
          size: selectedSize,
          color: selectedColor,
          qty: itemQty,
          customPrice: priceOverride,
        },
      ]);
    }

    // Reset item selector
    setSelectedProduct(null);
    setSearchProductQuery('');
    setItemPriceOverride('');
    setItemQty(1);
    showToast('success', 'Item Added', 'Product added to invoice.');
  };

  const updateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].qty = newQty;
    }
    setCart(updated);
  };

  const updateCustomPrice = (index: number, val: string) => {
    const updated = [...cart];
    const parsed = parseFloat(val);
    updated[index].customPrice = isNaN(parsed) ? undefined : Math.max(0, parsed);
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotalPaise = useMemo(() => {
    return cart.reduce((acc, item) => {
      const unitPricePaise =
        item.customPrice !== undefined ? item.customPrice * 100 : item.product.price;
      return acc + unitPricePaise * item.qty;
    }, 0);
  }, [cart]);

  const couponDiscountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      return (subtotalPaise * appliedCoupon.discount) / 100;
    }
    return appliedCoupon.discount * 100;
  }, [appliedCoupon, subtotalPaise]);

  const totalDiscountPaise = useMemo(() => {
    const manualDiscountPaise = customDiscount * 100;
    return Math.min(subtotalPaise, couponDiscountPaise + manualDiscountPaise);
  }, [subtotalPaise, couponDiscountPaise, customDiscount]);

  const discountedAmountPaise = Math.max(0, subtotalPaise - totalDiscountPaise);

  const gstAmountPaise = useMemo(() => {
    if (gstRate === 0) return 0;
    return (discountedAmountPaise * gstRate) / (100 + gstRate);
  }, [discountedAmountPaise, gstRate]);

  const baseAmountPaise = discountedAmountPaise - gstAmountPaise;
  const totalPayablePaise = discountedAmountPaise;

  const currentDrawerCash = useMemo(() => {
    const dropsTotal = cashDrops.reduce((acc, d) => acc + d.amount, 0);
    return drawerStartCash - dropsTotal;
  }, [drawerStartCash, cashDrops]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const found = coupons.find(
      (c) => c.code.toLowerCase() === couponCode.trim().toLowerCase() && (c.active === 1 || c.active === true)
    );
    if (found) {
      setAppliedCoupon(found);
      showToast('success', 'Coupon Applied', `${found.code} saved.`);
    } else {
      showToast('error', 'Invalid Coupon', 'Coupon not found or inactive.');
    }
  };

  const handleAddCashDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (dropAmount <= 0) return;
    setCashDrops((prev) => [
      ...prev,
      { amount: dropAmount, reason: dropReason || 'Cash Outflow', time: new Date().toLocaleTimeString() },
    ]);
    setDropAmount(0);
    setDropReason('');
    showToast('info', 'Drop Recorded', 'Cash outflow recorded.');
  };

  const handleShareWhatsApp = () => {
    if (cart.length === 0) {
      showToast('error', 'Empty Cart', 'Cart is empty.');
      return;
    }
    const phoneClean = customerPhone.replace(/\D/g, '');
    let msg = `*HEELSUP INVOICE QUOTE*\n\n`;
    cart.forEach((item, idx) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
      msg += `${idx + 1}. ${item.product.name} (UK-${item.size}${item.color ? `, ${item.color}` : ''}) x${item.qty} = ₹${(price * item.qty).toFixed(2)}\n`;
    });
    msg += `\n*Total Payable: ₹${(totalPayablePaise / 100).toFixed(2)}*\n\nPayment Link: https://heelsup.in/checkout`;

    const url = phoneClean
      ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'Empty Cart', 'Add at least one item.');
      return;
    }

    const payload = {
      customer_name: customerName.trim() || 'In-Store POS Customer',
      customer_phone: customerPhone.trim() || '9999999999',
      customer_email: customerEmail.trim() || 'pos-customer@heelsup.in',
      subtotal_amount: subtotalPaise / 100,
      discount_amount: totalDiscountPaise / 100,
      total_amount: totalPayablePaise / 100,
      payment_method: paymentMethod,
      source: saleChannel,
      order_status: 'delivered',
      notes: notes,
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        size: item.size,
        color: item.color || '',
        quantity: item.qty,
        price: item.customPrice !== undefined ? item.customPrice * 100 : item.product.price,
      })),
    };

    const finalizeSale = async (razorpayPaymentId?: string) => {
      try {
        const token = localStorage.getItem('heelsup_token');
        const res = await fetch('/api/admin/pos/create-sale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...payload,
            razorpay_payment_id: razorpayPaymentId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          showToast('success', 'Sale Complete', `Order #${data.data?.order_number || ''} recorded.`);
          setPrintedOrder({
            ...payload,
            order_number: data.data?.order_number || `POS-${Date.now()}`,
            created_at: new Date().toISOString(),
          });
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
          setCustomerEmail('');
          setAppliedCoupon(null);
          setCustomDiscount(0);
          onOrderCreated();
        } else {
          showToast('error', 'Sale Failed', data.error || 'Server error.');
        }
      } catch {
        showToast('error', 'Connection Failure', 'Could not record transaction.');
      }
    };

    if (paymentMethod === 'upi') {
      try {
        showToast('info', 'Generating UPI QR', 'Contacting Gateway...');
        const initRes = await fetch('/api/admin/pos/initiate-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('heelsup_token')}`,
          },
          body: JSON.stringify({ amount: totalPayablePaise / 100 }),
        });
        const initData = await initRes.json();
        if (!initData.success) {
          showToast('error', 'Gateway Error', initData.error || 'Failed to initialize payment.');
          return;
        }

        const { key, razorpayOrder } = initData.data;

        const rzpOptions = {
          key: key,
          amount: razorpayOrder.amount,
          currency: 'INR',
          name: 'HeelsUp POS',
          description: `Bill Amount: ₹${(totalPayablePaise / 100).toFixed(2)}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: customerName.trim() || 'POS Customer',
            contact: customerPhone.trim() || '9999999999',
            email: customerEmail.trim() || 'pos-customer@heelsup.in',
            method: 'upi',
          },
          theme: { color: '#4F46E5' },
          handler: async function (response: any) {
            showToast('success', 'UPI Payment Received', `ID: ${response.razorpay_payment_id}`);
            await finalizeSale(response.razorpay_payment_id);
          },
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } catch (e) {
        showToast('error', 'Payment Failure', 'Could not open UPI gateway.');
      }
    } else {
      await finalizeSale();
    }
  };

  const channelColors: Record<SaleChannel, string> = {
    'in-store': 'border-slate-900 bg-slate-900 text-white dark:bg-indigo-600 dark:border-indigo-600',
    whatsapp: 'border-emerald-600 bg-emerald-600 text-white',
    instagram: 'border-purple-600 bg-purple-600 text-white',
    phone: 'border-blue-600 bg-blue-600 text-white',
  };

  const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="w-3.5 h-3.5" />,
    upi: <Smartphone className="w-3.5 h-3.5" />,
    card: <CreditCard className="w-3.5 h-3.5" />,
    whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
    instagram: <InstagramIcon className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Retail POS Terminal & Quick Invoicing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Realtime counter billing, omni-channel orders, and cash drawer management
          </p>
        </div>

        {/* Channel Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Channel:
          </span>
          {(['in-store', 'whatsapp', 'instagram', 'phone'] as SaleChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setSaleChannel(ch);
                setNotes(
                  ch === 'in-store'
                    ? 'In-Store POS Sale'
                    : ch === 'whatsapp'
                    ? 'WhatsApp Sale'
                    : ch === 'instagram'
                    ? 'Instagram DM Sale'
                    : 'Phone Order'
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                saleChannel === ch
                  ? channelColors[ch]
                  : 'border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {ch === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5" />}
              {ch === 'instagram' && <InstagramIcon className="w-3.5 h-3.5" />}
              {ch === 'in-store' && <Package className="w-3.5 h-3.5" />}
              {ch === 'phone' && <Smartphone className="w-3.5 h-3.5" />}
              {ch === 'in-store' ? 'In-Store' : ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowDrawerManager(!showDrawerManager)}
          className="px-3.5 py-1.5 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          Drawer: ₹{currentDrawerCash.toFixed(0)}
        </button>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Product Selection & Bill Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Product Selection Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Select Product & Variant
            </h3>

            <form onSubmit={handleAddItemToBill} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Product Search */}
              <div className="md:col-span-5 relative" ref={productDropdownRef}>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Product / SKU
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product by title, SKU..."
                    value={
                      selectedProduct
                        ? `${selectedProduct.name} (${selectedProduct.sku})`
                        : searchProductQuery
                    }
                    onChange={(e) => {
                      if (selectedProduct) setSelectedProduct(null);
                      setSearchProductQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSearchProductQuery('');
                      }}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showProductDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredProductOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 italic">No products found</div>
                    ) : (
                      filteredProductOptions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setShowProductDropdown(false);
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {p.name}
                            <span className="block text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                              {p.sku}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            ₹{(p.price / 100).toFixed(0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Color Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Color
                </label>
                <select
                  disabled={!selectedProduct || availableColors.length === 0}
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-50"
                >
                  {availableColors.length === 0 && <option value="">N/A</option>}
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Size & Stock
                </label>
                <select
                  disabled={!selectedProduct || sizeStockOptions.length === 0}
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-50"
                >
                  {sizeStockOptions.length === 0 && <option value="">N/A</option>}
                  {sizeStockOptions.map((opt) => (
                    <option key={opt.size_label} value={opt.size_label}>
                      UK {opt.size_label} ({opt.stock} left)
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Override */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  disabled={!selectedProduct}
                  value={itemPriceOverride}
                  onChange={(e) => setItemPriceOverride(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-right text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Submit Add */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-xs disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Cart Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                Cart Items ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-3.5">Product Description</th>
                    <th className="p-3.5 w-32">Unit Rate (₹)</th>
                    <th className="p-3.5 w-28 text-center">Qty</th>
                    <th className="p-3.5 w-28 text-right">Subtotal</th>
                    <th className="p-3.5 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-slate-400 italic">
                        Select a product above to add items to invoice
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const itemPrice =
                        item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
                      return (
                        <tr
                          key={`${item.product.id}-${item.size}-${item.color}`}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {item.product.images?.[0] && (
                                <div className="w-9 h-9 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                  <HeicImage
                                    src={item.product.images[0]}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {item.product.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                  SKU: {item.product.sku}{' '}
                                  {item.color ? `• ${item.color}` : ''} • Size: UK {item.size}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <input
                              type="number"
                              step="0.01"
                              value={item.customPrice !== undefined ? item.customPrice : ''}
                              placeholder={(item.product.price / 100).toString()}
                              onChange={(e) => updateCustomPrice(idx, e.target.value)}
                              className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-right font-mono text-slate-900 dark:text-white focus:outline-none"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => updateQty(idx, -1)}
                                className="w-6 h-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold"
                              >
                                −
                              </button>
                              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white w-5 text-center">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => updateQty(idx, 1)}
                                className="w-6 h-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{(itemPrice * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Checkout & Summary Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-4 space-y-4">
          {/* Customer Details */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Customer Information
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Phone (+91...)"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Share Links */}
            {(saleChannel === 'whatsapp' || saleChannel === 'instagram') && (
              <button
                onClick={handleShareWhatsApp}
                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  saleChannel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {saleChannel === 'whatsapp' ? (
                  <MessageCircle className="w-3.5 h-3.5" />
                ) : (
                  <InstagramIcon className="w-3.5 h-3.5" />
                )}
                Share Cart via {saleChannel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
              </button>
            )}
          </div>

          {/* Coupons & Manual Discount */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Promo Coupon
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="CODE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] uppercase text-slate-900 dark:text-white focus:outline-none font-mono"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-bold transition-colors"
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {appliedCoupon.code} active
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Flat Discount (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={customDiscount || ''}
                onChange={(e) => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-right text-slate-900 dark:text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* GST & Payment Selector */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                GST Rate
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="0">0% Exempt</option>
                <option value="5">5% GST (Footwear)</option>
                <option value="12">12% GST (Standard)</option>
                <option value="18">18% GST (Luxury)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="cash">💵 Cash Payment</option>
                <option value="upi">📱 UPI / QR Scan</option>
                <option value="card">💳 POS Card Swipe</option>
                <option value="whatsapp">📩 WhatsApp Pay</option>
                <option value="instagram">📸 Instagram Pay</option>
              </select>
            </div>
          </div>

          {/* Summary Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal:</span>
              <span>₹{(subtotalPaise / 100).toFixed(2)}</span>
            </div>
            {totalDiscountPaise > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                <span>Total Discount:</span>
                <span>-₹{(totalDiscountPaise / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Base Amount:</span>
              <span>₹{(baseAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>GST ({gstRate}%) incl:</span>
              <span>₹{(gstAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>NET PAYABLE:</span>
              <span>₹{(totalPayablePaise / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Complete Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 ${
              saleChannel === 'whatsapp'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : saleChannel === 'instagram'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700'
            }`}
          >
            {paymentIcons[paymentMethod]}
            {saleChannel === 'whatsapp'
              ? 'Confirm WhatsApp Sale'
              : saleChannel === 'instagram'
              ? 'Confirm Instagram Sale'
              : 'Complete Sale & Print'}
          </button>
        </div>
      </div>

      {/* Cash Drawer Modal */}
      {showDrawerManager && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setShowDrawerManager(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Cash Drawer Ledger
                </h3>
                <button
                  onClick={() => setShowDrawerManager(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Opening Float
                  </span>
                  <input
                    type="number"
                    value={drawerStartCash}
                    onChange={(e) =>
                      setDrawerStartCash(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 text-lg font-bold font-mono text-slate-900 dark:text-white mt-1 py-0.5 focus:outline-none"
                  />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl">
                  <span className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Drawer Balance
                  </span>
                  <span className="block text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    ₹{currentDrawerCash.toFixed(0)}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleAddCashDrop}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-3"
              >
                <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Record Outflow / Drop
                </span>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={dropAmount || ''}
                    onChange={(e) =>
                      setDropAmount(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    placeholder="e.g. Bank deposit, vendor payout"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                >
                  Record Outflow
                </button>
              </form>
            </div>

            <button
              onClick={() => setShowDrawerManager(false)}
              className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-xl text-xs uppercase transition-colors"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {printedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setPrintedOrder(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="bg-white text-slate-900 p-6 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
            <div className="w-full text-center space-y-1 font-mono border-b border-dashed border-slate-300 pb-4 mb-4 text-[10px]">
              <h2 className="text-sm font-bold tracking-widest uppercase">HeelsUp Boutique</h2>
              <p>DLF Phase 4, Galleria Market, Gurugram</p>
              <p>Tel: +91 99999-88888 | GSTIN: 06AAAAA1111A1Z1</p>
              <div className="h-[1px] border-t border-dashed border-slate-300 my-2" />
              <p className="font-bold">
                INVOICE: <span className="text-indigo-600 font-bold">{printedOrder.order_number}</span>
              </p>
              <p>Date: {new Date(printedOrder.created_at || Date.now()).toLocaleString()}</p>
              <p>Mode: {printedOrder.payment_method?.toUpperCase()}</p>
              <p>Channel: {saleChannel.toUpperCase()}</p>
            </div>

            <div className="w-full text-left font-mono text-[9px] border-b border-dashed border-slate-300 pb-3 mb-3 space-y-0.5">
              <p>
                <strong>Customer:</strong> {printedOrder.customer_name}
              </p>
              <p>
                <strong>Phone:</strong> {printedOrder.customer_phone}
              </p>
              {printedOrder.customer_email && (
                <p>
                  <strong>Email:</strong> {printedOrder.customer_email}
                </p>
              )}
            </div>

            <div className="w-full font-mono text-[10px] border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 mb-1">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/3 text-right">Amount</span>
              </div>
              <div className="space-y-1.5">
                {printedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <div className="w-1/2 min-w-0 truncate">
                      <span>{item.product_name}</span>
                      <span className="block text-[8px] text-slate-400">
                        {item.color ? `${item.color} • ` : ''}UK {item.size}
                      </span>
                    </div>
                    <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                    <span className="w-1/3 text-right font-mono">
                      ₹{((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full font-mono text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-3 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{printedOrder.subtotal_amount?.toFixed(2)}</span>
              </div>
              {printedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Discount:</span>
                  <span>-₹{printedOrder.discount_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="h-[1px] border-t border-slate-200 my-1" />
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>₹{printedOrder.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2 w-full">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setPrintedOrder(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
