// Cover image source accessor for the appraisal report.
//
// SINGLE SOURCE OF TRUTH for "where does this book's cover picture come from".
// Every thumbnail in the PDF — Key Issues, Hidden Gems, the inventory table —
// resolves through resolveCoverImage(). When R2 image storage lands, the swap
// is this one function: return the object's public or signed URL (react-pdf
// <Image> accepts a URL string or a data URI). Nothing else in the report
// layer knows or cares where images live.
//
// Today no photo is persisted anywhere, so this returns null and the report
// renders a labelled placeholder in the thumbnail slot.

import type { ReportBook } from '@/lib/types/report';

export type CoverImageSource = string; // URL or data URI

export function resolveCoverImage(book: ReportBook): CoverImageSource | null {
  // R2 (Stage 2): return e.g. `${R2_PUBLIC_BASE}/${book.image_key}` once
  // ReportBook carries the stored object key.
  void book;
  return null;
}
