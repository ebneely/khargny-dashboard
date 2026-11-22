'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { ArrowDown, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadHype, type HypeItem } from '@/lib/api/numbers';
import { loadAlgorithmPlaces, type AlgorithmPlaceList, type AlgorithmPlaceRow, type AlgorithmStatus } from '@/lib/api/algorithm';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { RequestError } from '../subscriber-ui';
import { Pager } from '../pager';
import { useListAddress } from '../record-list';
import { HypeRank } from '../hype-rank';
import { usePeople } from '../people-switch';
import { pickMode, repeatTimes, type PeopleMode } from '@/lib/people';
import type { PeopleMetric } from '@/lib/api/people';
import { useInsightFilters } from './insight-filters';
import { cn } from '@/lib/utils';

const STATUS_ORDER: AlgorithmStatus[] = ['new', 'trial', 'rising', 'hyped', 'normal', 'cooling', 'resting', 'needs_listing'];
const STATUS_WORDS: Record<AlgorithmStatus, string> = {
  new: 'New', normal: 'Normal', trial: 'On trial', rising: 'Rising', hyped: 'Hyped', cooling: 'Cooling', resting: 'Resting', needs_listing: 'Needs listing',
};
const statusClass = (status: AlgorithmStatus) => status === 'hyped' ? 'bg-primary/12 text-primary' : status === 'rising' ? 'bg-success-bg text-success' : status === 'cooling' ? 'bg-destructive/10 text-destructive' : status === 'new' ? 'bg-info-bg text-info' : 'bg-muted text-muted-foreground';

