import React, { useState } from 'react';
import { useGoogleReviews } from '../hooks/usePublicQueries';
import { Star, X, CheckCircle2, MessageSquareQuote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GoogleReviewsWidget: React.FC = () => {
  const { data, isLoading } = useGoogleReviews();
  const [modalOpen, setModalOpen] = useState(false);

  const reviews = data?.reviews || [];
  const stats = data?.stats || { average_rating: 4.9, total_reviews: reviews.length || 24 };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 my-16 py-12 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-4" />
        <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-8 mt-20 mb-20 select-none">
      {/* Header & Rating Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden">
        {/* Background Decorative Blur */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-amber-300 border border-white/10 mb-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google Verified Business</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Customer Reviews on Google
            </h2>
            <p className="text-xs md:text-sm text-gray-300 mt-2 max-w-xl">
              See what real shoppers in Jodhpur and across India say about our quality, comfort, and service.
            </p>
          </div>

          {/* Rating Badge */}
          <div className="flex flex-col items-center md:items-end bg-white/10 backdrop-blur-lg border border-white/15 px-6 py-4 rounded-2xl shadow-inner text-center">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black text-white">{stats.average_rating}</span>
              <div className="flex flex-col items-start">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] text-gray-300 font-medium">Based on Google Reviews</span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Authentic Ratings
            </span>
          </div>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {reviews.slice(0, 3).map((rev: any) => (
          <div
            key={rev.id}
            className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
          >
            <div>
              {/* Header: Author Avatar & Google Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={rev.author_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.author_name)}&background=random`}
                    alt={rev.author_name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{rev.author_name}</h4>
                    <span className="text-[10px] text-gray-400 block font-medium">
                      {rev.relative_time_description || 'Recently'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-blue-100">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google Review</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-xs text-gray-700 leading-relaxed italic">
                "{rev.review_text}"
              </p>
            </div>

            {/* Merchant Reply if exists */}
            {rev.merchant_reply && (
              <div className="mt-4 pt-3 border-t border-gray-100 bg-slate-50 p-3 rounded-lg text-[11px]">
                <span className="font-bold text-gray-900 block mb-0.5">Response from Heels Up (Owner):</span>
                <p className="text-gray-600 italic">{rev.merchant_reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Button to open all Google Reviews Modal */}
      {reviews.length > 3 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md"
          >
            <MessageSquareQuote className="w-4 h-4" />
            See All {reviews.length} Google Reviews
          </button>
        </div>
      )}

      {/* All Google Reviews Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Google Reviews for Heels Up</h3>
                    <p className="text-xs text-gray-300">Showing {reviews.length} authentic customer ratings</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.author_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.author_name)}`}
                          alt={rev.author_name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{rev.author_name}</h4>
                          <span className="text-[10px] text-gray-400">{rev.relative_time_description || rev.review_date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">"{rev.review_text}"</p>
                    {rev.merchant_reply && (
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg text-[11px]">
                        <span className="font-bold text-gray-900 block">Response from Heels Up:</span>
                        <p className="text-gray-600 italic">{rev.merchant_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
