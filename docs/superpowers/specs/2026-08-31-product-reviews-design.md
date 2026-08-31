# Product Reviews App for ikas

**Date:** 2026-08-31
**Status:** Draft
**Platform:** ikas Admin App (iframe, OAuth2, GraphQL API)
**Approach:** Self-contained monolithic Next.js App (same architecture as Sales Notifications)
**Inspiration:** Loox (Shopify)

## Overview

A product reviews app for ikas e-commerce stores. Enables merchants to collect photo/video reviews from customers, display them on storefronts via embeddable widgets, and manage reviews through an iframe admin panel. Since ikas has no public Review API, the app is fully self-contained: it owns its own database, email sending, media storage, and widget injection.

### Why Self-Contained?

- ikas's built-in review system is **theme-level only** — no GraphQL queries/mutations for reviews exist
- No review webhooks, no rating fields on the Product type
- The app must store reviews, ratings, media, and email schedules independently
- Merchants can disable ikas's built-in review component via theme editor (drag-and-drop removal) to avoid duplicate UIs

## Architecture

Four layers in a single Next.js codebase:

1. **Admin Dashboard (iframe):** Review moderation, settings, widget configuration, analytics — embedded in ikas admin panel
2. **Backend (API Routes):** Review CRUD, email scheduling, media upload, widget data serving, webhook processing
3. **Storefront Widgets:** Multiple widget types (reviews list, star ratings, carousel, trust badge) injected via Shadow DOM
4. **Email Service:** Automated review request emails with photo upload links and optional coupon incentives

### Data Flow

```
Customer purchase → ikas Webhook → Schedule review request email
Email sent → Customer clicks link → Review submission form (hosted page)
Review submitted → API Routes → PostgreSQL + Media Storage
Widget JS → GET /api/widget/reviews/:merchantId → Renders reviews on storefront
Merchant → Admin Panel (iframe) → Moderate/reply/publish reviews
```

### Tech Stack

- **Framework:** Next.js 15 (App Router) — scaffolded via `ikas app init`
- **Language:** TypeScript 5
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Auth:** OAuth2 Authorization Code Flow (ikas standard)
- **Database:** PostgreSQL (Coolify self-hosted)
- **ORM:** Prisma
- **API Client:** @ikas/admin-api-client + GraphQL codegen
- **Deploy:** Vercel
- **Email:** Resend (transactional emails, React Email templates)
- **Media Storage:** Cloudflare R2 (S3-compatible, free egress)
- **Widgets:** Vanilla JS, Shadow DOM, CSS transitions

## Database Schema

### AuthToken (from ikas scaffold)

| Field | Type | Notes |
|-------|------|-------|
| id | String | PK |
| merchantId | String | |
| authorizedAppId | String? | Unique |
| accessToken | String | |
| refreshToken | String | |
| expiresIn | Int | |
| expireDate | DateTime | |

### StoreSettings

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| id | String | cuid | PK |
| merchantId | String | | Unique |
| isActive | Boolean | true | Master toggle |
| autoPublish | Boolean | false | Auto-publish new reviews (vs. manual moderation) |
| emailEnabled | Boolean | true | Send review request emails |
| emailDelay | Int | 7 | Days after delivery to send email |
| emailTemplate | String | "default" | Email template ID |
| emailSubject | String | "Alışverişiniz nasıldı?" | Email subject line |
| emailFromName | String | "" | Sender display name (falls back to store name) |
| couponEnabled | Boolean | false | Offer coupon for photo reviews |
| couponType | String | "percentage" | "percentage" or "fixed" |
| couponValue | Float | 10 | Discount value |
| couponMinPurchase | Float | 0 | Minimum purchase for coupon |
| couponExpiryDays | Int | 30 | Days until coupon expires |
| reminderEnabled | Boolean | false | Send reminder email |
| reminderDelay | Int | 5 | Days after first email to send reminder |
| brandColor | String | "#000000" | Primary brand color for emails and widgets |
| widgetLanguage | String | "tr" | Widget display language |
| createdAt | DateTime | now | |
| updatedAt | DateTime | auto | |

