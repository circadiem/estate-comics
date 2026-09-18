// WO-06 — the pipeline pool never exceeds its concurrency limit.

import { describe, it, expect } from 'vitest';
import { asyncPool } from '@/lib/utils/async-pool';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('asyncPool', () => {
  it('never has more than `limit` workers in flight', async () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    let inFlight = 0;
    let peak = 0;
    const results = await asyncPool(items, 4, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1 + (n % 3)));
      inFlight--;
      return n * 2;
    });
    expect(peak).toBe(4);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual(
      items.map((n) => n * 2),
    );
  });

  it('starts the (limit+1)th item only after one of the first `limit` finishes', async () => {
    const gates = Array.from({ length: 5 }, deferred);
    const started: number[] = [];
    const run = asyncPool([0, 1, 2, 3, 4], 2, async (i) => {
      started.push(i);
      await gates[i].promise;
      return i;
    });
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    gates[0].resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(started).toEqual([0, 1, 2]);
    gates.forEach((g) => g.resolve());
    await run;
    expect(started).toEqual([0, 1, 2, 3, 4]);
  });

  it('isolates a rejection to its own slot and keeps going', async () => {
    const results = await asyncPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });
    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(results[1].status).toBe('rejected');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('handles an empty list and rejects a bad limit', async () => {
    expect(await asyncPool([], 4, async () => 1)).toEqual([]);
    await expect(asyncPool([1], 0, async () => 1)).rejects.toBeInstanceOf(RangeError);
  });
});
