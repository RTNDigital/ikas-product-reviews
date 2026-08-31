import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400, headers: CORS_HEADERS });
  }

  const emailLog = await prisma.emailLog.findUnique({
    where: { reviewToken: token },
    include: { store: true },
  });

  if (!emailLog) {
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { headers: CORS_HEADERS });
  }

  if (emailLog.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Token expired' }, { headers: CORS_HEADERS });
  }

  return NextResponse.json({
    valid: true,
    merchantId: emailLog.merchantId,
    orderId: emailLog.orderId,
    customerEmail: emailLog.customerEmail,
    brandColor: emailLog.store.brandColor,
    couponEnabled: emailLog.store.couponEnabled,
    couponType: emailLog.store.couponType,
    couponValue: emailLog.store.couponValue,
  }, { headers: CORS_HEADERS });
}
