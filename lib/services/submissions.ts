// Submission persistence (WO-04)
//
// The durable write is the point of no return in /api/submit: a submission
// exists once create_submission() commits, whatever happens to the PDF or the
// emails afterwards. This module owns that write and the email-outcome
// bookkeeping. It talks to Supabase through a narrow `SubmissionStore`
// interface so the retry logic is unit-testable without a database.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';
import type { CollectionSummary } from '@/lib/schemas/offer';
import type { GradeAdjustment } from '@/lib/services/grade-adjustment';
import type { ReportBook } from '@/lib/types/report';
import { generateReferenceNumber } from '@/lib/utils/reference-number';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewSubmission {
  seller: SellerQuestionnaire;
  adjustment: GradeAdjustment;
  books: ReportBook[];
  below_minimum: boolean;
}

export interface PersistedSubmission {
  id: string;
  reference_number: string;
  summary: CollectionSummary;
}

export interface EmailOutcomes {
  seller_email_sent: boolean;
  internal_email_sent: boolean;
}

interface StoreError {
  code?: string;
  message: string;
}

/** The slice of the Supabase client this module uses. SupabaseClient
 *  satisfies it structurally; tests pass a hand-rolled fake. */
export interface SubmissionStore {
  rpc(
    fn: 'create_submission',
    args: { p_submission: Record<string, unknown>; p_books: Record<string, unknown>[] },
  ): PromiseLike<{ data: unknown; error: StoreError | null }>;
  from(table: 'submissions'): {
    update(values: EmailOutcomes): {
      eq(column: 'id', value: string): PromiseLike<{ error: StoreError | null }>;
    };
  };
}

/** Postgres SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = '23505';

export const REFERENCE_MINT_ATTEMPTS = 3;

export class SubmissionPersistenceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SubmissionPersistenceError';
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Insert a submission and its books atomically via the create_submission()
 * Postgres function. Mints the reference number here — once per submission —
 * and on a unique-violation collision regenerates the suffix and retries, up
 * to REFERENCE_MINT_ATTEMPTS times. Any other database error is fatal.
 *
 * `buildSummary` is injected because the summary embeds the reference number
 * and must be rebuilt if the number is re-minted.
 */
export async function createSubmission(
  store: SubmissionStore,
  input: NewSubmission,
  buildSummary: (referenceNumber: string) => CollectionSummary,
  mint: () => string = generateReferenceNumber,
): Promise<PersistedSubmission> {
  let lastError: StoreError | null = null;

  for (let attempt = 1; attempt <= REFERENCE_MINT_ATTEMPTS; attempt++) {
    const reference_number = mint();
    const summary = buildSummary(reference_number);

    const { data, error } = await store.rpc('create_submission', {
      p_submission: {
        reference_number,
        seller: input.seller,
        adjustment: input.adjustment,
        summary,
        below_minimum: input.below_minimum,
      },
      p_books: input.books.map((book, position) => ({ position, ...book })),
    });

    if (!error) {
      if (typeof data !== 'string' || data.length === 0) {
        throw new SubmissionPersistenceError(
          'create_submission returned no id',
          data,
        );
      }
      return { id: data, reference_number, summary };
    }

    lastError = error;
    if (error.code !== UNIQUE_VIOLATION) break;
    console.warn(
      `Reference number collision on ${reference_number} (attempt ${attempt}/${REFERENCE_MINT_ATTEMPTS}); re-minting`,
    );
  }

  throw new SubmissionPersistenceError(
    lastError?.code === UNIQUE_VIOLATION
      ? `Could not mint a unique reference number after ${REFERENCE_MINT_ATTEMPTS} attempts`
      : `Submission insert failed: ${lastError?.message ?? 'unknown error'}`,
    lastError,
  );
}

// ---------------------------------------------------------------------------
// Email outcomes
// ---------------------------------------------------------------------------

/**
 * Record which notifications actually went out. Non-fatal by design: the
 * submission is already durable, and a failed bookkeeping write must not turn
 * a successful submission into a 500. Errors are logged and swallowed.
 */
export async function recordEmailOutcomes(
  store: SubmissionStore,
  submissionId: string,
  outcomes: EmailOutcomes,
): Promise<void> {
  const { error } = await store.from('submissions').update(outcomes).eq('id', submissionId);
  if (error) {
    console.error(
      `Failed to record email outcomes for submission ${submissionId}:`,
      error.message,
    );
  }
}

/** Compile-time check that the real client satisfies the store interface. */
export function asSubmissionStore(client: SupabaseClient): SubmissionStore {
  return client;
}
