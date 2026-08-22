import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, ShoppingBag, ArrowRight, Loader2, MapPin, CreditCard, Calendar } from 'lucide-react'
import HeicImage from '../components/HeicImage'
import { formatSizeToIndian } from '../utils/sizeHelper'
import { trackPurchase } from '../utils/analytics'

interface OrderItem {
  product_id: number;
  product_name: string;
  sku: string | null;
  image: string | null;
  size: string | null;
  color?: string | null;
  quantity: number;
  price: number;
  total_price: number;
}

interface OrderDetail {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_method: string;
  order_status: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  items?: OrderItem[];
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get('number') || ''
  
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const hasTrackedPurchaseRef = useRef(false)

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false)
      return
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/track/${orderNumber}`)
        const data = await res.json()
        if (data.success && data.data) {
          setOrder(data.data)
        }
      } catch (err) {
        console.error('Error tracking order:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderNumber])

  // Track completed purchase in GA4 E-commerce (exactly once per confirmation render)
  useEffect(() => {
    if (order && !hasTrackedPurchaseRef.current) {
      hasTrackedPurchaseRef.current = true
      trackPurchase({
        transaction_id: order.order_number,
        value: (order.total_amount || 0) / 100, // Rupees
        shipping: (order.shipping_amount || 0) / 100,
        tax: 0,
        items: order.items?.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          price: (it.price || 0) / 100,
          quantity: it.quantity,
          size: it.size,
          color: it.color
        }))
      })
    }
  }, [order])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 flex flex-col items-center justify-center min-h-[50vh] select-none">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-gray-400 mt-4 tracking-widest uppercase">Fetching Order Summary...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 mt-16 mb-24 select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-6 md:p-10 shadow-md flex flex-col items-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
        <h1 className="text-2xl md:text-3xl font-light text-gray-900 text-center font-display italic">Order Confirmed!</h1>
        <p className="text-xs text-gray-500 mt-2 text-center max-w-sm">
          Thank you for shopping with HeelsUp. Your transaction was processed successfully.
        </p>

        {/* Order Number Block */}
        <div className="my-6 p-4 bg-[#fdfbf7] border border-[#ead2ae] rounded-xl w-full flex flex-col md:flex-row justify-between items-center gap-2">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Order Number</span>
            <span className="text-sm font-bold text-gray-900 mt-0.5 tracking-wide select-all">{orderNumber || 'HU-TEMP-ORDER'}</span>
          </div>
          {order && (
            <div className="text-right md:text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</span>
              <span className="text-xs font-semibold text-gray-800 mt-0.5 block">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {order && (
          <div className="w-full space-y-6 text-left border-t border-gray-100 pt-6">
            {/* Items Summary */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Purchased Items</h3>
              <div className="divide-y divide-gray-100">
                {order.items?.map((item, index) => {
                  const skuPrefix = item.sku ? item.sku.split('-')[0] : '';
                  const imgUrl = item.image || undefined;

                  return (
                    <div key={index} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden flex-shrink-0">
                          <HeicImage
                            src={imgUrl}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block leading-tight">{item.product_name}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">
                            Size {formatSizeToIndian(item.size)} &middot; Qty {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        ₹{((item.total_price || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Address & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              {/* Delivery Destination */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Destination</h4>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                  {order.address_line1}<br />
                  {order.address_line2 && <>{order.address_line2}<br /></>}
                  {order.city}, {order.state} - {order.pincode}
                </p>
              </div>

              {/* Billing Info */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Billing Summary</h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{(order.subtotal_amount / 100).toLocaleString('en-IN')}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Discount:</span>
                      <span>-₹{(order.discount_amount / 100).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping:</span>
                    <span>{order.shipping_amount > 0 ? `₹${(order.shipping_amount / 100).toLocaleString('en-IN')}` : 'FREE'}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold pt-1.5 border-t border-dashed border-gray-200 text-sm">
                    <span>Grand Total:</span>
                    <span className="text-primary">₹{(order.total_amount / 100).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 leading-relaxed mt-8 mb-6 text-center">
          A receipt and tracking details have been sent to your email. Most orders are dispatched from our warehouse in Jodhpur within 48 hours.
        </p>

        <div className="w-full space-y-3">
          <Link
            to="/shop"
            className="w-full py-3 bg-primary hover:bg-[#b17e3f] text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            Continue Shopping <ShoppingBag className="w-4 h-4" />
          </Link>
          
          <Link
            to={`/profile`}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            View Order History <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
