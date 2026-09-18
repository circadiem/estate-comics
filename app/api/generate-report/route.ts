// Report re-render endpoint.
//
// Renders the PDF + CSV for an appraisal under an EXISTING reference number.
// This route never mints: the reference number is a required, validated input
// (WO-02). The seller flow no longer calls it — /api/submit issues the report
// with the submission — but it remains for re-generating a report under the
// same number (admin review queue, WO-12).
//
// Money math is recomputed server-side from seller + per-book identification,
// condition and valuation (WO-05). No offer fields are accepted from the client.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AppraisalInputSchema,
  computeAppraisal,
  summarizeAppraisal,
} from '@/lib/services/appraisal';
import { REFERENCE_NUMBER_REGEX } from '@/lib/utils/reference-number';
import { generatePDF } from '@/lib/services/pdf-generator';
import { generateCSV } from '@/lib/services/csv-generator';
import type { ReportData } from '@/lib/types/report';

const RequestBodySchema = AppraisalInputSchema.extend({
  reference_number: z
    .string()
    .regex(REFERENCE_NUMBER_REGEX, 'reference_number must match EC-YYYYMMDD-XXXX'),
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

  const { reference_number, seller } = parsed.data;
  const { adjustment, books } = computeAppraisal(parsed.data);
  const generated_at = new Date().toISOString();
  const summary = summarizeAppraisal(books, reference_number);

  const reportData: ReportData = {
    reference_number,
    generated_at,
    seller,
    adjustment,
    summary,
    books,
  };

  let pdfBuffer: Buffer;
  let csv: string;
  try {
    [pdfBuffer, csv] = await Promise.all([
      generatePDF(reportData),
      Promise.resolve(generateCSV(reportData)),
    ]);
  } catch (err) {
    console.error('Report generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }

  return NextResponse.json({
    reference_number,
    generated_at,
    adjustment,
    summary,
    books,
    pdf_base64: pdfBuffer.toString('base64'),
    csv,
  });
}
