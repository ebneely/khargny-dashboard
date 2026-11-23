import { describe, expect, it } from 'vitest';
import { runningAdsTotals } from './algorithm-money';
import type { AdCampaign } from './api/ads';

const campaign = (id: string, impressions: number, taps: number, amountPaid: number) =>
  ({ id, totals: { impressions, taps, ctr: null, reach: 0 }, amountPaid, currency: 'EGP' } as unknown as AdCampaign);

describe('running ads totals', () => {
  it('should add the live campaigns, their shown, taps and amount recorded', () => {
    const totals = runningAdsTotals([campaign('a', 100, 10, 500), campaign('b', 300, 5, 250)]);
    expect(totals).toMatchObject({ ads: 2, impressions: 400, taps: 15, amount: 750 });
  });
  it('should list the most shown first, capped at eight rows', () => {
    const rows = Array.from({ length: 10 }, (_, index) => campaign(`c${index}`, index, 0, 0));
    const totals = runningAdsTotals(rows);
    expect(totals.top).toHaveLength(8);
    expect(totals.top[0].id).toBe('c9');
  });
  it('should be a measured zero when no ad is running', () => {
    expect(runningAdsTotals([])).toMatchObject({ ads: 0, impressions: 0, taps: 0, amount: 0, top: [] });
    expect(runningAdsTotals(undefined)).toMatchObject({ ads: 0, top: [] });
  });
});
