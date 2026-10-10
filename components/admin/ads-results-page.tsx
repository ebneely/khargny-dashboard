'use client';

import { placeCover } from '@/lib/place-list';
import * as React from 'react';
import { Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AdsPageHeader } from './ads-page-header';
import { AdsRange, Measures } from './ads-round-b-ui';
import { AdsOpportunities } from './ads-opportunities';
import { AdsShuffleTests } from './ads-shuffle-tests';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { SegmentedControl } from './segmented-control';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, RequestError } from './subscriber-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adsBApi, adsCompatibleRead, adsUsesLocalSearch, type AdsResults, type ResultGroup } from '@/lib/api/ads-round-b';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { sourceLabels, validAdsRange } from '@/lib/ads-round7b';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useUrlTab } from '@/lib/use-url-tab';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { matchesRecord } from '@/lib/record-list';

export function AdsResultsPage({ canWrite = false }: { canWrite?: boolean }) { return <React.Suspense fallback={<LoadingState />}><ResultsContent canWrite={canWrite} /></React.Suspense>; }
function ResultsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const { pick } = useDashboardLang(); const params = useSearchParams(); const today = cairoDate();
  const section = useUrlTab(['results', 'opportunities', 'shuffle'], 'results'); const group = useUrlTab(['surface', 'area', 'city', 'place', 'source'], 'surface', 'by');
  const from = params.get('from') ?? shiftCalendarDays(today, -6); const to = params.get('to') ?? today; const valid = validAdsRange(from, to, 366);
  const address = useListAddress('ad-results'); const page = Math.floor(address.skip / address.limit) + 1; const limit = address.limit;
  const [exporting, setExporting] = React.useState(false); const exportLock = React.useRef(false); const [exportError, setExportError] = React.useState('');
  const load = React.useCallback(() => valid && section.value === 'results' ? adsBApi.results(from, to, group.value as ResultGroup, page, limit, address.query || undefined) : Promise.resolve(null), [address.query, from, to, group.value, page, limit, valid, section.value]);
  const resource = useSubscriberResource(load);
  const loadSurfaces = React.useCallback(() => adsBApi.surfaces(today, today), [today]); const surfaces = useSubscriberResource(loadSurfaces);
  const changeDate = (key: string, value: string) => { const next = new URLSearchParams(window.location.search); next.set(key, value); next.delete('ad-results-skip'); window.history.replaceState(null, '', `${window.location.pathname}?${next}`); };
  const exportResults = async () => {
    if (!valid || exportLock.current) return; exportLock.current = true; setExporting(true); setExportError('');
    try {
      const parts: string[] = []; let expected = 0; let count = 0;
      for (let nextPage = 1; ; nextPage++) {
        const result = await adsCompatibleRead<AdsResults>('/v1/admin/ads/results/export', { from, to, groupBy: group.value, page: nextPage, limit: 100 }, { q: address.query || undefined });
        if (nextPage === 1) expected = result.meta.total;
        if (!result.csv || result.meta.total !== expected || !result.data.length && count < expected) throw new Error('Incomplete export');
        parts.push(nextPage === 1 ? result.csv : result.csv.slice(result.csv.indexOf('\n') + 1)); count += result.data.length;
        if (count >= expected) break;
      }
      if (count < expected) throw new Error('Incomplete export');
      const url = URL.createObjectURL(new Blob(['\uFEFF', parts.join('\n')], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ads-${group.value}-${from}-${to}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError(copy('Could not export the complete report. No partial file was downloaded.')); }
    finally { exportLock.current = false; setExporting(false); }
  };
  const name = (key: string) => group.value === 'source' ? copy(sourceLabels[key as keyof typeof sourceLabels] ?? key) : group.value === 'surface' ? surfaces.data?.data.find(row => row.key === key)?.name ?? key : group.value === 'area' ? surfaces.data?.data.find(row => row.surface === 'area' && row.scope.key === key)?.name ?? key : key;
  return <div className="min-w-0 space-y-6"><AdsPageHeader title="Results" description="Attributed delivery compared with the preceding range, plus selling opportunities and shuffle tests." actions={section.value === 'shuffle' ? [{ label: 'New shuffle test', href: '/dashboard/ads/shuffle/new', allowed: canWrite }] : [{ label: exporting ? 'Exporting…' : 'Export CSV', onClick: () => { void exportResults(); }, disabled: exporting || !valid, readOnly: true, icon: <Download /> }]} />
    <SegmentedControl label="Results sections" value={section.value} onValueChange={section.onValueChange} options={[{ value: 'results', label: 'Results' }, { value: 'opportunities', label: 'Opportunities' }, { value: 'shuffle', label: 'Shuffle tests' }]} />
    {exportError && <RequestError message={exportError} />}
    {section.value === 'results' && <><Card><CardContent className="space-y-4"><AdsRange maximum={366} from={from} to={to} onFrom={date => changeDate('from', date)} onTo={date => changeDate('to', date)} /><SegmentedControl label="Group results" value={group.value} onValueChange={value => { address.change('skip', '0'); group.onValueChange(value); }} options={[{ value: 'surface', label: 'By surface' }, { value: 'area', label: 'By area' }, { value: 'city', label: 'By city' }, { value: 'place', label: 'By place' }, { value: 'source', label: 'By source' }]} /></CardContent></Card>{valid && <Card><CardHeader><CardTitle>{copy('Attributed promotion results')}</CardTitle></CardHeader><CardContent className="space-y-4">{resource.error ? <RequestError message={copy('Could not load promotion results.')} retry={() => { void resource.refetch(); }} /> : <><p className="text-sm text-muted-foreground">{copy('Current period')}: {from} — {to} · {copy('Previous period')}: {resource.data?.previous.from ?? '—'} — {resource.data?.previous.to ?? '—'}</p><RecordList scope="ad-results" address={address} records={(resource.data?.data ?? []).filter(row => !adsUsesLocalSearch(resource.data) || matchesRecord(`${row.name ?? name(row.key)} ${row.nameEn ?? ''} ${row.key}`, address.query))} total={resource.data?.meta.total ?? 0} busy={resource.loading} searchText={row => row.key} render={visible => <div>{visible.map(row => <div key={row.key} className="min-h-14 space-y-2 border-b py-3"><RecordCell icon={group.value === 'place' ? undefined : group.value === 'city' || group.value === 'area' ? 'location' : 'section'} nameAr={group.value === 'source' ? undefined : row.name ?? undefined} nameEn={group.value === 'source' ? undefined : row.nameEn} name={group.value === 'source' || !row.name ? name(row.key) : undefined} thumbnail={placeCover(row)} context={row.city ? pick(row.city.name, row.city.nameEn) : undefined} /><p className="text-sm font-medium">{copy('Current period')}</p><Measures value={row} /><p className="text-sm text-muted-foreground">{copy('Previous period')}</p><Measures value={row.previous} /></div>)}</div>} /><p className="text-sm text-muted-foreground">{copy('Only attributed directions and saves are counted. Legacy zero counters do not prove complete ingestion. Current Cairo day is partial.')} {adsUsesLocalSearch(resource.data) && copy('Search filters the current server page. Use the pager to inspect other pages.')}</p></>}</CardContent></Card>}</>}
    {section.value === 'opportunities' && <Card><CardHeader><CardTitle>{copy('Opportunities')}</CardTitle></CardHeader><CardContent>{surfaces.loading ? <LoadingState /> : surfaces.error ? <RequestError message={copy('Could not load surfaces.')} retry={() => { void surfaces.refetch(); }} /> : <AdsOpportunities surfaces={surfaces.data?.data ?? []} canWrite={canWrite} />}</CardContent></Card>}
    {section.value === 'shuffle' && <AdsShuffleTests canWrite={canWrite} />}
  </div>;
}
