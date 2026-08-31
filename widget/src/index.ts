// Product Reviews Widget — storefront entry point.
// Loaded via: <script src="https://app-url/reviews-widget.js?mid=MERCHANT_ID" defer></script>

import { lookupProductId } from './api';
import { renderReviewsWidget } from './reviews-widget';
import { renderStarRatings } from './star-rating-widget';

(function () {
  if ((window as unknown as { __pr_widget_loaded?: boolean }).__pr_widget_loaded) return;
  (window as unknown as { __pr_widget_loaded?: boolean }).__pr_widget_loaded = true;

  const scriptEl = document.currentScript as HTMLScriptElement | null;
  if (!scriptEl) return;

  const scriptUrl = new URL(scriptEl.src);
  const merchantId = scriptUrl.searchParams.get('mid');
  if (!merchantId) return;

  const baseUrl = scriptUrl.origin;

  async function detectProductId(): Promise<string | null> {
    // Strategy 1: URL path parsing (/urun/slug)
    const pathMatch = window.location.pathname.match(/\/urun\/([^/?]+)/);
    if (pathMatch) {
      const slug = pathMatch[1];
      const result = await lookupProductId(baseUrl, merchantId!, slug);
      if (result) return result;
    }

    // Strategy 2: DOM data attribute
    const el = document.querySelector('[data-product-id]');
    if (el) return el.getAttribute('data-product-id');

    // Strategy 3: Meta tags
    const meta = document.querySelector('meta[property="product:retailer_item_id"]');
    if (meta) return meta.getAttribute('content');

    return null;
  }

  async function init() {
    const productId = await detectProductId();

    if (productId) {
      // Product page → render Reviews List widget
      renderReviewsWidget(baseUrl, merchantId!, productId);
    }

    // All pages → render Star Rating badges on product cards
    renderStarRatings(baseUrl, merchantId!);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
