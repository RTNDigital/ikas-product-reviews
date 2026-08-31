// "Yorum Yaz" (write a review) modal form.

import { requestUploadUrl, uploadPhotoFile, submitReview } from '../api';
import { renderInteractiveStars } from './stars';
import { escapeHtml, isValidEmail } from '../utils';

export interface ReviewFormModalOptions {
  baseUrl: string;
  merchantId: string;
  productId: string;
  productName?: string;
  productImage?: string | null;
  productHref?: string | null;
  starColor?: string;
  onSubmitted?: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 5;

interface PendingPhoto {
  localId: string;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  remoteUrl?: string;
  sizeBytes?: number;
}

const ERROR_MESSAGES_TR: Record<string, string> = {
  'You have already reviewed this product': 'Bu ürünü zaten değerlendirdiniz.',
  'Rating must be 1-5': 'Lütfen bir puan seçin.',
  'Review body must be at least 10 characters': 'Yorumunuz en az 10 karakter olmalıdır.',
  'Maximum 5 photos allowed': 'En fazla 5 fotoğraf ekleyebilirsiniz.',
  'merchantId, productId, customerEmail, and customerName are required': 'Lütfen tüm zorunlu alanları doldurun.',
};

function translateError(message?: string): string {
  if (!message) return 'Bir hata oluştu, lütfen tekrar deneyin.';
  return ERROR_MESSAGES_TR[message] || 'Bir hata oluştu, lütfen tekrar deneyin.';
}

export function openReviewFormModal(shadowRoot: ShadowRoot, options: ReviewFormModalOptions): void {
  const overlay = document.createElement('div');
  overlay.className = 'pr-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'pr-modal';
  if (options.starColor) modal.style.setProperty('--pr-star-color', options.starColor);

  modal.innerHTML = `
    <button type="button" class="pr-modal-close" aria-label="Kapat">✕</button>
    <h3 class="pr-modal-title">Yorum Yaz</h3>
    <div class="pr-modal-body">
      <div class="pr-field">
        <label>Puanınız</label>
        <div class="pr-star-input-mount"></div>
      </div>
      <div class="pr-field">
        <label for="pr-f-title">Başlık (isteğe bağlı)</label>
        <input type="text" id="pr-f-title" maxlength="120" />
      </div>
      <div class="pr-field">
        <label for="pr-f-body">Yorumunuz</label>
        <textarea id="pr-f-body" maxlength="2000" placeholder="Ürün hakkındaki düşüncelerinizi paylaşın"></textarea>
        <div class="pr-field-hint">En az 10 karakter</div>
      </div>
      <div class="pr-field">
        <label>Fotoğraf ekle (isteğe bağlı, en fazla ${MAX_PHOTOS})</label>
        <div class="pr-photo-uploads"></div>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="pr-photo-file-input" style="display:none" />
      </div>
      <div class="pr-field">
        <label for="pr-f-name">Adınız</label>
        <input type="text" id="pr-f-name" maxlength="80" />
      </div>
      <div class="pr-field">
        <label for="pr-f-email">E-posta adresiniz</label>
        <input type="email" id="pr-f-email" maxlength="160" />
        <div class="pr-field-hint">Yorumunuz onaylandığında size bilgi vermek için kullanılır, yayınlanmaz.</div>
      </div>
      <div class="pr-modal-error pr-hidden"></div>
      <button type="button" class="pr-modal-submit">Yorumu Gönder</button>
    </div>
  `;

  overlay.appendChild(modal);

  function close() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  (modal.querySelector('.pr-modal-close') as HTMLButtonElement).addEventListener('click', close);

  // Interactive star input
  const starMount = modal.querySelector('.pr-star-input-mount') as HTMLElement;
  const starInput = renderInteractiveStars(starMount, 0, () => {}, options.starColor);

  // Photo upload handling
  const photosWrap = modal.querySelector('.pr-photo-uploads') as HTMLElement;
  const fileInput = modal.querySelector('.pr-photo-file-input') as HTMLInputElement;
  const pendingPhotos: PendingPhoto[] = [];

  function renderPhotos() {
    photosWrap.innerHTML = '';
    pendingPhotos.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'pr-photo-item';
      item.style.backgroundImage = `url("${p.previewUrl}")`;
      item.style.opacity = p.status === 'uploading' ? '0.5' : '1';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'pr-photo-remove';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', 'Fotoğrafı kaldır');
      removeBtn.addEventListener('click', () => {
        const idx = pendingPhotos.findIndex((x) => x.localId === p.localId);
        if (idx >= 0) pendingPhotos.splice(idx, 1);
        renderPhotos();
      });
      item.appendChild(removeBtn);
      photosWrap.appendChild(item);
    });

