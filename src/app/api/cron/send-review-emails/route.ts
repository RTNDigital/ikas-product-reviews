import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getResend } from '@/lib/email';
import { render } from '@react-email/components';
import ReviewRequestEmail from '@/emails/review-request';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueEmails = await prisma.emailLog.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
    include: { store: true },
    take: 50, // Process in batches
  });

  if (dueEmails.length === 0) {
    return NextResponse.json({ status: 'ok', sent: 0 });
  }

  const resend = getResend();
  let sentCount = 0;
  let failCount = 0;

  for (const email of dueEmails) {
    const deployUrl = process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://app-name-product-reviews.vercel.app';
    const reviewUrl = `${deployUrl}/review/${email.reviewToken}`;

    const fromName = email.store.emailFromName || 'Mağaza';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'reviews@mail.app-domain.com';

    try {
      const html = await render(
        ReviewRequestEmail({
          customerName: email.customerEmail.split('@')[0],
          products: [], // Will be enriched with order line items in future
          reviewUrl,
          brandColor: email.store.brandColor,
          storeName: fromName,
          couponEnabled: email.store.couponEnabled,
          couponType: email.store.couponType,
          couponValue: email.store.couponValue,
        }),
      );

      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email.customerEmail,
        subject: email.store.emailSubject,
        html,
      });

      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      sentCount++;
    } catch (error) {
      console.error(`[cron/send-emails] Failed to send to ${email.customerEmail}:`, error);

      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: 'failed' },
      });

      failCount++;
    }
  }

  return NextResponse.json({ status: 'ok', sent: sentCount, failed: failCount });
}
