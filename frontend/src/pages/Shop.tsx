import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Filter, Star, Heart, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWishlistStore } from '../store/useWishlistStore'
import { useCartStore } from '../store/useCartStore'
import { useToastStore } from '../store/useToastStore'
import HeicImage from '../components/HeicImage'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'
import { formatSizeToIndian } from '../utils/sizeHelper'
import { cacheProductData, prefetchProductApi } from '../utils/productCache'
import { trackSearchQuery } from '../utils/analytics'


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
  stock: number;
  colors?: string[];
}


const MAX_SHOP_CACHE_AGE_MS = 12 * 60 * 60 * 1000; // 12 Hours TTL max age

function getShopLocalCache(key: string): any {
  try {
    const raw = localStorage.getItem(`hu_fast_shop_v4_${key}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || (Date.now() - parsed.ts > MAX_SHOP_CACHE_AGE_MS)) {
      return undefined; // Expired (>12h) — force fresh fetch from server
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

function setShopLocalCache(key: string, data: any) {
  try {
    if (data) localStorage.setItem(`hu_fast_shop_v4_${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
      setShopLocalCache('categories', data.data);
      return data.data;
    },
    initialData: () => getShopLocalCache('categories'),
    staleTime: 30 * 60 * 1000, // 30 min — matches KV cache TTL
  });
}

