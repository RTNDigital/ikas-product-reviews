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

  try {
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
  } catch (error) {
    console.error('[widget/ratings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CACHE_HEADERS });
  }
}
