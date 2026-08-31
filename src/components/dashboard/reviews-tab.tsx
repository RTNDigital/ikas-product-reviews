'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiRequests } from '@/lib/api-requests';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ReviewCard } from './review-card';
import type { Pagination, Review, ReviewStatus } from './types';
import { Loader2, ChevronLeft, ChevronRight, Check, X, Trash2 } from 'lucide-react';

interface ReviewsTabProps {
  token: string;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'published', label: 'Yayında' },
  { value: 'rejected', label: 'Reddedilen' },
];

export function ReviewsTab({ token }: ReviewsTabProps) {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiRequests.ikas.getReviews(token, {
        page,
        limit: 10,
        ...(status !== 'all' ? { status } : {}),
      });
      const body = res.data as unknown as { data: Review[]; pagination: Pagination };
      if (res.status === 200 && body?.data) {
        setReviews(body.data);
        setPagination(body.pagination);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [status, page]);

  const handleStatusTabChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(reviews.map((r) => r.id)) : new Set());
  };

  const handleStatusChange = async (id: string, newStatus: ReviewStatus) => {
    try {
      await ApiRequests.ikas.updateReviewStatus(token, { reviewIds: [id], status: newStatus });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    try {
      await ApiRequests.ikas.deleteReview(token, id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleReplied = (id: string, reply: string) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, merchantReply: reply, merchantReplyAt: new Date().toISOString() } : r)));
  };

  const handleBulkStatus = async (newStatus: ReviewStatus) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await ApiRequests.ikas.updateReviewStatus(token, { reviewIds: Array.from(selectedIds), status: newStatus });
      await fetchReviews();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error updating reviews in bulk:', error);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} yorumu silmek istediğinizden emin misiniz?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => ApiRequests.ikas.deleteReview(token, id)));
      await fetchReviews();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting reviews in bulk:', error);
    } finally {
      setBulkBusy(false);
    }
  };

  const allSelected = reviews.length > 0 && selectedIds.size === reviews.length;

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={handleStatusTabChange}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleSelectAll(v === true)} />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} yorum seçildi` : 'Tümünü seç'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkStatus('published')}>
                <Check className="size-3.5" />
                Yayınla
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkStatus('rejected')}>
                <X className="size-3.5" />
                Reddet
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} className="text-destructive hover:text-destructive" onClick={handleBulkDelete}>
                <Trash2 className="size-3.5" />
                Sil
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Bu filtrede yorum bulunamadı.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              token={token}
              review={review}
              selected={selectedIds.has(review.id)}
              onSelectChange={(checked) => toggleSelect(review.id, checked)}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onReplied={handleReplied}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="size-4" />
            Önceki
          </Button>
          <span className="text-sm text-muted-foreground">
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={!pagination.hasMore} onClick={() => setPage((p) => p + 1)}>
            Sonraki
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
