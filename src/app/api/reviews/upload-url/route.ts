import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl, ALLOWED_MIME_TYPES } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: { merchantId?: string; contentType?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS });
  }

  const { merchantId, contentType, fileName } = body;

  if (!merchantId || !contentType) {
    return NextResponse.json(
      { error: 'merchantId and contentType are required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const mediaId = uuidv4();
  const key = `reviews/${merchantId}/pending/${mediaId}.${ext}`;

  try {
    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, publicUrl, mediaId }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[upload-url] Failed to generate presigned URL:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
