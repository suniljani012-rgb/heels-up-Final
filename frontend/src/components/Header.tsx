import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, Heart, User, Search, Menu, X, ShieldAlert } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'

export default function Header() {
  const { getCartCount } = useCartStore()
  const { items: wishlistItems } = useWishlistStore()
  const { user, isAuthenticated } = useAuthStore()
  const { setCartOpen, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isLinkActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/'
    }
    if (to === '/shop') {
      return location.pathname === '/shop' && !new URLSearchParams(location.search).get('cat')
    }
    if (to.startsWith('/shop?cat=')) {
      const catSlug = to.split('cat=')[1]
      return location.pathname === '/shop' && new URLSearchParams(location.search).get('cat') === catSlug
    }
    return false
  }

  const [scrolled, setScrolled] = useState(false)
  const [announcementIndex, setAnnouncementIndex] = useState(0)
  const [logoFailed, setLogoFailed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<string[]>([
    "🎉 NEW ARRIVALS — Summer Collection is Live!",
    "🚚 FREE Shipping on orders above ₹1599",
    "🏷️ Use code HEELS10 for 10% off on first order"
  ])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)

    // Fetch live categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCategories(data.data)
        }
      })
      .catch(err => console.error("Error loading categories in header:", err))

    // Fetch live announcements
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAnnouncements(data.data.map((item: any) => item.text))
        }
      })
      .catch(err => console.error("Error loading announcements in header:", err))

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Rotate announcements
  useEffect(() => {
    if (announcements.length <= 1) return
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [announcements])

  const handleSearchSubmit = (e: any) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/shop')
    }
  }

  const cartCount = getCartCount()
  const wishlistCount = wishlistItems.length

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop All' },
    ...categories.map(cat => ({
      to: `/shop?cat=${cat.slug}`,
      label: cat.name
    }))
  ]

  return (
    <header className="w-full z-40 sticky top-0 bg-[#fcfbf9] transition-all duration-300 shadow-sm">
      {/* Announcement Bar */}
      {!scrolled && (
        <div className="w-full h-10 bg-[#e8ccc5] text-[#2d2a26] text-xs font-semibold flex items-center justify-center transition-all duration-300 relative overflow-hidden px-4 select-none">
          <div key={announcementIndex} className="animate-fadeIn text-center">
            {announcements[announcementIndex]}
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <nav
        className={`w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-md py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            {logoFailed ? (
              <span className="text-xl font-light tracking-widest text-gray-900 font-display italic select-none">
                Heels<span className="font-semibold text-primary">Up</span>
              </span>
            ) : (
              <img
                src="/logo.png"
                alt="HeelsUp Logo"
                className={`object-contain mix-blend-multiply transition-all duration-300 ${
                  scrolled ? 'h-8' : 'h-10'
                }`}
                onError={() => setLogoFailed(true)}
              />
            )}
          </Link>

          {/* Desktop Nav links */}
          <ul className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-gray-700">
            {navLinks.map((link) => {
              const active = isLinkActive(link.to)
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`hover:text-[#c9a96e] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-[#c9a96e] after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform ${
                      active ? 'text-[#c9a96e] after:scale-x-100' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
            {isAuthenticated && (user?.role === 'admin' || user?.role === 'staff') && (
              <li>
                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-[#d4456b] hover:text-[#be2e54] transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Portal
                </Link>
              </li>
            )}
          </ul>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4 text-gray-700">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex relative items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 focus:w-44 transition-all duration-300 py-1 pl-3 pr-8 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-[#d4456b] focus:ring-1 focus:ring-[#d4456b]"
              />
              <button
                type="submit"
                className="absolute right-2 text-gray-400 hover:text-gray-900 transition-colors"
                title="Search"
                aria-label="Search products"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              title="Wishlist"
              aria-label="View Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-[#d4456b] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title={isAuthenticated ? 'My Profile' : 'Login'}
              aria-label={isAuthenticated ? 'My Profile' : 'Sign in to your account'}
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              title="Shopping Cart"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-[#c9a96e] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger (Mobile only) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/40" />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col p-6 overflow-y-auto transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
              {logoFailed ? (
                <span className="text-lg font-light tracking-widest text-gray-900 font-display italic select-none">
                  Heels<span className="font-semibold text-primary">Up</span>
                </span>
              ) : (
                <img
                  src="/logo.png"
                  alt="HeelsUp Logo"
                  className="h-8 object-contain mix-blend-multiply"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="mt-6 relative flex items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-4 pr-10 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-[#d4456b] focus:ring-1 focus:ring-[#d4456b]"
            />
            <button
              type="submit"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 text-gray-400 hover:text-gray-900 transition-colors"
              title="Search"
              aria-label="Search products"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <nav className="mt-6 flex flex-col gap-6 text-sm font-semibold tracking-wider uppercase text-gray-800">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`hover:text-[#c9a96e] transition-colors ${
                  isLinkActive(link.to) ? 'text-[#c9a96e] font-semibold' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (user?.role === 'admin' || user?.role === 'staff') && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#d4456b] hover:text-[#be2e54] flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                Admin Portal
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </header>
  )
}
