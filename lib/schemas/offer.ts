// Zod validation schemas for OfferResult and CollectionSummary
// Source: Implementation Spec §VII.B, §VII.C
// Assembled by offer calculation logic (Task 6) — validated at assembly time.

import { z } from 'zod';

export const OfferResultSchema = z.object({
  tier: z.enum(['key_issues', 'mid_tier', 'common', 'bulk']),
  tier_label: z.string(),
  fmv_low: z.number().min(0),
  fmv_high: z.number().min(0),
  offer_low: z.number().min(0),
  offer_high: z.number().min(0),
  offer_pct_applied: z.number().min(0).max(1),
  is_bulk: z.boolean(),
});

export const CollectionSummarySchema = z.object({
  total_books_identified: z.number().int().min(0),
  total_books_flagged: z.number().int().min(0),
  total_fmv_low: z.number().min(0),
  total_fmv_high: z.number().min(0),
  total_offer_low: z.number().min(0),
  total_offer_high: z.number().min(0),
  /** Books held for review: listed and valued provisionally, but NOT offered
   *  on and NOT in the headline totals above. Stated separately everywhere. */
  pending_fmv_low: z.number().min(0),
  pending_fmv_high: z.number().min(0),
  pending_offer_low: z.number().min(0),
  pending_offer_high: z.number().min(0),
  key_issues_count: z.number().int().min(0),
  hidden_gems_count: z.number().int().min(0),
  bulk_lot_count: z.number().int().min(0),
  breakdown_by_era: z.object({
    golden: z.number().int().min(0),
    silver: z.number().int().min(0),
    bronze: z.number().int().min(0),
    copper: z.number().int().min(0),
    modern: z.number().int().min(0),
  }),
  breakdown_by_publisher: z.record(z.string(), z.number().int().min(0)),
  reference_number: z.string(),
});

export type OfferResult = z.infer<typeof OfferResultSchema>;
export type CollectionSummary = z.infer<typeof CollectionSummarySchema>;
