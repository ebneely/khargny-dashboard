import { adminApi } from './admin-client';

/**
 * GET /v1/admin/analytics/engagement — one metric definition for the whole dashboard.
 *
 * `summary` totals a period against the period before it, `series` gives the stored days
 * only (a missing day is not a measured zero), and `places` ranks places by the same
 * metric with their share of the period total. Likes are committed new likes in the
 * period, never the current stored pair count.
 */
export const REPORT_METRICS = ['likes', 'saves', 'views', 'directions', 'shares'] as const;
export type ReportMetric = (typeof REPORT_METRICS)[number];

export interface EngagementMetricTotal {
  metric: ReportMetric;
  basis: string;
  periodTotal: number;
  previousPeriodTotal: number;
  newInPeriod: number | null;
  removedInPeriod: number | null;
  netInPeriod: number | null;
  distinctVisitors: number | null;
  standingNow: number | null;
  distinctVisitorsNow: number | null;
  standingPlatform: string | null;
}

export interface EngagementSummary {
  from: string;
  to: string;
  timezone: string;
  platform: string;
  cityId: string | null;
  categoryId: string | null;
  previousPeriod: { from: string; to: string };
  metrics: EngagementMetricTotal[];
  unavailableMetrics: { metric: string; periodTotal: null; allTimeTotal: null; basis: string }[];
  definitions: Record<string, string>;
}

export interface EngagementSeries {
  from: string;
  to: string;
  metric: ReportMetric;
  basis: string;
  /** Only days with a stored count; the gap is not asserted to be zero. */
  series: { date: string; value: number }[];
  definitions: Record<string, string>;
}

export interface EngagementPlaceRow {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  value: number;
  /** The row's part of the period total, 0..1, or null when the total is zero. */
  share: number | null;
  cityId?: string;
  cityAr?: string;
  cityEn?: string | null;
  cover?: string | null;
}

export interface EngagementRanking {
  from: string;
  to: string;
  metric: ReportMetric;
  basis: string;
  group: 'place';
  periodTotal: number;
  rows: EngagementPlaceRow[];
  meta: { page: number; limit: number; total: number };
  definitions: Record<string, string>;
}

/** Every report takes whole Cairo days and the same optional scope as the overview. */
export interface EngagementScope {
  from: string;
  to: string;
  platform?: string;
  cityId?: string;
}

const scopeParams = ({ from, to, platform, cityId }: EngagementScope) => ({ from, to, platform, cityId });

export const engagementSummary = (scope: EngagementScope) =>
  adminApi.get<EngagementSummary>('/v1/admin/analytics/engagement/summary', scopeParams(scope));

export const engagementSeries = (scope: EngagementScope & { metric: ReportMetric }) =>
  adminApi.get<EngagementSeries>('/v1/admin/analytics/engagement/series', { ...scopeParams(scope), metric: scope.metric });

export const engagementPlaces = (scope: EngagementScope & { metric: ReportMetric; limit?: number }) =>
  adminApi.get<EngagementRanking>('/v1/admin/analytics/engagement/places', {
    ...scopeParams(scope),
    metric: scope.metric,
    limit: scope.limit ?? 5,
  });

/** The one measured total for a metric in a summary, or undefined when the API left it out. */
export function metricTotal(summary: EngagementSummary | null | undefined, metric: ReportMetric) {
  return summary?.metrics.find((row) => row.metric === metric);
}
