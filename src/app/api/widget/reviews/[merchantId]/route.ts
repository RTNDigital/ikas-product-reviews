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

  try {
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const limitParam = request.nextUrl.searchParams.get('limit');
    const ratingFilter = request.nextUrl.searchParams.get('rating');
    const hasPhotos = request.nextUrl.searchParams.get('hasPhotos') === 'true';

    // Get widget settings
    const widgetSettings = await prisma.widgetSettings.findUnique({
      where: { merchantId },
    });

    if (!widgetSettings || !widgetSettings.reviewsWidgetEnabled) {
      return NextResponse.json({ error: 'Widget disabled' }, { status: 404, headers: CACHE_HEADERS });
    }

    const limit = Math.min(
      Math.max(1, parseInt(limitParam || String(widgetSettings.reviewsPerPage), 10) || widgetSettings.reviewsPerPage),
      50,
    );
    const sort = request.nextUrl.searchParams.get('sort') || widgetSettings.reviewsSortDefault;

    // Build filter
    const where: Record<string, unknown> = {
      merchantId,
      productId,
      status: 'published',
    };

    if (ratingFilter) {
      const ratingNum = parseInt(ratingFilter, 10);
      if (ratingNum >= 1 && ratingNum <= 5) {
        where.rating = ratingNum;
      }
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
        reviewsPerPage: widgetSettings.reviewsPerPage,
        defaultSort: widgetSettings.reviewsSortDefault,
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
  } catch (error) {
    console.error('[widget/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CACHE_HEADERS });
  }
}
