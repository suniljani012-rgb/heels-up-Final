import React, { useState } from 'react';
import { Wallet, ShoppingCart, Footprints, RotateCcw, AlertTriangle, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export interface OrderItem {
  id: number | string;
  product_id?: number | null;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: number | string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'Completed';
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: 'web' | 'pos' | 'whatsapp' | 'instagram';
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  is_pos?: boolean;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  delivery_method?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  original_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  sizes: string[];
  images: string[];
  description?: string;
  brand?: string;
  tags?: string[];
  show_mrp?: boolean;
  meta_title?: string;
  meta_desc?: string;
  size_stock?: { size_label: string; stock: number; reserved?: number }[];
  sold_count?: number;
}

export interface ReturnItem {
  product_id: number;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_type: 'refund' | 'exchange';
  reason: string;
  items: ReturnItem[] | string;
  status: 'pending' | 'approved' | 'received' | 'completed' | 'rejected';
  action_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  images?: string;
  refund_amount?: number;
}

export interface DailySale {
  label: string;
  revenue: number;
}

export interface CategorySale {
  category: string;
  value: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
  image_url?: string;
}

export interface CouponReportItem {
  id: number;
  code: string;
  discount: number;
  type: string;
  used_count: number;
  max_uses: number | null;
  active: number | boolean;
}

export interface TopProductItem {
  id: number;
  name: string;
  price: number;
  sold: number;
  revenue: number;
  image_url?: string;
}

export interface DashboardData {
  total_sales: number;
  total_pos_sales: number;
  orders_count: number;
  pos_sales_count: number;
  aov?: number;
  repeatCustomers?: number;
  revenueGrowth?: number;
  daily_sales?: DailySale[];
  category_sales?: CategorySale[];
  lowStockItems?: LowStockItem[];
  topCoupons?: CouponReportItem[];
  recentOrders?: Order[];
  topProducts?: TopProductItem[];
}

interface DashboardViewProps {
  data: DashboardData | null;
  products: Product[];
  returns: ReturnRequest[];
  onTabChange: (tab: 'dashboard' | 'products' | 'stock' | 'orders' | 'categories' | 'customers' | 'reviews' | 'coupons' | 'banners' | 'pages' | 'settings' | 'pos' | 'audits' | 'returns' | 'analysis' | 'staff') => void;
}

export default function DashboardView({ data, products, returns, onTabChange }: DashboardViewProps) {
  const [collapsedSalesTrend, setCollapsedSalesTrend] = useState(false);
  const [collapsedCategoryShare, setCollapsedCategoryShare] = useState(false);

  // Format Currency (in paise to INR)
  const formatCurrency = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // 100% Real Database Revenue Data (Zero Dummy Data)
  const trendData: DailySale[] = data?.daily_sales || [];
  
  // 100% Real Database Category Share Data (Zero Dummy Data)
  const catShare: CategorySale[] = data?.category_sales || [];

  // 100% Real Low Stock Items (from DB or state)
  const lowStockList: LowStockItem[] = data?.lowStockItems || products.filter(p => p.stock <= 5).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    price: p.price,
    category: p.category,
    image_url: p.images && p.images.length ? p.images[0] : undefined
  }));

  // 100% Real Coupon Data
  const couponsList: CouponReportItem[] = data?.topCoupons || [];

  // 100% Real Recent Orders
  const recentOrdersList: Order[] = data?.recentOrders || [];

  // 100% Real Top Selling Products
  const topProductsList: TopProductItem[] = data?.topProducts || [];

  const totalRevenue = (data?.total_sales || 0) + (data?.total_pos_sales || 0);
  const totalOrdersCount = (data?.orders_count || 0) + (data?.pos_sales_count || 0);
  const growth = data?.revenueGrowth || 0;

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-16 bg-[#f4f6f8] -mx-4 md:-mx-8 p-4 md:p-8 rounded-3xl">
      {/* MUI Minimal Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Operations Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, Admin 👋
          </h1>
          <p className="text-xs text-slate-500">
            Real-time analytics computed directly from Cloudflare Edge D1 Database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('pos')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Open POS Terminal
          </button>
          <button
            onClick={() => onTabChange('stock')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-2"
          >
            <Footprints className="w-4 h-4" /> Stock Manager
          </button>
        </div>
      </div>

      {/* 6 Minimal Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Gross Revenue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className={`font-semibold flex items-center gap-1 ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <TrendingUp className="w-3.5 h-3.5" /> {growth >= 0 ? `+${growth}%` : `${growth}%`} vs last month
              </span>
              <span>Web: {formatCurrency(data?.total_sales || 0)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalOrdersCount}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Online Store: {data?.orders_count || 0}</span>
              <span>In-Store POS: {data?.pos_sales_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Average Order Value (AOV) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Order Value (AOV)</span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(data?.aov || 0)}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="text-violet-600 font-semibold">Per Paid Transaction</span>
              <span>Computed Realtime</span>
            </div>
          </div>
        </div>

        {/* Card 4: Low Stock Inventory Risk */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Risk Items</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {lowStockList.length} <span className="text-sm font-medium text-rose-500">Products (≤5 stock)</span>
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-rose-600 font-semibold">Inventory Alert</span>
              <button onClick={() => onTabChange('stock')} className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5">
                Restock <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Repeat Customers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repeat Customer Base</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Footprints className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data?.repeatCustomers || 0} <span className="text-sm font-medium text-slate-500">Returning Buyers</span>
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="text-sky-600 font-semibold">High Retention</span>
              <span>Database Verified</span>
            </div>
          </div>
        </div>

        {/* Card 6: Pending Exchanges / Returns */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Returns / Exchanges</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {returns.filter(r => r.status === 'pending').length} <span className="text-sm font-medium text-amber-600">Requests</span>
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Requires Action</span>
              <button onClick={() => onTabChange('returns')} className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5">
                Review <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Trend Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Revenue & Sales Performance
              </h3>
              <p className="text-xs text-slate-500">7-Day Real Revenue Stream (Online + POS Store)</p>
            </div>
            <button
              onClick={() => setCollapsedSalesTrend(!collapsedSalesTrend)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              {collapsedSalesTrend ? 'Expand Chart' : 'Collapse Chart'}
            </button>
          </div>

          {!collapsedSalesTrend && (
            <div className="h-72 pt-4">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData.map((d: DailySale) => ({
                      name: d.label,
                      Revenue: (d.revenue || 0) / 100
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenueMuiMaster" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#818cf8' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenueMuiMaster)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No sales recorded in the selected period.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Share Donut Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Category Share</h3>
              <p className="text-xs text-slate-500">Real database revenue distribution</p>
            </div>
            <button
              onClick={() => setCollapsedCategoryShare(!collapsedCategoryShare)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              {collapsedCategoryShare ? 'Expand' : 'Collapse'}
            </button>
          </div>

          {!collapsedCategoryShare && (
            <div className="h-72 pt-2 flex flex-col items-center justify-center">
              {catShare.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catShare}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="category"
                    >
                      {catShare.map((entry: CategorySale, index: number) => {
                        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#818cf8' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}%`, 'Share']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: any) => (
                        <span className="text-xs font-medium text-slate-600 font-sans px-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No category sales recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Database Business Reports Grid (4 Real Tables & Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Low Stock Risk Inventory Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Low Stock Risk Report</h3>
                <p className="text-xs text-slate-500">Products requiring inventory replenishment (≤5 units)</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('stock')}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              Manage Stock <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockList.slice(0, 5).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">SKU: {item.sku || `PROD-${item.id}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700">
                    {item.stock} left
                  </span>
                  <button
                    onClick={() => onTabChange('stock')}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}
            {lowStockList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                All inventory stock levels are healthy.
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Coupon Code Performance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Coupon & Promo Performance</h3>
                <p className="text-xs text-slate-500">Real redemption analytics</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('coupons')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Coupons Manager <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {couponsList.map((cp) => (
              <div key={cp.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200/60">
                    {cp.code}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {cp.discount}% Off • Max Uses: {cp.max_uses || 'Unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 font-mono">{cp.used_count} Redemptions</span>
                  <p className="text-[10px] text-emerald-600 font-semibold">Active Promo Code</p>
                </div>
              </div>
            ))}
            {couponsList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No active promo codes found in database.
              </div>
            )}
          </div>
        </div>

        {/* Widget 3: Recent Customer Orders Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Recent Customer Orders</h3>
            <button
              onClick={() => onTabChange('orders')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrdersList.slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-slate-900 font-mono">#{ord.order_number}</p>
                  <p className="text-[11px] text-slate-500 truncate">{ord.customer_name || 'Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">{formatCurrency(ord.total_amount || 0)}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    ord.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    ord.order_status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {ord.order_status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {recentOrdersList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No orders recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Widget 4: Top Selling Products */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Top Selling Products</h3>
            <button
              onClick={() => onTabChange('products')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              All Products <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {topProductsList.slice(0, 5).map((tp) => (
              <div key={tp.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {tp.image_url ? (
                    <img src={tp.image_url} alt={tp.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{tp.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{tp.sold} Sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrency(tp.revenue || 0)}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Top Revenue</p>
                </div>
              </div>
            ))}
            {topProductsList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No product sales recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
