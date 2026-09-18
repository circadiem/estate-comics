// Concurrency-limited async pool (WO-06)
//
// Runs `worker` over `items` with at most `limit` in flight at once. Order of
// completion is not guaranteed; the returned array preserves input order.
// A rejected worker does not abort the pool — the rejection is surfaced in
// the corresponding result slot, mirroring Promise.allSettled.

export type PoolResult<R> =
  | { status: 'fulfilled'; value: R }
  | { status: 'rejected'; reason: unknown };

export async function asyncPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PoolResult<R>[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`asyncPool: limit must be a positive integer, got ${limit}`);
  }
  const results: PoolResult<R>[] = new Array(items.length);
  let next = 0;

  async function lane(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const lanes = Array.from({ length: Math.min(limit, items.length) }, () => lane());
  await Promise.all(lanes);
  return results;
}
