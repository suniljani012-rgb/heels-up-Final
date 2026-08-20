// frontend/src/pages/StyleGuideArticle.tsx
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Share2, CheckCircle2, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import TrustStrip from '../components/TrustStrip';
import { STYLE_GUIDES } from '../data/styleGuides';

export default function StyleGuideArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? STYLE_GUIDES[slug] : null;

  if (!article) {
    return <Navigate to="/style-guide" replace />;
  }

  return (
    <div className="w-full select-none">
      <SEO
        title={`${article.title} | HeelsUp Guide`}
        description={article.metaDescription}
        canonical={`https://heelsup.in/style-guide/${article.slug}`}
        ogImage="https://heelsup.in/logo.webp"
        keywords={`${article.category}, heels guide, footwear advice india, ${article.title.toLowerCase()}`}
      />

      {/* Breadcrumb Header */}
      <div className="bg-[#fcfbf9] border-b border-gray-100 py-4 px-6 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/style-guide" className="hover:text-gray-900 transition-colors">Style Guide</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-semibold truncate">{article.title}</span>
        </div>
      </div>

      <TrustStrip />

      {/* Main Content Article */}
      <article className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        <div className="mb-8">
          <span className="text-[10px] font-bold text-[#b38d4f] uppercase tracking-widest bg-[#ead2ae]/30 px-3 py-1 rounded-full">
            {article.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-light text-gray-950 font-display italic mt-4 mb-4 leading-tight">
            {article.title}
          </h1>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed font-serif">
            {article.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-6 pt-6 border-t border-gray-100">
            <span className="font-semibold text-gray-800">{article.author}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
            <span>&bull;</span>
            <span>Updated August 2026</span>
          </div>
        </div>

        {/* Key Takeaways Box */}
        <div className="my-8 bg-[#f5f2eb]/60 border border-[#ead2ae] rounded-2xl p-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#b38d4f]" /> Key Takeaways at a Glance
          </h3>
          <ul className="space-y-2 text-xs text-gray-700">
            {article.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#b38d4f] flex-shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Article Body Sections */}
        <div className="space-y-10 text-gray-700 leading-relaxed text-sm">
          {article.sections.map((sec, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 font-display italic">
                {sec.heading}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                {sec.content}
              </p>
              {sec.internalLink && (
                <div className="pt-2">
                  <Link
                    to={sec.internalLink.url}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#ead2ae]/30 border border-[#ead2ae] rounded-xl text-xs font-bold text-gray-900 hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    {sec.internalLink.text} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Recommended Category Product Landing Interlinks */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Recommended Footwear Collections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {article.recommendedCategories.map((cat, idx) => (
              <Link
                key={idx}
                to={cat.url}
                className="group p-5 border border-gray-200 rounded-2xl bg-white hover:border-primary transition-colors shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors text-sm">
                    {cat.label}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {cat.description}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-4 flex items-center gap-1">
                  Shop Collection <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            to="/style-guide"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Style Guides
          </Link>
        </div>
      </article>
    </div>
  );
}
