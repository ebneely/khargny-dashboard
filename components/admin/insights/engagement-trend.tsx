'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { DateRange } from '../date-cell';
import { RecordCell } from '../record-cell';
import { RequestError } from '../subscriber-ui';
import { engagementMetrics, engagementNumber } from '@/lib/engagement';
import { changeAgainstPrevious, trendShape, type TrendShape } from '@/lib/engagement-trend';
import { engagementPlaces, engagementSeries, engagementSummary, metricTotal, type ReportMetric } from '@/lib/api/engagement-report';

/** What the open days of one metric mean, in the owner's words, per measure. */
const MEANING: Record<ReportMetric, string> = {
  views: 'Reported place views in these days.',
  saves: 'Reported save events, not confirmed new saves.',
  likes: 'New committed likes, not net of unlikes. Current place likes are a separate count.',
  directions: 'Directions and Go taps in these days.',
  shares: 'Reported share events in these days.',
};

/** A measure's label in the dashboard's one vocabulary (Likes, not loves). */
function measureLabel(metric: ReportMetric) {
  return engagementMetrics.find((item) => item.key === metric)?.label ?? 'Shares';
}

/**
 * A daily bar per stored day. A day the report has no count for draws nothing: the series
 * definition says a missing day is not a measured zero, so a bar there would be a lie.
 */
function TrendBars({ shape, label }: { shape: TrendShape; label: string }) {
  const height = 44;
  const barWidth = Math.max((100 / shape.days) * 0.62, 0.4);
  return <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-11 w-full text-primary" role="img" aria-label={label}>
    <line x1="0" y1={height - 0.5} x2="100" y2={height - 0.5} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    {shape.segments.flat().map((point) => {
      const barHeight = Math.max(1.5, (point.value / shape.max) * (height - 4));
      const x = Math.min(Math.max(point.x * 100 - barWidth / 2, 0), 100 - barWidth);
      return <rect key={point.x} x={x} y={height - barHeight} width={barWidth} height={barHeight} rx="0.6" fill="currentColor" />;
    })}
  </svg>;
}

/**
 * The trend and the place breakdown for one engagement measure, for a whole-day range
 * (issue khargny-dashboard#30). Every number comes from the same report the home's tiles
 * read, so the two screens cannot drift apart in definition.
 */
export function EngagementTrend({ metric, from, to, platform, cityId }: {
  metric: ReportMetric;
  from: string;
  to: string;
  platform?: string;
  cityId?: string;
}) {
  const copy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
  const loadSummary = React.useCallback(() => engagementSummary({ from, to, platform, cityId }), [from, to, platform, cityId]);
  const loadSeries = React.useCallback(() => engagementSeries({ from, to, metric, platform, cityId }), [from, to, metric, platform, cityId]);
  const loadPlaces = React.useCallback(() => engagementPlaces({ from, to, metric, platform, cityId, limit: 5 }), [from, to, metric, platform, cityId]);
  const summary = useSubscriberResource(loadSummary);
  const series = useSubscriberResource(loadSeries);
  const places = useSubscriberResource(loadPlaces);
  const label = copy(measureLabel(metric));
  const loading = summary.loading || series.loading || places.loading;
  const failed = summary.error || series.error || places.error;
  const total = metricTotal(summary.data, metric);
  const change = total ? changeAgainstPrevious(total.periodTotal, total.previousPeriodTotal) : null;
  const shape = React.useMemo(() => trendShape(series.data?.series ?? [], from, to), [series.data, from, to]);

  if (failed) {
    return <RequestError message={copy('Could not load the trend.')} retry={() => { void Promise.all([summary.refetch(), series.refetch(), places.refetch()]); }} />;
  }

  const number = (value: number | null | undefined) => engagementNumber(value, lang);
  const percent = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(0)}%`;

  return <div data-slot="engagement-trend" className="space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h3 className="font-medium">{copy('The trend, day by day')}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground"><DateRange start={from} end={to} /></p>
        <p className="text-xs text-muted-foreground">{copy('Known days only: a day with no stored count is left blank, never zero.')}</p>
      </div>
      {summary.loading ? <div className="h-8 w-24 animate-pulse rounded bg-muted" aria-hidden="true" />
        : <p className="flex items-baseline gap-2"><span className="text-muted-foreground">{label}</span><span className="font-display text-xl font-semibold tabular-nums">{number(total?.periodTotal)}</span></p>}
    </div>
    {loading ? <div className="h-11 animate-pulse rounded bg-muted" aria-busy="true" />
      : shape.knownDays ? <TrendBars shape={shape} label={`${label}: ${number(total?.periodTotal)} ${copy('in these days')}`} />
        : <p className="text-sm text-muted-foreground">{copy('No stored days in this range.')}</p>}
    <div className="space-y-1">
      {total && shape.knownDays > 0 && <p className="text-sm text-muted-foreground">
        {change === null ? copy('No comparison for these days.') : <>{percent(change)} {copy('vs the period before')}</>}
      </p>}
      <p className="text-xs text-muted-foreground">{copy(MEANING[metric])}</p>
    </div>
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{copy('Top places for this measure')}</h3>
        <span className="text-xs text-muted-foreground">{copy('Share of the period')}</span>
      </div>
      {places.loading ? <div className="h-16 animate-pulse rounded bg-muted" aria-busy="true" />
        : !places.data?.rows.length ? <p className="text-sm text-muted-foreground">{copy('No place recorded this measure in these days.')}</p>
          : <ol className="divide-y">{places.data.rows.map((row) => <li key={row.id} className="flex min-h-12 items-center gap-3 py-2">
            <Link href={`/dashboard/places/${row.id}`} className="min-w-0 flex-1" aria-label={pick(row.name, row.nameEn)}><RecordCell nameAr={row.name} nameEn={row.nameEn} thumbnail={row.cover ?? null} /></Link>
            <span className="shrink-0 text-sm tabular-nums">{number(row.value)}</span>
            <span className="w-12 shrink-0 text-end text-xs tabular-nums text-muted-foreground">{row.share === null ? '—' : `${Math.round(row.share * 100)}%`}</span>
          </li>)}</ol>}
    </div>
  </div>;
}