    if (pendingPhotos.length < MAX_PHOTOS) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'pr-photo-add';
      addBtn.textContent = '+';
      addBtn.setAttribute('aria-label', 'Fotoğraf ekle');
      addBtn.addEventListener('click', () => fileInput.click());
      photosWrap.appendChild(addBtn);
    }
  }
  renderPhotos();

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';

    for (const file of files) {
      if (pendingPhotos.length >= MAX_PHOTOS) break;
      if (!ALLOWED_TYPES.includes(file.type)) {
        showError('Sadece JPEG, PNG veya WEBP formatında fotoğraf yükleyebilirsiniz.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        showError('Fotoğraf boyutu en fazla 10MB olabilir.');
        continue;
      }

      const localId = `${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      const pending: PendingPhoto = { localId, previewUrl, status: 'uploading' };
      pendingPhotos.push(pending);
      renderPhotos();

      const uploadInfo = await requestUploadUrl(options.baseUrl, options.merchantId, file.type);
      if (!uploadInfo) {
        pending.status = 'error';
        const idx = pendingPhotos.findIndex((x) => x.localId === localId);
        if (idx >= 0) pendingPhotos.splice(idx, 1);
        showError('Fotoğraf yüklenemedi, lütfen tekrar deneyin.');
        renderPhotos();
        continue;
      }

      const success = await uploadPhotoFile(uploadInfo.uploadUrl, file);
      if (!success) {
        const idx = pendingPhotos.findIndex((x) => x.localId === localId);
        if (idx >= 0) pendingPhotos.splice(idx, 1);
        showError('Fotoğraf yüklenemedi, lütfen tekrar deneyin.');
        renderPhotos();
        continue;
      }

      pending.status = 'done';
      pending.remoteUrl = uploadInfo.publicUrl;
      pending.sizeBytes = file.size;
      renderPhotos();
    }
  });

  // Submission
  const errorEl = modal.querySelector('.pr-modal-error') as HTMLElement;
  const submitBtn = modal.querySelector('.pr-modal-submit') as HTMLButtonElement;
  const nameInput = modal.querySelector('#pr-f-name') as HTMLInputElement;
  const emailInput = modal.querySelector('#pr-f-email') as HTMLInputElement;
  const titleInput = modal.querySelector('#pr-f-title') as HTMLInputElement;
  const bodyInput = modal.querySelector('#pr-f-body') as HTMLTextAreaElement;

  function showError(message: string) {
    errorEl.textContent = message;
    errorEl.classList.remove('pr-hidden');
  }
  function clearError() {
    errorEl.classList.add('pr-hidden');
  }

  submitBtn.addEventListener('click', async () => {
    clearError();

    const rating = starInput.getValue();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (rating < 1) return showError('Lütfen bir puan seçin.');
    if (!name) return showError('Lütfen adınızı girin.');
    if (!email || !isValidEmail(email)) return showError('Lütfen geçerli bir e-posta adresi girin.');
    if (body.length < 10) return showError('Yorumunuz en az 10 karakter olmalıdır.');
    if (pendingPhotos.some((p) => p.status === 'uploading')) {
      return showError('Fotoğraflar yüklenirken lütfen bekleyin.');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    const photos = pendingPhotos
      .filter((p) => p.status === 'done' && p.remoteUrl)
      .map((p) => ({ url: p.remoteUrl as string, sizeBytes: p.sizeBytes }));

    const { ok, result } = await submitReview(options.baseUrl, {
      merchantId: options.merchantId,
      productId: options.productId,
      productName: options.productName,
      productImage: options.productImage,
      productHref: options.productHref,
      customerName: name,
      customerEmail: email,
      rating,
      title: title || undefined,
      body,
      photos,
      source: 'widget',
    });

    if (!ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Yorumu Gönder';
      return showError(translateError(result.error));
    }

    // Success state
    const bodyWrap = modal.querySelector('.pr-modal-body') as HTMLElement;
    const isPublished = result.reviewStatus === 'published';
    bodyWrap.innerHTML = `
      <div class="pr-modal-success">
        <div class="pr-modal-success-icon">✅</div>
        <div class="pr-modal-success-title">Teşekkürler!</div>
        <div class="pr-modal-success-text">
          ${
            isPublished
              ? 'Yorumunuz yayınlandı.'
              : 'Yorumunuz alındı ve incelendikten sonra yayınlanacak.'
          }
          ${result.couponCode ? `<br/><br/>Kupon kodunuz: <strong>${escapeHtml(result.couponCode)}</strong>` : ''}
        </div>
      </div>
    `;

    if (options.onSubmitted) options.onSubmitted();
  });

  shadowRoot.appendChild(overlay);
}
