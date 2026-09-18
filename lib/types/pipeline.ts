// Shared types for the comic processing pipeline
// Each uploaded image flows through:
//   pending → identifying → grading → valuating → complete | error
// After questionnaire submission, adjusted_offer is populated (display preview).
//
// `image_needed` (WO-06): a book restored from a saved session whose image is
// gone (the page was refreshed mid-run, or the book had errored and cannot be
// retried without its photo). The seller re-adds the photo for that slot.

import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { OfferResult } from '@/lib/schemas/offer';

export type ProcessingStatus =
  | 'pending'
  | 'identifying'
  | 'grading'
  | 'valuating'
  | 'complete'
  | 'error'
  | 'image_needed';

export interface ComicProcessingState {
  /** Matches ProcessedImage.id from the upload step */
  id: string;
  originalName: string;
  thumbnailDataUrl: string;
  status: ProcessingStatus;
  identification?: IdentificationResult;
  condition?: ConditionResult;
  valuation?: ValuationResult;
  /** Base offer from pipeline (pre-questionnaire, unadjusted for storage) */
  offer?: OfferResult;
  /** Recalculated offer after questionnaire grade adjustment is applied */
  adjusted_offer?: OfferResult;
  error?: string;
}