function useShopProducts(filters: any) {
  const queryClient = useQueryClient();
  const cacheKey = `products_${filters.category || 'all'}_${filters.page || 1}_${filters.sort || 'default'}`;
  return useQuery({
    queryKey: ['shopProducts', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(filters.page || 1));
      queryParams.set('limit', '12');
      if (filters.category) queryParams.set('cat', filters.category);
      if (filters.sort) queryParams.set('sort', filters.sort);
      if (filters.searchQ) queryParams.set('q', filters.searchQ);
      if (filters.priceMin) queryParams.set('min_price', String(Number(filters.priceMin) * 100));
      if (filters.priceMax) queryParams.set('max_price', String(Number(filters.priceMax) * 100));
      if (filters.size) queryParams.set('size', filters.size);

      const res = await fetch('/api/products?' + queryParams.toString());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch shop products');

      if (filters.searchQ) {
        trackSearchQuery(filters.searchQ, data.pagination?.total || data.data?.length || 0);
      }

      if (data.data && Array.isArray(data.data)) {
        setShopLocalCache(cacheKey, data);
        data.data.forEach((p: any) => {
          cacheProductData(p);
          queryClient.setQueryData(['product', String(p.id)], {
            product: p,
            reviews: p.reviews || [],
            images: p.images || [],
            related: []
          });
        });
      }
      return data;
    },
    initialData: () => {
      if (!filters.category && !filters.searchQ && (filters.page || 1) === 1) {
        try {
          const raw = localStorage.getItem('hu_fast_shop_page1');
          if (raw) return JSON.parse(raw);
        } catch {}
      }
      return undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

import { useDisplayPrice } from '../utils/priceHelper'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toggleItem, hasItem } = useWishlistStore()
  const { addItem } = useCartStore()
  const { showToast } = useToastStore()
  const { getDisplayPrice } = useDisplayPrice()

  // URL Params mapping
  const category = searchParams.get('cat') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const searchQ = searchParams.get('q') || ''
  const priceMin = searchParams.get('min') || ''
  const priceMax = searchParams.get('max') || ''
  const size = searchParams.get('size') || ''
  const color = searchParams.get('color') || ''

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // React Queries
  const filters = useMemo(() => ({
    page,
    category,
    sort,
    searchQ,
    priceMin,
    priceMax,
    size
  }), [page, category, sort, searchQ, priceMin, priceMax, size])

  const { data: shopData, isLoading: loading } = useShopProducts(filters)
  const { data: categories = [] } = useCategories()

  const products = shopData?.data || []
  const totalPages = shopData?.pagination?.pages || 1
  const totalProducts = shopData?.pagination?.total || 0



  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (value) {
      nextParams.set(key, value)
    } else {
      nextParams.delete(key)
    }
    if (key !== 'page') {
      nextParams.set('page', '1') // Reset page on filter
    }
    setSearchParams(nextParams)
  }

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
      size: '38',
      img: prod.images?.[0] || '',
      category: prod.category
    })
    showToast('success', 'Added to Bag 🛍️', `${prod.name} (Size 38) added to your shopping bag.`)
  }

  const categoriesList = [
    { value: '', label: 'All Products' },
    ...(categories.length === 0
      ? [
          { value: 'heels', label: 'Premium Heels' },
          { value: 'sandals', label: 'Chic Sandals' },
          { value: 'flats', label: 'Comfort Flats' },
          { value: 'bags', label: 'Luxury Bags' }
        ]
      : categories.map((cat: any) => ({
          value: cat.slug || cat.name.toLowerCase(),
          label: cat.name
        })))
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'name', label: 'Alphabetical' },
    { value: 'rating', label: 'Customer Rating' }
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-screen">
      {/* Title */}
      <div className="border-b border-gray-100 pb-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 font-display italic">Shop Our Collections</h1>
          <p className="text-xs text-gray-500 mt-1">Showing {products.length} of {totalProducts} styles</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Search products..."
            defaultValue={searchQ}
            onChange={(e) => {
              const val = e.target.value;
              clearTimeout((window as any).__searchDebounce);
              (window as any).__searchDebounce = setTimeout(() => updateParam('q', val), 300);
            }}
            className="border border-gray-200 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-primary w-64 bg-white"
          />
        </div>
      </div>

      {/* Mobile Filters Toggle Button */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm"
        >
          <Filter className="w-4 h-4 text-primary" />
          {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block lg:col-span-1 space-y-8 select-none`}>
          {/* Category Filter */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" /> Filter by Category
            </h3>
            <div className="flex flex-col gap-2.5">
              {categoriesList.map((item) => (
                <button
                  key={item.value}
                  onClick={() => updateParam('cat', item.value)}
                  className={`text-left text-xs font-medium py-1.5 px-3 rounded-lg transition-colors ${
                    category === item.value
                      ? 'bg-primary-50 text-primary font-semibold'
                      : 'text-gray-600 hover:bg-[#fcfbf9] hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Filters */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Price Range (₹)</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => updateParam('min', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-center focus:outline-none focus:border-primary bg-white"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => updateParam('max', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-center focus:outline-none focus:border-primary bg-white"
              />
            </div>
          </div>

          {/* Filter by Size */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Filter by Size</h3>
            <div className="grid grid-cols-3 gap-2">
              {['36', '37', '38', '39', '40', '41'].map((sz) => {
                const isSelected = size === sz
                return (
                  <button
                    key={sz}
                    onClick={() => updateParam('size', isSelected ? '' : sz)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary border-primary text-white font-bold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                    }`}
                  >
                    {formatSizeToIndian(sz)}
                  </button>
                )
              })}
            </div>
          </div>


        </div>

        {/* Products Grid Section */}
        <div className="lg:col-span-3 space-y-8">
          {/* Toolbar */}
          <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-white shadow-sm text-xs text-gray-600">
            <div className="flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-4 h-4 text-gray-400" /> Sort Products
            </div>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="border-none focus:outline-none focus:ring-0 bg-transparent py-1 font-semibold text-gray-900 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="bg-gray-100 rounded-xl aspect-square w-full" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-gray-200 rounded-xl bg-white">
              <p className="text-sm text-gray-500 font-medium">No styles found matching your criteria.</p>
              <button
                onClick={() => setSearchParams({})}
                className="mt-4 px-6 py-2.5 bg-primary hover:bg-[#b17e3f] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((prod: any, idx: number) => {
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-gray-100 pt-8 mt-12 select-none">
              <button
                onClick={() => updateParam('page', String(page - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {(() => {
                // Smart pagination: show first, last, current, and nearby pages with ellipsis
                const pages: (number | string)[] = [];
                const delta = 2;
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...');
                  }
                }
                return pages.map((p, idx) => {
                  if (p === '...') return <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">…</span>;
                  const pageNum = p as number;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => updateParam('page', String(pageNum))}
                      className={`h-9 w-9 text-xs font-semibold rounded-lg border transition-all ${
                        page === pageNum
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
