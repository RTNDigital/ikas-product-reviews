import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;

    let body: { reviewId?: string; reply?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { reviewId, reply } = body;

    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      return NextResponse.json({ error: 'reply is required' }, { status: 400 });
    }

    const review = await prisma.review.findFirst({ where: { id: reviewId, merchantId } });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        merchantReply: reply.trim(),
        merchantReplyAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ikas/reviews/reply] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
