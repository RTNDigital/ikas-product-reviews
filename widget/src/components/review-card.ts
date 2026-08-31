// Renders a single review card (rating, author, body, photos, merchant reply).

import { WidgetReview, ReviewsWidgetSettings } from '../api';
import { renderStaticStarsHTML } from './stars';
import { escapeHtml, relativeTimeTR } from '../utils';

export interface ReviewCardCallbacks {
  onPhotoClick: (photos: WidgetReview['photos'], startIndex: number) => void;
}

export function renderReviewCard(
  review: WidgetReview,
  settings: ReviewsWidgetSettings,
  callbacks: ReviewCardCallbacks,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'pr-card';

  const showPhotos = settings.showPhotos && review.photos && review.photos.length > 0;

  card.innerHTML = `
    <div class="pr-card-top">
      <span class="pr-card-author">
        ${escapeHtml(review.customerName || 'Müşteri')}
        ${review.isVerifiedPurchase ? '<span class="pr-verified-badge">Doğrulanmış Satın Alma</span>' : ''}
      </span>
      <span class="pr-card-date">${escapeHtml(relativeTimeTR(review.createdAt))}</span>
    </div>
    <div class="pr-card-rating">${renderStaticStarsHTML(review.rating, { size: 15, starColor: settings.starColor })}</div>
    ${review.title ? `<div class="pr-card-title">${escapeHtml(review.title)}</div>` : ''}
    <div class="pr-card-body">${escapeHtml(review.body)}</div>
    ${showPhotos ? `<div class="pr-photos"></div>` : ''}
    ${
      review.merchantReply
        ? `<div class="pr-reply">
             <div class="pr-reply-label">Satıcı Yanıtı</div>
             <div class="pr-reply-body">${escapeHtml(review.merchantReply)}</div>
           </div>`
        : ''
    }
  `;

  if (showPhotos) {
    const photosWrap = card.querySelector('.pr-photos') as HTMLElement;
    review.photos.forEach((photo, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'pr-photo-thumb';
      thumb.style.backgroundImage = `url("${(photo.thumbnailUrl || photo.url).replace(/"/g, '%22')}")`;
      thumb.setAttribute('aria-label', 'Fotoğrafı büyüt');
      thumb.addEventListener('click', () => callbacks.onPhotoClick(review.photos, index));
      photosWrap.appendChild(thumb);
    });
  }

  return card;
}
