// WO-01 — Summary math must derive from adjusted offers.
//
// The July 2026 audit found buildCollectionSummary() summing the unadjusted
// `offer` while every seller-facing surface (screen, PDF rows, email tables,
// CSV) renders `adjusted_offer`. These tests pin the fix: with a storage
// multiplier of 0.85 the headline totals equal the sum of the adjusted rows,
// and a book whose adjusted midpoint crosses the $500 key-issue floor is
// classified the same way in the summary counts and in the per-book filters
// the renderers use.

import { describe, it, expect } from 'vitest';
import {
  buildCollectionSummary,
  calculateBookOffer,
  selectHiddenGems,
  isHeldForReview,
} from '@/lib/services/offer';
import { MAX_HIDDEN_GEMS } from '@/lib/config/constants';
import type { CollectionBook } from '@/lib/services/offer';
import {
  computeGradeAdjustment,
  applyAdjustmentToOffer,
} from '@/lib/services/grade-adjustment';
import { OFFER_TIERS } from '@/lib/config/offer-tiers';
import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function identification(
  overrides: Partial<IdentificationResult> = {},
): IdentificationResult {
  return {
    title: 'Amazing Spider-Man',
    issue_number: '129',
    volume: 1,
    publisher: 'Marvel',
    cover_date: 'February 1974',
    cover_date_year: 1974,
    era: 'Bronze',
    variant_type: 'direct',
    variant_detail: null,
    cover_price: '$0.20',
    significance: { type: 'first_appearance', description: 'First Punisher' },
    creators: { cover_artist: 'Gil Kane', writer: 'Gerry Conway', interior_artist: 'Ross Andru' },
    confidence_score: 95,
    confidence_notes: 'Clear cover, logo and issue number legible.',
    flagged_for_review: false,
    photo_quality: 'good',
    ...overrides,
  };
}

function condition(): ConditionResult {
  return {
    grade_low: 5.0,
    grade_high: 6.5,
    grade_midpoint: 5.75,
    grade_label_low: 'VG/FN',
    grade_label_high: 'FN+',
    primary_defects: [],
    cover_assessment: { gloss: 'moderate', color_integrity: 'good', notes: '' },
    spine_assessment: { stress_lines: 3, roll: 'none', splits: false, notes: '' },
    corner_assessment: { sharpness: 'slightly_blunted', weakest_corner: 'top_right', notes: '' },
    limitations_noted: [],
    storage_inference: 'Bagged for most of its life.',
    pressing_potential: 'minor_improvement',
    grade_limiting_factor: 'Spine stress',
  };
}

function valuation(fmvLow: number, fmvHigh: number, isGem = false): ValuationResult {
  const fmv_midpoint = Math.round(((fmvLow + fmvHigh) / 2) * 100) / 100;
  return {
    gocollect_match: false,
    fmv_low: fmvLow,
    fmv_high: fmvHigh,
    fmv_midpoint,
    data_source: 'interpolated',
    last_sale_date: null,
    sales_volume_90d: null,
    trend: null,
    census_count: null,
    is_hidden_gem: isGem,
    hidden_gem_explanation: isGem ? 'Under-recognised key.' : null,
  };
}

const questionnaireBase: SellerQuestionnaire = {
  name: 'Test Seller',
  email: 'seller@example.com',
  phone: '203-555-0100',
  state: 'CT',
  city: 'Greenwich',
  zip: '06830',
  estimated_count: 250,
  storage_type: 'bagged_only',
  storage_location: 'normal_interior', // ×1.00 baseline
  known_restorations: false,
  timeline: 'flexible',
  pickup_available: true,
};

/** Build a CollectionBook the same way the pipeline does: base offer from the
 *  raw valuation, adjusted offer from the questionnaire multiplier. */
