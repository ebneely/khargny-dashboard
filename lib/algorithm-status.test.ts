import { describe, expect, it } from 'vitest';
import { algorithmStatusTotal, ALGORITHM_STATUS_ORDER, ALGORITHM_STATUS_WORDS } from './algorithm-status';

/** The owner's production figures: 86 Hyped + 173 Normal + 36 Cooling + 117 Needs listing. */
const productionCounts = { hyped: 86, normal: 173, cooling: 36, needs_listing: 117 };

describe('algorithm status counts', () => {
  it('should add every status: 86 + 173 + 36 + 117 = 412', () => {
    expect(algorithmStatusTotal(productionCounts)).toBe(412);
  });
  it('should stay the full sum while one status is selected', () => {
    // The list response's own total follows the filter (86 when Hyped is chosen); the counts do not.
    const filtered = { items: [], total: 86, counts: productionCounts };
    expect(algorithmStatusTotal(filtered.counts)).toBe(412);
  });
  it('should ignore unknown keys and count missing statuses as zero', () => {
    expect(algorithmStatusTotal({ hyped: 5, something_else: 99 })).toBe(5);
    expect(algorithmStatusTotal({})).toBe(0);
  });
  it('should be zero without counts', () => {
    expect(algorithmStatusTotal(undefined)).toBe(0);
    expect(algorithmStatusTotal(null)).toBe(0);
  });
  it('should name every status that has an icon and a meaning', () => {
    expect(ALGORITHM_STATUS_ORDER).toHaveLength(8);
    for (const status of ALGORITHM_STATUS_ORDER) expect(ALGORITHM_STATUS_WORDS[status]).toBeTruthy();
  });
});
