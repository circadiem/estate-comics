// App-wide constants

// Claude model — never change without updating all API call sites
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// Minimum collection size — enforced at qualification step
export const MIN_COLLECTION_SIZE = 100;

// Identification confidence below which a book is HELD FOR REVIEW: it is
// listed, but no offer is made on it and it is excluded from the headline
// range until a person verifies the identification (hard rule 5).
export const LOW_CONFIDENCE_THRESHOLD = 70;

// Hidden gems thresholds
export const HIDDEN_GEM_FMV_THRESHOLD = 50; // FMV midpoint must exceed $50
export const MAX_HIDDEN_GEMS = 10; // Maximum highlighted per collection

// Offer validity window
export const OFFER_VALIDITY_DAYS = 14;

// Service states
export const SERVICE_STATES = [
  'CT', // Connecticut
  'MA', // Massachusetts
  'RI', // Rhode Island
  'NH', // New Hampshire
  'VT', // Vermont
  'ME', // Maine
  'NY', // New York
  'NJ', // New Jersey
  'PA', // Pennsylvania
  'FL', // South Florida (Miami-Dade, Broward, Palm Beach)
] as const;

export type ServiceState = (typeof SERVICE_STATES)[number];

// Image processing limits
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_IMAGE_DIMENSION = 2048; // px on longest edge
export const JPEG_QUALITY = 85;
export const MIN_IMAGE_WIDTH = 640;
export const MIN_IMAGE_HEIGHT = 480;

// Pipeline concurrency — max in-flight books during processing (WO-06).
// Each book is up to 4 sequential API calls; 4 books in flight keeps a
// 200-book estate from rate-limit-storming the model API.
export const PIPELINE_CONCURRENCY = 4;

// Rate limiting — max requests per IP per hour (unauthenticated).
// Applies to the per-book pipeline routes in Stage 4 (WO-08).
export const RATE_LIMIT_RPH = 50;

// Upload rate limits (WO-08 task 1, pulled forward for /api/upload).
// Sized for the real workload, not the pipeline default: a seller
// photographing a 300-book estate uploads one object per book in a single
// sitting, so 50/hour would block a legitimate submission at book 50. The
// burst window is what actually bounds abuse — the pipeline never needs more
// than PIPELINE_CONCURRENCY in flight, so 40/minute is generous.
export const UPLOAD_RATE_LIMIT_RPM = 40;
export const UPLOAD_RATE_LIMIT_RPH = 500;

// Upload payload limits (WO-08 task 4).
//
// MAX_IMAGE_SIZE_BYTES (20 MB) is the limit on the file a seller PICKS. What
// reaches /api/upload is the processed image: re-encoded to MAX_IMAGE_DIMENSION
// at JPEG_QUALITY, typically a few hundred KB. These two caps bound what is
// stored and what is read off the wire.
//
// The body cap is deliberately under Vercel's 4.5 MB serverless request-body
// limit, so an oversized upload gets our own explanatory 413 rather than the
// platform's opaque one. Budget: 2.5 MB image → 3.34 MB base64, plus a
// thumbnail and the JSON envelope, inside 4 MB.
//
// If real submissions ever trip this, the fix is to lower JPEG_QUALITY or
// MAX_IMAGE_DIMENSION, not to raise the cap past what the platform accepts.
export const MAX_STORED_IMAGE_BYTES = Math.floor(2.5 * 1024 * 1024);
export const MAX_STORED_THUMBNAIL_BYTES = 256 * 1024;
export const MAX_UPLOAD_BODY_BYTES = 4 * 1024 * 1024;

// API retry config (exponential backoff)
export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY_MS = 2000;

// Daily API spending cap (USD) — adjust as volume scales
export const DAILY_API_CAP_USD = 100;

// Obvious keys exclusion list moved to lib/config/obvious-keys.ts
// (string[] format required by detectHiddenGems in lib/prompts/hidden-gems.ts)
