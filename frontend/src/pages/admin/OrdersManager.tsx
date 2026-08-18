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
  CreditCard,
  RotateCcw,
  MessageSquare,
  Download,
  CheckSquare,
  Square,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '../../components/ui/card';
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
  cod_advance_paid?: number;
  cod_outstanding_amount?: number;
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
  delivery_method?: string;
}

export function getOrderPaymentBreakdown(order: Order) {
  const method = (order.payment_method || '').toLowerCase();
  const notes = (order.notes || '').toLowerCase();
  const delivery = (order.delivery_method || '').toLowerCase();
  const isCOD = method.includes('cod') || notes.includes('cod') || delivery.includes('cod');
  
  const totalPaise = Number(order.total_amount) || 0;

  if (isCOD) {
    const advancePaidPaise = order.cod_advance_paid != null && order.cod_advance_paid > 0
      ? order.cod_advance_paid
      : Math.round(totalPaise * 0.10);
    
    const balanceDuePaise = order.cod_outstanding_amount != null && order.cod_outstanding_amount > 0
      ? order.cod_outstanding_amount
      : Math.max(0, totalPaise - advancePaidPaise);

    return {
      isCOD: true,
      label: 'Cash on Delivery (10% Advance)',
      badge: '10% ADVANCE PAID',
      advancePaid: advancePaidPaise / 100,
      balanceDue: balanceDuePaise / 100,
      total: totalPaise / 100,
      receivedText: `₹${Math.round(advancePaidPaise / 100).toLocaleString('en-IN')} (10% Adv Paid)`,
      dueText: `₹${Math.round(balanceDuePaise / 100).toLocaleString('en-IN')} to Collect`,
    };
  }

  const isPOS = (order.source || '').toLowerCase() === 'pos' || method.includes('cash');

  return {
    isCOD: false,
    label: isPOS ? 'In-Store POS (Counter Paid)' : '100% Prepaid (Online Razorpay/UPI)',
    badge: isPOS ? 'POS PAID' : '100% PREPAID',
    advancePaid: totalPaise / 100,
    balanceDue: 0,
    total: totalPaise / 100,
    receivedText: `₹${Math.round(totalPaise / 100).toLocaleString('en-IN')} Paid in Full`,
    dueText: '₹0 (Fully Paid)',
  };
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
  const itemsPerPage = 15;

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
      unfulfilled: orders.filter((o) => o.order_status === 'placed').length,
      processing: orders.filter((o) => o.order_status === 'confirmed').length,
      shipped: orders.filter((o) => o.order_status === 'shipped').length,
      delivered: orders.filter((o) => o.order_status === 'delivered' || o.order_status === 'Completed').length,
      cancelled: orders.filter((o) => o.order_status === 'cancelled').length,
    };
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        o.order_number?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_phone?.toLowerCase().includes(term) ||
        o.customer_email?.toLowerCase().includes(term);

      let matchesStatus = true;
      if (statusFilter === 'unfulfilled') matchesStatus = o.order_status === 'placed';
      else if (statusFilter === 'processing') matchesStatus = o.order_status === 'confirmed';
      else if (statusFilter === 'shipped') matchesStatus = o.order_status === 'shipped';
      else if (statusFilter === 'delivered') matchesStatus = o.order_status === 'delivered' || o.order_status === 'Completed';
      else if (statusFilter === 'cancelled') matchesStatus = o.order_status === 'cancelled';

      const matchesSource = sourceFilter === 'all' ? true : o.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  const paginatedOrders = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, page]);

  // Selection helpers
  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.has(o.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedOrders.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedOrders.forEach((o) => next.add(o.id));
        return next;
      });
    }
  };

  const toggleSelectOrder = (id: any) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // Bulk Status Update (Shopify Action)
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);

    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await fetch(`/api/admin/orders/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order_status: newStatus }),
        });
      }
      showToast('success', 'Batch Updated', `Updated ${ids.length} orders to ${newStatus}.`);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      showToast('error', 'Batch Failed', 'Failed to update batch orders.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const targetOrders = selectedIds.size > 0
      ? orders.filter((o) => selectedIds.has(o.id))
      : filteredOrders;

    if (targetOrders.length === 0) {
      showToast('error', 'Empty', 'No orders to export.');
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'City', 'Total Amount (INR)', 'Payment Status', 'Order Status', 'Items Count'];
    const rows = targetOrders.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString('en-IN'),
      `"${o.customer_name || ''}"`,
      o.customer_phone || '',
      `"${o.city || ''}"`,
      (o.total_amount / 100).toFixed(2),
      o.payment_status,
      o.order_status,
      (o.items || []).reduce((sum, item) => sum + item.quantity, 0),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `heelsup_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Exported', `Exported ${targetOrders.length} orders to CSV.`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((val || 0) / 100);
  };

  const printInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const pBreakdown = getOrderPaymentBreakdown(order);
    const subtotal = (order.subtotal_amount || order.total_amount) / 100;
    const discount = (order.discount_amount || 0) / 100;
    const shipping = (order.shipping_amount || 0) / 100;
    const total = order.total_amount / 100;
    const invoiceDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice #${order.order_number} - HEELSUP</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 12px; line-height: 1.5; background: #fff; }
            .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
            .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
            .brand-name { font-size: 26px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; }
            .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .invoice-badge { display: inline-block; background: #0f172a; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-val { font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a; }
            
            .address-grid { display: table; width: 100%; margin-bottom: 18px; }
            .address-col { display: table-cell; width: 50%; vertical-align: top; }
            .address-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-right: 8px; }
            .address-card.right { margin-right: 0; margin-left: 8px; }
            .card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
            .items-table th { background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: left; }
            .items-table td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            
            .summary-table { width: 100%; margin-top: 12px; }
            .summary-cell-left { width: 55%; vertical-align: top; padding-right: 20px; }
            .summary-cell-right { width: 45%; vertical-align: top; }
            
            .totals-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
            .totals-line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
            .totals-line.bold { font-weight: 700; color: #0f172a; }
            .totals-line.grand { font-size: 13px; font-weight: 800; border-top: 1.5px solid #0f172a; padding-top: 6px; margin-top: 4px; color: #0f172a; }
            
            .cod-alert-box { background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 6px; padding: 10px; margin-top: 8px; text-align: right; }
            .cod-alert-title { font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; }
            .cod-alert-amt { font-size: 16px; font-weight: 900; font-family: monospace; color: #92400e; margin-top: 2px; }
            
            .prepaid-box { background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 6px; padding: 8px 10px; margin-top: 8px; text-align: right; color: #065f46; font-weight: 700; font-size: 11px; }

            .terms-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; font-size: 10px; color: #64748b; line-height: 1.4; }
            .sign-box { border-top: 1px solid #94a3b8; width: 140px; margin-top: 30px; text-align: center; font-size: 10px; font-weight: 700; color: #475569; padding-top: 4px; }
            
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            
            @media print {
              body { padding: 0; }
              .invoice-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td style="vertical-align: top;">
                  <div class="brand-name">HEELSUP</div>
                  <div class="brand-sub">Luxury Footwear & Handcrafted Collections</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                    Official Store: HeelsUp Online Store | GSTIN: Exempted E-Commerce
                  </div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <span class="invoice-badge">TAX INVOICE / CASH MEMO</span>
                  <div style="margin-top: 4px;">
                    <span style="font-size: 10px; color: #64748b;">Invoice #:</span>
                    <span class="meta-val">#INV-${order.order_number}</span>
                  </div>
                  <div>
                    <span style="font-size: 10px; color: #64748b;">Order Date:</span>
                    <span class="meta-val">${invoiceDate}</span>
                  </div>
                  <div>
                    <span style="font-size: 10px; color: #64748b;">Payment Mode:</span>
                    <span style="font-weight: 800; color: #4f46e5; text-transform: uppercase;">${pBreakdown.isCOD ? 'COD (10% ADVANCE)' : 'PREPAID ONLINE'}</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Billed To & Logistics -->
            <div class="address-grid">
              <div class="address-col">
                <div class="address-card">
                  <div class="card-title">📦 Customer Delivery Details (Billed & Shipped To)</div>
                  <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">${order.customer_name || 'Valued Customer'}</p>
                  <p style="margin: 3px 0 0 0; color: #334155;">${order.address_line1 || 'Address on file'}</p>
                  ${order.address_line2 ? `<p style="margin: 1px 0 0 0; color: #334155;">${order.address_line2}</p>` : ''}
                  <p style="margin: 1px 0 0 0; font-weight: 600; color: #0f172a;">
                    ${order.city || ''}${order.state ? `, ${order.state}` : ''} - ${order.pincode || ''}
                  </p>
                  <p style="margin: 4px 0 0 0; font-weight: 700; color: #4338ca; font-family: monospace;">
                    Customer Phone: +91 ${order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '') : '7891470935'}
                  </p>
                </div>
              </div>
              <div class="address-col">
                <div class="address-card right">
                  <div class="card-title">🚚 Dispatch & Carrier Logistics</div>
                  <p style="margin: 0; color: #334155;">Carrier / Courier: <strong>${order.courier_name || 'Standard Surface Express'}</strong></p>
                  <p style="margin: 2px 0 0 0; color: #334155;">AWB Tracking #: <strong style="font-family: monospace;">${order.tracking_number || 'HU-EXP-' + order.order_number}</strong></p>
                  <p style="margin: 2px 0 0 0; color: #334155;">Fulfillment Status: <strong style="color: #059669; text-transform: uppercase;">${order.order_status || 'CONFIRMED'}</strong></p>
                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">
                    Dispatched from: HeelsUp Central Fulfillment Hub
                  </p>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Footwear Style & Description</th>
                  <th style="text-align: center; width: 60px;">HSN</th>
                  <th style="text-align: center; width: 60px;">Size</th>
                  <th style="text-align: center; width: 50px;">Qty</th>
                  <th style="text-align: right; width: 90px;">Unit Rate</th>
                  <th style="text-align: right; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || [])
                  .map(
                    (item, i) => `
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">${i + 1}</td>
                    <td>
                      <strong style="color: #0f172a; font-size: 12px;">${item.product_name}</strong>
                      <div style="font-size: 10px; color: #64748b;">Handcrafted Premium Heel • 100% Authentic Quality</div>
                    </td>
                    <td style="text-align: center; font-family: monospace; font-size: 10px; color: #64748b;">6402</td>
                    <td style="text-align: center; font-weight: 800; color: #4338ca;">UK ${item.size || '7'}</td>
                    <td style="text-align: center; font-weight: 700;">${item.quantity || 1}</td>
                    <td style="text-align: right; font-family: monospace;">₹${Math.round(item.price / 100).toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f172a;">
                      ₹${Math.round((item.price * (item.quantity || 1)) / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <!-- Summary & Terms -->
            <table class="summary-table">
              <tr>
                <td class="summary-cell-left">
                  <div class="terms-box">
                    <strong style="color: #334155; display: block; margin-bottom: 2px;">Terms & Exchange Policy:</strong>
                    • All HeelsUp footwear products are eligible for 7-Day Hassle-Free Size Replacement.<br/>
                    • Please preserve this original tax invoice and footwear box for warranty claims.<br/>
                    • Handcrafted with cushioned memory foam footbeds for maximum comfort.
                  </div>

                  <div style="margin-top: 15px;">
                    <div class="sign-box">
                      Authorized Signatory<br/>
                      <span style="font-size: 8px; color: #94a3b8; font-weight: normal;">(HeelsUp)</span>
                    </div>
                  </div>
                </td>

                <td class="summary-cell-right">
                  <div class="totals-box">
                    <div class="totals-line">
                      <span>Item Gross Subtotal:</span>
                      <span class="meta-val">₹${Math.round(subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    ${
                      discount > 0
                        ? `<div class="totals-line" style="color: #e11d48; font-weight: 600;">
                            <span>Promotional Discount:</span>
                            <span>-₹${Math.round(discount).toLocaleString('en-IN')}</span>
                          </div>`
                        : ''
                    }
                    <div class="totals-line">
                      <span>Express Shipping & Insurance:</span>
                      <span style="color: #059669; font-weight: 700;">${shipping > 0 ? `₹${Math.round(shipping)}` : 'FREE'}</span>
                    </div>
                    <div class="totals-line grand">
                      <span>Total Invoice Value:</span>
                      <span class="meta-val" style="font-size: 14px;">₹${Math.round(total).toLocaleString('en-IN')}</span>
                    </div>

                    ${
                      pBreakdown.isCOD
                        ? `
                        <div class="totals-line" style="color: #059669; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px;">
                          <span>10% Partial Advance (Online Paid):</span>
                          <span>-₹${Math.round(pBreakdown.advancePaid).toLocaleString('en-IN')}</span>
                        </div>
                        <div class="cod-alert-box">
                          <div class="cod-alert-title">🚚 NET CASH TO COLLECT ON DELIVERY</div>
                          <div class="cod-alert-amt">₹${Math.round(pBreakdown.balanceDue).toLocaleString('en-IN')}</div>
                        </div>`
                        : `
                        <div class="prepaid-box">
                          ✓ 100% FULLY PREPAID ONLINE (₹${Math.round(pBreakdown.total).toLocaleString('en-IN')})
                        </div>`
                    }
                  </div>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0; font-weight: 600;">
                For customer care, order tracking or exchanges, WhatsApp: <strong>+91 78914 70935</strong> | Email: <strong>support@heelsup.in</strong>
              </p>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 9px;">
                This is a computer-generated tax invoice verified by HeelsUp E-Commerce Retail Infrastructure.
              </p>
            </div>
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
    <div className="space-y-3 antialiased font-sans">
      {/* ── 1. SHOPIFY-STYLE POLARIS TABS & SUMMARY ──────────────────── */}
      <Card className="p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all', label: 'All Orders', count: counts.all },
              { id: 'unfulfilled', label: 'Unfulfilled', count: counts.unfulfilled },
              { id: 'processing', label: 'Processing', count: counts.processing },
              { id: 'shipped', label: 'In Transit', count: counts.shipped },
              { id: 'delivered', label: 'Delivered', count: counts.delivered },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(0);
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Export Action */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-7 px-2.5 text-xs font-semibold"
          >
            <Download className="w-3 h-3 mr-1" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Search & Channel Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone, email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
            className="h-8 px-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Channels</option>
            <option value="online">Online Web Store</option>
            <option value="pos">Retail POS Register</option>
          </select>

          <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
            Showing <strong>{filteredOrders.length}</strong> orders
          </span>
        </div>
      </Card>

      {/* ── 2. BULK BATCH ACTIONS BAR (Shopify Standard) ────────────── */}
      {selectedIds.size > 0 && (
        <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono bg-indigo-600 px-2 py-0.5 rounded">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-slate-300">Apply batch operation:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('confirmed')}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Mark Processing
            </Button>
            <Button
              size="sm"
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('shipped')}
              className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Mark Shipped
            </Button>
            <Button
              size="sm"
              disabled={bulkProcessing}
              onClick={() => handleBulkStatusChange('delivered')}
              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Mark Delivered
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-2 text-slate-400 hover:text-white text-xs"
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. HIGH-DENSITY ORDERS TABLE ─────────────────────────────── */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
              <TableHead className="w-10 text-center">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-32">Order #</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="min-w-[180px]">Customer</TableHead>
              <TableHead className="text-center w-28">Payment</TableHead>
              <TableHead className="text-center w-28">Fulfillment</TableHead>
              <TableHead className="text-right w-24">Total</TableHead>
              <TableHead className="text-right w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

              return (
                <TableRow
                  key={order.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Select Checkbox */}
                  <TableCell className="text-center py-2.5">
                    <button
                      onClick={() => toggleSelectOrder(order.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>

                  {/* Order Number */}
                  <TableCell className="py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <button
                      onClick={() => handleOpenDetails(order)}
                      className="hover:underline text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
                    >
                      <span>#{order.order_number}</span>
                      {order.source === 'pos' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 uppercase font-sans font-bold">
                          POS
                        </span>
                      )}
                    </button>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>

                  {/* Customer */}
                  <TableCell className="py-2.5">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[160px]">
                        {order.customer_name || 'Guest Customer'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {order.customer_phone || order.city || 'No phone'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Payment Breakdown & Status */}
                  <TableCell className="text-center py-2.5">
                    {(() => {
                      const pInfo = getOrderPaymentBreakdown(order);
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pInfo.isCOD
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60'
                            }`}
                          >
                            {pInfo.badge}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 font-medium">
                            {pInfo.receivedText}
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Fulfillment Status */}
                  <TableCell className="text-center py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.order_status === 'delivered' || order.order_status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : order.order_status === 'shipped'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                          : order.order_status === 'cancelled'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {order.order_status?.toUpperCase() || 'PLACED'}
                    </span>
                  </TableCell>

                  {/* Total & COD Balance Due */}
                  <TableCell className="text-right py-2.5">
                    {(() => {
                      const pInfo = getOrderPaymentBreakdown(order);
                      return (
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            ₹{Math.round(order.total_amount / 100).toLocaleString('en-IN')}
                          </p>
                          {pInfo.isCOD && (
                            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 block mt-0.5 whitespace-nowrap">
                              Collect: ₹{Math.round(pInfo.balanceDue).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => printInvoice(order)}
                        title="Print Invoice"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetails(order)}
                        className="h-7 px-2 text-xs font-semibold"
                      >
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs italic">
                  No orders found matching filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {filteredOrders.length > itemsPerPage && (
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {Math.ceil(filteredOrders.length / itemsPerPage)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * itemsPerPage >= filteredOrders.length}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── 4. SHOPIFY ORDER DETAIL SLIDE-OVER DRAWER ────────────────── */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Order #{selectedOrder.order_number}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {selectedOrder.source?.toUpperCase() || 'ONLINE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printInvoice(selectedOrder)}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Invoice
                </Button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Order Items Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Order Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Size: <strong>{item.size || 'STD'}</strong></span>
                          <span>•</span>
                          <span>Qty: <strong>{item.quantity}</strong></span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                        ₹{Math.round((item.price * item.quantity) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & COD Financial Ledger */}
              {(() => {
                const pBreakdown = getOrderPaymentBreakdown(selectedOrder);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        Payment & Collection Ledger
                      </h4>
                      <Badge
                        variant={pBreakdown.isCOD ? 'warning' : 'success'}
                        className="text-[10px] font-mono font-bold"
                      >
                        {pBreakdown.badge}
                      </Badge>
                    </div>

                    <Card className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Payment Mode</span>
                        <span className="font-bold text-slate-900 dark:text-white">{pBreakdown.label}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Total Order Amount</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{Math.round(pBreakdown.total).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {pBreakdown.isCOD ? (
                        <>
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                            <span className="font-medium">10% Advance Paid Online (Razorpay)</span>
                            <span className="font-mono font-bold">
                              -₹{Math.round(pBreakdown.advancePaid).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                                🚚 Remaining Cash to Collect (COD)
                              </p>
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                                Collect from customer on delivery
                              </p>
                            </div>
                            <span className="text-base font-mono font-bold text-amber-900 dark:text-amber-200">
                              ₹{Math.round(pBreakdown.balanceDue).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                          <span className="text-xs font-semibold">100% Fully Paid (Prepaid Online)</span>
                          <span className="font-mono font-bold text-xs">
                            ₹{Math.round(pBreakdown.total).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })()}

              {/* Customer Information & 1-Click WhatsApp */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Customer & Shipping
                </h4>
                <Card className="p-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.customer_name}</p>
                      <p className="text-slate-500 font-mono mt-0.5">{selectedOrder.customer_phone}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <a
                        href={`https://wa.me/91${selectedOrder.customer_phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(selectedOrder.customer_name || 'Customer')},%20regarding%20your%20HeelsUp%20order%20%23${selectedOrder.order_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                  {selectedOrder.address_line1 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px]">
                      <p>{selectedOrder.address_line1}</p>
                      {selectedOrder.address_line2 && <p>{selectedOrder.address_line2}</p>}
                      <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Status & Logistics Form */}
              <form onSubmit={handleSaveOrder} className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Update Fulfillment & Tracking
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Order Status</Label>
                    <select
                      value={orderStatusVal}
                      onChange={(e) => setOrderStatusVal(e.target.value)}
                      className="w-full h-8 mt-1 px-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    >
                      <option value="placed">Placed / Unfulfilled</option>
                      <option value="confirmed">Confirmed / Processing</option>
                      <option value="shipped">Shipped / In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Status</Label>
                    <select
                      value={paymentStatusVal}
                      onChange={(e) => setPaymentStatusVal(e.target.value)}
                      className="w-full h-8 mt-1 px-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Courier Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Delhivery, Bluedart, Shiprocket"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Tracking Number / AWB</Label>
                    <Input
                      type="text"
                      placeholder="AWB Tracking Number"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={updatingStatus}
                    className="w-full h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    {updatingStatus ? 'Updating...' : 'Save Order Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
