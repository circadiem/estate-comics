// Provenance brand pass — both transactional emails: tokens only, brand
// strings present, retired brand absent, seller text escaped.

import { describe, it, expect } from 'vitest';
import { renderSellerConfirmationHtml, renderInternalNotificationHtml } from '@/lib/services/email';
import { provenance } from '@/design/tailwind.tokens';
import { sampleReport } from './pdf-report.test';

const TOKEN_HEX = new Set(Object.values(provenance.colors).map((h) => h.toLowerCase()));

function hexes(html: string): string[] {
  return Array.from(html.matchAll(/#[0-9a-fA-F]{6}\b/g)).map((m) => m[0].toLowerCase());
}

const data = sampleReport();
const seller = renderSellerConfirmationHtml(data);
const internal = renderInternalNotificationHtml(data);

describe('transactional emails — Provenance', () => {
  it('use only palette tokens for every colour', () => {
    for (const html of [seller, internal]) {
      const found = new Set(hexes(html));
      expect(found.size).toBeGreaterThan(3);
      found.forEach((h) => expect(TOKEN_HEX.has(h), `non-token colour ${h}`).toBe(true));
    }
  });

  it('carry the reference number, the tagline and the footer line', () => {
    for (const html of [seller, internal]) {
      expect(html).toContain(data.reference_number);
      expect(html).toContain('Every collection has a story. We honor it.');
      expect(html).toContain('Estate Comics · Powered by Legends of Superheros · Est. 1993');
      expect(html).toContain('EstateComics');
      expect(html).toContain('Professional Comic Book Estate Services');
    }
  });

  it('never mention the retired brand or a hobby-shop payment claim', () => {
    for (const html of [seller, internal]) {
      expect(html).not.toMatch(/comicbuyers/i);
      expect(html).not.toMatch(/same-day/i);
      expect(html).not.toMatch(/USDC|BTC/);
    }
  });

  it('seller email headline equals the summary offer range', () => {
    const lo = `$${Math.round(data.summary.total_offer_low).toLocaleString('en-US')}`;
    const hi = `$${Math.round(data.summary.total_offer_high).toLocaleString('en-US')}`;
    expect(seller).toContain(`${lo} – ${hi}`);
    expect(seller).toContain('within 48 hours');
  });

  it('internal email flags below-minimum and escapes seller-provided HTML', () => {
    const hostile = {
      ...data,
      seller: { ...data.seller, estimated_count: 40, name: 'Eve <script>alert(1)</script>', notes: '<img src=x onerror=alert(1)>' },
    };
    const html = renderInternalNotificationHtml(hostile);
    expect(html).toContain('below minimum');
    expect(html).toContain('40 of 100');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });
});
