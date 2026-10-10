'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import { searchOverview, type Movement } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from '../dashboard-text';
import { LoadingState, RequestError } from '../subscriber-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInsightFilters } from './analytics-shell';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { AnalyticsLikes } from './likes-report';
import { AnalyticsSuggestions } from './suggestions';
import { SessionTrend } from './session-trend';

export function AnalyticsOverviewPage() {
  const { query } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(async () => {
    const [search, movement] = await Promise.all([searchOverview({ from, to, platform, cityId }), adminApi.get<Movement>('/v1/admin/analytics/movement', { from, to, platform, cityId, limit: 1 })]);
    return { search, movement };
  }, [from, to, platform, cityId]);
  const resource = useSubscriberResource(load);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={copy('Could not load analytics.')} retry={() => { void resource.refetch(); }} />;
  const { search, movement } = resource.data;
  const sessionDays = movement.funnel.series.filter((row) => typeof row.day === 'string' && typeof row.platform === 'string');
  const number = (value: number) => value.toLocaleString(lang);
  const share = (value: number) => value.toLocaleString(lang, { style: 'percent', maximumFractionDigits: 1 });
  return <div className="space-y-5"><h2 className="text-xl font-semibold">{copy('Overview')}</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { title: 'Sessions', value: number(movement.funnel.totals.sessions), unit: 'sessions · selected period' },
      { title: 'Recorded searches', value: number(search.searches), unit: 'searches · selected period' },
      { title: 'Nothing found share', value: share(search.searches ? search.zeroResults / search.searches : 0), unit: 'of recorded searches · selected period' },
      { title: 'Result taps', value: number(search.clicks), unit: 'taps · selected period' },
    ].map((tile) => <Card key={tile.title}><CardContent><p className="text-sm text-muted-foreground">{copy(tile.title)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{tile.value}</p><p className="text-sm text-muted-foreground">{copy(tile.unit)}</p>{tile.title === 'Sessions' && <SessionTrend series={movement.funnel.series} />}</CardContent></Card>)}</div>
    <p className="text-sm text-muted-foreground">{copy('Recorded terms exclude private text and very short searches. Taps are events, not unique people.')}</p>
    {!!sessionDays.length && <Card><CardHeader><CardTitle>{copy('Sessions by day')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Only stored session days are shown; missing days are not invented.')}</p></CardHeader><CardContent><RecordList scope="overview-days" records={sessionDays} searchText={(row) => `${row.day} ${row.platform}`} filters={[{ key: 'platform', label: 'All platforms', options: [{ value: 'app', label: 'App' }, { value: 'web', label: 'Web' }, { value: 'unknown', label: 'Unknown platform' }], value: (row) => row.platform ?? '' }]} render={(rows) => <ul className="divide-y">{rows.map((row, index) => <li key={`${row.day}-${row.platform}-${index}`} className="flex flex-wrap justify-between gap-3 py-3"><RecordCell icon="calendar" name={row.day} context={copy(row.platform === 'app' ? 'App' : row.platform === 'web' ? 'Web' : 'Unknown platform')} /><p className="tabular-nums">{number(row.sessions)} {copy('Sessions')}</p></li>)}</ul>} /></CardContent></Card>}
    <AnalyticsLikes /><AnalyticsSuggestions />
  </div>;
}
