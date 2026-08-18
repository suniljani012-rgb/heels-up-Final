import React, { useState } from 'react';
import {
  Wallet,
  ShoppingCart,
  Footprints,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  CreditCard,
  PackagePlus,
  Boxes,
  Tag
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

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

  // Real Database Revenue Data
  const trendData: DailySale[] = data?.daily_sales || [];
  
  // Real Database Category Share Data
  const catShare: CategorySale[] = data?.category_sales || [];

  // Real Low Stock Items
  const lowStockList: LowStockItem[] = data?.lowStockItems || products.filter(p => p.stock <= 5).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    price: p.price,
    category: p.category,
    image_url: p.images && p.images.length ? p.images[0] : undefined
  }));

  // Real Coupon Data
  const couponsList: CouponReportItem[] = data?.topCoupons || [];

  // Real Recent Orders
  const recentOrdersList: Order[] = data?.recentOrders || [];

  // Real Top Selling Products
  const topProductsList: TopProductItem[] = data?.topProducts || [];

  const totalRevenue = (data?.total_sales || 0) + (data?.total_pos_sales || 0);
  const totalOrdersCount = (data?.orders_count || 0) + (data?.pos_sales_count || 0);
  const growth = data?.revenueGrowth || 0;

  const categoryColors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-6 antialiased">
      {/* Quick Operations Launch Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Store Command Center</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick actions and high-priority operational tasks</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onTabChange('pos')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Launch POS Terminal</span>
          </button>

          <button
            onClick={() => onTabChange('products')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700/50 shadow-xs transition-colors"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Manage Products</span>
          </button>

          <button
            onClick={() => onTabChange('stock')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Gross Revenue */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                growth >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
              }`}
            >
              <TrendingUp className="w-3 h-3" /> {growth >= 0 ? `+${growth}%` : `${growth}%`}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Gross Revenue
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Online: {formatCurrency(data?.total_sales || 0)}</span>
            <span>POS: {formatCurrency(data?.total_pos_sales || 0)}</span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
              Live DB
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Processed Orders
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {totalOrdersCount}
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Web Orders: {data?.orders_count || 0}</span>
            <span>POS Slips: {data?.pos_sales_count || 0}</span>
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
              Basket Metric
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Average Order Value (AOV)
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {formatCurrency(data?.aov || 0)}
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Per Paid Transaction</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">Healthy Range</span>
          </div>
        </div>

        {/* KPI 4: Low Stock Alert */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <button
              onClick={() => onTabChange('stock')}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              Restock <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Low Stock Risk Items
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {lowStockList.length}{' '}
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">(≤ 5 units left)</span>
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Inventory Alert</span>
            <span className="text-rose-600 font-semibold">{lowStockList.length > 0 ? 'Action Required' : 'All Clear'}</span>
          </div>
        </div>

        {/* KPI 5: Customer Loyalty */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Footprints className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              Repeat Base
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Repeat Customers
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {data?.repeatCustomers || 0}{' '}
              <span className="text-xs font-medium text-slate-400">Returning Buyers</span>
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>High Brand Retention</span>
            <span className="text-emerald-600 font-semibold">Active</span>
          </div>
        </div>

        {/* KPI 6: Pending Returns */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <button
              onClick={() => onTabChange('returns')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Review <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pending Exchanges & Returns
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {returns.filter((r) => r.status === 'pending').length}{' '}
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Requests</span>
            </h3>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Customer Service Queue</span>
            <span className="text-amber-600 font-semibold">Needs Approval</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Sales Revenue Trend */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Revenue Inflow Curve
              </p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(totalRevenue)}
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50">
                  <TrendingUp className="w-3 h-3" /> Live D1 Database
                </span>
              </div>
            </div>

            <button
              onClick={() => setCollapsedSalesTrend(!collapsedSalesTrend)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={collapsedSalesTrend ? 'Expand Chart' : 'Collapse Chart'}
            >
              {collapsedSalesTrend ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!collapsedSalesTrend && (
            <div className="h-72 pt-2">
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
                      <linearGradient id="colorRevenueModern" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        border: '1px solid #334155',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }}
                      itemStyle={{ color: '#818CF8' }}
                      labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenueModern)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No sales stream data available for current period.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Distribution */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Catalog Share
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Category Breakdown</h3>
            </div>

            <button
              onClick={() => setCollapsedCategoryShare(!collapsedCategoryShare)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={collapsedCategoryShare ? 'Expand' : 'Collapse'}
            >
              {collapsedCategoryShare ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!collapsedCategoryShare && (
            <div className="h-72 pt-1 flex flex-col items-center justify-center">
              {catShare.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catShare}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="category"
                    >
                      {catShare.map((_, index: number) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        border: '1px solid #334155',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#38BDF8' }}
                      labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}%`, 'Share']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: any) => (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No category transactions recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4-Grid Actionable Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Table 1: Low Stock Alert Feed */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Low Stock Risk Alert</h4>
                <p className="text-[11px] text-slate-400">Items requiring immediate reordering</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('stock')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowStockList.slice(0, 5).map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200/60 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || `PROD-${item.id}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                    {item.stock} left
                  </span>
                  <button
                    onClick={() => onTabChange('stock')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}

            {lowStockList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                All inventory stock levels are healthy.
              </div>
            )}
          </div>
        </div>

        {/* Table 2: Active Promo Coupons */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Promo Coupons</h4>
                <p className="text-[11px] text-slate-400">Coupon usage and redemption performance</p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('coupons')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Coupons <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {couponsList.slice(0, 5).map((cp) => (
              <div key={cp.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                    {cp.code}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {cp.discount}% Discount • Max: {cp.max_uses || 'Unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {cp.used_count} Used
                  </span>
                  <p className="text-[10px] text-emerald-600 font-medium">Active Code</p>
                </div>
              </div>
            ))}

            {couponsList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No active promo codes currently configured.
              </div>
            )}
          </div>
        </div>

        {/* Table 3: Recent Customer Orders */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Recent Customer Orders</h4>
            <button
              onClick={() => onTabChange('orders')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Registry <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentOrdersList.slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">#{ord.order_number}</p>
                  <p className="text-[11px] text-slate-400 truncate">{ord.customer_name || 'Customer'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatCurrency(ord.total_amount || 0)}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      ord.order_status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : ord.order_status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                    }`}
                  >
                    {ord.order_status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}

            {recentOrdersList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 italic">No recent orders found.</div>
            )}
          </div>
        </div>

        {/* Table 4: Top Selling Products */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Products</h4>
            <button
              onClick={() => onTabChange('products')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Catalog <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topProductsList.slice(0, 5).map((tp) => (
              <div key={tp.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {tp.image_url ? (
                    <img
                      src={tp.image_url}
                      alt={tp.name}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200/60 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                      HU
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{tp.name}</p>
                    <p className="text-[10px] text-slate-400">{tp.sold} Units Sold</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatCurrency(tp.revenue || 0)}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Top Velocity</p>
                </div>
              </div>
            ))}

            {topProductsList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400 italic">No sales recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
