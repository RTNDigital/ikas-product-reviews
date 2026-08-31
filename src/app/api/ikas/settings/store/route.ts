import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { Prisma } from '@prisma/client';

const ALLOWED_FIELDS = [
  'isActive',
  'autoPublish',
  'emailEnabled',
  'emailDelay',
  'emailTemplate',
  'emailSubject',
  'emailFromName',
  'couponEnabled',
  'couponType',
  'couponValue',
  'couponMinPurchase',
  'couponExpiryDays',
  'reminderEnabled',
  'reminderDelay',
  'brandColor',
  'widgetLanguage',
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

    const storeSettings = await prisma.storeSettings.upsert({
      where: { merchantId },
      create: { merchantId, ...data } as Prisma.StoreSettingsCreateInput,
      update: data as Prisma.StoreSettingsUpdateInput,
    });

    return NextResponse.json({ data: storeSettings });
  } catch (error) {
    console.error('[ikas/settings/store] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
