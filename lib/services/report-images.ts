// Cover image source for the appraisal report.
//
// SINGLE SOURCE OF TRUTH for "where does this book's cover picture come from".
// Every thumbnail in the PDF — Key Issues, Hidden Gems, the inventory table —
// resolves through this module. Nothing else in the report layer knows where
// images live.
//
// Images are stored in R2 (Stage 2). The report embeds the small thumbnail
// written at upload time (`{key}.thumb.jpg`) as a data URI, fetched
// server-side in one batch before rendering. Data URIs, not signed URLs: the
// PDF is a durable artifact and must not carry links that expire, and
// react-pdf must not perform network fetches mid-render. When storage is not
// configured, or a thumbnail is missing, the slot is simply empty.

import type { ReportBook } from '@/lib/types/report';
import { getObject, isR2Configured, isValidImageKey, thumbKeyFor } from '@/lib/services/r2';
import { asyncPool } from '@/lib/utils/async-pool';

export type CoverImageSource = string; // data URI
export type CoverImageMap = ReadonlyMap<ReportBook, CoverImageSource>;

const FETCH_CONCURRENCY = 4;

/** Injectable for tests; defaults to R2. Resolves to the thumbnail bytes. */
export type ThumbnailFetcher = (imageKey: string) => Promise<Buffer>;

const r2Fetcher: ThumbnailFetcher = (imageKey) => getObject(thumbKeyFor(imageKey));

/**
 * Resolve cover thumbnails for a set of books. Never throws: a book whose
 * image cannot be fetched is left out of the map and renders without a cover.
 */
export async function resolveCoverImages(
  books: readonly ReportBook[],
  fetcher: ThumbnailFetcher | null = isR2Configured() ? r2Fetcher : null,
): Promise<CoverImageMap> {
  const map = new Map<ReportBook, CoverImageSource>();
  if (!fetcher) return map;
  const withKeys = books.filter((b) => b.image_key && isValidImageKey(b.image_key));
  const results = await asyncPool(withKeys, FETCH_CONCURRENCY, async (book) => {
    const bytes = await fetcher(book.image_key as string);
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  });
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') map.set(withKeys[i], r.value);
    else console.warn(`[report-images] no cover for ${withKeys[i].image_key}:`, r.reason);
  });
  return map;
}

/** Sync lookup used inside the PDF components. */
export function coverImageFor(book: ReportBook, images: CoverImageMap): CoverImageSource | null {
  return images.get(book) ?? null;
}
