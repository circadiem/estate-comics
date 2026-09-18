'use client';

// Task 5/6 — Real-time identification, grading, and valuation results feed
// Cards update in-place as each image moves through the pipeline.

import { useRef } from 'react';
import type { ComicProcessingState } from '@/lib/types/pipeline';
import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { OfferResult } from '@/lib/schemas/offer';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const ERA_COLORS: Record<IdentificationResult['era'], string> = {
  Golden: 'bg-yellow-100 text-yellow-800',
  Silver: 'bg-blue-100 text-blue-800',
  Bronze: 'bg-orange-100 text-orange-800',
  Copper: 'bg-teal-100 text-teal-800',
  Modern: 'bg-purple-100 text-purple-800',
};

const SIGNIFICANCE_LABELS: Record<
  NonNullable<IdentificationResult['significance']['type']>,
  string
> = {
  first_appearance: 'First Appearance',
  first_cameo: 'First Cameo',
  origin: 'Origin Issue',
  death: 'Death Issue',
  first_issue: 'First Issue',
  key_storyline: 'Key Story',
  creator_debut: 'Creator Debut',
  crossover: 'Crossover',
};

const TIER_COLORS: Record<OfferResult['tier'], string> = {
  key_issues: 'bg-amber-100 text-amber-800',
  mid_tier: 'bg-blue-100 text-blue-800',
  common: 'bg-gray-100 text-gray-700',
  bulk: 'bg-gray-100 text-gray-500',
};

function fmt(n: number): string {
  return n < 1
    ? `$${n.toFixed(2)}`
    : `$${Math.round(n).toLocaleString()}`;
}

function ConfidenceBadge({ score, flagged }: { score: number; flagged: boolean }) {
  if (flagged || score < 70) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Flagged — {score}%
      </span>
    );
  }
  if (score < 90) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        {score}% confident
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {score}% confident
    </span>
  );
}

function GradeDisplay({ condition }: { condition: ConditionResult }) {
  const { grade_low, grade_high, grade_label_low, grade_label_high, grade_limiting_factor } =
    condition;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Grade</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">
        {grade_label_low} – {grade_label_high}
        <span className="ml-1.5 font-normal text-gray-500">
          ({grade_low.toFixed(1)}–{grade_high.toFixed(1)})
        </span>
      </p>
      {grade_limiting_factor && (
        <p className="mt-0.5 truncate text-xs text-gray-400" title={grade_limiting_factor}>
          Limiting: {grade_limiting_factor}
        </p>
      )}
    </div>
  );
}

function ValuationDisplay({
  valuation,
  offer,
}: {
  valuation: ValuationResult;
  offer: OfferResult;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-4">
      {/* FMV */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Est. Value
          {!valuation.gocollect_match && (
            <span className="ml-1 font-normal normal-case text-gray-400">(est.)</span>
          )}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">
          {fmt(valuation.fmv_low)} – {fmt(valuation.fmv_high)}
        </p>
      </div>

      {/* Offer */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Our Offer</p>
        <p className="mt-0.5 text-sm font-bold text-green-700">
          {offer.is_bulk
            ? `${fmt(offer.offer_low)} – ${fmt(offer.offer_high)} / book`
            : `${fmt(offer.offer_low)} – ${fmt(offer.offer_high)}`}
        </p>
      </div>

      {/* Tier badge */}
      <div className="flex items-end">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[offer.tier]}`}
        >
          {offer.tier_label}
        </span>
      </div>
    </div>
  );
}

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

/** Retake affordance for a book whose photo came back `photo_quality: 'poor'`.
 *  Opens the camera (or file picker) for THIS slot only; the parent replaces
 *  the image and re-runs the pipeline for just this book. */
function RetakeControl({
  comic,
  onRetake,
}: {
  comic: ComicProcessingState;
  onRetake?: (id: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-1 rounded-md bg-amber-50 px-2.5 py-2 ring-1 ring-amber-200">
      <p className="text-xs font-medium text-amber-900">
        Photo quality low — consider retaking
      </p>
      <p className="mt-0.5 text-xs text-amber-800">
        This book has been flagged for review. A clearer, well-lit photo of the front cover
        gives a more accurate identification and grade.
      </p>
      {onRetake && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onRetake(comic.id, file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-inset ring-amber-300 hover:bg-amber-100"
          >
            Retake photo
          </button>
          {comic.error && <p className="mt-1 text-xs text-red-700">{comic.error}</p>}
        </>
      )}
    </div>
  );
}

function Thumbnail({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <div className={`rounded bg-gray-100 ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`rounded object-cover ${className}`} />
  );
}

// ---------------------------------------------------------------------------
// Per-status card variants
// ---------------------------------------------------------------------------

function PendingCard({ comic }: { comic: ComicProcessingState }) {
  return (
    <li className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <Thumbnail
        src={comic.thumbnailDataUrl}
        alt={comic.originalName}
        className="h-24 w-16 flex-shrink-0 opacity-40"
      />
      <div className="flex flex-1 flex-col justify-center gap-2">
        <Shimmer className="h-3.5 w-2/3" />
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="h-3 w-1/3" />
      </div>
    </li>
  );
}

