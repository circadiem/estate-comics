// Provenance brand pass — the PDF renders with the brand families embedded,
// every section present, and a page count that matches the content.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generatePDF } from '@/lib/services/pdf-report';
import { buildCollectionSummary } from '@/lib/services/offer';
import { computeAppraisal, AppraisalInputSchema } from '@/lib/services/appraisal';
import type { ReportData } from '@/lib/types/report';

const identification = (title: string, issue: string, extra: Record<string, unknown> = {}) => ({
  title, issue_number: issue, volume: 1, publisher: 'Marvel', cover_date: 'June 1975', cover_date_year: 1975,
  era: 'Bronze', variant_type: 'direct', variant_detail: null, cover_price: '$0.25',
  significance: { type: null, description: null },
  creators: { cover_artist: null, writer: null, interior_artist: null },
  confidence_score: 94, confidence_notes: '', flagged_for_review: false, photo_quality: 'good', ...extra,
});
const condition = {
  grade_low: 5.0, grade_high: 6.5, grade_midpoint: 5.75, grade_label_low: 'VG/FN', grade_label_high: 'FN+',
  primary_defects: [], cover_assessment: { gloss: 'moderate', color_integrity: 'good', notes: '' },
  spine_assessment: { stress_lines: 2, roll: 'none', splits: false, notes: '' },
  corner_assessment: { sharpness: 'slightly_blunted', weakest_corner: 'top_right', notes: '' },
  limitations_noted: [], storage_inference: '', pressing_potential: 'none', grade_limiting_factor: 'Spine stress',
};
const valuation = (lo: number, hi: number, gem = false) => ({
  gocollect_match: false, fmv_low: lo, fmv_high: hi, fmv_midpoint: (lo + hi) / 2, data_source: 'interpolated',
  last_sale_date: null, sales_volume_90d: null, trend: null, census_count: null,
  is_hidden_gem: gem, hidden_gem_explanation: gem ? 'An early appearance most non-collectors overlook; demand has grown steadily.' : null,
});

export function sampleReport(): ReportData {
  const input = AppraisalInputSchema.parse({
    seller: {
      name: 'Margaret Ellison', email: 'm@example.com', phone: '203-555-0100', state: 'CT', city: 'Greenwich', zip: '06830',
      estimated_count: 320, storage_type: 'bagged_boarded', storage_location: 'garage_basement', known_restorations: false,
      timeline: 'flexible', pickup_available: true,
    },
    books: [
      { identification: identification('Giant-Size X-Men', '1', { significance: { type: 'first_appearance', description: 'First appearance of the new X-Men team, including Storm, Colossus and Nightcrawler.' } }), condition, valuation: valuation(2400, 3200) },
      { identification: identification('Incredible Hulk', '181', { significance: { type: 'first_appearance', description: 'First full appearance of Wolverine.' }, flagged_for_review: true }), condition, valuation: valuation(1800, 2600) },
      { identification: identification('Werewolf by Night', '32'), condition, valuation: valuation(220, 340, true) },
      { identification: identification('Marvel Spotlight', '5', { era: 'Bronze' }), condition, valuation: valuation(180, 260, true) },
      { identification: identification('Amazing Spider-Man', '250', { era: 'Copper', cover_date: 'March 1984', cover_date_year: 1984 }), condition, valuation: valuation(20, 40) },
      ...Array.from({ length: 6 }, (_, i) => ({ identification: identification('Web of Spider-Man', String(40 + i), { era: 'Copper', cover_date: 'July 1988', cover_date_year: 1988 }), condition, valuation: valuation(3, 6) })),
    ],
  });
  const { adjustment, books } = computeAppraisal(input);
  const reference_number = 'EC-20260918-7A2F';
  return {
    reference_number,
    generated_at: '2026-09-18T15:00:00.000Z',
    seller: input.seller,
    adjustment,
    summary: buildCollectionSummary(books, reference_number),
    books,
  };
}

describe('generatePDF — Provenance treatment', () => {
  it('renders a valid PDF with the brand families embedded and all sections', async () => {
    const buf = await generatePDF(sampleReport());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    const raw = buf.toString('latin1');
    const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    // opening + highlights (key issues → hidden gems) + inventory + methodology
    expect(pages).toBe(4);
    // Both brand families are embedded (subset prefix + PostScript name).
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+CormorantGaramond/);
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+NunitoSans/);
    // pdfkit always declares its default Helvetica object; per-glyph font use
    // is verified by the pdf.js text-content check in the brand-pass review.
    expect(raw).toContain('Estate Comics');

    const out = process.env.PDF_TEST_OUT;
    if (out) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, buf);
    }
  }, 30_000);

  it('omits the Key Issues and Hidden Gems pages when there are none', async () => {
    const data = sampleReport();
    const plain = { ...data, books: data.books.filter((b) => b.adjusted_offer.tier !== 'key_issues' && !b.valuation.is_hidden_gem) };
    const buf = await generatePDF(plain);
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBe(3);
  }, 30_000);
});