### WidgetSettings

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| id | String | cuid | PK |
| merchantId | String | | Unique |
| reviewsWidgetEnabled | Boolean | true | Reviews list widget |
| reviewsLayout | String | "list" | "list" or "grid" |
| reviewsPerPage | Int | 10 | Pagination |
| reviewsSortDefault | String | "newest" | "newest", "highest", "lowest", "photos-first" |
| showReviewsHeader | Boolean | true | Rating summary header |
| showFilters | Boolean | true | Star filter buttons |
| showPhotos | Boolean | true | Show review photos |
| starRatingEnabled | Boolean | true | Star rating badge on product cards |
| starRatingStyle | String | "badge" | "badge" or "inline" |
| starColor | String | "#FFB800" | Star fill color |
| emptyStarBehavior | String | "hide" | "hide" or "show-empty" — for products with 0 reviews |
| trustBadgeEnabled | Boolean | false | Trust badge widget |
| trustBadgePosition | String | "bottom-left" | Position on page |
| carouselEnabled | Boolean | false | Photo reviews carousel |
| carouselAutoplay | Boolean | true | Auto-rotate |
| carouselSpeed | Int | 5000 | ms between slides |
| createdAt | DateTime | now | |
| updatedAt | DateTime | auto | |

### Review

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| id | String | cuid | PK |
| merchantId | String | | Index |
| productId | String | | ikas product ID, Index |
| productName | String | | Cached product name |
| productImage | String? | | Cached product image URL |
| productHref | String? | | Cached product page URL |
| orderId | String? | | ikas order ID for verified purchase |
| customerName | String | | Reviewer display name |
| customerEmail | String | | For duplicate check and correspondence |
| rating | Int | | 1-5 |
| title | String? | | Optional review title |
| body | String | | Review text |
| isVerifiedPurchase | Boolean | false | Has matching order |
| status | String | "pending" | "pending", "published", "rejected" |
| merchantReply | String? | | Merchant's public reply |
| merchantReplyAt | DateTime? | | When merchant replied |
| source | String | "email" | "email", "form", "import" |
| ipAddress | String? | | For spam detection |
| locale | String | "tr" | Review language |
| createdAt | DateTime | now | |
| updatedAt | DateTime | auto | |
| publishedAt | DateTime? | | When published |

### ReviewMedia

| Field | Type | Notes |
|-------|------|-------|
| id | String | PK |
| reviewId | String | FK → Review |
| type | String | "photo" or "video" |
| url | String | R2 public URL |
| thumbnailUrl | String? | Generated thumbnail URL (videos) |
| width | Int? | Original width |
| height | Int? | Original height |
| sizeBytes | Int | File size |
| sortOrder | Int | Display order |
| createdAt | DateTime | |

### EmailLog

| Field | Type | Notes |
|-------|------|-------|
| id | String | PK |
| merchantId | String | Index |
| orderId | String | ikas order ID |
| customerEmail | String | |
| type | String | "request" or "reminder" |
| status | String | "scheduled", "sent", "failed", "bounced" |
| scheduledAt | DateTime | When to send |
| sentAt | DateTime? | When actually sent |
| reviewToken | String | Unique, one-time-use token for review form |
| expiresAt | DateTime | Token expiry (30 days) |
| createdAt | DateTime | |

### CouponUsage

| Field | Type | Notes |
|-------|------|-------|
| id | String | PK |
| merchantId | String | Index |
| reviewId | String | FK → Review |
| couponCode | String | Generated code |
| discountType | String | "percentage" or "fixed" |
| discountValue | Float | |
| isUsed | Boolean | false |
| expiresAt | DateTime | |
| createdAt | DateTime | |

### ProductRatingCache

| Field | Type | Notes |
|-------|------|-------|
| id | String | PK |
| merchantId | String | Index |
| productId | String | Unique compound (merchantId + productId) |
| averageRating | Float | Cached average |
| totalReviews | Int | Cached count |
| ratingDistribution | JSON | { "1": 5, "2": 3, "3": 10, "4": 25, "5": 57 } |
| updatedAt | DateTime | Last recalculation |

## Admin Dashboard

Five-section interface rendered as iframe in ikas admin panel.

### Section 1: Reviews (Moderation)

Main view — a table of all reviews with:
- **Status tabs:** All / Pending / Published / Rejected
- **Bulk actions:** Publish, reject, delete selected
- **Per-review actions:** Publish/reject, reply, delete
- **Review card shows:** Customer name, rating (stars), title, body preview, product name, photos (thumbnails), verified badge, date, status badge
- **Reply panel:** Inline text input for merchant reply (visible on widget)
- **Filters:** By product, by rating, by date range, by source, has photos/video

### Section 2: Email Collection

