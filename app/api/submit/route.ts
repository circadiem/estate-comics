// Final submission endpoint — the CANONICAL reference-number minting point.
//
// Accepts the full appraisal payload, mints exactly one reference number,
// builds the collection summary, generates the PDF + CSV under that number,
// sends the seller confirmation and internal notification, and returns the
// reference number together with the report so the browser can offer the
// download. No other route mints reference numbers (WO-02).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SellerQuestionnaireSchema } from '@/lib/schemas/questionnaire';
import { IdentificationResultSchema } from '@/lib/schemas/identification';
import { ConditionResultSchema } from '@/lib/schemas/condition';
import { ValuationResultSchema } from '@/lib/schemas/valuation';
import { OfferResultSchema } from '@/lib/schemas/offer';
import { generateReferenceNumber } from '@/lib/utils/reference-number';
import { buildCollectionSummary } from '@/lib/services/offer';
import { generatePDF } from '@/lib/services/pdf-generator';
import { generateCSV } from '@/lib/services/csv-generator';
import { sendSellerConfirmation, sendInternalNotification } from '@/lib/services/email';
import type { ReportData } from '@/lib/types/report';

const GradeAdjustmentSchema = z.object({
  fmv_multiplier: z.number(),
  restoration_flag: z.boolean(),
  adjustment_reasons: z.array(z.string()),
});

const ReportBookSchema = z.object({
  identification: IdentificationResultSchema,
  condition: ConditionResultSchema,
  valuation: ValuationResultSchema,
  offer: OfferResultSchema,
  adjusted_offer: OfferResultSchema,
});

const RequestBodySchema = z.object({
  seller: SellerQuestionnaireSchema,
  adjustment: GradeAdjustmentSchema,
  books: z.array(ReportBookSchema).min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { seller, adjustment, books } = parsed.data;

  // Minted once. This exact value flows into the summary, the PDF, the CSV,
  // both emails, and the response the confirmation screen renders from.
  const reference_number = generateReferenceNumber();
  const submitted_at = new Date().toISOString();
  const summary = buildCollectionSummary(books, reference_number);

  const reportData: ReportData = {
    reference_number,
    generated_at: submitted_at,
    seller,
    adjustment,
    summary,
    books,
  };

  // Generate PDF and CSV concurrently
  let pdfBuffer: Buffer;
  let csv: string;
  try {
    [pdfBuffer, csv] = await Promise.all([
      generatePDF(reportData),
      Promise.resolve(generateCSV(reportData)),
    ]);
  } catch (err) {
    console.error('Report generation failed during submission:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }

  // Send emails concurrently; log but do not fail submission if email errors
  const emailResults = await Promise.allSettled([
    sendSellerConfirmation(reportData),
    sendInternalNotification(reportData, pdfBuffer, csv),
  ]);

  for (const result of emailResults) {
    if (result.status === 'rejected') {
      console.error('Email send error (non-fatal):', result.reason);
    }
  }

  return NextResponse.json({
    reference_number,
    submitted_at,
    generated_at: submitted_at,
    summary,
    pdf_base64: pdfBuffer.toString('base64'),
    csv,
  });
}
