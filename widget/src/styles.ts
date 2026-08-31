// Shared CSS for the Product Reviews storefront widget.
// Injected inside a closed Shadow DOM so it never leaks into (or is affected by) the host theme.

export function baseResetCSS(): string {
  return `
    :host {
      all: initial;
      display: block;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      --pr-star-color: #ffb800;
      --pr-star-empty: #d1d5db;
      --pr-accent: #111827;
      --pr-border: #e5e7eb;
      --pr-bg: #ffffff;
      --pr-muted: #6b7280;
    }
    *, *::before, *::after { box-sizing: border-box; }
    .pr-hidden { display: none !important; }
    button { font-family: inherit; cursor: pointer; }
  `;
}

export function starsCSS(): string {
  return `
    .pr-stars { display: inline-flex; align-items: center; gap: 2px; line-height: 0; }
    .pr-stars svg { display: block; }
    .pr-star-input { display: inline-flex; gap: 4px; }
    .pr-star-input button {
      background: none; border: none; padding: 2px; line-height: 0;
    }
    .pr-star-input button svg { width: 28px; height: 28px; }
  `;
}

export function reviewsWidgetCSS(): string {
  return `
    .pr-widget { max-width: 100%; padding: 24px 0; }
    .pr-widget * { box-sizing: border-box; }

    .pr-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .pr-header-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .pr-avg-block { text-align: center; min-width: 90px; }
    .pr-avg-number { font-size: 36px; font-weight: 700; line-height: 1; color: var(--pr-accent); }
    .pr-avg-count { margin-top: 6px; font-size: 13px; color: var(--pr-muted); }

    .pr-distribution { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
    .pr-dist-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--pr-muted); cursor: pointer; background: none; border: none; padding: 2px 0; width: 100%; text-align: left; }
    .pr-dist-row:hover .pr-dist-bar-fill { opacity: 0.85; }
    .pr-dist-label { width: 34px; flex-shrink: 0; }
    .pr-dist-bar { flex: 1; height: 6px; border-radius: 3px; background: #f0f1f3; overflow: hidden; }
    .pr-dist-bar-fill { height: 100%; background: var(--pr-star-color); border-radius: 3px; }
    .pr-dist-count { width: 32px; flex-shrink: 0; text-align: right; }

    .pr-write-btn {
      background: var(--pr-accent); color: #fff; border: none; border-radius: 8px;
      padding: 11px 20px; font-size: 14px; font-weight: 600; white-space: nowrap;
    }
    .pr-write-btn:hover { opacity: 0.9; }

    .pr-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--pr-border); }
    .pr-filter-chip {
      border: 1px solid var(--pr-border); background: #fff; border-radius: 999px;
      padding: 6px 14px; font-size: 13px; color: #374151;
    }
    .pr-filter-chip.pr-active { background: var(--pr-accent); color: #fff; border-color: var(--pr-accent); }
    .pr-filter-spacer { flex: 1; }
    .pr-sort-select, .pr-photos-toggle {
      border: 1px solid var(--pr-border); background: #fff; border-radius: 8px;
      padding: 7px 10px; font-size: 13px; color: #374151;
    }
    .pr-photos-toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }

    .pr-list { display: flex; flex-direction: column; gap: 0; }
    .pr-empty { padding: 32px 0; text-align: center; color: var(--pr-muted); font-size: 14px; }

    .pr-card { padding: 20px 0; border-bottom: 1px solid var(--pr-border); }
    .pr-card:last-child { border-bottom: none; }
    .pr-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .pr-card-author { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #111827; }
    .pr-verified-badge {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500;
      color: #15803d; background: #ecfdf3; border-radius: 999px; padding: 2px 8px;
    }
    .pr-card-date { font-size: 12px; color: var(--pr-muted); }
    .pr-card-rating { margin: 8px 0 6px; }
    .pr-card-title { font-size: 14px; font-weight: 600; margin: 4px 0; color: #111827; }
    .pr-card-body { font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap; word-break: break-word; }

    .pr-photos { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .pr-photo-thumb {
      width: 64px; height: 64px; border-radius: 8px; overflow: hidden; border: 1px solid var(--pr-border);
      background-size: cover; background-position: center; cursor: pointer; padding: 0;
    }

    .pr-reply { margin-top: 14px; padding: 12px 14px; background: #f9fafb; border-radius: 10px; border-left: 3px solid var(--pr-accent); }
    .pr-reply-label { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .pr-reply-body { font-size: 13px; color: #374151; line-height: 1.5; white-space: pre-wrap; }

    .pr-load-more-wrap { display: flex; justify-content: center; margin-top: 20px; }
    .pr-load-more {
      border: 1px solid var(--pr-border); background: #fff; border-radius: 8px;
      padding: 10px 24px; font-size: 14px; font-weight: 600; color: #111827;
    }
    .pr-load-more:hover { background: #f9fafb; }
    .pr-load-more:disabled { opacity: 0.6; cursor: default; }

    @media (max-width: 640px) {
      .pr-header { flex-direction: column; align-items: flex-start; }
      .pr-write-btn { width: 100%; }
      .pr-header-left { width: 100%; justify-content: space-between; }
    }
  `;
}

