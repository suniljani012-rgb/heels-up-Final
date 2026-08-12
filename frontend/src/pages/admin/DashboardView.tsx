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
  return (
    <div className="space-y-6 animate-fade-in text-[#2B3674] font-sans pb-16">
      {/* Refined Horizon Metric Widgets (Enterprise Typography Scale) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Horizon Widget 1: Gross Revenue */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FE] dark:bg-navy-700 text-[#422AFB] dark:text-white flex items-center justify-center font-bold text-lg shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Gross Revenue</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {formatCurrency(totalRevenue)}
              </h4>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${growth >= 0 ? 'bg-emerald-50 text-[#01B574]' : 'bg-rose-50 text-[#EE5D50]'}`}>
              <TrendingUp className="w-3 h-3" /> {growth >= 0 ? `+${growth}%` : `${growth}%`}
            </span>
            <p className="text-[10px] text-[#A3AED0] font-semibold mt-0.5">Web: {formatCurrency(data?.total_sales || 0)}</p>
          </div>
        </div>

        {/* Horizon Widget 2: Total Orders */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FE] dark:bg-navy-700 text-[#422AFB] dark:text-white flex items-center justify-center font-bold text-lg shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Total Orders</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {totalOrdersCount}
              </h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-[#422AFB] bg-indigo-50 px-2 py-0.5 rounded-full">
              Live DB
            </span>
            <p className="text-[10px] text-[#A3AED0] font-semibold mt-0.5">Online: {data?.orders_count || 0} | POS: {data?.pos_sales_count || 0}</p>
          </div>
        </div>

        {/* Horizon Widget 3: Average Order Value (AOV) */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FE] dark:bg-navy-700 text-[#422AFB] dark:text-white flex items-center justify-center font-bold text-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Average Order Value (AOV)</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {formatCurrency(data?.aov || 0)}
              </h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Basket Size
            </span>
            <p className="text-[10px] text-[#A3AED0] font-semibold mt-0.5">Per Paid Transaction</p>
          </div>
        </div>

        {/* Horizon Widget 4: Low Stock Inventory Risk */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-navy-700 text-[#EE5D50] flex items-center justify-center font-bold text-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Low Stock Risk Items</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {lowStockList.length} <span className="text-xs font-semibold text-[#EE5D50]">Products (≤5)</span>
              </h4>
            </div>
          </div>
          <div className="text-right">
            <button onClick={() => onTabChange('stock')} className="text-xs font-bold text-[#422AFB] hover:underline flex items-center gap-0.5">
              Restock <ArrowUpRight className="w-3 h-3" />
            </button>
            <p className="text-[10px] text-[#EE5D50] font-semibold mt-0.5">Action Required</p>
          </div>
        </div>

        {/* Horizon Widget 5: Repeat Customers */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FE] dark:bg-navy-700 text-[#01B574] flex items-center justify-center font-bold text-lg shrink-0">
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Repeat Customer Base</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {data?.repeatCustomers || 0} <span className="text-xs font-semibold text-[#A3AED0]">Returning</span>
              </h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-[#01B574] bg-emerald-50 px-2 py-0.5 rounded-full">
              High Loyalty
            </span>
            <p className="text-[10px] text-[#A3AED0] font-semibold mt-0.5">Multi-Order History</p>
          </div>
        </div>

        {/* Horizon Widget 6: Pending Returns */}
        <div className="rounded-2xl bg-white dark:bg-[#111C44] p-4.5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 flex items-center justify-between transition-all hover:shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-navy-700 text-[#FFB547] flex items-center justify-center font-bold text-lg shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Pending Exchanges</p>
              <h4 className="text-xl font-extrabold text-[#1B2559] dark:text-white mt-0.5 tracking-tight">
                {returns.filter(r => r.status === 'pending').length} <span className="text-xs font-semibold text-[#FFB547]">Requests</span>
              </h4>
            </div>
          </div>
          <div className="text-right">
            <button onClick={() => onTabChange('returns')} className="text-xs font-bold text-[#422AFB] hover:underline flex items-center gap-0.5">
              Review <ArrowUpRight className="w-3 h-3" />
            </button>
            <p className="text-[10px] text-[#A3AED0] font-semibold mt-0.5">Requires Action</p>
          </div>
        </div>
      </div>

      {/* Horizon Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Horizon Total Spent Revenue Area Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#111C44] p-5 shadow-[0px_14px_30px_rgba(112,144,176,0.08)] border border-slate-100 dark:border-navy-700 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <div>
              <p className="text-[10px] font-extrabold text-[#A3AED0] uppercase tracking-wider">Total Sales Stream</p>
              <h3 className="text-lg font-bold text-[#1B2559] dark:text-white tracking-tight flex items-center gap-2.5">
                {formatCurrency(totalRevenue)}
                <span className="text-[10px] font-bold text-[#01B574] bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Realtime D1 Sync
                </span>
              </h3>
            </div>
            <button
              onClick={() => setCollapsedSalesTrend(!collapsedSalesTrend)}
              className="text-xs font-bold text-[#422AFB] hover:underline"
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
                      <linearGradient id="colorRevenueHorizon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#422AFB" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#422AFB" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#A3AED0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#A3AED0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111C44',
                        borderRadius: '16px',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 18px 40px rgba(112, 144, 176, 0.2)',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#8171FC' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#422AFB"
                      strokeWidth={3.5}
                      fillOpacity={1}
                      fill="url(#colorRevenueHorizon)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#A3AED0] italic">
                  No sales recorded in the selected period.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Horizon PieChartCard Category Share */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-4">
            <div>
              <p className="text-xs font-bold text-[#A3AED0] uppercase tracking-wider">Your Categories</p>
              <h3 className="text-lg font-bold text-[#2B3674] dark:text-white">Category Share</h3>
            </div>
            <button
              onClick={() => setCollapsedCategoryShare(!collapsedCategoryShare)}
              className="text-xs font-bold text-[#422AFB] hover:underline"
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
                        const COLORS = ['#4318FF', '#6AD2FF', '#01B574', '#FFB547', '#EE5D50', '#8B5CF6'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111C44',
                        borderRadius: '12px',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#6AD2FF' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}%`, 'Share']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: any) => (
                        <span className="text-xs font-semibold text-[#2B3674] dark:text-white font-sans px-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#A3AED0] italic">
                  No category sales recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Horizon Complex Data Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Low Stock Risk Inventory Data Grid */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-[#EE5D50] flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2B3674] dark:text-white">Low Stock Risk Report</h3>
                <p className="text-xs text-[#A3AED0]">Items with ≤5 units remaining</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('stock')}
              className="text-xs font-bold text-[#EE5D50] hover:underline flex items-center gap-1"
            >
              Manage Stock <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {lowStockList.slice(0, 5).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#F4F7FE] flex items-center justify-center text-[#422AFB] font-bold text-xs">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2B3674] dark:text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-[#A3AED0] font-mono">SKU: {item.sku || `PROD-${item.id}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-[#EE5D50]">
                    {item.stock} left
                  </span>
                  <button
                    onClick={() => onTabChange('stock')}
                    className="text-xs text-[#422AFB] font-bold hover:underline"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}
            {lowStockList.length === 0 && (
              <div className="py-8 text-center text-xs text-[#A3AED0] italic">
                All inventory stock levels are healthy.
              </div>
            )}
          </div>
        </div>

        {/* Table 2: Top Active Promo Coupons */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#422AFB] flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2B3674] dark:text-white">Active Promo Coupons</h3>
                <p className="text-xs text-[#A3AED0]">Real redemption performance</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('coupons')}
              className="text-xs font-bold text-[#422AFB] hover:underline flex items-center gap-1"
            >
              Coupons Manager <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {couponsList.map((cp) => (
              <div key={cp.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="px-3 py-1 rounded-lg bg-[#F4F7FE] text-[#422AFB] font-mono text-xs font-bold border border-indigo-100">
                    {cp.code}
                  </span>
                  <p className="text-[11px] text-[#A3AED0] mt-1">
                    {cp.discount}% Discount • Max Uses: {cp.max_uses || 'Unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#2B3674] dark:text-white font-mono">{cp.used_count} Redemptions</span>
                  <p className="text-[10px] text-[#01B574] font-semibold">Active Code</p>
                </div>
              </div>
            ))}
            {couponsList.length === 0 && (
              <div className="py-8 text-center text-xs text-[#A3AED0] italic">
                No active promo codes found in database.
              </div>
            )}
          </div>
        </div>

        {/* Table 3: Recent Orders Live Log */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <h3 className="text-base font-bold text-[#2B3674] dark:text-white">Recent Customer Orders</h3>
            <button
              onClick={() => onTabChange('orders')}
              className="text-xs font-bold text-[#422AFB] hover:underline flex items-center gap-1"
            >
              View Orders Registry <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {recentOrdersList.slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-[#2B3674] dark:text-white font-mono">#{ord.order_number}</p>
                  <p className="text-[11px] text-[#A3AED0] truncate">{ord.customer_name || 'Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-[#2B3674] dark:text-white">{formatCurrency(ord.total_amount || 0)}</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ord.order_status === 'delivered' ? 'bg-emerald-50 text-[#01B574]' :
                    ord.order_status === 'cancelled' ? 'bg-rose-50 text-[#EE5D50]' : 'bg-indigo-50 text-[#422AFB]'
                  }`}>
                    {ord.order_status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {recentOrdersList.length === 0 && (
              <div className="py-8 text-center text-xs text-[#A3AED0] italic">
                No orders recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Table 4: Top Selling Products */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100 dark:border-navy-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
            <h3 className="text-base font-bold text-[#2B3674] dark:text-white">Top Selling Products</h3>
            <button
              onClick={() => onTabChange('products')}
              className="text-xs font-bold text-[#422AFB] hover:underline flex items-center gap-1"
            >
              Products Catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-navy-700">
            {topProductsList.slice(0, 5).map((tp) => (
              <div key={tp.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {tp.image_url ? (
                    <img src={tp.image_url} alt={tp.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#F4F7FE] flex items-center justify-center text-[#422AFB] font-bold text-xs">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2B3674] dark:text-white truncate">{tp.name}</p>
                    <p className="text-[11px] text-[#A3AED0] font-mono">{tp.sold} Units Sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#2B3674] dark:text-white">{formatCurrency(tp.revenue || 0)}</p>
                  <p className="text-[10px] text-[#01B574] font-semibold">Top Revenue</p>
                </div>
              </div>
            ))}
            {topProductsList.length === 0 && (
              <div className="py-8 text-center text-xs text-[#A3AED0] italic">
                No product sales recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
