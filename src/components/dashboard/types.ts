export interface ReviewMedia {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  sortOrder: number;
}

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface Review {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productHref: string | null;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  merchantReply: string | null;
  merchantReplyAt: string | null;
  source: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  media: ReviewMedia[];
}

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StoreSettings {
  id: string;
  merchantId: string;
  isActive: boolean;
  autoPublish: boolean;
  emailEnabled: boolean;
  emailDelay: number;
  emailTemplate: string;
  emailSubject: string;
  emailFromName: string;
  couponEnabled: boolean;
  couponType: string;
  couponValue: number;
  couponMinPurchase: number;
  couponExpiryDays: number;
  reminderEnabled: boolean;
  reminderDelay: number;
  brandColor: string;
  widgetLanguage: string;
}

export interface WidgetSettings {
  id: string;
  merchantId: string;
  reviewsWidgetEnabled: boolean;
  reviewsLayout: string;
  reviewsPerPage: number;
  reviewsSortDefault: string;
  showReviewsHeader: boolean;
  showFilters: boolean;
  showPhotos: boolean;
  starRatingEnabled: boolean;
  starRatingStyle: string;
  starColor: string;
  emptyStarBehavior: string;
  trustBadgeEnabled: boolean;
  trustBadgePosition: string;
  carouselEnabled: boolean;
  carouselAutoplay: boolean;
  carouselSpeed: number;
}

export interface EmailLog {
  id: string;
  orderId: string;
  customerEmail: string;
  type: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  photoReviewPercent: number;
  emailConversionRate: number;
}

export interface AnalyticsDailyEntry {
  date: string;
  count: number;
}

export interface AnalyticsTopProduct {
  productId: string;
  productName: string;
  reviewCount: number;
  averageRating: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  daily: AnalyticsDailyEntry[];
  distribution: Record<string, number>;
  topProducts: AnalyticsTopProduct[];
}