- **Email toggle:** Enable/disable review request emails
- **Timing:** Delay after delivery (days), reminder toggle + delay
- **Email template preview:** Live preview of the email with brand colors
- **Subject line:** Editable
- **Coupon settings:** Enable, type (% or fixed), value, minimum purchase, expiry
- **Email log:** Recent emails sent with status (sent/failed/bounced)

### Section 3: Widget Settings

Sub-sections for each widget type:

**Reviews Widget:**
- Enable/disable
- Layout: list vs grid
- Reviews per page
- Default sort
- Show/hide: header, filters, photos
- Color customization (star color, brand color)

**Star Rating Widget:**
- Enable/disable
- Style: badge vs inline
- Empty star behavior: hide or show empty stars
- Star color

**Trust Badge:**
- Enable/disable
- Position

**Carousel:**
- Enable/disable
- Autoplay toggle + speed

### Section 4: Import / Export

- **Import:** CSV upload with mapping (product ID, customer name, rating, body, date)
- **Export:** Download all reviews as CSV

### Section 5: Analytics

- **Date range selector:** 7 days, 30 days, 90 days, all time
- **Summary cards:** Total reviews, average rating, response rate (% with merchant reply), photo review %, email conversion rate
- **Trend chart:** Reviews received per day/week
- **Rating distribution:** Bar chart (1-5 stars)
- **Top reviewed products:** Table with product, review count, average rating

## Storefront Widgets

All widgets are injected via a single script tag and rendered inside Shadow DOM (closed mode) for style isolation. The script auto-detects which page type it's on (product page, collection page, all pages) and renders the appropriate widgets.

### Script Injection

On app install, register script via ikas GraphQL mutation:
```graphql
mutation CreateStorefrontJSScript {
  createStorefrontJSScript(input: {
    name: "Product Reviews Widget"
    contentType: SCRIPT
    scriptContent: "<script src=\"https://app-domain.vercel.app/reviews-widget.js?mid={merchantId}\" defer></script>"
    storefrontId: "{storefrontId}"
    isHighPriority: false
  })
}
```

### Widget 1: Reviews List (P0)

Displayed on product detail pages. Shows all published reviews for the current product.

**Components:**
- **Header:** Average rating (large number + stars), total review count, rating distribution bars (5→1), "Yorum Yaz" button
- **Filter bar:** Star filter buttons (5★, 4★, 3★, 2★, 1★), "Fotoğraflı" filter, sort dropdown
- **Review cards:** Customer name, verified badge, star rating, date, title (bold), body text, photos (clickable grid → lightbox), merchant reply (indented with merchant badge)
- **Pagination:** Load more button or numbered pages

**Product detection:** The widget reads the current product ID using a cascading strategy:
1. URL path parsing — ikas product pages follow `/urun/{slug}` pattern. Widget calls a slug→ID lookup endpoint.
2. DOM scraping — look for ikas theme elements with `data-product-id` or similar attributes.
3. Meta tags — `<meta property="og:url">` or `<meta property="product:retailer_item_id">` if present.
4. The lookup endpoint `/api/widget/product-lookup/:merchantId?slug=xxx` resolves slug to productId via ikas Product GraphQL API with server-side caching (1-hour TTL).

### Widget 2: Star Rating Badge (P0)

Displayed on product listing/collection pages next to each product card.

**Behavior:**
- Scans all product cards on the page
- Fetches ratings for all visible product IDs in one batch API call
- Injects a small star rating + review count below each product name/price
- Respects `emptyStarBehavior` setting

**Product card detection:** Looks for ikas theme product card selectors (data attributes, CSS classes) via a configurable selector or common ikas theme patterns.

### Widget 3: Trust Badge (P1)

A floating badge showing total store reviews and average rating.

**Behavior:**
- Displays on all pages (configurable)
- Shows: star icon + "4.8 ★ | 342 Yorum"
- Click opens a popup with recent highlighted reviews
- Fixed position (configurable: bottom-left, bottom-right)

### Widget 4: Carousel (P1)

Photo reviews carousel for homepage or any page.

**Behavior:**
- Horizontal scrollable carousel of photo review cards
- Each card: product photo, review photo, stars, excerpt, customer name
- Auto-play with configurable speed
- Responsive: 1 card mobile, 3-4 cards desktop

### Technical Constraints (Widgets)

- **No framework dependency.** Vanilla JS for minimal bundle size (~20KB gzip target).
- **Shadow DOM (closed mode)** for style isolation from merchant themes.
- **CSS transitions** for animations.
- **Batch API calls** — one request fetches all product ratings on a page.
- **localStorage cache** (5-minute TTL) for ratings data.
- **Intersection Observer** for lazy-loading reviews and star ratings.
- **Responsive design.** Adapts to mobile/tablet/desktop.

