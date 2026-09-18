// Image upload → R2 (Stage 2)
// POST /api/upload
// Body: { session_id: uuid, image_id: uuid, image_base64: string (JPEG),
//         thumbnail_base64?: string (JPEG, ≤ 240px edge) }
// Returns: { image_key }
//
// Upload once; identify and grade then reference the key instead of
// re-sending megabytes of base64 from a phone. The thumbnail is what the PDF
// report embeds. 503 storage_unavailable when R2 is not configured — the
// client falls back to inline images.

import { NextRequest, NextResponse } from 'next/server';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/config/constants';
import { UploadRequestSchema } from '@/lib/schemas/upload';
import {
  buildImageKey,
  isR2Configured,
  putObject,
  thumbKeyFor,
  R2Error,
} from '@/lib/services/r2';

const MAX_THUMB_BYTES = 256 * 1024;

function decodeJpeg(b64: string, limit: number, label: string): Buffer | { error: string } {
  // Rough pre-check before allocating: base64 inflates by 4/3
  if (b64.length > Math.ceil((limit * 4) / 3) + 4) return { error: `${label} exceeds ${limit} bytes` };
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return { error: `${label} is not valid base64` };
  }
  if (buf.length === 0) return { error: `${label} is empty` };
  if (buf.length > limit) return { error: `${label} exceeds ${limit} bytes` };
  // JPEG SOI marker
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
    return { error: `${label} must be a JPEG` };
  }
  return buf;
}

export async function POST(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'storage_unavailable', message: 'Image storage is not configured' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = UploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { session_id, image_id, image_base64, thumbnail_base64 } = parsed.data;

  const image = decodeJpeg(image_base64, MAX_IMAGE_SIZE_BYTES, 'image');
  if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 });

  let thumb: Buffer | null = null;
  if (thumbnail_base64) {
    const t = decodeJpeg(thumbnail_base64, MAX_THUMB_BYTES, 'thumbnail');
    if ('error' in t) return NextResponse.json({ error: t.error }, { status: 400 });
    thumb = t;
  }

  const image_key = buildImageKey(session_id, image_id);
  try {
    await putObject(image_key, image, 'image/jpeg');
    if (thumb) await putObject(thumbKeyFor(image_key), thumb, 'image/jpeg');
  } catch (err) {
    console.error('[/api/upload] R2 put failed:', err instanceof R2Error ? err.cause ?? err : err);
    return NextResponse.json(
      { error: 'storage_error', message: 'The photo could not be stored — please try again' },
      { status: 502 },
    );
  }

  return NextResponse.json({ image_key });
}