function book(
  fmvLow: number,
  fmvHigh: number,
  q: SellerQuestionnaire,
  idOverrides: Partial<IdentificationResult> = {},
  isGem = false,
): CollectionBook {
  const val = valuation(fmvLow, fmvHigh, isGem);
  const adjustment = computeGradeAdjustment(q);
  return {
    identification: identification(idOverrides),
    condition: condition(),
    valuation: val,
    offer: calculateBookOffer(val.fmv_low, val.fmv_high, val.fmv_midpoint),
    adjusted_offer: applyAdjustmentToOffer(val, adjustment),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (books: CollectionBook[], pick: (b: CollectionBook) => number) =>
  round2(books.reduce((acc, b) => acc + pick(b), 0));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildCollectionSummary — adjusted-offer basis (WO-01)', () => {
  // bagged_only + garage_basement → ×0.85 exactly
  const q085: SellerQuestionnaire = {
    ...questionnaireBase,
    storage_location: 'garage_basement',
  };

  it('fixture questionnaire yields a 0.85 multiplier', () => {
    expect(computeGradeAdjustment(q085).fmv_multiplier).toBe(0.85);
  });

  const books: CollectionBook[] = [
    // A — solidly a key issue before and after adjustment
    book(1000, 1400, q085, { title: 'Incredible Hulk', issue_number: '181' }),
    // B — key issue at raw FMV (mid 550) but crosses BELOW the $500 floor
    //     once adjusted (442–493, mid 467.5 → mid_tier)
    book(520, 580, q085, { title: 'Giant-Size X-Men', issue_number: '1' }, true),
    // C — common reader copy either way
    book(20, 40, q085, { title: 'Amazing Spider-Man', issue_number: '250', era: 'Copper' }),
  ];
  const summary = buildCollectionSummary(books, 'EC-20260918-ABCD');

  it('headline totals equal the sum of the adjusted per-book offers', () => {
    expect(summary.total_offer_low).toBe(sum(books, (b) => b.adjusted_offer.offer_low));
    expect(summary.total_offer_high).toBe(sum(books, (b) => b.adjusted_offer.offer_high));
  });

  it('headline totals do NOT equal the sum of the unadjusted offers (the audited defect)', () => {
    expect(summary.total_offer_low).not.toBe(sum(books, (b) => b.offer.offer_low));
    expect(summary.total_offer_high).not.toBe(sum(books, (b) => b.offer.offer_high));
  });

  it('the adjustment never raises an offer above the unadjusted figure (conservative bias)', () => {
    for (const b of books) {
      expect(b.adjusted_offer.offer_low).toBeLessThanOrEqual(b.offer.offer_low);
      expect(b.adjusted_offer.offer_high).toBeLessThanOrEqual(b.offer.offer_high);
    }
    expect(summary.total_offer_low).toBeLessThan(sum(books, (b) => b.offer.offer_low));
  });

  it('a book whose adjusted midpoint crosses the $500 floor is counted consistently everywhere', () => {
    const crossing = books[1];
    expect(crossing.offer.tier).toBe('key_issues');
    expect(crossing.adjusted_offer.tier).toBe('mid_tier');
    expect(crossing.adjusted_offer.fmv_low).toBeLessThan(OFFER_TIERS.key_issues.fmv_floor);

    // The summary count uses the adjusted tier…
    expect(summary.key_issues_count).toBe(1);
    // …and so do the per-book filters used by the PDF key-issues page, the
    // internal email, and the on-screen report (all filter on adjusted_offer.tier).
    const rendererKeyIssues = books.filter((b) => b.adjusted_offer.tier === 'key_issues');
    expect(rendererKeyIssues).toHaveLength(summary.key_issues_count);
    expect(rendererKeyIssues[0].identification.title).toBe('Incredible Hulk');
  });

  it('bulk lot count derives from the adjusted tier', () => {
    // 10–14 raw → common (mid 12); adjusted 8.5–11.9 (mid 10.2) → still common.
    // 10–12 raw → common (mid 11); adjusted 8.5–10.2 (mid 9.35) → bulk.
    const edge = [
      book(10, 14, q085),
      book(10, 12, q085),
    ];
    const s = buildCollectionSummary(edge, 'EC-20260918-0001');
    expect(edge[1].offer.is_bulk).toBe(false);
    expect(edge[1].adjusted_offer.is_bulk).toBe(true);
    expect(s.bulk_lot_count).toBe(edge.filter((b) => b.adjusted_offer.is_bulk).length);
    expect(s.total_offer_low).toBe(sum(edge, (b) => b.adjusted_offer.offer_low));
  });

  it('FMV totals remain the unadjusted market valuation', () => {
    expect(summary.total_fmv_low).toBe(sum(books, (b) => b.valuation.fmv_low));
    expect(summary.total_fmv_high).toBe(sum(books, (b) => b.valuation.fmv_high));
  });

  it('carries the reference number, counts and breakdowns through', () => {
    expect(summary.reference_number).toBe('EC-20260918-ABCD');
    expect(summary.total_books_identified).toBe(3);
    expect(summary.hidden_gems_count).toBe(1);
    expect(summary.breakdown_by_era).toEqual({ golden: 0, silver: 0, bronze: 2, copper: 1, modern: 0 });
    expect(summary.breakdown_by_publisher).toEqual({ Marvel: 3 });
  });
});

describe('buildCollectionSummary — neutral multiplier', () => {
  it('with a 1.0 multiplier adjusted and unadjusted totals coincide', () => {
    const books = [
      book(1000, 1400, questionnaireBase),
      book(520, 580, questionnaireBase),
      book(20, 40, questionnaireBase),
    ];
    expect(computeGradeAdjustment(questionnaireBase).fmv_multiplier).toBe(1);
    const s = buildCollectionSummary(books, 'EC-20260918-FFFF');
    expect(s.total_offer_low).toBe(sum(books, (b) => b.offer.offer_low));
    expect(s.total_offer_low).toBe(sum(books, (b) => b.adjusted_offer.offer_low));
    expect(s.key_issues_count).toBe(2);
  });
});

