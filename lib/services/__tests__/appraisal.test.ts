// WO-05 — server-side recompute closes the client money-math trust boundary.

import { describe, it, expect } from 'vitest';
import {
  AppraisalInputSchema,
  ConsistentValuationSchema,
  computeAppraisal,
  summarizeAppraisal,
} from '@/lib/services/appraisal';
import { computeGradeAdjustment } from '@/lib/services/grade-adjustment';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';

// ---------------------------------------------------------------------------
// Fixtures (plain JSON, as a browser would send them)
// ---------------------------------------------------------------------------

const identification = {
  title: 'Incredible Hulk',
  issue_number: '181',
  volume: 1,
  publisher: 'Marvel',
  cover_date: 'November 1974',
  cover_date_year: 1974,
  era: 'Bronze',
  variant_type: 'direct',
  variant_detail: null,
  cover_price: '$0.25',
  significance: { type: 'first_appearance', description: 'First full Wolverine' },
  creators: { cover_artist: 'Herb Trimpe', writer: 'Len Wein', interior_artist: 'Herb Trimpe' },
  confidence_score: 96,
  confidence_notes: 'Clear.',
  flagged_for_review: false,
  photo_quality: 'good',
};

const condition = {
  grade_low: 4.0,
  grade_high: 5.5,
  grade_midpoint: 4.75,
  grade_label_low: 'VG',
  grade_label_high: 'FN-',
  primary_defects: [],
  cover_assessment: { gloss: 'moderate', color_integrity: 'good', notes: '' },
  spine_assessment: { stress_lines: 4, roll: 'slight', splits: false, notes: '' },
  corner_assessment: { sharpness: 'blunted', weakest_corner: 'bottom_left', notes: '' },
  limitations_noted: [],
  storage_inference: 'Bagged.',
  pressing_potential: 'minor_improvement',
  grade_limiting_factor: 'Spine roll',
};

function valuation(low: number, high: number, mid = (low + high) / 2) {
  return {
    gocollect_match: false,
    fmv_low: low,
    fmv_high: high,
    fmv_midpoint: mid,
    data_source: 'interpolated',
    last_sale_date: null,
    sales_volume_90d: null,
    trend: null,
    census_count: null,
    is_hidden_gem: false,
    hidden_gem_explanation: null,
  };
}

const seller: SellerQuestionnaire = {
  name: 'Test Seller',
  email: 'seller@example.com',
  phone: '203-555-0100',
  state: 'CT',
  city: 'Greenwich',
  zip: '06830',
  estimated_count: 250,
  storage_type: 'loose',
  storage_location: 'garage_basement', // ×0.70
  known_restorations: false,
  timeline: 'flexible',
  pickup_available: true,
};

// ---------------------------------------------------------------------------
// Contract: what the server accepts and what it ignores
// ---------------------------------------------------------------------------

describe('AppraisalInputSchema', () => {
  it('accepts the slim per-book payload', () => {
    const parsed = AppraisalInputSchema.safeParse({
      seller,
      books: [{ identification, condition, valuation: valuation(1000, 1400) }],
    });
    expect(parsed.success).toBe(true);
  });

  it('strips client-supplied offer, adjusted_offer and adjustment fields', () => {
    const parsed = AppraisalInputSchema.safeParse({
      seller,
      adjustment: { fmv_multiplier: 5, restoration_flag: false, adjustment_reasons: [] },
      books: [
        {
          identification,
          condition,
          valuation: valuation(1000, 1400),
          offer: { offer_low: 999999, offer_high: 999999 },
          adjusted_offer: { offer_low: 999999, offer_high: 999999 },
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty('adjustment');
    expect(parsed.data.books[0]).not.toHaveProperty('offer');
    expect(parsed.data.books[0]).not.toHaveProperty('adjusted_offer');
  });

  it('rejects an empty collection', () => {
    expect(AppraisalInputSchema.safeParse({ seller, books: [] }).success).toBe(false);
  });
});

describe('ConsistentValuationSchema', () => {
  it('rejects fmv_low > fmv_high', () => {
    const r = ConsistentValuationSchema.safeParse(valuation(500, 100, 300));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'fmv_low')).toBe(true);
  });

  it('rejects a midpoint outside [fmv_low, fmv_high]', () => {
    expect(ConsistentValuationSchema.safeParse(valuation(100, 200, 250)).success).toBe(false);
    expect(ConsistentValuationSchema.safeParse(valuation(100, 200, 50)).success).toBe(false);
  });

  it('accepts a midpoint anywhere inside the range (GoCollect may not centre it)', () => {
    expect(ConsistentValuationSchema.safeParse(valuation(100, 200, 180)).success).toBe(true);
    expect(ConsistentValuationSchema.safeParse(valuation(100, 200, 100)).success).toBe(true);
    expect(ConsistentValuationSchema.safeParse(valuation(100, 200, 200)).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Recompute
// ---------------------------------------------------------------------------

describe('computeAppraisal', () => {
  const input = AppraisalInputSchema.parse({
    seller,
    books: [
      { identification, condition, valuation: valuation(1000, 1400) },
      { identification: { ...identification, issue_number: '182' }, condition, valuation: valuation(520, 580) },
      { identification: { ...identification, issue_number: '200' }, condition, valuation: valuation(20, 40) },
    ],
  });

  it('derives the adjustment from the questionnaire, not from the client', () => {
    const { adjustment } = computeAppraisal(input);
    expect(adjustment).toEqual(computeGradeAdjustment(seller));
    expect(adjustment.fmv_multiplier).toBe(0.7);
  });

  it('produces the same offers on every call (deterministic)', () => {
    expect(computeAppraisal(input)).toEqual(computeAppraisal(input));
  });

  it('tampered client offers have zero effect on the result', () => {
    const tampered = AppraisalInputSchema.parse({
      seller,
      books: input.books.map((b) => ({
        ...b,
        offer: { offer_low: 1e9, offer_high: 1e9 },
        adjusted_offer: { offer_low: 1e9, offer_high: 1e9 },
      })),
    });
    expect(computeAppraisal(tampered)).toEqual(computeAppraisal(input));
  });

  it('never raises an adjusted offer above the unadjusted, photo-graded offer', () => {
    for (const b of computeAppraisal(input).books) {
      expect(b.adjusted_offer.offer_low).toBeLessThanOrEqual(b.offer.offer_low);
      expect(b.adjusted_offer.offer_high).toBeLessThanOrEqual(b.offer.offer_high);
    }
  });

  it('summary totals equal the sum of the recomputed adjusted offers', () => {
    const { books } = computeAppraisal(input);
    const summary = summarizeAppraisal(books, 'EC-20260918-0005');
    const round2 = (n: number) => Math.round(n * 100) / 100;
    expect(summary.total_offer_low).toBe(round2(books.reduce((s, b) => s + b.adjusted_offer.offer_low, 0)));
    expect(summary.total_offer_high).toBe(round2(books.reduce((s, b) => s + b.adjusted_offer.offer_high, 0)));
    expect(summary.reference_number).toBe('EC-20260918-0005');
    // 520–580 at ×0.70 → 364–406, mid 385 → mid_tier; only the Hulk 181 stays a key
    expect(summary.key_issues_count).toBe(1);
  });
});
