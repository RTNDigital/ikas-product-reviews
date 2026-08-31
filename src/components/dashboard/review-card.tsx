'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarDisplay } from './star-display';
import { ReviewReplyForm } from './review-reply-form';
import type { Review, ReviewStatus } from './types';
import { BadgeCheck, ChevronDown, ChevronUp, Check, X, Trash2 } from 'lucide-react';

interface ReviewCardProps {
  token: string;
  review: Review;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  onStatusChange: (id: string, status: ReviewStatus) => void;
  onDelete: (id: string) => void;
  onReplied: (id: string, reply: string) => void;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Bekliyor',
  published: 'Yayında',
  rejected: 'Reddedildi',
};

const STATUS_VARIANT: Record<ReviewStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  published: 'default',
  rejected: 'destructive',
};

function formatDateTR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ReviewCard({ token, review, selected, onSelectChange, onStatusChange, onDelete, onReplied }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const bodyPreview = review.body.length > 160 && !expanded ? `${review.body.slice(0, 160)}…` : review.body;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={(v) => onSelectChange(v === true)} className="mt-1" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{review.customerName}</span>
            {review.isVerifiedPurchase && (
              <Badge variant="secondary" className="gap-1 text-emerald-700 dark:text-emerald-400">
                <BadgeCheck className="size-3" />
                Doğrulanmış Alışveriş
              </Badge>
            )}
            <Badge variant={STATUS_VARIANT[review.status]}>{STATUS_LABEL[review.status]}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">{formatDateTR(review.createdAt)}</span>
          </div>

          <StarDisplay rating={review.rating} />

          {review.title && <p className="font-medium">{review.title}</p>}
          <p className="text-sm text-muted-foreground whitespace-pre-line">{bodyPreview}</p>

          {review.body.length > 160 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  Daralt <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  Devamını gör <ChevronDown className="size-3" />
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {review.productImage && (
              <Image
                src={review.productImage}
                alt={review.productName}
                width={24}
                height={24}
                className="size-6 shrink-0 rounded object-cover"
                unoptimized
              />
            )}
            <span className="truncate">{review.productName}</span>
          </div>

          {review.media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {review.media.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                  <Image
                    src={m.thumbnailUrl || m.url}
                    alt="Yorum fotoğrafı"
                    width={56}
                    height={56}
                    className="size-14 rounded-md border object-cover"
                    unoptimized
                  />
                </a>
              ))}
            </div>
          )}

          {expanded && (
            <div className="space-y-2 pt-1">
              {review.merchantReply && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Mağaza yanıtı</p>
                  <p>{review.merchantReply}</p>
                </div>
              )}
              <ReviewReplyForm
                token={token}
                reviewId={review.id}
                existingReply={review.merchantReply}
                onReplied={(reply) => onReplied(review.id, reply)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {review.status !== 'published' && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange(review.id, 'published')}>
                <Check className="size-3.5" />
                Yayınla
              </Button>
            )}
            {review.status !== 'rejected' && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange(review.id, 'rejected')}>
                <X className="size-3.5" />
                Reddet
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(review.id)}>
              <Trash2 className="size-3.5" />
              Sil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
