import { useToastStore } from '../../store/useToastStore';
import { useState, useMemo } from 'react';
import { Download, RefreshCw, Activity, Info, Tag, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';

interface EnterpriseReportsProps {
  orders: any[];
  products: any[];
}

export default function EnterpriseReports({ orders, products }: EnterpriseReportsProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'returns'>('sales');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [compiledData, setCompiledData] = useState<any[]>([]);

  // 1. Calculate General Aggregates
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalOrders = 0;
    let totalQty = 0;
    let cancellations = 0;

    orders.forEach((o) => {
      const isPlacedBetween =
        o.created_at?.split('T')[0] >= dateFrom && o.created_at?.split('T')[0] <= dateTo;
      if (isPlacedBetween) {
        totalOrders++;
        if (o.order_status !== 'cancelled') {
          totalSales += o.total_amount;
        } else {
          cancellations++;
        }
        if (o.items) {
          o.items.forEach((it: any) => {
            totalQty += it.quantity || 0;
          });
        }
      }
    });

    const avgOrder = totalOrders > 0 ? totalSales / (totalOrders - cancellations || 1) : 0;
    const cancelRate = totalOrders > 0 ? (cancellations / totalOrders) * 100 : 0;

    return {
      totalSales,
      totalOrders,
      totalQty,
      avgOrder,
      cancelRate,
    };
  }, [orders, dateFrom, dateTo]);

  // 2. Generate Report Dataset
  const handleCompileReport = () => {
    setLoading(true);
    try {
      if (reportType === 'sales') {
        const groups: {
          [key: string]: {
            ordersCount: number;
            grossRevenue: number;
            netRevenue: number;
            itemsCount: number;
          };
        } = {};
        orders.forEach((o) => {
          const dateStr = o.created_at?.split('T')[0] || 'Unknown';
          if (dateStr >= dateFrom && dateStr <= dateTo) {
            if (!groups[dateStr]) {
              groups[dateStr] = { ordersCount: 0, grossRevenue: 0, netRevenue: 0, itemsCount: 0 };
            }
            groups[dateStr].ordersCount++;
            groups[dateStr].grossRevenue += o.total_amount;
            if (o.order_status !== 'cancelled') {
              groups[dateStr].netRevenue += o.total_amount;
            }
            if (o.items) {
              o.items.forEach((it: any) => {
                groups[dateStr].itemsCount += it.quantity || 0;
              });
            }
          }
        });
        const arr = Object.entries(groups)
          .map(([date, g]) => ({
            Date: date,
            Orders: g.ordersCount,
            'Gross (₹)': g.grossRevenue.toFixed(2),
            'Net Sales (₹)': g.netRevenue.toFixed(2),
            'Items Shipped': g.itemsCount,
          }))
          .sort((a, b) => a.Date.localeCompare(b.Date));
        setCompiledData(arr);
        showToast('success', 'Report Generated', `Compiled sales report with ${arr.length} daily logs.`);
      } else if (reportType === 'inventory') {
        const arr = products.map((p) => ({
          SKU: p.sku,
          Name: p.name,
          Category: p.category,
          'Stock Count': p.stock,
          'Price (₹)': (p.price / 100).toFixed(2),
          'Asset Value (₹)': ((p.price * p.stock) / 100).toFixed(2),
          Status: p.stock === 0 ? 'OUT_OF_STOCK' : p.stock < 5 ? 'LOW_STOCK' : 'HEALTHY',
        }));
        setCompiledData(arr);
        showToast('success', 'Report Generated', `Compiled stock assets with ${arr.length} catalog styles.`);
      } else {
        setCompiledData([]);
        showToast('info', 'Report Generated', 'Exchanges analytics loaded.');
      }
    } catch {
      showToast('error', 'Compilation Failure', 'Unable to calculate reporting bounds.');
    } finally {
      setLoading(false);
    }
  };

  // Recharts Data configurations
  const rechartsDailyData = useMemo(() => {
    const dailyData: { [key: string]: number } = {};
    orders.forEach((o) => {
      const dateStr = o.created_at?.split('T')[0];
      if (dateStr && dateStr >= dateFrom && dateStr <= dateTo && o.order_status !== 'cancelled') {
        dailyData[dateStr] = (dailyData[dateStr] || 0) + o.total_amount;
      }
    });

    return Object.entries(dailyData)
      .map(([date, revenue]) => ({
        date: date.slice(5),
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [orders, dateFrom, dateTo]);

  // Export CSV
  const handleExportCsv = () => {
    if (compiledData.length === 0) return;
    const headers = Object.keys(compiledData[0]);
    const csvContent = [
      headers.join(','),
      ...compiledData.map((row) =>
        headers
          .map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `heelsup_${reportType}_report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Report Downloaded', 'CSV report saved to your disk.');
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Header Bar */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Enterprise Analytics & Financial Reports
          </CardTitle>
          <CardDescription>
            Gross merchandise value (GMV), inventory valuation, and multi-channel reconciliation
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {compiledData.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleCompileReport}
            disabled={loading}
            className="text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Compile Report
          </Button>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Gross Revenue
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            ₹{stats.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Orders Count
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {stats.totalOrders}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Units Sold
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {stats.totalQty}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg Order Value
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            ₹{stats.avgOrder.toFixed(0)}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cancellation Rate
          </span>
          <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
            {stats.cancelRate.toFixed(1)}%
          </span>
        </Card>
      </div>

      {/* Date Range & Segment Selectors */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['sales', 'inventory', 'returns'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={reportType === t ? 'default' : 'outline'}
              onClick={() => {
                setReportType(t);
                setCompiledData([]);
              }}
              className="text-xs font-semibold capitalize"
            >
              {t} Breakdown
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold">Period:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 h-8 text-xs font-mono"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 h-8 text-xs font-mono"
          />
        </div>
      </Card>

      {/* Revenue Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Revenue Velocity Trend
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            Daily GMV (INR)
          </Badge>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rechartsDailyData}>
              <defs>
                <linearGradient id="colorReportsRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReportsRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Compiled Data Table */}
      {compiledData.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {reportType.toUpperCase()} DATASET ({compiledData.length} ROWS)
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(compiledData[0]).map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {compiledData.map((row, idx) => (
                <TableRow key={idx}>
                  {Object.keys(row).map((k) => (
                    <TableCell key={k} className="font-mono text-xs">
                      {row[k]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
