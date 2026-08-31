// Renders small star-rating badges on product cards (collection / listing pages).

import { fetchBatchRatings, RatingsWidgetSettings } from './api';
import { baseResetCSS, starsCSS, starRatingBadgeCSS } from './styles';
import { renderStaticStarsHTML } from './components/stars';
import { formatCount } from './utils';

const CARD_SELECTORS = [
  '[data-product-id]',
  '.product-card',
  '.product-item',
  '.product-list-item',
  '[data-testid="product-card"]',
];

const PROCESSED_ATTR = 'data-pr-processed';
const BATCH_DEBOUNCE_MS = 150;
const MAX_BATCH = 100;

function findProductCards(root: ParentNode): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  for (const selector of CARD_SELECTORS) {
    root.querySelectorAll(selector).forEach((el) => seen.add(el as HTMLElement));
  }
  return Array.from(seen);
}

function extractProductId(card: HTMLElement): string | null {
  const direct = card.getAttribute('data-product-id');
  if (direct) return direct;
  const inner = card.querySelector('[data-product-id]');
  if (inner) return inner.getAttribute('data-product-id');
  return null;
}

function insertBadgeHost(card: HTMLElement, badgeHost: HTMLElement) {
  // Try to insert near a title/price element for a natural placement; fall back to appending.
  const anchor = card.querySelector('[class*="title"], [class*="name"], [class*="price"]') || null;
  if (anchor && anchor.parentElement) {
    anchor.parentElement.insertBefore(badgeHost, anchor.nextSibling);
  } else {
    card.appendChild(badgeHost);
  }
}

function insertBadge(card: HTMLElement, average: number, count: number, settings: RatingsWidgetSettings) {
  const badgeHost = document.createElement('span');
  badgeHost.className = 'pr-rating-badge-host';
  badgeHost.style.display = 'inline-block';
  const shadow = badgeHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = baseResetCSS() + starsCSS() + starRatingBadgeCSS();
  shadow.appendChild(style);

  const badge = document.createElement('span');
  badge.className = 'pr-badge';
  if (settings.starColor) badge.style.setProperty('--pr-star-color', settings.starColor);

  const starsHTML = renderStaticStarsHTML(average, { size: 13, starColor: settings.starColor });
  badge.innerHTML = `
    <span class="pr-badge-stars">${starsHTML}</span>
    <span class="pr-badge-count">(${formatCount(count)})</span>
  `;
  shadow.appendChild(badge);
  insertBadgeHost(card, badgeHost);
}

function insertEmptyBadge(card: HTMLElement, settings: RatingsWidgetSettings) {
  if (settings.emptyStarBehavior === 'hide') return;

  const badgeHost = document.createElement('span');
  badgeHost.className = 'pr-rating-badge-host';
  const shadow = badgeHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = baseResetCSS() + starsCSS() + starRatingBadgeCSS();
  shadow.appendChild(style);

  const badge = document.createElement('span');
  badge.className = 'pr-badge';
  badge.innerHTML = `<span class="pr-badge-empty-text">Henüz değerlendirme yok</span>`;
  shadow.appendChild(badge);
  insertBadgeHost(card, badgeHost);
}

export async function renderStarRatings(baseUrl: string, merchantId: string): Promise<void> {
  const pendingCards = new Map<string, HTMLElement[]>(); // productId -> card elements queued for this batch
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function flushBatch() {
    if (pendingCards.size === 0) return;
    const productIds = Array.from(pendingCards.keys()).slice(0, MAX_BATCH);
    const batch = new Map<string, HTMLElement[]>();
    for (const id of productIds) {
      const cards = pendingCards.get(id);
      if (cards) batch.set(id, cards);
      pendingCards.delete(id);
    }

    const { ratings, settings } = await fetchBatchRatings(baseUrl, merchantId, productIds);

    for (const [productId, cards] of batch.entries()) {
      const rating = ratings[productId];
      for (const card of cards) {
        if (rating) {
          insertBadge(card, rating.average, rating.count, settings);
        } else {
          insertEmptyBadge(card, settings);
        }
      }
    }
  }

  function scheduleFlush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushBatch, BATCH_DEBOUNCE_MS);
  }

  function queueCard(card: HTMLElement, productId: string) {
    const existing = pendingCards.get(productId);
    if (existing) {
      existing.push(card);
    } else {
      pendingCards.set(productId, [card]);
    }
    scheduleFlush();
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target as HTMLElement;
        observer.unobserve(card);
        const productId = extractProductId(card);
        card.setAttribute(PROCESSED_ATTR, '1');
        if (productId) queueCard(card, productId);
      });
    },
    { rootMargin: '200px' },
  );

  function scanForCards(root: ParentNode) {
    const cards = findProductCards(root);
    for (const card of cards) {
      if (card.hasAttribute(PROCESSED_ATTR)) continue;
      const productId = extractProductId(card);
      if (!productId) continue;
      card.setAttribute(PROCESSED_ATTR, 'queued');
      observer.observe(card);
    }
  }

  scanForCards(document.body);

  // Watch for dynamically loaded product cards (infinite scroll, SPA route changes, etc.)
  const debouncedScan = (() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => scanForCards(document.body), 250);
    };
  })();

  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        debouncedScan();
        break;
      }
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}
