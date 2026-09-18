// WO-02 — reference number format and validation.

import { describe, it, expect } from 'vitest';
import {
  generateReferenceNumber,
  isValidReferenceNumber,
  REFERENCE_NUMBER_REGEX,
} from '@/lib/utils/reference-number';

describe('generateReferenceNumber', () => {
  it('produces EC-YYYYMMDD-XXXX', () => {
    const ref = generateReferenceNumber(new Date(2026, 8, 18)); // 18 Sep 2026, local time
    expect(ref).toMatch(REFERENCE_NUMBER_REGEX);
    expect(ref.startsWith('EC-20260918-')).toBe(true);
    expect(ref).toHaveLength(16);
  });

  it('zero-pads month, day and suffix', () => {
    for (let i = 0; i < 200; i++) {
      const ref = generateReferenceNumber(new Date(2026, 0, 5)); // 05 Jan
      expect(ref).toMatch(/^EC-20260105-[0-9A-F]{4}$/);
    }
  });
});

describe('isValidReferenceNumber', () => {
  it('accepts the canonical format', () => {
    expect(isValidReferenceNumber('EC-20260918-A4F2')).toBe(true);
    expect(isValidReferenceNumber('EC-20260918-0000')).toBe(true);
    expect(isValidReferenceNumber('EC-20260918-FFFF')).toBe(true);
  });

  it('rejects the retired prefix, lowercase hex, and malformed shapes', () => {
    expect(isValidReferenceNumber('TCB-20260918-A4F2')).toBe(false);
    expect(isValidReferenceNumber('EC-20260918-a4f2')).toBe(false);
    expect(isValidReferenceNumber('EC-2026918-A4F2')).toBe(false);
    expect(isValidReferenceNumber('EC-20260918-A4F')).toBe(false);
    expect(isValidReferenceNumber('EC-20260918-A4F2 ')).toBe(false);
    expect(isValidReferenceNumber('')).toBe(false);
  });
});
