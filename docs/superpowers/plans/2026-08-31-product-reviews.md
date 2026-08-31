# Product Reviews App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained product reviews app for ikas that enables merchants to collect photo reviews via email, display them on storefronts via widgets, and manage them through an iframe admin panel.

**Architecture:** Single Next.js 15 monolith with four layers — iframe admin dashboard, API routes, storefront widgets (vanilla JS + Shadow DOM), and email service (Resend). Same architecture as the Sales Notifications app. All review data stored in own PostgreSQL database; media in Cloudflare R2.

**Tech Stack:** Next.js 15 (App Router), TypeScript 5, Tailwind CSS v4 + shadcn/ui, Prisma, PostgreSQL (Coolify), @ikas/admin-api-client, Resend (email), Cloudflare R2 (media), esbuild (widget bundler)

**Spec:** `docs/superpowers/specs/2026-08-31-product-reviews-design.md`

## Global Constraints

- All ikas GraphQL operations must go through `getIkas()` client (never raw `fetch` with inline queries)
- GraphQL documents in `src/lib/ikas-client/graphql-requests.ts`, run `pnpm codegen` after changes
- API routes validate JWT via `getUserFromRequest()`, fetch OAuth token via `AuthTokenManager.get()`
- Turkish UI text throughout admin dashboard
- Conventional Commits format
- Widget: vanilla JS only, Shadow DOM (closed mode), no framework dependencies
- Widget API endpoints are public (no auth), with `Cache-Control: public, max-age=60, s-maxage=60`
- Customer emails never exposed in widget API responses
- Scaffold via `ikas app init`, copy shared patterns from Sales Notifications (auth, config, helpers)

---

### Task 1: Project scaffold and database schema

Bootstrap the Next.js project using `ikas app init` and set up the database.

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/globals/config.ts`
- Create: `src/globals/constants.ts`
- Create: `src/models/auth-token/index.ts`
- Create: `src/models/auth-token/manager.ts`
- Create: `src/helpers/api-helpers.ts`
- Create: `src/helpers/jwt-helpers.ts`
- Create: `src/helpers/token-helpers.ts`
- Create: `src/lib/auth-helpers.ts`
- Create: `src/lib/session.ts`
- Create: `src/lib/validation.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/ikas-client/codegen.ts`
- Create: `src/lib/ikas-client/graphql-requests.ts`
- Create: `.env.example`
- Modify: `package.json` (add dependencies)

**Interfaces:**
- Produces: Prisma client with all models (AuthToken, StoreSettings, WidgetSettings, Review, ReviewMedia, EmailLog, CouponUsage, ProductRatingCache)
- Produces: `getIkas(token)` → ikasAdminGraphQLAPIClient
- Produces: `getUserFromRequest(request)` → `{ authorizedAppId, merchantId } | null`
- Produces: `AuthTokenManager.get(id)`, `AuthTokenManager.put(token)`
- Produces: `prisma` singleton from `src/lib/prisma.ts`

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/rasitdogan/Desktop/Projects/ikas/app-name--product-reviews
npx @ikas/cli app init
```

If `ikas app init` doesn't work as a standalone command, manually scaffold a Next.js 15 project:

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add @ikas/admin-api-client @ikas/app-helpers @prisma/client iron-session jsonwebtoken moment axios zod uuid resend @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add -D prisma esbuild @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-graphql-request @types/jsonwebtoken @types/uuid
```

- [ ] **Step 3: Install shadcn/ui base components**

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label select separator switch tabs textarea badge alert dialog
```

- [ ] **Step 4: Write the Prisma schema**

Create `prisma/schema.prisma` with all models from the spec. Key points:
- `AuthToken` — same as Sales Notifications (ikas scaffold standard)
- `StoreSettings` — email settings, coupon settings, brand color
- `WidgetSettings` — per-widget-type toggles and config
- `Review` — core review data with status enum, merchant reply
- `ReviewMedia` — photos/videos linked to reviews
- `EmailLog` — scheduled/sent emails with review tokens
- `CouponUsage` — generated coupon codes per review
- `ProductRatingCache` — precomputed averages per product

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}

model AuthToken {
  id              String   @id
  merchantId      String
  authorizedAppId String?  @unique
  salesChannelId  String?
  type            String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deleted         Boolean  @default(false)
  accessToken     String
  tokenType       String
  expiresIn       Int
  expireDate      DateTime
  refreshToken    String
  scope           String?
}

model StoreSettings {
  id               String   @id @default(cuid())
  merchantId       String   @unique
  isActive         Boolean  @default(true)
  autoPublish      Boolean  @default(false)
  emailEnabled     Boolean  @default(true)
  emailDelay       Int      @default(7)
  emailTemplate    String   @default("default")
  emailSubject     String   @default("Alışverişiniz nasıldı?")
  emailFromName    String   @default("")
  couponEnabled    Boolean  @default(false)
  couponType       String   @default("percentage")
  couponValue      Float    @default(10)
  couponMinPurchase Float   @default(0)
  couponExpiryDays Int      @default(30)
  reminderEnabled  Boolean  @default(false)
  reminderDelay    Int      @default(5)
  brandColor       String   @default("#000000")
  widgetLanguage   String   @default("tr")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  reviews   Review[]
  emailLogs EmailLog[]
}

model WidgetSettings {
  id                   String   @id @default(cuid())
  merchantId           String   @unique
  reviewsWidgetEnabled Boolean  @default(true)
  reviewsLayout        String   @default("list")
  reviewsPerPage       Int      @default(10)
  reviewsSortDefault   String   @default("newest")
  showReviewsHeader    Boolean  @default(true)
  showFilters          Boolean  @default(true)
  showPhotos           Boolean  @default(true)
  starRatingEnabled    Boolean  @default(true)
  starRatingStyle      String   @default("badge")
  starColor            String   @default("#FFB800")
  emptyStarBehavior    String   @default("hide")
  trustBadgeEnabled    Boolean  @default(false)
  trustBadgePosition   String   @default("bottom-left")
  carouselEnabled      Boolean  @default(false)
  carouselAutoplay     Boolean  @default(true)
  carouselSpeed        Int      @default(5000)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model Review {
  id                String    @id @default(cuid())
  merchantId        String
  productId         String
  productName       String
  productImage      String?
  productHref       String?
  orderId           String?
  customerName      String
  customerEmail     String
  rating            Int
  title             String?
  body              String
  isVerifiedPurchase Boolean  @default(false)
  status            String   @default("pending")
  merchantReply     String?
  merchantReplyAt   DateTime?
  source            String   @default("email")
  ipAddress         String?
  locale            String   @default("tr")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  publishedAt       DateTime?

  media    ReviewMedia[]
  coupons  CouponUsage[]
  store    StoreSettings @relation(fields: [merchantId], references: [merchantId])

  @@unique([customerEmail, productId, orderId])
  @@index([merchantId])
  @@index([merchantId, productId, status])
  @@index([merchantId, status])
}

model ReviewMedia {
  id           String   @id @default(cuid())
  reviewId     String
  type         String
  url          String
  thumbnailUrl String?
  width        Int?
  height       Int?
  sizeBytes    Int
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId])
}

model EmailLog {
  id            String    @id @default(cuid())
  merchantId    String
  orderId       String
  customerEmail String
  type          String
  status        String    @default("scheduled")
  scheduledAt   DateTime
  sentAt        DateTime?
  reviewToken   String    @unique
  expiresAt     DateTime
  createdAt     DateTime  @default(now())

  store StoreSettings @relation(fields: [merchantId], references: [merchantId])

  @@index([merchantId])
  @@index([status, scheduledAt])
  @@index([reviewToken])
}

