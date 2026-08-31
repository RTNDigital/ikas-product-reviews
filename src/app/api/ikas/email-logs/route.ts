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

    const where: Prisma.EmailLogWhereInput = { merchantId };
    if (status) {
      where.status = status;
    }

    const [emailLogs, totalCount] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderId: true,
          customerEmail: true,
          type: true,
          status: true,
          scheduledAt: true,
          sentAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      data: emailLogs,
      pagination: { page, limit, totalCount, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('[ikas/email-logs] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
