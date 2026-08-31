// Renders the full Reviews List widget on a product detail page.

import { fetchProductReviews, ReviewsResponse, WidgetReview, ReviewSort } from './api';
import { baseResetCSS, starsCSS, reviewsWidgetCSS, lightboxCSS, modalCSS } from './styles';
import { renderStaticStarsHTML } from './components/stars';
import { renderReviewCard } from './components/review-card';
import { openLightbox } from './components/lightbox';
import { openReviewFormModal } from './components/review-form-modal';
import { formatCount } from './utils';

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'highest', label: 'En Yüksek Puan' },
  { value: 'lowest', label: 'En Düşük Puan' },
  { value: 'photos-first', label: 'Fotoğraflı Yorumlar' },
];

function findInjectionPoint(): HTMLElement | null {
  const explicit = document.querySelector('[data-reviews-target]');
  if (explicit) return explicit as HTMLElement;

  const detail = document.querySelector('.product-detail');
  if (detail) return detail as HTMLElement;

  // Fallback: append near the end of <main>, or at the end of <body>.
  const main = document.querySelector('main');
  if (main) return main as HTMLElement;

  return document.body;
}

export async function renderReviewsWidget(baseUrl: string, merchantId: string, productId: string): Promise<void> {
  const mountPoint = findInjectionPoint();
  if (!mountPoint) return;

  const first = await fetchProductReviews(baseUrl, merchantId, productId, 1);
  if (!first) return; // widget disabled, product has no data, or network error with no cache

  const host = document.createElement('div');
  host.id = 'pr-reviews-widget-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = baseResetCSS() + starsCSS() + reviewsWidgetCSS() + lightboxCSS() + modalCSS();
  shadow.appendChild(style);

  const root = document.createElement('div');
  root.className = 'pr-widget';
  if (first.settings.starColor) {
    root.style.setProperty('--pr-star-color', first.settings.starColor);
  }
  shadow.appendChild(root);

  mountPoint.appendChild(host);

  // ---- state ----
  let state = {
    page: 1,
    sort: (first.settings.defaultSort as ReviewSort) || 'newest',
    ratingFilter: undefined as number | undefined,
    hasPhotos: false,
  };
  let currentData: ReviewsResponse = first;
  let allReviews: WidgetReview[] = [...first.reviews];

  function productMeta() {
    const productLinkEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    return {
      productName: document.title || undefined,
      productHref: productLinkEl?.href || window.location.href,
    };
  }

  function renderHeader(container: HTMLElement) {
    const { summary, settings } = currentData;
    if (!settings.showHeader) return;

    const header = document.createElement('div');
    header.className = 'pr-header';

    const left = document.createElement('div');
    left.className = 'pr-header-left';

    const avgBlock = document.createElement('div');
    avgBlock.className = 'pr-avg-block';
    avgBlock.innerHTML = `
      <div class="pr-avg-number">${summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '—'}</div>
      <div>${renderStaticStarsHTML(summary.averageRating, { size: 16, starColor: settings.starColor })}</div>
      <div class="pr-avg-count">${formatCount(summary.totalReviews)} değerlendirme</div>
    `;
    left.appendChild(avgBlock);

    if (summary.totalReviews > 0) {
      const dist = document.createElement('div');
      dist.className = 'pr-distribution';
      for (let star = 5; star >= 1; star--) {
        const count = currentData.summary.distribution[String(star)] || 0;
        const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'pr-dist-row';
        row.innerHTML = `
          <span class="pr-dist-label">${star} yıldız</span>
          <span class="pr-dist-bar"><span class="pr-dist-bar-fill" style="width:${pct}%"></span></span>
          <span class="pr-dist-count">${formatCount(count)}</span>
        `;
        row.addEventListener('click', () => {
          state.ratingFilter = state.ratingFilter === star ? undefined : star;
          state.page = 1;
          refresh();
        });
        dist.appendChild(row);
      }
      left.appendChild(dist);
    }

    header.appendChild(left);

    const writeBtn = document.createElement('button');
    writeBtn.type = 'button';
    writeBtn.className = 'pr-write-btn';
    writeBtn.textContent = 'Yorum Yaz';
    writeBtn.addEventListener('click', () => {
      const meta = productMeta();
      openReviewFormModal(shadow, {
        baseUrl,
        merchantId,
        productId,
        productName: meta.productName,
        productHref: meta.productHref,
        starColor: settings.starColor,
        onSubmitted: () => {
          // Give the user a moment to read the confirmation, then refresh silently.
        },
      });
    });
    header.appendChild(writeBtn);

    container.appendChild(header);
  }

  function renderFilters(container: HTMLElement) {
    const { settings, summary } = currentData;
    if (!settings.showFilters) return;

    const bar = document.createElement('div');
    bar.className = 'pr-filters';

    if (summary.totalReviews > 0) {
      for (let star = 5; star >= 1; star--) {
        const count = summary.distribution[String(star)] || 0;
        if (count === 0) continue;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'pr-filter-chip' + (state.ratingFilter === star ? ' pr-active' : '');
        chip.textContent = `${star} yıldız (${formatCount(count)})`;
        chip.addEventListener('click', () => {
          state.ratingFilter = state.ratingFilter === star ? undefined : star;
          state.page = 1;
          refresh();
        });
        bar.appendChild(chip);
      }
    }

    const spacer = document.createElement('div');
    spacer.className = 'pr-filter-spacer';
    bar.appendChild(spacer);

    if (settings.showPhotos) {
      const photosLabel = document.createElement('label');
      photosLabel.className = 'pr-photos-toggle';
      const photosCheckbox = document.createElement('input');
      photosCheckbox.type = 'checkbox';
      photosCheckbox.checked = state.hasPhotos;
      photosCheckbox.addEventListener('change', () => {
        state.hasPhotos = photosCheckbox.checked;
        state.page = 1;
        refresh();
      });
      photosLabel.appendChild(photosCheckbox);
      photosLabel.appendChild(document.createTextNode('Sadece fotoğraflı'));
      bar.appendChild(photosLabel);
    }

    const sortSelect = document.createElement('select');
    sortSelect.className = 'pr-sort-select';
    SORT_OPTIONS.forEach((opt) => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (opt.value === state.sort) optionEl.selected = true;
      sortSelect.appendChild(optionEl);
    });
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value as ReviewSort;
      state.page = 1;
      refresh();
    });
    bar.appendChild(sortSelect);

    container.appendChild(bar);
  }

  function renderList(container: HTMLElement, reviews: WidgetReview[]) {
    const list = document.createElement('div');
    list.className = 'pr-list';

    if (reviews.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'pr-empty';
      empty.textContent = 'Henüz bu ürün için yorum yapılmamış. İlk yorumu siz yazın!';
      list.appendChild(empty);
    } else {
      reviews.forEach((review) => {
        const card = renderReviewCard(review, currentData.settings, {
          onPhotoClick: (photos, index) => openLightbox(shadow, photos, index),
        });
        list.appendChild(card);
      });
    }

    container.appendChild(list);
  }

  function renderLoadMore(container: HTMLElement) {
    if (!currentData.pagination.hasMore) return;
    const wrap = document.createElement('div');
    wrap.className = 'pr-load-more-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pr-load-more';
    btn.textContent = 'Daha Fazla Göster';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Yükleniyor...';
      state.page += 1;
      const next = await fetchProductReviews(
        baseUrl,
        merchantId,
        productId,
        state.page,
        state.sort,
        state.ratingFilter,
        state.hasPhotos,
      );
      if (next) {
        currentData = next;
        allReviews = [...allReviews, ...next.reviews];
      }
      renderAll();
    });
    wrap.appendChild(btn);
    container.appendChild(wrap);
  }

  function renderAll() {
    root.innerHTML = '';
    renderHeader(root);
    renderFilters(root);
    renderList(root, allReviews);
    renderLoadMore(root);
  }

  async function refresh() {
    const data = await fetchProductReviews(
      baseUrl,
      merchantId,
      productId,
      state.page,
      state.sort,
      state.ratingFilter,
      state.hasPhotos,
    );
    if (data) {
      currentData = data;
      allReviews = [...data.reviews];
    }
    renderAll();
  }

  renderAll();
}