## Widget API Endpoints

### GET /api/widget/reviews/:merchantId

Returns reviews for a specific product, used by the Reviews List widget.

```
Query params: ?productId=xxx&page=1&limit=10&sort=newest&rating=5&hasPhotos=true

Response (200):
{
  "settings": { ...WidgetSettings... },
  "reviews": [
    {
      "id": "...",
      "customerName": "Ayşe K.",
      "rating": 5,
      "title": "Harika ürün!",
      "body": "Çok memnun kaldım...",
      "isVerifiedPurchase": true,
      "photos": [
        { "url": "https://r2.example.com/...", "width": 800, "height": 600 }
      ],
      "merchantReply": "Teşekkür ederiz!",
      "merchantReplyAt": "2026-08-20T10:00:00Z",
      "createdAt": "2026-08-15T14:30:00Z"
    }
  ],
  "summary": {
    "averageRating": 4.6,
    "totalReviews": 128,
    "distribution": { "5": 72, "4": 31, "3": 15, "2": 7, "1": 3 }
  },
  "pagination": { "page": 1, "totalPages": 13, "hasMore": true }
}
```

### GET /api/widget/ratings/:merchantId

Returns star ratings for multiple products (batch), used by the Star Rating widget.

```
Query params: ?productIds=id1,id2,id3,...

Response (200):
{
  "ratings": {
    "product-id-1": { "average": 4.6, "count": 128 },
    "product-id-2": { "average": 3.9, "count": 42 },
    "product-id-3": null
  }
}
```

### GET /api/widget/store-summary/:merchantId

Returns overall store rating, used by Trust Badge.

```
Response (200):
{
  "averageRating": 4.5,
  "totalReviews": 1842,
  "recentHighlights": [
    { "customerName": "...", "rating": 5, "body": "...", "productName": "..." }
  ]
}
```

All widget endpoints are public (no auth) with `Cache-Control: public, max-age=60, s-maxage=60`.

## Review Submission Flow

### Email-Based Collection (Primary)

1. **Order webhook received** (`store/order/created` or `store/order/statusChanged`)
   - Validate HMAC-SHA256 signature
   - Extract order items, customer info
   - Schedule review request email (delivery date + `emailDelay` days)
   - Store in EmailLog with unique `reviewToken`

2. **Cron job runs** (every hour via Vercel Cron)
   - Query EmailLog for scheduled emails with `scheduledAt <= now`
   - Send via Resend API with React Email template
   - Update EmailLog status

3. **Customer clicks email link** → `https://app-domain.vercel.app/review/:reviewToken`
   - Hosted review form page (not an iframe)
   - Token validated, order details pre-filled
   - Form: star rating (required), title (optional), body (required), photo upload (up to 5 photos, max 10MB each)
   - Photo upload direct to R2 via presigned URL
   - On submit: create Review + ReviewMedia records, update ProductRatingCache, mark token as used

4. **If coupon enabled:** Generate unique coupon code, display on thank-you page, send confirmation email with coupon. Note: coupon codes are informational — the merchant must create corresponding discount rules in ikas manually (ikas has no discount/coupon API for apps). The app generates unique codes for tracking which reviews earned discounts.

### Widget-Based Collection (Secondary)

- "Yorum Yaz" button on Reviews Widget opens a modal form
- No email token — customer enters email manually
- Verified purchase check: match email against order history
- Same form fields as email-based

## Webhooks

### store/order/created

- Validate HMAC-SHA256 signature
- Extract: orderId, customer name, email, product details, shipping address
- Schedule review request email in EmailLog

### store/order/statusChanged (if available)

- Detect delivery/shipment status → trigger email scheduling based on actual delivery date
- Fallback: if this webhook type isn't available in ikas, use order creation date + emailDelay as the scheduling anchor
- Check ikas webhook documentation during implementation for available event types

## Media Storage (Cloudflare R2)

### Upload Flow

1. Client requests presigned upload URL from `POST /api/reviews/upload-url`
2. Server generates R2 presigned PUT URL (5-minute expiry)
3. Client uploads directly to R2 (no server bandwidth cost)
4. On review submit, server verifies the uploaded file exists in R2
5. Store URL in ReviewMedia

### File Constraints

