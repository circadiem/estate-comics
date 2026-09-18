// Cloudflare R2 object storage (Stage 2 — promoted from the audit backlog)
//
// R2 is S3-compatible, so the AWS SDK v3 client is used against the account
// endpoint. Server only: credentials never reach the client bundle.
//
// Layout of the bucket:
//   uploads/{session_id}/{image_id}.jpg        processed cover (≤ 2048px JPEG)
//   uploads/{session_id}/{image_id}.thumb.jpg  small thumbnail for the report
//
// Everything here degrades cleanly: isR2Configured() is false when any
// variable is missing, /api/upload answers 503 storage_unavailable, and the
// appraisal pipeline falls back to sending base64 images as it always did.

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Canonical key for a processed cover image. Thumb keys are derived, never sent. */
export const IMAGE_KEY_REGEX = new RegExp(`^uploads/${UUID}/${UUID}\\.jpg$`);

export const DEFAULT_BUCKET = 'estatecomics-uploads';

export class R2Error extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'R2Error';
  }
}

export class R2NotConfiguredError extends R2Error {
  constructor() {
    super('R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)');
    this.name = 'R2NotConfiguredError';
  }
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket: process.env.R2_BUCKET_NAME || DEFAULT_BUCKET };
}

export function isR2Configured(): boolean {
  return readConfig() !== null;
}

let client: S3Client | null = null;
let clientBucket = '';

function getClient(): { s3: S3Client; bucket: string } {
  const cfg = readConfig();
  if (!cfg) throw new R2NotConfiguredError();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
    clientBucket = cfg.bucket;
  }
  return { s3: client, bucket: clientBucket };
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export function buildImageKey(sessionId: string, imageId: string): string {
  const key = `uploads/${sessionId}/${imageId}.jpg`;
  if (!IMAGE_KEY_REGEX.test(key)) throw new R2Error(`Invalid image key components: ${key}`);
  return key;
}

export function isValidImageKey(key: string): boolean {
  return IMAGE_KEY_REGEX.test(key);
}

export function thumbKeyFor(imageKey: string): string {
  if (!isValidImageKey(imageKey)) throw new R2Error(`Invalid image key: ${imageKey}`);
  return imageKey.replace(/\.jpg$/, '.thumb.jpg');
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { s3, bucket } = getClient();
  try {
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  } catch (err) {
    throw new R2Error(`R2 put failed for ${key}`, err);
  }
}

export async function getObject(key: string): Promise<Buffer> {
  const { s3, bucket } = getClient();
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) throw new R2Error(`R2 object ${key} has no body`);
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (err) {
    if (err instanceof R2Error) throw err;
    throw new R2Error(`R2 get failed for ${key}`, err);
  }
}

/** Short-lived GET URL for the admin review queue (WO-12). */
export async function getSignedImageUrl(key: string, ttlSeconds = 15 * 60): Promise<string> {
  const { s3, bucket } = getClient();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: ttlSeconds,
  });
}
