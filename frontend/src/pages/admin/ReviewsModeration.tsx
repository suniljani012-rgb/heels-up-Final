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
  const [activeTab, setActiveTab] = useState<'website' | 'google'>('website');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Google Reviews State
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [loadingGoogleReviews, setLoadingGoogleReviews] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'form' | 'json'>('form');
  const [importJsonText, setImportJsonText] = useState('');
  const [importing, setImporting] = useState(false);

  // Single Review Form State
  const [singleForm, setSingleForm] = useState({
    author_name: '',
    rating: 5,
    review_text: '',
    relative_time_description: 'Recently',
    merchant_reply: ''
  });

  // Single Review Submit Handler
  const handleSingleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.author_name.trim() || !singleForm.review_text.trim()) {
      showToast('error', 'Required Fields Missing', 'Please enter author name and review text.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/reviews/google/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ reviews: [singleForm] })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Google Review Added! 🎉', 'Review saved into database and published live.');
        setImportModalOpen(false);
        setSingleForm({
          author_name: '',
          rating: 5,
          review_text: '',
          relative_time_description: 'Recently',
          merchant_reply: ''
        });
        fetchGoogleReviews();
      } else {
        showToast('error', 'Failed to Add', data.error || 'Database error.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to save Google review.');
    } finally {
      setImporting(false);
    }
  };

  // Merchant response
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Fetch Google Reviews for Admin
  const fetchGoogleReviews = React.useCallback(async () => {
    setLoadingGoogleReviews(true);
    try {
      const res = await fetch('/api/reviews/google');
      const data = await res.json();
      if (data.success && data.data) {
        setGoogleReviews(data.data.reviews || []);
      }
    } catch {
      console.error('Failed to fetch google reviews');
    } finally {
      setLoadingGoogleReviews(false);
    }
  }, []);

  React.useEffect(() => {
    fetchGoogleReviews();
  }, [fetchGoogleReviews]);

  // Bulk Import Google Reviews Handler
  const handleBulkImportGoogleReviews = async () => {
    if (!importJsonText.trim()) {
      showToast('error', 'Empty Input', 'Please paste valid JSON or text for Google Reviews.');
      return;
    }
    setImporting(true);
    try {
      let parsed = [];
      try {
        parsed = JSON.parse(importJsonText);
        if (!Array.isArray(parsed)) {
          if (parsed.reviews && Array.isArray(parsed.reviews)) {
            parsed = parsed.reviews;
          } else {
            parsed = [parsed];
          }
        }
      } catch {
        showToast('error', 'Invalid JSON', 'Please format input as valid JSON array of reviews.');
        setImporting(false);
        return;
      }

      const res = await fetch('/api/reviews/google/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ reviews: parsed })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Import Successful!', data.message || `Imported ${parsed.length} Google reviews into database.`);
        setImportModalOpen(false);
        setImportJsonText('');
        fetchGoogleReviews();
      } else {
        showToast('error', 'Import Failed', data.error || 'Could not import reviews.');
      }
    } catch (e: any) {
      showToast('error', 'Connection Failure', e.message || 'Import error.');
    } finally {
      setImporting(false);
    }
  };

  // Delete Google Review Handler
  const handleDeleteGoogleReview = async (id: number) => {
    if (!window.confirm('Delete this Google review permanently from database?')) return;
    try {
      const res = await fetch(`/api/reviews/google/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Google Review Removed', 'Review deleted from database.');
        fetchGoogleReviews();
      } else {
        showToast('error', 'Delete Failed', data.error || 'Could not delete review.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Error deleting review.');
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-neutral-900 font-display italic">Customer Reviews Moderation</h1>
            <p className="text-xs text-neutral-500">Manage storefront reviews & sync Google Maps / Business Profile ratings</p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-2 bg-white border border-neutral-200 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab('website')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'website'
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Website Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('google')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'google'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google Reviews ({googleReviews.length})
            </button>
          </div>
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

      {activeTab === 'google' ? (
        <div className="space-y-6">
          {/* Google Reviews Banner & Actions */}
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Google Business Reviews Database</h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Showing {googleReviews.length} reviews synced from Google Maps profile
                </p>
              </div>
            </div>

            <button
              onClick={() => setImportModalOpen(true)}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
            >
              + Bulk Import Google Reviews (JSON)
            </button>
          </div>

          {/* Google Reviews Table / List */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-md">
            {loadingGoogleReviews ? (
              <div className="py-16 text-center text-xs text-neutral-500">Loading Google Reviews...</div>
            ) : googleReviews.length === 0 ? (
              <div className="py-20 text-center text-xs text-neutral-500 m-4 border border-dashed border-neutral-200 rounded-xl">
                No Google reviews currently in database. Click "Bulk Import Google Reviews" to add.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {googleReviews.map((gRev: any) => (
                  <div key={gRev.id} className="p-5 flex flex-col md:flex-row items-start justify-between gap-4 hover:bg-neutral-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <img
                        src={gRev.author_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(gRev.author_name)}`}
                        alt={gRev.author_name}
                        className="w-10 h-10 rounded-full border border-gray-200 object-cover shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-900">{gRev.author_name}</h4>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-bold border border-blue-100 flex items-center gap-1">
                            Google Review
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-500 my-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < gRev.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'}`} />
                          ))}
                          <span className="text-[10px] text-neutral-400 font-medium ml-2">
                            {gRev.relative_time_description || gRev.review_date}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-700 leading-relaxed italic mt-1 font-light">
                          "{gRev.review_text}"
                        </p>

                        {gRev.merchant_reply && (
                          <div className="mt-2 p-2.5 bg-neutral-100 rounded-lg text-[11px]">
                            <span className="font-bold text-neutral-900 block">Owner Reply:</span>
                            <p className="text-neutral-600 italic">{gRev.merchant_reply}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGoogleReview(gRev.id)}
                      className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
      </>
      )}

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

      {/* MODAL: Add Google Review (Easy Form & Smart Import) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setImportModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Add Google Review to Database</h3>
                <p className="text-xs text-neutral-500">Add a new review using simple form fields or bulk text paste</p>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setImportMode('form')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  importMode === 'form' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ✏️ Simple Form Input
              </button>
              <button
                type="button"
                onClick={() => setImportMode('json')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  importMode === 'json' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                📋 Bulk JSON / Text Paste
              </button>
            </div>

            {importMode === 'form' ? (
              /* SIMPLE FORM INPUT */
              <form onSubmit={handleSingleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Customer / Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    value={singleForm.author_name}
                    onChange={e => setSingleForm({ ...singleForm, author_name: e.target.value })}
                    placeholder="e.g. Pooja Sharma"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Star Rating *</label>
                    <select
                      value={singleForm.rating}
                      onChange={e => setSingleForm({ ...singleForm, rating: Number(e.target.value) })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                      <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                      <option value="3">⭐⭐⭐ 3 Stars</option>
                      <option value="2">⭐⭐ 2 Stars</option>
                      <option value="1">⭐ 1 Star</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Review Time / Date</label>
                    <input
                      type="text"
                      value={singleForm.relative_time_description}
                      onChange={e => setSingleForm({ ...singleForm, relative_time_description: e.target.value })}
                      placeholder="e.g. 2 days ago or 1 month ago"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Review Message / Comment *</label>
                  <textarea
                    required
                    rows={4}
                    value={singleForm.review_text}
                    onChange={e => setSingleForm({ ...singleForm, review_text: e.target.value })}
                    placeholder="Copy-paste customer review text from Google..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Shop Owner Response (Optional)</label>
                  <input
                    type="text"
                    value={singleForm.merchant_reply}
                    onChange={e => setSingleForm({ ...singleForm, merchant_reply: e.target.value })}
                    placeholder="e.g. Thank you Pooja! Visit us again."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                  >
                    {importing ? 'Saving to Database...' : '+ Save Google Review to Database'}
                  </button>
                </div>
              </form>
            ) : (
              /* BULK JSON / SMART TEXT IMPORT */
              <div className="space-y-4">
                <p className="text-xs text-neutral-600">
                  Paste JSON array or multiple review entries. Example:
                </p>
                <pre className="p-3 bg-slate-900 text-emerald-400 text-[10px] rounded-xl font-mono overflow-x-auto">
{`[
  {
    "author_name": "Ramesh Kumar",
    "rating": 5,
    "review_text": "Great shoes and awesome service in Jodhpur!",
    "relative_time_description": "1 week ago"
  }
]`}
                </pre>

                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={e => setImportJsonText(e.target.value)}
                  placeholder="Paste JSON here..."
                  className="w-full font-mono text-xs p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500"
                />

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImportGoogleReviews}
                    disabled={importing}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                  >
                    {importing ? 'Importing into DB...' : 'Save & Import to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
