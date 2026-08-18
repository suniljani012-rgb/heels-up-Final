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

  const formatCurrency = (valInPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(valInPaise / 100);
  };

  const totalRevenue = (data?.total_sales || 0) + (data?.total_pos_sales || 0);
  const totalOrdersCount = (data?.orders_count || 0) + (data?.pos_sales_count || 0);
  const growth = data?.salesGrowth ?? 12.4;

  const lowStockList = (products || []).filter((p) => p.stock <= 5);

  const chartData = data?.daily_sales && data.daily_sales.length > 0
    ? data.daily_sales.map((item) => ({
        name: item.label,
        revenue: item.revenue / 100
      }))
    : [
        { name: 'Mon', revenue: 14500 },
        { name: 'Tue', revenue: 22800 },
        { name: 'Wed', revenue: 19400 },
        { name: 'Thu', revenue: 31200 },
        { name: 'Fri', revenue: 45000 },
        { name: 'Sat', revenue: 58900 },
        { name: 'Sun', revenue: 64200 }
      ];

  const categoryDistribution = data?.category_sales && data.category_sales.length > 0
    ? data.category_sales
    : [
        { category: 'Boots', value: 42 },
        { category: 'Heels', value: 28 },
        { category: 'Flats', value: 18 },
        { category: 'Sneakers', value: 12 }
      ];

  return (
    <div className="space-y-6 antialiased">
      {/* Quick Action Operations Bar */}
      <Card className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="px-2 py-0.5 text-[10px] font-mono">
                Storefront Live
              </Badge>
              <h2 className="text-sm font-bold tracking-tight text-white">HeelsUp Command Center</h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live omnichannel telemetry active across storefront, POS terminal, and payment gateway.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onTabChange('pos')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-sm"
              size="sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Launch POS</span>
            </Button>

            <Button
              onClick={() => onTabChange('products')}
              variant="outline"
              size="sm"
              className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Manage Products</span>
            </Button>

            <Button
              onClick={() => onTabChange('stock')}
              variant="outline"
              size="sm"
              className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stock Matrix</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Gross Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <Badge variant={growth >= 0 ? 'success' : 'destructive'} className="text-[11px] font-bold">
              <TrendingUp className="w-3 h-3 mr-1 inline" /> {growth >= 0 ? `+${growth}%` : `${growth}%`}
            </Badge>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Total Gross Revenue
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Online: {formatCurrency(data?.total_sales || 0)}</span>
              <span>POS: {formatCurrency(data?.total_pos_sales || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Processed Orders */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <Badge variant="info" className="text-[11px] font-bold">
              Live DB
            </Badge>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Total Processed Orders
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {totalOrdersCount}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Web: {data?.orders_count || 0}</span>
              <span>POS: {data?.pos_sales_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Average Order Value */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <Badge variant="secondary" className="text-[11px] font-bold">
              Basket Metric
            </Badge>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Average Order Value (AOV)
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {formatCurrency(data?.aov || 0)}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Per Transaction</span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Healthy Margin</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Low Stock Alert */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => onTabChange('stock')}
              className="text-rose-600 dark:text-rose-400 p-0 h-auto text-xs font-bold"
            >
              Restock <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Low Stock Risk Styles
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {lowStockList.length}{' '}
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">(≤ 5 units left)</span>
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Inventory State</span>
              <span className="text-rose-600 font-semibold">
                {lowStockList.length > 0 ? 'Action Required' : 'All Clear'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Customer Loyalty */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <Badge variant="success" className="text-[11px] font-bold">
              Retention
            </Badge>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Repeat Buyers
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {data?.repeatCustomers || 0}{' '}
              <span className="text-xs font-medium text-slate-400">Loyal Shoppers</span>
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>High Brand Affinity</span>
              <span className="text-emerald-600 font-semibold">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Pending Returns */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => onTabChange('returns')}
              className="text-amber-600 dark:text-amber-400 p-0 h-auto text-xs font-bold"
            >
              Review <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-bold uppercase tracking-wider text-[10px]">
              Pending Returns & Exchanges
            </CardDescription>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {returns.filter((r) => r.status === 'pending').length}{' '}
              <span className="text-xs font-medium text-amber-600">Claims</span>
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>CS Queue</span>
              <span className="text-amber-600 font-semibold">Pending Review</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Sales Revenue Trend AreaChart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Revenue Performance Curve</CardTitle>
              <CardDescription>Daily store & POS aggregate revenue in INR</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <Button
                variant={salesTimeframe === '7d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSalesTimeframe('7d')}
                className="h-7 text-[11px] px-2.5"
              >
                7 Days
              </Button>
              <Button
                variant={salesTimeframe === '30d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSalesTimeframe('30d')}
                className="h-7 text-[11px] px-2.5"
              >
                30 Days
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indigoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#indigoArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Category Share Donut */}
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-sm font-bold">Category Sales Breakdown</CardTitle>
            <CardDescription>Product volume distribution</CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="category"
                  >
                    {categoryDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Share']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {categoryDistribution.map((item, idx) => (
                <div key={item.category} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.category}</span>
                  <span className="text-slate-400 font-bold ml-auto font-mono">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row: Recent Orders & Stock Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Recent Orders Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Recent Store & POS Orders</CardTitle>
              <CardDescription>Live incoming customer transactions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('orders')}
              className="text-xs font-semibold"
            >
              View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 5).map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      #{ord.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-white">{ord.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ord.customer_phone}</div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(ord.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ord.order_status === 'delivered' || ord.order_status === 'Completed'
                            ? 'success'
                            : ord.order_status === 'shipped'
                            ? 'info'
                            : ord.order_status === 'cancelled'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {ord.order_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400 italic">
                      No customer orders found in record.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right: Low Stock Critical Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Critical Inventory Alerts</CardTitle>
              <CardDescription>Styles nearing depletion</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('stock')}
              className="text-xs font-semibold"
            >
              Manage Stock <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style & SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockList.slice(0, 5).map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-white">{prod.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{prod.sku}</div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 font-medium">
                      {prod.category || 'General'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-mono">
                        {prod.stock} left
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTabChange('stock')}
                        className="text-indigo-600 hover:text-indigo-700 h-7 px-2 text-xs"
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {lowStockList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400 italic">
                      All catalog products are healthy with adequate inventory.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
