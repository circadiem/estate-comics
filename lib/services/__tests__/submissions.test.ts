// WO-04 — submission persistence: atomic create with reference re-mint on
// collision, and non-fatal email-outcome bookkeeping.

import { describe, it, expect, vi } from 'vitest';
import {
  createSubmission,
  recordEmailOutcomes,
  SubmissionPersistenceError,
  REFERENCE_MINT_ATTEMPTS,
} from '@/lib/services/submissions';
import type { SubmissionStore, NewSubmission } from '@/lib/services/submissions';
import type { CollectionSummary } from '@/lib/schemas/offer';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

function fakeStore(rpcResults: RpcResult[], updateError: { message: string } | null = null) {
  const rpcCalls: unknown[] = [];
  const updateCalls: { values: unknown; id: string }[] = [];
  let i = 0;
  const store: SubmissionStore = {
    rpc(_fn, args) {
      rpcCalls.push(args);
      const result = rpcResults[Math.min(i, rpcResults.length - 1)];
      i++;
      return Promise.resolve(result);
    },
    from() {
      return {
        update(values) {
          return {
            eq(_col, id) {
              updateCalls.push({ values, id });
              return Promise.resolve({ error: updateError });
            },
          };
        },
      };
    },
  };
  return { store, rpcCalls, updateCalls };
}

const input: NewSubmission = {
  seller: {
    name: 'Test Seller',
    email: 'seller@example.com',
    phone: '203-555-0100',
    state: 'CT',
    city: 'Greenwich',
    zip: '06830',
    estimated_count: 40,
    storage_type: 'bagged_only',
    storage_location: 'normal_interior',
    known_restorations: false,
    timeline: 'flexible',
    pickup_available: true,
  },
  adjustment: { fmv_multiplier: 1, restoration_flag: false, adjustment_reasons: [] },
  // Book contents are opaque to the persistence layer; two placeholders suffice.
  books: [{} as NewSubmission['books'][number], {} as NewSubmission['books'][number]],
  below_minimum: true,
};

function summaryFor(reference_number: string): CollectionSummary {
  return {
    total_books_identified: 2,
    total_books_flagged: 0,
    total_fmv_low: 0,
    total_fmv_high: 0,
    total_offer_low: 0,
    total_offer_high: 0,
    pending_fmv_low: 0,
    pending_fmv_high: 0,
    pending_offer_low: 0,
    pending_offer_high: 0,
    key_issues_count: 0,
    hidden_gems_count: 0,
    bulk_lot_count: 0,
    breakdown_by_era: { golden: 0, silver: 0, bronze: 0, copper: 0, modern: 0 },
    breakdown_by_publisher: {},
    reference_number,
  };
}

const UNIQUE = { code: '23505', message: 'duplicate key value violates unique constraint' };

// ---------------------------------------------------------------------------
// createSubmission
// ---------------------------------------------------------------------------

describe('createSubmission', () => {
  it('inserts once and returns id, reference number and the matching summary', async () => {
    const { store, rpcCalls } = fakeStore([{ data: 'uuid-1', error: null }]);
    const mint = vi.fn(() => 'EC-20260918-AAAA');

    const result = await createSubmission(store, input, summaryFor, mint);

    expect(result).toEqual({
      id: 'uuid-1',
      reference_number: 'EC-20260918-AAAA',
      summary: summaryFor('EC-20260918-AAAA'),
    });
    expect(mint).toHaveBeenCalledTimes(1);
    expect(rpcCalls).toHaveLength(1);
    const args = rpcCalls[0] as { p_submission: Record<string, unknown>; p_books: unknown[] };
    expect(args.p_submission.reference_number).toBe('EC-20260918-AAAA');
    expect(args.p_submission.below_minimum).toBe(true);
    expect(args.p_books).toHaveLength(2);
    expect((args.p_books[1] as { position: number }).position).toBe(1);
  });

  it('re-mints and retries on a unique violation, rebuilding the summary', async () => {
    const { store, rpcCalls } = fakeStore([
      { data: null, error: UNIQUE },
      { data: 'uuid-2', error: null },
    ]);
    const refs = ['EC-20260918-0001', 'EC-20260918-0002'];
    const mint = vi.fn(() => refs.shift()!);

    const result = await createSubmission(store, input, summaryFor, mint);

    expect(rpcCalls).toHaveLength(2);
    expect(result.reference_number).toBe('EC-20260918-0002');
    expect(result.summary.reference_number).toBe('EC-20260918-0002');
  });

  it('gives up after REFERENCE_MINT_ATTEMPTS collisions', async () => {
    const { store, rpcCalls } = fakeStore([{ data: null, error: UNIQUE }]);
    let n = 0;
    const mint = () => `EC-20260918-${String(n++).padStart(4, '0')}`;

    await expect(createSubmission(store, input, summaryFor, mint)).rejects.toBeInstanceOf(
      SubmissionPersistenceError,
    );
    expect(rpcCalls).toHaveLength(REFERENCE_MINT_ATTEMPTS);
  });

  it('does not retry on a non-collision database error', async () => {
    const { store, rpcCalls } = fakeStore([
      { data: null, error: { code: '08006', message: 'connection failure' } },
    ]);

    await expect(
      createSubmission(store, input, summaryFor, () => 'EC-20260918-DEAD'),
    ).rejects.toThrow(/connection failure/);
    expect(rpcCalls).toHaveLength(1);
  });

  it('treats a missing id as a failure', async () => {
    const { store } = fakeStore([{ data: null, error: null }]);
    await expect(
      createSubmission(store, input, summaryFor, () => 'EC-20260918-BEEF'),
    ).rejects.toThrow(/no id/);
  });
});

// ---------------------------------------------------------------------------
// recordEmailOutcomes
// ---------------------------------------------------------------------------

describe('recordEmailOutcomes', () => {
  it('writes both booleans against the submission id', async () => {
    const { store, updateCalls } = fakeStore([]);
    await recordEmailOutcomes(store, 'uuid-9', {
      seller_email_sent: true,
      internal_email_sent: false,
    });
    expect(updateCalls).toEqual([
      { id: 'uuid-9', values: { seller_email_sent: true, internal_email_sent: false } },
    ]);
  });

  it('never throws when the bookkeeping write fails', async () => {
    const { store } = fakeStore([], { message: 'timeout' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      recordEmailOutcomes(store, 'uuid-9', { seller_email_sent: false, internal_email_sent: false }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
