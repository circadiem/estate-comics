// Image input for the identify / grade routes.
//
// A pipeline call may reference an image either by its R2 key (uploaded once
// via /api/upload — the preferred path, nothing large crosses the phone's
// uplink twice) or by inline base64 (the fallback when storage is not
// configured). The server resolves both to the bytes the model needs.

import { z } from 'zod';
import { IMAGE_KEY_REGEX, getObject, isR2Configured } from '@/lib/services/r2';
import type { ImageMediaType } from '@/lib/services/claude';

export const ImageMediaTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export const ImageInputSchema = z.union([
  z.object({ image_key: z.string().regex(IMAGE_KEY_REGEX, 'Invalid image key') }),
  z.object({ imageBase64: z.string().min(1, 'imageBase64 is required'), mimeType: ImageMediaTypeSchema }),
]);

export type ImageInput = z.infer<typeof ImageInputSchema>;

export class ImageSourceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 503,
  ) {
    super(message);
    this.name = 'ImageSourceError';
  }
}

export async function resolveImageInput(
  input: ImageInput,
): Promise<{ imageBase64: string; mimeType: ImageMediaType }> {
  if ('image_key' in input) {
    if (!isR2Configured()) {
      throw new ImageSourceError('Image storage is not available', 503);
    }
    try {
      const bytes = await getObject(input.image_key);
      return { imageBase64: bytes.toString('base64'), mimeType: 'image/jpeg' };
    } catch (err) {
      console.error(`[image-source] R2 fetch failed for ${input.image_key}:`, err);
      throw new ImageSourceError('Uploaded image could not be retrieved — please re-add the photo', 404);
    }
  }
  return { imageBase64: input.imageBase64, mimeType: input.mimeType };
}
