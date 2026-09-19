// WO-08 task 1 — per-IP rate limiting for /api/upload.

import { describe, it, expect, vi } from 'vitest';
import {
  checkLimits,
  clientIpFrom,
  isRateLimiterConfigured,
  type LimiterLike,
} from '@/lib/services/rate-limit';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_STORED_IMAGE_BYTES,
  MAX_STORED_THUMBNAIL_BYTES,
  MAX_UPLOAD_BODY_BYTES,
  UPLOAD_RATE_LIMIT_RPH,
  UPLOAD_RATE_LIMIT_RPM,
} from '@/lib/config/constants';

const NOW = 1_700_000_000_000;
const limiter = (success: boolean, remaining = 5, resetInMs = 30_000): LimiterLike => ({
  limit: vi.fn(async () => ({ success, remaining, reset: NOW + resetInMs })),
});

describe('clientIpFrom', () => {
  it('takes the leftmost x-forwarded-for entry', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe(
      '203.0.113.7',
    );
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '  203.0.113.7  ' }))).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then null', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(clientIpFrom(new Headers())).toBeNull();
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '' }))).toBeNull();
  });
});

describe('checkLimits', () => {
  it('allows when both windows have room, reporting the tighter remaining', async () => {
    const windows = { burst: limiter(true, 9), hourly: limiter(true, 3) };
    await expect(checkLimits('ip', windows, NOW)).resolves.toEqual({ allowed: true, remaining: 3 });
  });

  it('rejects on the burst window first and does not spend the hourly bucket', async () => {
    const windows = { burst: limiter(false, 0, 12_000), hourly: limiter(true) };
    const decision = await checkLimits('ip', windows, NOW);
    expect(decision).toEqual({ allowed: false, scope: 'burst', retryAfterSeconds: 12 });
    expect(windows.hourly.limit).not.toHaveBeenCalled();
  });

  it('rejects on the hourly window when the burst window passes', async () => {
    const windows = { burst: limiter(true), hourly: limiter(false, 0, 90_000) };
    const decision = await checkLimits('ip', windows, NOW);
    expect(decision).toMatchObject({ allowed: false, scope: 'hourly', retryAfterSeconds: 90 });
  });

  it('never reports a retry-after below one second', async () => {
    const windows = { burst: limiter(false, 0, -5_000), hourly: limiter(true) };
    const decision = await checkLimits('ip', windows, NOW);
    expect(decision).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
  });

  it('buckets by identifier', async () => {
    const windows = { burst: limiter(true), hourly: limiter(true) };
    await checkLimits('203.0.113.7', windows, NOW);
    expect(windows.burst.limit).toHaveBeenCalledWith('203.0.113.7');
  });
});

describe('upload limits are sized for a real estate submission', () => {
  it('allows a 300-book sitting in one hour, and bounds the burst', () => {
    expect(UPLOAD_RATE_LIMIT_RPH).toBeGreaterThanOrEqual(300);
    expect(UPLOAD_RATE_LIMIT_RPM).toBeLessThan(UPLOAD_RATE_LIMIT_RPH);
  });

  it('is not configured in the test environment', () => {
    expect(isRateLimiterConfigured()).toBe(false);
  });
});

describe('upload payload caps fit the deployment platform', () => {
  it('keeps the body cap under Vercel\'s 4.5 MB serverless request limit', () => {
    const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;
    expect(MAX_UPLOAD_BODY_BYTES).toBeLessThan(VERCEL_BODY_LIMIT);
  });

  it('leaves room for the base64 image, its thumbnail and the JSON envelope', () => {
    const base64 = (n: number) => Math.ceil((n * 4) / 3);
    const worstCase = base64(MAX_STORED_IMAGE_BYTES) + base64(MAX_STORED_THUMBNAIL_BYTES) + 512;
    expect(worstCase).toBeLessThanOrEqual(MAX_UPLOAD_BODY_BYTES);
  });

  it('stores far less than the 20 MB a seller may pick, because the image is processed first', () => {
    expect(MAX_STORED_IMAGE_BYTES).toBeLessThan(MAX_IMAGE_SIZE_BYTES);
  });
});
