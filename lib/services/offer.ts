// Offer calculation service
// Applies OFFER_TIERS config to FMV data to produce per-book OfferResult.
// Also builds the CollectionSummary aggregate across a full collection.
// Source: Implementation Spec §VII.A–C

import { OFFER_TIERS } from '@/lib/config/offer-tiers';
import { MAX_HIDDEN_GEMS } from '@/lib/config/constants';
import { OfferResultSchema, CollectionSummarySchema } from '@/lib/schemas/offer';
import type { OfferResult, CollectionSummary } from '@/lib/schemas/offer';
import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';

// ---------------------------------------------------------------------------
// Per-book offer calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the cash offer for a single book given its FMV range.
 * Tier is determined by fmv_midpoint; offer amounts are derived from the tier's
 * percentage range applied to fmv_low / fmv_high.
 */
export function calculateBookOffer(
  fmvLow: number,
  fmvHigh: number,
  fmvMidpoint: number,
): OfferResult {
  let tier: OfferResult['tier'];
  let tier_label: string;
  let offer_low: number;
  let offer_high: number;
  let offer_pct_applied: number;

  if (fmvMidpoint >= OFFER_TIERS.key_issues.fmv_floor) {
    tier = 'key_issues';
    tier_label = OFFER_TIERS.key_issues.label;
    offer_low = Math.round(fmvLow * OFFER_TIERS.key_issues.offer_pct_low * 100) / 100;
    offer_high = Math.round(fmvHigh * OFFER_TIERS.key_issues.offer_pct_high * 100) / 100;
    offer_pct_applied = OFFER_TIERS.key_issues.offer_pct_low;
  } else if (fmvMidpoint >= OFFER_TIERS.mid_tier.fmv_floor) {
    tier = 'mid_tier';
    tier_label = OFFER_TIERS.mid_tier.label;
    offer_low = Math.round(fmvLow * OFFER_TIERS.mid_tier.offer_pct_low * 100) / 100;
    offer_high = Math.round(fmvHigh * OFFER_TIERS.mid_tier.offer_pct_high * 100) / 100;
    offer_pct_applied = OFFER_TIERS.mid_tier.offer_pct_low;
  } else if (fmvMidpoint >= OFFER_TIERS.common.fmv_floor) {
    tier = 'common';
    tier_label = OFFER_TIERS.common.label;
    offer_low = Math.round(fmvLow * OFFER_TIERS.common.offer_pct_low * 100) / 100;
    offer_high = Math.round(fmvHigh * OFFER_TIERS.common.offer_pct_high * 100) / 100;
    offer_pct_applied = OFFER_TIERS.common.offer_pct_low;
  } else {
    // Bulk: flat rate per book regardless of FMV
    tier = 'bulk';
    tier_label = OFFER_TIERS.bulk.label;
    offer_low = OFFER_TIERS.bulk.flat_rate_low;
    offer_high = OFFER_TIERS.bulk.flat_rate_high;
    offer_pct_applied = 0;
  }

  return OfferResultSchema.parse({
    tier,
    tier_label,
    fmv_low: fmvLow,
    fmv_high: fmvHigh,
    offer_low,
    offer_high,
    offer_pct_applied,
    is_bulk: tier === 'bulk',
  });
}

// ---------------------------------------------------------------------------
// Hidden gems — collection-level cap
// ---------------------------------------------------------------------------

/**
 * Hidden-gem detection is per-book (lib/services/gocollect.ts) and has no view
 * of the collection, so the MAX_HIDDEN_GEMS cap is enforced here, at
 * summary/report time. Returns at most MAX_HIDDEN_GEMS gems ranked by
 * fmv_midpoint (highest first; ties keep input order). Every renderer — PDF,
 * emails, on-screen report, CSV — and `hidden_gems_count` must use this
 * selection so the same books are called gems everywhere. Books beyond the
 * cap are ordinary books.
 */
export function selectHiddenGems<T extends { valuation: ValuationResult }>(books: T[]): T[] {
  return books
    .map((book, index) => ({ book, index }))
    .filter(({ book }) => book.valuation.is_hidden_gem)
    .sort(
      (a, b) =>
        b.book.valuation.fmv_midpoint - a.book.valuation.fmv_midpoint || a.index - b.index,
    )
    .slice(0, MAX_HIDDEN_GEMS)
    .map(({ book }) => book);
}

// ---------------------------------------------------------------------------
// Collection summary (used by /api/submit and /api/generate-report)
// ---------------------------------------------------------------------------

/**
 * The per-book inputs the summary aggregates over.
 *
 * `adjusted_offer` is REQUIRED. Every seller-facing surface (on-screen totals,
 * PDF rows, email tables, CSV) renders the storage-adjusted offer, so the
 * summary must be computed from the same numbers or the headline will not
 * equal the sum of the rows beneath it whenever the multiplier ≠ 1.0.
 */
export interface CollectionBook {
  identification: IdentificationResult;
  condition: ConditionResult;
  valuation: ValuationResult;
  /** Base offer before the questionnaire storage adjustment. Informational only. */
  offer: OfferResult;
  /** Offer after the storage adjustment — the ONLY offer the summary aggregates. */
  adjusted_offer: OfferResult;
}

/**
 * Aggregate per-book results into a CollectionSummary.
 *
 * Money and tier figures (`total_offer_*`, `key_issues_count`, `bulk_lot_count`)
 * derive exclusively from `adjusted_offer`. FMV totals derive from the
 * unadjusted market valuation, which is what "fair market value" means on the
 * report; the adjustment applies to the offer, not to the market.
 *
 * Flagged books (identification.flagged_for_review) are counted but still
 * included in totals — the operator reviews them separately.
 */
export function buildCollectionSummary(
  books: CollectionBook[],
  referenceNumber: string,
): CollectionSummary {
  const eraCounts = { golden: 0, silver: 0, bronze: 0, copper: 0, modern: 0 };
  const publisherCounts: Record<string, number> = {};

  let total_fmv_low = 0;
  let total_fmv_high = 0;
  let total_offer_low = 0;
  let total_offer_high = 0;
  let key_issues_count = 0;
  const hidden_gems_count = selectHiddenGems(books).length;
  let bulk_lot_count = 0;
  let total_books_flagged = 0;

  for (const { identification, valuation, adjusted_offer } of books) {
    total_fmv_low += valuation.fmv_low;
    total_fmv_high += valuation.fmv_high;
    total_offer_low += adjusted_offer.offer_low;
    total_offer_high += adjusted_offer.offer_high;

    if (adjusted_offer.tier === 'key_issues') key_issues_count++;
    if (adjusted_offer.is_bulk) bulk_lot_count++;
    if (identification.flagged_for_review) total_books_flagged++;

    // Era breakdown
    const eraKey = identification.era.toLowerCase() as keyof typeof eraCounts;
    eraCounts[eraKey] = (eraCounts[eraKey] ?? 0) + 1;

    // Publisher breakdown
    const pub = identification.publisher;
    publisherCounts[pub] = (publisherCounts[pub] ?? 0) + 1;
  }

  return CollectionSummarySchema.parse({
    total_books_identified: books.length,
    total_books_flagged,
    total_fmv_low: Math.round(total_fmv_low * 100) / 100,
    total_fmv_high: Math.round(total_fmv_high * 100) / 100,
    total_offer_low: Math.round(total_offer_low * 100) / 100,
    total_offer_high: Math.round(total_offer_high * 100) / 100,
    key_issues_count,
    hidden_gems_count,
    bulk_lot_count,
    breakdown_by_era: eraCounts,
    breakdown_by_publisher: publisherCounts,
    reference_number: referenceNumber,
  });
}
