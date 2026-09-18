// Server-side appraisal recompute (WO-05)
//
// This is the trust boundary for money math. The client sends the seller
// questionnaire and, per book, only what the pipeline produced upstream:
// identification, condition and valuation. Everything derived from those —
// the storage adjustment, the base offer, the adjusted offer, and the
// collection summary — is computed HERE, from scratch, on every request.
// Client-supplied `adjustment`, `offer` or `adjusted_offer` fields are not in
// the schema and are stripped by Zod before they can influence anything.
//
// RESIDUAL RISK — documented, not yet closed: the valuations themselves are
// still client-echoed. They originated from /api/valuate, but a client could
// alter fmv_low / fmv_high / fmv_midpoint before submitting. The consistency
// check below rejects incoherent values (low > high, midpoint outside the
// range) but cannot prove provenance. Full closure requires persisting
// pipeline results server-side keyed by session and recomputing from the
// stored valuations; that lands with server-side sessions (see backlog:
// resumable magic-link sessions, building on WO-04/06). Until then the
// operator's review of every submission is the compensating control.

import { z } from 'zod';
import { SellerQuestionnaireSchema } from '@/lib/schemas/questionnaire';
import { IdentificationResultSchema } from '@/lib/schemas/identification';
import { ConditionResultSchema } from '@/lib/schemas/condition';
import { ValuationResultSchema } from '@/lib/schemas/valuation';
import type { CollectionSummary } from '@/lib/schemas/offer';
import { calculateBookOffer, buildCollectionSummary } from '@/lib/services/offer';
import {
  computeGradeAdjustment,
  applyAdjustmentToOffer,
  type GradeAdjustment,
} from '@/lib/services/grade-adjustment';
import type { ReportBook } from '@/lib/types/report';

// ---------------------------------------------------------------------------
// Input contract
// ---------------------------------------------------------------------------

/**
 * A valuation is accepted only if its FMV fields are internally coherent.
 * Anything else is a 400 — never silently "fixed", because a fixed number
 * would still be a number the client chose.
 */
export const ConsistentValuationSchema = ValuationResultSchema.superRefine((v, ctx) => {
  if (v.fmv_low > v.fmv_high) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fmv_low'],
      message: `fmv_low (${v.fmv_low}) exceeds fmv_high (${v.fmv_high})`,
    });
  }
  if (v.fmv_midpoint < v.fmv_low || v.fmv_midpoint > v.fmv_high) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fmv_midpoint'],
      message: `fmv_midpoint (${v.fmv_midpoint}) is outside [fmv_low, fmv_high]`,
    });
  }
});

/** Per-book input: pipeline outputs only. No offer fields are accepted. */
export const AppraisalBookInputSchema = z.object({
  identification: IdentificationResultSchema,
  condition: ConditionResultSchema,
  valuation: ConsistentValuationSchema,
});

export const AppraisalInputSchema = z.object({
  seller: SellerQuestionnaireSchema,
  books: z.array(AppraisalBookInputSchema).min(1),
});

export type AppraisalBookInput = z.infer<typeof AppraisalBookInputSchema>;
export type AppraisalInput = z.infer<typeof AppraisalInputSchema>;

// ---------------------------------------------------------------------------
// Recompute
// ---------------------------------------------------------------------------

export interface ComputedAppraisal {
  adjustment: GradeAdjustment;
  books: ReportBook[];
}

/**
 * Derive every money figure from the validated inputs. Pure and deterministic:
 * the same inputs always yield the same offers, which is what makes the
 * stored record, the PDF, the emails and the confirmation screen agree.
 */
export function computeAppraisal(input: AppraisalInput): ComputedAppraisal {
  const adjustment = computeGradeAdjustment(input.seller);
  const books: ReportBook[] = input.books.map(({ identification, condition, valuation }) => ({
    identification,
    condition,
    valuation,
    offer: calculateBookOffer(valuation.fmv_low, valuation.fmv_high, valuation.fmv_midpoint),
    adjusted_offer: applyAdjustmentToOffer(valuation, adjustment),
  }));
  return { adjustment, books };
}

/** Summary over recomputed books, under a given reference number. */
export function summarizeAppraisal(
  books: ReportBook[],
  referenceNumber: string,
): CollectionSummary {
  return buildCollectionSummary(books, referenceNumber);
}
