import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Star, MessageSquare, Check, Trash2, X, Filter, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

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
    const pending = reviews.filter((r) => !r.approved).length;
    return {
      avg: parseFloat((sum / reviews.length).toFixed(1)),
      pending,
      approved: reviews.length - pending,
      total: reviews.length,
    };
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchRating = filterRating ? r.rating === filterRating : true;
      const matchStatus =
        filterStatus === 'all' ? true : filterStatus === 'approved' ? r.approved : !r.approved;

      const term = searchQuery.toLowerCase();
      const matchSearch =
        r.reviewer_name?.toLowerCase().includes(term) ||
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
          Authorization: `Bearer ${localStorage.getItem('heelsup_token')}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Approved', 'Review is now visible on product pages.');
        onRefresh();
      } else {
        showToast('error', 'Action Denied', data.error || 'Could not approve review.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to submit approval.');
    }
  };

  // Delete review
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('heelsup_token')}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Review Purged', 'Review removed permanently.');
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
      const res = await fetch(`/api/admin/reviews/${selectedReview.id}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('heelsup_token')}`,
        },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Reply Saved', 'Merchant response logged.');
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
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Customer Reviews Moderation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Moderate incoming ratings, verify product feedback, and draft official brand responses
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Total Reviews: {stats.total}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Average Rating
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{stats.avg}</span>
            <div className="flex text-amber-400">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Storewide score (out of 5.0)</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Reviews
          </span>
          <span className="block text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {stats.total}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Submitted customer entries</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Pending Approval
          </span>
          <span className="block text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {stats.pending}
          </span>
          <span className="text-[10px] text-amber-600/80 font-semibold mt-0.5 block">Requires moderation</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Approved & Live
          </span>
          <span className="block text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.approved}
          </span>
          <span className="text-[10px] text-emerald-600/80 font-semibold mt-0.5 block">Live on storefront</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Star className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer name, product, feedback text..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Rating:</span>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
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
            <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Reviews</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredReviews.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 italic">
            No customer reviews match your active filter settings.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 flex flex-col md:flex-row gap-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Rating & Reviewer info */}
                <div className="md:w-56 shrink-0 space-y-1.5">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rev.reviewer_name}</h4>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(rev.created_at || Date.now()).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                      Product:
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold line-clamp-1">
                      {rev.product_name}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        rev.approved
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                      }`}
                    >
                      {rev.approved ? 'Live Approved' : 'Pending Moderation'}
                    </span>
                  </div>
                </div>

                {/* Body review details and merchant response */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {rev.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 italic">
                      "{rev.body}"
                    </p>
                  </div>

                  {rev.merchant_reply && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1">
                      <span className="block text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Official Store Reply:
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        "{rev.merchant_reply}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {!rev.approved && (
                      <button
                        onClick={() => handleApprove(rev.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Review
                      </button>
                    )}
                    <button
                      onClick={() => openReplyDrawer(rev)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />{' '}
                      {rev.merchant_reply ? 'Edit Response' : 'Reply'}
                    </button>
                    <button
                      onClick={() => handleDelete(rev.id)}
                      className="px-3 py-1.5 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors ml-auto"
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

      {/* Slide-over Reply Drawer */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setSelectedReview(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Merchant Response Console
                </h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Review snippet card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2">
                <div className="flex text-amber-400">
                  {Array.from({ length: selectedReview.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                  {selectedReview.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  "{selectedReview.body}"
                </p>
                <span className="block text-[10px] text-slate-400 font-mono">
                  — By {selectedReview.reviewer_name} on {selectedReview.product_name}
                </span>
              </div>

              {/* Response Form */}
              <form onSubmit={handleReplySubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Official Store Response Message
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official store reply to customer review..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs"
                >
                  {submittingReply ? 'Saving Response...' : 'Save & Publish Reply'}
                </button>
              </form>
            </div>

            <button
              onClick={() => setSelectedReview(null)}
              className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs uppercase transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
