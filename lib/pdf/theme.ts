// PDF theme — Provenance, expressed in points for @react-pdf/renderer.
//
// Every colour comes from design/tailwind.tokens.ts. Nothing in the PDF layer
// names a hex value; if the palette changes, it changes in one place.
// Sizes follow docs/04-brand-provenance.md §2 and §6, converted at 0.75pt/px.

import { provenance, confidenceColor } from '@/design/tailwind.tokens';
import { registerPdfFonts } from '@/lib/pdf/fonts';

const px = (n: number) => Math.round(n * 0.75 * 100) / 100;

export const color = provenance.colors;
export const confidence = confidenceColor;

const families = registerPdfFonts();

export const font = {
  display: families.display,
  body: families.body,
  branded: families.branded,
} as const;

/** Type scale in points. Cormorant never below 18px (13.5pt) except the wordmark. */
export const size = {
  h1: px(40),
  h2: px(30),
  h3: px(23),
  subhead: px(19),
  figure: px(30), // summary-card figures — "where the serif earns its place"
  wordmark: px(27),
  wordmarkSmall: px(16),
  descriptor: px(13),
  bodyLg: px(18),
  body: px(16),
  sm: px(14),
  label: px(13),
  micro: px(12),
} as const;

export const space = {
  pageX: 48,
  pageTop: 44,
  pageBottom: 60,
  section: px(48),
  block: px(24),
  gap: px(12),
  tight: px(8),
} as const;

/** One radius across the whole system. */
export const radius = px(2);

/** Letter tracking for reference numbers (+0.04em at 14px). */
export const refTracking = px(14) * 0.04;

/** Letter page content width: 612pt − 2 × pageX. */
export const contentWidth = 612 - 2 * space.pageX;
