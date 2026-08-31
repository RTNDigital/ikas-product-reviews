import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = user;

    const [storeSettings, widgetSettings] = await Promise.all([
      prisma.storeSettings.upsert({
        where: { merchantId },
        create: { merchantId },
        update: {},
      }),
      prisma.widgetSettings.upsert({
        where: { merchantId },
        create: { merchantId },
        update: {},
      }),
    ]);

    return NextResponse.json({ data: { storeSettings, widgetSettings } });
  } catch (error) {
    console.error('[ikas/settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
