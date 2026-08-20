import React, { useState, useEffect } from 'react'
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom'
import { Star, Heart, ShoppingBag, Truck, RefreshCw, Ruler, MessageSquare } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import { useToastStore } from '../store/useToastStore'
import { useAuthStore } from '../store/useAuthStore'
import HeicImage from '../components/HeicImage'
import SEO from '../components/SEO'
import { formatSizeToIndian } from '../utils/sizeHelper'
import { cacheProductData, prefetchProductApi, getCachedProduct } from '../utils/productCache'

interface ProductDetail {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  original_price: number | null;
  description: string;
  rating: number;
  review_count: number;
  sizes: string[];
  size_stock: Record<string, number>;
  images: string[];
  stock: number;
  colors?: string[];
}

interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  reviewer_name: string;
  merchant_reply?: string;
}

import { useDisplayPrice } from '../utils/priceHelper'

export default function Product() {
  const { id: paramId, category: paramCat, slug: paramSlug } = useParams()
  const [searchParams] = useSearchParams()
  const productId = paramId || paramSlug || searchParams.get('id') || ''
  
  const { addItem } = useCartStore()
  const { toggleItem, hasItem } = useWishlistStore()
  const { showToast } = useToastStore()
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const { getDisplayPrice } = useDisplayPrice()

  // Dynamic States
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [images, setImages] = useState<string[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)


  const [activeImage, setActiveImage] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('Default')
  const [qty, setQty] = useState(1)


  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [activeGuideTab, setActiveGuideTab] = useState<'chart' | 'ai'>('chart')
  const [fitLengthCm, setFitLengthCm] = useState(23.5)
  const [brandName, setBrandName] = useState('Nike')
  const [brandSize, setBrandSize] = useState('5')
  const [fitPreference, setFitPreference] = useState<'narrow' | 'standard' | 'wide'>('standard')
  const [aiRecommendation, setAiRecommendation] = useState('38')
  const [sizerMethod, setSizerMethod] = useState<'length' | 'brand'>('length')

  // Delivery Estimate State
  const [deliveryPincode, setDeliveryPincode] = useState('')
  const [editingPincode, setEditingPincode] = useState(false)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<{
    feePaise: number; feeRupees: number; isFree: boolean;
    cod: boolean; zone: string; estimatedDays: string;
    city: string; state: string; serviceable: boolean;
  } | null>(null)
  const [pincodeInput, setPincodeInput] = useState('')

  // Calculate Sizing Recommendation
  useEffect(() => {
    if (sizerMethod === 'length') {
      const len = Number(fitLengthCm)
      if (len <= 22.7) setAiRecommendation('36')
      else if (len <= 23.4) setAiRecommendation('37')
      else if (len <= 24.1) setAiRecommendation('38')
      else if (len <= 24.8) setAiRecommendation('39')
      else if (len <= 25.4) setAiRecommendation('40')
      else setAiRecommendation('41')
    } else {
      const sizeVal = parseInt(brandSize) || 5
      let rec = 33 + sizeVal // e.g. UK 5 -> EU 38
      if (fitPreference === 'wide') rec += 1
      if (fitPreference === 'narrow') rec -= 1
      const finalRec = Math.max(36, Math.min(41, rec))
      setAiRecommendation(String(finalRec))
    }
  }, [fitLengthCm, brandSize, fitPreference, sizerMethod])

  // ─── Delivery Estimate Logic ──────────────────────────────────────────────
  const fetchDelivery = async (pin: string, totalPaise = 0) => {
    if (!/^\d{6}$/.test(pin)) return
    setDeliveryLoading(true)
    try {
      const res = await fetch(`/api/shipping/estimate?pincode=${pin}&total=${totalPaise}`)
      const data = await res.json()
      if (data.success && data.data) {
        const d = data.data
        setDeliveryInfo({
          feePaise: d.fee_paise,
          feeRupees: d.fee_rupees,
          isFree: d.is_free,
          cod: d.cod_available,
          zone: d.zone,
          estimatedDays: d.estimated_days,
          city: d.city,
          state: d.state,
          serviceable: d.serviceable,
        })
        setDeliveryPincode(pin)
        setEditingPincode(false)
        // Cache for this session
        try { sessionStorage.setItem('hu_delivery_pin', pin) } catch {}
      }
    } catch {
      // silently fail — delivery estimate is non-critical
    } finally {
      setDeliveryLoading(false)
    }
  }

  // On mount: try cached pincode -> then default fast estimate
  useEffect(() => {
    const cached = (() => { try { return sessionStorage.getItem('hu_delivery_pin') } catch { return null } })()
    if (cached && /^\d{6}$/.test(cached)) {
      fetchDelivery(cached)
    } else {
      setDeliveryInfo({
        feePaise: 0, feeRupees: 0, isFree: true,
        cod: true, zone: 'A', estimatedDays: '2-4', city: '', state: '', serviceable: true
      })
      setEditingPincode(true)
    }
  }, [])


  // Inject JSON-LD Product Schema
  useEffect(() => {
    if (!product) return

    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": images.length > 0 ? images : [product.images?.[0] || ''],
      "description": product.description || 'HeelsUp premium footwear styles.',
      "sku": product.sku || `HU-PROD-${product.id}`,
      "mpn": product.sku || `HU-PROD-${product.id}`,
      "brand": {
        "@type": "Brand",
        "name": "HeelsUp"
      },
      "review": reviews.map(r => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.rating)
        },
        "author": {
          "@type": "Person",
          "name": r.reviewer_name || 'Anonymous'
        },
        "reviewBody": r.body
      })),
      "aggregateRating": product.review_count > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": String(product.rating || 4.5),
        "reviewCount": String(product.review_count)
      } : undefined,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": String((product.price / 100).toFixed(2)),
        "itemCondition": "https://schema.org/NewCondition",
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": window.location.href
      }
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = `jsonld-product-${product.id}`
    script.innerHTML = JSON.stringify(schema)
    document.head.appendChild(script)

    return () => {
      const existing = document.getElementById(`jsonld-product-${product.id}`)
      if (existing) document.head.removeChild(existing)
    }
  }, [product, reviews, images])

  // Review Form States
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Fetch details (Unified 1-flight request with instant pre-hydration)
  useEffect(() => {
    if (!productId) return
    
    // 1. Instant sync pre-hydration (0.0001 ms)
    const cachedObj = getCachedProduct(productId)
    let hasCached = false
    if (cachedObj && cachedObj.product) {
      setProduct(cachedObj.product)
      setReviews(cachedObj.reviews || [])
      const rawImgs = cachedObj.images?.length > 0 ? cachedObj.images : (cachedObj.product.images || [])
      // Deduplicate images — show only as many as were uploaded
      const imgs = Array.from(new Set(rawImgs.filter(Boolean))) as string[]
      setImages(imgs)
      if (imgs.length > 0) setActiveImage(imgs[0] as string)
      if (cachedObj.product.sizes?.length > 0) setSelectedSize(cachedObj.product.sizes[0])
      setRelated(cachedObj.related || [])
      setLoading(false)
      hasCached = true
    }

    if (!hasCached) {
      setLoading(true)
    }

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.data) {
          const payload = data.data
          const detail = payload.product
          setProduct(detail)
          
          const reviewsList = payload.reviews || []
          setReviews(reviewsList)

          const fetchedImgs = payload.images?.map((i: any) => typeof i === 'string' ? i : i.url) || []
          // Use only the images actually stored on the product — deduplicated
          const baseImgs = fetchedImgs.length > 0 ? fetchedImgs : (detail.images || [])
          const allImages = Array.from(new Set((baseImgs as string[]).filter(Boolean))) as string[]
          setImages(allImages)
          if (allImages.length > 0 && (!activeImage || !hasCached)) {
            setActiveImage(allImages[0])
          }
          if (detail.sizes?.length > 0 && (!selectedSize || !hasCached)) {
            setSelectedSize(detail.sizes[0])
          }

          let relatedList = payload.related || []
          if (!relatedList.length && detail.category) {
            try {
              const relRes = await fetch(`/api/products?limit=4&cat=${encodeURIComponent(detail.category)}`)
              const relData = await relRes.json()
              if (relData.success && relData.data) {
                relatedList = relData.data.filter((r: any) => r.id !== detail.id)
              }
            } catch {}
          }
          setRelated(relatedList)

          // Save to local cache for instant sub-millisecond future renders
          cacheProductData({
            ...detail,
            images: allImages,
            reviews: reviewsList,
            related: relatedList
          })

          // Preload product images into browser cache
          allImages.slice(0, 4).forEach((url: string) => {
            if (url) {
              const img = new Image()
              img.src = url
            }
          })
        }
      } catch (e) {
        console.error('Fetch product detail error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [productId])


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 animate-pulse flex flex-col md:flex-row gap-12">
        <div className="flex-1 bg-gray-100 h-96 rounded-xl" />
        <div className="flex-1 space-y-6">
          <div className="h-8 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded w-full" />
          <div className="h-12 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 text-center">
        <p className="text-gray-500 font-medium">Product details could not be loaded.</p>
      </div>
    )
  }

  const inWishlist = hasItem(product.id)
  const isOutOfStock = product.size_stock && selectedSize
    ? (Array.isArray(product.size_stock)
        ? (product.size_stock.find((s: any) => s.size_label === selectedSize)?.stock ?? 0) <= 0
        : (product.size_stock[selectedSize] || 0) <= 0)
    : product.stock <= 0

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast('warning', 'Out of Stock', 'The selected size is currently out of stock.')
      return
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      color: selectedColor,
      size: selectedSize || '38',
      img: activeImage || '',
      category: product.category,
      qty: qty
    })
    showToast('success', 'Added to Bag 🛍️', `${product.name} (Size ${formatSizeToIndian(selectedSize)}) has been added.`)
  }



  const handleWishlistClick = async () => {
    if (!token) {
      showToast('error', 'Authentication Required 🔐', 'Please log in to add items to your wishlist.')
      return
    }
    const added = await toggleItem(product.id)
    if (added) {
      showToast('success', 'Added to Wishlist ❤️', `${product.name} saved.`)
    } else {
      showToast('info', 'Removed from Wishlist', `${product.name} removed.`)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      showToast('error', 'Authentication Required 🔐', 'Please log in to submit a review.')
      return
    }
    if (!reviewName.trim() || !reviewTitle.trim() || !reviewBody.trim()) {
      showToast('error', 'Incomplete Form', 'Please complete all review fields.')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewRating,
          title: reviewTitle,
          body: reviewBody,
          name: reviewName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Review Submitted 🎉', 'Thank you! Your review is pending moderation.')
        setReviewName('')
        setReviewTitle('')
        setReviewBody('')
        setReviewRating(5)
      } else {
        showToast('error', 'Submission Failed', data.error || 'Please try again.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not post your review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-screen relative select-none">
      {product && (
        <SEO
          title={`${product.name} | Buy Online at ₹${((product.price || 0) / 100).toLocaleString('en-IN')} | HeelsUp`}
          description={`Buy ${product.name} online at HeelsUp for ₹${((product.price || 0) / 100).toLocaleString('en-IN')}. ${product.description ? product.description.slice(0, 120) : 'Handcrafted luxury ladies footwear.'} Free delivery above ₹1599, COD available, 7-day easy exchange.`}
          canonical={`https://heelsup.in/heels/${paramCat || product.category?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-') || 'footwear'}/${product.id}`}
          ogImage={activeImage || product.images?.[0] || 'https://heelsup.in/logo.webp'}
          ogType="product"
          keywords={`${product.name}, ${product.category}, buy heels online india, ladies footwear, heelsup`}
        />
      )}

      {/* Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex md:flex-col gap-2 order-2 md:order-1 overflow-x-auto md:overflow-x-visible">
              {images.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border bg-gray-50 flex-shrink-0 transition-colors ${
                    activeImage === imgUrl ? 'border-primary ring-1 ring-primary' : 'border-gray-200'
                  }`}
                >
                  <HeicImage src={imgUrl} alt="" className="w-full h-full object-contain" size="thumb" loading="eager" fetchpriority="high" />
                </button>
              ))}
            </div>
          )}

          {/* Main Image */}
          <div className="flex-1 rounded-xl overflow-hidden bg-[#f5f2eb] border border-gray-100 aspect-square order-1 md:order-2 relative shadow-sm flex items-center justify-center p-4">
            <HeicImage src={activeImage || undefined} alt={product.name} className="max-w-full max-h-full object-contain" size="full" loading="eager" fetchpriority="high" />
          </div>
        </div>

        {/* Right: Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-[#ead2ae] text-gray-800 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full capitalize">
              {product.category}
            </span>
            <h1 className="text-3xl font-light text-gray-950 font-display italic mt-2.5 leading-tight">{product.name}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU: {product.sku}</p>
          </div>


          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-950">
              ₹{(getDisplayPrice(product.price) / 100).toLocaleString('en-IN')}
            </span>
            {/* MRP Cross-out and percentage removed as per requirements */}
          </div>



          {/* Size picker */}
          {product.sizes?.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-900">
                <span>Select Size</span>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5" /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((size) => {
                  const sizeStock = Array.isArray(product.size_stock)
                    ? (product.size_stock.find((s: any) => s.size_label === size)?.stock ?? 5)
                    : (product.size_stock?.[size] ?? 5)
                  const sizeOutOfStock = sizeStock <= 0
                  
                  return (
                    <button
                      key={size}
                      onClick={() => !sizeOutOfStock && setSelectedSize(size)}
                      disabled={sizeOutOfStock}
                      className={`h-10 w-12 text-xs font-bold rounded-lg border flex flex-col items-center justify-center transition-all ${
                        sizeOutOfStock
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : selectedSize === size
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{formatSizeToIndian(size)}</span>
                      {!sizeOutOfStock && sizeStock <= 2 && (
                        <span className={`text-[7px] font-bold ${selectedSize === size ? 'text-white' : 'text-[#d4456b]'}`}>
                          {sizeStock} left
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Qty Selector */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-900">Quantity</span>
            <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-sm">
              <button
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="p-2 px-3 text-gray-500 hover:text-gray-900"
              >
                -
              </button>
              <span className="text-xs font-bold w-6 text-center text-gray-800">{qty}</span>
              <button
                onClick={() => setQty((prev) => prev + 1)}
                className="p-2 px-3 text-gray-500 hover:text-gray-900"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-[#b17e3f] text-white hover:shadow-md'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>
            <button
              onClick={handleWishlistClick}
              className={`p-3.5 border rounded-xl hover:bg-gray-50 transition-colors shadow-sm ${
                inWishlist ? 'border-[#d4456b] text-[#d4456b] bg-rose-50/20' : 'border-gray-200 text-gray-500'
              }`}
              title="Wishlist"
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-[#d4456b]' : ''}`} />
            </button>
          </div>

          {/* Delivery Estimate Widget */}
          <div className="bg-[#f7f5f0] border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" /> Delivery Estimate
              </span>
              {deliveryPincode && !editingPincode && (
                <button
                  onClick={() => { setEditingPincode(true); setPincodeInput(deliveryPincode) }}
                  className="text-[10px] text-primary font-bold hover:underline"
                >Change</button>
              )}
            </div>

            {deliveryLoading ? (
              // Shimmer while loading
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ) : editingPincode || !deliveryPincode ? (
              // Pincode input
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter delivery pincode"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && pincodeInput.length === 6 && fetchDelivery(pincodeInput)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary bg-white"
                  />
                  <button
                    onClick={() => fetchDelivery(pincodeInput)}
                    disabled={pincodeInput.length !== 6}
                    className="px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-black transition-colors"
                  >Check</button>
                </div>
              </div>
            ) : deliveryInfo ? (
              // Delivery info card
              <div className="space-y-1.5">
                {deliveryInfo.city || deliveryInfo.state ? (
                  <p className="text-[10px] text-gray-500 font-medium">
                    📍 {[deliveryInfo.city, deliveryInfo.state].filter(Boolean).join(', ')} — {deliveryPincode}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-500 font-medium">📍 Pincode: {deliveryPincode}</p>
                )}
                <p className={`text-xs font-bold flex items-center gap-1.5 ${getDisplayPrice(product?.price || 0) / 100 >= 1599 ? 'text-emerald-700' : 'text-gray-800'}`}>
                  🚚 {getDisplayPrice(product?.price || 0) / 100 >= 1599 ? 'FREE Delivery' : 'Delivery ₹49'}
                  <span className="text-[10px] font-normal text-gray-500">· Arrives in {deliveryInfo.estimatedDays} days</span>
                </p>
                <div className="flex items-center gap-3">
                  {deliveryInfo.cod ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      ✅ COD Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                      ❌ COD Not Available — Pay Online
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-medium pt-4 bg-[#fcfbf9] border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Free Shipping above ₹1,599
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> 7-Day Easy Exchange Only
            </div>
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <section className="mt-20 border-t border-gray-100 pt-16">
        <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-6">Product Description</h3>
        <p className="text-xs leading-relaxed text-gray-600 max-w-3xl whitespace-pre-line bg-white border border-gray-50 p-6 rounded-xl shadow-sm">
          {product.description || 'Premium handcrafted footwear featuring superior cushioning and elegant detailing. Perfect for style and all-day comfort.'}
        </p>
      </section>

      {/* Size Guide Modal Overlay */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowSizeGuide(false)} className="absolute inset-0 bg-black/50 cursor-pointer" />
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl z-10 relative">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5 border-b pb-3">
              <Ruler className="w-4 h-4 text-primary" /> HeelsUp Fit Assistant
            </h3>
            
            {/* Tab Headers */}
            <div className="flex bg-gray-50 p-1 rounded-xl mb-5">
              <button
                onClick={() => setActiveGuideTab('chart')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeGuideTab === 'chart'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Size Chart
              </button>
              <button
                onClick={() => setActiveGuideTab('ai')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeGuideTab === 'ai'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                AI Size Guide
              </button>
            </div>

            {activeGuideTab === 'chart' ? (
              <div className="space-y-4">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-[#f7f5f0] text-gray-700">
                      <th className="p-2 border border-gray-200">Euro Size</th>
                      <th className="p-2 border border-gray-200">UK/India Size</th>
                      <th className="p-2 border border-gray-200">Length (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-gray-200 font-semibold">36</td>
                      <td className="p-2 border border-gray-200">3</td>
                      <td className="p-2 border border-gray-200">22.5</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2 border border-gray-200 font-semibold">37</td>
                      <td className="p-2 border border-gray-200">4</td>
                      <td className="p-2 border border-gray-200">23.0</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-gray-200 font-semibold">38</td>
                      <td className="p-2 border border-gray-200">5</td>
                      <td className="p-2 border border-gray-200">23.8</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2 border border-gray-200 font-semibold">39</td>
                      <td className="p-2 border border-gray-200">6</td>
                      <td className="p-2 border border-gray-200">24.5</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-gray-200 font-semibold">40</td>
                      <td className="p-2 border border-gray-200">7</td>
                      <td className="p-2 border border-gray-200">25.1</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2 border border-gray-200 font-semibold">41</td>
                      <td className="p-2 border border-gray-200">8</td>
                      <td className="p-2 border border-gray-200">25.8</td>
                    </tr>
                  </tbody>
                </table>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all"
                >
                  Close Guide
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Method selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSizerMethod('length')}
                    className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg border transition-all ${
                      sizerMethod === 'length'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Foot Length
                  </button>
                  <button
                    onClick={() => setSizerMethod('brand')}
                    className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg border transition-all ${
                      sizerMethod === 'brand'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Compare Brands
                  </button>
                </div>

                {sizerMethod === 'length' ? (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>Adjust Foot Length</span>
                      <span className="text-primary font-mono">{fitLengthCm} cm</span>
                    </div>
                    <input
                      type="range"
                      min="22.0"
                      max="26.5"
                      step="0.1"
                      value={fitLengthCm}
                      onChange={(e) => setFitLengthCm(Number(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="text-[10px] text-gray-500 leading-relaxed">
                      💡 Tip: Stand on a piece of paper, trace the outline of your foot, and measure the distance from heel to your longest toe.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Brand</label>
                        <select
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="Nike">Nike</option>
                          <option value="Adidas">Adidas</option>
                          <option value="Puma">Puma</option>
                          <option value="Zara">Zara</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Size (UK/India)</label>
                        <select
                          value={brandSize}
                          onChange={(e) => setBrandSize(e.target.value)}
                          className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="3">UK 3</option>
                          <option value="4">UK 4</option>
                          <option value="5">UK 5</option>
                          <option value="6">UK 6</option>
                          <option value="7">UK 7</option>
                          <option value="8">UK 8</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fit Preference</label>
                      <div className="flex gap-2">
                        {['narrow', 'standard', 'wide'].map((pref) => (
                          <button
                            key={pref}
                            onClick={() => setFitPreference(pref as any)}
                            className={`flex-1 py-1.5 text-xs rounded-lg border font-semibold transition-all ${
                              fitPreference === pref
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {pref.charAt(0).toUpperCase() + pref.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Recommendation Result Box */}
                <div className="bg-gradient-to-tr from-gray-900 to-black text-white p-4 rounded-xl text-center space-y-2 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 bg-primary/20 text-primary text-[8px] uppercase tracking-wider rounded-bl font-bold">
                    98% Fit Match
                  </div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Recommended Size</div>
                  <div className="text-3xl font-extrabold text-primary font-mono">EU {aiRecommendation}</div>
                  <div className="text-[10px] text-gray-300">
                    Sizing matches perfectly with heels design standard.
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSizeGuide(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (product.sizes?.includes(aiRecommendation)) {
                        setSelectedSize(aiRecommendation)
                        setShowSizeGuide(false)
                        showToast('success', 'Recommended Size Applied', `Selected EU ${aiRecommendation} based on your fit preference.`)
                      } else {
                        showToast('error', 'Size Out of Stock', `EU ${aiRecommendation} is currently unavailable for this style.`)
                      }
                    }}
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                  >
                    Apply Size
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Reviews */}
      <section className="mt-20 border-t border-gray-100 pt-16">
        <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-8 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Customer Reviews
        </h3>

        {product.review_count > 0 && (
          <div className="flex items-center gap-5 bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm max-w-sm mb-10 select-none">
            <div className="text-center border-r border-gray-100 pr-6">
              <span className="text-3xl font-extrabold text-gray-950 font-display italic">
                {product.rating}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">out of 5</span>
            </div>
            <div>
              <div className="flex items-center text-amber-500 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.rating) ? 'fill-amber-500' : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-bold block mt-1.5">
                Based on {product.review_count} customer {product.review_count === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Reviews list */}
          <div className="lg:col-span-7 space-y-6">
            {reviews.length === 0 ? (
              <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-gray-500 text-xs">
                No reviews yet. Be the first to share your experience!
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-5 border border-gray-100 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{rev.reviewer_name || 'Guest User'}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5">{new Date(rev.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <h5 className="text-xs font-bold text-gray-800 mt-3">{rev.title}</h5>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{rev.body}</p>
                  {rev.merchant_reply && (
                    <div className="mt-4 p-3 bg-gray-50 border-l-2 border-primary rounded-r-lg text-xs">
                      <p className="font-bold text-gray-850 text-[10px] uppercase tracking-wider">Merchant Response</p>
                      <p className="text-gray-600 mt-1 italic">"{rev.merchant_reply}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add a review form */}
          <div className="lg:col-span-5 border border-gray-100 rounded-xl p-6 bg-[#f7f5f0] shadow-sm self-start">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Write a Review</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="e.g. Priyal Sharma"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Rating</label>
                <div className="flex items-center gap-1.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="e.g. Stunning wedges, very comfortable!"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Review Body</label>
                <textarea
                  required
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="Tell us what you liked or disliked..."
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-gray-100 pt-16">
          <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-10 text-center">You May Also Like</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((prod) => (
              <Link
                key={prod.id}
                to={`/product?id=${prod.id}`}
                className="group flex flex-col gap-3"
              >
                <div className="relative rounded-xl overflow-hidden bg-gray-50 aspect-square shadow-sm">
                  <HeicImage
                    src={prod.images?.[0] || undefined}
                    alt={prod.name}
                    className="w-full h-full object-contain p-2 bg-white group-hover:scale-105 transition-transform duration-700"
                    size="thumb"
                    index={0}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 line-clamp-1">{prod.name}</h4>



                  <span className="text-xs font-bold text-gray-900 mt-1 block">
                    ₹{(getDisplayPrice(prod.price) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
