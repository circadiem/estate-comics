// Stage 2 — R2 key helpers, image input contract, upload route guards,
// and cover-image resolution for the report.

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  IMAGE_KEY_REGEX,
  buildImageKey,
  isValidImageKey,
  thumbKeyFor,
  isR2Configured,
} from '@/lib/services/r2';
import { ImageInputSchema, resolveImageInput } from '@/lib/services/image-source';
import { resolveCoverImages, coverImageFor } from '@/lib/services/report-images';
import { AppraisalBookInputSchema } from '@/lib/services/appraisal';
import { POST as uploadPOST } from '@/app/api/upload/route';
import { UploadRequestSchema as UploadSchema } from '@/lib/schemas/upload';
import { sampleReport } from './fixtures/sample-report';

const SESSION = '6f1d2c3b-4a5e-4f60-8b9c-0d1e2f3a4b5c';
const IMAGE = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d';
const KEY = `uploads/${SESSION}/${IMAGE}.jpg`;

describe('R2 keys', () => {
  it('builds and validates canonical keys', () => {
    expect(buildImageKey(SESSION, IMAGE)).toBe(KEY);
    expect(isValidImageKey(KEY)).toBe(true);
    expect(thumbKeyFor(KEY)).toBe(`uploads/${SESSION}/${IMAGE}.thumb.jpg`);
  });

  it('rejects traversal, foreign prefixes and non-uuid components', () => {
    for (const bad of ['../x.jpg', `uploads/${SESSION}/../${IMAGE}.jpg`, `other/${SESSION}/${IMAGE}.jpg`, `uploads/${SESSION}/${IMAGE}.png`, `uploads/${SESSION}/${IMAGE}.thumb.jpg`, `uploads/abc/def.jpg`]) {
      expect(IMAGE_KEY_REGEX.test(bad), bad).toBe(false);
    }
    expect(() => buildImageKey('abc', IMAGE)).toThrow();
    expect(() => thumbKeyFor('uploads/x/y.jpg')).toThrow();
  });

  it('is not configured in the test environment', () => {
    expect(isR2Configured()).toBe(false);
  });
});

describe('ImageInputSchema', () => {
  it('accepts a key or inline base64, never both-missing', () => {
    expect(ImageInputSchema.safeParse({ image_key: KEY }).success).toBe(true);
    expect(ImageInputSchema.safeParse({ imageBase64: 'AAAA', mimeType: 'image/jpeg' }).success).toBe(true);
    expect(ImageInputSchema.safeParse({ image_key: '../x' }).success).toBe(false);
    expect(ImageInputSchema.safeParse({}).success).toBe(false);
  });

  it('inline input resolves without storage; key input needs storage', async () => {
    await expect(resolveImageInput({ imageBase64: 'AAAA', mimeType: 'image/png' })).resolves.toEqual({
      imageBase64: 'AAAA',
      mimeType: 'image/png',
    });
    await expect(resolveImageInput({ image_key: KEY })).rejects.toMatchObject({ status: 503 });
  });
});

describe('AppraisalBookInputSchema.image_key', () => {
  it('is optional, nullable, and format-checked', () => {
    const base = sampleReport().books[0];
    const book = { identification: base.identification, condition: base.condition, valuation: base.valuation };
    expect(AppraisalBookInputSchema.safeParse(book).success).toBe(true);
    expect(AppraisalBookInputSchema.safeParse({ ...book, image_key: null }).success).toBe(true);
    expect(AppraisalBookInputSchema.safeParse({ ...book, image_key: KEY }).success).toBe(true);
    expect(AppraisalBookInputSchema.safeParse({ ...book, image_key: 'nope' }).success).toBe(false);
  });
});

describe('/api/upload', () => {
  const post = (body: unknown) =>
    uploadPOST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));

  it('answers 503 storage_unavailable when R2 is not configured', async () => {
    const res = await post({ session_id: SESSION, image_id: IMAGE, image_base64: '/9j/AAAA' });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'storage_unavailable' });
  });

  it('refuses when R2 is live but no rate limiter is configured (never runs open)', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'acct');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await post({ session_id: SESSION, image_id: IMAGE, image_base64: '/9j/AAAA' });
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ error: 'rate_limiter_unavailable' });
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('request schema requires uuids and a body', () => {
    expect(UploadSchema.safeParse({ session_id: SESSION, image_id: IMAGE, image_base64: '/9j/' }).success).toBe(true);
    expect(UploadSchema.safeParse({ session_id: 'abc', image_id: IMAGE, image_base64: '/9j/' }).success).toBe(false);
    expect(UploadSchema.safeParse({ session_id: SESSION, image_id: IMAGE, image_base64: '' }).success).toBe(false);
  });
});

describe('resolveCoverImages', () => {
  it('returns nothing when storage is off, and data URIs from the fetcher when on', async () => {
    const data = sampleReport();
    const [a, b, c] = data.books;
    a.image_key = KEY;
    b.image_key = `uploads/${SESSION}/2b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d.jpg`;
    c.image_key = null;

    expect((await resolveCoverImages(data.books)).size).toBe(0); // default fetcher: R2 off

    const fetcher = vi.fn(async (key: string) => {
      if (key === b.image_key) throw new Error('missing object');
      return Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = await resolveCoverImages(data.books, fetcher);
    warn.mockRestore();
    expect(fetcher).toHaveBeenCalledTimes(2); // only keyed books
    expect(coverImageFor(a, map)).toBe('data:image/jpeg;base64,/9j/AA==');
    expect(coverImageFor(b, map)).toBeNull(); // failed fetch → no cover, no throw
    expect(coverImageFor(c, map)).toBeNull();
  });
});
