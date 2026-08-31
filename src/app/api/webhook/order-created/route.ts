import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const clientSecret = process.env.CLIENT_SECRET;
    if (!clientSecret) {
      console.error('[webhook/order-created] CLIENT_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const rawBody = await request.text();

    const signature =
      request.headers.get('x-ikas-signature') ??
      request.headers.get('x-ikas-hmac-sha256');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isValid) {
      console.warn('[webhook/order-created] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const merchantId = (payload.merchantId ?? payload.merchant_id ??
      (payload.store as Record<string, unknown>)?.merchantId) as string | undefined;
    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const settings = await prisma.storeSettings.findUnique({
      where: { merchantId },
    });

    if (!settings || !settings.isActive || !settings.emailEnabled) {
      return NextResponse.json({ status: 'ok', skipped: true, reason: 'emails disabled or store not found' });
    }

    const order = (payload.order ?? payload.data ?? payload) as Record<string, unknown>;
    const orderId = (order.id ?? order.orderId ?? payload.id) as string | undefined;
    if (!orderId) {
      return NextResponse.json({ status: 'ok', skipped: true, reason: 'no orderId' });
    }

    const customerEmail = (order.customerEmail ??
      (order.customer as Record<string, unknown>)?.email ??
      order.email) as string | undefined;
    if (!customerEmail) {
      return NextResponse.json({ status: 'ok', skipped: true, reason: 'no customer email' });
    }

    const shippingAddress = order.shippingAddress as Record<string, unknown> | undefined;
    const billingAddress = order.billingAddress as Record<string, unknown> | undefined;
    const customerName =
      (shippingAddress?.firstName as string) ??
      (billingAddress?.firstName as string) ??
      (order.customerFirstName as string) ??
      'Değerli Müşterimiz';

    const lineItems = (order.orderLineItems ?? order.lineItems ?? order.items ?? []) as Array<Record<string, unknown>>;
    const orderDate = order.createdAt ? new Date(order.createdAt as string) : new Date();

    const scheduledAt = new Date(orderDate);
    scheduledAt.setDate(scheduledAt.getDate() + settings.emailDelay);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create one EmailLog per order (not per line item — one email covers all products)
    const existingLog = await prisma.emailLog.findFirst({
      where: { merchantId, orderId, type: 'request' },
    });

    if (existingLog) {
      return NextResponse.json({ status: 'ok', skipped: true, reason: 'email already scheduled' });
    }

    await prisma.emailLog.create({
      data: {
        merchantId,
        orderId,
        customerEmail,
        type: 'request',
        status: 'scheduled',
        scheduledAt,
        reviewToken: uuidv4(),
        expiresAt,
      },
    });

    return NextResponse.json({ status: 'ok', scheduled: true });
  } catch (error) {
    console.error('[webhook/order-created] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
