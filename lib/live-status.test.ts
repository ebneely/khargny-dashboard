import { describe, expect, it } from 'vitest';
import { liveNowTotals, type LiveBundle, type LiveTotals } from './live-status';

const totals: LiveTotals = { visitors: 12, visits: 20, pages: 44, placeViews: 9, actions: 61 };
const at = '2026-11-22T10:00:00.000Z';
const bundle = (summary: Record<string, unknown>) => ({ summary: { generatedAt: at, window: '5m', ...summary } } as unknown as LiveBundle);

describe('live bundle "Right now" totals', () => {
  it('should read the totals the API nests under summary.now', () => {
    expect(liveNowTotals(bundle({ now: { totals, series: [], complete: true, gaps: [] } }))).toEqual(totals);
  });
  it('should be empty when summary.now is absent, never a made-up zero', () => {
    expect(liveNowTotals(bundle({ totals }))).toBeNull();
    expect(liveNowTotals(bundle({}))).toBeNull();
  });
  it('should be empty when now has no totals', () => {
    expect(liveNowTotals(bundle({ now: { totals: null, series: [], complete: false, gaps: ['5m'] } }))).toBeNull();
  });
  it('should be empty before the first snapshot arrives', () => {
    expect(liveNowTotals(null)).toBeNull();
    expect(liveNowTotals(undefined)).toBeNull();
  });
});
