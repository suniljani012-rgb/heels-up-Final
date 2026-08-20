import { useEffect, lazy, Suspense, useRef } from 'react'
import { autoPreloadStorefrontImages } from './utils/imagePreloader'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trackPageView } from './utils/analytics'
import { initGlobalErrorTracking, logPageView } from './utils/activityTracker'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ToastContainer from './components/ToastContainer'
import { BannerSkeleton, ProductGridSkeleton, ProductDetailSkeleton } from './components/Skeletons'

import Home from './pages/Home'
const Shop = lazy(() => import('./pages/Shop'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))
const OrderTracking = lazy(() => import('./pages/OrderTracking'))
const DynamicPage = lazy(() => import('./pages/DynamicPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))

import { useCartStore } from './store/useCartStore'

// Optimized QueryClient configuration with smart caching and exponential backoff retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default — data stays fresh longer
      gcTime: 15 * 60 * 1000,   // 15 minutes in-memory retention
      refetchOnWindowFocus: false, // Prevent intrusive tab focus refetches
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const detectLocation = useCartStore(state => state.detectLocation)
  const pageStartTimeRef = useRef(Date.now())

  // Track SPA page navigation on route change & record visitor time on page
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const duration = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
    pageStartTimeRef.current = Date.now();

    trackPageView(currentPath);
    if (!isAdmin) {
      logPageView(currentPath, document.title || 'Storefront', duration > 0 && duration < 1800 ? duration : 0);
    }
  }, [location.pathname, location.search, isAdmin])

  useEffect(() => {
    initGlobalErrorTracking();
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    // Website kholte hi location ki details aur price dynamically loads
    detectLocation();

    // Clear any stale localStorage mock data from old versions
    try {
      ['categories', 'banners', 'featuredProducts'].forEach(k =>
        localStorage.removeItem(`heelsup_cache_${k}`)
      );
    } catch {}

    // Prefetch essential global data in parallel on app launch — 100% live from DB
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
      },
      staleTime: 30 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['banners'],
      queryFn: async () => {
        const res = await fetch('/api/banners');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
      },
      staleTime: 60 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['featuredProducts'],
      queryFn: async () => {
        const res = await fetch('/api/products?limit=8&featured=true');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const products = data.data;
        // Preload first 4 product images via <link rel="preload"> for instant LCP
        if (Array.isArray(products)) {
          products.slice(0, 4).forEach((prod: any) => {
            const imgUrl = prod?.images?.[0];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'image';
              link.href = imgUrl;
              link.setAttribute('fetchpriority', 'high');
              document.head.appendChild(link);
            }
          });
        }
        return products;
      },
      staleTime: 30 * 60 * 1000,
    });

    // 🚀 ULTRA-FAST: Silently preload ALL product + banner images into browser RAM
    // so every page shows images at 0ms — no wait, no progressive load, instant!
    autoPreloadStorefrontImages();

  }, [detectLocation])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    // Fallback scroll to top for async content load & layout shifts
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, 50)

    return () => clearTimeout(timer)
  }, [location.pathname, location.search])

  return (
    <div className={isAdmin ? "w-full" : "flex flex-col min-h-screen bg-[#fcfbf9] text-[#1a1816]"}>
      {!isAdmin && <Header />}
      <main className={isAdmin ? "" : "flex-grow"}>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-6 py-12">
            <ProductGridSkeleton count={8} />
          </div>
        }>
          <Routes>
            {/* Main storefront routes */}
            <Route path="/" element={<Home />} />
            <Route path="/index.html" element={<Home />} />
            
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop.html" element={<Shop />} />
            
            {/* Category & Collection Landing Routes (SEO & GEO) */}
            <Route path="/heels" element={<Shop />} />
            <Route path="/heels/:category" element={<Shop />} />
            <Route path="/heels/:category/:slug" element={<Product />} />
            <Route path="/block-heels" element={<Shop />} />
            <Route path="/pencil-heels" element={<Shop />} />
            <Route path="/stilettos" element={<Shop />} />
            <Route path="/bridal-heels" element={<Shop />} />
            <Route path="/wedges" element={<Shop />} />
            <Route path="/flats" element={<Shop />} />
            <Route path="/bags" element={<Shop />} />
            
            <Route path="/product" element={<Product />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/product.html" element={<Product />} />
            
            <Route path="/cart" element={<Cart />} />
            <Route path="/cart.html" element={<Cart />} />
            
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout.html" element={<Checkout />} />
            
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/wishlist.html" element={<Wishlist />} />
            
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile.html" element={<Profile />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/login.html" element={<Login />} />
            
            <Route path="/register" element={<Register />} />
            <Route path="/register.html" element={<Register />} />
            
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-password.html" element={<ForgotPassword />} />
            
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/order-tracking" element={<OrderTracking />} />
            <Route path="/order-tracking.html" element={<OrderTracking />} />
            
            {/* Dynamic content & policy pages */}
            <Route path="/privacy" element={<DynamicPage />} />
            <Route path="/privacy.html" element={<DynamicPage />} />
            <Route path="/terms" element={<DynamicPage />} />
            <Route path="/terms.html" element={<DynamicPage />} />
            <Route path="/returns" element={<DynamicPage />} />
            <Route path="/returns.html" element={<DynamicPage />} />
            <Route path="/shipping-info" element={<DynamicPage />} />
            <Route path="/shipping-info.html" element={<DynamicPage />} />
            <Route path="/faq" element={<DynamicPage />} />
            <Route path="/faq.html" element={<DynamicPage />} />
            <Route path="/about" element={<DynamicPage />} />
            <Route path="/about.html" element={<DynamicPage />} />
            <Route path="/size-guide" element={<DynamicPage />} />
            <Route path="/size-guide.html" element={<DynamicPage />} />

            {/* Admin Portal routes */}
            <Route
              path="/admin"
              element={
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-[50vh] select-none">
                    <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-gray-400 mt-4 tracking-widest uppercase">Initializing Admin Console...</p>
                  </div>
                }>
                  <Admin />
                </Suspense>
              }
            />
            <Route
              path="/admin.html"
              element={
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-[50vh] select-none">
                    <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-gray-400 mt-4 tracking-widest uppercase">Initializing Admin Console...</p>
                  </div>
                }>
                  <Admin />
                </Suspense>
              }
            />
            
            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      
      {/* Overlays */}
      {!isAdmin && <CartDrawer />}
      <ToastContainer />

      {/* Floating WhatsApp Widget */}
      {!isAdmin && (
        <a
          href="https://wa.me/917891470935?text=Hello%20HeelsUp!%20I%20am%20exploring%20your%20collection%20and%20need%20some%20assistance."
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25d366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
          title="Chat with us on WhatsApp"
        >
          <svg className="w-6 h-6 fill-white" viewBox="0 0 448 512">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
          </svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-white pl-0 group-hover:pl-2">
            WhatsApp Chat
          </span>
        </a>
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
