// API client for the Product Reviews storefront widget.
// Talks to the Task 7 widget endpoints and caches responses in localStorage.

export interface ReviewPhoto {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface WidgetReview {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  photos: ReviewPhoto[];
  merchantReply: string | null;
  merchantReplyAt: string | null;
  createdAt: string;
}

export interface ReviewsWidgetSettings {
  layout: string;
  showHeader: boolean;
  showFilters: boolean;
  showPhotos: boolean;
  starColor: string;
  reviewsPerPage: number;
  defaultSort: string;
}

export interface ReviewsSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface ReviewsPagination {
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ReviewsResponse {
  settings: ReviewsWidgetSettings;
  reviews: WidgetReview[];
  summary: ReviewsSummary;
  pagination: ReviewsPagination;
}

export interface RatingEntry {
  average: number;
  count: number;
}

export interface RatingsWidgetSettings {
  style: string;
  starColor: string;
  emptyStarBehavior: string;
}

export interface BatchRatingsResult {
  ratings: Record<string, RatingEntry | null>;
  settings: RatingsWidgetSettings;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'photos-first';

const REVIEWS_TTL = 5 * 60 * 1000; // 5 minutes
const RATINGS_TTL = 5 * 60 * 1000; // 5 minutes
const LOOKUP_TTL = 60 * 60 * 1000; // 1 hour

const REVIEWS_CACHE_KEY = 'pr_widget_reviews_cache';
const RATINGS_CACHE_KEY = 'pr_widget_ratings_cache';
const RATINGS_SETTINGS_CACHE_KEY = 'pr_widget_ratings_settings_cache';
const LOOKUP_CACHE_KEY = 'pr_widget_lookup_cache';

const DEFAULT_RATINGS_SETTINGS: RatingsWidgetSettings = {
  style: 'stars',
  starColor: '#FFB800',
  emptyStarBehavior: 'hide',
};

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable, full, or blocked — silently ignore
  }
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- Reviews list ----------

interface ReviewsCacheEntry {
  data: ReviewsResponse;
  timestamp: number;
}

function reviewsCacheKey(
  merchantId: string,
  productId: string,
  page: number,
  sort: string,
  ratingFilter?: number,
  hasPhotos?: boolean,
): string {
  return `${merchantId}:${productId}:${page}:${sort}:${ratingFilter ?? ''}:${hasPhotos ? 1 : 0}`;
}

export async function fetchProductReviews(
  baseUrl: string,
  merchantId: string,
  productId: string,
  page = 1,
  sort: ReviewSort | string = 'newest',
  ratingFilter?: number,
  hasPhotos?: boolean,
): Promise<ReviewsResponse | null> {
  const key = reviewsCacheKey(merchantId, productId, page, sort, ratingFilter, hasPhotos);
  const cacheMap = readJSON<Record<string, ReviewsCacheEntry>>(REVIEWS_CACHE_KEY, {});
  const cached = cacheMap[key];
  const isFresh = cached && Date.now() - cached.timestamp < REVIEWS_TTL;
  if (isFresh) return cached.data;

  try {
    const params = new URLSearchParams({ productId, page: String(page), sort: String(sort) });
    if (ratingFilter) params.set('rating', String(ratingFilter));
    if (hasPhotos) params.set('hasPhotos', 'true');

    const res = await fetch(`${baseUrl}/api/widget/reviews/${merchantId}?${params.toString()}`, {
      method: 'GET',
    });

    if (!res.ok) return cached?.data ?? null;

    const data = (await res.json()) as ReviewsResponse;
    cacheMap[key] = { data, timestamp: Date.now() };
    safeSetItem(REVIEWS_CACHE_KEY, JSON.stringify(cacheMap));
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

// ---------- Batch ratings (star badges) ----------

interface RatingsCacheEntry {
  average: number;
  count: number;
  hasRating: boolean;
  timestamp: number;
}

export async function fetchBatchRatings(
  baseUrl: string,
  merchantId: string,
  productIds: string[],
): Promise<BatchRatingsResult> {
  const now = Date.now();
  const cacheMap = readJSON<Record<string, RatingsCacheEntry>>(RATINGS_CACHE_KEY, {});
  const settingsEntry = readJSON<{ settings: RatingsWidgetSettings; timestamp: number } | null>(
    RATINGS_SETTINGS_CACHE_KEY,
    null,
  );

  const result: Record<string, RatingEntry | null> = {};
  const missing: string[] = [];

  for (const id of productIds) {
    const key = `${merchantId}:${id}`;
    const entry = cacheMap[key];
    if (entry && now - entry.timestamp < RATINGS_TTL) {
      result[id] = entry.hasRating ? { average: entry.average, count: entry.count } : null;
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) {
    return {
      ratings: result,
      settings: settingsEntry?.settings ?? DEFAULT_RATINGS_SETTINGS,
    };
  }

  try {
    const params = new URLSearchParams({ productIds: missing.join(',') });
    const res = await fetch(`${baseUrl}/api/widget/ratings/${merchantId}?${params.toString()}`, {
      method: 'GET',
    });

    if (!res.ok) {
      for (const id of missing) result[id] = result[id] ?? null;
      return { ratings: result, settings: settingsEntry?.settings ?? DEFAULT_RATINGS_SETTINGS };
    }

    const data = (await res.json()) as BatchRatingsResult;

    for (const id of missing) {
      const rating = data.ratings[id] ?? null;
      result[id] = rating;
      cacheMap[`${merchantId}:${id}`] = {
        average: rating?.average ?? 0,
        count: rating?.count ?? 0,
        hasRating: !!rating,
        timestamp: now,
      };
    }
    safeSetItem(RATINGS_CACHE_KEY, JSON.stringify(cacheMap));
    safeSetItem(RATINGS_SETTINGS_CACHE_KEY, JSON.stringify({ settings: data.settings, timestamp: now }));

    return { ratings: result, settings: data.settings };
  } catch {
    for (const id of missing) result[id] = result[id] ?? null;
    return { ratings: result, settings: settingsEntry?.settings ?? DEFAULT_RATINGS_SETTINGS };
  }
}

// ---------- Slug -> productId lookup ----------

interface LookupCacheEntry {
  productId: string | null;
  timestamp: number;
}

export async function lookupProductId(
  baseUrl: string,
  merchantId: string,
  slug: string,
): Promise<string | null> {
  const key = `${merchantId}:${slug}`;
  const cacheMap = readJSON<Record<string, LookupCacheEntry>>(LOOKUP_CACHE_KEY, {});
  const cached = cacheMap[key];
  const isFresh = cached && Date.now() - cached.timestamp < LOOKUP_TTL;
  if (isFresh) return cached.productId;

  try {
    const res = await fetch(`${baseUrl}/api/widget/product-lookup/${merchantId}?slug=${encodeURIComponent(slug)}`, {
      method: 'GET',
    });

    if (!res.ok) return cached?.productId ?? null;

    const data = (await res.json()) as { productId: string | null };
    cacheMap[key] = { productId: data.productId, timestamp: Date.now() };
    safeSetItem(LOOKUP_CACHE_KEY, JSON.stringify(cacheMap));
    return data.productId;
  } catch {
    return cached?.productId ?? null;
  }
}

// ---------- Review submission ----------

export interface SubmitReviewPayload {
  merchantId: string;
  productId: string;
  productName?: string;
  productImage?: string | null;
  productHref?: string | null;
  customerName: string;
  customerEmail: string;
  rating: number;
  title?: string;
  body: string;
  photos?: Array<{ url: string; width?: number; height?: number; sizeBytes?: number }>;
  source?: string;
}

export interface SubmitReviewResult {
  status?: 'ok';
  reviewId?: string;
  reviewStatus?: string;
  couponCode?: string | null;
  error?: string;
}

export async function submitReview(baseUrl: string, payload: SubmitReviewPayload): Promise<{ ok: boolean; result: SubmitReviewResult }> {
  try {
    const res = await fetch(`${baseUrl}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await res.json().catch(() => ({}))) as SubmitReviewResult;
    return { ok: res.ok, result };
  } catch {
    return { ok: false, result: { error: 'Ağ hatası, lütfen tekrar deneyin.' } };
  }
}

export interface UploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  mediaId: string;
}

export async function requestUploadUrl(
  baseUrl: string,
  merchantId: string,
  contentType: string,
): Promise<UploadUrlResult | null> {
  try {
    const res = await fetch(`${baseUrl}/api/reviews/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId, contentType }),
    });
    if (!res.ok) return null;
    return (await res.json()) as UploadUrlResult;
  } catch {
    return null;
  }
}

export async function uploadPhotoFile(uploadUrl: string, file: File): Promise<boolean> {
  try {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    return res.ok;
  } catch {
    return false;
  }
}
