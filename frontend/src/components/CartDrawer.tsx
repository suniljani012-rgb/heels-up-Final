import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/useCartStore'
import { useUIStore } from '../store/useUIStore'
import HeicImage from './HeicImage'
import { formatSizeToIndian } from '../utils/sizeHelper'

import { useDisplayPrice } from '../utils/priceHelper'

export default function CartDrawer() {
  const { items, updateQty, removeItem, getCartSubtotal } = useCartStore()
  const { cartOpen, setCartOpen } = useUIStore()
  const navigate = useNavigate()
  const { getDisplayPrice } = useDisplayPrice()

  const subtotalPaise = getCartSubtotal()
  const subtotalRupees = subtotalPaise / 100
  const baseSubtotalRupees = items.reduce((sum, item) => sum + (item.price / 100) * item.qty, 0)
  const freeShippingThreshold = 1599
  const progressPercent = Math.min(100, (baseSubtotalRupees / freeShippingThreshold) * 100)
  const remainingForFree = Math.max(0, freeShippingThreshold - baseSubtotalRupees)

  const handleCheckoutClick = () => {
    setCartOpen(false)
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-50 bg-black cursor-pointer"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-md bg-[#fcfbf9] shadow-2xl border-l border-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-semibold text-gray-900">Your Shopping Bag</h2>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-medium text-gray-600">
                  {items.reduce((s, i) => s + i.qty, 0)}
                </span>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close Shopping Bag"
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Meter */}
            <div className="p-6 bg-[#f7f5f0] border-b border-gray-100">
              {remainingForFree > 0 ? (
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  Add <span className="font-semibold text-gray-900">₹{remainingForFree.toLocaleString('en-IN')}</span> more for <span className="font-semibold text-[#8c6033]">FREE Shipping!</span> 🚚
                </p>
              ) : (
                <p className="text-xs text-emerald-700 font-semibold leading-relaxed flex items-center gap-1.5">
                  ✨ You qualify for free shipping!
                </p>
              )}
              <div className="mt-2.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-primary transition-all duration-500 ease-out"
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-300 stroke-1" />
                  <p className="mt-4 text-sm text-gray-500 font-medium">Your cart is currently empty</p>
                  <Link
                    to="/shop"
                    onClick={() => setCartOpen(false)}
                    className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 p-3 border border-gray-100 rounded-xl bg-white hover:shadow-sm transition-shadow">
                    <HeicImage
                      src={item.img || undefined}
                      alt={item.name}
                      className="w-20 h-20 object-cover bg-gray-50 rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1">{item.name}</h4>
                          <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                             ₹{((getDisplayPrice(item.price) * item.qty) / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 capitalize">
                          {item.category} &middot; {item.color} &middot; Size {formatSizeToIndian(item.size)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-md bg-[#faf8f5]">
                          <button
                            onClick={() => updateQty(item.id, item.color, item.size, -1)}
                            aria-label="Decrease quantity"
                            className="p-1 px-2 text-gray-500 hover:text-gray-900"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold px-2 text-gray-800">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.color, item.size, 1)}
                            aria-label="Increase quantity"
                            className="p-1 px-2 text-gray-500 hover:text-gray-900"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id, item.color, item.size)}
                          aria-label="Remove item"
                          className="text-gray-400 hover:text-rose-600 p-1 rounded-full transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-[#faf9f6]">
                <div className="flex justify-between text-sm font-semibold text-gray-900 mb-4">
                  <span>Subtotal</span>
                  <span>₹{subtotalRupees.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-4 text-center leading-relaxed">
                  Taxes included.
                </p>
                <button
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 bg-primary hover:bg-[#b17e3f] text-white rounded-lg font-bold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
