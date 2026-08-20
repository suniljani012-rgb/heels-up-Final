import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Heart } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import HeicImage from '../components/HeicImage'
import SEO from '../components/SEO'
import { formatSizeToIndian } from '../utils/sizeHelper'

import { useDisplayPrice } from '../utils/priceHelper'

export default function Cart() {
  const { items, updateQty, removeItem, getCartSubtotal, clearCart } = useCartStore()
  const { toggleItem, hasItem } = useWishlistStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { getDisplayPrice } = useDisplayPrice()

  const handleMoveToWishlist = async (id: number, name: string, color: string, size: string) => {
    if (!hasItem(id)) {
      await toggleItem(id)
    }
    removeItem(id, color, size)
    showToast('success', 'Moved to Wishlist ❤️', `${name} has been moved to your wishlist.`)
  }

  // Coupon states
  const [couponCode, setCouponCode] = useState('')
  const [discountVal, setDiscountVal] = useState(0) // in paise
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const subtotalPaise = getCartSubtotal()
  const subtotalRupees = subtotalPaise / 100
  const baseSubtotalRupees = items.reduce((sum, item) => sum + (item.price / 100) * item.qty, 0)
  const isFree = baseSubtotalRupees >= 1599
  const shippingCharge = isFree || subtotalRupees === 0 ? 0 : 49
  
  const rawTotalRupees = Math.max(0, subtotalRupees + shippingCharge - (discountVal / 100))
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
  const finalTotalRupees = roundRupeesValue(rawTotalRupees)

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

  const handleProceedToCheckout = () => {
    // Check if any cart items are out of stock
    const hasOutOfStock = items.some(item => item.available_stock !== undefined && item.available_stock <= 0)
    if (hasOutOfStock) {
      showToast('warning', 'Out of Stock Items', 'Please remove or move out-of-stock items to your wishlist before checking out.')
      return
    }

    if (!token) {
      showToast('info', 'Sign In Required 🔐', 'Please sign in to your account to proceed to checkout.')
      navigate('/login?redirect=/checkout')
    } else {
      navigate('/checkout', { state: { couponCode: appliedCoupon, discount: discountVal } })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-[70vh] select-none">
      <SEO title="Shopping Cart | HeelsUp" noindex={true} />
      <h1 className="text-3xl font-light text-gray-900 font-display italic mb-10 border-b border-gray-100 pb-6">
        Your Shopping Cart
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl bg-white flex flex-col items-center justify-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 stroke-1" />
          <p className="mt-4 text-sm text-gray-500 font-medium">Your shopping cart is currently empty</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#b17e3f] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Explore Shop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items list */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => {
              const isOutOfStock = item.available_stock !== undefined && item.available_stock <= 0

              return (
                <div
                  key={`${item.id}-${item.color}-${item.size}`}
                  className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <HeicImage
                    src={item.img}
                    alt={item.name}
                    className="w-24 h-24 object-cover bg-gray-50 rounded-lg flex-shrink-0 mx-auto sm:mx-0"
                  />

                  <div className="flex-1 flex flex-col justify-between text-center sm:text-left">
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                            <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.name}</h3>
                            {isOutOfStock && (
                              <span className="px-2 py-0.5 bg-rose-50 border border-rose-150 text-rose-600 text-[8px] font-bold uppercase tracking-wider rounded">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 capitalize">
                            {item.category} &middot; Color: {item.color} &middot; Size: {formatSizeToIndian(item.size)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 mt-2 sm:mt-0 self-center sm:self-start">
                          ₹{((getDisplayPrice(item.price) * item.qty) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                      <div className="flex items-center border border-gray-200 rounded-md bg-[#faf8f5] mx-auto sm:mx-0">
                        <button
                          disabled={isOutOfStock}
                          onClick={() => updateQty(item.id, item.color, item.size, -1)}
                          className="p-1 px-2.5 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold px-2.5 text-gray-800">{item.qty}</span>
                        <button
                          disabled={isOutOfStock}
                          onClick={() => updateQty(item.id, item.color, item.size, 1)}
                          className="p-1 px-2.5 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveToWishlist(item.id, item.name, item.color, item.size)}
                          className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 fill-primary/10" /> Move to Wishlist
                        </button>
                        <button
                          onClick={() => removeItem(item.id, item.color, item.size)}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-full transition-colors cursor-pointer hidden sm:block"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile trash button */}
                  <button
                    onClick={() => removeItem(item.id, item.color, item.size)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-rose-600 sm:hidden cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}

            <button
              onClick={() => {
                clearCart()
                showToast('info', 'Cart Cleared', 'All items removed from your cart.')
              }}
              className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider py-2"
            >
              Clear All Items
            </button>
          </div>

          {/* Checkout Summary Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Promo Codes */}
            <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary" /> Have a Coupon?
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800 font-medium">
                  <span className="flex items-center gap-1">🏷️ Code {appliedCoupon} Active</span>
                  <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-rose-600 font-bold">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code e.g. HEELS10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={checkingCoupon}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs uppercase focus:outline-none focus:border-primary w-full bg-white"
                  />
                  <button
                    type="submit"
                    disabled={checkingCoupon}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* Calculations summary */}
            <div className="border border-gray-100 rounded-xl p-6 bg-[#faf9f6] shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-200/60 pb-3">
                Order Summary
              </h3>

              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotalRupees.toLocaleString('en-IN')}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-₹{(discountVal / 100).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={shippingCharge === 0 ? 'text-emerald-700 font-bold' : 'text-gray-900 font-semibold'}>
                    {shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}
                  </span>
                </div>
              </div>

              {/* Free Shipping Meter */}
              {shippingCharge > 0 && (
                <div className="text-[10px] text-gray-500 leading-relaxed bg-[#f0ede5] p-3 rounded-lg border border-gray-200/40">
                  Add <span className="font-bold text-gray-900">₹{(1599 - baseSubtotalRupees).toFixed(0)}</span> more to qualify for <span className="text-[#8c6033] font-bold">FREE Shipping!</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 flex justify-between text-sm font-semibold text-gray-900">
                <span>Grand Total</span>
                <span>₹{finalTotalRupees.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full mt-4 py-3.5 bg-primary hover:bg-[#b17e3f] text-white rounded-lg font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                Proceed to Secure Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
