// PDF font registration (Provenance brand pass)
//
// @react-pdf/renderer cannot use next/font or CSS; it needs TrueType files.
// The two brand families are bundled under lib/pdf/fonts/ (SIL Open Font
// License, texts alongside) and registered once per process. The display face
// is "Provenance Serif": Cormorant Garamond with lining figures made the
// default and renamed per the OFL's reserved-name clause — see README.md there. If a file is
// missing — a broken deploy, a trimmed bundle — we fall back to the built-in
// PDF fonts and log once, so an appraisal is never blocked by typography.
//
// next.config.mjs includes lib/pdf/fonts/** in the output file trace for the
// two routes that render PDFs, so the files ship with the serverless bundle.

import fs from 'node:fs';
import path from 'node:path';
import { Font } from '@react-pdf/renderer';

const FONT_DIR = path.join(process.cwd(), 'lib', 'pdf', 'fonts');

const DISPLAY_FAMILY = 'Provenance Serif';
const BODY_FAMILY = 'Nunito Sans';

const DISPLAY_FILES = [
  { file: 'ProvenanceSerif-Regular.ttf', fontWeight: 400, fontStyle: 'normal' as const },
  { file: 'ProvenanceSerif-Medium.ttf', fontWeight: 500, fontStyle: 'normal' as const },
  { file: 'ProvenanceSerif-SemiBold.ttf', fontWeight: 600, fontStyle: 'normal' as const },
  { file: 'ProvenanceSerif-Bold.ttf', fontWeight: 700, fontStyle: 'normal' as const },
  { file: 'ProvenanceSerif-Italic.ttf', fontWeight: 400, fontStyle: 'italic' as const },
];

const BODY_FILES = [
  { file: 'NunitoSans-Light.ttf', fontWeight: 300, fontStyle: 'normal' as const },
  { file: 'NunitoSans-Regular.ttf', fontWeight: 400, fontStyle: 'normal' as const },
  { file: 'NunitoSans-SemiBold.ttf', fontWeight: 600, fontStyle: 'normal' as const },
  { file: 'NunitoSans-Bold.ttf', fontWeight: 700, fontStyle: 'normal' as const },
];

export interface PdfFontFamilies {
  /** Provenance Serif (Cormorant Garamond, lining figures), or the built-in serif */
  display: string;
  /** Nunito Sans, or the built-in sans if the files are unavailable */
  body: string;
  /** True when the brand families were registered from disk */
  branded: boolean;
}

let registered: PdfFontFamilies | null = null;

function allPresent(files: { file: string }[]): boolean {
  return files.every(({ file }) => fs.existsSync(path.join(FONT_DIR, file)));
}

/**
 * Register the brand families with react-pdf. Idempotent. Returns the family
 * names to use in styles (brand names, or the fallbacks).
 */
export function registerPdfFonts(): PdfFontFamilies {
  if (registered) return registered;

  const haveDisplay = allPresent(DISPLAY_FILES);
  const haveBody = allPresent(BODY_FILES);

  if (haveDisplay) {
    Font.register({
      family: DISPLAY_FAMILY,
      fonts: DISPLAY_FILES.map(({ file, fontWeight, fontStyle }) => ({
        src: path.join(FONT_DIR, file),
        fontWeight,
        fontStyle,
      })),
    });
  }
  if (haveBody) {
    Font.register({
      family: BODY_FAMILY,
      fonts: BODY_FILES.map(({ file, fontWeight, fontStyle }) => ({
        src: path.join(FONT_DIR, file),
        fontWeight,
        fontStyle,
      })),
    });
  }
  if (!haveDisplay || !haveBody) {
    console.warn(
      `[pdf] Brand font files missing under ${FONT_DIR} (display: ${haveDisplay}, body: ${haveBody}); using built-in PDF fonts`,
    );
  }

  // Titles and names should never be hyphenated mid-word in a document a
  // seller forwards to an attorney.
  Font.registerHyphenationCallback((word) => [word]);

  registered = {
    display: haveDisplay ? DISPLAY_FAMILY : 'Times-Roman',
    body: haveBody ? BODY_FAMILY : 'Helvetica',
    branded: haveDisplay && haveBody,
  };
  return registered;
}
