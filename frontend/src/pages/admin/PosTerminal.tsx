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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

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

    if (selectedProduct.color_variants && selectedProduct.color_variants.length > 0 && selectedColor) {
      const cv = selectedProduct.color_variants.find((v) => v.color === selectedColor);
      if (cv && cv.size_stock) {
        return cv.size_stock;
      }
    }

    if (selectedProduct.size_stock && selectedProduct.size_stock.length > 0) {
      return selectedProduct.size_stock;
    }

    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
      return selectedProduct.sizes.map((s) => ({
        size_label: s,
        stock: Math.floor(selectedProduct.stock / selectedProduct.sizes.length) || 1,
      }));
    }

    return [
      { size_label: '36', stock: 5 },
      { size_label: '37', stock: 5 },
      { size_label: '38', stock: 5 },
      { size_label: '39', stock: 5 },
      { size_label: '40', stock: 5 },
      { size_label: '41', stock: 5 },
    ];
  }, [selectedProduct, selectedColor]);

  // Auto-select first color/size on product change
  useEffect(() => {
    if (selectedProduct) {
      if (availableColors.length > 0) {
        setSelectedColor(availableColors[0]);
      } else {
        setSelectedColor('');
      }
      setItemPriceOverride((selectedProduct.price / 100).toString());
    } else {
      setSelectedColor('');
      setSelectedSize('');
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
    function handleClickOutside(event: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pricing calculations
  const subtotalPaise = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.customPrice !== undefined ? item.customPrice * 100 : item.product.price;
      return acc + price * item.qty;
    }, 0);
  }, [cart]);

  const couponDiscountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round((subtotalPaise * appliedCoupon.discount_value) / 100);
    } else {
      return Math.min(subtotalPaise, appliedCoupon.discount_value * 100);
    }
  }, [appliedCoupon, subtotalPaise]);

  const manualDiscountPaise = customDiscount * 100;
  const totalDiscountPaise = Math.min(subtotalPaise, couponDiscountPaise + manualDiscountPaise);
  const discountedSubtotalPaise = Math.max(0, subtotalPaise - totalDiscountPaise);

  const gstMultiplier = gstRate > 0 ? gstRate / (100 + gstRate) : 0;
  const gstAmountPaise = Math.round(discountedSubtotalPaise * gstMultiplier);
  const baseAmountPaise = discountedSubtotalPaise - gstAmountPaise;
  const totalPayablePaise = discountedSubtotalPaise;

  const currentDrawerCash = useMemo(() => {
    const totalCashSales =
      paymentMethod === 'cash' ? totalPayablePaise / 100 : 0;
    const totalDrops = cashDrops.reduce((acc, d) => acc + d.amount, 0);
    return drawerStartCash + totalCashSales - totalDrops;
  }, [drawerStartCash, totalPayablePaise, paymentMethod, cashDrops]);

  const handleAddItemToBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('error', 'Select Product', 'Please choose a product from the list.');
      return;
    }
    if (!selectedSize) {
      showToast('error', 'Select Size', 'Please choose a size variant.');
      return;
    }

    const priceOverrideNum = parseFloat(itemPriceOverride);
    const customPrice = !isNaN(priceOverrideNum) ? priceOverrideNum : undefined;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.product.id === selectedProduct.id &&
          it.size === selectedSize &&
          it.color === selectedColor
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].qty += itemQty;
        if (customPrice !== undefined) next[existingIdx].customPrice = customPrice;
        return next;
      }

      return [
        ...prev,
        {
          product: selectedProduct,
          size: selectedSize,
          color: selectedColor,
          qty: itemQty,
          customPrice,
        },
      ];
    });

    showToast('success', 'Item Added', `${selectedProduct.name} added to cart.`);
    setSelectedProduct(null);
    setSearchProductQuery('');
    setItemQty(1);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any[]
    );
  };

  const updateCustomPrice = (index: number, priceStr: string) => {
    const val = parseFloat(priceStr);
    setCart((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, customPrice: !isNaN(val) ? val : undefined } : item
      )
    );
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const found = coupons.find(
      (c) => c.code.toLowerCase() === couponCode.trim().toLowerCase() && c.active
    );
    if (found) {
      setAppliedCoupon(found);
      showToast('success', 'Coupon Applied', `${found.code} applied.`);
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
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Retail POS Terminal & Quick Invoicing
          </CardTitle>
          <CardDescription>
            Realtime counter billing, omni-channel orders, and cash drawer management
          </CardDescription>
        </div>

        {/* Channel Selector & Drawer Balance */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Channel:
            </span>
            {(['in-store', 'whatsapp', 'instagram', 'phone'] as SaleChannel[]).map((ch) => (
              <Button
                key={ch}
                size="sm"
                variant={saleChannel === ch ? 'default' : 'outline'}
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
                className={`h-8 text-xs font-bold ${
                  saleChannel === ch ? channelColors[ch] : ''
                }`}
              >
                {ch === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 mr-1" />}
                {ch === 'instagram' && <InstagramIcon className="w-3.5 h-3.5 mr-1" />}
                {ch === 'in-store' && <Package className="w-3.5 h-3.5 mr-1" />}
                {ch === 'phone' && <Smartphone className="w-3.5 h-3.5 mr-1" />}
                {ch === 'in-store' ? 'In-Store' : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDrawerManager(!showDrawerManager)}
            className="h-8 font-bold text-xs"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 mr-1" />
            Drawer: ₹{currentDrawerCash.toFixed(0)}
          </Button>
        </div>
      </Card>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Product Selection & Bill Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Product Selection Form */}
          <Card className="p-5 space-y-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Select Product & Variant
            </CardTitle>

            <form onSubmit={handleAddItemToBill} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Product Search */}
              <div className="md:col-span-5 relative" ref={productDropdownRef}>
                <Label className="mb-1">Product / SKU</Label>
                <div className="relative">
                  <Input
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
                    className="pr-8 text-xs font-semibold"
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
                <Label className="mb-1">Color</Label>
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
                <Label className="mb-1">Size & Stock</Label>
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
                <Label className="mb-1">Unit Price (₹)</Label>
                <Input
                  type="number"
                  disabled={!selectedProduct}
                  value={itemPriceOverride}
                  onChange={(e) => setItemPriceOverride(e.target.value)}
                  placeholder="0.00"
                  className="text-right font-mono text-xs"
                />
              </div>

              {/* Submit Add */}
              <div className="md:col-span-1">
                <Button
                  type="submit"
                  disabled={!selectedProduct}
                  size="icon"
                  className="w-full h-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Card>

          {/* Cart Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                Cart Items ({cart.length})
              </h3>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCart([])}
                  className="text-rose-600 dark:text-rose-400 p-0 h-auto text-[10px] font-bold uppercase tracking-wider"
                >
                  Clear All
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Description</TableHead>
                  <TableHead className="w-32">Unit Rate (₹)</TableHead>
                  <TableHead className="w-28 text-center">Qty</TableHead>
                  <TableHead className="w-28 text-right">Subtotal</TableHead>
                  <TableHead className="w-12 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14 text-center text-slate-400 italic">
                      Select a product above to add items to invoice
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, idx) => {
                    const itemPrice =
                      item.customPrice !== undefined ? item.customPrice : item.product.price / 100;
                    return (
                      <TableRow key={`${item.product.id}-${item.size}-${item.color}`}>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.customPrice !== undefined ? item.customPrice : ''}
                            placeholder={(item.product.price / 100).toString()}
                            onChange={(e) => updateCustomPrice(idx, e.target.value)}
                            className="w-24 h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{(itemPrice * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* RIGHT: Checkout & Summary Panel (4 cols) */}
        <Card className="lg:col-span-4 p-4 space-y-4">
          {/* Customer Details */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Customer Information
            </span>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-white dark:bg-slate-900"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Phone (+91...)"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-white dark:bg-slate-900 font-mono"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Quick Share Links */}
            {(saleChannel === 'whatsapp' || saleChannel === 'instagram') && (
              <Button
                onClick={handleShareWhatsApp}
                className={`w-full text-xs font-bold ${
                  saleChannel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {saleChannel === 'whatsapp' ? (
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <InstagramIcon className="w-3.5 h-3.5 mr-1" />
                )}
                Share Cart via {saleChannel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
              </Button>
            )}
          </div>

          {/* Coupons & Manual Discount */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[9px]">Promo Coupon</Label>
              <div className="flex gap-1">
                <Input
                  type="text"
                  placeholder="CODE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="uppercase font-mono text-[10px]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleApplyCoupon}
                  className="px-2.5 text-[9px] font-bold"
                >
                  Apply
                </Button>
              </div>
              {appliedCoupon && (
                <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {appliedCoupon.code} active
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">Flat Discount (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={customDiscount || ''}
                onChange={(e) => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="text-right font-mono text-xs"
              />
            </div>
          </div>

          {/* GST & Payment Selector */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="space-y-1">
              <Label className="text-[9px]">GST Rate</Label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="0">0% Exempt</option>
                <option value="5">5% GST (Footwear)</option>
                <option value="12">12% GST (Standard)</option>
                <option value="18">18% GST (Luxury)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">Payment Mode</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
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
          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 text-white font-bold text-xs uppercase tracking-wider ${
              saleChannel === 'whatsapp'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : saleChannel === 'instagram'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700'
            }`}
          >
            {paymentIcons[paymentMethod]}
            <span className="ml-1.5">
              {saleChannel === 'whatsapp'
                ? 'Confirm WhatsApp Sale'
                : saleChannel === 'instagram'
                ? 'Confirm Instagram Sale'
                : 'Complete Sale & Print'}
            </span>
          </Button>
        </Card>
      </div>

      {/* Cash Drawer Dialog */}
      <Dialog open={showDrawerManager} onOpenChange={setShowDrawerManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Cash Drawer Ledger
            </DialogTitle>
            <DialogDescription>Track daily opening float and cash outflows</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
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
                <Label className="mb-1">Amount (₹)</Label>
                <Input
                  type="number"
                  required
                  value={dropAmount || ''}
                  onChange={(e) =>
                    setDropAmount(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  placeholder="0.00"
                  className="bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="mb-1">Reason</Label>
                <Input
                  type="text"
                  required
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="e.g. Bank deposit, vendor payout"
                  className="bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <Button type="submit" variant="destructive" className="w-full text-xs font-bold">
                Record Outflow
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Print Dialog */}
      <Dialog open={!!printedOrder} onOpenChange={(open) => !open && setPrintedOrder(null)}>
        {printedOrder && (
          <DialogContent className="sm:max-w-sm bg-white text-slate-900">
            <div className="w-full text-center space-y-1 font-mono border-b border-dashed border-slate-300 pb-4 mb-2 text-[10px]">
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

            <div className="w-full text-left font-mono text-[9px] border-b border-dashed border-slate-300 pb-3 mb-2 space-y-0.5">
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

            <div className="w-full font-mono text-[10px] border-b border-dashed border-slate-300 pb-3 mb-2">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 mb-1">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/3 text-right">Amount</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
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

            <div className="w-full font-mono text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-3 mb-2">
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
              <Button
                onClick={() => window.print()}
                className="flex-1 text-xs font-bold uppercase tracking-wider"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={() => setPrintedOrder(null)}
                className="flex-1 text-xs font-bold uppercase tracking-wider"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