- **Photos:** JPEG, PNG, WebP — max 10MB per file, max 5 per review
- **Videos (P2):** MP4, WebM — max 50MB per file, max 1 per review
- **Processing:** Server-side thumbnail generation for grid display (sharp library)

### Bucket Structure

```
reviews/{merchantId}/{reviewId}/{mediaId}.{ext}
reviews/{merchantId}/{reviewId}/thumb_{mediaId}.{ext}
```

## Email Templates (React Email + Resend)

### Review Request Email

- **From:** `{storeName} <reviews@mail.app-domain.com>` (Resend custom domain)
- **Subject:** Configurable (default: "Alışverişiniz nasıldı?")
- **Body:**
  - Store logo (if available)
  - Greeting with customer name
  - Product image + name for each order item
  - Star rating selector (1-5 clickable stars that link to form with pre-selected rating)
  - "Yorum Yaz" CTA button
  - If coupon enabled: "Fotoğraflı yorum bırakın, %10 indirim kazanın!" banner
  - Unsubscribe link

### Reminder Email

- Similar to request but shorter, "Yorumunuzu henüz paylaşmadınız" tone
- Only sent if no review exists for this order

### Coupon Confirmation Email

- "İndirim kodunuz hazır!" subject
- Coupon code prominently displayed
- Minimum purchase and expiry info
- "Alışverişe Başla" CTA linking to store

## App Lifecycle

### Install
1. OAuth2 flow completes, tokens stored
2. Create default StoreSettings and WidgetSettings rows
3. Register `store/order/created` webhook
4. Inject storefront widget script via CreateStorefrontJSScript

### Uninstall
- Webhook and script automatically removed by ikas platform
- Data retained for potential reinstall
- Scheduled emails cancelled
- R2 media retained (30-day cleanup policy)

## Internationalization

Admin dashboard: Turkish primary, English secondary (via next-intl or ikas userLocale).

Widget text is configurable by merchant. Default labels:
- "Yorum Yaz" / "Write a Review"
- "Doğrulanmış Alıcı" / "Verified Buyer"
- "Fotoğraflı Yorumlar" / "Photo Reviews"
- "Tümünü Gör" / "See All"
- "Yorum" / "Review(s)"

## Error Handling

- **Widget API down:** Widget uses localStorage cache as fallback. No cache → hide widget silently.
- **Email sending fails:** Retry up to 3 times with exponential backoff. Mark as "failed" in EmailLog.
- **R2 upload fails:** Show user-friendly error, allow retry. Don't block text-only review submission.
- **Webhook validation fails:** Return 401, log attempt, don't schedule email.
- **Token expired:** Auto-refresh via ikas scaffold mechanism.
- **Duplicate review prevention:** One review per (email, productId, orderId) combination.
- **Spam protection:** Rate limit review submissions per IP (5/hour), honeypot field on form.

## Performance Considerations

- **ProductRatingCache table:** Avoids recalculating averages on every widget load. Updated on review publish/unpublish.
- **Batch ratings endpoint:** Single API call for all products on a collection page.
- **Widget lazy loading:** Intersection Observer delays rendering until widget area is near viewport.
- **Image optimization:** Thumbnails generated on upload, served at appropriate sizes.
- **CDN caching:** Widget API responses cached at edge (60s s-maxage).

## Security

- Review form tokens are single-use, expire in 30 days
- Presigned R2 URLs expire in 5 minutes
- HMAC-SHA256 webhook signature validation
- Customer emails never exposed in widget API responses
- IP-based rate limiting on public endpoints
- File type validation on upload (MIME type + magic bytes)
- XSS sanitization on review body (DOMPurify on render)

## Explicitly Excluded (Not in Scope)

- **Google Rich Snippets / JSON-LD** — User explicitly excluded
- **Social sharing** (share review to social media)
- **Review incentive gamification** (points, tiers)
- **AI-powered review analysis / sentiment detection**
- **Multi-store review aggregation**
- **Q&A / product questions feature**

## Priority Phases

### P0 — Must Have (MVP)
- Review collection via email with photo upload
- Review submission form (hosted page + widget modal)
- Reviews List Widget (product pages)
- Star Rating Widget (product cards / collection pages)
- Moderation panel (approve/reject/reply)
- Coupon incentive for photo reviews
- Webhook integration for order data

### P1 — Should Have
- Trust Badge Widget
- Carousel Widget
- Reminder emails
- Review analytics dashboard

### P2 — Nice to Have
- Video review support
- Happy Customers page (standalone reviews showcase)
- Review import/export (CSV)
- Bulk email campaigns for past orders
