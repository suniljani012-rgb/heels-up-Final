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
    return Object.keys(dailyData)
      .sort()
      .map((d) => ({
        date: d,
        Revenue: dailyData[d],
      }));
  }, [orders, dateFrom, dateTo]);

  const rechartsBarData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts)
      .slice(0, 5)
      .map((cat) => ({
        name: cat,
        Products: counts[cat],
      }));
  }, [products]);

  // CSV Exporter
  const exportCsv = () => {
    if (compiledData.length === 0) return;
    const headers = Object.keys(compiledData[0]);
    const csvContent = [
      headers.join(','),
      ...compiledData.map((row) =>
        headers.map((header) => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `heelsup_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Saved', `Successfully exported compiled report.`);
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card with Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Enterprise Analytics & Financial Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export gross revenue metrics, inventory asset valuations, and sales velocity logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as any);
              setCompiledData([]);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="sales">Sales Volume Report</option>
            <option value="inventory">Inventory Asset Summary</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>

          <button
            onClick={handleCompileReport}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Gross Revenue
          </span>
          <span className="block text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            ₹{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            Completed order turnover
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Orders
          </span>
          <span className="block text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {stats.totalOrders}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">In selected time window</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Average Ticket Size (AOV)
          </span>
          <span className="block text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            ₹{stats.avgOrder.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 block">
            Per fulfilled basket
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Cancellation Rate
          </span>
          <span className="block text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {stats.cancelRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-rose-600/80 font-semibold mt-0.5 block">Bounced / RTO orders</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales trend area chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Daily Revenue Trajectory
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Timeframe: {dateFrom} to {dateTo}</span>
          </div>

          <div className="h-56 relative pt-2">
            {rechartsDailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No revenue transactions recorded in target timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rechartsDailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReportRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReportRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category distribution bar chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Category Inventory Share
            </h3>
          </div>

          <div className="h-56 relative pt-2">
            {rechartsBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No product styles cataloged.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rechartsBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="Products" radius={[6, 6, 0, 0]}>
                    {rechartsBarData.map((entry, index) => {
                      const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Compiled Dataset Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="flex justify-between items-center p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Compiled Dataset ({compiledData.length} records)
          </span>
          {compiledData.length > 0 && (
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export Dataset (CSV)
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Aggregating records...
          </div>
        ) : compiledData.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Info className="w-5 h-5 text-slate-400" />
            No report dataset compiled yet. Click "Generate Report" above.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[45vh]">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  {Object.keys(compiledData[0] || {}).map((k) => (
                    <th key={k} className="p-3 font-semibold uppercase tracking-wider">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-sans">
                {compiledData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-slate-900 dark:text-white text-xs"
                  >
                    {Object.keys(row).map((k) => (
                      <td key={k} className="p-3 max-w-xs truncate font-mono">
                        {String(row[k] ?? '0')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
