// Bounded request-body reading (WO-08 task 4)
//
// `request.json()` buffers the whole body before anything can validate it, so
// a route that accepts base64 images must cap the body BEFORE parsing or a
// single large POST is an easy memory exhaustion. Content-Length is checked
// first as a cheap reject, then the stream itself is capped, because a client
// may omit or understate the header.

export class BodyTooLargeError extends Error {
  constructor(public readonly limitBytes: number) {
    super(`Request body exceeds ${limitBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

export class BodyNotJsonError extends Error {
  constructor() {
    super('Request body must be valid JSON');
    this.name = 'BodyNotJsonError';
  }
}

/**
 * Read and JSON-parse a request body, refusing anything over `limitBytes`.
 * Throws BodyTooLargeError or BodyNotJsonError; never returns oversized data.
 */
export async function readJsonBodyWithLimit(
  request: Request,
  limitBytes: number,
): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > limitBytes) throw new BodyTooLargeError(limitBytes);
  }

  const body = request.body;
  let text: string;
  if (!body) {
    // No stream available (some runtimes, and undici with a buffered body).
    text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > limitBytes) throw new BodyTooLargeError(limitBytes);
  } else {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel().catch(() => {});
        throw new BodyTooLargeError(limitBytes);
      }
      chunks.push(value);
    }
    text = Buffer.concat(chunks).toString('utf8');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BodyNotJsonError();
  }
}
