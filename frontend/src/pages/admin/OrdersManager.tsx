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
      if (data.success) {
        showToast('success', 'Order Saved', `Order #${selectedOrder.order_number} record updated.`);
        setSelectedOrder(null);
        onRefresh();
      } else {
        showToast('error', 'Update Error', data.error || 'Server rejected changes.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to connect to billing server.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper: Print invoice
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = order.items
      .map(
        (item) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 12px 0;">
          <strong style="color: #0f172a;">${item.product_name}</strong><br/>
          <span style="font-size: 10px; color: #64748b;">Size: UK-${item.size} ${item.color ? `&middot; ${item.color}` : ''}</span>
        </td>
        <td style="padding: 12px 0; text-align: center; font-family: monospace;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; font-family: monospace;">₹${(item.price / 100).toFixed(2)}</td>
        <td style="padding: 12px 0; text-align: right; font-family: monospace; font-weight: bold;">₹${((item.price * item.quantity) / 100).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - #${order.order_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; }
            .invoice-title { text-align: right; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; font-size: 12px; }
            .table-container { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
            .totals { margin-top: 25px; margin-left: auto; width: 280px; font-size: 12px; }
            .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { border-top: 2px solid #0f172a; font-weight: 800; font-size: 14px; padding-top: 8px !important; }
            .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">HeelsUp</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Premium Footwear Co.</div>
            </div>
            <div class="invoice-title">
              <h2 style="margin: 0; font-weight: 700; font-size: 20px;">TAX INVOICE</h2>
              <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 4px;">Ref: #${order.order_number}</div>
            </div>
          </div>

          <div class="details">
            <div>
              <h4 style="margin: 0 0 8px; text-transform: uppercase; font-size: 10px; color: #64748b;">Customer Details:</h4>
              <strong>${order.customer_name}</strong><br/>
              Phone: ${order.customer_phone}<br/>
              ${order.customer_email ? `Email: ${order.customer_email}<br/>` : ''}
              ${order.address_line1 || ''}<br/>
              ${order.address_line2 || ''}<br/>
              ${order.city || ''}, ${order.state || ''} - ${order.pincode || ''}
            </div>
            <div style="text-align: right;">
              <h4 style="margin: 0 0 8px; text-transform: uppercase; font-size: 10px; color: #64748b;">Order Metadata:</h4>
              Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}<br/>
              Payment Method: <span style="text-transform: uppercase;">${order.payment_method}</span><br/>
              Payment Status: <span style="text-transform: uppercase;">${order.payment_status}</span><br/>
              Order Channel: <span style="text-transform: uppercase;">${order.source}</span>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Item Description</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Rate</th>
                  <th style="text-align: right; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div>
              <span>Subtotal:</span>
              <span style="font-family: monospace;">₹${(order.subtotal_amount / 100).toFixed(2)}</span>
            </div>
            <div>
              <span>Shipping:</span>
              <span style="font-family: monospace;">₹${(order.shipping_amount / 100).toFixed(2)}</span>
            </div>
            ${
              order.discount_amount > 0
                ? `
              <div style="color: #e11d48;">
                <span>Discounts:</span>
                <span style="font-family: monospace;">-₹${(order.discount_amount / 100).toFixed(2)}</span>
              </div>
            `
                : ''
            }
            <div class="grand-total">
              <span>Total Payable:</span>
              <span style="font-family: monospace;">₹${(order.total_amount / 100).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            Thank you for shopping with HeelsUp. For returns or queries, contact support@heelsup.in.<br/>
            This is a computer generated invoice. No signature required.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'shipped':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
    }
  };

  return (
    <div className="space-y-5 antialiased">
      {/* Header Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Orders Registry & Fulfillment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage transactions, courier dispatch, invoice printing, and fulfillment lifecycle
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Total: {orders.length}
            </span>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Orders', count: counts.all },
            { id: 'placed', label: 'Placed (Queue)', count: counts.placed },
            { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
            { id: 'shipped', label: 'Shipped', count: counts.shipped },
            { id: 'delivered', label: 'Delivered', count: counts.delivered },
            { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Channel Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by order #, customer name, phone, email..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="web">Web Storefront</option>
            <option value="pos">In-store POS</option>
            <option value="whatsapp">WhatsApp Order</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Page {page + 1} of {Math.ceil(filteredOrders.length / itemsPerPage) || 1}
          </span>
          <button
            disabled={(page + 1) * itemsPerPage >= filteredOrders.length}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-semibold">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedOrders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{o.order_number}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="min-w-[140px]">
                      <p className="font-semibold text-slate-900 dark:text-white text-xs">{o.customer_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{o.customer_phone}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono text-xs">
                    ₹{(o.total_amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        o.source === 'pos'
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {o.source}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                        o.order_status
                      )}`}
                    >
                      {o.order_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-mono font-bold">
                    <span className={o.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}>
                      {o.payment_status} &middot; {o.payment_method}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenDetails(o)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View & Edit Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(o)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 italic">
                    No orders match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Order Details #{selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Purchased Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Size UK-{item.size} {item.color ? `• ${item.color}` : ''} • Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Address Details Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Shipping & Customer Details
                </h4>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.customer_name}</p>
                  <p className="flex items-center gap-1 text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedOrder.customer_phone}
                  </p>
                  {selectedOrder.customer_email && (
                    <p className="flex items-center gap-1 text-[11px]">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedOrder.customer_email}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    {selectedOrder.address_line1} {selectedOrder.address_line2}
                    <br />
                    {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                  </p>
                </div>
                {selectedOrder.notes && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 italic">
                    Note: "{selectedOrder.notes}"
                  </div>
                )}
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleSaveOrder} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Fulfillment Status
                    </label>
                    <select
                      value={orderStatusVal}
                      onChange={(e) => setOrderStatusVal(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="placed">Placed / In Queue</option>
                      <option value="confirmed">Confirmed / Processing</option>
                      <option value="shipped">Shipped / Dispatched</option>
                      <option value="delivered">Delivered / Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatusVal}
                      onChange={(e) => setPaymentStatusVal(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="pending">Pending Payment</option>
                      <option value="paid">Paid / Settled</option>
                      <option value="failed">Failed / Refunded</option>
                    </select>
                  </div>
                </div>

                {/* Courier & Tracking */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3.5 space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" /> Dispatch & AWB Tracking
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">
                        Courier Partner
                      </label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. Delhivery, BlueDart"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">AWB Number</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. 123456789"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">
                      Tracking URL
                    </label>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://delhivery.com/track/..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none font-mono text-[11px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save Order Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