describe('selectHiddenGems — MAX_HIDDEN_GEMS cap (WO-03)', () => {
  // 14 gems with distinct midpoints, deliberately out of order, plus 2 non-gems
  const gemValues = [120, 60, 300, 75, 90, 450, 55, 210, 180, 65, 95, 130, 80, 70];
  const books: CollectionBook[] = [
    ...gemValues.map((mid, i) =>
      book(mid - 10, mid + 10, questionnaireBase, { issue_number: `gem-${i}` }, true),
    ),
    book(20, 40, questionnaireBase, { issue_number: 'plain-1' }),
    book(1000, 1400, questionnaireBase, { issue_number: 'plain-2' }),
  ];

  it('returns at most MAX_HIDDEN_GEMS books, highest fmv_midpoint first', () => {
    const gems = selectHiddenGems(books);
    expect(MAX_HIDDEN_GEMS).toBe(10);
    expect(gems).toHaveLength(MAX_HIDDEN_GEMS);
    const mids = gems.map((g) => g.valuation.fmv_midpoint);
    expect(mids).toEqual([...gemValues].sort((a, b) => b - a).slice(0, MAX_HIDDEN_GEMS));
    expect(gems.every((g) => g.valuation.is_hidden_gem)).toBe(true);
  });

  it('never includes a non-gem, even a high-value one', () => {
    const gems = selectHiddenGems(books);
    expect(gems.some((g) => g.identification.issue_number.startsWith('plain'))).toBe(false);
  });

  it('summary.hidden_gems_count uses the capped selection', () => {
    const s = buildCollectionSummary(books, 'EC-20260918-CAFE');
    expect(s.hidden_gems_count).toBe(MAX_HIDDEN_GEMS);
    expect(books.filter((b) => b.valuation.is_hidden_gem).length).toBeGreaterThan(MAX_HIDDEN_GEMS);
  });

  it('returns every gem when under the cap and preserves input order on ties', () => {
    const tied = [
      book(40, 60, questionnaireBase, { issue_number: 'a' }, true),
      book(40, 60, questionnaireBase, { issue_number: 'b' }, true),
      book(40, 60, questionnaireBase, { issue_number: 'c' }, true),
    ];
    expect(selectHiddenGems(tied).map((b) => b.identification.issue_number)).toEqual(['a', 'b', 'c']);
    expect(selectHiddenGems([])).toEqual([]);
  });
});

describe('held for review — excluded from the headline range (hard rule 5)', () => {
  const q085: SellerQuestionnaire = { ...questionnaireBase, storage_location: 'garage_basement' };
  const trusted = book(1000, 1400, q085, { issue_number: 'trusted' });
  const flagged = book(1800, 2600, q085, { issue_number: 'flagged', flagged_for_review: true });
  const lowConf = book(300, 500, q085, { issue_number: 'lowconf', confidence_score: 55 });
  const summary = buildCollectionSummary([trusted, flagged, lowConf], 'EC-20260918-HELD');

  it('identifies held books by flag or by low confidence', () => {
    expect(isHeldForReview(trusted)).toBe(false);
    expect(isHeldForReview(flagged)).toBe(true);
    expect(isHeldForReview(lowConf)).toBe(true);
  });

  it('keeps held books out of the headline offer and FMV ranges', () => {
    expect(summary.total_offer_low).toBe(trusted.adjusted_offer.offer_low);
    expect(summary.total_offer_high).toBe(trusted.adjusted_offer.offer_high);
    expect(summary.total_fmv_low).toBe(trusted.valuation.fmv_low);
    expect(summary.total_fmv_high).toBe(trusted.valuation.fmv_high);
  });

  it('states the held books separately as pending verification', () => {
    expect(summary.total_books_flagged).toBe(2);
    expect(summary.pending_offer_low).toBe(round2(flagged.adjusted_offer.offer_low + lowConf.adjusted_offer.offer_low));
    expect(summary.pending_offer_high).toBe(round2(flagged.adjusted_offer.offer_high + lowConf.adjusted_offer.offer_high));
    expect(summary.pending_fmv_low).toBe(flagged.valuation.fmv_low + lowConf.valuation.fmv_low);
    expect(summary.pending_fmv_high).toBe(flagged.valuation.fmv_high + lowConf.valuation.fmv_high);
    // headline + pending == what the old, wrong headline would have been
    expect(round2(summary.total_offer_low + summary.pending_offer_low)).toBe(
      sum([trusted, flagged, lowConf], (b) => b.adjusted_offer.offer_low),
    );
  });

  it('still counts a held key issue as a key issue (classification, not money)', () => {
    expect(summary.key_issues_count).toBe(2);
    expect(summary.total_books_identified).toBe(3);
  });

  it('a collection where every book is held has a zero headline', () => {
    const s = buildCollectionSummary([flagged, lowConf], 'EC-20260918-0000');
    expect(s.total_offer_low).toBe(0);
    expect(s.total_offer_high).toBe(0);
    expect(s.pending_offer_high).toBeGreaterThan(0);
  });
});
