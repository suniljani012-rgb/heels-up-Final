import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import HeicImage from '../components/HeicImage'
import SEO from '../components/SEO'
import { formatSizeToIndian } from '../utils/sizeHelper'

declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useDisplayPrice } from '../utils/priceHelper'
import { trackCheckout } from '../utils/analytics'


export default function Checkout() {
  const { items, getCartSubtotal, clearCart } = useCartStore()
  const { user, token } = useAuthStore()
  const { showToast } = useToastStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { getDisplayPrice } = useDisplayPrice()

  useEffect(() => {
    if (!token || !user) {
      showToast('error', 'Login Required 🔐', 'Please sign in or create an account to proceed with checkout.')
      navigate('/login?redirect=/checkout')
    } else if (items.length > 0) {
      trackCheckout(Math.round(getCartSubtotal() / 100), items.length)
    }
  }, [token, user, navigate])


  // Coupon variables from cart routing context
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.couponCode || '')
  const [discountVal, setDiscountVal] = useState(location.state?.discount || 0) // Paise
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  useEffect(() => {
    if (location.state?.couponCode) {
      setAppliedCoupon(location.state.couponCode)
      setCouponCode(location.state.couponCode)
    }
    if (location.state?.discount) {
      setDiscountVal(location.state.discount)
    }
  }, [location.state])

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  // Payment method: 'prepaid' or 'cod'
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'cod'>('prepaid')
  // Delivery fee (dynamic based on pincode)
  const [deliveryFee, setDeliveryFee] = useState(49) // ₹49 default
  const [deliveryCod, setDeliveryCod] = useState(true)
  const [deliveryDays, setDeliveryDays] = useState('3-7')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [checkingDelivery, setCheckingDelivery] = useState(false)

  interface SavedAddress {
    id: number;
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    is_default: number;
  }

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  useEffect(() => {
    if (token) {
      fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSavedAddresses(data.data)
            // Pre-fill with default address if found
            const def = data.data.find((a: SavedAddress) => a.is_default === 1) || data.data[0]
            if (def) {
              setName(def.name)
              setPhone(def.phone)
              setAddressLine1(def.line1)
              setAddressLine2(def.line2 || '')
              setCity(def.city)
              setState(def.state)
              setPincode(def.pincode)
            }
          }
        })
        .catch(err => console.error("Error fetching saved addresses:", err))
    }
  }, [token])

  // Calculations
  const subtotalPaise = getCartSubtotal()
  const subtotalRupees = subtotalPaise / 100
  const baseSubtotalRupees = items.reduce((sum, item) => sum + (item.price / 100) * item.qty, 0)
  const isFree = baseSubtotalRupees >= 1599
  
  // Under ₹1599, add ₹49 flat delivery charge at checkout
  const shippingCharge = isFree ? 0 : 49
  const discountRupees = discountVal / 100
  
  // Calculate total before rounding
  const rawTotalRupees = Math.max(0, subtotalRupees + shippingCharge - discountRupees)
  
  // Round the final total to end in 49 or 99
  const roundRupeesValue = (val: number): number => {
    if (val <= 0) return 0;
    const ceilVal = Math.ceil(val)
    const hundreds = Math.floor(ceilVal / 100)
    const remainder = ceilVal % 100
    if (remainder <= 49) {
      return hundreds * 100 + 49
    } else {
      return hundreds * 100 + 99
    }
  }
  const totalRupees = roundRupeesValue(rawTotalRupees)
  
  // Back-calculate the delivery fee to pass to the backend so the database is balanced and validated correctly
  const totalShippingFee = Math.max(0, totalRupees - baseSubtotalRupees + discountRupees)

  // Live pincode delivery check
  useEffect(() => {
    if (!pincode || !/^\d{6}$/.test(pincode)) return
    const timer = setTimeout(async () => {
      setCheckingDelivery(true)
      try {
        const res = await fetch(`/api/shipping/estimate?pincode=${pincode}&total=${subtotalPaise}`)
        const data = await res.json()
        if (data.success && data.data) {
          const d = data.data
          setDeliveryFee(d.is_free ? 0 : d.fee_rupees)
          setDeliveryCod(d.cod_available)
          setDeliveryDays(d.estimated_days)
          setDeliveryCity([d.city, d.state].filter(Boolean).join(', '))
          // If COD not available, switch to prepaid
          if (!d.cod_available) setPaymentMethod('prepaid')
        }
      } catch {
        // silently fail
      } finally {
        setCheckingDelivery(false)
      }
    }, 600) // 600ms debounce
    return () => clearTimeout(timer)
  }, [pincode, subtotalPaise])

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = couponCode.trim().toUpperCase()
    if (!code) return

    setCheckingCoupon(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cart_total: subtotalPaise
        })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setAppliedCoupon(code)
        setDiscountVal(data.data.discount || 0) // Paise
        showToast('success', 'Coupon Applied! 🏷️', data.data.message || `You saved ₹${((data.data.discount || 0) / 100).toFixed(0)}`)
      } else {
        showToast('error', 'Invalid Coupon', data.error || 'This coupon code could not be applied.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not validate coupon code.')
    } finally {
      setCheckingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon('')
    setDiscountVal(0)
    setCouponCode('')
    showToast('info', 'Coupon Removed', 'Coupon discount has been removed.')
  }

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
    }
  }, [user])

  // Secure Checkout click
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    // Quick address validations
    if (!name || !email || !phone || !addressLine1 || !city || !state || !pincode) {
      showToast('error', 'Details Required', 'Please fill in all shipping details.')
      return
    }

    setProcessing(true)
    try {
      const orderBody = {
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          sku: item.id.toString(), // SKU matching id or code
          qty: item.qty,
          price: getDisplayPrice(item.price) / 100, // Rupees to API
          size: item.size,
          color: item.color,
          img: item.img
        })),
        customer: {
          name,
          email,
          phone,
          addressLine1,
          addressLine2,
          city,
          state,
          pincode,
          country: 'India'
        },
        deliveryMethod: 'Standard',
        deliveryFee: totalShippingFee,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : null,
        notes,
        couponCode: appliedCoupon,
        discountAmount: discountRupees
      }

      // 1. Call D1 API to initiate order and get Razorpay details
      const response = await fetch('/api/orders/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(orderBody)
      })

      const initiateData = await response.json()
      if (!initiateData.success) {
        showToast('error', 'Checkout Error', initiateData.error || 'Failed to initialize order.')
        setProcessing(false)
        return
      }

      // If order amount is 0 (fully discounted or free), D1 bypasses payment and places it immediately
      if (initiateData.data.key === 'free_order') {
        showToast('success', 'Order Placed!', 'Your order has been successfully placed.')
        clearCart()
        navigate(`/order-confirmation?number=${initiateData.data.order.orderNumber}`)
        return
      }

      const { key, razorpayOrder, order } = initiateData.data

      // 2. Open Razorpay payment dialog
      const rzpOptions = {
        key: key,
        amount: razorpayOrder.amount,
        currency: 'INR',
        name: 'HeelsUp Store',
        description: `Order #${order.orderNumber}`,
        image: '/logo.png',
        order_id: razorpayOrder.id,
        prefill: {
          name,
          email,
          contact: phone
        },
        theme: {
          color: '#c9a96e'
        },
        handler: async function (response: any) {
          try {
            setProcessing(true)
            // 3. Call API to verify payment
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            })

            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              showToast('success', 'Payment Confirmed! 🎉', 'Your order was successfully placed.')
              clearCart()
              navigate(`/order-confirmation?number=${verifyData.data.order_number}`)
            } else {
              showToast('error', 'Payment Verification Failed', verifyData.error || 'Transaction could not be verified.')
            }
          } catch {
            showToast('error', 'Verification Error', 'Could not verify payment. Please contact support.')
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: async function () {
            // User closed Razorpay popup, cancel payment flow
            setProcessing(false)
            try {
              await fetch('/api/payment/fail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ razorpay_order_id: razorpayOrder.id })
              })
            } catch {}
          }
        }
      }

      const rzp = new window.Razorpay(rzpOptions)
      rzp.open()

    } catch (e) {
      console.error('Checkout submit error:', e)
      showToast('error', 'Checkout Error', 'An error occurred while processing checkout.')
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-screen select-none">
      <SEO title="Secure Checkout | HeelsUp" noindex={true} />
      <Link to="/cart" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-6 font-semibold">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Shipping Form */}
        <form id="checkout-form" onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3">
              Shipping Information
            </h2>

            {savedAddresses.length > 0 && (
              <div className="space-y-2 pb-4 border-b border-gray-100">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Saved Address</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setName(addr.name)
                        setPhone(addr.phone)
                        setAddressLine1(addr.line1)
                        setAddressLine2(addr.line2 || '')
                        setCity(addr.city)
                        setState(addr.state)
                        setPincode(addr.pincode)
                        showToast('info', 'Address Selected', `Delivering to ${addr.label} address.`)
                      }}
                      className="text-left p-3 border border-gray-200 rounded-xl hover:border-primary hover:bg-[#faf9f6] transition-all text-xs space-y-1 bg-white focus:outline-none cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 uppercase text-[9px] tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                          {addr.label}
                        </span>
                        {addr.is_default === 1 && (
                          <span className="text-[8px] text-emerald-600 font-bold uppercase">Default</span>
                        )}
                      </div>
                      <p className="font-bold text-gray-800 line-clamp-1">{addr.name}</p>
                      <p className="text-gray-500 line-clamp-2 leading-relaxed">
                        {addr.line1}, {addr.city}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="e.g. Priyal Sharma"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="e.g. 9829012345"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                placeholder="e.g. priyal@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Street Address</label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                placeholder="Flat / House / Apartment No. & Street name"
              />
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary mt-2"
                placeholder="Landmark, Area, Colony (Optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="e.g. Jodhpur"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="e.g. Rajasthan"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Pincode</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="e.g. 342001"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Order Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                placeholder="Instructions for delivery..."
              />
            </div>
          </div>
        </form>

        {/* Order Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-gray-100 rounded-xl p-6 bg-[#faf9f6] shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200/60 pb-3">
              Order Review
            </h2>

            {/* List */}
            <div className="divide-y divide-gray-200/60 max-h-60 overflow-y-auto pr-2 space-y-3">
              {items.map((item) => (
                <div key={`${item.id}-${item.color}-${item.size}`} className="flex items-center gap-3 pt-3 first:pt-0">
                  <HeicImage
                    src={item.img}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg bg-white border border-gray-100"
                  />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                    <p className="text-[9px] text-gray-500 capitalize">
                      Qty: {item.qty} &middot; Color: {item.color} &middot; Size: {formatSizeToIndian(item.size)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    ₹{((getDisplayPrice(item.price) * item.qty) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon form validation inside Checkout */}
            <div className="border-t border-gray-200 pt-4 pb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                🏷️ Have a Coupon?
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800 font-medium">
                  <span className="flex items-center gap-1 font-bold">🏷️ Code {appliedCoupon} Active</span>
                  <button type="button" onClick={handleRemoveCoupon} className="text-gray-400 hover:text-rose-600 font-bold text-[9px] uppercase tracking-wider">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={checkingCoupon}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs uppercase focus:outline-none focus:border-primary bg-white text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={checkingCoupon}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors uppercase tracking-wider shrink-0"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Price lines */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotalRupees.toLocaleString('en-IN')}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{discountRupees.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Delivery Charges
                  {checkingDelivery && <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />}
                </span>
                <span className={shippingCharge === 0 ? 'text-emerald-700 font-bold' : 'text-gray-900 font-semibold'}>
                  {shippingCharge === 0 ? '🚚 FREE' : `₹${shippingCharge}`}
                  {pincode.length === 6 && deliveryCity && (
                    <span className="text-[10px] text-gray-400 ml-1">({deliveryDays} days)</span>
                  )}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-sm text-gray-900">
                <span>Total Amount</span>
                <span>₹{totalRupees.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Payment Method
              </div>
              <div className="divide-y divide-gray-100">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('prepaid')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    paymentMethod === 'prepaid' ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'prepaid' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'prepaid' && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">💳 Pay Online</p>
                    <p className="text-[10px] text-gray-500">UPI, Cards, Net Banking via Razorpay</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => deliveryCod && setPaymentMethod('cod')}
                  disabled={!deliveryCod}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    !deliveryCod ? 'opacity-40 cursor-not-allowed bg-gray-50' :
                    paymentMethod === 'cod' ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'cod' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">💵 Cash on Delivery</p>
                    <p className="text-[10px] text-gray-500">
                      {deliveryCod
                        ? (pincode.length === 6 ? `Available for ${pincode}` : 'Enter pincode to confirm')
                        : 'COD not available for this pincode'
                      }
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {paymentMethod === 'cod' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3.5 select-none shadow-sm">
                <div className="flex gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">COD Checkout Policy</h4>
                    <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                      COD orders require a <strong>partial advance payment</strong> online to verify shipment and prevent returns. 
                      Please note that this advance is <strong>non-refundable</strong> if you cancel the order after it is shipped.
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-emerald-200/50 pt-2.5 space-y-1.5 text-[10px] font-medium text-emerald-900">
                  <div className="flex justify-between px-2">
                    <span>Order Total:</span>
                    <span className="font-bold">₹{totalRupees.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-950 font-bold bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                    <span>Pay Online (Advance):</span>
                    <span>₹{Math.round(totalRupees * 0.10).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-800 font-semibold px-2 py-0.5">
                    <span>Remaining COD to pay Courier:</span>
                    <span>₹{(totalRupees - Math.round(totalRupees * 0.10)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              form="checkout-form"
              disabled={processing || items.length === 0}
              className="w-full py-4 bg-primary hover:bg-[#b17e3f] text-white rounded-lg font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
                </>
              ) : paymentMethod === 'cod' ? (
                <>
                  <ShieldCheck className="w-4 h-4" /> Pay ₹{Math.round(totalRupees * 0.10).toLocaleString('en-IN')} Advance & Place COD
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Pay ₹{totalRupees.toLocaleString('en-IN')} & Place Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
