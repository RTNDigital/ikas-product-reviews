import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { recalculateProductRating } from '@/lib/rating-cache';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;
    const { id } = await params;

    const review = await prisma.review.findFirst({ where: { id, merchantId } });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.review.delete({ where: { id } });

    if (review.status === 'published') {
      await recalculateProductRating(merchantId, review.productId);
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('[ikas/reviews/:id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
