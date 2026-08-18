import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import {
  Search,
  Eye,
  X,
  Printer,
  Truck,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Separator } from '../../components/ui/separator';

interface OrderItem {
  id: any;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: any;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: string;
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
}

interface OrdersManagerProps {
  orders: Order[];
  token: string;
  onRefresh: () => void;
}

export default function OrdersManager({ orders, token, onRefresh }: OrdersManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const itemsPerPage = 12;

  // Drawer / Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [orderStatusVal, setOrderStatusVal] = useState('');
  const [paymentStatusVal, setPaymentStatusVal] = useState('');

  // Tracking parameters
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [courierName, setCourierName] = useState('');

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter((o) => o.order_status === 'placed').length,
      confirmed: orders.filter((o) => o.order_status === 'confirmed').length,
      shipped: orders.filter((o) => o.order_status === 'shipped').length,
      delivered: orders.filter((o) => o.order_status === 'delivered').length,
      cancelled: orders.filter((o) => o.order_status === 'cancelled').length,
    };
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch =
        o.order_number?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_phone?.toLowerCase().includes(term) ||
        o.customer_email?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' ? true : o.order_status === statusFilter;
      const matchesSource = sourceFilter === 'all' ? true : o.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  const paginatedOrders = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, page]);

  // Open Details Drawer
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderStatusVal(order.order_status);
    setPaymentStatusVal(order.payment_status);
    setTrackingNumber(order.tracking_number || '');
    setTrackingUrl(order.tracking_url || '');
    setCourierName(order.courier_name || '');
  };

  // Save Order Updates
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_status: orderStatusVal,
          payment_status: paymentStatusVal,
          tracking_number: trackingNumber.trim(),
          tracking_url: trackingUrl.trim(),
          courier_name: courierName.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update order');
      }

      showToast('success', 'Order Synchronized', `Order #${selectedOrder.order_number} status updated.`);
      setSelectedOrder(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', 'Update Error', err.message || 'Could not update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val / 100);
  };

  const printInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.order_number} - HeelsUp</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
            .badge { display: inline-block; padding: 4px 8px; font-size: 10px; font-weight: bold; background: #e2e8f0; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            th { background: #f8fafc; font-weight: bold; }
            .totals { margin-top: 20px; margin-left: auto; width: 300px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">HEELSUP</div>
              <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Premium Handcrafted Footwear</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px;">TAX INVOICE</h2>
              <p style="font-size: 12px; margin: 4px 0 0 0; font-family: monospace;">#${order.order_number}</p>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px;">
            <div>
              <strong>Billed To:</strong><br/>
              ${order.customer_name}<br/>
              ${order.customer_phone}<br/>
              ${order.customer_email || ''}
            </div>
            <div style="text-align: right;">
              <strong>Delivery Address:</strong><br/>
              ${order.address_line1 || ''} ${order.address_line2 || ''}<br/>
              ${order.city || ''} ${order.state || ''} ${order.pincode || ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item & Size</th>
                <th>Qty</th>
                <th>Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (it) => `
                <tr>
                  <td>${it.product_name} <span class="badge">${it.size}</span></td>
                  <td>${it.quantity}</td>
                  <td>₹${(it.price / 100).toFixed(2)}</td>
                  <td style="text-align: right;">₹${((it.price * it.quantity) / 100).toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal:</span><span>₹${(order.subtotal_amount / 100).toFixed(2)}</span></div>
            <div><span>Shipping:</span><span>₹${(order.shipping_amount / 100).toFixed(2)}</span></div>
            ${
              order.discount_amount > 0
                ? `<div><span>Discount:</span><span>-₹${(order.discount_amount / 100).toFixed(2)}</span></div>`
                : ''
            }
            <div class="grand-total"><span>Total Paid:</span><span>₹${(order.total_amount / 100).toFixed(2)}</span></div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Orders & Shipments Registry
          </CardTitle>
          <CardDescription>
            Manage live e-commerce, WhatsApp, Instagram & POS counter orders
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs font-semibold">
            Refresh Pipeline
          </Button>
        </div>
      </Card>

      {/* Filter & Status Navigation */}
      <Card className="p-4 space-y-4">
        {/* Status Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Orders', count: counts.all },
            { id: 'placed', label: 'Placed (New)', count: counts.placed },
            { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
            { id: 'shipped', label: 'In Transit', count: counts.shipped },
            { id: 'delivered', label: 'Delivered', count: counts.delivered },
            { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(0);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <Badge
                variant={statusFilter === tab.id ? 'default' : 'secondary'}
                className={`px-1.5 py-0 text-[10px] font-mono ${
                  statusFilter === tab.id ? 'bg-white/20 text-white border-0' : ''
                }`}
              >
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        <Separator />

        {/* Search & Source Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by order #, customer, phone, or email..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Channel:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(0);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="web">Storefront (Web)</option>
              <option value="pos">In-Store POS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items & Sizing</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((ord) => (
              <TableRow key={ord.id}>
                <TableCell>
                  <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    #{ord.order_number}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {new Date(ord.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-semibold text-slate-900 dark:text-white text-xs">
                    {ord.customer_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{ord.customer_phone}</div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    {(ord.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-medium truncate max-w-[140px]">{it.product_name}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-mono">
                          {it.size}
                        </Badge>
                        <span className="text-slate-400 font-mono text-[10px]">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {ord.source || 'web'}
                  </Badge>
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

                <TableCell>
                  <Badge
                    variant={ord.payment_status === 'paid' ? 'success' : 'warning'}
                    className="capitalize font-mono"
                  >
                    {ord.payment_status || 'Pending'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDetails(ord)}
                      title="View & Edit Order"
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => printInvoice(ord)}
                      title="Print Invoice"
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-20 text-center text-slate-400 italic">
                  No orders match current filter parameters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {filteredOrders.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing {page * itemsPerPage + 1} to{' '}
              {Math.min((page + 1) * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * itemsPerPage >= filteredOrders.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Slide-over Order Details Drawer using Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <SheetContent side="right" className="w-full sm:max-w-xl">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle>Order #{selectedOrder.order_number}</SheetTitle>
                  <SheetDescription>
                    Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </SheetDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printInvoice(selectedOrder)}
                  className="text-xs font-semibold mr-6"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Tax Invoice
                </Button>
              </div>
            </SheetHeader>

            <form onSubmit={handleSaveOrder} className="space-y-5 my-4 text-xs">
              {/* Order Status & Pipeline Update */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Fulfillment Status Pipeline
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="orderStatus">Order Status</Label>
                    <select
                      id="orderStatus"
                      value={orderStatusVal}
                      onChange={(e) => setOrderStatusVal(e.target.value)}
                      className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="placed">Placed (New)</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">In Transit (Shipped)</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <select
                      id="paymentStatus"
                      value={paymentStatusVal}
                      onChange={(e) => setPaymentStatusVal(e.target.value)}
                      className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="pending">Pending Payment</option>
                      <option value="paid">Paid (Confirmed)</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Payment Failed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Courier Logistics Tracking */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Courier Logistics Tracking
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Courier Partner</Label>
                    <Input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. Bluedart, Delhivery"
                      className="mt-1 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <Label>Tracking AWB #</Label>
                    <Input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="AWB123456789"
                      className="mt-1 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label>Public Tracking URL</Label>
                  <Input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://track.courier.com/..."
                    className="mt-1 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Purchased Products
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{it.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                            Size: {it.size}
                          </Badge>
                          {it.color && <span className="text-[10px] text-slate-400">Color: {it.color}</span>}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(it.price * it.quantity)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {it.quantity} x {formatCurrency(it.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Address Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" /> Customer Contact
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedOrder.customer_name}</p>
                  <p className="text-slate-500 font-mono text-[11px]">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && (
                    <p className="text-slate-500 text-[11px] truncate">{selectedOrder.customer_email}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Shipping Address
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                    {selectedOrder.address_line1 || '—'} {selectedOrder.address_line2 || ''}
                    <br />
                    {selectedOrder.city || ''}, {selectedOrder.state || ''} {selectedOrder.pincode || ''}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={updatingStatus}
                className="w-full py-2.5 font-bold text-xs"
              >
                {updatingStatus ? 'Updating Pipeline...' : 'Save Order & Dispatch Changes'}
              </Button>
            </form>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
