import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;
    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20), 100);

    const status = searchParams.get('status');
    const productId = searchParams.get('productId');
    const rating = searchParams.get('rating');
    const hasPhotos = searchParams.get('hasPhotos') === 'true';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const where: Prisma.ReviewWhereInput = { merchantId };

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    if (rating) {
      const ratingNum = parseInt(rating, 10);
      if (ratingNum >= 1 && ratingNum <= 5) {
        where.rating = ratingNum;
      }
    }

    if (hasPhotos) {
      where.media = { some: {} };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { media: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      data: reviews,
      pagination: { page, limit, totalCount, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('[ikas/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
