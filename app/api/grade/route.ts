// Condition assessment endpoint
// POST /api/grade
// Body: ({ image_key } or { imageBase64, mimeType }) + { identification }
// Returns: ConditionResult (validated Zod schema)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assessCondition, ClaudeApiError, ClaudeValidationError } from '@/lib/services/claude';
import { IdentificationResultSchema } from '@/lib/schemas/identification';
import { ImageInputSchema, ImageSourceError, resolveImageInput } from '@/lib/services/image-source';

const RequestSchema = z.intersection(
  ImageInputSchema,
  z.object({ identification: IdentificationResultSchema }),
);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { identification } = parsed.data;
  let image: Awaited<ReturnType<typeof resolveImageInput>>;
  try {
    image = await resolveImageInput(parsed.data);
  } catch (err) {
    if (err instanceof ImageSourceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const result = await assessCondition(image.imageBase64, identification, image.mimeType);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ClaudeValidationError) {
      return NextResponse.json(
        { error: 'AI response could not be parsed — please retry' },
        { status: 422 },
      );
    }
    if (err instanceof ClaudeApiError) {
      return NextResponse.json(
        { error: 'AI service unavailable — please retry' },
        { status: 503 },
      );
    }
    console.error('[/api/grade] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