model CouponUsage {
  id            String   @id @default(cuid())
  merchantId    String
  reviewId      String
  couponCode    String   @unique
  discountType  String
  discountValue Float
  isUsed        Boolean  @default(false)
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  review Review @relation(fields: [reviewId], references: [id])

  @@index([merchantId])
}

model ProductRatingCache {
  id                 String   @id @default(cuid())
  merchantId         String
  productId          String
  averageRating      Float    @default(0)
  totalReviews       Int      @default(0)
  ratingDistribution String   @default("{\"1\":0,\"2\":0,\"3\":0,\"4\":0,\"5\":0}")
  updatedAt          DateTime @updatedAt

  @@unique([merchantId, productId])
  @@index([merchantId])
}
```

- [ ] **Step 5: Copy shared infrastructure from Sales Notifications**

Copy and adapt these files from the Sales Notifications app, updating import paths and project-specific values:

- `src/lib/prisma.ts` — Prisma singleton (copy verbatim)
- `src/lib/session.ts` — iron-session config (copy verbatim)
- `src/lib/validation.ts` — zod validation helper (copy verbatim)
- `src/lib/utils.ts` — cn() utility (copy verbatim)
- `src/models/auth-token/index.ts` — AuthToken interface (copy verbatim)
- `src/models/auth-token/manager.ts` — AuthTokenManager class (copy verbatim)
- `src/helpers/api-helpers.ts` — getIkas(), onCheckToken(), getRedirectUri() (copy verbatim)
- `src/helpers/jwt-helpers.ts` — JwtHelpers class (copy verbatim)
- `src/helpers/token-helpers.ts` — TokenHelpers class (copy verbatim)
- `src/lib/auth-helpers.ts` — getUserFromRequest() (copy verbatim)
- `src/lib/ikas-client/codegen.ts` — GraphQL codegen config (copy verbatim)
- `src/lib/ikas-client/graphql-requests.ts` — start with getMerchant, getAuthorizedApp, listStorefront, createStorefrontJSScript queries/mutations (copy from Sales Notifications)

- [ ] **Step 6: Set up config**

Create `src/globals/config.ts`:

```typescript
export const config = {
  graphApiUrl: process.env.NEXT_PUBLIC_GRAPH_API_URL,
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
  cookiePassword: process.env.SECRET_COOKIE_PASSWORD,
  oauth: {
    scope: 'read_orders,read_products,read_customers,write_storefront',
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_DEPLOY_URL}/api/oauth/callback/ikas`,
  },
};

export type Config = typeof config;
```

Create `.env.example` with all required variables:

```
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEXT_PUBLIC_GRAPH_API_URL=https://api.myikas.com/api/admin/graphql
NEXT_PUBLIC_ADMIN_URL=https://{storeName}.myikas.com/admin
NEXT_PUBLIC_CLIENT_ID=
NEXT_PUBLIC_DEPLOY_URL=
CLIENT_SECRET=
SECRET_COOKIE_PASSWORD=
JWT_SECRET=
RESEND_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

- [ ] **Step 7: Generate Prisma client and run codegen**

```bash
pnpm prisma generate
pnpm codegen
```

- [ ] **Step 8: Add build scripts to package.json**

Ensure these scripts exist:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && npx esbuild widget/src/index.ts --bundle --minify --outfile=public/reviews-widget.js --format=iife --target=es2020 && next build",
    "build:widget": "npx esbuild widget/src/index.ts --bundle --minify --outfile=public/reviews-widget.js --format=iife --target=es2020",
    "dev:widget": "npx esbuild widget/src/index.ts --bundle --outfile=public/reviews-widget.js --format=iife --target=es2020 --sourcemap=inline --watch",
    "codegen": "graphql-codegen --config src/lib/ikas-client/codegen.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

- [ ] **Step 9: Push database schema**

```bash
pnpm prisma db push
```

Verify all tables are created.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Prisma schema and shared infra"
```

---

### Task 2: OAuth flow and app install

Copy the OAuth flow from Sales Notifications and adapt for the reviews app — on install, create StoreSettings + WidgetSettings, inject widget script.

**Files:**
- Create: `src/app/api/oauth/authorize/ikas/route.ts`
- Create: `src/app/api/oauth/callback/ikas/route.ts`
- Create: `src/app/authorize-store/page.tsx`
- Create: `src/app/callback/page.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/hooks/use-base-home-page.ts`
- Create: `src/components/home-page/index.tsx`
- Create: `src/components/Loading/index.tsx`
- Create: `src/lib/api-requests.ts`

**Interfaces:**
- Consumes: `getIkas(token)`, `AuthTokenManager`, `getUserFromRequest()`, `JwtHelpers`, `TokenHelpers`, `prisma`, `config`
- Produces: Working OAuth authorize + callback routes
- Produces: On callback success: `StoreSettings` + `WidgetSettings` rows created, widget script injected to all storefronts

- [ ] **Step 1: Copy OAuth routes from Sales Notifications**

Copy `src/app/api/oauth/authorize/ikas/route.ts` verbatim from Sales Notifications.

Copy `src/app/api/oauth/callback/ikas/route.ts` from Sales Notifications and modify the callback to:
1. Upsert `StoreSettings` (same as Sales Notifications pattern)
2. Also upsert `WidgetSettings` for the merchant
3. Change widget script injection to use `reviews-widget.js` instead of `widget.js`

Key changes in callback:

```typescript
// Create default store settings and widget settings
await Promise.all([
  prisma.storeSettings.upsert({
    where: { merchantId },
    create: { merchantId },
    update: {},
  }),
  prisma.widgetSettings.upsert({
    where: { merchantId },
    create: { merchantId },
    update: {},
  }),
]);

// Widget script URL
const deployUrl = process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://app-name-product-reviews.vercel.app';
const scriptContent = `<script src="${deployUrl}/reviews-widget.js?mid=${merchantId}" defer></script>`;
```

- [ ] **Step 2: Copy page components from Sales Notifications**

Copy these verbatim:
- `src/app/authorize-store/page.tsx`
- `src/app/callback/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/hooks/use-base-home-page.ts`
- `src/components/home-page/index.tsx`
- `src/components/Loading/index.tsx`

- [ ] **Step 3: Create api-requests.ts**

Create `src/lib/api-requests.ts` with the base request helpers (copy structure from Sales Notifications) and add reviews-specific endpoints:

```typescript
import axios from 'axios';

const api = axios.create({ baseURL: '' });

function makeGetRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.get<T>(url, {
    headers: { Authorization: `JWT ${token}` },
    params: data,
  });
}

function makePostRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.post<T>(url, data, {
    headers: { Authorization: `JWT ${token}` },
  });
}

function makePutRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.put<T>(url, data, {
    headers: { Authorization: `JWT ${token}` },
  });
}

function makeDeleteRequest<T>({ url, token }: { url: string; token: string }) {
  return api.delete<T>(url, {
    headers: { Authorization: `JWT ${token}` },
  });
}

export const ApiRequests = {
  ikas: {
    getSettings: (token: string) =>
      makeGetRequest<{ data: { storeSettings: any; widgetSettings: any } }>({ url: '/api/ikas/settings', token }),
    updateStoreSettings: (token: string, data: Record<string, unknown>) =>
      makePutRequest<{ data: any }>({ url: '/api/ikas/settings/store', token, data }),
    updateWidgetSettings: (token: string, data: Record<string, unknown>) =>
      makePutRequest<{ data: any }>({ url: '/api/ikas/settings/widget', token, data }),
    getReviews: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: any }>({ url: '/api/ikas/reviews', token, data: params }),
    updateReviewStatus: (token: string, data: Record<string, unknown>) =>
      makePostRequest<{ data: any }>({ url: '/api/ikas/reviews/status', token, data }),
    replyToReview: (token: string, data: Record<string, unknown>) =>
      makePostRequest<{ data: any }>({ url: '/api/ikas/reviews/reply', token, data }),
    deleteReview: (token: string, reviewId: string) =>
      makeDeleteRequest<{ data: any }>({ url: `/api/ikas/reviews/${reviewId}`, token }),
    getAnalytics: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: any }>({ url: '/api/ikas/analytics', token, data: params }),
    getEmailLogs: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: any }>({ url: '/api/ikas/email-logs', token, data: params }),
  },
};
```

- [ ] **Step 4: Test the OAuth flow**

```bash
pnpm dev
```

Navigate to `/authorize-store` and verify the OAuth flow redirects to ikas and back. Verify that `StoreSettings` and `WidgetSettings` rows are created in the database.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add OAuth flow and app install lifecycle"
```

---

### Task 3: Webhook handler for order-created

Receive `store/order/created` webhooks, validate HMAC signature, and schedule review request emails in the EmailLog table.

**Files:**
- Create: `src/app/api/webhook/order-created/route.ts`
- Create: `src/lib/r2.ts` (placeholder for now — needed later)

**Interfaces:**
- Consumes: `prisma`, `StoreSettings` model, `EmailLog` model
- Produces: `POST /api/webhook/order-created` — creates EmailLog entries with scheduledAt = orderDate + emailDelay days
- Produces: Each EmailLog has a unique `reviewToken` (UUID v4) and `expiresAt` (30 days from now)

- [ ] **Step 1: Create the webhook handler**

Create `src/app/api/webhook/order-created/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const clientSecret = process.env.CLIENT_SECRET;
  if (!clientSecret) {
    console.error('[webhook/order-created] CLIENT_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const rawBody = await request.text();

  const signature =
    request.headers.get('x-ikas-signature') ??
    request.headers.get('x-ikas-hmac-sha256');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );

  if (!isValid) {
    console.warn('[webhook/order-created] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const merchantId = (payload.merchantId ?? payload.merchant_id ??
    (payload.store as Record<string, unknown>)?.merchantId) as string | undefined;
  if (!merchantId) {
    return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { merchantId },
  });

  if (!settings || !settings.isActive || !settings.emailEnabled) {
    return NextResponse.json({ status: 'ok', skipped: true, reason: 'emails disabled or store not found' });
  }

  const order = (payload.order ?? payload.data ?? payload) as Record<string, unknown>;
  const orderId = (order.id ?? order.orderId ?? payload.id) as string | undefined;
  if (!orderId) {
    return NextResponse.json({ status: 'ok', skipped: true, reason: 'no orderId' });
  }

  const customerEmail = (order.customerEmail ??
    (order.customer as Record<string, unknown>)?.email ??
    order.email) as string | undefined;
  if (!customerEmail) {
    return NextResponse.json({ status: 'ok', skipped: true, reason: 'no customer email' });
  }

  const shippingAddress = order.shippingAddress as Record<string, unknown> | undefined;
  const billingAddress = order.billingAddress as Record<string, unknown> | undefined;
  const customerName =
    (shippingAddress?.firstName as string) ??
    (billingAddress?.firstName as string) ??
    (order.customerFirstName as string) ??
    'Değerli Müşterimiz';

  const lineItems = (order.orderLineItems ?? order.lineItems ?? order.items ?? []) as Array<Record<string, unknown>>;
  const orderDate = order.createdAt ? new Date(order.createdAt as string) : new Date();

  const scheduledAt = new Date(orderDate);
  scheduledAt.setDate(scheduledAt.getDate() + settings.emailDelay);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create one EmailLog per order (not per line item — one email covers all products)
  const existingLog = await prisma.emailLog.findFirst({
    where: { merchantId, orderId, type: 'request' },
  });

  if (existingLog) {
    return NextResponse.json({ status: 'ok', skipped: true, reason: 'email already scheduled' });
  }

  await prisma.emailLog.create({
    data: {
      merchantId,
      orderId,
      customerEmail,
      type: 'request',
      status: 'scheduled',
      scheduledAt,
      reviewToken: uuidv4(),
      expiresAt,
    },
  });

  return NextResponse.json({ status: 'ok', scheduled: true });
}
```

- [ ] **Step 2: Test with a manual curl**

```bash
# Generate test signature
echo -n '{"merchantId":"test-merchant","order":{"id":"order-1","customerEmail":"test@test.com","customerFirstName":"Ali","createdAt":"2026-08-31T10:00:00Z","orderLineItems":[{"productId":"p1","productName":"Test Product"}]}}' | openssl dgst -sha256 -hmac "YOUR_CLIENT_SECRET" | awk '{print $2}'

# Send test webhook
curl -X POST http://localhost:3000/api/webhook/order-created \
  -H "Content-Type: application/json" \
  -H "x-ikas-hmac-sha256: <SIGNATURE>" \
  -d '{"merchantId":"test-merchant","order":{"id":"order-1","customerEmail":"test@test.com","customerFirstName":"Ali","createdAt":"2026-08-31T10:00:00Z","orderLineItems":[{"productId":"p1","productName":"Test Product"}]}}'
```

Verify EmailLog row created in database with `pnpm prisma studio`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhook/order-created/route.ts
git commit -m "feat: add order-created webhook handler with email scheduling"
```

---

### Task 4: R2 media storage and presigned uploads

Set up Cloudflare R2 integration for photo uploads with presigned URLs.

**Files:**
- Create: `src/lib/r2.ts`
- Create: `src/app/api/reviews/upload-url/route.ts`

**Interfaces:**
- Consumes: R2 env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`)
- Produces: `getR2Client()` → S3Client configured for R2
- Produces: `generatePresignedUploadUrl(key, contentType)` → `{ uploadUrl, publicUrl }`
- Produces: `POST /api/reviews/upload-url` → returns presigned PUT URL for direct client upload

- [ ] **Step 1: Create R2 client library**

Create `src/lib/r2.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Error(`Invalid content type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    ContentLength: MAX_FILE_SIZE,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
}

export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
}

export function getR2KeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl || !url.startsWith(publicUrl)) return null;
  return url.slice(publicUrl.length + 1);
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
```

- [ ] **Step 2: Create upload URL endpoint**

Create `src/app/api/reviews/upload-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl, ALLOWED_MIME_TYPES } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: { merchantId?: string; contentType?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const { merchantId, contentType, fileName } = body;

  if (!merchantId || !contentType) {
    return NextResponse.json(
      { error: 'merchantId and contentType are required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const mediaId = uuidv4();
  const key = `reviews/${merchantId}/pending/${mediaId}.${ext}`;

  try {
    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, publicUrl, mediaId }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[upload-url] Failed to generate presigned URL:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/r2.ts src/app/api/reviews/upload-url/route.ts
git commit -m "feat: add R2 media storage with presigned upload URLs"
```

---

### Task 5: Review submission API and hosted form page

Build the review submission endpoint and the public-facing review form page that customers land on from email links.

**Files:**
- Create: `src/app/api/reviews/submit/route.ts`
- Create: `src/app/review/[token]/page.tsx`
- Create: `src/components/review-form/review-form.tsx`
- Create: `src/components/review-form/star-input.tsx`
- Create: `src/components/review-form/photo-upload.tsx`
- Create: `src/lib/rating-cache.ts`

**Interfaces:**
- Consumes: `prisma`, `EmailLog.reviewToken`, R2 presigned upload
- Produces: `POST /api/reviews/submit` — creates Review + ReviewMedia, updates ProductRatingCache
- Produces: `/review/:token` — public review form page
- Produces: `recalculateProductRating(merchantId, productId)` — updates ProductRatingCache

- [ ] **Step 1: Create rating cache utility**

Create `src/lib/rating-cache.ts`:

```typescript
import { prisma } from './prisma';

export async function recalculateProductRating(merchantId: string, productId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { merchantId, productId, status: 'published' },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    await prisma.productRatingCache.deleteMany({
      where: { merchantId, productId },
    });
    return;
  }

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let sum = 0;
  for (const r of reviews) {
    distribution[String(r.rating)]++;
    sum += r.rating;
  }

  const averageRating = Math.round((sum / reviews.length) * 10) / 10;

  await prisma.productRatingCache.upsert({
    where: { merchantId_productId: { merchantId, productId } },
    create: {
      merchantId,
      productId,
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution: JSON.stringify(distribution),
    },
    update: {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution: JSON.stringify(distribution),
    },
  });
}
```

- [ ] **Step 2: Create review submission endpoint**

Create `src/app/api/reviews/submit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateProductRating } from '@/lib/rating-cache';
import { v4 as uuidv4 } from 'uuid';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: {
    reviewToken?: string;
    merchantId?: string;
    productId?: string;
    productName?: string;
    productImage?: string;
    productHref?: string;
    orderId?: string;
    customerName?: string;
    customerEmail?: string;
    rating?: number;
    title?: string;
    body?: string;
    photos?: Array<{ url: string; width?: number; height?: number; sizeBytes?: number }>;
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const { rating, title, body: reviewBody, photos } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!reviewBody || reviewBody.trim().length < 10) {
    return NextResponse.json({ error: 'Review body must be at least 10 characters' }, { status: 400, headers: CORS_HEADERS });
  }

  if (photos && photos.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 photos allowed' }, { status: 400, headers: CORS_HEADERS });
  }

  let merchantId: string;
  let productId: string;
  let productName: string;
  let productImage: string | null = null;
  let productHref: string | null = null;
  let orderId: string | null = null;
  let customerName: string;
  let customerEmail: string;
  let isVerifiedPurchase = false;
  let source = 'form';

  // Token-based submission (from email link)
  if (body.reviewToken) {
    const emailLog = await prisma.emailLog.findUnique({
      where: { reviewToken: body.reviewToken },
    });

    if (!emailLog) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400, headers: CORS_HEADERS });
    }

    if (emailLog.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400, headers: CORS_HEADERS });
    }

    merchantId = emailLog.merchantId;
    orderId = emailLog.orderId;
    customerEmail = emailLog.customerEmail;
    customerName = body.customerName || 'Müşteri';
    productId = body.productId || '';
    productName = body.productName || '';
    productImage = body.productImage || null;
    productHref = body.productHref || null;
    isVerifiedPurchase = true;
    source = 'email';
  } else {
    // Direct form submission (from widget)
    if (!body.merchantId || !body.productId || !body.customerEmail || !body.customerName) {
      return NextResponse.json(
        { error: 'merchantId, productId, customerEmail, and customerName are required' },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    merchantId = body.merchantId;
    productId = body.productId;
    productName = body.productName || '';
    productImage = body.productImage || null;
    productHref = body.productHref || null;
    customerName = body.customerName;
    customerEmail = body.customerEmail;
    source = body.source || 'form';
  }

  // Duplicate check
  const existingReview = await prisma.review.findFirst({
    where: { customerEmail, productId, ...(orderId ? { orderId } : {}) },
  });

  if (existingReview) {
    return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409, headers: CORS_HEADERS });
  }

  // Get store settings for auto-publish
  const settings = await prisma.storeSettings.findUnique({
    where: { merchantId },
  });

  const status = settings?.autoPublish ? 'published' : 'pending';
  const publishedAt = settings?.autoPublish ? new Date() : null;

  // Create review
  const review = await prisma.review.create({
    data: {
      merchantId,
      productId,
      productName,
      productImage,
      productHref,
      orderId,
      customerName,
      customerEmail,
      rating,
      title: title || null,
      body: reviewBody.trim(),
      isVerifiedPurchase,
      status,
      source,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      publishedAt,
    },
  });

  // Create media records
  if (photos && photos.length > 0) {
    await prisma.reviewMedia.createMany({
      data: photos.map((photo, index) => ({
        reviewId: review.id,
        type: 'photo',
        url: photo.url,
        width: photo.width || null,
        height: photo.height || null,
        sizeBytes: photo.sizeBytes || 0,
        sortOrder: index,
      })),
    });
  }

  // Mark email token as used (by setting expiresAt to now)
  if (body.reviewToken) {
    await prisma.emailLog.update({
      where: { reviewToken: body.reviewToken },
      data: { expiresAt: new Date() },
    });
  }

  // Update rating cache if published
  if (status === 'published') {
    await recalculateProductRating(merchantId, productId);
  }

  // Handle coupon if enabled and has photos
  let couponCode: string | null = null;
  if (settings?.couponEnabled && photos && photos.length > 0) {
    couponCode = `REV-${uuidv4().slice(0, 8).toUpperCase()}`;
    const couponExpiry = new Date();
    couponExpiry.setDate(couponExpiry.getDate() + (settings.couponExpiryDays || 30));

    await prisma.couponUsage.create({
      data: {
        merchantId,
        reviewId: review.id,
        couponCode,
        discountType: settings.couponType,
        discountValue: settings.couponValue,
        expiresAt: couponExpiry,
      },
    });
  }

  return NextResponse.json({
    status: 'ok',
    reviewId: review.id,
    reviewStatus: status,
    couponCode,
  }, { headers: CORS_HEADERS });
}
```

- [ ] **Step 3: Create the review form page**

Create `src/app/review/[token]/page.tsx` — a public-facing page (not an iframe) where customers submit reviews. This page:
1. Validates the token via an API call
2. Shows product info from the order
3. Has star rating selector, title input, body textarea, photo upload area
4. Submits to `POST /api/reviews/submit`
5. Shows thank-you message (and coupon code if applicable)

This is a client component using React state for the form. It calls `/api/reviews/upload-url` for presigned URLs and uploads photos directly to R2 before submitting the review.

Create `src/components/review-form/star-input.tsx` — a 1-5 star rating component using SVG stars with hover and click states.

Create `src/components/review-form/photo-upload.tsx` — a drag-and-drop / click-to-upload component that:
1. Accepts JPEG/PNG/WebP up to 10MB
2. Shows preview thumbnails
3. Calls `/api/reviews/upload-url` to get presigned URL
4. Uploads directly to R2
5. Returns array of `{ url, width, height, sizeBytes }` to parent form

- [ ] **Step 4: Create token validation endpoint**

Create `src/app/api/reviews/validate-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400, headers: CORS_HEADERS });
  }

  const emailLog = await prisma.emailLog.findUnique({
    where: { reviewToken: token },
    include: { store: true },
  });

  if (!emailLog) {
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { headers: CORS_HEADERS });
  }

  if (emailLog.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Token expired' }, { headers: CORS_HEADERS });
  }

  return NextResponse.json({
    valid: true,
    merchantId: emailLog.merchantId,
    orderId: emailLog.orderId,
    customerEmail: emailLog.customerEmail,
    brandColor: emailLog.store.brandColor,
    couponEnabled: emailLog.store.couponEnabled,
    couponType: emailLog.store.couponType,
    couponValue: emailLog.store.couponValue,
  }, { headers: CORS_HEADERS });
}
```

- [ ] **Step 5: Test the submission flow end-to-end**

1. Create a test EmailLog entry via Prisma Studio
2. Visit `/review/:token` in browser
3. Fill form, upload a test photo, submit
4. Verify Review + ReviewMedia rows created in database
5. Verify ProductRatingCache updated (if auto-publish is on)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add review submission API and hosted review form"
```

---

### Task 6: Email sending with Resend and Vercel Cron

Set up the cron job that processes scheduled emails and the Resend integration with React Email templates.

**Files:**
- Create: `src/app/api/cron/send-review-emails/route.ts`
- Create: `src/emails/review-request.tsx`
- Create: `src/lib/email.ts`
- Create: `vercel.json` (cron config)

**Interfaces:**
- Consumes: `prisma.emailLog` (status=scheduled, scheduledAt<=now), `Resend` API, `StoreSettings`
- Produces: `GET /api/cron/send-review-emails` — processes due emails, sends via Resend, updates EmailLog status
- Produces: `sendReviewRequestEmail(emailLog, settings)` — sends one email
- Produces: React Email template for review request

- [ ] **Step 1: Create email sending library**

Create `src/lib/email.ts`:

```typescript
import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}
```

- [ ] **Step 2: Create React Email template**

Create `src/emails/review-request.tsx` — a React Email template for the review request email.

The template receives these props:
- `customerName: string`
- `products: Array<{ name: string; image?: string }>`
- `reviewUrl: string` — link to `/review/:token`
- `brandColor: string`
- `storeName: string`
- `couponEnabled: boolean`
- `couponType: string`
- `couponValue: number`

Layout:
1. Store name header with brandColor
2. "Merhaba {customerName}," greeting
3. Product cards with images and names
4. 5 clickable star icons (each links to reviewUrl with `?rating=N` pre-selected)
5. "Yorum Yaz" CTA button
6. If coupon enabled: "Fotoğraflı yorum bırakın, %{couponValue} indirim kazanın!" banner
7. Footer with unsubscribe text

Use `@react-email/components` for `Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Img`, `Link`.

```bash
pnpm add @react-email/components
```

- [ ] **Step 3: Create cron handler**

Create `src/app/api/cron/send-review-emails/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getResend } from '@/lib/email';
import { render } from '@react-email/components';
import ReviewRequestEmail from '@/emails/review-request';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueEmails = await prisma.emailLog.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
    include: { store: true },
    take: 50, // Process in batches
  });

  if (dueEmails.length === 0) {
    return NextResponse.json({ status: 'ok', sent: 0 });
  }

  const resend = getResend();
  let sentCount = 0;
  let failCount = 0;

  for (const email of dueEmails) {
    const deployUrl = process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://app-name-product-reviews.vercel.app';
    const reviewUrl = `${deployUrl}/review/${email.reviewToken}`;

    const fromName = email.store.emailFromName || 'Mağaza';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'reviews@mail.app-domain.com';

    try {
      const html = await render(
        ReviewRequestEmail({
          customerName: email.customerEmail.split('@')[0],
          products: [], // Will be enriched with order line items in future
          reviewUrl,
          brandColor: email.store.brandColor,
          storeName: fromName,
          couponEnabled: email.store.couponEnabled,
          couponType: email.store.couponType,
          couponValue: email.store.couponValue,
        }),
      );

      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email.customerEmail,
        subject: email.store.emailSubject,
        html,
      });

      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      sentCount++;
    } catch (error) {
      console.error(`[cron/send-emails] Failed to send to ${email.customerEmail}:`, error);

      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: 'failed' },
      });

      failCount++;
    }
  }

  return NextResponse.json({ status: 'ok', sent: sentCount, failed: failCount });
}
```

- [ ] **Step 4: Add Vercel cron configuration**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-review-emails",
      "schedule": "0 * * * *"
    }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add email sending with Resend cron job and React Email template"
```

