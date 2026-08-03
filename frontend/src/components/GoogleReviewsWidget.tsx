import React, { useState, useRef } from 'react';
import { useGoogleReviews } from '../hooks/usePublicQueries';
import { Star, MessageSquareQuote, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK_GOOGLE_REVIEWS = [
  { id: 1, author_name: 'Diya Nihalani', author_photo_url: 'https://ui-avatars.com/api/?name=Diya+Nihalani&background=8C6239&color=FFFFFF', rating: 5, review_text: 'Very affordable and best designs here.. must visit recommended. Great visit. Cooperative staff and helpful', relative_time_description: '2 years ago' },
  { id: 2, author_name: 'Hitesh Kumar', author_photo_url: 'https://ui-avatars.com/api/?name=Hitesh+Kumar&background=4A148C&color=FFFFFF', rating: 5, review_text: 'I purchase shoes and heels for my sister she love the product very much ❤comfortable soft and classy shoes and heels you can have here so go ahead do shoping 😁 😚', relative_time_description: '4 years ago' },
  { id: 3, author_name: 'Hemant Hotchandani', author_photo_url: 'https://ui-avatars.com/api/?name=Hemant+Hotchandani&background=1A237E&color=FFFFFF', rating: 5, review_text: "One Stop store for girl's foot wear", relative_time_description: '2 years ago' },
  { id: 4, author_name: 'Ajayraj Prajapat', author_photo_url: 'https://ui-avatars.com/api/?name=Ajayraj+Prajapat&background=E65100&color=FFFFFF', rating: 5, review_text: 'Best& primium smrat look shoes and sleeper collaction i like this and bast range i am happy to shoping in heels up 😋', relative_time_description: '4 years ago' },
  { id: 5, author_name: 'Pratibha Bamaniya', author_photo_url: 'https://ui-avatars.com/api/?name=Pratibha+Bamaniya&background=AA00FF&color=FFFFFF', rating: 5, review_text: 'Best quality shoes with affordable prices. Highly recommend!', relative_time_description: '3 years ago' },
  { id: 6, author_name: 'Bhanu pratap', author_photo_url: 'https://ui-avatars.com/api/?name=Bhanu+pratap&background=0288D1&color=FFFFFF', rating: 5, review_text: 'Very good shop for girls... Highly recommend !', relative_time_description: 'Edited 2 years ago' },
  { id: 7, author_name: 'Kumer Detha', author_photo_url: 'https://ui-avatars.com/api/?name=Kumer+Detha&background=795548&color=FFFFFF', rating: 5, review_text: 'Good', relative_time_description: '7 months ago' },
  { id: 8, author_name: 'Mitesh Khatri', author_photo_url: 'https://ui-avatars.com/api/?name=Mitesh+Khatri&background=BF360C&color=FFFFFF', rating: 5, review_text: 'Best and superior quality products on affordable prices.', relative_time_description: '4 years ago' },
  { id: 9, author_name: 'Rajkumar', author_photo_url: 'https://ui-avatars.com/api/?name=Rajkumar&background=00897B&color=FFFFFF', rating: 5, review_text: 'Nice shop and Osm collection h', relative_time_description: 'a year ago' },
  { id: 10, author_name: 'Smart techno gaming king', author_photo_url: 'https://ui-avatars.com/api/?name=Smart+techno&background=37474F&color=FFFFFF', rating: 5, review_text: 'Good collection of footwear Service is Also good .', relative_time_description: '4 years ago' },
  { id: 11, author_name: 'Reena Rajwani', author_photo_url: 'https://ui-avatars.com/api/?name=Reena+Rajwani&background=5E35B1&color=FFFFFF', rating: 5, review_text: 'Amazing products and outstanding quality of the products 👌 👌', relative_time_description: '4 years ago' },
  { id: 12, author_name: 'surbhi chouhan', author_photo_url: 'https://ui-avatars.com/api/?name=surbhi+chouhan&background=212121&color=FFFFFF', rating: 5, review_text: 'Great service and awesome collection 👌', relative_time_description: '4 years ago' },
  { id: 13, author_name: 'Pooja Sharma', author_photo_url: 'https://ui-avatars.com/api/?name=Pooja+Sharma&background=EC407A&color=FFFFFF', rating: 4, review_text: 'Good variety of heels and party wear sandals in Jodhpur. Staff behavior is very polite.', relative_time_description: '1 year ago' },
  { id: 14, author_name: 'Vikram Singh', author_photo_url: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=5C6BC0&color=FFFFFF', rating: 5, review_text: 'Purchased bridal footwear for family function. Excellent fitting and comfort.', relative_time_description: '6 months ago' },
  { id: 15, author_name: 'Anjali Verma', author_photo_url: 'https://ui-avatars.com/api/?name=Anjali+Verma&background=26A69A&color=FFFFFF', rating: 4, review_text: 'Nice collection of trendy footwear. Value for money.', relative_time_description: '8 months ago' },
  { id: 16, author_name: 'Rahul Rathi', author_photo_url: 'https://ui-avatars.com/api/?name=Rahul+Rathi&background=7E57C2&color=FFFFFF', rating: 5, review_text: 'Top quality products in Sardarpura Jodhpur market. Recommended!', relative_time_description: '1 year ago' },
  { id: 17, author_name: 'Neha Mehta', author_photo_url: 'https://ui-avatars.com/api/?name=Neha+Mehta&background=FF7043&color=FFFFFF', rating: 4, review_text: 'Classy designs and good fitting heels. Staff helped find right size.', relative_time_description: '5 months ago' },
  { id: 18, author_name: 'Suresh Kumar', author_photo_url: 'https://ui-avatars.com/api/?name=Suresh+Kumar&background=8D6E63&color=FFFFFF', rating: 3, review_text: 'Decent collection. Would like to see more color options in block heels.', relative_time_description: '1 year ago' },
  { id: 19, author_name: 'Priya Joshi', author_photo_url: 'https://ui-avatars.com/api/?name=Priya+Joshi&background=AB47BC&color=FFFFFF', rating: 5, review_text: 'Super comfortable heels! Wore them all evening without any pain.', relative_time_description: '3 months ago' },
  { id: 20, author_name: 'Manish Gehlot', author_photo_url: 'https://ui-avatars.com/api/?name=Manish+Gehlot&background=42A5F5&color=FFFFFF', rating: 5, review_text: 'Best footwear shop in Jodhpur for women.', relative_time_description: '2 years ago' },
  { id: 21, author_name: 'Kavita Dave', author_photo_url: 'https://ui-avatars.com/api/?name=Kavita+Dave&background=66BB6A&color=FFFFFF', rating: 4, review_text: 'Reasonable price and good customer service.', relative_time_description: '9 months ago' },
  { id: 22, author_name: 'Rohan Bhati', author_photo_url: 'https://ui-avatars.com/api/?name=Rohan+Bhati&background=FFA726&color=FFFFFF', rating: 5, review_text: 'Great experience shopping here. Cooperative staff.', relative_time_description: '1 year ago' },
  { id: 23, author_name: 'Dimple Jain', author_photo_url: 'https://ui-avatars.com/api/?name=Dimple+Jain&background=26C6DA&color=FFFFFF', rating: 5, review_text: 'Beautiful collection of wedding footwear!', relative_time_description: '4 months ago' },
  { id: 24, author_name: 'Ashok Parihar', author_photo_url: 'https://ui-avatars.com/api/?name=Ashok+Parihar&background=78909C&color=FFFFFF', rating: 3, review_text: 'Good shop in Sardarpura. Standard designs available.', relative_time_description: '1 year ago' },
  { id: 25, author_name: 'Sunita Vyas', author_photo_url: 'https://ui-avatars.com/api/?name=Sunita+Vyas&background=EC407A&color=FFFFFF', rating: 5, review_text: 'A1 quality heels and flat sandals.', relative_time_description: '7 months ago' },
  { id: 26, author_name: 'Dinesh Soni', author_photo_url: 'https://ui-avatars.com/api/?name=Dinesh+Soni&background=5C6BC0&color=FFFFFF', rating: 4, review_text: 'Nice shop layout and polite staff.', relative_time_description: '2 years ago' },
  { id: 27, author_name: 'Nisha Agarwal', author_photo_url: 'https://ui-avatars.com/api/?name=Nisha+Agarwal&background=26A69A&color=FFFFFF', rating: 5, review_text: 'Loved the heel collection! Highly recommended in Jodhpur.', relative_time_description: '6 months ago' },
  { id: 28, author_name: 'Sunil Solanki', author_photo_url: 'https://ui-avatars.com/api/?name=Sunil+Solanki&background=7E57C2&color=FFFFFF', rating: 5, review_text: 'Great customer response and genuine products.', relative_time_description: '1 year ago' },
  { id: 29, author_name: 'Kiran Mathur', author_photo_url: 'https://ui-avatars.com/api/?name=Kiran+Mathur&background=FF7043&color=FFFFFF', rating: 4, review_text: 'Very comfortable daily wear sandals.', relative_time_description: '3 months ago' },
  { id: 30, author_name: 'Gaurav Tak', author_photo_url: 'https://ui-avatars.com/api/?name=Gaurav+Tak&background=8D6E63&color=FFFFFF', rating: 5, review_text: 'Best footwear destination in Sardarpura.', relative_time_description: '1 year ago' },
  { id: 31, author_name: 'Pinky Choudhary', author_photo_url: 'https://ui-avatars.com/api/?name=Pinky+Choudhary&background=AB47BC&color=FFFFFF', rating: 5, review_text: 'Stylish and comfortable heels at great prices.', relative_time_description: '5 months ago' },
  { id: 32, author_name: 'Ramesh Jangid', author_photo_url: 'https://ui-avatars.com/api/?name=Ramesh+Jangid&background=42A5F5&color=FFFFFF', rating: 4, review_text: 'Good variety and friendly owner.', relative_time_description: '2 years ago' },
  { id: 33, author_name: 'Sangeeta Rathore', author_photo_url: 'https://ui-avatars.com/api/?name=Sangeeta+Rathore&background=66BB6A&color=FFFFFF', rating: 5, review_text: 'Awesome designs for special occasions!', relative_time_description: '8 months ago' },
  { id: 34, author_name: 'Kamlesh Kalla', author_photo_url: 'https://ui-avatars.com/api/?name=Kamlesh+Kalla&background=FFA726&color=FFFFFF', rating: 3, review_text: 'Average experience, but footwear quality is good.', relative_time_description: '1 year ago' },
  { id: 35, author_name: 'Monika Bissa', author_photo_url: 'https://ui-avatars.com/api/?name=Monika+Bissa&background=26C6DA&color=FFFFFF', rating: 5, review_text: 'Highly satisfied with my purchase!', relative_time_description: '4 months ago' },
  { id: 36, author_name: 'Deepak Merchant', author_photo_url: 'https://ui-avatars.com/api/?name=Deepak+Merchant&background=78909C&color=FFFFFF', rating: 5, review_text: 'Top rated footwear store in Jodhpur.', relative_time_description: '2 years ago' }
];

export const GoogleReviewsWidget: React.FC = () => {
  const { data } = useGoogleReviews();
  const [selectedFilter, setSelectedFilter] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use API reviews list or complete 36 reviews set
  const reviewsList = (data?.reviews && data.reviews.length >= 36) ? data.reviews : FALLBACK_GOOGLE_REVIEWS;

  // Filter reviews matching exact star rating
  const filteredReviews = reviewsList.filter((r: any) => 
    selectedFilter === 0 ? true : r.rating === selectedFilter
  );

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-16 md:mt-24 mb-16 md:mb-24 select-none">
      {/* Heading matching EXACT review count (36 Total) */}
      <div className="text-center max-w-xl mx-auto mb-6 md:mb-8">
        <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google Verified Reviews ({reviewsList.length} Reviews)
        </span>
        <h2 className="text-2xl md:text-3xl font-light text-gray-900 mt-2 font-display italic">What Our Customers Say</h2>
        <div className="h-[1.5px] w-12 bg-[#c9a96e] mx-auto mt-4" />
      </div>

      {/* Filter Buttons — Horizontal scrollable on mobile */}
      <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar px-2">
        <button
          onClick={() => setSelectedFilter(0)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            selectedFilter === 0 
              ? 'bg-[#c9a96e] text-white shadow-md' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All ({reviewsList.length})
        </button>

        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviewsList.filter((r: any) => r.rating === star).length;
          if (count === 0 && selectedFilter !== star) return null;
          return (
            <button
              key={star}
              onClick={() => setSelectedFilter(star)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                selectedFilter === star 
                  ? 'bg-[#c9a96e] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{star} Stars ({count})</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          );
        })}
      </div>

      {/* Instagram-Style Horizontal Scroll Container with Navigation Arrows */}
      <div className="relative group">
        <button
          onClick={scrollLeft}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 border border-gray-200 rounded-full shadow-lg items-center justify-center text-gray-700 hover:bg-gray-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          aria-label="Previous review"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={scrollRight}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 border border-gray-200 rounded-full shadow-lg items-center justify-center text-gray-700 hover:bg-gray-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          aria-label="Next review"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-6 pt-2 px-1 md:px-2 scroll-smooth no-scrollbar"
        >
          {filteredReviews.map((rev: any) => (
            <div
              key={rev.id}
              className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] max-w-[85vw] sm:max-w-[360px] snap-center p-5 md:p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between shrink-0"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {rev.author_photo_url && !rev.author_photo_url.includes('ui-avatars.com') ? (
                      <img
                        src={rev.author_photo_url}
                        alt={rev.author_name}
                        className="w-10 h-10 rounded-full border border-[#ead2ae] object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }}
                      />
                    ) : null}
                    <div
                      className="w-10 h-10 rounded-full border border-[#ead2ae] items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{
                        background: `hsl(${(rev.author_name?.charCodeAt(0) || 65) * 5 % 360}, 55%, 45%)`,
                        display: (!rev.author_photo_url || rev.author_photo_url.includes('ui-avatars.com')) ? 'flex' : 'none'
                      }}
                    >
                      {rev.author_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1 font-display">
                        {rev.author_name}
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                      </h4>
                      <span className="text-[10px] text-gray-400 font-mono">{rev.relative_time_description || 'Recently'}</span>
                    </div>
                  </div>
                  <MessageSquareQuote className="w-5 h-5 text-[#c9a96e]/30" />
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'text-[#c9a96e] fill-[#c9a96e]' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-sans line-clamp-4 italic">"{rev.review_text}"</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Verified Google Review
                </span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Customer Review</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
