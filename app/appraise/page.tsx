'use client';

// Full appraisal tool
// Phases: upload → processing → done → questionnaire → offer → submitted
// Pipeline: identify → grade → valuate → offer (concurrent per image)
// Questionnaire: grade adjustment applied to produce adjusted_offer per book
// Submission: /api/submit mints the ONE reference number for the session and
// returns the PDF + CSV under it. The report is issued with the submission,
// never before it, so a session can never carry two numbers (WO-02).
// Storage (Stage 2, R2): each photo is uploaded once via /api/upload and the
// pipeline then references its image_key, so nothing large crosses the uplink
// twice and the report can show covers. When storage is unavailable the page
// falls back to inline images exactly as before; nothing is stored.
// Resilience (WO-06): books run through a concurrency pool of
// PIPELINE_CONCURRENCY; errored books are individually retryable; after each
// book settles the session is saved to localStorage (results only, never the
// images) and offered for resume on the next visit.
// Money math: the browser sends only identification, condition and valuation
// per book. Offers, the adjustment and the summary are recomputed server-side
// and the confirmation renders from the server response (WO-05). Any offer
// arithmetic in this file is a DISPLAY PREVIEW ONLY.

import { useCallback, useEffect, useRef, useState } from 'react';
import UploadComponent from '@/components/upload';
import ResultsFeed, { isSettled } from '@/components/results';
import Questionnaire from '@/components/questionnaire';
import AppraisalReport from '@/components/report';
import type { ProcessedImage } from '@/lib/types/upload';
import type { ComicProcessingState } from '@/lib/types/pipeline';
import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { OfferResult } from '@/lib/schemas/offer';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';
import type { CollectionSummary } from '@/lib/schemas/offer';
import type { ReportBook } from '@/lib/types/report';
import type { AppraisalBookInput } from '@/lib/services/appraisal';
import {
  computeGradeAdjustment,
  applyAdjustmentToOffer,
} from '@/lib/services/grade-adjustment';
import type { GradeAdjustment } from '@/lib/services/grade-adjustment';
import { OFFER_VALIDITY_DAYS, PIPELINE_CONCURRENCY } from '@/lib/config/constants';
import { isHeldForReview } from '@/lib/services/offer';
import { validateAndProcessImage } from '@/lib/utils/image-validation';
import { asyncPool } from '@/lib/utils/async-pool';
import {
  ResumablePhaseSchema,
  clearSavedSession,
  countIdentified,
  fromSavedSession,
  loadSavedSession,
  shrinkThumbnail,
  storeSavedSession,
  toSavedSession,
  type SavedSession,
} from '@/lib/utils/appraisal-session';

// ---------------------------------------------------------------------------
// API call helper
// ---------------------------------------------------------------------------

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request to ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Upload (R2) — once per photo, with graceful fallback
// ---------------------------------------------------------------------------

/** What processOne needs: an id and either a stored key or the bytes. */
interface PipelineInput {
  id: string;
  originalName: string;
  image_key?: string;
  processedBase64?: string;
  mimeType?: string;
  thumbnailDataUrl?: string;
}

class StorageUnavailable extends Error {}

/**
 * Upload the processed photo (and a small thumbnail for the report) to R2.
 * Throws StorageUnavailable when the server reports storage is not configured
 * so the caller can fall back to inline images for the rest of the session.
 */
async function uploadImage(
  sessionId: string,
  input: PipelineInput,
  thumbnailBase64: string | null,
): Promise<string> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      image_id: crypto.randomUUID(),
      image_base64: input.processedBase64,
      thumbnail_base64: thumbnailBase64 ?? undefined,
    }),
  });
  if (res.status === 503) throw new StorageUnavailable();
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message ?? data.error ?? `Upload failed (${res.status})`);
  }
  const { image_key } = (await res.json()) as { image_key: string };
  return image_key;
}

