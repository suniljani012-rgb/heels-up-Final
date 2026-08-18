import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Receipt,
  HelpCircle,
  Calculator,
  Info,
  Wallet,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  Building2,
  DollarSign,
  ArrowDownRight,
  Sparkles,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { useToastStore } from '../../store/useToastStore';

export interface ShipmentRecord {
  id: string;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  courier_name: string;
  tracking_number: string;
  tracking_url?: string;
  items_summary: string;
  is_cod: boolean;
  collect_cash_amount: number; // in rupees
  order_total: number; // in rupees
  status: 'pending_booking' | 'manifested' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'returned' | 'cancelled';
  booked_at: string;
  expected_delivery?: string;
  weight_kg: number;
}

interface LogisticsManagerProps {
  orders: any[];
  token: string;
  onRefresh: () => void;
}

import { ZONE_RATES, getDelhiveryChargesBreakdown } from '../../utils/delhiveryCalculations';

export { getDelhiveryChargesBreakdown };

export default function LogisticsManager({ orders = [], token, onRefresh }: LogisticsManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_booking' | 'manifested' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'returned' | 'cod' | 'remittances'>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'today' | 'yesterday' | '7d' | 'this_month' | 'last_month' | 'last_2m' | 'last_3m' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cod' | 'prepaid'>('all');
  
  // Selected Order for Full Post-Courier Net Value Breakdown
  const [selectedOrderEconomics, setSelectedOrderEconomics] = useState<ShipmentRecord | null>(null);

  // Delhivery Official Booking Modal State
  const [bookingShipmentModal, setBookingShipmentModal] = useState<ShipmentRecord | null>(null);
  const [bookingWeightKg, setBookingWeightKg] = useState(0.85);
  const [bookingLengthCm, setBookingLengthCm] = useState(25);
  const [bookingWidthCm, setBookingWidthCm] = useState(15);
  const [bookingHeightCm, setBookingHeightCm] = useState(10);
  const [bookingShippingMode, setBookingShippingMode] = useState<'Surface' | 'Express'>('Surface');
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleConfirmDelhiveryBooking = async () => {
    if (!bookingShipmentModal) return;
    try {
      setBookingLoading(true);
      const res = await fetch('/api/admin/delhivery/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: bookingShipmentModal.order_id,
          weight_kg: bookingWeightKg,
          length_cm: bookingLengthCm,
          width_cm: bookingWidthCm,
          height_cm: bookingHeightCm,
          shipping_mode: bookingShippingMode
        })
      });
      const data = await res.json();
      if (data && data.success && data.tracking_number) {
        showToast('success', 'Delhivery AWB Generated', `Shipment booked successfully with AWB ${data.tracking_number}.`);
        setBookingShipmentModal(null);
        onRefresh();
      } else {
        showToast('error', 'Delhivery Booking Failed', data.error || 'Failed to generate AWB on Delhivery.');
      }
    } catch (e: any) {
      showToast('error', 'Booking Error', e.message || 'Network error communicating with Delhivery API');
    } finally {
      setBookingLoading(false);
    }
  };

  // Delhivery COD Remittance & Bank Payout Modal
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);

  // Delhivery Pickup Scheduling Modal State
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupPackagesCount, setPickupPackagesCount] = useState(1);
  const [pickupTimeSlot, setPickupTimeSlot] = useState('16:00:00');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().substring(0, 10));
  const [pickupScheduling, setPickupScheduling] = useState(false);

  const handleSchedulePickup = async () => {
    try {
      setPickupScheduling(true);
      const res = await fetch('/api/admin/delhivery/request-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          package_count: pickupPackagesCount,
          pickup_date: pickupDate,
          pickup_time: pickupTimeSlot
        })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('success', 'Delhivery Pickup Scheduled', data.message || 'Pickup requested successfully.');
        setShowPickupModal(false);
      } else {
        showToast('error', 'Pickup Request Failed', data.error || 'Failed to request pickup.');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Network error scheduling pickup');
    } finally {
      setPickupScheduling(false);
    }
  };

  // Live Wallet & Billing Profile State
  const [liveWallet, setLiveWallet] = useState<{
    connected: boolean;
    client_name: string;
    wallet_balance: number;
    billing_mode: string;
    currency: string;
    bank_name: string;
    bank_account: string;
    bank_ifsc: string;
    last_synced: string;
  }>({
    connected: false,
    client_name: 'HEELSUP BOUTIQUE',
    wallet_balance: 0,
    billing_mode: 'PREPAID_WALLET',
    currency: 'INR',
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
    last_synced: '',
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [bookingShipmentId, setBookingShipmentId] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Fetch Live Delhivery Wallet & Account Profile directly from API
  const fetchLiveWallet = async () => {
    try {
      setWalletLoading(true);
      const res = await fetch('/api/admin/delhivery/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.success) {
        setLiveWallet({
          connected: data.connected ?? true,
          client_name: data.client_name || 'HEELSUP BOUTIQUE',
          wallet_balance: data.wallet_balance || 0,
          billing_mode: data.billing_mode || 'PREPAID_WALLET',
          currency: data.currency || 'INR',
          bank_name: data.bank_details?.bank_name || 'HDFC Bank Ltd.',
          bank_account: data.bank_details?.account_number || '••••••••9035',
          bank_ifsc: data.bank_details?.ifsc || 'HDFC0000049',
          last_synced: data.last_synced || new Date().toLocaleTimeString('en-IN'),
        });
      }
    } catch (e) {
      console.warn('Failed to fetch live Delhivery wallet:', e);
    } finally {
      setWalletLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLiveWallet();
  }, [token]);

  // Quick 1-click book shipment on Delhivery API
  const handleAutoBookDelhivery = async (orderId: number) => {
    try {
      setBookingShipmentId(orderId);
      const res = await fetch('/api/admin/delhivery/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data && data.success && data.tracking_number) {
        showToast('success', 'Delhivery AWB Assigned', `Shipment booked successfully with AWB ${data.tracking_number}.`);
        onRefresh();
      } else {
        showToast('error', 'Booking Failed', data.error || 'Failed to generate AWB on Delhivery.');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Network error communicating with Delhivery API');
    } finally {
      setBookingShipmentId(null);
    }
  };

  // Transform store orders into structured shipment records
  const shipments = useMemo<ShipmentRecord[]>(() => {
    return orders.map((o) => {
      const isCOD = (o.payment_method || '').toLowerCase().includes('cod') || (o.cod_outstanding_amount && o.cod_outstanding_amount > 0);
      const totalRs = Number(o.total_amount ? (o.total_amount > 10000 ? o.total_amount / 100 : o.total_amount) : 0);
      const advOnlineRs = isCOD ? Math.round(totalRs * 0.10) : totalRs;
      const balanceToCollect = isCOD ? (o.cod_outstanding_amount ? Math.round(o.cod_outstanding_amount / 100) : (totalRs - advOnlineRs)) : 0;

      // Realistic tracking mapping
      const awb = o.tracking_number || (o.delhivery_waybill || '');
      const courier = o.courier_name || 'Delhivery Surface Express';

      let status: ShipmentRecord['status'] = 'pending_booking';
      if (!awb) {
        status = 'pending_booking'; // Awaiting booking
      } else if (o.order_status === 'delivered' || o.order_status === 'Completed') {
        status = 'delivered';
      } else if (o.order_status === 'out_for_delivery') {
        status = 'out_for_delivery';
      } else if (o.order_status === 'shipped' || o.order_status === 'in_transit') {
        status = 'in_transit';
      } else if (o.order_status === 'picked_up') {
        status = 'picked_up';
      } else if (o.order_status === 'delivery_failed' || o.order_status === 'ndr') {
        status = 'delivery_failed';
      } else if (o.order_status === 'returned' || o.order_status === 'rto') {
        status = 'returned';
      } else if (o.order_status === 'cancelled') {
        status = 'cancelled';
      } else {
        status = 'manifested';
      }

      const itemsSummary = (o.items || [])
        .map((it: any) => `${it.quantity || 1}x ${it.product_name || 'Heels'} (${it.size || '7'})`)
        .join(', ') || 'Footwear Package';

      return {
        id: `ship_${o.id}`,
        order_id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || 'Valued Customer',
        customer_phone: o.customer_phone || '',
        city: o.city || 'Jodhpur',
        state: o.state || 'Rajasthan',
        pincode: o.pincode || '342001',
        address: `${o.address_line1 || ''} ${o.address_line2 || ''}`.trim(),
        courier_name: courier,
        tracking_number: awb,
        tracking_url: o.tracking_url || (awb ? `https://track.delhivery.com/tracking?w=${awb}` : ''),
        items_summary: itemsSummary,
        is_cod: isCOD,
        collect_cash_amount: balanceToCollect,
        order_total: totalRs,
        status,
        booked_at: o.created_at || new Date().toISOString(),
        weight_kg: 0.85,
      };
    }).sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime());
  }, [orders]);

  // Filter shipments with Multi-Level Filters
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.tracking_number.toLowerCase().includes(q) ||
        s.order_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.customer_phone.includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.pincode.includes(q);

      let matchesStatus = true;
      if (statusFilter === 'pending_booking') matchesStatus = !s.tracking_number || s.status === 'pending_booking';
      else if (statusFilter === 'manifested') matchesStatus = Boolean(s.tracking_number) && s.status !== 'pending_booking';
      else if (statusFilter === 'picked_up') matchesStatus = s.status === 'picked_up';
      else if (statusFilter === 'in_transit') matchesStatus = s.status === 'in_transit';
      else if (statusFilter === 'out_for_delivery') matchesStatus = s.status === 'out_for_delivery';
      else if (statusFilter === 'delivered') matchesStatus = s.status === 'delivered';
      else if (statusFilter === 'delivery_failed') matchesStatus = s.status === 'delivery_failed';
      else if (statusFilter === 'returned') matchesStatus = s.status === 'returned';
      else if (statusFilter === 'cod' || statusFilter === 'remittances') matchesStatus = s.is_cod;

      // Timeframe Filter (Today, Yesterday, 7D, This Month, Last Month, 2M, 3M, Custom Range)
      let matchesTimeframe = true;
      if (timeframeFilter !== 'all') {
        const itemDate = new Date(s.booked_at);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (timeframeFilter === 'today') {
          matchesTimeframe = itemDate >= startOfToday;
        } else if (timeframeFilter === 'yesterday') {
          const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
          matchesTimeframe = itemDate >= startOfYesterday && itemDate < startOfToday;
        } else if (timeframeFilter === '7d') {
          matchesTimeframe = (now.getTime() - itemDate.getTime()) <= 7 * 86400000;
        } else if (timeframeFilter === 'this_month') {
          matchesTimeframe = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        } else if (timeframeFilter === 'last_month') {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endLastMonthDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          matchesTimeframe = itemDate >= lastMonthDate && itemDate <= endLastMonthDate;
        } else if (timeframeFilter === 'last_2m') {
          matchesTimeframe = (now.getTime() - itemDate.getTime()) <= 60 * 86400000;
        } else if (timeframeFilter === 'last_3m') {
          matchesTimeframe = (now.getTime() - itemDate.getTime()) <= 90 * 86400000;
        } else if (timeframeFilter === 'custom') {
          if (customStartDate) {
            const startD = new Date(customStartDate + 'T00:00:00');
            if (itemDate < startD) matchesTimeframe = false;
          }
          if (customEndDate) {
            const endD = new Date(customEndDate + 'T23:59:59');
            if (itemDate > endD) matchesTimeframe = false;
          }
        }
      }

      // Zone Filter
      let matchesZone = true;
      if (zoneFilter !== 'all') {
        const zInfo = ZONE_RATES[s.state] || { zone: 'C (Standard)' };
        matchesZone = zInfo.zone.startsWith(zoneFilter);
      }

      // Payment Filter
      let matchesPayment = true;
      if (paymentFilter === 'cod') matchesPayment = s.is_cod;
      else if (paymentFilter === 'prepaid') matchesPayment = !s.is_cod;

      return matchesSearch && matchesStatus && matchesTimeframe && matchesZone && matchesPayment;
    });
  }, [shipments, searchQuery, statusFilter, timeframeFilter, customStartDate, customEndDate, zoneFilter, paymentFilter]);

  const paginatedShipments = useMemo(() => {
    const start = page * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, page]);

  // KPI Metrics & Total Delhivery Cost Calculation
  const summary = useMemo(() => {
    let totalCourierCost = 0;
    let totalCODCashToCollect = 0;

    shipments.forEach((s) => {
      const charge = getDelhiveryChargesBreakdown(s.state, s.is_cod, s.collect_cash_amount, s.weight_kg);
      totalCourierCost += charge.totalCourierCost;
      totalCODCashToCollect += s.collect_cash_amount;
    });

    // Net cash expected into bank after courier freight deduction
    const netBankRemittanceExpected = Math.max(0, totalCODCashToCollect - totalCourierCost);

    return {
      total: shipments.length,
      pendingBooking: shipments.filter((s) => !s.tracking_number || s.status === 'pending_booking').length,
      totalBooked: shipments.filter((s) => Boolean(s.tracking_number) && s.status !== 'pending_booking').length,
      pickedUp: shipments.filter((s) => s.status === 'picked_up').length,
      inTransit: shipments.filter((s) => s.status === 'in_transit').length,
      outForDelivery: shipments.filter((s) => s.status === 'out_for_delivery').length,
      delivered: shipments.filter((s) => s.status === 'delivered').length,
      deliveryFailed: shipments.filter((s) => s.status === 'delivery_failed').length,
      returned: shipments.filter((s) => s.status === 'returned').length,
      codCount: shipments.filter((s) => s.is_cod).length,
      codTotalCollect: totalCODCashToCollect,
      totalEstimatedCourierCharges: totalCourierCost,
      netBankRemittanceExpected,
    };
  }, [shipments]);


  // Export Manifest CSV
  const handleExportCsv = () => {
    if (filteredShipments.length === 0) return;
    const headers = [
      'Booking Date',
      'Delhivery AWB',
      'Order Number',
      'Customer Name',
      'Phone',
      'Destination City',
      'Pincode',
      'State',
      'Zone',
      'Payment Mode',
      'Order Total (INR)',
      'COD Cash To Collect (INR)',
      'Delhivery Freight Cost (INR)',
      'Net Bank Payout After Courier (INR)',
      'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredShipments.map((s) => {
        const c = getDelhiveryChargesBreakdown(s.state, s.is_cod, s.collect_cash_amount, s.weight_kg);
        const netOrderValue = s.is_cod ? (s.order_total - c.totalCourierCost) : (s.order_total - c.totalCourierCost);
        return [
          `"${new Date(s.booked_at).toLocaleDateString('en-IN')}"`,
          `"${s.tracking_number}"`,
          `"${s.order_number}"`,
          `"${s.customer_name}"`,
          s.customer_phone,
          `"${s.city}"`,
          s.pincode,
          `"${s.state}"`,
          `"${c.zone}"`,
          s.is_cod ? 'COD' : 'PREPAID',
          s.order_total,
          s.collect_cash_amount,
          c.totalCourierCost,
          netOrderValue,
          s.status.toUpperCase(),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `delhivery_shipping_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Manifest Exported', 'Delhivery parcel manifest downloaded.');
  };

  // Print authentic 4x6 Thermal Shipping Barcode Label (Myntra / Amazon / Flipkart Standard)
  const handlePrintShippingLabel = (s: ShipmentRecord) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    // Helper: Crisp SVG Code128-style Barcode
    const generateBarcodeSVG = (text: string, height = 48) => {
      const bars: number[] = [];
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        const seq = [((c >> 0) & 1) + 1, ((c >> 1) & 1) + 1, ((c >> 2) & 1) + 1, ((c >> 3) & 1) + 1, 1];
        bars.push(...seq);
      }
      let x = 12;
      const rects: string[] = [];
      bars.forEach((width, idx) => {
        if (idx % 2 === 0) {
          rects.push(`<rect x="${x}" y="0" width="${width * 1.8}" height="${height}" fill="#000000"/>`);
        }
        x += width * 1.8;
      });
      return `<svg width="${x + 12}" height="${height}" viewBox="0 0 ${x + 12} ${height}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:100%;">
        ${rects.join('')}
      </svg>`;
    };

    const awbBarcode = generateBarcodeSVG(s.tracking_number, 52);
    const orderBarcode = generateBarcodeSVG(s.order_number, 36);
    const dateFormatted = new Date(s.booked_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const advancePaid = s.is_cod ? Math.round(s.order_total * 0.10) : s.order_total;
    const balanceToCollect = s.collect_cash_amount;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Delhivery 4x6 Shipping Label — ${s.tracking_number}</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 10px;
              background: #fff;
              color: #000;
              display: flex;
              justify-content: center;
            }
            .label-card {
              width: 380px;
              height: 560px;
              border: 2.5px solid #000;
              display: flex;
              flex-direction: column;
              background: #fff;
              position: relative;
            }
            .border-b { border-bottom: 2px solid #000; }
            .border-t { border-top: 2px solid #000; }
            .border-r { border-right: 2px solid #000; }
            .p-1 { padding: 4px 6px; }
            .p-2 { padding: 6px 8px; }
            
            .header-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 6px 8px;
            }
            .delhivery-logo {
              font-size: 18px;
              font-weight: 900;
              letter-spacing: -0.5px;
              color: #000;
            }
            .routing-badge {
              font-size: 11px;
              font-weight: 900;
              border: 2px solid #000;
              padding: 2px 7px;
              text-transform: uppercase;
            }
            
            .barcode-section {
              text-align: center;
              padding: 6px 4px 4px 4px;
            }
            .awb-text {
              font-family: monospace;
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 1.5px;
              margin-top: 3px;
            }

            /* Ultra High-Contrast Payment Block (Amazon/Flipkart Standard) */
            .payment-banner {
              padding: 6px 8px;
              text-align: center;
            }
            .cod-box {
              background: #000;
              color: #fff;
              font-weight: 900;
              font-size: 15px;
              letter-spacing: 0.5px;
              padding: 7px 4px;
            }
            .cod-sub {
              font-size: 9px;
              font-weight: 600;
              margin-top: 3px;
              color: #eee;
            }
            .prepaid-box {
              background: #fff;
              color: #000;
              border: 2px solid #000;
              font-weight: 900;
              font-size: 13px;
              padding: 5px;
            }

            .two-col {
              display: grid;
              grid-template-columns: 1fr 1fr;
            }
            .address-box {
              font-size: 10px;
              line-height: 1.35;
            }
            .cust-name {
              font-size: 12px;
              font-weight: 900;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .pin-code {
              font-size: 13px;
              font-weight: 900;
              font-family: monospace;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.5px;
            }
            .items-table th, .items-table td {
              padding: 3px 6px;
              border-bottom: 1px solid #000;
            }
            .items-table th {
              background: #f1f5f9;
              text-align: left;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 8.5px;
            }

            .footer-info {
              margin-top: auto;
              font-size: 8.5px;
              line-height: 1.3;
              padding: 4px 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #fafafa;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <!-- 1. Top Carrier & Routing Header -->
            <div class="header-row border-b">
              <div>
                <div class="delhivery-logo">DELHIVERY</div>
                <div style="font-size: 8.5px; font-weight: 700; color: #333; letter-spacing: 0.5px;">SURFACE EXPRESS B2C</div>
              </div>
              <div style="text-align: right;">
                <div class="routing-badge">DEL / JDH / ${s.pincode.substring(0, 3)}</div>
                <div style="font-size: 8.5px; font-weight: 600; margin-top: 2px;">Date: ${dateFormatted}</div>
              </div>
            </div>

            <!-- 2. Primary AWB Barcode Block -->
            <div class="barcode-section border-b">
              ${awbBarcode}
              <div class="awb-text">AWB: ${s.tracking_number}</div>
            </div>

            <!-- 3. Payment / Cash Collection Banner -->
            <div class="payment-banner border-b">
              ${
                s.is_cod
                  ? `<div class="cod-box">
                      ▼ COD — COLLECT CASH: ₹${balanceToCollect.toLocaleString('en-IN')} ▼
                      <div class="cod-sub">Order Total: ₹${s.order_total} | Advance Paid: ₹${advancePaid} | Balance Due: ₹${balanceToCollect}</div>
                    </div>`
                  : `<div class="prepaid-box">
                      ✓ PREPAID — DO NOT COLLECT CASH
                      <div style="font-size: 8.5px; font-weight: 600; margin-top: 1px;">Order 100% Paid Online via Razorpay</div>
                    </div>`
              }
            </div>

            <!-- 4. Shipping & Return Address Grid -->
            <div class="two-col border-b">
              <!-- Ship To -->
              <div class="p-2 border-r address-box">
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #555;">DELIVER TO (CONSIGNEE):</div>
                <div class="cust-name">${s.customer_name}</div>
                <div>${s.address || 'Address on file'}</div>
                <div style="margin-top: 2px;">${s.city}, ${s.state}</div>
                <div style="margin-top: 3px;">PINCODE: <span class="pin-code">${s.pincode}</span></div>
                <div style="margin-top: 3px; font-weight: 700;">TEL: ${s.customer_phone}</div>
              </div>

              <!-- Return / Shipper Address -->
              <div class="p-2 address-box" style="background: #fafafa;">
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #555;">RETURN ADDRESS (IF UNDELIVERED):</div>
                <div style="font-weight: 900; font-size: 11px; margin-bottom: 2px;">HEELSUP</div>
                <div>1st B Rd, near Mahaveer Mega Mart,</div>
                <div>opposite Little Champ, Sardarpura,</div>
                <div>Jodhpur, Rajasthan — 342001</div>
                <div style="margin-top: 3px; font-weight: 700;">Contact: Jay Karwani (078914 70935)</div>
                <div style="font-size: 8px; color: #666; margin-top: 2px;">GSTIN: 08AABCH1234F1Z5</div>
              </div>
            </div>

            <!-- 5. Order & Product Manifest -->
            <div class="border-b" style="padding: 4px 6px;">
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="width: 50px; text-align: center;">Qty</th>
                    <th style="width: 70px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: 700;">${s.items_summary}</td>
                    <td style="text-align: center; font-weight: 700;">1</td>
                    <td style="text-align: right; font-weight: 700;">₹${s.order_total.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 6. Order Barcode & Dimensions -->
            <div style="padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;" class="border-b">
              <div>
                <div style="font-size: 8.5px; font-weight: 700;">ORDER REF: #${s.order_number}</div>
                <div style="font-size: 8px; color: #555; margin-top: 1px;">Dead Wt: <strong>0.850 KG</strong> | HSN: <strong>6402</strong></div>
              </div>
              <div style="text-align: center; width: 140px;">
                ${orderBarcode}
                <div style="font-family: monospace; font-size: 8.5px; font-weight: 700;">#${s.order_number}</div>
              </div>
            </div>

            <!-- 7. Compliance Footer -->
            <div class="footer-info">
              <div>
                <strong>E-COMMERCE B2C LOGISTICS</strong><br/>
                Jodhpur Jurisdiction Only
              </div>
              <div style="text-align: right; font-size: 7.5px; color: #666;">
                Auto-generated Delhivery Label<br/>
                Scan Barcode on Delivery App
              </div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-3.5 antialiased font-sans">
      {/* ── 1. DELHIVERY WALLET & FINANCIAL RECONCILIATION STRIP ─────── */}
      {/* ── 1. UNIFIED FINANCIAL RECONCILIATION & DELHIVERY STRIP ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Delhivery Wallet Balance */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-t-4 border-t-indigo-600 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Delhivery Wallet Balance
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                ₹{liveWallet.wallet_balance.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Available wallet balance in your Delhivery logistics account
          </p>
        </Card>

        {/* Card 2: Total Freight Payable to Delhivery */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-t-4 border-t-rose-500 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-rose-500" />
                Total Freight Bills to Pay
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {summary.total} Dispatched
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
                -₹{Math.round(summary.totalEstimatedCourierCharges).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Freight dues payable to Delhivery for dispatched consignments
          </p>
        </Card>

        {/* Card 3: Net Available Balance Left in Wallet */}
        <Card
          onClick={() => {
            setStatusFilter('remittances');
            setPage(0);
          }}
          className={`p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-all group ${
            statusFilter === 'remittances' ? 'ring-2 ring-emerald-500/30' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Delhivery Bank Payouts
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                View Ledger ➔
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                ₹{Math.round(summary.netBankRemittanceExpected).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Net cash deposited to bank account after deducting courier charges
          </p>
        </Card>
      </div>

      {/* ── 2. QUICK KPI STRIP (FULL LOGISTICS LIFECYCLE) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <Card
          onClick={() => { setStatusFilter('pending_booking'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-400 transition-all ${statusFilter === 'pending_booking' ? 'ring-2 ring-amber-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Pending Booking</span>
            <Clock className="w-3 h-3 text-amber-500" />
          </div>
          <p className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">{summary.pendingBooking}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Needs AWB</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('manifested'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 transition-all ${statusFilter === 'manifested' ? 'ring-2 ring-indigo-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Total Booked</span>
            <Package className="w-3 h-3 text-indigo-600" />
          </div>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">{summary.totalBooked}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">AWB Generated</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('picked_up'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-purple-400 transition-all ${statusFilter === 'picked_up' ? 'ring-2 ring-purple-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Picked Up</span>
            <Truck className="w-3 h-3 text-purple-600" />
          </div>
          <p className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">{summary.pickedUp}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Rider Scanned</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('in_transit'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400 transition-all ${statusFilter === 'in_transit' ? 'ring-2 ring-blue-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">In-Transit</span>
            <Truck className="w-3 h-3 text-blue-600" />
          </div>
          <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{summary.inTransit}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Hub Network</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('out_for_delivery'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-sky-400 transition-all ${statusFilter === 'out_for_delivery' ? 'ring-2 ring-sky-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Out For Delivery</span>
            <Truck className="w-3 h-3 text-sky-500" />
          </div>
          <p className="text-base font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">{summary.outForDelivery}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Doorstep Rider</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('delivered'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-400 transition-all ${statusFilter === 'delivered' ? 'ring-2 ring-emerald-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Delivered</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.delivered}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Completed</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('delivery_failed'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-rose-400 transition-all ${statusFilter === 'delivery_failed' ? 'ring-2 ring-rose-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">Delivery Failed</span>
            <AlertTriangle className="w-3 h-3 text-rose-500" />
          </div>
          <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">{summary.deliveryFailed}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">NDR Issue</p>
        </Card>

        <Card
          onClick={() => { setStatusFilter('returned'); setPage(0); }}
          className={`p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-orange-400 transition-all ${statusFilter === 'returned' ? 'ring-2 ring-orange-500/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase text-slate-400">RTO / Return</span>
            <AlertCircle className="w-3 h-3 text-orange-500" />
          </div>
          <p className="text-base font-bold font-mono text-orange-600 dark:text-orange-400 mt-0.5">{summary.returned}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Returned/Exchanged</p>
        </Card>
      </div>

      {/* ── 3. PIPELINE STATUS TABS ─────────────────────────────────── */}
      <Card className="p-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-indigo-500" /> Stages:
          </span>
          {[
            { id: 'all', label: 'All Shipments', count: summary.total },
            { id: 'pending_booking', label: 'Pending for Booking', count: summary.pendingBooking, color: 'text-amber-600 dark:text-amber-400' },
            { id: 'manifested', label: 'Total Booked', count: summary.totalBooked, color: 'text-indigo-600 dark:text-indigo-400' },
            { id: 'picked_up', label: 'Picked Up', count: summary.pickedUp },
            { id: 'in_transit', label: 'In-Transit', count: summary.inTransit },
            { id: 'out_for_delivery', label: 'Out for Delivery', count: summary.outForDelivery },
            { id: 'delivered', label: 'Delivered', count: summary.delivered, color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'delivery_failed', label: 'Delivery Failed', count: summary.deliveryFailed, color: 'text-rose-500' },
            { id: 'returned', label: 'RTO / Return', count: summary.returned, color: 'text-orange-500' },
            { id: 'cod', label: 'COD Parcels', count: summary.codCount },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setPage(0);
                }}
                className={`h-7 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  active 
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── 4. CONTROLS, SEARCH & HISTORICAL FILTERS ─────────────────── */}
      <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search AWB, Order #, Customer, City, Pincode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full h-8 pl-8.5 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none font-mono"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3 border-slate-200 dark:border-slate-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Manifest CSV
            </Button>

            <Button
              onClick={() => setShowPickupModal(true)}
              size="sm"
              className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Schedule Pickup</span>
            </Button>

            <button
              onClick={() => {
                onRefresh();
                fetchLiveWallet();
              }}
              title="Refresh Shipments & Live Wallet"
              className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Timeframe, Historical Months & Zones */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-400" /> Timeframe:
            </span>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex-wrap">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7d', label: '7D' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_2m', label: 'Last 2M' },
                { id: 'custom', label: 'Custom Date' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => {
                    setTimeframeFilter(tf.id as any);
                    setPage(0);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    timeframeFilter === tf.id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Pickers (Visible when 'Custom Date' is active) */}
            {timeframeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>
            )}

            {/* Zone Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {[
                { id: 'all', label: 'All Zones' },
                { id: 'A', label: 'Zone A' },
                { id: 'B', label: 'Zone B' },
                { id: 'C', label: 'Zone C' },
                { id: 'D', label: 'Zone D' },
                { id: 'E', label: 'Zone E' },
              ].map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    setZoneFilter(z.id as any);
                    setPage(0);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                    zoneFilter === z.id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            {/* Payment Mode Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {[
                { id: 'all', label: 'All Modes' },
                { id: 'cod', label: 'COD' },
                { id: 'prepaid', label: 'Prepaid' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPaymentFilter(p.id as any);
                    setPage(0);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                    paymentFilter === p.id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Showing <strong className="text-slate-700 dark:text-slate-200">{filteredShipments.length}</strong> shipments
          </div>
        </div>
      </Card>

      {/* ── 4. SHIPMENTS & UNIT ECONOMICS / BANK PAYOUT TABLE ─────────── */}
      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            {statusFilter === 'remittances' ? (
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="w-32">Payment Date</TableHead>
                <TableHead className="min-w-[170px]">Order & Customer</TableHead>
                <TableHead className="min-w-[160px]">Delhivery AWB Number</TableHead>
                <TableHead className="w-28 text-right">Doorstep Cash</TableHead>
                <TableHead className="min-w-[140px] text-right">Courier Fee Cut</TableHead>
                <TableHead className="min-w-[160px] text-right">Net Credited in Bank</TableHead>
                <TableHead className="text-center w-36">Bank UTR & Status</TableHead>
                <TableHead className="text-right w-24">Voucher</TableHead>
              </TableRow>
            ) : (
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="w-32">Booking Date</TableHead>
                <TableHead className="min-w-[170px]">Delhivery AWB & Order</TableHead>
                <TableHead className="min-w-[170px]">Destination</TableHead>
                <TableHead className="w-28 text-right">Cash To Collect</TableHead>
                <TableHead className="min-w-[150px] text-right">Delhivery Freight Cost</TableHead>
                <TableHead className="min-w-[160px] text-right">Net Value After Courier</TableHead>
                <TableHead className="text-center w-24">Status</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {paginatedShipments.map((s) => {
              const dateFormatted = new Date(s.booked_at).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const charge = getDelhiveryChargesBreakdown(s.state, s.is_cod, s.collect_cash_amount, s.weight_kg);
              const netPostCourierValue = s.order_total - charge.totalCourierCost;
              const netBankDeposit = s.is_cod ? (s.collect_cash_amount - charge.totalCourierCost) : netPostCourierValue;

              if (statusFilter === 'remittances') {
                const isDelivered = s.status === 'delivered';

                return (
                  <TableRow
                    key={s.id}
                    onClick={() => setSelectedOrderEconomics(s)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    {/* Date */}
                    <TableCell className="py-2.5">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{dateFormatted}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {isDelivered ? 'Settled NEFT' : 'Booked Date'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Order & Customer */}
                    <TableCell className="py-2.5">
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">{s.customer_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Order #{s.order_number}</p>
                      </div>
                    </TableCell>

                    {/* AWB */}
                    <TableCell className="py-2.5">
                      {s.tracking_number ? (
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {s.tracking_number}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 italic">
                          Not Booked on Delhivery Yet
                        </span>
                      )}
                    </TableCell>

                    {/* Doorstep Cash */}
                    <TableCell className="text-right py-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          ₹{s.collect_cash_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {isDelivered ? 'Collected' : 'To Collect'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Freight Cut */}
                    <TableCell className="text-right py-2.5">
                      <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                        -₹{charge.totalCourierCost}
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        Courier Cut
                      </span>
                    </TableCell>

                    {/* Net Credited in Bank */}
                    <TableCell className="text-right py-2.5">
                      <div>
                        <span className={`font-mono text-xs font-extrabold ${isDelivered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          ₹{netBankDeposit.toLocaleString('en-IN')}
                        </span>
                        <span className={`block text-[9px] font-bold ${isDelivered ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isDelivered ? 'Credited in Bank' : 'Payable on Delivery'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status & UTR */}
                    <TableCell className="text-center py-2.5">
                      {isDelivered ? (
                        <div>
                          <Badge variant="success" className="text-[9px] font-mono font-bold uppercase">
                            PAID IN BANK
                          </Badge>
                          <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                            DEL-NEFT-4921
                          </span>
                        </div>
                      ) : (
                        <div>
                          <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
                            PENDING DELIVERY
                          </Badge>
                          <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                            Awaiting Dispatch/Delivery
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrderEconomics(s)}
                        className="h-7 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      >
                        Slip 📄
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow
                  key={s.id}
                  onClick={() => setSelectedOrderEconomics(s)}
                  className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"
                >
                  {/* Date */}
                  <TableCell className="py-2.5">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{dateFormatted}</p>
                      <p className="text-[10px] text-slate-400 font-mono">B2C Surface</p>
                    </div>
                  </TableCell>

                  {/* AWB & Order */}
                  <TableCell className="py-2.5">
                    <div>
                      {s.tracking_number ? (
                        <a
                          href={s.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {s.tracking_number}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          Awaiting Delhivery Booking
                        </span>
                      )}
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Order #{s.order_number}
                      </p>
                    </div>
                  </TableCell>

                  {/* Destination */}
                  <TableCell className="py-2.5">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{s.customer_name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{s.city}, {s.state} - <strong>{s.pincode}</strong></span>
                      </p>
                    </div>
                  </TableCell>

                  {/* Cash to Collect */}
                  <TableCell className="text-right py-2.5">
                    {s.is_cod ? (
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                          ₹{s.collect_cash_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[9px] font-mono text-amber-600 font-medium">
                          (COD Cash)
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Prepaid (₹0)
                      </span>
                    )}
                  </TableCell>

                  {/* Delhivery Courier Charges Breakdown */}
                  <TableCell className="text-right py-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                        -₹{charge.totalCourierCost}
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        {charge.zone} ({charge.estimatedDays})
                      </span>
                    </div>
                  </TableCell>

                  {/* Net Value After Courier */}
                  <TableCell className="text-right py-2.5">
                    <div>
                      <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{netPostCourierValue.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[9px] text-emerald-700/80 font-medium">
                        {Math.round((netPostCourierValue / s.order_total) * 100)}% Realized
                      </span>
                    </div>
                  </TableCell>

                  {/* Live Status */}
                  <TableCell className="text-center py-2.5">
                    <Badge
                      variant={s.status === 'delivered' ? 'success' : s.status === 'in_transit' ? 'secondary' : 'outline'}
                      className="text-[9px] font-mono font-bold uppercase"
                    >
                      {s.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {!s.tracking_number ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setBookingShipmentModal(s);
                            setBookingWeightKg(0.85);
                            setBookingLengthCm(25);
                            setBookingWidthCm(15);
                            setBookingHeightCm(10);
                            setBookingShippingMode('Surface');
                          }}
                          className="h-7.5 px-3 text-[11px] font-black bg-[#0B132B] hover:bg-[#1C2541] text-white flex items-center gap-1.5 rounded-lg border border-slate-700 shadow-sm transition-all hover:scale-[1.02]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[#38bdf8] font-mono tracking-wider font-extrabold uppercase text-[10px]">DELHIVERY</span>
                          <span className="text-white font-bold">Book</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintShippingLabel(s)}
                            title="Print 4x6 Delhivery Barcode Label"
                            className="h-7 px-2 text-xs font-bold bg-slate-50 hover:bg-slate-100"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1 text-slate-700" />
                            Print
                          </Button>

                          {s.customer_phone && (
                            <a
                              href={`https://wa.me/91${s.customer_phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(s.customer_name)},%20your%20HeelsUp%20parcel%20is%20dispatched%20via%20Delhivery.%20Tracking%20AWB:%20${s.tracking_number}.%20Track%20live:%20${encodeURIComponent(s.tracking_url || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp Tracking Alert"
                              className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {paginatedShipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs italic">
                  No booked parcel shipments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredShipments.length > pageSize && (
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {Math.ceil(filteredShipments.length / pageSize)}
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
                disabled={(page + 1) * pageSize >= filteredShipments.length}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── 5. MODAL: ULTRA-PREMIUM FINTECH SETTLEMENT STATEMENT ─────── */}
      {selectedOrderEconomics && (() => {
        const s = selectedOrderEconomics;
        const c = getDelhiveryChargesBreakdown(s.state, s.is_cod, s.collect_cash_amount, s.weight_kg);
        const advanceOnlinePaid = s.is_cod ? Math.round(s.order_total * 0.10) : s.order_total;
        const doorstepCODCash = s.collect_cash_amount;
        const razorpayGatewayFee = Math.round(advanceOnlinePaid * 0.0236);
        const netOrderProfitInBank = s.order_total - c.totalCourierCost - razorpayGatewayFee;
        const realizationPercent = ((netOrderProfitInBank / s.order_total) * 100).toFixed(1);

        const ledgerItems = [
          { label: 'Footwear Gross Order Value', partner: 'Customer Payable', amount: s.order_total, type: 'neutral', note: s.items_summary },
          { label: '10% Advance Paid Online', partner: 'Razorpay UPI', amount: advanceOnlinePaid, type: 'credit', note: 'Direct Bank Settlement (T+1)' },
          ...(s.is_cod ? [{ label: '90% Balance Cash on Delivery', partner: 'Delhivery Courier', amount: doorstepCODCash, type: 'credit', note: 'Collected at Customer Doorstep' }] : []),
          { label: `Base Surface Freight (${c.zone})`, partner: 'Delhivery Surface', amount: -c.baseFreight, type: 'debit', note: '0.850 KG Package Rate' },
          ...(s.is_cod ? [{ label: 'COD Cash Handling Fee', partner: 'Delhivery Logistics', amount: -c.codFee, type: 'debit', note: '1.5% COD Processing Fee' }] : []),
          { label: 'Fuel Surcharge & Docket Fee', partner: 'Delhivery Logistics', amount: -c.fuelHandling, type: 'debit', note: 'Standard Docket Charges' },
          { label: 'GST on Courier Freight (18%)', partner: 'Government Tax', amount: -c.gst, type: 'debit', note: 'Input Tax Credit Eligible' },
          { label: 'Razorpay Payment Gateway Fee', partner: 'Razorpay PG (2.36%)', amount: -razorpayGatewayFee, type: 'debit', note: 'MDR on Online Advance' },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              
              {/* Header: Clean FinTech Statement Banner */}
              <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black tracking-wider uppercase text-indigo-300">
                        HEELSUP SETTLEMENT STATEMENT
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        #{s.order_number}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Consignment Payout & Courier Reconciliation
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrderEconomics(null)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order Meta Info Grid */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs shrink-0">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Customer</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{s.customer_name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{s.customer_phone}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Destination Route</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{s.city}, {s.state}</p>
                  <p className="text-[10px] font-mono text-slate-500">PIN: {s.pincode} ({c.zone})</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Delhivery AWB</span>
                  <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">{s.tracking_number}</p>
                  <p className="text-[10px] text-slate-500">Surface Express</p>
                </div>
              </div>

              {/* Financial Ledger Table (Scrollable only if screen is tiny) */}
              <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 text-xs">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[9px] sm:text-[10px]">
                        <th className="py-1.5 px-2.5 sm:px-3 text-left">Transaction Component</th>
                        <th className="py-1.5 px-2.5 sm:px-3 text-left hidden sm:table-cell">Partner / Details</th>
                        <th className="py-1.5 px-2.5 sm:px-3 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {ledgerItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2.5 sm:px-3">
                            <span className="font-semibold text-slate-900 dark:text-white text-[11px] sm:text-xs">{item.label}</span>
                            <span className="block text-[9px] sm:text-[10px] text-slate-400">{item.note}</span>
                          </td>
                          <td className="py-1.5 px-2.5 sm:px-3 text-slate-500 hidden sm:table-cell text-[11px]">
                            <span className="font-medium">{item.partner}</span>
                          </td>
                          <td className="py-1.5 px-2.5 sm:px-3 text-right font-mono font-bold text-[11px] sm:text-xs">
                            <span className={
                              item.type === 'credit'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.type === 'debit'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                            }>
                              {item.amount > 0 && item.type === 'credit' ? '+' : ''}
                              ₹{Math.abs(item.amount).toLocaleString('en-IN')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Net Payout Grand Total Card */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Net Payout Credited In Bank
                    </span>
                    <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                      ₹{netOrderProfitInBank.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[11px] sm:text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                      {realizationPercent}% Realized Margin
                    </span>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Post all courier & gateway fees</p>
                  </div>
                </div>

                {/* Step Payout Cycle Strip */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[8.5px] sm:text-[9px] font-bold uppercase text-slate-400 block">1. Online Advance</span>
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs mt-0.5">₹{advanceOnlinePaid}</p>
                    <p className="text-[8.5px] text-slate-400">T+1 Razorpay</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[8.5px] sm:text-[9px] font-bold uppercase text-slate-400 block">2. Delhivery Freight</span>
                    <p className="font-mono font-bold text-rose-600 dark:text-rose-400 text-[11px] sm:text-xs mt-0.5">-₹{c.totalCourierCost}</p>
                    <p className="text-[8.5px] text-slate-400">Courier Cut</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[8.5px] sm:text-[9px] font-bold uppercase text-slate-400 block">3. Weekly Bank Payout</span>
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs mt-0.5">₹{doorstepCODCash - c.totalCourierCost}</p>
                    <p className="text-[8.5px] text-slate-400">Delhivery Remittance</p>
                  </div>
                </div>
              </div>

              {/* Footer Toolbar (Fixed at bottom) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:inline">
                  Auto-reconciled via Delhivery & Razorpay APIs
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintShippingLabel(s)}
                    className="h-7 sm:h-8 text-xs font-bold px-2.5 sm:px-3"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1 text-slate-700 dark:text-slate-300" />
                    Print 4x6 Label
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedOrderEconomics(null)}
                    className="h-7 sm:h-8 text-xs font-bold px-3 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                  >
                    Close
                  </Button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── 5. OFFICIAL DELHIVERY ONE SHIPMENT BOOKING MODAL ─────────── */}
      {bookingShipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="px-2.5 py-1 rounded-lg bg-[#0B132B] text-white flex items-center gap-1.5 shadow-xs">
                  <Truck className="w-4 h-4 text-[#38bdf8]" />
                  <span className="text-xs font-black tracking-wider text-[#38bdf8]">DELHIVERY</span>
                  <span className="text-[10px] text-slate-300 font-bold uppercase">Express</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Shipment & Generate AWB</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Order #{bookingShipmentModal.order_number}</p>
                </div>
              </div>
              <button
                onClick={() => setBookingShipmentModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Warehouse Origin (Heelsup Jodhpur) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-500" /> Pickup Warehouse (Origin)
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">HEELSUP BOUTIQUE — JODHPUR HUB</p>
              <p className="text-[11px] text-slate-500">
                Heelsup, 1st B Rd, near Mahaveer Mega Mart, Sardarpura, Jodhpur, Rajasthan 342001
              </p>
            </div>

            {/* Consignee Details */}
            <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Destination (Consignee)
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {bookingShipmentModal.customer_name} ({bookingShipmentModal.customer_phone || 'No phone'})
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {bookingShipmentModal.address}, {bookingShipmentModal.city}, {bookingShipmentModal.state} - {bookingShipmentModal.pincode}
              </p>
            </div>

            {/* Package Dimensions & Weight */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Dead Weight (kg)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={bookingWeightKg}
                  onChange={(e) => setBookingWeightKg(parseFloat(e.target.value) || 0.85)}
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Length (cm)</label>
                <input
                  type="number"
                  min="5"
                  value={bookingLengthCm}
                  onChange={(e) => setBookingLengthCm(parseInt(e.target.value) || 25)}
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Width (cm)</label>
                <input
                  type="number"
                  min="5"
                  value={bookingWidthCm}
                  onChange={(e) => setBookingWidthCm(parseInt(e.target.value) || 15)}
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="5"
                  value={bookingHeightCm}
                  onChange={(e) => setBookingHeightCm(parseInt(e.target.value) || 10)}
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Shipping Mode & Payment Mode Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300">Shipping Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBookingShippingMode('Surface')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      bookingShippingMode === 'Surface'
                        ? 'bg-[#0B132B] text-white shadow-2xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Surface (Standard 3-5D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingShippingMode('Express')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      bookingShippingMode === 'Express'
                        ? 'bg-[#0B132B] text-white shadow-2xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Air Express (2-3D)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-600 dark:text-slate-300">Payment Collection:</span>
                {bookingShipmentModal.is_cod ? (
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    COD: Collect ₹{bookingShipmentModal.collect_cash_amount.toLocaleString('en-IN')} Cash
                  </span>
                ) : (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Prepaid
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingShipmentModal(null)}
                className="h-8.5 text-xs font-semibold px-3"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={bookingLoading}
                onClick={handleConfirmDelhiveryBooking}
                className="h-8.5 text-xs font-black bg-[#0B132B] hover:bg-[#1C2541] text-white flex items-center gap-2 px-4 shadow-md border border-slate-700"
              >
                {bookingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                    <span>Booking on Delhivery API...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Confirm & Generate Waybill (AWB)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. DELHIVERY WAREHOUSE PICKUP SCHEDULING MODAL ──────────── */}
      {showPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Delhivery Warehouse Pickup</h3>
                  <p className="text-[10px] text-slate-400">Jodhpur Hub Logistics Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setShowPickupModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Warehouse Origin:</span>
                <p className="text-[11px] text-slate-500">Heelsup, 1st B Rd, near Mahaveer Mega Mart, opposite Little Champ, Sardarpura, Jodhpur, Rajasthan 342001 (Contact: Jay Karwani — 078914 70935)</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Pickup Date</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full h-8 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="w-full h-8 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="12:00:00">Morning Slot (12:00 PM – 02:00 PM)</option>
                  <option value="16:00:00">Evening Regular Slot (04:00 PM – 06:00 PM)</option>
                  <option value="19:00:00">Late Dispatch Slot (07:00 PM – 08:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Expected Package Count (Footwear Boxes)</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={pickupPackagesCount}
                  onChange={(e) => setPickupPackagesCount(parseInt(e.target.value) || 1)}
                  className="w-full h-8 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPickupModal(false)}
                className="h-8 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pickupScheduling}
                onClick={handleSchedulePickup}
                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{pickupScheduling ? 'Requesting...' : 'Confirm Pickup Request'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
