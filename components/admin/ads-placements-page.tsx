'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { AdsSubscriptionAction } from './ads-subscription-action';
import { Plus, CalendarDays } from 'lucide-react';
import { AdsPageHeader } from './ads-page-header';
import { AdsRange, SurfaceList } from './ads-round-b-ui';
import { HomeSections } from './ads-home-sections';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { DateCell, DateRange } from './date-cell';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adsBApi, type AdSurface } from '@/lib/api/ads-round-b';
import { campaignHref, sourceLabels, validAdsRange } from '@/lib/ads-round7b';
import { cairoDate } from '@/lib/api/subscribers';
import { loadInsightOptions } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { LoadingState, RequestError } from './subscriber-ui';
import { placeCover } from '@/lib/place-list';

export function AdsPlacementsPage({ canWrite = false }: { canWrite?: boolean }) { return <React.Suspense fallback={<LoadingState />}><PlacementsContent canWrite={canWrite} /></React.Suspense>; }
function PlacementsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const params = useSearchParams();
  const [from, setFrom] = React.useState(cairoDate); const [to, setTo] = React.useState(cairoDate);
  const valid = validAdsRange(from, to, 92);
  const address = useListAddress('surfaces');
  const kind = address.get('kind'); const city = address.get('city'); const query = address.query;
  const state = ['has_free', 'full', 'nobody_promoted', 'has_paid'].includes(address.get('state')) ? address.get('state') : undefined;
  const page = Math.floor(address.skip / address.limit) + 1; const limit = address.limit;
  const [chosen, setChosen] = React.useState<AdSurface | null>(null);
  const load = React.useCallback(async () => valid ? adsBApi.surfaces(from, to, { kind: kind || undefined, cityId: city && city !== 'national' ? city : undefined, q: query.trim().slice(0, 200) || undefined, state, page, limit, detail: 'summary' }) : null, [from, to, valid, kind, city, query, state, page, limit]);
  const resource = useSubscriberResource(load);
  const loadCities = React.useCallback(() => loadInsightOptions<{ id: string; name: string; nameEn: string | null }>('/v1/admin/cities'), []);
  const cities = useSubscriberResource(loadCities);
  const paged = Boolean(resource.data?.meta);
  const loadSummary = React.useCallback(() => valid && paged ? adsBApi.surfacesSummary(from, to) : Promise.resolve(null), [from, to, valid, paged]);
  const summary = useSubscriberResource(loadSummary);
  const selected = resource.data?.data.find(row => row.key === chosen?.key) ?? null;
  return <div className="min-w-0 space-y-6"><AdsPageHeader form={params.get('add') === 'section' && canWrite} title="Where ads appear" description="Choose where a visitor sees a place, see bookings and preview the actual cards." actions={[{ label: 'New campaign', href: '/dashboard/ads/new', allowed: canWrite }, { label: 'Add a section', href: '/dashboard/ads/placements?add=section#homepage-sections', allowed: canWrite, icon: <Plus /> }]} />
    <Card><CardHeader><CardTitle>{copy('Booking range')}</CardTitle></CardHeader><CardContent><AdsRange from={from} to={to} onFrom={setFrom} onTo={setTo} /></CardContent></Card>
    {paged && <Card data-slot="surface-summary"><CardHeader><CardTitle>{copy('All surfaces in the booking range')}</CardTitle></CardHeader><CardContent>{summary.loading ? <LoadingState /> : summary.error ? <RequestError message={copy('Could not load surfaces.')} retry={() => { void summary.refetch(); }} /> : summary.data && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Surfaces grouped by kind and city', summary.data.totals.surfaces], ['With free space', summary.data.totals.withFreeSpace], ['Nobody promoted', summary.data.totals.nobodyPromoted]].map(([label, count]) => <div key={label}><dt className="text-sm text-muted-foreground">{copy(String(label))}</dt><dd className="text-xl font-semibold tabular-nums">{count}</dd></div>)}</dl>}</CardContent></Card>}
    {valid && <Card><CardHeader><CardTitle>{copy('Surfaces grouped by kind and city')}</CardTitle></CardHeader><CardContent>{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load surfaces.')} retry={() => { void resource.refetch(); }} /> : <SurfaceList scope="surfaces" address={address} total={resource.data?.meta?.total} surfaces={resource.data?.data ?? []} cities={cities.data ?? []} onChoose={setChosen} />}</CardContent></Card>}
    {selected && <SurfaceDetails key={selected.key} surface={selected} from={from} to={to} canWrite={canWrite} />}
    <HomeSections canWrite={canWrite} />
    <p className="text-sm text-muted-foreground">{copy('Bookings include paused reservations. Candidates are not simultaneous occupants; use the visitor preview for the exact current order.')}</p>
  </div>;
}
function SurfaceDetails({ surface: summary, from, to, canWrite }: { surface: AdSurface; from: string; to: string; canWrite: boolean }) {
  const loadDetail = React.useCallback(() => adsBApi.surfaces(from, to, { detail: 'full' }), [from, to]);
  const detail = useSubscriberResource(loadDetail);
  const surface = detail.data?.data.find(row => row.key === summary.key) ?? summary;
  const copy = useDashboardCopy(); const [query, setQuery] = React.useState('');
  const load = React.useCallback(() => adsBApi.preview(surface.key, query), [surface.key, query]);
  const preview = useSubscriberResource(load);
  return <>
    <Card><CardHeader><CardTitle>{surface.name}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm">{copy('Booked and free per day')}</p>{detail.error && <RequestError message={copy('Could not load surfaces.')} retry={() => { void detail.refetch(); }} />}<RecordList scope="surface-days" records={surface.days ?? []} busy={detail.loading} searchText={day => day.date} render={visible => <div>{visible.map(day => <div key={day.date} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon="calendar" name={day.date} /><p className="ms-auto text-sm tabular-nums">{day.booked} {copy('booked')} / {day.capacity} · {day.free} {copy('free')}</p></div>)}</div>} />
      {canWrite && surface.sellable && <RowActions recordName={surface.name} actions={[{ label: 'Start a campaign here', href: campaignHref(surface), icon: <CalendarDays /> }]} />}
      <p className="text-sm text-muted-foreground">{copy('Candidates overlapping the chosen dates')}</p><RecordList scope="surface-occupants" records={surface.occupants} searchText={row => `${row.name} ${row.source}`} filters={[{ key: 'source', label: 'All promotion sources', options: Object.entries(sourceLabels).map(([value, label]) => ({ value, label })), value: row => row.source }]} render={visible => <div>{visible.map((row, index) => <div key={`${row.placeId}-${row.campaignId ?? row.subscriptionId ?? index}`} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell name={row.name} chips={<Badge variant="secondary">{copy(row.sponsored ? 'Sponsored' : 'Not sponsored')}</Badge>} context={copy(sourceLabels[row.source])} /><p className="text-sm">{row.startDate && <DateCell value={row.startDate} />}{row.endDate && <> — <DateCell value={row.endDate} /></>}{row.status === 'paused' && <> · {copy('Paused')}</>}</p>{row.subscriptionId && <AdsSubscriptionAction placeId={row.placeId} subscriptionId={row.subscriptionId} name={row.name} />}</div>)}</div>} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{copy('Exact visitor preview')}</CardTitle></CardHeader><CardContent className="space-y-4">{surface.surface === 'search' && <label className="block space-y-1 text-sm">{copy('Search query (optional)')}<Input data-ro-allow="true" value={query} onChange={event => setQuery(event.target.value)} /></label>}{preview.loading ? <LoadingState /> : preview.error ? <RequestError message={copy('Could not load the visitor preview.')} retry={() => { void preview.refetch(); }} /> : <><p className="text-sm text-muted-foreground">{copy('Current order; refresh to see the next rotation.')} {preview.data?.rotation.nextAt && <DateRange start={preview.data.rotation.nextAt} end={preview.data.rotation.nextAt} />}</p><Button variant="outline" data-ro-allow="true" onClick={() => { void preview.refetch(); }}>{copy('Refresh preview')}</Button><RecordList scope="visitor-preview" records={preview.data?.items ?? []} searchText={row => `${row.place.name} ${row.place.nameEn ?? ''}`} render={visible => <div>{visible.map((row, index) => <div key={`${row.place.id}-${index}`} className="flex min-h-14 items-center gap-3 border-b py-2"><span className="tabular-nums">{(preview.data?.items.indexOf(row) ?? index) + 1}</span><RecordCell nameAr={row.place.name} nameEn={row.place.nameEn} thumbnail={placeCover(row.place)} chips={<Badge variant="secondary">{copy(row.sponsored ? 'Sponsored' : 'Not sponsored')}</Badge>} context={copy(sourceLabels[row.source])} /></div>)}</div>} /></>}</CardContent></Card>
  </>;
}
