// Shared types for the appraisal report (Task 8)
// ReportData is the single source of truth fed into generatePDF(), generateCSV(),
// the on-screen AppraisalReport component, and the Task 9 submission payload.

import type { IdentificationResult } from '@/lib/schemas/identification';
import type { ConditionResult } from '@/lib/schemas/condition';
import type { ValuationResult } from '@/lib/schemas/valuation';
import type { OfferResult, CollectionSummary } from '@/lib/schemas/offer';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';
import type { GradeAdjustment } from '@/lib/services/grade-adjustment';

export interface ReportBook {
  /** R2 key of the processed cover photo, when it was stored (Stage 2). */
  image_key?: string | null;
  identification: IdentificationResult;
  condition: ConditionResult;
  valuation: ValuationResult;
  /** Base offer before storage adjustment */
  offer: OfferResult;
  /** Offer after questionnaire grade adjustment */
  adjusted_offer: OfferResult;
}

export interface ReportData {
  reference_number: string;
  /** ISO 8601 timestamp */
  generated_at: string;
  seller: SellerQuestionnaire;
  adjustment: GradeAdjustment;
  summary: CollectionSummary;
  books: ReportBook[];
}
