// frontend/src/pages/StyleGuideHub.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Sparkles, Clock, Calendar, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import TrustStrip from '../components/TrustStrip';
import { STYLE_GUIDES } from '../data/styleGuides';

export default function StyleGuideHub() {
  const articles = Object.values(STYLE_GUIDES);

  return (
    <div className="w-full select-none">
      <SEO
        title="Style Guide & Footwear Trends 2026 | Editorial & Advice | HeelsUp"
        description="Explore the HeelsUp Style Guide: Expert tips on office heels, bridal footwear selection, comfort ergonomics, and 2026 fashion trends for Indian women."
        canonical="https://heelsup.in/style-guide"
        ogImage="https://heelsup.in/logo.webp"
        keywords="footwear style guide, office heels guide, bridal heels guide, heels trends 2026, comfortable heels india"
      />

      {/* Hero Banner */}
      <div className="bg-[#fcfbf9] border-b border-gray-100 py-16 px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[10px] font-bold text-[#b38d4f] uppercase tracking-widest bg-[#ead2ae]/30 px-3.5 py-1 rounded-full">
            HeelsUp Fashion Editorial
          </span>
          <h1 className="text-3xl md:text-5xl font-light text-gray-900 font-display italic mt-4 mb-4">
            Footwear Style &amp; Buying Guides
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Expert styling advice, footwear ergonomics, and bridal selection tips curated by our master artisans and fashion forecasters in Jodhpur.
          </p>
        </div>
      </div>

      <TrustStrip />

      {/* Article Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((art) => (
            <Link
              key={art.slug}
              to={`/style-guide/${art.slug}`}
              className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3">
                  <span className="font-bold uppercase tracking-wider text-[#b38d4f] bg-[#ead2ae]/20 px-2.5 py-0.5 rounded-full">
                    {art.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {art.readTime}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug mb-3">
                  {art.title}
                </h2>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-4">
                  {art.subtitle}
                </p>
              </div>

              <div className="px-6 py-4 bg-[#fcfbf9] border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-800 group-hover:text-primary transition-colors">
                <span>Read Full Guide</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Category Jump Box */}
        <div className="mt-20 border border-[#ead2ae]/60 bg-[#f5f2eb]/40 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
          <Sparkles className="w-8 h-8 text-[#b38d4f] mx-auto mb-3" />
          <h3 className="text-2xl font-light text-gray-900 font-display italic">
            Ready to Find Your Perfect Pair?
          </h3>
          <p className="text-xs text-gray-600 max-w-xl mx-auto mt-2 mb-6">
            Explore our handcrafted block heels, stiletto heels, bridal footwear, and luxury handbags with free delivery across India on orders above ₹1599.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/heels/block-heels"
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
            >
              Block Heels
            </Link>
            <Link
              to="/heels/bridal-heels"
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
            >
              Bridal Heels
            </Link>
            <Link
              to="/heels/office-heels"
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
            >
              Office Heels
            </Link>
            <Link
              to="/heels/stiletto-heels"
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
            >
              Stiletto Heels
            </Link>
            <Link
              to="/shop"
              className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#b17e3f] transition-colors"
            >
              Shop All Collections
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
