// Request contract for POST /api/upload (R2 photo upload)

import { z } from 'zod';

export const UploadRequestSchema = z.object({
  session_id: z.string().uuid(),
  image_id: z.string().uuid(),
  /** Processed cover, JPEG, base64 without the data-URL prefix */
  image_base64: z.string().min(1),
  /** Small JPEG thumbnail for the report (≤ 240px edge), base64 */
  thumbnail_base64: z.string().min(1).optional(),
});

export type UploadRequest = z.infer<typeof UploadRequestSchema>;
