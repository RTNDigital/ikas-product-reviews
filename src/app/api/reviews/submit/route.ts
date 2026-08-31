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