---

### Task 7: Widget API endpoints

Build the public API endpoints that the storefront widget consumes — reviews for a product, batch ratings, product slug lookup.

**Files:**
- Create: `src/app/api/widget/reviews/[merchantId]/route.ts`
- Create: `src/app/api/widget/ratings/[merchantId]/route.ts`
- Create: `src/app/api/widget/product-lookup/[merchantId]/route.ts`

**Interfaces:**
- Consumes: `prisma`, `ProductRatingCache`, `Review`, `ReviewMedia`, `WidgetSettings`
- Produces: `GET /api/widget/reviews/:merchantId?productId=xxx&page=1&limit=10&sort=newest&rating=5&hasPhotos=true`
- Produces: `GET /api/widget/ratings/:merchantId?productIds=id1,id2,id3`
- Produces: `GET /api/widget/product-lookup/:merchantId?slug=xxx`

- [ ] **Step 1: Create reviews widget endpoint**

Create `src/app/api/widget/reviews/[merchantId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=60',
  'Access-Control-Allow-Origin': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId } = await params;

  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400, headers: CACHE_HEADERS });
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10', 10), 50);
  const sort = request.nextUrl.searchParams.get('sort') || 'newest';
  const ratingFilter = request.nextUrl.searchParams.get('rating');
  const hasPhotos = request.nextUrl.searchParams.get('hasPhotos') === 'true';

  // Get widget settings
  const widgetSettings = await prisma.widgetSettings.findUnique({
    where: { merchantId },
  });

  if (!widgetSettings || !widgetSettings.reviewsWidgetEnabled) {
    return NextResponse.json({ error: 'Widget disabled' }, { status: 404, headers: CACHE_HEADERS });
  }

  // Build filter
  const where: Record<string, unknown> = {
    merchantId,
    productId,
    status: 'published',
  };

  if (ratingFilter) {
    where.rating = parseInt(ratingFilter, 10);
  }

  if (hasPhotos) {
    where.media = { some: {} };
  }

  // Sort
  let orderBy: Record<string, string>;
  switch (sort) {
    case 'highest': orderBy = { rating: 'desc' }; break;
    case 'lowest': orderBy = { rating: 'asc' }; break;
    case 'photos-first': orderBy = { createdAt: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
          select: { url: true, thumbnailUrl: true, width: true, height: true, type: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  // Get summary from cache
  const ratingCache = await prisma.productRatingCache.findUnique({
    where: { merchantId_productId: { merchantId, productId } },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    settings: {
      layout: widgetSettings.reviewsLayout,
      showHeader: widgetSettings.showReviewsHeader,
      showFilters: widgetSettings.showFilters,
      showPhotos: widgetSettings.showPhotos,
      starColor: widgetSettings.starColor,
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isVerifiedPurchase: r.isVerifiedPurchase,
      photos: r.media.filter((m) => m.type === 'photo').map((m) => ({
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        width: m.width,
        height: m.height,
      })),
      merchantReply: r.merchantReply,
      merchantReplyAt: r.merchantReplyAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    })),
    summary: ratingCache ? {
      averageRating: ratingCache.averageRating,
      totalReviews: ratingCache.totalReviews,
      distribution: JSON.parse(ratingCache.ratingDistribution),
    } : {
      averageRating: 0,
      totalReviews: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    },
    pagination: { page, totalPages, hasMore: page < totalPages },
  }, { headers: CACHE_HEADERS });
}
```

