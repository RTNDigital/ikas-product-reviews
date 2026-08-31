import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { recalculateProductRating } from '@/lib/rating-cache';

const VALID_STATUSES = ['published', 'rejected', 'pending'];

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;

    let body: { reviewIds?: string[]; status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { reviewIds, status } = body;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json({ error: 'reviewIds must be a non-empty array' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'status must be one of: published, rejected, pending' }, { status: 400 });
    }

    // Only touch reviews belonging to this merchant
    const reviews = await prisma.review.findMany({
      where: { id: { in: reviewIds }, merchantId },
      select: { id: true, productId: true },
    });

    if (reviews.length === 0) {
      return NextResponse.json({ error: 'No matching reviews found' }, { status: 404 });
    }

    const foundIds = reviews.map((r) => r.id);

    await prisma.review.updateMany({
      where: { id: { in: foundIds }, merchantId },
      data: {
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    // Recalculate rating cache for all affected products (dedupe)
    const productIds = Array.from(new Set(reviews.map((r) => r.productId)));
    await Promise.all(productIds.map((productId) => recalculateProductRating(merchantId, productId)));

    return NextResponse.json({ data: { updatedCount: foundIds.length, status } });
  } catch (error) {
    console.error('[ikas/reviews/status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