/** Strip the data-URL prefix so only base64 is sent. */
function base64Of(dataUrl: string): string | null {
  const i = dataUrl.indexOf('base64,');
  return i === -1 ? null : dataUrl.slice(i + 'base64,'.length);
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n < 1 ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Phase type
// ---------------------------------------------------------------------------

type Phase = 'upload' | 'processing' | 'done' | 'questionnaire' | 'offer' | 'submitted';

// ---------------------------------------------------------------------------
// Adjusted offer summary component
// ---------------------------------------------------------------------------

function AdjustedOfferSummary({
  comics,
  questionnaire,
  adjustment,
  onFormalSubmit,
  submitState,
  submitError,
}: {
  comics: ComicProcessingState[];
  questionnaire: SellerQuestionnaire;
  adjustment: GradeAdjustment;
  onFormalSubmit: () => void;
  submitState: 'idle' | 'submitting' | 'error';
  submitError: string | null;
}) {
  // DISPLAY PREVIEW ONLY — mirrors the server rule: books held for review are
  // excluded from the headline range and stated separately.
  const completed = comics.filter(
    (c) =>
      c.status === 'complete' &&
      c.adjusted_offer &&
      c.identification &&
      !isHeldForReview({ identification: c.identification }),
  );
  const heldCount = comics.filter(
    (c) => c.status === 'complete' && c.identification && isHeldForReview({ identification: c.identification }),
  ).length;
  const totalOfferLow = completed.reduce(
    (sum, c) => sum + (c.adjusted_offer?.offer_low ?? 0),
    0,
  );
  const totalOfferHigh = completed.reduce(
    (sum, c) => sum + (c.adjusted_offer?.offer_high ?? 0),
    0,
  );
  const errored = comics.filter(
    (c) => c.status === 'error' || c.status === 'image_needed',
  ).length;

  return (
    <div className="space-y-4">
      {/* Total offer */}
      <div className="rounded-xl bg-green-50 px-6 py-5 ring-1 ring-green-200">
        <p className="text-sm font-medium text-green-700">Estimated Cash Offer</p>
        <p className="mt-1 text-3xl font-bold text-green-900">
          {fmt(totalOfferLow)} – {fmt(totalOfferHigh)}
        </p>
        <p className="mt-1 text-xs text-green-600">
          Based on {completed.length} identified book
          {completed.length !== 1 ? 's' : ''}
          {heldCount > 0 &&
            ` · ${heldCount} held for review, not included until verified`}
          {errored > 0 && ` · ${errored} could not be processed`}
        </p>
      </div>

      {/* Storage adjustment notice */}
      {adjustment.adjustment_reasons.length > 0 && (
        <div className="rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Storage adjustment applied
          </p>
          <ul className="space-y-0.5">
            {adjustment.adjustment_reasons.map((reason, i) => (
              <li key={i} className="text-xs text-blue-700">
                · {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Restoration flag */}
      {adjustment.restoration_flag && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-xs font-semibold text-amber-800">
            Restoration disclosure noted — all books will be reviewed by our team
            before finalising the offer.
          </p>
        </div>
      )}

      {/* Seller recap */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 space-y-0.5">
        <p>
          <span className="font-medium text-gray-800">{questionnaire.name}</span> ·{' '}
          {questionnaire.email} · {questionnaire.phone}
        </p>
        <p>
          {questionnaire.city}, {questionnaire.state} {questionnaire.zip}
        </p>
      </div>

      {/* Submit CTA */}
      <button
        type="button"
        onClick={onFormalSubmit}
        disabled={submitState === 'submitting'}
        className="w-full rounded-md bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-wait disabled:opacity-60"
      >
        {submitState === 'submitting' ? 'Submitting…' : 'Submit for Formal Offer →'}
      </button>
      {submitState === 'error' && (
        <p role="alert" className="text-center text-xs text-red-600">
          {submitError ?? 'Submission failed — please try again or contact us directly.'}
        </p>
      )}
      <p className="text-center text-xs text-gray-400">
        Your documented appraisal report (PDF and CSV) is issued with your submission.
      </p>
      <p className="text-center text-xs text-gray-400">
        Offer valid for {OFFER_VALIDITY_DAYS} days · Confirmation emailed to {questionnaire.email}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unprocessed-books banner (WO-06)
// ---------------------------------------------------------------------------

function UnprocessedBanner({ comics }: { comics: ComicProcessingState[] }) {
  const n = comics.filter((c) => c.status === 'error' || c.status === 'image_needed').length;
  if (n === 0) return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      <span className="font-semibold">
        {n} {n === 1 ? 'book' : 'books'} couldn&apos;t be processed
      </span>{' '}
      — retry {n === 1 ? 'it' : 'them'} below, or continue without. Only processed books
      are included in your appraisal.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission response shape (mirrors /api/submit)
// ---------------------------------------------------------------------------

interface SubmissionResult {
  reference_number: string;
  submitted_at: string;
  generated_at: string;
  /** Server-recomputed from the questionnaire */
  adjustment: GradeAdjustment;
  /** Server-recomputed summary */
  summary: CollectionSummary;
  /** Server-recomputed per-book offers — the authoritative figures */
  books: ReportBook[];
  pdf_base64: string;
  csv: string;
}

/**
 * The submit payload: pipeline outputs only. Offers are deliberately NOT
 * sent — the server recomputes them and would strip them anyway.
 */
function collectAppraisalBooks(comics: ComicProcessingState[]): AppraisalBookInput[] {
  const books: AppraisalBookInput[] = [];
  for (const c of comics) {
    if (c.status === 'complete' && c.identification && c.condition && c.valuation) {
      books.push({
        image_key: c.image_key ?? null,
        identification: c.identification,
        condition: c.condition,
        valuation: c.valuation,
      });
    }
  }
  return books;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AppraisePage() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [readyImages, setReadyImages] = useState<ProcessedImage[]>([]);
  const [comics, setComics] = useState<ComicProcessingState[]>([]);
  const [questionnaire, setQuestionnaire] = useState<SellerQuestionnaire | null>(null);
  const [adjustment, setAdjustment] = useState<GradeAdjustment | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Latest adjustment, readable from inside the stable processOne callback so a
   *  book re-run after the questionnaire (photo retake) still gets adjusted_offer. */
  const adjustmentRef = useRef<GradeAdjustment | null>(null);
  /** A saved session found on mount, offered for resume until acted on. */
  const [resumable, setResumable] = useState<SavedSession | null>(null);
  /** Shrunk thumbnails by comic id, for the saved session. */
  const thumbsRef = useRef<Map<string, string>>(new Map());
  /** Monotonic counter so a slow persist never overwrites a newer one. */
  const persistSeq = useRef(0);
  /** Upload session id: the R2 key prefix for this appraisal. */
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  /** null = unknown, false = server said storage_unavailable (fall back to inline). */
  const storageAvailable = useRef<boolean | null>(null);
  /** The server's response to /api/submit — the single source of the
   *  reference number and the report rendered on the confirmation screen. */
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  const updateComic = useCallback(
    (id: string, patch: Partial<ComicProcessingState>) => {
      setComics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  /**
   * Upload once (R2) and return the input carrying its key. Falls back to the
   * inline bytes if storage is off or the upload fails — the pipeline still runs.
   */
  const ensureUploaded = useCallback(
    async (img: PipelineInput): Promise<PipelineInput> => {
      if (img.image_key || !img.processedBase64 || storageAvailable.current === false) return img;
      try {
        const thumb = img.thumbnailDataUrl
          ? base64Of(await shrinkThumbnail(img.thumbnailDataUrl, 240))
          : null;
        const image_key = await uploadImage(sessionIdRef.current, img, thumb);
        storageAvailable.current = true;
        updateComic(img.id, { image_key });
        return { ...img, image_key };
      } catch (err) {
        if (err instanceof StorageUnavailable) {
          storageAvailable.current = false; // inline for the rest of the session
        } else {
          console.warn('Photo upload failed; continuing with inline image:', err);
        }
        return img;
      }
    },
    [updateComic],
  );

  const processOne = useCallback(
    async (input: PipelineInput) => {
      const img = await ensureUploaded(input);
      const imageKey = img.image_key;
      const imagePayload = imageKey
        ? { image_key: imageKey }
        : { imageBase64: img.processedBase64, mimeType: img.mimeType };
      if (!imageKey && !img.processedBase64) {
        updateComic(img.id, { status: 'image_needed', error: 'Photo no longer available' });
        return;
      }

      updateComic(img.id, { status: 'identifying' });
      let identification: IdentificationResult;
      try {
        identification = await apiPost<IdentificationResult>('/api/identify', imagePayload);
      } catch (err) {
        updateComic(img.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Identification failed',
        });
        return;
      }

      // Poor photo → conservative: force the review flag regardless of what the
      // model returned. The card shows a retake affordance for this slot.
      if (identification.photo_quality === 'poor' && !identification.flagged_for_review) {
        identification = { ...identification, flagged_for_review: true };
      }

      updateComic(img.id, { status: 'grading', identification });
      let condition: ConditionResult;
      try {
        condition = await apiPost<ConditionResult>('/api/grade', {
          ...imagePayload,
          identification,
        });
      } catch (err) {
        updateComic(img.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Grading failed',
        });
        return;
      }

      updateComic(img.id, { status: 'valuating', condition });
      let valuation: ValuationResult;
      try {
        valuation = await apiPost<ValuationResult>('/api/valuate', {
          identification,
          condition,
        });
      } catch (err) {
        updateComic(img.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Valuation failed',
        });
        return;
      }

      let offer: OfferResult;
      try {
        offer = await apiPost<OfferResult>('/api/calculate-offer', {
          fmv_low: valuation.fmv_low,
          fmv_high: valuation.fmv_high,
          fmv_midpoint: valuation.fmv_midpoint,
        });
      } catch (err) {
        updateComic(img.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Offer calculation failed',
        });
        return;
      }

      // DISPLAY PREVIEW ONLY — server recomputes on submit (WO-05)
      const adj = adjustmentRef.current;
      updateComic(img.id, {
        status: 'complete',
        valuation,
        offer,
        adjusted_offer: adj ? applyAdjustmentToOffer(valuation, adj) : undefined,
      });
    },
    [updateComic, ensureUploaded],
  );

  /**
   * Per-book retake (WO-03): validate the new photo, swap it into this slot,
   * and re-run the pipeline for this book only. Other books are untouched.
   */
  const handleRetake = useCallback(
    async (id: string, file: File) => {
      const result = await validateAndProcessImage(file, file.type);
      if (!result.valid) {
        updateComic(id, { error: result.reason });
        return;
      }
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) ?? '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      const replacement: ProcessedImage = {
        id,
        originalName: file.name,
        thumbnailDataUrl,
        processedBase64: result.processedBase64,
        mimeType: result.mimeType,
      };
      setReadyImages((prev) => prev.map((img) => (img.id === id ? replacement : img)));
      setComics((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                id,
                originalName: file.name,
                thumbnailDataUrl,
                status: 'pending',
                // new photo → new upload; the old key is superseded
              }
            : c,
        ),
      );
      await processOne(replacement);
    },
    [processOne, updateComic],
  );

  function handleStartAppraisal() {
    if (readyImages.length === 0) return;
    const initial: ComicProcessingState[] = readyImages.map((img) => ({
      id: img.id,
      originalName: img.originalName,
      thumbnailDataUrl: img.thumbnailDataUrl,
      status: 'pending',
    }));
    setComics(initial);
    setPhase('processing');
    // Upload every photo first (cheap, and a refresh afterwards loses nothing:
    // each book can re-run from storage), then run the pipeline. Both stages
    // are bounded by PIPELINE_CONCURRENCY (WO-06).
    (async () => {
      const uploaded = await asyncPool(readyImages as PipelineInput[], PIPELINE_CONCURRENCY, ensureUploaded);
      const inputs = uploaded.map((r, i) => (r.status === 'fulfilled' ? r.value : readyImages[i]));
      await asyncPool(inputs, PIPELINE_CONCURRENCY, processOne);
      setPhase('done');
    })();
  }

  /** Re-run one errored book. Needs its image, which lives in upload state;
   *  after a refresh it is gone and the slot asks for the photo again. */
  function handleRetry(id: string) {
    const img = readyImages.find((i) => i.id === id);
    const comic = comics.find((c) => c.id === id);
    if (!comic) return;
    // A stored photo can be re-run without the bytes in memory.
    const input: PipelineInput | null = comic.image_key
      ? { id, originalName: comic.originalName, image_key: comic.image_key }
      : img ?? null;
    if (!input) {
      updateComic(id, {
        status: 'image_needed',
        error: comic.error ?? 'Photo no longer available',
      });
      return;
    }
    setComics((prev) =>
      prev.map((c) =>
        c.id === id
          ? { id, originalName: c.originalName, thumbnailDataUrl: c.thumbnailDataUrl, status: 'pending', image_key: c.image_key }
          : c,
      ),
    );
    void processOne(input);
  }

  // ── Session persistence (WO-06) ──────────────────────────────────────────
  // Save after any book settles, in any resumable phase. Thumbnails are shrunk
  // once per book and cached; the write is skipped if a newer save started.
  useEffect(() => {
    const phaseParse = ResumablePhaseSchema.safeParse(phase);
    if (!phaseParse.success) return;
    if (comics.length === 0 || !comics.some(isSettled)) return;

    const seq = ++persistSeq.current;
    const snapshotPhase = phaseParse.data;
    const snapshotComics = comics;
    const snapshotQuestionnaire = questionnaire;

    (async () => {
      for (const c of snapshotComics) {
        if (!thumbsRef.current.has(c.id) && c.thumbnailDataUrl) {
          const small = await shrinkThumbnail(c.thumbnailDataUrl);
          thumbsRef.current.set(c.id, small);
        }
      }
      if (seq !== persistSeq.current) return; // superseded
      storeSavedSession(
        toSavedSession(
          snapshotPhase,
          snapshotComics,
          snapshotQuestionnaire,
          thumbsRef.current,
          sessionIdRef.current,
        ),
      );
    })();
  }, [phase, comics, questionnaire]);

  // Offer to resume a saved session, once, on first mount.
  useEffect(() => {
    const saved = loadSavedSession();
    if (saved) setResumable(saved);
  }, []);

  function handleResume() {
    if (!resumable) return;
    const restored = fromSavedSession(resumable);
    sessionIdRef.current = restored.sessionId;
    let adj: GradeAdjustment | null = null;
    if (restored.questionnaire) {
      adj = computeGradeAdjustment(restored.questionnaire); // DISPLAY PREVIEW ONLY
      adjustmentRef.current = adj;
      setQuestionnaire(restored.questionnaire);
      setAdjustment(adj);
    }
    for (const c of restored.comics) {
      if (c.thumbnailDataUrl) thumbsRef.current.set(c.id, c.thumbnailDataUrl);
    }
    // Books whose photo is in storage re-run automatically; the rest ask for it.
    const rerun = restored.comics.filter((c) => c.status === 'image_needed' && c.image_key);
    setComics(
      restored.comics.map((c) => {
        if (adj && c.status === 'complete' && c.valuation) {
          return { ...c, adjusted_offer: applyAdjustmentToOffer(c.valuation, adj) };
        }
        if (c.status === 'image_needed' && c.image_key) {
          return { ...c, status: 'pending', error: undefined };
        }
        return c;
      }),
    );
    setPhase(restored.phase);
    setResumable(null);
    if (rerun.length > 0) {
      void asyncPool(
        rerun.map((c) => ({ id: c.id, originalName: c.originalName, image_key: c.image_key })),
        PIPELINE_CONCURRENCY,
        processOne,
      );
    }
  }

  function handleDiscardSaved() {
    clearSavedSession();
    setResumable(null);
  }

  function handleQuestionnaireSubmit(data: SellerQuestionnaire) {
    // DISPLAY PREVIEW ONLY. The same functions run server-side on submit and
    // the confirmation screen renders from the server's numbers, not these.
    const adj = computeGradeAdjustment(data);
    adjustmentRef.current = adj;
    setQuestionnaire(data);
    setAdjustment(adj);
    setComics((prev) =>
      prev.map((comic) => {
        if (comic.status !== 'complete' || !comic.valuation) return comic;
        return { ...comic, adjusted_offer: applyAdjustmentToOffer(comic.valuation, adj) };
      }),
    );
    setPhase('offer');
  }

  function handleStartOver() {
    clearSavedSession();
    thumbsRef.current = new Map();
    persistSeq.current++;
    sessionIdRef.current = crypto.randomUUID();
    setPhase('upload');
    setReadyImages([]);
    setComics([]);
    setQuestionnaire(null);
    setAdjustment(null);
    adjustmentRef.current = null;
    setSubmitState('idle');
    setSubmitError(null);
    setSubmission(null);
  }

  async function handleFormalSubmit() {
    if (!questionnaire) return;
    const books = collectAppraisalBooks(comics);
    if (books.length === 0) return;
    setSubmitState('submitting');
    setSubmitError(null);
    try {
      const result = await apiPost<SubmissionResult>('/api/submit', {
        seller: questionnaire,
        books,
      });
      persistSeq.current++; // cancel any in-flight save
      clearSavedSession();
      setSubmission(result);
      setPhase('submitted');
      setSubmitState('idle');
    } catch (err) {
      console.error('Formal submission failed:', err);
      setSubmitError(err instanceof Error ? err.message : null);
      setSubmitState('error');
    }
  }

  function downloadFile(data: string, filename: string, mimeType: string) {
    let blob: Blob;
    if (mimeType === 'application/pdf') {
      const bytes = atob(data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      blob = new Blob([arr], { type: mimeType });
    } else {
      blob = new Blob([data], { type: mimeType });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Appraise Your Collection
        </h1>
        <p className="mt-3 text-base text-gray-600">
          Photograph each comic book cover — front cover only, one photo per book. Our AI
          will identify, grade, and value every issue instantly.
        </p>
      </div>

      {/* UPLOAD */}
      {phase === 'upload' && (
        <>
          {resumable && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Resume your appraisal ({countIdentified(resumable)}{' '}
                  {countIdentified(resumable) === 1 ? 'book' : 'books'} identified)
                </p>
                <p className="mt-0.5 text-xs text-blue-700">
                  Saved {new Date(resumable.saved_at).toLocaleString()}. Books whose photos were
                  stored will finish processing; any others will ask for their photo again.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResume}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleDiscardSaved}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Start fresh
                </button>
              </div>
            </div>
          )}
          <UploadComponent onImagesReady={setReadyImages} />
          {readyImages.length > 0 && (
            <div className="mt-8 flex items-center justify-between rounded-lg bg-gray-50 px-6 py-4 ring-1 ring-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{readyImages.length}</span>{' '}
                {readyImages.length === 1 ? 'photo' : 'photos'} ready
              </p>
              <button
                type="button"
                onClick={handleStartAppraisal}
                className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Start Appraisal →
              </button>
            </div>
          )}
        </>
      )}

      {/* PROCESSING */}
      {phase === 'processing' && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Processing your collection…
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Processing {Math.min(comics.filter(isSettled).length + 1, comics.length)} of{' '}
            {comics.length} · up to {PIPELINE_CONCURRENCY} at a time
          </p>
          <ResultsFeed comics={comics} />
        </>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Identification complete</h2>
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Start over
            </button>
          </div>
          <UnprocessedBanner comics={comics} />
          <ResultsFeed comics={comics} onRetake={handleRetake} onRetry={handleRetry} />
          <div className="mt-8 rounded-lg bg-blue-50 px-6 py-5 ring-1 ring-blue-200 text-center">
            <p className="text-sm font-medium text-blue-900">
              Ready for your personalised cash offer?
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Answer a few quick questions about storage and timing so we can fine-tune the
              valuation.
            </p>
            <button
              type="button"
              onClick={() => setPhase('questionnaire')}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* QUESTIONNAIRE */}
      {phase === 'questionnaire' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Tell us about your collection
            </h2>
            <button
              type="button"
              onClick={() => setPhase('done')}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Back to results
            </button>
          </div>
          <Questionnaire onSubmit={handleQuestionnaireSubmit} />
        </>
      )}

      {/* OFFER */}
      {phase === 'offer' && questionnaire && adjustment && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your offer estimate</h2>
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Start over
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-2">
              <AdjustedOfferSummary
                comics={comics}
                questionnaire={questionnaire}
                adjustment={adjustment}
                onFormalSubmit={handleFormalSubmit}
                submitState={submitState}
                submitError={submitError}
              />
            </div>
            <div className="md:col-span-3">
              <p className="mb-3 text-sm font-medium text-gray-700">Per-book breakdown</p>
              <UnprocessedBanner comics={comics} />
              <ResultsFeed
                comics={comics}
                useAdjusted
                onRetake={handleRetake}
                onRetry={handleRetry}
              />
            </div>
          </div>

        </>
      )}

      {/* SUBMITTED */}
      {phase === 'submitted' && submission && questionnaire && (
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-lg text-center">
            {/* Checkmark */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-gray-900">Submission Confirmed</h2>
            <p className="mb-6 text-sm text-gray-600">
              A confirmation has been emailed to{' '}
              <span className="font-medium text-gray-800">{questionnaire.email}</span>.
            </p>

            {/* Reference number */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-6 py-4">
              <p className="mb-1 text-xs text-gray-500">Your reference number</p>
              <p className="font-mono text-xl font-bold text-gray-900">
                {submission.reference_number}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Keep this for your records. Offer valid for {OFFER_VALIDITY_DAYS} days.
              </p>
            </div>

            {/* Report downloads — issued under the same reference number */}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    submission.pdf_base64,
                    `${submission.reference_number}.pdf`,
                    'application/pdf',
                  )
                }
                className="rounded-md bg-gray-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-900"
              >
                Download Appraisal Report (PDF)
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    submission.csv,
                    `${submission.reference_number}.csv`,
                    'text/csv',
                  )
                }
                className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Download Inventory (CSV)
              </button>
            </div>

            {/* Next steps */}
            <div className="mb-8 rounded-lg bg-blue-50 px-6 py-5 text-left ring-1 ring-blue-100">
              <h3 className="mb-4 text-sm font-semibold text-blue-900">What happens next</h3>
              <ol className="space-y-3">
                {[
                  ['Review', 'Our team reviews your appraisal within 1–2 business days.'],
                  ['Schedule', 'We contact you to arrange a convenient pickup time.'],
                  [
                  'Verification & payment',
                  'We verify the books when we collect them, then pay within 48 hours by your preferred method.',
                ],
                ].map(([title, body], i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm text-blue-800">
                      <span className="font-semibold">{title}: </span>
                      {body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            </div>

          {/* On-screen copy of the report — every figure comes from the server
              response, never from the local preview state */}
          <div className="mt-4">
            <AppraisalReport
              data={{
                reference_number: submission.reference_number,
                generated_at: submission.generated_at,
                seller: questionnaire,
                adjustment: submission.adjustment,
                summary: submission.summary,
                books: submission.books,
              }}
            />
          </div>

          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              ← Appraise another collection
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
