// Fullscreen photo lightbox, rendered inside the widget's Shadow DOM.

import { ReviewPhoto } from '../api';

export function openLightbox(shadowRoot: ShadowRoot, photos: ReviewPhoto[], startIndex: number): void {
  if (!photos || photos.length === 0) return;

  let index = Math.max(0, Math.min(photos.length - 1, startIndex));

  const overlay = document.createElement('div');
  overlay.className = 'pr-lightbox-overlay';

  const img = document.createElement('img');
  img.className = 'pr-lightbox-img';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'pr-lightbox-close';
  closeBtn.setAttribute('aria-label', 'Kapat');
  closeBtn.textContent = '✕';

  const counter = document.createElement('div');
  counter.className = 'pr-lightbox-counter';

  function render() {
    img.src = photos[index].url;
    counter.textContent = photos.length > 1 ? `${index + 1} / ${photos.length}` : '';
  }

  function close() {
    document.removeEventListener('keydown', onKeydown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function prev() {
    index = (index - 1 + photos.length) % photos.length;
    render();
  }

  function next() {
    index = (index + 1) % photos.length;
    render();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);

  if (photos.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pr-lightbox-prev';
    prevBtn.setAttribute('aria-label', 'Önceki fotoğraf');
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', prev);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pr-lightbox-next';
    nextBtn.setAttribute('aria-label', 'Sonraki fotoğraf');
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', next);

    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
  }

  overlay.appendChild(counter);

  document.addEventListener('keydown', onKeydown);
  render();
  shadowRoot.appendChild(overlay);
}