- [ ] **Step 2: Create batch ratings endpoint**

Create `src/app/api/widget/ratings/[merchantId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=60',
  'Access-Control-Allow-Origin': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId } = await params;

  const productIdsParam = request.nextUrl.searchParams.get('productIds');
  if (!productIdsParam) {
    return NextResponse.json({ error: 'productIds required' }, { status: 400, headers: CACHE_HEADERS });
  }

  const productIds = productIdsParam.split(',').slice(0, 100); // Max 100 products per request

  const widgetSettings = await prisma.widgetSettings.findUnique({
    where: { merchantId },
  });

  if (!widgetSettings || !widgetSettings.starRatingEnabled) {
    return NextResponse.json({ error: 'Widget disabled' }, { status: 404, headers: CACHE_HEADERS });
  }

  const caches = await prisma.productRatingCache.findMany({
    where: { merchantId, productId: { in: productIds } },
  });

  const ratingsMap: Record<string, { average: number; count: number } | null> = {};
  for (const pid of productIds) {
    const cache = caches.find((c) => c.productId === pid);
    ratingsMap[pid] = cache ? { average: cache.averageRating, count: cache.totalReviews } : null;
  }

  return NextResponse.json({
    ratings: ratingsMap,
    settings: {
      style: widgetSettings.starRatingStyle,
      starColor: widgetSettings.starColor,
      emptyStarBehavior: widgetSettings.emptyStarBehavior,
    },
  }, { headers: CACHE_HEADERS });
}
```

