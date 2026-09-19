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
//
// PROTECTION (WO-08 tasks 1 and 4, pulled forward). This is the only
// unauthenticated write path to object storage, so both controls are
// mandatory here rather than best-effort:
//   · the request body is capped BEFORE it is buffered or parsed
//   · every request is rate limited per IP, and a missing limiter refuses the
//     route rather than silently leaving it open. The audit's bug 8 was
//     rate-limit constants that nothing consumed; a fail-open limiter would
//     recreate it. The client already treats 503 as "storage off" and falls
//     back to inline images, so refusing is a degraded path, not a broken one.
//
// Order matters: the rate limiter runs BEFORE the body is read, so a flood
// costs us no bytes, and an oversized request still spends the sender's quota
// rather than being a free retry.

import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_STORED_IMAGE_BYTES,
  MAX_STORED_THUMBNAIL_BYTES,
  MAX_UPLOAD_BODY_BYTES,
} from '@/lib/config/constants';
import { UploadRequestSchema } from '@/lib/schemas/upload';
import {
  buildImageKey,
  isR2Configured,
  putObject,
  thumbKeyFor,
  R2Error,
} from '@/lib/services/r2';
import {
  checkUploadRateLimit,
  clientIpFrom,
  isRateLimiterConfigured,
} from '@/lib/services/rate-limit';
import {
  BodyNotJsonError,
  BodyTooLargeError,
  readJsonBodyWithLimit,
} from '@/lib/utils/request-body';

/** Clients that cannot be identified share one bucket — conservative by design. */
const UNIDENTIFIED_BUCKET = 'unknown';

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

  // Storage is live, so rate limiting is required. Refuse rather than run open.
  if (!isRateLimiterConfigured()) {
    console.error(
      '[/api/upload] R2 is configured but UPSTASH_REDIS_REST_URL / _TOKEN are not. ' +
        'Uploads are refused because this route must not run unthrottled.',
    );
    return NextResponse.json(
      { error: 'rate_limiter_unavailable', message: 'Image storage is temporarily unavailable' },
      { status: 503 },
    );
  }

  const identifier = clientIpFrom(request.headers) ?? UNIDENTIFIED_BUCKET;
  try {
    const decision = await checkUploadRateLimit(identifier);
    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: "You're moving fast — please wait a moment and try that photo again.",
          retry_after_seconds: decision.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } },
      );
    }
  } catch (err) {
    // Redis unreachable. Refuse for the same reason as a missing limiter.
    console.error('[/api/upload] Rate limit check failed:', err);
    return NextResponse.json(
      { error: 'rate_limiter_unavailable', message: 'Image storage is temporarily unavailable' },
      { status: 503 },
    );
  }

  // Cap the body before it is buffered: base64 images make an unbounded read
  // an easy memory exhaustion.
  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, MAX_UPLOAD_BODY_BYTES);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json(
        {
          error: 'payload_too_large',
          message: 'That photo was too large to store. Your appraisal continues without it.',
        },
        { status: 413 },
      );
    }
    if (err instanceof BodyNotJsonError) {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }
    throw err;
  }

  const parsed = UploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { session_id, image_id, image_base64, thumbnail_base64 } = parsed.data;

  const image = decodeJpeg(image_base64, MAX_STORED_IMAGE_BYTES, 'image');
  if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 });

  let thumb: Buffer | null = null;
  if (thumbnail_base64) {
    const t = decodeJpeg(thumbnail_base64, MAX_STORED_THUMBNAIL_BYTES, 'thumbnail');
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
