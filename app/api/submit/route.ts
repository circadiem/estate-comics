// Final submission endpoint — the CANONICAL reference-number minting point.
//
// Order of operations (WO-04):
//   1. validate the body (Zod)
//   2. persist submission + books ATOMICALLY — this is the durable write and
//      the point where the reference number is minted (re-minted on collision)
//   3. only after the write: render PDF + CSV under that number
//   4. send both emails, non-fatally, and record which ones went out
//   5. return 200 with the reference number and the report
//
// A database failure returns 500 with a retry message. A seller never again
// receives a reference number for a lead that does not exist.
//
// Money math (WO-05): the client sends seller + per-book identification,
// condition and valuation ONLY. Adjustment, offers and the summary are
// recomputed here (lib/services/appraisal.ts) and returned in the response;
// the confirmation screen renders from that response. See the residual-risk
// note in appraisal.ts regarding client-echoed valuations.

import { NextRequest, NextResponse } from 'next/server';
import {
  AppraisalInputSchema,
  computeAppraisal,
  summarizeAppraisal,
} from '@/lib/services/appraisal';
import { generatePDF } from '@/lib/services/pdf-generator';
import { generateCSV } from '@/lib/services/csv-generator';
import { sendSellerConfirmation, sendInternalNotification } from '@/lib/services/email';
import { getSupabase } from '@/lib/services/supabase';
import {
  asSubmissionStore,
  createSubmission,
  recordEmailOutcomes,
} from '@/lib/services/submissions';
import { isBelowMinimum } from '@/lib/utils/collection-size';
import type { ReportData } from '@/lib/types/report';

const RETRY_MESSAGE =
  'We could not save your submission. Please try again in a moment, or email us and we will take it from there.';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = AppraisalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { seller } = parsed.data;
  // Server-side recompute: adjustment, base offer, adjusted offer per book.
  const { adjustment, books } = computeAppraisal(parsed.data);
  const below_minimum = isBelowMinimum(seller.estimated_count);

  // ── 1. Durable write. Mints the reference number; nothing else does. ──────
  let store;
  try {
    store = asSubmissionStore(getSupabase());
  } catch (err) {
    console.error('Supabase client unavailable:', err);
    return NextResponse.json({ error: RETRY_MESSAGE }, { status: 500 });
  }

  let persisted;
  try {
    persisted = await createSubmission(
      store,
      { seller, adjustment, books, below_minimum },
      (reference_number) => summarizeAppraisal(books, reference_number),
    );
  } catch (err) {
    console.error('Submission persistence failed:', err);
    return NextResponse.json({ error: RETRY_MESSAGE }, { status: 500 });
  }

  const { id, reference_number, summary } = persisted;
  const submitted_at = new Date().toISOString();

  const reportData: ReportData = {
    reference_number,
    generated_at: submitted_at,
    seller,
    adjustment,
    summary,
    books,
  };

  // ── 2. Report. The lead is already safe; a render failure is still a 500
  //       to the seller, but the row exists and carries the reference number.
  let pdfBuffer: Buffer;
  let csv: string;
  try {
    [pdfBuffer, csv] = await Promise.all([
      generatePDF(reportData),
      Promise.resolve(generateCSV(reportData)),
    ]);
  } catch (err) {
    console.error(`Report generation failed for ${reference_number} (submission saved):`, err);
    return NextResponse.json(
      {
        error: `Your submission ${reference_number} was received, but the report could not be generated. We have your details and will follow up by email.`,
        reference_number,
      },
      { status: 500 },
    );
  }

  // ── 3. Emails — non-fatal, outcomes recorded on the row. ─────────────────
  const [sellerResult, internalResult] = await Promise.allSettled([
    sendSellerConfirmation(reportData),
    sendInternalNotification(reportData, pdfBuffer, csv),
  ]);
  for (const result of [sellerResult, internalResult]) {
    if (result.status === 'rejected') {
      console.error(`Email send error for ${reference_number} (non-fatal):`, result.reason);
    }
  }
  await recordEmailOutcomes(store, id, {
    seller_email_sent: sellerResult.status === 'fulfilled',
    internal_email_sent: internalResult.status === 'fulfilled',
  });

  // The authoritative figures. The client renders its confirmation from these,
  // not from anything it computed locally.
  return NextResponse.json({
    reference_number,
    submitted_at,
    generated_at: submitted_at,
    adjustment,
    summary,
    books,
    pdf_base64: pdfBuffer.toString('base64'),
    csv,
  });
}
