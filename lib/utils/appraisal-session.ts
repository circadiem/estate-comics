// Appraisal session persistence — localStorage (WO-06)
//
// The pipeline used to live entirely in React state: background the tab on a
// phone and the appraisal evaporated. After each book settles we serialise
// the pipeline results, the phase and the questionnaire. What we do NOT store:
// `processedBase64` (quota; and it lives in upload state, not here) and the
// full-size thumbnail data URLs (also quota — they are the original photos).
// Thumbnails are shrunk to a small JPEG before saving.
//
// On restore, books whose results persisted are fully usable downstream —
// the pipeline output is what the submission needs, not the photo. Books that
// were mid-flight or had errored come back as `image_needed`: the seller
// re-adds the photo for that slot and it re-runs.
//
// localStorage is a trust boundary: everything read back is Zod-validated,
// and anything that fails validation is discarded.

import { z } from 'zod';
import { IdentificationResultSchema } from '@/lib/schemas/identification';
import { ConditionResultSchema } from '@/lib/schemas/condition';
import { ValuationResultSchema } from '@/lib/schemas/valuation';
import { OfferResultSchema } from '@/lib/schemas/offer';
import { SellerQuestionnaireSchema } from '@/lib/schemas/questionnaire';
import type { ComicProcessingState } from '@/lib/types/pipeline';

export const SESSION_STORAGE_KEY = 'ec.appraisal.session.v1';

/** Phases worth resuming. Upload has nothing to save; submitted clears. */
export const ResumablePhaseSchema = z.enum(['processing', 'done', 'questionnaire', 'offer']);
export type ResumablePhase = z.infer<typeof ResumablePhaseSchema>;

const SavedComicSchema = z.object({
  id: z.string().min(1),
  originalName: z.string(),
  /** Small JPEG data URL, or '' when unavailable */
  thumbnailDataUrl: z.string(),
  status: z.enum(['complete', 'image_needed']),
  /** R2 key when the photo was stored — lets a book re-run without the photo */
  image_key: z.string().optional(),
  identification: IdentificationResultSchema.optional(),
  condition: ConditionResultSchema.optional(),
  valuation: ValuationResultSchema.optional(),
  offer: OfferResultSchema.optional(),
  error: z.string().optional(),
});

export const SavedSessionSchema = z.object({
  version: z.literal(1),
  saved_at: z.string(),
  /** Upload session id — the R2 key prefix for this appraisal */
  session_id: z.string().uuid(),
  phase: ResumablePhaseSchema,
  comics: z.array(SavedComicSchema).min(1),
  questionnaire: SellerQuestionnaireSchema.nullable(),
});

export type SavedComic = z.infer<typeof SavedComicSchema>;
export type SavedSession = z.infer<typeof SavedSessionSchema>;

// ---------------------------------------------------------------------------
// Pure conversions (unit-tested)
// ---------------------------------------------------------------------------

/**
 * Snapshot live pipeline state for storage. `thumbnails` maps comic id →
 * shrunk data URL; ids without one are saved with an empty thumbnail.
 *
 * Anything not `complete` is saved as `image_needed`: on restore the image is
 * gone, so pending / in-flight / errored books all need their photo re-added.
 */
export function toSavedSession(
  phase: ResumablePhase,
  comics: ComicProcessingState[],
  questionnaire: SavedSession['questionnaire'],
  thumbnails: ReadonlyMap<string, string>,
  sessionId: string,
  now: Date = new Date(),
): SavedSession {
  return {
    version: 1,
    saved_at: now.toISOString(),
    session_id: sessionId,
    phase,
    questionnaire,
    comics: comics.map((c) => {
      const complete = c.status === 'complete' && !!c.identification && !!c.valuation;
      return {
        id: c.id,
        originalName: c.originalName,
        thumbnailDataUrl: thumbnails.get(c.id) ?? '',
        status: complete ? 'complete' : 'image_needed',
        image_key: c.image_key,
        identification: complete ? c.identification : undefined,
        condition: complete ? c.condition : undefined,
        valuation: complete ? c.valuation : undefined,
        offer: complete ? c.offer : undefined,
        error: c.status === 'error' ? c.error : undefined,
      };
    }),
  };
}

/**
 * Rebuild live pipeline state from a saved session. `adjusted_offer` is not
 * stored; the page recomputes the display preview from the questionnaire.
 * A session saved mid-`processing` resumes at `done` — the batch is over.
 */
export function fromSavedSession(saved: SavedSession): {
  phase: ResumablePhase;
  sessionId: string;
  comics: ComicProcessingState[];
  questionnaire: SavedSession['questionnaire'];
} {
  return {
    phase: saved.phase === 'processing' ? 'done' : saved.phase,
    sessionId: saved.session_id,
    questionnaire: saved.questionnaire,
    comics: saved.comics.map((c) => ({
      id: c.id,
      originalName: c.originalName,
      thumbnailDataUrl: c.thumbnailDataUrl,
      status: c.status,
      image_key: c.image_key,
      identification: c.identification,
      condition: c.condition,
      valuation: c.valuation,
      offer: c.offer,
      error: c.status === 'image_needed' ? c.error : undefined,
    })),
  };
}

export function countIdentified(saved: SavedSession): number {
  return saved.comics.filter((c) => c.status === 'complete').length;
}

// ---------------------------------------------------------------------------
// Storage I/O (browser only; every call is guarded)
// ---------------------------------------------------------------------------

export function loadSavedSession(): SavedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = SavedSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/** Returns false if the write failed (quota, private mode, disabled storage). */
export function storeSavedSession(session: SavedSession): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Thumbnail shrinking (browser only)
// ---------------------------------------------------------------------------

export const SESSION_THUMBNAIL_MAX_EDGE = 160;

/**
 * Downscale a data URL to a small JPEG for storage. Resolves to '' on any
 * failure so a bad image never blocks saving the results.
 */
export function shrinkThumbnail(
  dataUrl: string,
  maxEdge: number = SESSION_THUMBNAIL_MAX_EDGE,
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl) return resolve('');
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}
