// Rate limiting via Upstash Redis (WO-08 task 1, pulled forward for /api/upload)
//
// Applied to the upload route only: it is an unauthenticated write path to
// object storage and becomes live the moment R2 credentials exist. The other
// WO-08 controls (Turnstile, the daily spend cap) remain Stage 4.
//
// Two sliding windows per IP, both must pass:
//   burst  — UPLOAD_RATE_LIMIT_RPM per minute, bounds a flood
//   hourly — UPLOAD_RATE_LIMIT_RPH per hour, bounds sustained abuse
//
// The decision logic takes injectable limiters so it is unit-testable without
// a Redis instance.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { UPLOAD_RATE_LIMIT_RPH, UPLOAD_RATE_LIMIT_RPM } from '@/lib/config/constants';

export type RateLimitScope = 'burst' | 'hourly';

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; scope: RateLimitScope; retryAfterSeconds: number };

/** The slice of @upstash/ratelimit this module uses. */
export interface LimiterLike {
  limit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

/**
 * Client IP for rate-limit bucketing.
 *
 * On Vercel the platform sets x-forwarded-for and the leftmost entry is the
 * real client. This header is only trustworthy behind such a proxy; a
 * self-hosted deployment without one must not rely on it. Returns null when no
 * address can be determined, and the caller decides what to do (we refuse).
 */
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip')?.trim();
  return real || null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function readConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function isRateLimiterConfigured(): boolean {
  return readConfig() !== null;
}

let limiters: { burst: Ratelimit; hourly: Ratelimit } | null = null;

function getLimiters(): { burst: LimiterLike; hourly: LimiterLike } | null {
  const cfg = readConfig();
  if (!cfg) return null;
  if (!limiters) {
    const redis = new Redis({ url: cfg.url, token: cfg.token });
    limiters = {
      burst: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(UPLOAD_RATE_LIMIT_RPM, '1 m'),
        prefix: 'ec:upload:burst',
        analytics: false,
      }),
      hourly: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(UPLOAD_RATE_LIMIT_RPH, '1 h'),
        prefix: 'ec:upload:hour',
        analytics: false,
      }),
    };
  }
  return limiters;
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

const secondsUntil = (resetMs: number, now: number) =>
  Math.max(1, Math.ceil((resetMs - now) / 1000));

/**
 * Check both windows for one identifier. The burst window is checked first so
 * a flood is rejected on the cheaper bucket.
 */
export async function checkLimits(
  identifier: string,
  windows: { burst: LimiterLike; hourly: LimiterLike },
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const burst = await windows.burst.limit(identifier);
  if (!burst.success) {
    return { allowed: false, scope: 'burst', retryAfterSeconds: secondsUntil(burst.reset, now) };
  }
  const hourly = await windows.hourly.limit(identifier);
  if (!hourly.success) {
    return { allowed: false, scope: 'hourly', retryAfterSeconds: secondsUntil(hourly.reset, now) };
  }
  return { allowed: true, remaining: Math.min(burst.remaining, hourly.remaining) };
}

/** Rate-limit an upload request. Callers must have checked isRateLimiterConfigured(). */
export async function checkUploadRateLimit(identifier: string): Promise<RateLimitDecision> {
  const windows = getLimiters();
  if (!windows) throw new Error('checkUploadRateLimit called with no limiter configured');
  return checkLimits(identifier, windows);
}
