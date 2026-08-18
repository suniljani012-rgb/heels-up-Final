import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ShoppingCart,
  Footprints,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  CreditCard,
  PackagePlus,
  Boxes,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  UserCheck
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Separator } from '../../components/ui/separator';

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
  category: string;
  sizes?: { size_label: string; stock: number }[];
}

export interface DashboardData {
  total_sales: number;
  total_pos_sales: number;
  orders_count: number;
  pos_sales_count: number;
  aov?: number;
  repeatCustomers?: number;
  salesGrowth?: number;
  daily_sales?: DailySale[];
  category_sales?: CategorySale[];
  low_stock_products?: LowStockItem[];
}

interface DashboardViewProps {
  data: DashboardData | null;
  orders?: Order[];
  products: Product[];
  returns: ReturnRequest[];
  onRefresh?: () => void;
  onTabChange: (tab: any) => void;
  dataLoading?: boolean;
}

const CATEGORY_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function DashboardView({
  data,
  orders = [],
  products,
  returns,
  onRefresh = () => {},
  onTabChange,
  dataLoading = false
}: DashboardViewProps) {
  const [salesTimeframe, setSalesTimeframe] = useState<'7d' | '30d'>('7d');

  // Format currency from paise to INR (e.g. 229900 paise -> ₹2,299)
  const formatPaise = (valInPaise: number | string) => {
    const num = (typeof valInPaise === 'string' ? parseFloat(valInPaise) : Number(valInPaise) || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // 100% Live Real GMV Revenue in paise from non-cancelled orders
  const totalRevenuePaise = useMemo(() => {
    if (orders && orders.length > 0) {
      return orders
        .filter((o) => o.order_status !== 'cancelled')
        .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    }
    const apiRev = Number(data?.total_sales || (data as any)?.totalRevenue || 0);
    return apiRev > 10000 ? apiRev : apiRev * 100;
  }, [orders, data]);

  const totalOrdersCount =
    orders && orders.length > 0
      ? orders.length
      : Number(data?.orders_count || (data as any)?.totalOrders || 0) + Number(data?.pos_sales_count || 0);

  const aovValuePaise =
    totalOrdersCount > 0
      ? Math.round(totalRevenuePaise / totalOrdersCount)
      : Number(data?.aov || 0) * 100;

  // Real Low stock items
  const lowStockList = useMemo(() => {
    if (products && products.length > 0) return products.filter((p) => p.stock <= 5);
    if ((data as any)?.lowStockItems && Array.isArray((data as any).lowStockItems)) {
      return (data as any).lowStockItems;
    }
    return [];
  }, [products, data]);

  // 100% Live Daily Sales Velocity Chart grouped by real order dates (in Rupees for chart axis)
  const chartData = useMemo(() => {
    const days = salesTimeframe === '7d' ? 7 : 30;
    const result = [];
    const now = new Date();

    const hasRealOrders = orders && orders.length > 0;
    if (!hasRealOrders && data?.daily_sales && data.daily_sales.length > 0) {
      return data.daily_sales.map((item) => ({
        name: item.label,
        revenue: item.revenue > 1000 ? Math.round(item.revenue / 100) : item.revenue,
        orders: 0
      }));
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayLabel = days === 7 ? dayName : `${d.getDate()}/${d.getMonth() + 1}`;

      const dayOrders = (orders || []).filter(
        (o) => o.created_at && o.created_at.startsWith(dateKey) && o.order_status !== 'cancelled'
      );
      const dayRevPaise = dayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      result.push({
        name: dayLabel,
        revenue: Math.round(dayRevPaise / 100),
        orders: dayOrders.length
      });
    }
    return result;
  }, [orders, data, salesTimeframe]);

  // 100% Live Category Revenue / Catalog Distribution Normalized (0 - 100%)
  const categoryDistribution = useMemo(() => {
    if (data?.category_sales && data.category_sales.length > 0) {
      const total = data.category_sales.reduce((s: number, c: any) => s + (Number(c.value) || 0), 0);
      return data.category_sales.map((c: any) => ({
        category: c.category,
        value: total > 0 ? Math.round(((Number(c.value) || 0) / total) * 100) : 100,
        amount: Math.round((Number(c.value) || 0) / 100),
      }));
    }

    const catMap: { [cat: string]: number } = {};

    (orders || []).forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const prod = (products || []).find((p) => p.id === it.product_id || p.name === it.product_name);
          const cat = prod?.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (Number(it.price) * (it.quantity || 1));
        });
      }
    });

    if (Object.keys(catMap).length === 0 && products && products.length > 0) {
      products.forEach((p) => {
        const cat = p.category || 'Footwear';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
    }

    const totalRaw = Object.values(catMap).reduce((a, b) => a + b, 0);
    if (totalRaw <= 0) {
      return [{ category: 'Catalog', value: 100, amount: 0 }];
    }

    const items = Object.entries(catMap).map(([category, rawVal]) => {
      const pct = Math.round((rawVal / totalRaw) * 100);
      return {
        category,
        value: pct,
        amount: Math.round(rawVal / 100),
      };
    });

    return items.length > 0 ? items : [{ category: 'Catalog', value: 100, amount: 0 }];
  }, [orders, products, data]);

  // 100% Live Repeat Customer Rate
  const repeatCustomerRate = useMemo(() => {
    if (data?.repeatCustomers !== undefined && data.repeatCustomers > 0) {
      return `${data.repeatCustomers}`;
    }
    const custCounts: { [key: string]: number } = {};
    (orders || []).forEach((o) => {
      const id = o.customer_phone || o.customer_email || o.customer_name;
      if (id) custCounts[id] = (custCounts[id] || 0) + 1;
    });
    const uniqueCusts = Object.keys(custCounts).length;
    if (uniqueCusts === 0) return '0.0%';
    const repeatCusts = Object.values(custCounts).filter((c) => c > 1).length;
    return `${((repeatCusts / uniqueCusts) * 100).toFixed(1)}%`;
  }, [orders, data]);

  // 100% Live Return & Exchange Rate
  const returnRate = useMemo(() => {
    if (!orders || orders.length === 0) return '0.0%';
    return `${(((returns?.length || 0) / orders.length) * 100).toFixed(1)}%`;
  }, [orders, returns]);

  // Recent Orders List
  const recentOrdersList = useMemo(() => {
    if (orders && orders.length > 0) return orders.slice(0, 5);
    if ((data as any)?.recentOrders && Array.isArray((data as any).recentOrders)) {
      return (data as any).recentOrders.slice(0, 5);
    }
    return [];
  }, [orders, data]);

  return (
    <div className="space-y-3.5 antialiased font-sans">
      {/* Clean Executive Action Toolbar */}
      <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Store Overview</h2>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Real-time omnichannel sales & inventory</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onTabChange('pos')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs h-7 text-xs px-3 font-bold rounded-lg"
              size="sm"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              <span>Launch POS</span>
            </Button>

            <Button
              onClick={() => onTabChange('products')}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 font-semibold rounded-lg"
            >
              <PackagePlus className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Add Product</span>
            </Button>

            <Button
              onClick={() => onTabChange('stock')}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 font-semibold rounded-lg"
            >
              <Boxes className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Inventory Matrix</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Metrics Cards - High Density Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* KPI 1: Gross Revenue */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross GMV</span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
            {formatPaise(totalRevenuePaise)}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Online: {formatPaise((data as any)?.total_sales || totalRevenuePaise)}</span>
          </div>
        </Card>

        {/* KPI 2: Total Processed Orders */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
            {totalOrdersCount}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Processed: {totalOrdersCount}</span>
          </div>
        </Card>

        {/* KPI 3: Average Order Value */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AOV Basket</span>
            <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
            {formatPaise(aovValuePaise)}
          </h3>
          <div className="mt-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
            Avg / Transaction
          </div>
        </Card>

        {/* KPI 4: Low Stock Alert */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Low Stock</span>
            <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 tracking-tight font-mono">
            {lowStockList.length}{' '}
            <span className="text-[10px] font-normal text-slate-400">styles</span>
          </h3>
          <div className="mt-1">
            <button
              onClick={() => onTabChange('stock')}
              className="text-[10px] font-bold text-rose-600 hover:underline inline-flex items-center"
            >
              Restock <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
            </button>
          </div>
        </Card>

        {/* KPI 5: Customer Loyalty */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retention</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
            {repeatCustomerRate}
          </h3>
          <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Repeat Customers
          </div>
        </Card>

        {/* KPI 6: Pending Returns */}
        <Card className="p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returns</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 tracking-tight font-mono">
            {returns?.length || 0}{' '}
            <span className="text-[10px] font-normal text-slate-400">claims</span>
          </h3>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <button
              onClick={() => onTabChange('returns')}
              className="font-bold text-amber-600 hover:underline inline-flex items-center"
            >
              Review <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
            </button>
            <span className="text-slate-400">{returnRate}</span>
          </div>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left 2 Cols: Sales Revenue Trend AreaChart */}
        <Card className="lg:col-span-2 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <div>
              <CardTitle className="text-xs font-bold">Revenue Velocity Trend</CardTitle>
              <CardDescription className="text-[10px]">Daily online & POS aggregate GMV</CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <Button
                variant={salesTimeframe === '7d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSalesTimeframe('7d')}
                className="h-6 text-[10px] px-2"
              >
                7 Days
              </Button>
              <Button
                variant={salesTimeframe === '30d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSalesTimeframe('30d')}
                className="h-6 text-[10px] px-2"
              >
                30 Days
              </Button>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="indigoArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    padding: '6px 10px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#indigoArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right 1 Col: Category Share PieChart */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <CardTitle className="text-xs font-bold">Category Distribution</CardTitle>
            <CardDescription className="text-[10px]">Sales volume share by category</CardDescription>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={62}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="category"
                >
                  {categoryDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    padding: '4px 8px'
                  }}
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
            {categoryDistribution.map((cat: any, idx: number) => (
              <div key={cat.category} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{cat.category}</span>
                <span className="text-slate-400 font-mono ml-auto">{cat.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Dual Tables: Recent Orders & Urgent Inventory Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Recent Orders Registry Table (8 cols) */}
        <Card className="lg:col-span-8 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Orders Stream
              </h4>
              <p className="text-[10px] text-slate-400">Live order pipeline & dispatch fulfillment</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('orders')}
              className="text-xs h-7 px-2.5 font-bold"
            >
              All Orders <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2">Order #</TableHead>
                <TableHead className="py-2">Customer</TableHead>
                <TableHead className="py-2">Channel</TableHead>
                <TableHead className="py-2">Amount</TableHead>
                <TableHead className="py-2">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrdersList.map((ord: any) => (
                <TableRow key={ord.id}>
                  <TableCell className="py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    #{ord.order_number}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-semibold text-slate-900 dark:text-white block text-xs truncate max-w-[120px]">
                      {ord.customer_name || 'Guest Buyer'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{ord.customer_phone || ord.customer_email || '—'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="capitalize text-[9px] px-1.5 py-0 font-mono">
                      {ord.source || (ord.is_pos ? 'pos' : 'web')}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {formatPaise(ord.total_amount)}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={
                        ord.order_status === 'delivered' || ord.order_status === 'Completed'
                          ? 'success'
                          : ord.order_status === 'cancelled'
                          ? 'destructive'
                          : 'info'
                      }
                      className="capitalize text-[9px] px-1.5 py-0"
                    >
                      {ord.order_status || 'placed'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {recentOrdersList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                    No recent order records available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Low Stock Watchlist (4 cols) */}
        <Card className="lg:col-span-4 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Inventory Alert
              </h4>
              <p className="text-[10px] text-slate-400">Products requiring replenishment</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('stock')}
              className="text-xs h-7 px-2 font-bold"
            >
              Restock <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowStockList.slice(0, 5).map((prod: any) => (
              <div key={prod.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-xs block truncate">
                    {prod.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    SKU: {prod.sku} • {prod.category}
                  </span>
                </div>
                <Badge variant="destructive" className="font-mono text-[10px] shrink-0">
                  {prod.stock} left
                </Badge>
              </div>
            ))}

            {lowStockList.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                All catalog inventory levels are healthy.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
