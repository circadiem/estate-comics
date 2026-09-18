// Collection-size policy helpers.
//
// The 100-book minimum is a SOFT gate: the seller sees an inline notice and may
// continue; the operator sees `below_minimum` on the internal notification (and,
// once persistence lands, on the submission row) and decides. Nothing here
// blocks a submission.

import { MIN_COLLECTION_SIZE } from '@/lib/config/constants';

export function isBelowMinimum(estimatedCount: number): boolean {
  return estimatedCount < MIN_COLLECTION_SIZE;
}

export const BELOW_MINIMUM_NOTICE =
  `Our appraisal service is designed for collections of ${MIN_COLLECTION_SIZE}+ books. ` +
  "You're welcome to continue, but smaller collections may be better served by a local comic shop.";