- [ ] **Step 3: Create product slug lookup endpoint**

Create `src/app/api/widget/product-lookup/[merchantId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthTokenManager } from '@/models/auth-token/manager';
import { getIkas } from '@/helpers/api-helpers';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  'Access-Control-Allow-Origin': '*',
};

// In-memory cache for slug lookups (1 hour TTL)
const slugCache = new Map<string, { productId: string; expiresAt: number }>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId } = await params;
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400, headers: CACHE_HEADERS });
  }

  const cacheKey = `${merchantId}:${slug}`;
  const cached = slugCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ productId: cached.productId }, { headers: CACHE_HEADERS });
  }

  // Look up via ikas GraphQL API
  const authToken = await prisma.authToken.findFirst({
    where: { merchantId, deleted: false },
  });

  if (!authToken) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: CACHE_HEADERS });
  }

  const token = AuthTokenManager['toModel'](authToken);
  const ikasClient = getIkas(token);

  try {
    const response = await ikasClient.queries.listProduct({
      where: { slug: { eq: slug } },
      pagination: { page: 1, limit: 1 },
    });

    if (!response.isSuccess || !response.data?.listProduct?.data?.[0]) {
      return NextResponse.json({ productId: null }, { headers: CACHE_HEADERS });
    }

    const productId = response.data.listProduct.data[0].id;

    // Cache for 1 hour
    slugCache.set(cacheKey, { productId, expiresAt: Date.now() + 3600000 });

    return NextResponse.json({ productId }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[product-lookup] Failed:', error);
    return NextResponse.json({ productId: null }, { headers: CACHE_HEADERS });
  }
}
```

