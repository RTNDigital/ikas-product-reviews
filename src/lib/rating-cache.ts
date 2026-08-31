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
