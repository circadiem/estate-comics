'use client';

// Full appraisal tool
// Phases: upload → processing → done → questionnaire → offer → submitted
// Pipeline: identify → grade → valuate → offer (concurrent per image)
// Questionnaire: grade adjustment applied to produce adjusted_offer per book
// Submission: /api/submit mints the ONE reference number for the session and
// returns the PDF + CSV under it. The report is issued with the submission,
// never before it, so a session can never carry two numbers (WO-02).

import { useCallback, useRef, useState } from 'react';
import UploadComponent from '@/components/upload';
import ResultsFeed from '@/components/results';
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
import {
  computeGradeAdjustment,
  applyAdjustmentToOffer,
} from '@/lib/services/grade-adjustment';
import type { GradeAdjustment } from '@/lib/services/grade-adjustment';
import { OFFER_VALIDITY_DAYS } from '@/lib/config/constants';
import { validateAndProcessImage } from '@/lib/utils/image-validation';

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
  const completed = comics.filter(
    (c) => c.status === 'complete' && c.adjusted_offer,
  );
  const totalOfferLow = completed.reduce(
    (sum, c) => sum + (c.adjusted_offer?.offer_low ?? 0),
    0,
  );
  const totalOfferHigh = completed.reduce(
    (sum, c) => sum + (c.adjusted_offer?.offer_high ?? 0),
    0,
  );
  const errored = comics.filter((c) => c.status === 'error').length;

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
// Submission response shape (mirrors /api/submit)
// ---------------------------------------------------------------------------

interface SubmissionResult {
  reference_number: string;
  submitted_at: string;
  generated_at: string;
  summary: CollectionSummary;
  pdf_base64: string;
  csv: string;
}

/** Books that completed the full pipeline and have an adjusted offer. */
function collectReportBooks(comics: ComicProcessingState[]): ReportBook[] {
  const books: ReportBook[] = [];
  for (const c of comics) {
    if (
      c.status === 'complete' &&
      c.identification &&
      c.condition &&
      c.valuation &&
      c.offer &&
      c.adjusted_offer
    ) {
      books.push({
        identification: c.identification,
        condition: c.condition,
        valuation: c.valuation,
        offer: c.offer,
        adjusted_offer: c.adjusted_offer,
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

  const processOne = useCallback(
    async (img: ProcessedImage) => {
      updateComic(img.id, { status: 'identifying' });
      let identification: IdentificationResult;
      try {
        identification = await apiPost<IdentificationResult>('/api/identify', {
          imageBase64: img.processedBase64,
          mimeType: img.mimeType,
        });
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
          imageBase64: img.processedBase64,
          mimeType: img.mimeType,
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

      const adj = adjustmentRef.current;
      updateComic(img.id, {
        status: 'complete',
        valuation,
        offer,
        adjusted_offer: adj ? applyAdjustmentToOffer(valuation, adj) : undefined,
      });
    },
    [updateComic],
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
    Promise.all(readyImages.map((img) => processOne(img))).then(() => {
      setPhase('done');
    });
  }

  function handleQuestionnaireSubmit(data: SellerQuestionnaire) {
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
    if (!questionnaire || !adjustment) return;
    const books = collectReportBooks(comics);
    if (books.length === 0) return;
    setSubmitState('submitting');
    setSubmitError(null);
    try {
      const result = await apiPost<SubmissionResult>('/api/submit', {
        seller: questionnaire,
        adjustment,
        books,
      });
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
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Processing your collection…
          </h2>
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
          <ResultsFeed comics={comics} onRetake={handleRetake} />
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
              <ResultsFeed comics={comics} useAdjusted onRetake={handleRetake} />
            </div>
          </div>

        </>
      )}

      {/* SUBMITTED */}
      {phase === 'submitted' && submission && questionnaire && adjustment && (
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

          {/* On-screen copy of the report, rendered from the server response */}
          <div className="mt-4">
            <AppraisalReport
              data={{
                reference_number: submission.reference_number,
                generated_at: submission.generated_at,
                seller: questionnaire,
                adjustment,
                summary: submission.summary,
                books: collectReportBooks(comics),
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