Note: The `listProduct` query with `slug` filter needs to be added to `graphql-requests.ts` and codegen run. Add this query:

```graphql
query ListProduct($where: ProductWhereInput, $pagination: PaginationInput) {
  listProduct(where: $where, pagination: $pagination) {
    data {
      id
      name
      slug
      mainImageId
      images { id isMain url }
    }
    count
  }
}
```

Then run `pnpm codegen`.

- [ ] **Step 4: Test all widget endpoints**

```bash
# Test reviews endpoint
curl "http://localhost:3000/api/widget/reviews/TEST_MERCHANT_ID?productId=TEST_PRODUCT_ID&page=1"

# Test batch ratings
curl "http://localhost:3000/api/widget/ratings/TEST_MERCHANT_ID?productIds=pid1,pid2"

# Test product lookup
curl "http://localhost:3000/api/widget/product-lookup/TEST_MERCHANT_ID?slug=test-product"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add widget API endpoints (reviews, ratings, product lookup)"
```

---

### Task 8: Admin API endpoints (reviews management, settings)

Build the authenticated admin API endpoints for the iframe dashboard — CRUD reviews, settings, reply, status changes.

**Files:**
- Create: `src/app/api/ikas/settings/route.ts`
- Create: `src/app/api/ikas/settings/store/route.ts`
- Create: `src/app/api/ikas/settings/widget/route.ts`
- Create: `src/app/api/ikas/reviews/route.ts`
- Create: `src/app/api/ikas/reviews/[id]/route.ts`
- Create: `src/app/api/ikas/reviews/status/route.ts`
- Create: `src/app/api/ikas/reviews/reply/route.ts`
- Create: `src/app/api/ikas/email-logs/route.ts`
- Create: `src/app/api/ikas/analytics/route.ts`

**Interfaces:**
- Consumes: `getUserFromRequest()`, `prisma`, `recalculateProductRating()`
- Produces: `GET /api/ikas/settings` — returns StoreSettings + WidgetSettings
- Produces: `PUT /api/ikas/settings/store` — updates StoreSettings
- Produces: `PUT /api/ikas/settings/widget` — updates WidgetSettings
- Produces: `GET /api/ikas/reviews?status=pending&page=1&limit=20` — paginated reviews list
- Produces: `DELETE /api/ikas/reviews/:id` — delete a review
- Produces: `POST /api/ikas/reviews/status` — bulk update review status (publish/reject)
- Produces: `POST /api/ikas/reviews/reply` — add merchant reply to a review
- Produces: `GET /api/ikas/email-logs?page=1&limit=20` — paginated email log
- Produces: `GET /api/ikas/analytics?days=30` — review analytics summary

- [ ] **Step 1: Create settings endpoints**

`GET /api/ikas/settings` returns both StoreSettings and WidgetSettings for the authenticated merchant.

`PUT /api/ikas/settings/store` accepts partial StoreSettings update.

`PUT /api/ikas/settings/widget` accepts partial WidgetSettings update.

All validate JWT via `getUserFromRequest()`.

- [ ] **Step 2: Create reviews CRUD endpoints**

`GET /api/ikas/reviews` — list reviews with filters (status, productId, rating, hasPhotos, dateRange). Includes media. Paginated.

`DELETE /api/ikas/reviews/:id` — soft delete (or hard delete) a review. Recalculate rating cache.

`POST /api/ikas/reviews/status` — accepts `{ reviewIds: string[], status: 'published' | 'rejected' }`. Updates each review, sets `publishedAt` when publishing. Recalculates rating cache for affected products.

`POST /api/ikas/reviews/reply` — accepts `{ reviewId: string, reply: string }`. Sets `merchantReply` and `merchantReplyAt`.

- [ ] **Step 3: Create email logs endpoint**

`GET /api/ikas/email-logs` — returns paginated EmailLog entries for the merchant with status, dates, customerEmail.

- [ ] **Step 4: Create analytics endpoint**

