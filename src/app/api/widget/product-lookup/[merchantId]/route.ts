import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthToken } from '@/models/auth-token';
import { getIkas } from '@/helpers/api-helpers';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  'Access-Control-Allow-Origin': '*',
};

// In-memory cache for slug lookups (1 hour TTL)
const slugCache = new Map<string, { productId: string; expiresAt: number }>();

// Max number of products scanned per slug lookup (the ikas listProduct
// query has no dedicated slug filter, so we search by the slug text and
// match the exact slug client-side).
const SLUG_SEARCH_LIMIT = 50;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> },
) {
  const { merchantId } = await params;
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400, headers: CACHE_HEADERS });
  }

  const cacheKey = `${merchantId}:${slug}`;
  const cached = slugCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ productId: cached.productId }, { headers: CACHE_HEADERS });
  }

  // Look up via ikas GraphQL API
  const authTokenRow = await prisma.authToken.findFirst({
    where: { merchantId, deleted: false },
  });

  if (!authTokenRow) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: CACHE_HEADERS });
  }

  const token: AuthToken = {
    id: authTokenRow.id,
    merchantId: authTokenRow.merchantId,
    authorizedAppId: authTokenRow.authorizedAppId ?? undefined,
    salesChannelId: authTokenRow.salesChannelId ?? null,
    type: authTokenRow.type ?? undefined,
    createdAt: authTokenRow.createdAt.toISOString(),
    updatedAt: authTokenRow.updatedAt.toISOString(),
    deleted: authTokenRow.deleted ?? false,
    accessToken: authTokenRow.accessToken,
    tokenType: authTokenRow.tokenType,
    expiresIn: authTokenRow.expiresIn,
    expireDate: authTokenRow.expireDate.toISOString(),
    refreshToken: authTokenRow.refreshToken,
    scope: authTokenRow.scope ?? undefined,
  };
  const ikasClient = getIkas(token);

  try {
    const response = await ikasClient.queries.listProduct({
      search: slug,
      pagination: { page: 1, limit: SLUG_SEARCH_LIMIT },
    });

    const products = response.isSuccess ? response.data?.listProduct?.data ?? [] : [];
    const match = products.find((p) => p.metaData?.slug === slug);

    if (!match) {
      return NextResponse.json({ productId: null }, { headers: CACHE_HEADERS });
    }

    const productId = match.id;

    // Cache for 1 hour
    slugCache.set(cacheKey, { productId, expiresAt: Date.now() + 3600000 });

    return NextResponse.json({ productId }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[product-lookup] Failed:', error);
    return NextResponse.json({ productId: null }, { headers: CACHE_HEADERS });
  }
}
