// WO-03 — soft 100-book gate helper.

import { describe, it, expect } from 'vitest';
import { isBelowMinimum, BELOW_MINIMUM_NOTICE } from '@/lib/utils/collection-size';
import { MIN_COLLECTION_SIZE } from '@/lib/config/constants';

describe('isBelowMinimum', () => {
  it('is true strictly below the minimum and false at or above it', () => {
    expect(MIN_COLLECTION_SIZE).toBe(100);
    expect(isBelowMinimum(1)).toBe(true);
    expect(isBelowMinimum(99)).toBe(true);
    expect(isBelowMinimum(100)).toBe(false);
    expect(isBelowMinimum(2500)).toBe(false);
  });

  it('notice names the minimum and does not refuse the seller', () => {
    expect(BELOW_MINIMUM_NOTICE).toContain('100+');
    expect(BELOW_MINIMUM_NOTICE).toMatch(/welcome to continue/i);
  });
});