function ProcessingCard({ comic }: { comic: ComicProcessingState }) {
  const { status, identification } = comic;
  const label =
    status === 'identifying' ? 'Identifying…' :
    status === 'grading' ? 'Grading…' :
    'Valuating…';

  return (
    <li className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <Thumbnail
        src={comic.thumbnailDataUrl}
        alt={comic.originalName}
        className="h-24 w-16 flex-shrink-0"
      />
      <div className="flex flex-1 flex-col justify-center gap-2 min-w-0">
        {identification ? (
          <>
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
              {identification.title} #{identification.issue_number}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {identification.publisher} · {identification.cover_date}
            </p>
          </>
        ) : (
          <>
            <Shimmer className="h-3.5 w-2/3" />
            <Shimmer className="h-3 w-1/2" />
          </>
        )}
        <div className="flex items-center gap-2">
          <Spinner />
          <span className="text-xs text-blue-700">{label}</span>
        </div>
      </div>
    </li>
  );
}

function ErrorCard({ comic }: { comic: ComicProcessingState }) {
  return (
    <li className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <Thumbnail
        src={comic.thumbnailDataUrl}
        alt={comic.originalName}
        className="h-24 w-16 flex-shrink-0 opacity-60"
      />
      <div className="flex flex-1 flex-col justify-center gap-1 min-w-0">
        <p className="text-sm font-medium text-red-900 truncate">{comic.originalName}</p>
        <p className="text-xs text-red-700">{comic.error ?? 'Processing failed'}</p>
      </div>
    </li>
  );
}

function CompleteCard({
  comic,
  identification,
  condition,
  valuation,
  offer,
  onRetake,
}: {
  comic: ComicProcessingState;
  identification: IdentificationResult;
  condition: ConditionResult;
  valuation: ValuationResult;
  offer: OfferResult;
  onRetake?: (id: string, file: File) => void;
}) {
  const sigType = identification.significance.type;
  const poorPhoto = identification.photo_quality === 'poor';

  return (
    <li className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <Thumbnail
        src={comic.thumbnailDataUrl}
        alt={`${identification.title} #${identification.issue_number}`}
        className="h-28 w-[4.5rem] flex-shrink-0"
      />
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        {/* Title */}
        <p className="text-sm font-bold text-gray-900 leading-tight truncate">
          {identification.title} #{identification.issue_number}
          {identification.volume && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              Vol. {identification.volume}
            </span>
          )}
        </p>

        {/* Publisher + date + variant */}
        <p className="text-xs text-gray-500 truncate">
          {identification.publisher} · {identification.cover_date}
          {identification.variant_type !== 'direct' &&
            identification.variant_type !== 'unknown' && (
              <span className="ml-1 capitalize">
                · {identification.variant_type.replace(/_/g, ' ')}
              </span>
            )}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ERA_COLORS[identification.era]}`}
          >
            {identification.era} Age
          </span>
          {sigType && (
            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {SIGNIFICANCE_LABELS[sigType]}
            </span>
          )}
          {valuation.is_hidden_gem && (
            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Hidden Gem
            </span>
          )}
          <ConfidenceBadge
            score={identification.confidence_score}
            flagged={identification.flagged_for_review}
          />
        </div>

        {/* Grade */}
        <GradeDisplay condition={condition} />

        {/* FMV + Offer */}
        <ValuationDisplay valuation={valuation} offer={offer} />

        {/* Hidden gem explanation */}
        {valuation.is_hidden_gem && valuation.hidden_gem_explanation && (
          <p className="mt-1 text-xs text-emerald-700 italic leading-relaxed">
            {valuation.hidden_gem_explanation}
          </p>
        )}

        {/* Poor photo → visible flag + per-book retake */}
        {poorPhoto && <RetakeControl comic={comic} onRetake={onRetake} />}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ comics }: { comics: ComicProcessingState[] }) {
  const total = comics.length;
  const done = comics.filter(
    (c) => c.status === 'complete' || c.status === 'error',
  ).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>
          {done} of {total} processed
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ResultsFeedProps {
  comics: ComicProcessingState[];
  /** When true, complete cards show adjusted_offer instead of base offer */
  useAdjusted?: boolean;
  /** Per-book retake: replace this slot's image and re-run the pipeline for it.
   *  When omitted, poor-photo books are flagged but offer no retake button. */
  onRetake?: (id: string, file: File) => void;
}

export default function ResultsFeed({
  comics,
  useAdjusted = false,
  onRetake,
}: ResultsFeedProps) {
  if (comics.length === 0) return null;

  const allDone = comics.every(
    (c) => c.status === 'complete' || c.status === 'error',
  );

  return (
    <div>
      {!allDone && <ProgressBar comics={comics} />}

      <ul role="list" className="space-y-3">
        {comics.map((comic) => {
          switch (comic.status) {
            case 'pending':
              return <PendingCard key={comic.id} comic={comic} />;

            case 'identifying':
            case 'grading':
            case 'valuating':
              return <ProcessingCard key={comic.id} comic={comic} />;

            case 'error':
              return <ErrorCard key={comic.id} comic={comic} />;

            case 'complete': {
              const displayOffer = useAdjusted
                ? (comic.adjusted_offer ?? comic.offer)
                : comic.offer;
              if (
                comic.identification &&
                comic.condition &&
                comic.valuation &&
                displayOffer
              ) {
                return (
                  <CompleteCard
                    key={comic.id}
                    comic={comic}
                    identification={comic.identification}
                    condition={comic.condition}
                    valuation={comic.valuation}
                    offer={displayOffer}
                    onRetake={onRetake}
                  />
                );
              }
              return null;
            }

            default:
              return null;
          }
        })}
      </ul>
    </div>
  );
}
