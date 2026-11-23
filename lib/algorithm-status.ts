import type { AlgorithmStatus } from './api/algorithm';

/**
 * Decision 0006, section 4b: one status per place. The order is the one the owner reads:
 * the stages of a place's journey first, then the neutral default, then the two ways it leaves the top.
 */
export const ALGORITHM_STATUS_ORDER: readonly AlgorithmStatus[] = [
  'new', 'trial', 'rising', 'hyped', 'normal', 'cooling', 'resting', 'needs_listing',
];

export const ALGORITHM_STATUS_WORDS: Record<AlgorithmStatus, string> = {
  new: 'New', normal: 'Normal', trial: 'On trial', rising: 'Rising', hyped: 'Hyped', cooling: 'Cooling', resting: 'Resting', needs_listing: 'Needs listing',
};

/** One plain line per status, in the wording of decision 0006 section 4b. English is the key for the copy. */
export const ALGORITHM_STATUS_MEANINGS: Record<AlgorithmStatus, string> = {
  new: 'New: added or updated in the last 14 days, with photos and hours, not yet tried.',
  trial: 'On trial: getting its ~300 showings before the first decision.',
  rising: 'Rising: not hyped yet, but its hype grew 50% or more week on week and its interest is above the city median.',
  hyped: 'Hyped: in the top 30% of hype in its city.',
  normal: 'Normal: the default; it waits for interest.',
  cooling: 'Cooling: hyped, but its hype fell 30% or more week on week.',
  resting: 'Resting: its trial ended with no interest; it returns to trial in 7 days.',
  needs_listing: 'Needs listing: missing photos or opening hours, so it gets no trial.',
};

export function isAlgorithmStatus(value: string): value is AlgorithmStatus {
  return (ALGORITHM_STATUS_ORDER as readonly string[]).includes(value);
}

/**
 * The "All statuses" count: every place that holds a status, regardless of which status is
 * selected. The list response's own `total` follows the filter, so it can never be used here.
 */
export function algorithmStatusTotal(counts: Record<string, number> | null | undefined): number {
  if (!counts) return 0;
  return ALGORITHM_STATUS_ORDER.reduce((total, status) => {
    const count = counts[status];
    return total + (typeof count === 'number' && Number.isFinite(count) ? count : 0);
  }, 0);
}
