import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, Heart, ArrowRight, X } from 'lucide-react'
import { useWishlistStore } from '../store/useWishlistStore'
import { useCartStore } from '../store/useCartStore'
import { useToastStore } from '../store/useToastStore'
import HeicImage from '../components/HeicImage'
import { GoogleReviewsWidget } from '../components/GoogleReviewsWidget'
import { InstagramFeedWidget } from '../components/InstagramFeedWidget'
import { useQuery } from '@tanstack/react-query'
import { cacheProductData, prefetchProductApi } from '../utils/productCache'

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  images: string[];
  rating: number;
  is_new: boolean;
  featured: boolean;
  colors?: string[];
}

interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  reviewer_name: string;
  product_name: string | null;
  product_id: number | null;
}

const getInitials = (name: string) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
}








// ─── 0ms Big-Tech Instant Load Engine (Stale-While-Revalidate) ────────────────
function getLocalCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(`hu_fast_cache_${key}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function setLocalCache(key: string, data: any) {
  try {
    if (data) localStorage.setItem(`hu_fast_cache_${key}`, JSON.stringify(data));
  } catch {}
}

function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
      setLocalCache('categories', data.data);
      return data.data as any[];
    },
    initialData: () => getLocalCache('categories'),
    staleTime: 30 * 60 * 1000, // 30 min — matches KV cache TTL on backend
    retry: 3,
  });
}

function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await fetch('/api/banners');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch banners');
      setLocalCache('banners', data.data);
      return data.data as any[];
    },
    initialData: () => getLocalCache('banners'),
    staleTime: 60 * 60 * 1000, // 1 hr — banners rarely change
    retry: 3,
  });
}

function useLatestReviews() {
  return useQuery({
    queryKey: ['latestReviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/latest');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch latest reviews');
      setLocalCache('latestReviews', data.data);
      return data.data as any[];
    },
    initialData: () => getLocalCache('latestReviews'),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      let res = await fetch('/api/products?limit=8&featured=true');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch featured products');
      
      let list = data.data;
      // Fallback: If no products are marked as featured=1 in DB, fetch latest active products!
      if (!Array.isArray(list) || list.length === 0) {
        res = await fetch('/api/products?limit=8');
        if (res.ok) {
          const fallbackData = await res.json();
          if (fallbackData.success && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
            list = fallbackData.data;
          }
        }
      }
        if (result.length > 0) {
          localStorage.setItem('hu_fast_featured_cache', JSON.stringify(result));
          result.forEach((p: any) => cacheProductData(p));
        }
      } catch {}
      return result;
    },
    initialData: () => {
      try {
        const raw = localStorage.getItem('hu_fast_featured_cache');
        if (raw) return JSON.parse(raw);
      } catch {}
      return undefined;
    },
    staleTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

import { useDisplayPrice } from '../utils/priceHelper'

export default function Home() {
  const { toggleItem, hasItem } = useWishlistStore()
  const { addItem } = useCartStore()
  const { showToast } = useToastStore()
  const { getDisplayPrice } = useDisplayPrice()

  // States
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)

  // React Queries — 100% live from database
  const { data: categories = [], isLoading: catsLoading } = useCategories()
  const { data: fetchedBanners = [], isLoading: bannersLoading } = useBanners()
  const { data: featuredProducts = [], isLoading: productsLoading, isError: productsError } = useFeaturedProducts()
  const { data: liveReviews = [] } = useLatestReviews()

  const banners = fetchedBanners || []

  const resolveBannerLink = (link: string | null | undefined) => {
    if (!link) return '/shop';
    if (link.startsWith('/category/')) {
      const cat = link.replace('/category/', '');
      const correctCat = cat === 'flate' ? 'flats' : cat;
      return `/shop?cat=${correctCat}`;
    }
    return link;
  };


  // Slide Interval
  useEffect(() => {
    if (banners.length === 0) return
    const slideTimer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length)
    }, 6000)

    return () => {
      clearInterval(slideTimer)
    }
  }, [banners.length])

  const currentBanner = banners.length > 0 ? banners[bannerIndex] : null

  const getCategoryEmoji = (slug: string) => {
    const s = slug.toLowerCase()
    if (s.includes('heel')) return '👠'
    if (s.includes('flat')) return '🥿'
    if (s.includes('sandal')) return '👡'
    if (s.includes('bag')) return '👜'
    return '✨'
  }

  const categoryCards = categories.map((cat: any) => ({
      cat: cat.slug || cat.name.toLowerCase(),
      label: cat.name,
      emoji: getCategoryEmoji(cat.slug || cat.name),
      img: cat.image_url || undefined
  }))

  const handleWishlistToggle = async (e: any, prodId: number, name: string) => {
    e.preventDefault()
    const added = await toggleItem(prodId)
    if (added) {
      showToast('success', 'Added to Wishlist ❤️', `${name} is saved to your wishlist.`)
    } else {
      showToast('info', 'Removed from Wishlist', `${name} is removed from your wishlist.`)
    }
  }

  const handleQuickAdd = (e: any, prod: Product) => {
    e.preventDefault()
    addItem({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      originalPrice: prod.original_price,
      color: 'Default',
      size: '38', // Standard default size
      img: prod.images?.[0] || '',
      category: prod.category
    })
    showToast('success', 'Added to Bag 🛍️', `${prod.name} (Size 38) added to your shopping bag.`)
  }

  return (
    <div className="w-full">
      {/* Hero Carousel */}
      {banners.length > 0 && (
        <section className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden bg-gray-100 select-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={bannerIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full flex items-center"
            >
              {/* Background Image using HeicImage for full format support */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <HeicImage
                  src={currentBanner?.image_url}
                  alt={currentBanner?.title || ''}
                  className="w-full h-full object-cover"
                  size="hero"
                  loading="eager"
                  fetchpriority="high"
                />
                <div className="absolute inset-0 bg-black/30" />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 w-full flex flex-col items-start gap-4 text-white">
                <motion.span
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs uppercase tracking-widest text-[#ead2ae] font-bold"
                >
                  EXCLUSIVELY AT HEELSUP
                </motion.span>
                <motion.h1
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-light tracking-wide leading-tight font-display italic"
                >
                  {currentBanner?.title}
                </motion.h1>
                <motion.p
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm md:text-base max-w-lg text-gray-200"
                >
                  {currentBanner?.subtitle}
                </motion.p>
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4"
                >
                  <Link
                    to={resolveBannerLink(currentBanner?.link)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white text-gray-900 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-md"
                  >
                    Shop The Look
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel controls */}
          <button
            onClick={() => setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/35 text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setBannerIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/35 text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </section>
      )}

      {/* Categories Grid */}
      {categoryCards.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-primary font-bold">Choose Your Style</span>
            <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">Shop by Category</h2>
            <div className="h-[1.5px] w-12 bg-primary mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categoryCards.map((card: any) => (
              <Link
                key={card.cat}
                to={`/shop?cat=${card.cat}`}
                className="group relative h-72 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="absolute inset-0 overflow-hidden z-0 select-none pointer-events-none">
                  <HeicImage
                    src={card.img}
                    alt={card.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="eager"
                    fetchpriority="high"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/98 via-white/70 to-transparent h-2/3 z-10" />
                <div className="absolute bottom-6 left-6 text-gray-900 flex flex-col gap-1 z-20">
                  <h3 className="text-lg font-bold tracking-wide text-gray-950">{card.label}</h3>
                  <span className="text-[10px] text-gray-700 font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-primary transition-colors">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24">
        <div className="flex items-end justify-between border-b border-gray-100 pb-6 mb-12">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold">Handcrafted Premium</span>
            <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">Trending Arrivals</h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-primary transition-colors flex items-center gap-1.5"
          >
            Shop All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Loading skeleton */}
        {productsLoading && featuredProducts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="bg-gray-100 rounded-xl h-64 w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : productsError || featuredProducts.length === 0 ? (
          // Genuinely empty or error — show a friendly retry state
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-4">Products could not be loaded.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold uppercase tracking-wider text-primary border border-primary/30 px-5 py-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((prod: any, idx: number) => {
              const inWishlist = hasItem(prod.id)

              return (
                <Link
                  key={prod.id}
                  to={`/product?id=${prod.id}`}
                  onMouseEnter={() => { cacheProductData(prod); prefetchProductApi(prod.id); }}
                  onTouchStart={() => { cacheProductData(prod); prefetchProductApi(prod.id); }}
                  onClick={() => cacheProductData(prod)}
                  className="group flex flex-col gap-3 relative"
                >

                  {/* Image container */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-50 aspect-square shadow-sm">
                    <HeicImage
                      src={prod.images?.[0] || undefined}
                      alt={prod.name}
                      className="w-full h-full object-contain"
                      index={idx}
                    />
                    
                    {/* Badges */}
                    {prod.is_new && (
                      <span className="absolute top-3 left-3 text-[8px] bg-primary text-white font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}


                    {/* Actions overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/40 via-transparent to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-center">
                      <button
                        onClick={(e) => handleQuickAdd(e, prod)}
                        className="px-3.5 py-1.5 bg-white text-gray-900 hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                      >
                        Quick Add
                      </button>
                      <button
                        onClick={(e) => handleWishlistToggle(e, prod.id, prod.name)}
                        className="p-2 rounded-lg bg-white/95 text-gray-600 hover:text-[#d4456b] hover:bg-white shadow-sm transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#d4456b] text-[#d4456b]' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest capitalize">{prod.category}</span>
                    <h3 className="text-xs font-semibold text-gray-800 line-clamp-1">{prod.name}</h3>


                    
                    {/* Stars */}
                    {prod.rating > 0 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span className="text-[10px] font-bold text-gray-600 mt-0.5">{prod.rating}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-gray-900">
                        ₹{(getDisplayPrice(prod.price) / 100).toLocaleString('en-IN')}
                      </span>

                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Brand Statistics Banner */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-gray-100 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-light text-gray-900 font-display italic">22.1K+</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Happy Customers</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-light text-gray-900 font-display italic">₹1599+</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Free Shipping Limit</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-light text-gray-900 font-display italic">7 Days</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Easy Exchanges</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-light text-gray-900 font-display italic">100%</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Handcrafted Quality</span>
          </div>
        </div>
      </section>

      {/* Google Reviews Widget */}
      <GoogleReviewsWidget />

      {/* Instagram Feed Widget */}
      <InstagramFeedWidget />

      {/* Customer Testimonials Carousel */}
      {liveReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24 select-none mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold">Client Diaries</span>
            <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">What Our Customers Say</h2>
            <div className="h-[1.5px] w-12 bg-primary mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {liveReviews.slice(0, 3).map((rev: any) => (
              <div key={rev.id} className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  {rev.title && <h4 className="text-xs font-bold text-gray-900 mb-1.5">{rev.title}</h4>}
                  <p className="text-xs text-gray-600 leading-relaxed italic">
                    "{rev.body}"
                  </p>
                  {rev.product_name && (
                    <div className="mt-2 text-[10px] text-gray-400 font-medium">
                      Product:{" "}
                      {rev.product_id ? (
                        <Link to={`/product?id=${rev.product_id}`} className="text-primary hover:underline font-semibold">
                          {rev.product_name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-gray-500">{rev.product_name}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <div className="h-8 w-8 rounded-full bg-[#ead2ae] text-gray-700 font-bold text-xs flex items-center justify-center">
                    {getInitials(rev.reviewer_name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900">{rev.reviewer_name}</h4>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">
                      Verified Buyer &middot; {rev.created_at ? (rev.created_at.includes('-') || rev.created_at.includes('/') ? new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : rev.created_at) : 'India'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <button
              onClick={() => setReviewsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              View All Reviews
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* View All Reviews Modal */}
      <AnimatePresence>
        {reviewsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">What Our Customers Say</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing {liveReviews.length} reviews
                  </p>
                </div>
                <button
                  onClick={() => setReviewsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reviews List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {liveReviews.map((rev: any) => (
                  <div key={rev.id} className="p-5 bg-gray-50/50 rounded-xl border border-gray-100/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {rev.created_at ? (rev.created_at.includes('-') || rev.created_at.includes('/') ? new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : rev.created_at) : 'India'}
                        </span>
                      </div>
                      {rev.title && <h4 className="text-sm font-bold text-gray-900 mb-1.5">{rev.title}</h4>}
                      <p className="text-xs text-gray-600 leading-relaxed italic">
                        "{rev.body}"
                      </p>
                      {rev.product_name && (
                        <div className="mt-3 text-[10px] text-gray-400 font-medium">
                          Product:{" "}
                          {rev.product_id ? (
                            <Link
                              to={`/product?id=${rev.product_id}`}
                              onClick={() => setReviewsModalOpen(false)}
                              className="text-primary hover:underline font-semibold"
                            >
                              {rev.product_name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-gray-500">{rev.product_name}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100/50">
                      <div className="h-8 w-8 rounded-full bg-[#ead2ae] text-gray-700 font-bold text-xs flex items-center justify-center">
                        {getInitials(rev.reviewer_name)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900">{rev.reviewer_name}</h4>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Verified Buyer</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setReviewsModalOpen(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
