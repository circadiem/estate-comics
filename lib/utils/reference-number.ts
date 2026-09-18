// Reference number generator and validator
// Format: EC-YYYYMMDD-XXXX  (e.g., EC-20260918-A4F2)
// XXXX = 4-character uppercase hex for uniqueness within a day.
//
// ONE reference number per appraisal session. `/api/submit` is the canonical
// minting point; every other surface (PDF, CSV, on-screen confirmation, both
// emails) carries the number it minted. Nothing else may call
// generateReferenceNumber() for seller-facing output.

export const REFERENCE_NUMBER_PREFIX = 'EC';

/** Strict shape check. Prefix, 8-digit date, dash, 4 uppercase hex chars. */
export const REFERENCE_NUMBER_REGEX = /^EC-\d{8}-[0-9A-F]{4}$/;

export function isValidReferenceNumber(value: string): boolean {
  return REFERENCE_NUMBER_REGEX.test(value);
}

export function generateReferenceNumber(now: Date = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const suffix = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  return `${REFERENCE_NUMBER_PREFIX}-${date}-${suffix}`;
}
