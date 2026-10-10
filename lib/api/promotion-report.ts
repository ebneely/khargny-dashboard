import type { AdPlaceSummary } from './ads';
import type { SurfaceKind } from './ads-round-b';
export interface PlanPromotionRow {
  source: 'plan' | 'campaign' | 'always_on'; place: AdPlaceSummary; subscriptionId: string | null; campaignId: string | null;
  startDate: string; endDate: string | null; state: string; promotedToday: boolean; reason: string | null;
  surface?: SurfaceKind; scope?: string; placements: { placement: SurfaceKind; scope: string; shownNow: boolean | null }[];
  delivery: { placement: SurfaceKind; scope: string; impressions: number; taps: number; share: number | null }[];
}
export interface PromotionReport { today: string; from: string; to: string; planPromotionsEnabled: boolean; data: PlanPromotionRow[] }
