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

// Rate limiting — max requests per IP per hour (unauthenticated)
export const RATE_LIMIT_RPH = 50;

// API retry config (exponential backoff)
export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY_MS = 2000;

// Daily API spending cap (USD) — adjust as volume scales
export const DAILY_API_CAP_USD = 100;

// Obvious keys exclusion list moved to lib/config/obvious-keys.ts
// (string[] format required by detectHiddenGems in lib/prompts/hidden-gems.ts)