`GET /api/ikas/analytics?days=30` — returns:
- Total reviews, average rating, response rate, photo review %, email conversion rate
- Reviews per day trend
- Rating distribution
- Top reviewed products

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { merchantId } = user;

  const [totalReviews, publishedReviews, photoReviews, repliedReviews, totalEmails, convertedEmails] = await Promise.all([
    prisma.review.count({ where: { merchantId } }),
    prisma.review.findMany({
      where: { merchantId, status: 'published', createdAt: { gte: since } },
      select: { rating: true, createdAt: true, productId: true, productName: true },
    }),
    prisma.review.count({ where: { merchantId, media: { some: {} } } }),
    prisma.review.count({ where: { merchantId, merchantReply: { not: null } } }),
    prisma.emailLog.count({ where: { merchantId, status: 'sent' } }),
    prisma.review.count({ where: { merchantId, source: 'email' } }),
  ]);

  const avgRating = publishedReviews.length > 0
    ? Math.round((publishedReviews.reduce((sum, r) => sum + r.rating, 0) / publishedReviews.length) * 10) / 10
    : 0;

  // Daily trend
  const dailyMap = new Map<string, number>();
  for (const r of publishedReviews) {
    const dateKey = r.createdAt.toISOString().split('T')[0];
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Rating distribution
  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const r of publishedReviews) {
    distribution[String(r.rating)]++;
  }

  // Top products
  const productMap = new Map<string, { name: string; count: number; sumRating: number }>();
  for (const r of publishedReviews) {
    const entry = productMap.get(r.productId) || { name: r.productName, count: 0, sumRating: 0 };
    entry.count++;
    entry.sumRating += r.rating;
    productMap.set(r.productId, entry);
  }
  const topProducts = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      reviewCount: data.count,
      averageRating: Math.round((data.sumRating / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10);

  return NextResponse.json({
    data: {
      summary: {
        totalReviews,
        averageRating: avgRating,
        responseRate: totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0,
        photoReviewPercent: totalReviews > 0 ? Math.round((photoReviews / totalReviews) * 100) : 0,
        emailConversionRate: totalEmails > 0 ? Math.round((convertedEmails / totalEmails) * 100) : 0,
      },
      daily,
      distribution,
      topProducts,
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin API endpoints (reviews CRUD, settings, analytics)"
```

---

### Task 9: Admin dashboard UI (iframe)

Build the iframe admin dashboard with five tabs: Reviews, Email Collection, Widget Settings, Import/Export, Analytics.

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/dashboard-tabs.tsx`
- Create: `src/components/dashboard/reviews-tab.tsx`
- Create: `src/components/dashboard/review-card.tsx`
- Create: `src/components/dashboard/review-reply-form.tsx`
- Create: `src/components/dashboard/email-settings-tab.tsx`
- Create: `src/components/dashboard/widget-settings-tab.tsx`
- Create: `src/components/dashboard/import-export-tab.tsx`
- Create: `src/components/dashboard/analytics-tab.tsx`
- Create: `src/components/dashboard/star-display.tsx`

**Interfaces:**
- Consumes: `ApiRequests.ikas.*`, `TokenHelpers.getTokenForIframeApp()`, `AppBridgeHelper.closeLoader()`
- Produces: Full admin dashboard UI with all 5 tabs

- [ ] **Step 1: Create dashboard page shell**

Create `src/app/dashboard/page.tsx` following the Sales Notifications iframe pattern:
- Call `AppBridgeHelper.closeLoader()` on mount
- Get token via `TokenHelpers.getTokenForIframeApp()`
- Fetch settings, pass to tabs
- Handle loading/error states

- [ ] **Step 2: Create dashboard tabs component**

Create `src/components/dashboard/dashboard-tabs.tsx` with 5 tabs:
1. Yorumlar (Reviews)
2. E-posta Toplama (Email Collection)
3. Widget Ayarları (Widget Settings)
4. İçe/Dışa Aktar (Import/Export)
5. Analiz (Analytics)

- [ ] **Step 3: Build Reviews tab**

Create `src/components/dashboard/reviews-tab.tsx`:
- Status tabs (Tümü / Bekleyen / Yayında / Reddedilen)
- Checkbox bulk selection + bulk actions bar (Yayınla, Reddet, Sil)
- Review cards with: customer name, stars, title preview, body preview, product, photos thumbnails, verified badge, date, status badge
- Click to expand: full review + reply form
- Pagination

Create `src/components/dashboard/review-card.tsx` for individual review display.

Create `src/components/dashboard/review-reply-form.tsx` for inline merchant reply.

Create `src/components/dashboard/star-display.tsx` — reusable star display component (read-only).

- [ ] **Step 4: Build Email Collection tab**

Create `src/components/dashboard/email-settings-tab.tsx`:
- Email toggle, delay input, subject input, from name input
- Coupon section: enable toggle, type selector, value input, min purchase, expiry days
- Reminder toggle + delay
- Brand color picker
- Recent email logs table (paginated)

- [ ] **Step 5: Build Widget Settings tab**

Create `src/components/dashboard/widget-settings-tab.tsx`:
- Accordion sections for each widget type
- Reviews Widget: enable, layout, per page, sort, show header/filters/photos, star color
- Star Rating: enable, style, empty behavior, star color
- Trust Badge: enable, position
- Carousel: enable, autoplay, speed

- [ ] **Step 6: Build Import/Export tab (P2 — skeleton only)**

Create `src/components/dashboard/import-export-tab.tsx`:
- CSV upload zone with field mapping UI (placeholder for P2)
- Export button (placeholder for P2)
- "Yakında" (Coming Soon) labels

- [ ] **Step 7: Build Analytics tab**

Create `src/components/dashboard/analytics-tab.tsx`:
- Date range selector (7 / 30 / 90 / all)
- Summary cards: total reviews, average rating, response rate, photo %, email conversion
- Reviews trend chart (recharts Line)
- Rating distribution bar chart (recharts Bar)
- Top products table

- [ ] **Step 8: Test dashboard in ikas admin panel**

Run dev server, navigate to dashboard page in an iframe context (or directly). Verify all tabs render, data loads, settings save, review moderation works.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard with reviews, email, widget settings, and analytics"
```

---

### Task 10: Storefront widget — Reviews List + Star Rating (P0)

Build the vanilla JS storefront widget that renders the Reviews List on product pages and Star Rating badges on collection pages.

**Files:**
- Create: `widget/src/index.ts`
- Create: `widget/src/api.ts`
- Create: `widget/src/reviews-widget.ts`
- Create: `widget/src/star-rating-widget.ts`
- Create: `widget/src/components/stars.ts`
- Create: `widget/src/components/review-card.ts`
- Create: `widget/src/components/lightbox.ts`
- Create: `widget/src/components/review-form-modal.ts`
- Create: `widget/src/styles.ts`
- Create: `widget/src/utils.ts`

**Interfaces:**
- Consumes: `GET /api/widget/reviews/:merchantId`, `GET /api/widget/ratings/:merchantId`, `GET /api/widget/product-lookup/:merchantId`
- Produces: `reviews-widget.js` — single bundled file injected into storefronts via `<script>` tag
- Produces: Reviews List widget on product pages (Shadow DOM)
- Produces: Star Rating badges on collection pages (Shadow DOM)

- [ ] **Step 1: Create widget entry point**

Create `widget/src/index.ts`:

```typescript
import { fetchWidgetSettings, fetchProductReviews, fetchBatchRatings, lookupProductId } from './api';
import { renderReviewsWidget } from './reviews-widget';
import { renderStarRatings } from './star-rating-widget';

(function () {
  if ((window as any).__pr_widget_loaded) return;
  (window as any).__pr_widget_loaded = true;

  const scriptEl = document.currentScript as HTMLScriptElement | null;
  if (!scriptEl) return;

  const scriptUrl = new URL(scriptEl.src);
  const merchantId = scriptUrl.searchParams.get('mid');
  if (!merchantId) return;

  const baseUrl = scriptUrl.origin;

  async function detectProductId(): Promise<string | null> {
    // Strategy 1: URL path parsing (/urun/slug)
    const pathMatch = window.location.pathname.match(/\/urun\/([^\/\?]+)/);
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
```

- [ ] **Step 2: Create API module**

Create `widget/src/api.ts` with functions:
- `fetchProductReviews(baseUrl, merchantId, productId, page, sort, ratingFilter, hasPhotos)` — calls reviews endpoint, caches in localStorage (5min TTL)
- `fetchBatchRatings(baseUrl, merchantId, productIds)` — calls ratings endpoint, caches in localStorage (5min TTL)
- `lookupProductId(baseUrl, merchantId, slug)` — calls product-lookup endpoint, caches in localStorage (1hr TTL)

Follow the same localStorage caching pattern as Sales Notifications `widget/src/api.ts`.

- [ ] **Step 3: Create reviews widget renderer**

Create `widget/src/reviews-widget.ts`:

```typescript
export async function renderReviewsWidget(baseUrl: string, merchantId: string, productId: string) {
  // 1. Find injection point on the page
  //    Look for: .product-detail, [data-reviews-target], or append after product description
  // 2. Create Shadow DOM host
  // 3. Fetch reviews from API
  // 4. Render header (average, distribution bars, "Yorum Yaz" button)
  // 5. Render filter bar (star filters, sort dropdown)
  // 6. Render review cards
  // 7. Render pagination ("Daha Fazla" button)
  // 8. "Yorum Yaz" button opens modal form
}
```

Key sub-components to create:
- `widget/src/components/stars.ts` — renders SVG star icons (filled/half/empty)
- `widget/src/components/review-card.ts` — renders a single review with photos, reply
- `widget/src/components/lightbox.ts` — fullscreen photo lightbox on photo click
- `widget/src/components/review-form-modal.ts` — modal form for writing a review from widget

- [ ] **Step 4: Create star rating widget renderer**

Create `widget/src/star-rating-widget.ts`:

```typescript
export async function renderStarRatings(baseUrl: string, merchantId: string) {
  // 1. Find all product cards on the page
  //    Look for: [data-product-id], .product-card, common ikas theme selectors
  // 2. Collect all product IDs
  // 3. Fetch batch ratings
  // 4. For each product card, inject a small star rating badge below the product name/price
  // 5. Use Intersection Observer to only process visible cards
  // 6. Observe DOM mutations for dynamically loaded products (infinite scroll)
}
```

- [ ] **Step 5: Create shared styles**

Create `widget/src/styles.ts` — CSS strings for all widget components. Uses `:host { all: initial; }` for Shadow DOM isolation. Responsive breakpoints. Configurable star color via CSS custom properties.

- [ ] **Step 6: Build and test the widget**

```bash
pnpm build:widget
```

Test by creating a test HTML page that loads the widget:

```html
<script src="http://localhost:3000/reviews-widget.js?mid=TEST_MERCHANT_ID" defer></script>
```

Verify:
- Reviews List renders on a page with `/urun/` in the URL
- Star ratings appear next to product cards
- Photos open in lightbox
- "Yorum Yaz" modal works
- Responsive on mobile

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add storefront widget (reviews list + star rating badges)"
```

---

### Task 11: Deploy to Vercel and end-to-end test

Deploy the app to Vercel, configure environment variables, connect to Coolify PostgreSQL, set up R2 bucket, and test the full flow.

**Files:**
- Modify: `vercel.json` (ensure cron config)
- Create: `.gitignore` (ensure proper ignores)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Live deployed app on Vercel
- Produces: Verified end-to-end flow: install → webhook → email → review → widget

- [ ] **Step 1: Create GitHub repo and push**

```bash
gh repo create RTNDigital/ikasreviewsapp --private --source=. --push
```

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect via Vercel dashboard for auto-deploy on push.

- [ ] **Step 3: Configure environment variables**

Set all env vars in Vercel:
- `DATABASE_URL` — Coolify PostgreSQL connection string
- `DATABASE_URL_UNPOOLED` — same (Coolify doesn't use connection pooling)
- `NEXT_PUBLIC_GRAPH_API_URL` — `https://api.myikas.com/api/admin/graphql`
- `NEXT_PUBLIC_ADMIN_URL` — `https://{storeName}.myikas.com/admin`
- `NEXT_PUBLIC_CLIENT_ID` — from ikas app dashboard
- `NEXT_PUBLIC_DEPLOY_URL` — Vercel deploy URL
- `CLIENT_SECRET` — from ikas app dashboard
- `SECRET_COOKIE_PASSWORD` — random 32-char string
- `JWT_SECRET` — random 32-char string
- `RESEND_API_KEY` — from Resend dashboard
- `RESEND_FROM_EMAIL` — verified sender email
- `R2_ACCOUNT_ID` — from Cloudflare dashboard
- `R2_ACCESS_KEY_ID` — R2 API token
- `R2_SECRET_ACCESS_KEY` — R2 API token secret
- `R2_BUCKET_NAME` — bucket name
- `R2_PUBLIC_URL` — R2 public bucket URL
- `CRON_SECRET` — random string for cron authentication

- [ ] **Step 4: Set up Cloudflare R2 bucket**

1. Create R2 bucket in Cloudflare dashboard
2. Enable public access (or configure custom domain)
3. Create API token with read/write permissions
4. Set CORS policy to allow uploads from Vercel domain

- [ ] **Step 5: Push database schema**

```bash
DATABASE_URL="postgresql://..." pnpm prisma db push
```

- [ ] **Step 6: Register app in ikas**

1. Create new app in ikas partner dashboard
2. Set OAuth callback URL to `https://app-domain.vercel.app/api/oauth/callback/ikas`
3. Register webhook: `store/order/created`
4. Get client ID and secret, update Vercel env vars

- [ ] **Step 7: Test full flow**

1. Install app on a test store via OAuth
2. Place a test order
3. Verify webhook received and EmailLog created
4. Manually trigger cron (`curl -H "Authorization: Bearer CRON_SECRET" https://app-domain.vercel.app/api/cron/send-review-emails`)
5. Check email received
6. Submit review via email link
7. Verify review appears in admin dashboard
8. Publish review, verify it appears on widget
9. Check star ratings on collection pages

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: deployment configuration and end-to-end adjustments"
```

---

## Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Project scaffold + DB schema | — |
| 2 | OAuth flow + app install | 1 |
| 3 | Webhook handler (order-created) | 1 |
| 4 | R2 media storage | 1 |
| 5 | Review submission API + form page | 1, 4 |
| 6 | Email sending (Resend + cron) | 1, 3, 5 |
| 7 | Widget API endpoints | 1 |
| 8 | Admin API endpoints | 1, 5 |
| 9 | Admin dashboard UI | 2, 8 |
| 10 | Storefront widget (Reviews + Stars) | 7 |
| 11 | Deploy + E2E test | All |

Tasks 3, 4, 7 can run in parallel after Task 1. Tasks 5 and 6 depend on earlier tasks. Tasks 9 and 10 are the two major UI tasks. Task 11 brings it all together.
