'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import type { Movement } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { LoadingState, RequestError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function loadMovement(query: { from: string; to: string; platform?: string; cityId?: string }) {
  const report = await adminApi.get<Movement>('/v1/admin/analytics/movement', { ...query, skip: 0, limit: 200 });
  const total = Math.max(report.entries.meta.total, report.exits.meta.total, report.transitions.meta.total);
  for (let skip = 200; skip < total; skip += 200) {
    const page = await adminApi.get<Movement>('/v1/admin/analytics/movement', { ...query, skip, limit: 200 });
    for (const key of ['entries', 'exits', 'transitions'] as const) {
      if (report[key].meta.total > skip && !page[key].data.length) throw new Error('Incomplete movement report');
    }
    report.entries.data.push(...page.entries.data);
    report.exits.data.push(...page.exits.data);
    report.transitions.data.push(...page.transitions.data);
  }
  return report;
}

export function MovementPage() {
  const { query } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => loadMovement({ from, to, platform, cityId }), [from, to, platform, cityId]);
  const resource = useSubscriberResource(load);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={copy('Could not load movement.')} retry={() => { void resource.refetch(); }} />;
  const report = resource.data;
  const number = (value: number) => value.toLocaleString(lang);
  const percentage = (value: number) => value.toLocaleString(lang, { style: 'percent', maximumFractionDigits: 1 });
  const funnel = report.funnel.totals;
  return <div className="space-y-5"><h2 className="text-xl font-semibold">{copy('Movement')}</h2><Card><CardHeader><CardTitle>{copy('Actions in sessions')}</CardTitle><p className="text-sm text-muted-foreground">{copy('These are sessions containing actions, not an ordered conversion funnel. City is the first known city of the session.')}</p></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2">{[
    { title: 'Sessions', value: funnel.sessions, explanation: 'A visit ends after 30 minutes without activity.' },
    { title: 'Searched', value: funnel.searched, rate: funnel.searchRate, explanation: 'Sessions with a search, divided by all sessions.' },
    { title: 'Opened a place', value: funnel.viewedPlace, rate: funnel.placeViewRate, explanation: 'Sessions with a place view, divided by all sessions.' },
    { title: 'Acted after opening', value: funnel.acted, rate: funnel.actionRate, explanation: 'Sessions acting on a previously opened place, divided by sessions with a place view.' },
    { title: 'Session-place pairs', value: funnel.placeViews, explanation: 'Each place counts once per session, not once per page load.' },
    { title: 'Pairs with an action', value: funnel.actedPlaceViews, rate: funnel.placeActionRate, explanation: 'Previously viewed session-place pairs with an action, divided by viewed pairs.' },
  ].map((item) => <div key={item.title}><dt className="font-medium">{copy(item.title)}</dt><dd className="tabular-nums">{number(item.value)} {copy('in selected period')}{item.rate !== undefined && ` · ${percentage(item.rate)}`}</dd><p className="mt-1 text-sm text-muted-foreground">{copy(item.explanation)}</p></div>)}</dl></CardContent></Card>
    {(['entries', 'exits'] as const).map((kind) => <Card key={kind}><CardHeader><CardTitle>{copy(kind === 'entries' ? 'Entries' : 'Exits')}</CardTitle><p className="text-sm text-muted-foreground">{copy(kind === 'entries' ? 'The first recorded screen of each session.' : 'The last recorded screen of each session.')}</p></CardHeader><CardContent><RecordList scope={kind} records={report[kind].data} searchText={(row) => row.path} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.path} className="flex flex-wrap justify-between gap-3 py-3"><RecordCell icon="route" name={row.path} /><span className="tabular-nums">{number(row.count)} {copy('sessions · selected period')}</span></li>)}</ul>} /></CardContent></Card>)}
    <Card><CardHeader><CardTitle>{copy('Commonest steps')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Consecutive recorded screens; overflow is folded into other, so this is approximate.')}</p></CardHeader><CardContent><RecordList scope="steps" records={report.transitions.data} searchText={(row) => `${row.fromPath} ${row.toPath}`} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={`${row.fromPath}-${row.toPath}`} className="flex flex-wrap justify-between gap-3 py-3"><RecordCell icon="route" name={`${row.fromPath} → ${row.toPath}`} /><span className="tabular-nums">{number(row.count)} {copy('steps · selected period')}</span></li>)}</ul>} /></CardContent></Card>
  </div>;
}
