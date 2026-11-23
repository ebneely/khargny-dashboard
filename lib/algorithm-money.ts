import type { AdCampaign } from './api/ads';

export interface RunningAdsTotals {
  ads: number;
  impressions: number;
  taps: number;
  amount: number;
  top: AdCampaign[];
}

/** The running-ads tile and list, from the same campaign rows Money > Ads already shows. */
export function runningAdsTotals(rows: AdCampaign[] | null | undefined): RunningAdsTotals {
  const list = rows ?? [];
  return {
    ads: list.length,
    impressions: list.reduce((sum, row) => sum + (row.totals?.impressions ?? 0), 0),
    taps: list.reduce((sum, row) => sum + (row.totals?.taps ?? 0), 0),
    amount: list.reduce((sum, row) => sum + Number(row.amountPaid ?? 0), 0),
    top: [...list].sort((a, b) => (b.totals?.impressions ?? 0) - (a.totals?.impressions ?? 0)).slice(0, 8),
  };
}
