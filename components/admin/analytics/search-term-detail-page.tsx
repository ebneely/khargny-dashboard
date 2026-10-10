'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { termRoute, reverseTerm, type TermDetail } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { LoadingState, RequestError, SavedRefreshError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function loadTermDetail(term: string, query: { from: string; to: string; platform?: string; cityId?: string }) {
  const report = await adminApi.get<TermDetail>(termRoute(term), { ...query, skip: 0, limit: 200 });
  const keys = ['cities', 'clickedPlaces', 'placesThatWouldMatchNow'] as const;
  const total = Math.max(...keys.map((key) => report[key].meta.total));
  for (let skip = 200; skip < total; skip += 200) {
    const page = await adminApi.get<TermDetail>(termRoute(term), { ...query, skip, limit: 200 });
    for (const key of keys) {
      if (report[key].meta.total > skip && !page[key].data.length) throw new Error('Incomplete term detail');
      report[key].data.push(...page[key].data);
    }
  }
  return report;
}

export function SearchTermDetailPage({ term }: { term: string }) {
  const { query, cities } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const [busy, setBusy] = React.useState(false);
  const submitting = React.useRef(false);
  const [error, setError] = React.useState('');
  const load = React.useCallback(() => loadTermDetail(term, { from, to, platform, cityId }), [term, from, to, platform, cityId]);
  const resource = useSubscriberResource(load);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={copy('Could not load term details.')} retry={() => { void resource.refetch(); }} />;
  const report = resource.data;
  const number = (value: number) => value.toLocaleString(lang);
  const undo = async () => {
    if (submitting.current || readOnly || busy || resource.savedRefreshFailed) return;
    submitting.current = true; setBusy(true); setError('');
    try { await reverseTerm(term); if (await resource.refreshAfterSave()) toast.success(copy('Decision undone')); }
    catch (caught) { setError(copy(caught instanceof AdminApiError && caught.status === 409 ? 'This term changed or belongs to another keyword. Refresh and review it before trying again.' : 'Could not undo this decision. Refresh and try again.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <div className="space-y-5"><h2 dir="auto" className="break-words text-xl font-semibold">{report.term}</h2>
    {report.keyword && <RecordCell icon="tag" nameAr={report.keyword.name} nameEn={report.keyword.nameEn} context={copy('Owning keyword')} />}
    {report.decision && <div className="flex flex-wrap items-center gap-3"><p>{copy(report.decision.action === 'ignore' ? 'Ignored word' : 'Spelling saved')}</p>{!readOnly && <Button variant="outline" disabled={busy || resource.savedRefreshFailed} onClick={() => { void undo(); }}>{copy('Undo decision')}</Button>}</div>}
    {error && <RequestError message={error} retry={() => { void resource.refetch(); }} />}{resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    <Card><CardHeader><CardTitle>{copy('Daily search series')}</CardTitle></CardHeader><CardContent><RecordList scope="term-days" records={report.series} searchText={(row) => row.day} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.day} className="space-y-2 py-3"><RecordCell icon="calendar" name={row.day} /><p className="text-sm tabular-nums">{number(row.searches)} {copy('Searches')} · {number(row.zeroResults)} {copy('Nothing found')} · {number(row.clicks)} {copy('Result taps')}</p></li>)}</ul>} /></CardContent></Card>
    {(['cities', 'clickedPlaces', 'placesThatWouldMatchNow'] as const).map((kind) => <Card key={kind}><CardHeader><CardTitle>{copy(kind === 'cities' ? 'Cities' : kind === 'clickedPlaces' ? 'Tapped places' : 'Would match now')}</CardTitle>{kind === 'placesThatWouldMatchNow' && <p className="text-sm text-muted-foreground">{copy('Current public search matches, not a reconstruction of past results.')}</p>}</CardHeader><CardContent><RecordList scope={kind} records={report[kind].data} searchText={(row) => Object.values(row).filter((value) => typeof value === 'string').join(' ')} render={(rows) => <ul className="divide-y">{rows.map((row, index) => {
      const text = (key: string) => typeof row[key] === 'string' ? row[key] as string : undefined;
      const city = kind === 'cities' ? cities.find((city) => city.id === text('cityId')) : undefined;
      const nameAr = text('name') ?? city?.name;
      const nameEn = text('nameEn') ?? city?.nameEn;
      return <li key={text('placeId') ?? text('cityId') ?? text('id') ?? index} className="space-y-2 py-3"><RecordCell icon={kind === "cities" ? "location" : undefined} nameAr={nameAr} nameEn={nameEn} name={!nameAr && !nameEn ? copy(kind === 'cities' && row.cityId === null ? 'Unspecified city' : 'Unknown record') : undefined} thumbnail={kind === 'cities' ? undefined : text('coverImage') ?? null} />{typeof row.searches === 'number' && <p className="text-sm tabular-nums">{number(row.searches)} {copy('Searches')}</p>}{typeof row.zeroResults === 'number' && <p className="text-sm tabular-nums">{number(row.zeroResults)} {copy('Nothing found')}</p>}{typeof row.clicks === 'number' && <p className="text-sm tabular-nums">{number(row.clicks)} {copy('Result taps')}</p>}</li>;
    })}</ul>} /></CardContent></Card>)}
  </div>;
}
