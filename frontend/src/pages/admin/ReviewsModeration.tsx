import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Star, MessageSquare, Check, Trash2, X, Filter } from 'lucide-react';

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  body: string;
  title: string;
  product_name: string;
  created_at: string;
  approved: boolean;
  merchant_reply?: string;
}

interface ReviewsModerationProps {
  reviews: Review[];
  onRefresh: () => void;
}

export default function ReviewsModeration({ reviews, onRefresh }: ReviewsModerationProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Merchant response
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Stats
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, pending: 0, approved: 0, total: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const pending = reviews.filter(r => !r.approved).length;
    return {
      avg: parseFloat((sum / reviews.length).toFixed(1)),
      pending,
      approved: reviews.length - pending,
      total: reviews.length
    };
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchRating = filterRating ? r.rating === filterRating : true;
      const matchStatus = filterStatus === 'all' 
        ? true 
        : filterStatus === 'approved' 
          ? r.approved 
          : !r.approved;
      
      const term = searchQuery.toLowerCase();
      const matchSearch = r.reviewer_name?.toLowerCase().includes(term) ||
                          r.title?.toLowerCase().includes(term) ||
                          r.body?.toLowerCase().includes(term) ||
                          r.product_name?.toLowerCase().includes(term);

      return matchRating && matchStatus && matchSearch;
    });
  }, [reviews, filterRating, filterStatus, searchQuery]);

  // Approve review
  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Approved', 'Customer review is now visible on product pages.');
        onRefresh();
      } else {
        showToast('error', 'Action Denied', data.error || 'Could not approve review.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to submit approval transaction.');
    }
  };

  // Delete review
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Purged', 'The customer review has been permanently removed.');
        onRefresh();
      } else {
        showToast('error', 'Action Denied', data.error || 'Could not delete review.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to delete review.');
    }
  };

  // Merchant Reply Submit
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    if (!replyText.trim()) {
      showToast('error', 'Response Empty', 'Please enter a reply message.');
      return;
    }
    setSubmittingReply(true);

    try {
      // Save response using the dedicated PATCH route
      const res = await fetch(`/api/admin/reviews/${selectedReview.id}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          reply: replyText.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Reply Saved', 'Merchant response logged in database.');
        setSelectedReview(null);
        setReplyText('');
        onRefresh();
      } else {
        showToast('error', 'Failed to Save', data.error || 'DB transaction failed.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not save merchant reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const openReplyDrawer = (rev: Review) => {
    setSelectedReview(rev);
    setReplyText(rev.merchant_reply || '');
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-3xl font-light text-neutral-900 font-display italic">Customer Reviews Moderation</h1>
          <p className="text-xs text-neutral-500">Approve customer feedback, rating submissions and draft merchant replies</p>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex flex-wrap items-center gap-3 flex-grow max-w-lg">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                <Star className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reviewer, product, title details..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Stars:</span>
              <select
                value={filterRating}
                onChange={e => setFilterRating(Number(e.target.value))}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="0">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                <option value="3">⭐⭐⭐ 3 Stars</option>
                <option value="2">⭐⭐ 2 Stars</option>
                <option value="1">⭐ 1 Star</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate review cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Average Rating</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-base font-bold font-mono text-neutral-900">{stats.avg}</span>
            <div className="flex text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          <span className="text-[7px] text-neutral-500 font-semibold mt-1 block">Out of 5 Stars</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Total reviews</span>
          <span className="block text-base font-bold font-mono text-neutral-900 mt-1">{stats.total} entries</span>
          <span className="text-[7px] text-neutral-700 font-semibold mt-1 block">Store overall feedback</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Pending approval</span>
          <span className="block text-base font-bold font-mono text-amber-500 mt-1">{stats.pending} items</span>
          <span className="text-[7px] text-amber-500/80 font-bold uppercase mt-1 block">Requires review moderation</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Approved reviews</span>
          <span className="block text-base font-bold font-mono text-emerald-700 mt-1">{stats.approved} items</span>
          <span className="text-[7px] text-emerald-500 font-bold uppercase mt-1 block">Live on storefront</span>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-md">
        {filteredReviews.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 m-4 rounded-xl">
            No customer reviews match your active filters.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredReviews.map(rev => (
              <div key={rev.id} className="p-5 flex flex-col md:flex-row gap-6 hover:bg-neutral-50/20 transition-colors">
                {/* Rating and reviewer column */}
                <div className="md:w-56 shrink-0 space-y-1.5">
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-neutral-700'}`} />
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 leading-tight">{rev.reviewer_name}</h4>
                    <span className="text-[9px] text-neutral-500 block">{new Date(rev.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider block font-bold">Product:</span>
                    <span className="text-[10px] text-neutral-500 font-semibold line-clamp-1">{rev.product_name}</span>
                  </div>
                  <div>
                    {rev.approved ? (
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded text-[8px] font-bold uppercase tracking-wider">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[8px] font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Body review details and merchant response */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">{rev.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mt-1 italic font-light">"{rev.body}"</p>
                  </div>
                  
                  {rev.merchant_reply && (
                    <div className="p-3 bg-neutral-50/80 border border-neutral-200/80/50 rounded-xl space-y-1">
                      <span className="block text-[8px] font-bold text-neutral-700 uppercase tracking-wider">Merchant response:</span>
                      <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">"{rev.merchant_reply}"</p>
                    </div>
                  )}

                  {/* Row Actions */}
                  <div className="flex gap-4 pt-1">
                    {!rev.approved && (
                      <button
                        onClick={() => handleApprove(rev.id)}
                        className="px-2.5 py-1.5 bg-emerald-500 text-neutral-900 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve review
                      </button>
                    )}
                    <button
                      onClick={() => openReplyDrawer(rev)}
                      className="px-2.5 py-1.5 border border-neutral-200 text-neutral-900 font-semibold rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1 hover:bg-neutral-200 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {rev.merchant_reply ? 'Edit response' : 'Submit reply'}
                    </button>
                    <button
                      onClick={() => handleDelete(rev.id)}
                      className="px-2.5 py-1.5 border border-rose-950/20 text-rose-500 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1 hover:bg-rose-500 hover:text-neutral-900 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRAWER: Merchant Reply Side Drawer */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedReview(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="w-full max-w-lg bg-white border-l border-neutral-200/80 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Merchant Response Console</h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Review snippet card */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: selectedReview.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <h4 className="text-[10px] font-bold text-neutral-900 uppercase">{selectedReview.title}</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed italic">"{selectedReview.body}"</p>
                <span className="block text-[8px] text-neutral-500 font-mono">- By {selectedReview.reviewer_name} on {selectedReview.product_name}</span>
              </div>

              {/* Response Form */}
              <form onSubmit={handleReplySubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Official Merchant Reply Message</label>
                  <textarea
                    required
                    rows={6}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type official store reply to customer review..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-900 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-neutral-900 font-bold rounded-xl text-xs uppercase tracking-widest transition-all mt-4"
                >
                  {submittingReply ? 'Saving response...' : 'Save reply & publish'}
                </button>
              </form>
            </div>

            <button
              onClick={() => setSelectedReview(null)}
              className="w-full mt-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs uppercase"
            >
              Cancel response
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
