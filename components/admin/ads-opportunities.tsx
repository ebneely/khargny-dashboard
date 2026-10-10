'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, RequestError, Field, SubscriberSelect } from './subscriber-ui';
import { adsCompatibleRead, adsUsesLocalSearch } from '@/lib/api/ads-round-b';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { AdSurface, Opportunity } from '@/lib/api/ads-round-b';
import { matchesRecord } from '@/lib/record-list';
import { campaignHref } from '@/lib/ads-round7b';

export function AdsOpportunities(props: { surfaces: AdSurface[]; canWrite: boolean }) { return <React.Suspense fallback={<LoadingState />}><OpportunitiesContent {...props} /></React.Suspense>; }
function OpportunitiesContent({ surfaces, canWrite }: { surfaces: AdSurface[]; canWrite: boolean }) {
  const copy = useDashboardCopy(); const address = useListAddress('opportunities'); const days = address.get('days', '30'); const page = Math.floor(address.skip / address.limit) + 1; const limit = address.limit;
  const load = React.useCallback(() => adsCompatibleRead<{ from: string; to: string; data: Opportunity[]; meta: { total: number } }>('/v1/admin/ads/opportunities', { days: ['7', '30', '90'].includes(days) ? Number(days) : 30, page, limit }, { q: address.query || undefined }), [days, page, limit, address.query]);
  const resource = useSubscriberResource(load);
  const match = (row: Opportunity) => surfaces.find(surface => row.kind === 'area' ? surface.surface === 'area' && `${surface.scope.cityId}:${surface.scope.areaKey}` === row.key : surface.surface === 'category' && surface.scope.cityId === null && surface.scope.categoryId === row.key);
  return <div className="space-y-4"><Field label={copy('Opportunity demand period')}><SubscriberSelect value={days} data-ro-allow="true" onValueChange={value => address.change('days', value)} options={[{ value: '7', label: copy('Last 7 days') }, { value: '30', label: copy('Last 30 days') }, { value: '90', label: copy('Last 90 days') }]} /></Field><p className="text-sm text-muted-foreground">{copy('Busy areas and categories with nobody eligible for promotion in this period. Demand is counted place views, not unique visitors.')} {resource.data?.from} — {resource.data?.to}</p>{resource.error ? <RequestError message={copy('Could not load opportunities.')} retry={() => { void resource.refetch(); }} /> : <RecordList scope="opportunities" address={address} total={resource.data?.meta.total ?? 0} busy={resource.loading} records={(resource.data?.data ?? []).filter(row => !adsUsesLocalSearch(resource.data) || matchesRecord(`${row.name ?? match(row)?.name ?? ''} ${row.nameEn ?? ''} ${row.key}`, address.query))} searchText={row => `${row.key} ${row.kind}`} render={visible => <div>{visible.map(row => { const surface = match(row); return <div key={`${row.kind}:${row.key}`} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon={row.kind === 'area' ? 'location' : 'category'} nameAr={row.name ?? undefined} nameEn={row.nameEn} name={row.name ? undefined : surface?.name ?? row.key} context={copy(row.kind === 'area' ? 'Area' : 'Category')} /><p className="ms-auto text-sm tabular-nums">{row.visits} {copy('counted place views')}</p>{canWrite && surface && surface.sellable && <RowActions recordName={surface.name} actions={[{ label: 'Start a campaign here', icon: <CalendarDays />, href: campaignHref(surface) }]} />}</div>; })}</div>} />}</div>;
}
