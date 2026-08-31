import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarDisplayProps {
  rating: number;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Read-only star rating display. Renders 5 stars, filling as many as `rating`
 * (rounded to the nearest whole star).
 */
export function StarDisplay({ rating, size = 16, color = '#FFB800', className }: StarDisplayProps) {
  const rounded = Math.round(rating);

  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} / 5 yıldız`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < rounded;
        return (
          <Star
            key={i}
            size={size}
            style={{ color: filled ? color : undefined }}
            className={cn(!filled && 'text-muted-foreground/30')}
            fill={filled ? color : 'none'}
            strokeWidth={filled ? 0 : 1.5}
          />
        );
      })}
    </div>
  );
}
