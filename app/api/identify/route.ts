// Comic identification endpoint
// POST /api/identify
// Body: { image_key } (uploaded via /api/upload) or { imageBase64, mimeType }
// Returns: IdentificationResult (validated Zod schema)

import { NextRequest, NextResponse } from 'next/server';
import { identifyComic, ClaudeApiError, ClaudeValidationError } from '@/lib/services/claude';
import { ImageInputSchema, ImageSourceError, resolveImageInput } from '@/lib/services/image-source';

const RequestSchema = ImageInputSchema;

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
    const result = await identifyComic(image.imageBase64, image.mimeType);
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
    console.error('[/api/identify] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
