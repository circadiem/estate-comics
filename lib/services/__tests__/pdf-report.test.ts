// Provenance brand pass — the PDF renders with the brand families embedded,
// every section present, and a page count that matches the content.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generatePDF } from '@/lib/services/pdf-report';
import { sampleReport } from './fixtures/sample-report';

/** Page count from the root Pages tree, which is reliable regardless of stream compression. */
function pageCount(raw: string): number {
  const m = raw.match(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/);
  return m ? Number(m[1]) : -1;
}

describe('generatePDF — Provenance treatment', () => {
  it('renders a valid PDF with the brand families embedded and all sections', async () => {
    const buf = await generatePDF(sampleReport());
    const out = process.env.PDF_TEST_OUT;
    if (out) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, buf);
    }
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    const raw = buf.toString('latin1');
    // opening + highlights (key issues → hidden gems) + inventory + methodology
    expect(pageCount(raw)).toBe(4);
    // Both brand families are embedded (subset prefix + PostScript name).
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+ProvenanceSerif/);
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+NunitoSans/);
    // pdfkit always declares its default Helvetica object; per-glyph font use
    // is verified by the pdf.js text-content check in the brand-pass review.
    expect(raw).toContain('Estate Comics');
  }, 30_000);

  it('omits the Key Issues and Hidden Gems pages when there are none', async () => {
    const data = sampleReport();
    const plain = { ...data, books: data.books.filter((b) => b.adjusted_offer.tier !== 'key_issues' && !b.valuation.is_hidden_gem) };
    const buf = await generatePDF(plain);
    expect(pageCount(buf.toString('latin1'))).toBe(3);
  }, 30_000);
});
