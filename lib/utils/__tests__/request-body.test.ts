// WO-08 task 4 — the request body is capped before it is buffered or parsed.

import { describe, it, expect } from 'vitest';
import {
  BodyNotJsonError,
  BodyTooLargeError,
  readJsonBodyWithLimit,
} from '@/lib/utils/request-body';

const LIMIT = 1024;

function streamRequest(payload: string, opts: { contentLength?: string | null } = {}): Request {
  const bytes = new TextEncoder().encode(payload);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Deliver in small chunks so the cap is exercised mid-stream
      for (let i = 0; i < bytes.length; i += 64) controller.enqueue(bytes.slice(i, i + 64));
      controller.close();
    },
  });
  const headers = new Headers();
  if (opts.contentLength !== null) {
    headers.set('content-length', opts.contentLength ?? String(bytes.byteLength));
  }
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    headers,
    body,
    // @ts-expect-error undici requires this for a stream body
    duplex: 'half',
  });
}

describe('readJsonBodyWithLimit', () => {
  it('parses a body inside the limit', async () => {
    const body = await readJsonBodyWithLimit(streamRequest(JSON.stringify({ a: 1 })), LIMIT);
    expect(body).toEqual({ a: 1 });
  });

  it('rejects on a declared content-length over the limit, without reading', async () => {
    const req = streamRequest('{}', { contentLength: String(LIMIT + 1) });
    await expect(readJsonBodyWithLimit(req, LIMIT)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(req.bodyUsed).toBe(false); // refused before the stream was consumed
  });

  it('rejects an oversized body that understates its content-length', async () => {
    const payload = JSON.stringify({ a: 'x'.repeat(LIMIT * 2) });
    // A lying header must not be believed
    const req = streamRequest(payload, { contentLength: '10' });
    await expect(readJsonBodyWithLimit(req, LIMIT)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('rejects an oversized body with no content-length at all', async () => {
    const payload = JSON.stringify({ a: 'x'.repeat(LIMIT * 2) });
    await expect(
      readJsonBodyWithLimit(streamRequest(payload, { contentLength: null }), LIMIT),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('distinguishes malformed JSON from an oversized body', async () => {
    await expect(readJsonBodyWithLimit(streamRequest('not json'), LIMIT)).rejects.toBeInstanceOf(
      BodyNotJsonError,
    );
  });
});
