import React, { useState } from 'react';
import { useGoogleReviews } from '../hooks/usePublicQueries';
import { Star, X, CheckCircle2, MessageSquareQuote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FALLBACK_GOOGLE_REVIEWS = [
  { id: 1, author_name: 'Diya Nihalani', author_photo_url: 'https://ui-avatars.com/api/?name=Diya+Nihalani&background=8C6239&color=FFFFFF', rating: 5, review_text: 'Very affordable and best designs here.. must visit recommended. Great visit. Cooperative staff and helpful', relative_time_description: '2 years ago', merchant_reply: null },
  { id: 2, author_name: 'Hitesh Kumar', author_photo_url: 'https://ui-avatars.com/api/?name=Hitesh+Kumar&background=4A148C&color=FFFFFF', rating: 5, review_text: 'I purchase shoes and heels for my sister she love the product very much ❤comfortable soft and classy shoes and heels you can have here so go ahead do shoping 😁 😚', relative_time_description: '4 years ago', merchant_reply: null },
  { id: 3, author_name: 'Hemant Hotchandani', author_photo_url: 'https://ui-avatars.com/api/?name=Hemant+Hotchandani&background=1A237E&color=FFFFFF', rating: 5, review_text: "One Stop store for girl's foot wear", relative_time_description: '2 years ago', merchant_reply: null },
  { id: 4, author_name: 'Ajayraj Prajapat', author_photo_url: 'https://ui-avatars.com/api/?name=Ajayraj+Prajapat&background=E65100&color=FFFFFF', rating: 5, review_text: 'Best& primium smrat look shoes and sleeper collaction i like this and bast range i am happy to shoping in heels up 😋', relative_time_description: '4 years ago', merchant_reply: null },
  { id: 5, author_name: 'Pratibha Bamaniya', author_photo_url: 'https://ui-avatars.com/api/?name=Pratibha+Bamaniya&background=AA00FF&color=FFFFFF', rating: 5, review_text: 'Best quality shoes with affordable prices. Highly recommend!', relative_time_description: '3 years ago', merchant_reply: null },
  { id: 6, author_name: 'Bhanu pratap', author_photo_url: 'https://ui-avatars.com/api/?name=Bhanu+pratap&background=0288D1&color=FFFFFF', rating: 5, review_text: 'Very good shop for girls... Highly recommend !', relative_time_description: 'Edited 2 years ago', merchant_reply: null },
  { id: 7, author_name: 'Kumer Detha', author_photo_url: 'https://ui-avatars.com/api/?name=Kumer+Detha&background=795548&color=FFFFFF', rating: 5, review_text: 'Good', relative_time_description: '7 months ago', merchant_reply: null },
  { id: 8, author_name: 'Mitesh Khatri', author_photo_url: 'https://ui-avatars.com/api/?name=Mitesh+Khatri&background=BF360C&color=FFFFFF', rating: 5, review_text: 'Best and superior quality products on affordable prices.', relative_time_description: '4 years ago', merchant_reply: null },
  { id: 9, author_name: 'Rajkumar', author_photo_url: 'https://ui-avatars.com/api/?name=Rajkumar&background=00897B&color=FFFFFF', rating: 5, review_text: 'Nice shop and Osm collection h', relative_time_description: 'a year ago', merchant_reply: null },
  { id: 10, author_name: 'Smart techno gaming king', author_photo_url: 'https://ui-avatars.com/api/?name=Smart+techno&background=37474F&color=FFFFFF', rating: 5, review_text: 'Good collection of footwear Service is Also good .', relative_time_description: '4 years ago', merchant_reply: null },
  { id: 11, author_name: 'Reena Rajwani', author_photo_url: 'https://ui-avatars.com/api/?name=Reena+Rajwani&background=5E35B1&color=FFFFFF', rating: 5, review_text: 'Amazing products and outstanding quality of the products 👌 👌', relative_time_description: '4 years ago', merchant_reply: null },
  { id: 12, author_name: 'surbhi chouhan', author_photo_url: 'https://ui-avatars.com/api/?name=surbhi+chouhan&background=212121&color=FFFFFF', rating: 5, review_text: 'Great service and awesome collection 👌', relative_time_description: '4 years ago', merchant_reply: null }
];

export const GoogleReviewsWidget: React.FC = () => {
  const { data } = useGoogleReviews();
  const [modalOpen, setModalOpen] = useState(false);

  const reviews = (data?.reviews && data.reviews.length > 0) ? data.reviews : FALLBACK_GOOGLE_REVIEWS;
  const stats = data?.stats || { average_rating: 4.9, total_reviews: 36 };

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24 select-none mb-24">
      {/* Section Title matching Site Design */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google Verified Reviews
        </span>
        <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">What Our Customers Say</h2>
        <div className="h-[1.5px] w-12 bg-[#c9a96e] mx-auto mt-4" />
      </div>

      {/* Review Cards Grid matching Site Testimonials Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviews.slice(0, 3).map((rev: any) => (
          <div
            key={rev.id}
            className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1 text-[#c9a96e] mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-[#c9a96e] text-[#c9a96e]' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                "{rev.review_text}"
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <div className="h-8 w-8 rounded-full bg-[#ead2ae] text-gray-700 font-bold text-xs flex items-center justify-center">
                {rev.author_name ? rev.author_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">{rev.author_name}</h4>
                <span className="text-[9px] text-gray-400 font-bold uppercase">
                  Verified Buyer &middot; {rev.relative_time_description || 'Google Review'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Button matching Site Styling */}
      {reviews.length > 3 && (
        <div className="flex justify-center mt-12">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e] hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
          >
            View All {reviews.length} Google Reviews
            <MessageSquareQuote className="w-4 h-4" />
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
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display italic">Google Reviews for Heels Up</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing {reviews.length} authentic Google customer ratings
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reviews List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="p-5 bg-gray-50/50 rounded-xl border border-gray-100/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-[#c9a96e]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-[#c9a96e] text-[#c9a96e]' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {rev.relative_time_description || rev.review_date}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed italic">"{rev.review_text}"</p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                      <div className="h-7 w-7 rounded-full bg-[#ead2ae] text-gray-700 font-bold text-xs flex items-center justify-center">
                        {rev.author_name ? rev.author_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900">{rev.author_name}</h4>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Google Review</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-100"
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
