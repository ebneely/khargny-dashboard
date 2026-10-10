'use client';

import * as React from 'react';
import { Eye, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { Measures } from './ads-round-b-ui';
import { useDashboardCopy } from './dashboard-text';
import { ActionDialog, LoadingState, RequestError, SavedRefreshError, type ActionSpec } from './subscriber-ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adsError, smallShuffleSample, surfaceLabels } from '@/lib/ads-round7b';
import { adsBApi, adsCompatibleRead, adsUsesLocalSearch, type ShuffleTest } from '@/lib/api/ads-round-b';
import { cairoDate } from '@/lib/api/subscribers';
import { matchesRecord } from '@/lib/record-list';

export function AdsShuffleTests({ canWrite }: { canWrite: boolean }) { return <React.Suspense fallback={<LoadingState />}><ShuffleContent canWrite={canWrite} /></React.Suspense>; }
function ShuffleContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const address = useListAddress('shuffle'); const page = Math.floor(address.skip / address.limit) + 1; const limit = address.limit;
  const params = useSearchParams(); const [selected, setSelected] = React.useState<string | null>(() => params.get('test')); const [action, setAction] = React.useState<ActionSpec | null>(null);
  const load = React.useCallback(() => adsCompatibleRead<{ data: ShuffleTest[]; meta: { total: number } }>('/v1/admin/ads/shuffle-tests', { page, limit }, { q: address.query || undefined }), [page, limit, address.query]);
  const resource = useSubscriberResource(load);
  const loadResults = React.useCallback(() => selected ? adsBApi.shuffleResults(selected) : Promise.resolve(null), [selected]);
  const results = useSubscriberResource(loadResults, resource.data); const today = cairoDate();
  const state = (test: ShuffleTest) => test.status === 'stopped' ? 'Stopped' : test.startDate > today ? 'Scheduled' : test.endDate < today ? 'Ended' : 'Running';
  const locked = !canWrite || resource.loading || Boolean(resource.error) || resource.savedRefreshFailed;
  return <div className="space-y-6"><p className="text-sm text-muted-foreground">{copy('A shuffle test shares unoccupied positions fairly to learn which places visitors act on; it is not a paid promotion.')}</p>{resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    <Card><CardHeader><CardTitle>{copy('Shuffle tests')}</CardTitle></CardHeader><CardContent>{resource.error ? <RequestError message={copy('Could not load shuffle tests.')} retry={() => { void resource.refetch(); }} /> : <RecordList scope="shuffle" address={address} total={resource.data?.meta.total ?? 0} busy={resource.loading} records={(resource.data?.data ?? []).filter(row => !adsUsesLocalSearch(resource.data) || matchesRecord(row.name, address.query))} searchText={row => row.name} empty="No tests on this page. Create a test to compare eligible places." render={visible => <div>{visible.map(test => <div key={test.id} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><div className="min-w-0 flex-1"><RecordCell icon="section" name={test.name} chips={<Badge variant="secondary">{copy(state(test))}</Badge>} context={`${copy(surfaceLabels[test.surface])} · ${test.startDate} — ${test.endDate}`} /></div><RowActions recordName={test.name} actions={[{ label: 'View ranked results', icon: <Eye />, onClick: () => setSelected(test.id) }, ...(canWrite && test.status === 'active' && test.endDate >= today ? [{ label: 'Stop shuffle test', icon: <X />, disabled: locked, destructive: true, onClick: () => setAction({ title: copy('Stop shuffle test?'), description: copy('This permanently stops rotation for this test. It cannot be resumed; accepted results remain.'), destructive: true, submit: async () => { if (locked) return; try { await adminApi.post(`/v1/admin/ads/shuffle-tests/${test.id}/stop`); } catch (caught) { throw new Error(copy(adsError(caught))); } await resource.refreshAfterSave(); } }) }] : [])]} /></div>)}</div>} />}</CardContent></Card>
    {selected && <Card><CardHeader><CardTitle>{copy('Ranked shuffle results')}</CardTitle></CardHeader><CardContent className="space-y-4">{results.loading ? <LoadingState /> : results.error ? <RequestError message={copy('Could not load shuffle results.')} retry={() => { void results.refetch(); }} /> : results.data && <><p className="text-sm">{results.data.test.name} · {results.data.test.startDate} — {results.data.test.endDate}</p><p className="text-sm text-muted-foreground">{copy('Paid campaigns come first, then plans; shuffle fills only unoccupied positions. Low exposure is not proof that a place is worse.')}</p><RecordList scope="shuffle-ranks" records={results.data.data} searchText={row => row.name} render={visible => <div>{visible.map(row => <div key={row.placeId} className="min-h-14 space-y-2 border-b py-3"><RecordCell name={row.name} context={`${copy('Rank')}: ${row.rank}`} /><Measures value={row} /><p className="text-sm tabular-nums">{copy('Actual share')}: {row.share === null ? '—' : (row.share * 100).toFixed(1) + '%'} · {copy('Expected share')}: {(row.expectedShare * 100).toFixed(1)}%</p>{smallShuffleSample(row) && <Badge variant="secondary">{copy('Too small to compare')}</Badge>}</div>)}</div>} /></>}</CardContent></Card>}
    <p className="text-sm text-muted-foreground">{adsUsesLocalSearch(resource.data) && copy('Search filters the current server page. Use the pager to inspect other pages.')}</p><ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