export function starRatingBadgeCSS(): string {
  return `
    :host { all: initial; display: inline-flex; }
    .pr-badge { display: inline-flex; align-items: center; gap: 5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .pr-badge-count { font-size: 12px; color: #6b7280; }
    .pr-badge-stars svg { width: 13px; height: 13px; }
    .pr-badge-empty-text { font-size: 12px; color: #9ca3af; }
  `;
}

export function lightboxCSS(): string {
  return `
    .pr-lightbox-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2147483000;
      display: flex; align-items: center; justify-content: center;
    }
    .pr-lightbox-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
    .pr-lightbox-close, .pr-lightbox-prev, .pr-lightbox-next {
      position: absolute; background: rgba(255,255,255,0.15); border: none; color: #fff;
      border-radius: 999px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .pr-lightbox-close:hover, .pr-lightbox-prev:hover, .pr-lightbox-next:hover { background: rgba(255,255,255,0.3); }
    .pr-lightbox-close { top: 16px; right: 16px; }
    .pr-lightbox-prev { left: 16px; top: 50%; transform: translateY(-50%); }
    .pr-lightbox-next { right: 16px; top: 50%; transform: translateY(-50%); }
    .pr-lightbox-counter { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 13px; opacity: 0.8; }
    @media (max-width: 640px) {
      .pr-lightbox-prev, .pr-lightbox-next { width: 34px; height: 34px; }
    }
  `;
}

export function modalCSS(): string {
  return `
    .pr-modal-overlay {
      position: fixed; inset: 0; background: rgba(17, 24, 39, 0.55); z-index: 2147483000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .pr-modal {
      background: #fff; border-radius: 14px; max-width: 480px; width: 100%;
      max-height: 90vh; overflow-y: auto; padding: 24px; position: relative;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
    .pr-modal-close {
      position: absolute; top: 16px; right: 16px; background: none; border: none;
      font-size: 20px; color: #6b7280; line-height: 1; padding: 4px;
    }
    .pr-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 18px; padding-right: 24px; }
    .pr-field { margin-bottom: 14px; }
    .pr-field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .pr-field input[type="text"], .pr-field input[type="email"], .pr-field textarea {
      width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px;
      font-size: 14px; font-family: inherit; color: #111827; background: #fff;
    }
    .pr-field input:focus, .pr-field textarea:focus { outline: 2px solid #111827; outline-offset: 1px; }
    .pr-field textarea { resize: vertical; min-height: 90px; }
    .pr-field-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; }

    .pr-photo-uploads { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .pr-photo-item { position: relative; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; background-size: cover; background-position: center; }
    .pr-photo-remove { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; line-height: 1; }
    .pr-photo-add {
      width: 56px; height: 56px; border-radius: 8px; border: 1px dashed #d1d5db; background: #fafafa;
      display: flex; align-items: center; justify-content: center; font-size: 22px; color: #9ca3af;
    }

    .pr-modal-submit {
      width: 100%; background: #111827; color: #fff; border: none; border-radius: 8px;
      padding: 12px; font-size: 14px; font-weight: 700; margin-top: 6px;
    }
    .pr-modal-submit:disabled { opacity: 0.6; cursor: default; }
    .pr-modal-error { color: #dc2626; font-size: 13px; margin: 4px 0 10px; }
    .pr-modal-success { text-align: center; padding: 20px 0; }
    .pr-modal-success-icon { font-size: 40px; margin-bottom: 12px; }
    .pr-modal-success-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .pr-modal-success-text { font-size: 13px; color: #6b7280; line-height: 1.5; }
  `;
}
