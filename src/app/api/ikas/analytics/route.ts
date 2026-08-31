import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('[ikas/analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
