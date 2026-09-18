// WO-06 — session snapshot/restore: results survive, images do not, and
// anything unvalidated is discarded.

import { describe, it, expect } from 'vitest';
import {
  toSavedSession,
  fromSavedSession,
  countIdentified,
  SavedSessionSchema,
} from '@/lib/utils/appraisal-session';
import type { ComicProcessingState } from '@/lib/types/pipeline';
import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { OfferResult } from '@/lib/schemas/offer';

const identification: IdentificationResult = {
  title: 'Amazing Spider-Man', issue_number: '300', volume: 1, publisher: 'Marvel',
  cover_date: 'May 1988', cover_date_year: 1988, era: 'Copper', variant_type: 'direct',
  variant_detail: null, cover_price: '$1.50',
  significance: { type: 'first_appearance', description: 'First Venom' },
  creators: { cover_artist: 'Todd McFarlane', writer: 'David Michelinie', interior_artist: 'Todd McFarlane' },
  confidence_score: 97, confidence_notes: '', flagged_for_review: false, photo_quality: 'good',
};
const condition: ConditionResult = {
  grade_low: 8.0, grade_high: 9.0, grade_midpoint: 8.5, grade_label_low: 'VF', grade_label_high: 'VF/NM',
  primary_defects: [], cover_assessment: { gloss: 'high', color_integrity: 'excellent', notes: '' },
  spine_assessment: { stress_lines: 1, roll: 'none', splits: false, notes: '' },
  corner_assessment: { sharpness: 'sharp', weakest_corner: 'top_left', notes: '' },
  limitations_noted: [], storage_inference: '', pressing_potential: 'none', grade_limiting_factor: '',
};
const valuation: ValuationResult = {
  gocollect_match: false, fmv_low: 300, fmv_high: 500, fmv_midpoint: 400, data_source: 'interpolated',
  last_sale_date: null, sales_volume_90d: null, trend: null, census_count: null,
  is_hidden_gem: false, hidden_gem_explanation: null,
};
const offer: OfferResult = {
  tier: 'mid_tier', tier_label: 'Mid-Tier Collectibles', fmv_low: 300, fmv_high: 500,
  offer_low: 120, offer_high: 250, offer_pct_applied: 0.4, is_bulk: false,
};

const BIG = 'data:image/jpeg;base64,' + 'A'.repeat(50_000);

const live: ComicProcessingState[] = [
  { id: 'a', originalName: 'a.jpg', thumbnailDataUrl: BIG, status: 'complete', identification, condition, valuation, offer, adjusted_offer: offer },
  { id: 'b', originalName: 'b.jpg', thumbnailDataUrl: BIG, status: 'grading', identification },
  { id: 'c', originalName: 'c.jpg', thumbnailDataUrl: BIG, status: 'error', error: 'Grading failed' },
  { id: 'd', originalName: 'd.jpg', thumbnailDataUrl: BIG, status: 'pending' },
];
const thumbs = new Map([['a', 'data:image/jpeg;base64,small']]);

describe('toSavedSession', () => {
  const saved = toSavedSession('processing', live, null, thumbs, new Date('2026-09-18T12:00:00Z'));

  it('keeps complete results and converts everything else to image_needed', () => {
    expect(saved.comics.map((c) => c.status)).toEqual(['complete', 'image_needed', 'image_needed', 'image_needed']);
    expect(saved.comics[0].identification).toEqual(identification);
    expect(saved.comics[0].valuation).toEqual(valuation);
    expect(saved.comics[1].identification).toBeUndefined(); // partial results are not kept
    expect(saved.comics[2].error).toBe('Grading failed');
  });

  it('never stores the full-size thumbnails or adjusted_offer', () => {
    const json = JSON.stringify(saved);
    expect(json).not.toContain('AAAAAAAAAA');
    expect(json).not.toContain('adjusted_offer');
    expect(saved.comics[0].thumbnailDataUrl).toBe('data:image/jpeg;base64,small');
    expect(saved.comics[1].thumbnailDataUrl).toBe('');
    expect(json.length).toBeLessThan(6_000);
  });

  it('round-trips through the schema', () => {
    expect(SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(saved))).success).toBe(true);
  });
});

describe('fromSavedSession', () => {
  it('resumes a mid-processing session at done and restores usable results', () => {
    const saved = toSavedSession('processing', live, null, thumbs);
    const restored = fromSavedSession(saved);
    expect(restored.phase).toBe('done');
    expect(restored.comics[0].status).toBe('complete');
    expect(restored.comics[0].offer).toEqual(offer);
    expect(restored.comics[0].adjusted_offer).toBeUndefined();
    expect(restored.comics[1].status).toBe('image_needed');
    expect(restored.comics[2].error).toBe('Grading failed');
    expect(countIdentified(saved)).toBe(1);
  });

  it('preserves other phases and the questionnaire', () => {
    const q = {
      name: 'Test Seller', email: 's@example.com', phone: '2035550100', state: 'CT' as const,
      city: 'Greenwich', zip: '06830', estimated_count: 200, storage_type: 'loose' as const,
      storage_location: 'unknown' as const, known_restorations: false, timeline: 'urgent' as const,
      pickup_available: false,
    };
    const restored = fromSavedSession(toSavedSession('offer', [live[0]], q, thumbs));
    expect(restored.phase).toBe('offer');
    expect(restored.questionnaire).toEqual(q);
  });
});

describe('SavedSessionSchema', () => {
  it('rejects tampered or foreign payloads', () => {
    expect(SavedSessionSchema.safeParse({ version: 2 }).success).toBe(false);
    expect(SavedSessionSchema.safeParse({ version: 1, saved_at: 'x', phase: 'submitted', comics: [], questionnaire: null }).success).toBe(false);
    const saved = toSavedSession('done', [live[0]], null, thumbs);
    const tampered = JSON.parse(JSON.stringify(saved));
    tampered.comics[0].valuation.fmv_low = 'lots';
    expect(SavedSessionSchema.safeParse(tampered).success).toBe(false);
  });
});
