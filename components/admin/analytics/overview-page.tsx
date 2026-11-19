'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import { searchOverview, type Movement } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { DashboardText, useDashboardCopy } from '../dashboard-text';
import { LoadingState, RequestError } from '../subscriber-ui';
import { Card, CardContent } from '@/components/ui/card';
import { useInsightFilters } from './analytics-shell';
import { AnalyticsLikes } from './likes-report';
import Link from '@/components/lang-link';
import { ArrowUpRight } from 'lucide-react';
import { WINDOW_WORDS } from './window-switch';
import { SessionTrend } from './session-trend';
import { useAnalyticsOverview } from '@/lib/api/hooks/use-analytics';
import { InsightsSummary } from '../insights/insights-summary';
import { NumbersSmart } from './numbers-smart';
import { useSitePeople } from '../people-switch';
import { peopleLine } from '@/lib/people';

/** The catalogue-wide summary for the chosen window (or custom days). */
function AnalyticsInsights({ range }: { range: { window?: string; from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useAnalyticsOverview(range);
  const copy = useDashboardCopy();
  const people = useSitePeople(range.window);
  return <section aria-labelledby="analytics-insights" className="space-y-3"><div><h2 id="analytics-insights" className="font-display text-xl font-semibold"><DashboardText>Insights</DashboardText></h2><p className="mt-1 text-sm text-muted-foreground"><DashboardText>What visitors are doing across the catalogue.</DashboardText></p></div>
    {isError ? <RequestError message={copy('Could not load analytics.')} retry={() => { void refetch(); }} /> : <InsightsSummary data={data} loading={isLoading} people={people} />}</section>;
}

export function AnalyticsOverviewPage() {
  const { query } = useInsightFilters();
  const { from, to, window: span, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(async () => {
    const [search, movement] = await Promise.all([searchOverview({ from, to, window: span, platform, cityId }), adminApi.get<Movement>('/v1/admin/analytics/movement', { from, to, window: span, platform, cityId, limit: 1 })]);
    return { search, movement };
  }, [from, to, span, platform, cityId]);
  const resource = useSubscriberResource(load);
  // Decision 0009: the people behind the searches; only for the whole site (no platform or city filter).
  const people = useSitePeople(platform || cityId ? undefined : span);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={copy('Could not load analytics.')} retry={() => { void resource.refetch(); }} />;
  const { search, movement } = resource.data;
  const unit = span ? copy(WINDOW_WORDS[span]) : `${from} – ${to}`;
  const number = (value: number) => value.toLocaleString(lang);
  const share = (value: number) => value.toLocaleString(lang, { style: 'percent', maximumFractionDigits: 1 });
  return <div className="space-y-5">
    {span ? <NumbersSmart window={span} /> : <p className="text-sm text-muted-foreground">{copy('Answers, insights and hype count back from now; choose Live, 24 h, 7 days or 30 days to see them.')}</p>}
    {span === 'live' && <Link href="/dashboard/numbers/live" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{copy('Who is here now, minute by minute')}<ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" /></Link>}
    <AnalyticsInsights range={{ from, to, window: span }} /><h2 className="text-xl font-semibold">{copy('Overview')}</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { title: 'Sessions', value: number(movement.funnel.totals.sessions), unit, people: '' },
      { title: 'Recorded searches', value: number(search.searches), unit, people: peopleLine(search.searches, people?.searches, { people: copy('people'), fresh: copy('new'), each: copy('each') }) },
      { title: 'Nothing found share', value: share(search.searches ? search.zeroResults / search.searches : 0), unit, people: '' },
      { title: 'Result taps', value: number(search.clicks), unit, people: '' },
    ].map((tile) => <Card key={tile.title}><CardContent><p className="text-sm text-muted-foreground">{copy(tile.title)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{tile.value}</p><p className="text-sm text-muted-foreground">{tile.unit}</p>{tile.people && <p className="mt-1 text-xs text-muted-foreground">{tile.people}</p>}{tile.title === 'Sessions' && <SessionTrend series={movement.funnel.series} />}</CardContent></Card>)}</div>
    <AnalyticsLikes />
  </div>;
}
