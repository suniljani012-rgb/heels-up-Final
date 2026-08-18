import React, { useState, useMemo } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Star, MessageSquare, Check, Trash2, X, Filter, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

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

  return (
    <div className="space-y-2.5 antialiased">
      {/* Unified Compact Control Bar */}
      <Card className="p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5 mr-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Reviews</span>
            <span className="px-1.5 py-0 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {stats.avg} ★ ({stats.total})
            </span>
          </div>

          <div className="relative flex-1 max-w-xs min-w-[180px]">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer, product..."
              className="h-7 text-xs"
            />
          </div>

          {/* Star Filter */}
          <div className="flex items-center gap-0.5">
            {[0, 5, 4, 3, 2, 1].map((r) => (
              <Button
                key={r}
                size="sm"
                variant={filterRating === r ? 'default' : 'outline'}
                onClick={() => setFilterRating(r)}
                className={`h-6 text-[10px] px-1.5 font-bold ${
                  filterRating === r ? 'bg-slate-900 text-white dark:bg-indigo-600' : ''
                }`}
              >
                {r === 0 ? 'All' : `${r}★`}
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-7 text-xs px-2 font-medium shrink-0"
        >
          Refresh
        </Button>
      </Card>

      {/* Aggregate Score KPI Cards - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg Score
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {stats.avg}
            </span>
            <span className="text-[10px] text-slate-400">/ 5.0</span>
          </div>
        </Card>

        <Card className="p-2.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Reviews
          </span>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {stats.total}
          </span>
        </Card>

        <Card className="p-2.5">
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending Queue
          </span>
          <span className="text-base font-bold font-mono text-amber-600 mt-0.5 block">
            {stats.pending}
          </span>
        </Card>

        <Card className="p-2.5">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
            Live on Store
          </span>
          <span className="text-base font-bold font-mono text-emerald-600 mt-0.5 block">
            {stats.approved}
          </span>
        </Card>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {filteredReviews.map((rev) => (
          <Card key={rev.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-[260px]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? 'fill-amber-500' : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">{rev.title}</h4>
                  <Badge variant={rev.approved ? 'success' : 'warning'}>
                    {rev.approved ? 'Approved' : 'Pending Moderation'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rev.body}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {rev.reviewer_name}
                  </span>
                  <span>•</span>
                  <span>{rev.product_name}</span>
                  <span>•</span>
                  <span className="font-mono">{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!rev.approved && (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(rev.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReview(rev);
                    setReplyText(rev.merchant_reply || '');
                  }}
                  className="text-xs font-semibold h-8"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Reply
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(rev.id)}
                  title="Delete Review"
                  className="text-slate-400 hover:text-rose-600 h-8 w-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Merchant Reply Box */}
            {rev.merchant_reply && (
              <div className="mt-3.5 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                  Official Merchant Reply
                </span>
                <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  {rev.merchant_reply}
                </p>
              </div>
            )}
          </Card>
        ))}

        {filteredReviews.length === 0 && (
          <Card className="p-16 text-center text-slate-400 italic">
            No customer reviews found matching filter criteria.
          </Card>
        )}
      </div>

      {/* Slide-over Drawer for Merchant Response */}
      <Sheet open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        {selectedReview && (
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Respond to Review</SheetTitle>
              <SheetDescription>
                Public response from official merchant account to {selectedReview.reviewer_name}
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleReplySubmit} className="space-y-4 my-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <span className="font-bold font-mono">{selectedReview.rating}★</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedReview.title}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  "{selectedReview.body}"
                </p>
              </div>

              <div>
                <Label className="mb-1">Merchant Response Body</Label>
                <Textarea
                  rows={5}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank you for your feedback! We are thrilled to hear that..."
                />
              </div>

              <Button
                type="submit"
                disabled={submittingReply}
                className="w-full py-2.5 font-bold text-xs"
              >
                {submittingReply ? 'Publishing Reply...' : 'Save & Publish Response'}
              </Button>
            </form>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
