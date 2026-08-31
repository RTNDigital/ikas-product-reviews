'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}

export function StarInput({ value, onChange, size = 36, color = '#FFB800', disabled }: StarInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div
      className={cn('flex items-center gap-1', disabled && 'pointer-events-none opacity-60')}
      role="radiogroup"
      aria-label="Puanınız"
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= displayValue;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} yıldız`}
            onMouseEnter={() => setHoverValue(star)}
            onFocus={() => setHoverValue(star)}
            onBlur={() => setHoverValue(null)}
            onClick={() => onChange(star)}
            className="cursor-pointer rounded-sm transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? color : 'none'}
              stroke={filled ? color : '#D1D5DB'}
              strokeWidth={1.5}
              strokeLinejoin="round"
              className="transition-colors"
            >
              <path d="M12 2.5l2.9 6.06 6.6.87-4.83 4.63 1.2 6.6L12 17.4l-5.87 3.26 1.2-6.6-4.83-4.63 6.6-.87L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
