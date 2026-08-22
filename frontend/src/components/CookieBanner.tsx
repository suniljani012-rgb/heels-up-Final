import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const consent = localStorage.getItem('hu_cookie_consent')
      if (!consent) {
        // Show after a brief non-intrusive delay (1.5s) to never compete with initial render
        const timer = setTimeout(() => setVisible(true), 1500)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage may fail in strict private browsing
    }
  }, [])

  const handleAccept = () => {
    try {
      localStorage.setItem('hu_cookie_consent', 'accepted')
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Cookie and Privacy Notice"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-[#1a1816]/95 backdrop-blur-md text-white border border-[#332f2b] p-4 rounded-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-[#c59b63] flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-xs text-gray-300 leading-relaxed">
          <p>
            We use cookies to enhance your shopping experience and analyze our traffic.{' '}
            <Link
              to="/pages/privacy-policy"
              className="text-[#c59b63] underline hover:text-[#d8b27c] transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 bg-[#c59b63] hover:bg-[#b1854f] text-black font-semibold text-[11px] rounded-lg tracking-wider uppercase transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleAccept}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-[11px] font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleAccept}
          aria-label="Close cookie banner"
          className="text-gray-400 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
