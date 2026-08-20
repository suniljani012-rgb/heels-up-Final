import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const { showToast } = useToastStore()
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCategories(data.data)
        }
      })
      .catch(err => console.error("Error loading categories in footer:", err))
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailVal = email.trim()
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Subscribed! 🎉', 'You have been successfully added to our mailing list.')
        setEmail('')
      } else {
        showToast('error', 'Subscription Failed', data.error || 'Please try again later.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect to the subscription server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // ── Warm charcoal footer — no blue at all ──
    // bg: #1c1917 (warm stone-950, zero blue tint)
    // text: warm gray-400 (#a8a29e)
    // borders: #292524 (stone-800)
    <footer className="text-xs border-t mt-20 pt-16 pb-8 select-none"
      style={{ backgroundColor: '#1c1917', color: '#a8a29e', borderColor: '#292524' }}>

      <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12"
        style={{ borderBottom: '1px solid #292524' }}>

        {/* Brand & Newsletter */}
        <div className="flex flex-col gap-6">
          {logoFailed ? (
            <span className="text-lg font-light tracking-widest font-display italic select-none" style={{ color: '#fafaf9' }}>
              Heels<span className="font-semibold" style={{ color: '#c9a96e' }}>Up</span>
            </span>
          ) : (
            <div className="p-2.5 rounded-xl inline-block w-fit shadow-md" style={{ backgroundColor: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img
                src="/logo.png"
                alt="HeelsUp Logo"
                className="h-8 object-contain"
                onError={() => setLogoFailed(true)}
              />
            </div>
          )}
          <p className="leading-relaxed" style={{ color: '#78716c' }}>
            India's premier online store for luxury ladies heels, flats, sandals, wedges &amp; bags. 22.1K+ happy customers.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
            <input
              type="email"
              placeholder="Your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1 rounded-lg px-4 py-2 focus:outline-none transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#292524',
                border: '1px solid #3c3836',
                color: '#fafaf9',
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 font-semibold rounded-lg transition-colors uppercase tracking-wider text-[10px] disabled:opacity-50"
              style={{ backgroundColor: '#c9a96e', color: '#fff' }}
            >
              Join
            </button>
          </form>
        </div>

        {/* Collections */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fafaf9' }}>Collections</h4>
          <ul className="space-y-2.5">
            {categories.length === 0 ? (
              <>
                <li><Link to="/shop?cat=heels" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Premium Heels</Link></li>
                <li><Link to="/shop?cat=flats" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Flat Sandals</Link></li>
                <li><Link to="/shop?cat=wedges" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Wedges</Link></li>
                <li><Link to="/shop?cat=bags" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Bags & Accessories</Link></li>
              </>
            ) : (
              categories.map((cat: any) => (
                <li key={cat.id}>
                  <Link
                    to={`/shop?cat=${encodeURIComponent(cat.slug || cat.name)}`}
                    className="transition-colors hover:opacity-80 capitalize"
                    style={{ color: '#a8a29e' }}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Support */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fafaf9' }}>Support &amp; Info</h4>
          <ul className="space-y-2.5">
            <li><Link to="/shipping-info" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Shipping &amp; Delivery</Link></li>
            <li><Link to="/returns" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Exchange &amp; Returns</Link></li>
            <li><Link to="/size-guide" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Size Guide</Link></li>
            <li><Link to="/faq" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>FAQs</Link></li>
            <li><Link to="/privacy" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Privacy Policy</Link></li>
            <li><Link to="/terms" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>Terms &amp; Conditions</Link></li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fafaf9' }}>Get in Touch</h4>
          <ul className="space-y-3.5" style={{ color: '#78716c' }}>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a96e' }} />
              <a
                href="https://maps.app.goo.gl/7Vu3wkdbBczbQw8aA"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:opacity-80"
                style={{ color: '#a8a29e' }}
              >
                Jodhpur, Rajasthan, India
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a96e' }} />
              <a href="tel:+917891470935" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>+91 78914 70935</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a96e' }} />
              <a href="mailto:support@heelsup.in" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>support@heelsup.in</a>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a96e', fill: '#c9a96e' }} viewBox="0 0 448 512">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
              <a href="https://wa.me/917891470935?text=Hello%20HeelsUp!%20I%20am%20exploring%20your%20collection%20and%20need%20some%20assistance." target="_blank" rel="noreferrer" className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>
                WhatsApp Chat
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Competitor-Grade Keyword Landing Page Matrix & Topical Authority Links (SEO Interlinking) */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 border-b" style={{ borderColor: '#292524' }}>
        <div className="space-y-4">
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#fafaf9' }}>
              Shop By Heel Style
            </h5>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]" style={{ color: '#78716c' }}>
              <Link to="/heels/block-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Block Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/stiletto-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Stiletto Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/pencil-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Pencil Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/platform-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Platform Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/wedges" className="hover:underline" style={{ color: '#a8a29e' }}>Wedge Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/pump-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Pump Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/kitten-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Kitten Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/mule-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Mule Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/ankle-strap-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Ankle Strap Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/heel-sandals" className="hover:underline" style={{ color: '#a8a29e' }}>Heel Sandals</Link>
              <span>&bull;</span>
              <Link to="/heels/heel-boots" className="hover:underline" style={{ color: '#a8a29e' }}>Heel Boots</Link>
              <span>&bull;</span>
              <Link to="/flats" className="hover:underline" style={{ color: '#a8a29e' }}>Flat Sandals</Link>
            </div>
          </div>

          <div className="pt-2">
            <h5 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#fafaf9' }}>
              Shop By Occasion &amp; Editorial Guides
            </h5>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]" style={{ color: '#78716c' }}>
              <Link to="/heels/bridal-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Bridal Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/wedding-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Wedding Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/party-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Party Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/office-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Office Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/formal-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Formal Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/casual-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Casual Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/festive-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Festive Heels</Link>
              <span>&bull;</span>
              <Link to="/heels/daily-wear-heels" className="hover:underline" style={{ color: '#a8a29e' }}>Daily Wear Heels</Link>
              <span>&bull;</span>
              <Link to="/bags" className="hover:underline" style={{ color: '#a8a29e' }}>Handbags &amp; Clutches</Link>
              <span>&bull;</span>
              <Link to="/style-guide" className="hover:underline font-bold" style={{ color: '#c9a96e' }}>Style Guide Hub</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-medium" style={{ color: '#57534e' }}>
          &copy; {new Date().getFullYear()} HeelsUp. All Rights Reserved. Made in Jodhpur.
        </p>

        {/* Social Icons & Cards */}
        <div className="flex items-center gap-6">
          {/* Instagram */}
          <div className="flex items-center gap-4" style={{ color: '#57534e' }}>
            <a href="https://www.instagram.com/heel_s_up" target="_blank" rel="noreferrer"
              className="transition-colors hover:opacity-80" style={{ color: '#a8a29e' }}>
              <i className="fa-brands fa-instagram text-base"></i>
            </a>
          </div>

          {/* Payment Cards */}
          <div className="flex items-center gap-2 rounded-md p-1 px-2"
            style={{ backgroundColor: '#292524', border: '1px solid #3c3836' }}>
            <span className="text-[9px] uppercase tracking-wider font-bold mr-1" style={{ color: '#57534e' }}>Secured Payments</span>
            <i className="fa-brands fa-cc-visa text-sm transition-colors" style={{ color: '#a8a29e' }} />
            <i className="fa-brands fa-cc-mastercard text-sm transition-colors" style={{ color: '#a8a29e' }} />
            <i className="fa-brands fa-google-pay text-base transition-colors" style={{ color: '#a8a29e' }} />
            <span className="text-[9px] font-extrabold uppercase" style={{ color: '#4ade80' }}>UPI</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