export function AlgorithmPlacesPage() {
  const copy = useDashboardCopy();
  const { window, people, query } = useInsightFilters();
  const statusAddress = useListAddress('alg-status');
  const [status, setStatus] = React.useState('');
  const page = Math.floor(statusAddress.skip / statusAddress.limit) + 1;
  const loadStatuses = React.useCallback(() => loadAlgorithmPlaces({
    status: status || undefined, cityId: query.cityId, q: statusAddress.query || undefined, page, limit: statusAddress.limit,
  }), [status, query.cityId, statusAddress.query, page, statusAddress.limit]);
  const statuses = useSubscriberResource<AlgorithmPlaceList>(loadStatuses);
  const loadHypeRows = React.useCallback(() => loadHype((window === 'all' ? 'all' : '30d'), 'place'), [window]);
  const hype = useSubscriberResource(loadHypeRows);
  const hypeRows = React.useMemo(() => hype.data?.items ?? [], [hype.data]);
  const rankOf = React.useMemo(() => new Map(hypeRows.map((row) => [row.id, row])), [hypeRows]);
  const counts = statuses.data?.counts ?? {};

  return <div className="space-y-8">
    <section aria-labelledby="algorithm-places-top" className="space-y-3">
      <div><h2 id="algorithm-places-top" className="text-xl font-semibold">{copy('Hype')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Hype is always the last 30 days, whatever the window.')} {copy('Hype is the sum of every action, no cap.')}</p></div>
      <HypeTable rows={hypeRows} loading={hype.loading} error={!!hype.error} retry={() => { void hype.refetch(); }} mode={people} />
    </section>

    <section aria-labelledby="algorithm-status" className="space-y-3">
      <div><h2 id="algorithm-status" className="text-xl font-semibold">{copy('Every place, its status and why')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Statuses are managed in Settings; customers never see them.')}</p></div>
      <div role="group" aria-label={copy('Place status')} className="flex flex-wrap gap-2">
        <button type="button" data-ro-allow="true" aria-pressed={!status} onClick={() => { setStatus(''); statusAddress.change('skip', ''); }} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm', !status ? 'border-primary bg-accent text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{copy('All statuses')}<span className="tabular-nums">{(statuses.data?.total ?? 0).toLocaleString('en-US')}</span></button>
        {STATUS_ORDER.map((key) => <button key={key} type="button" data-ro-allow="true" aria-pressed={status === key} onClick={() => { setStatus(key); statusAddress.change('skip', ''); }} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm', status === key ? 'border-primary bg-accent text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}><span className={cn('size-2 rounded-full', key === 'hyped' ? 'bg-primary' : key === 'rising' ? 'bg-success' : key === 'cooling' ? 'bg-destructive' : 'bg-muted-foreground/50')} aria-hidden="true" />{copy(STATUS_WORDS[key])}<span className="tabular-nums">{(counts[key] ?? 0).toLocaleString('en-US')}</span></button>)}
      </div>
      <Card><CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input className="max-w-sm" aria-label={copy('Find a place')} placeholder={copy('Find a place')} value={statusAddress.query} onChange={(event) => statusAddress.change('q', event.target.value)} />
        </div>
        {statuses.loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy="true" />
          : statuses.error || !statuses.data ? <RequestError message={copy('Could not load place statuses.')} retry={() => { void statuses.refetch(); }} />
            : !statuses.data.items.length ? <p className="py-6 text-sm text-muted-foreground">{copy('No place has this status yet.')}</p>
              : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
                <thead><tr className="text-muted-foreground">
                  <th className="py-2 text-start font-normal">{copy('Place')}</th>
                  <th className="py-2 text-start font-normal">{copy('Status')}</th>
                  <th className="hidden py-2 text-start font-normal md:table-cell">{copy('Reason')}</th>
                  <th className="py-2 text-end font-normal">{copy('Hype')}</th>
                  <th className="hidden py-2 text-end font-normal sm:table-cell">{copy('Search points')}</th>
                  <th className="py-2 text-end font-normal">{copy('Paid')}</th>
                </tr></thead>
                <tbody className="divide-y">{statuses.data.items.map((row: AlgorithmPlaceRow) => {
                  const rank = rankOf.get(row.placeId);
                  return <tr key={row.placeId} className="h-14 hover:bg-muted/40">
                    <td className="py-2 pe-3"><Link href={`/dashboard/places/${row.placeId}`} className="font-medium hover:underline" dir="auto">{row.name}</Link>{row.nameEn && row.name !== row.nameEn ? <span className="block text-xs text-muted-foreground" dir="auto">{row.nameEn}</span> : null}</td>
                    <td className="py-2 pe-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusClass(row.status))}>{copy(STATUS_WORDS[row.status] ?? 'Normal')}</span></td>
                    <td className="hidden max-w-[320px] truncate py-2 pe-3 text-muted-foreground md:table-cell" title={row.reason ?? undefined}>{row.reason ?? 'â€”'}</td>
                    <td className="py-2 text-end font-medium tabular-nums">{row.hype.toLocaleString('en-US')}<HypeRank className="mt-1 justify-end" rank={rank?.rank ? { rank: rank.rank, total: rank.total ?? 0, topPercent: rank.topPercent ?? 100, moved: rank.moved ?? null, areaRank: rank.areaRank, categoryRank: rank.categoryRank } : null} /></td>
                    <td className="hidden py-2 text-end tabular-nums text-muted-foreground sm:table-cell">{(rank?.searchTaps ?? 0).toLocaleString('en-US')}</td>
                    <td className="py-2 text-end text-muted-foreground">{row.paid ? copy('Paid') : 'â€”'}</td>
                  </tr>;
                })}</tbody>
              </table></div>}
        <Pager skip={statusAddress.skip} pageSize={statusAddress.limit} total={statuses.data?.total ?? 0} count={statuses.data?.items.length ?? 0} busy={statuses.loading} error={!!statuses.error} pageSizes={[10, 20, 50]} onPageSizeChange={(size) => statusAddress.change('limit', String(size))} onPrevious={() => statusAddress.change('skip', String(Math.max(0, statusAddress.skip - statusAddress.limit)))} onNext={() => statusAddress.change('skip', String(statusAddress.skip + statusAddress.limit))} />
      </CardContent></Card>
    </section>
  </div>;
}

type SortKey = 'points' | 'searchTaps' | 'views' | 'likes' | 'saves' | 'shares' | 'goes';
const METRICS: { key: SortKey; label: string; metric: PeopleMetric }[] = [
  { key: 'searchTaps', label: 'Search points', metric: 'searchTaps' },
  { key: 'views', label: 'Views', metric: 'views' },
  { key: 'likes', label: 'Loves', metric: 'likes' },
  { key: 'saves', label: 'Saves', metric: 'saves' },
  { key: 'shares', label: 'Shares', metric: 'shares' },
  { key: 'goes', label: '5argny taps', metric: 'goes' },
];

function HypeTable({ rows, loading, error, retry, mode }: { rows: HypeItem[]; loading: boolean; error: boolean; retry: () => void; mode: PeopleMode }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const address = useListAddress('alg-hype');
  const [sort, setSort] = React.useState<SortKey>('points');
  const filtered = React.useMemo(() => rows.filter((row) => !address.query || pick(row.name, row.nameEn).toLowerCase().includes(address.query.toLowerCase())), [rows, address.query, pick]);
  const ordered = React.useMemo(() => [...filtered].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0)), [filtered, sort]);
  const start = Math.min(address.skip, Math.max(0, Math.floor(Math.max(0, ordered.length - 1) / address.limit) * address.limit));
  const visible = ordered.slice(start, start + address.limit);
  const people = usePeople('30d', visible.map((row) => row.id), mode !== 'all');
  const number = (row: HypeItem, key: SortKey, metric: PeopleMetric) => {
    const all = row[key] ?? 0;
    const value = pickMode(all, people.data?.items[row.id]?.[metric], mode);
    const repeat = mode === 'all' ? null : repeatTimes(all, people.data?.items[row.id]?.[metric]?.people ?? 0);
    return <>{value === null ? 'â€”' : value.toLocaleString('en-US')}{repeat !== null && <span className="ms-1 text-xs text-muted-foreground">Ã—{repeat}</span>}</>;
  };
  return <Card><CardContent className="space-y-3">
    <div className="flex items-center gap-2"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><Input className="max-w-sm" aria-label={copy('Find a place')} placeholder={copy('Find a place')} value={address.query} onChange={(event) => address.change('q', event.target.value)} /></div>
    {loading ? <div className="h-56 animate-pulse rounded-lg bg-muted" aria-busy="true" />
      : error ? <RequestError message={copy('Could not load the hype.')} retry={retry} />
        : !ordered.length ? <p className="py-6 text-sm text-muted-foreground">{copy('No place has hype in this window.')}</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead><tr className="text-muted-foreground">
              <th className="w-8 py-2 text-start font-normal">#</th>
              <th className="py-2 text-start font-normal">{copy('Place')}</th>
              {[{ key: 'points' as SortKey, label: 'Hype' }, ...METRICS].map((column) => <th key={column.key} aria-sort={sort === column.key ? 'descending' : undefined} className="py-2 text-end font-normal"><button type="button" data-ro-allow="true" onClick={() => setSort(column.key)} className={cn('-me-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-muted', sort === column.key && 'bg-muted font-medium text-foreground')}>{copy(column.label)}{sort === column.key && <ArrowDown aria-hidden="true" className="size-3" />}</button></th>)}
            </tr></thead>
            <tbody className="divide-y">{visible.map((row, at) => <tr key={row.id} className="h-14 hover:bg-muted/40">
              <td className="py-2 text-xs text-muted-foreground tabular-nums">{start + at + 1}</td>
              <td className="py-2 pe-3"><Link href={`/dashboard/places/${row.id}`} className="font-medium hover:underline" dir="auto">{pick(row.name, row.nameEn)}</Link><HypeRank className="mt-1" rank={row.rank ? { rank: row.rank, total: row.total ?? 0, topPercent: row.topPercent ?? 100, moved: row.moved ?? null, areaRank: row.areaRank, categoryRank: row.categoryRank } : null} /></td>
              <td className="py-2 text-end font-medium tabular-nums">{row.points.toLocaleString('en-US')}</td>
              {METRICS.map((column) => <td key={column.key} className={cn('py-2 text-end tabular-nums text-muted-foreground', column.key !== 'searchTaps' && column.key !== 'views' && 'hidden lg:table-cell')}>{number(row, column.key, column.metric)}</td>)}
            </tr>)}</tbody>
          </table></div>}
    <Pager skip={start} pageSize={address.limit} total={ordered.length} count={visible.length} pageSizes={[10, 20, 50]} onPageSizeChange={(size) => address.change('limit', String(size))} onPrevious={() => address.change('skip', String(Math.max(0, start - address.limit)))} onNext={() => address.change('skip', String(start + address.limit))} />
  </CardContent></Card>;
}
