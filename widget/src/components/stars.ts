// Star icon rendering (read-only ratings + interactive rating input).

import { uniqueId } from '../utils';

const STAR_PATH =
  'M12 2.5l2.94 6.06 6.68.9-4.86 4.67 1.19 6.64L12 17.6l-5.95 3.17 1.19-6.64L2.38 9.46l6.68-.9L12 2.5z';

function starSVG(fillId: string, fillPercent: number, size: number): string {
  // fillPercent: 0-100. Uses a linear gradient clipped to the star shape.
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
      <defs>
        <linearGradient id="${fillId}">
          <stop offset="${fillPercent}%" stop-color="var(--pr-star-color, #ffb800)"></stop>
          <stop offset="${fillPercent}%" stop-color="var(--pr-star-empty, #d1d5db)"></stop>
        </linearGradient>
      </defs>
      <path d="${STAR_PATH}" fill="url(#${fillId})"></path>
    </svg>
  `;
}

export interface StaticStarsOptions {
  size?: number;
  starColor?: string;
}

/**
 * Returns an HTML string rendering `rating` (0-5, may be fractional) as five stars
 * with proportional fill (handles half/partial stars smoothly).
 */
export function renderStaticStarsHTML(rating: number, options: StaticStarsOptions = {}): string {
  const size = options.size ?? 16;
  const clamped = Math.max(0, Math.min(5, rating));
  const styleAttr = options.starColor ? ` style="--pr-star-color:${options.starColor}"` : '';

  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    const remainder = clamped - i;
    const fillPercent = Math.round(Math.max(0, Math.min(1, remainder)) * 100);
    const fillId = uniqueId('pr-star-fill');
    stars.push(starSVG(fillId, fillPercent, size));
  }

  return `<span class="pr-stars"${styleAttr}>${stars.join('')}</span>`;
}

/**
 * Renders an interactive 1-5 star input (used in the "write a review" modal).
 * Appends the control to `container` and returns a getter for the current value.
 */
export function renderInteractiveStars(
  container: HTMLElement,
  initialRating: number,
  onChange: (rating: number) => void,
  starColor?: string,
): { getValue: () => number } {
  let value = initialRating;
  const wrap = document.createElement('div');
  wrap.className = 'pr-star-input';
  if (starColor) wrap.style.setProperty('--pr-star-color', starColor);

  const buttons: HTMLButtonElement[] = [];

  function paint(previewValue: number) {
    buttons.forEach((btn, idx) => {
      const filled = idx < previewValue;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="${STAR_PATH}" fill="${filled ? 'var(--pr-star-color, #ffb800)' : 'var(--pr-star-empty, #d1d5db)'}"></path>
        </svg>
      `;
    });
  }

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `${i} yıldız`);
    btn.addEventListener('mouseenter', () => paint(i));
    btn.addEventListener('mouseleave', () => paint(value));
    btn.addEventListener('click', () => {
      value = i;
      paint(value);
      onChange(value);
    });
    buttons.push(btn);
    wrap.appendChild(btn);
  }

  paint(value);
  container.appendChild(wrap);

  return { getValue: () => value };
}
