import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { Prisma } from '@prisma/client';

const ALLOWED_FIELDS = [
  'reviewsWidgetEnabled',
  'reviewsLayout',
  'reviewsPerPage',
  'reviewsSortDefault',
  'showReviewsHeader',
  'showFilters',
  'showPhotos',
  'starRatingEnabled',
  'starRatingStyle',
  'starColor',
  'emptyStarBehavior',
  'trustBadgeEnabled',
  'trustBadgePosition',
  'carouselEnabled',
  'carouselAutoplay',
  'carouselSpeed',
] as const;

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        data[field] = body[field];
      }
    }

    const widgetSettings = await prisma.widgetSettings.upsert({
      where: { merchantId },
      create: { merchantId, ...data } as Prisma.WidgetSettingsCreateInput,
      update: data as Prisma.WidgetSettingsUpdateInput,
    });

    return NextResponse.json({ data: widgetSettings });
  } catch (error) {
    console.error('[ikas/settings/widget] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
