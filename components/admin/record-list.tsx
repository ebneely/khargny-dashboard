'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterBar, FilterSearch, FilterSelect } from './filter-bar';
import { Pager } from './pager';
import { useDashboardCopy } from './dashboard-text';
import { listOffset, matchesRecord } from '@/lib/record-list';

const ListOwner = React.createContext(false);

export function RecordRow({ children, actions, align = 'start' }: { align?: 'start' | 'center'; children: React.ReactNode; actions?: React.ReactNode }) {
  return <div data-slot="record-row" className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 ${align === 'center' ? 'items-center' : 'items-start'}`}><div className="min-w-0">{children}</div><div className={`justify-self-end ${align === 'center' ? 'self-center' : 'self-start'}`}>{actions}</div></div>;
}

export function useListAddress(scope: string) {
  const params = useSearchParams();
  const key = (name: string) => `${scope}-${name}`;
  const get = (name: string, fallback = '') => params.get(key(name)) ?? fallback;
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key(name), value); else next.delete(key(name));
    if (name !== 'skip') next.delete(key('skip'));
    window.history.replaceState(null, '', `${window.location.pathname}?${next}${window.location.hash}`);
  };
  const requestedLimit = Number(get('limit', '10'));
  return { get, change, query: get('q'), skip: listOffset(get('skip')), limit: [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10 };
}

export type ListAddress = ReturnType<typeof useListAddress>;
export type RecordFilter<T> = { key: string; label: string; options: { value: string; label: string }[]; value: (record: T) => string; defaultValue?: string; matches?: (record: T, selected: string) => boolean };

export function RecordList<T>(props: {
  scope: string; records: T[]; searchText: (record: T) => string;
  filters?: RecordFilter<T>[]; render: (records: T[]) => React.ReactNode;
  layout?: 'rows' | 'groups';
  empty?: string; address?: ListAddress; total?: number; unfilteredTotal?: number; busy?: boolean; renderWhenEmpty?: boolean;
}) {
  return <React.Suspense fallback={<div className="h-24 animate-pulse rounded bg-muted" />}><RecordListContent {...props} /></React.Suspense>;
}

function RecordListContent<T>({ scope, records, searchText, filters = [], render, empty = 'No matching records.', address, total, unfilteredTotal, busy, renderWhenEmpty, layout = 'rows' }: React.ComponentProps<typeof RecordList<T>>) {
  const nested = React.useContext(ListOwner);
  if (nested) throw new Error('record-list-nested: independent lists must be sibling groups');
  const local = useListAddress(scope);
  const state = address ?? local;
  const copy = useDashboardCopy();
  const selectedFilter = (filter: RecordFilter<T>) => filter.options.some((option) => option.value === state.get(filter.key)) ? state.get(filter.key) : filter.defaultValue ?? '';
  const [knownTotal, setKnownTotal] = React.useState<{ scope: string; total: number } | null>(null);
  const observedTotal = unfilteredTotal ?? (total === undefined ? records.length : !state.query && filters.every(filter => !selectedFilter(filter)) ? total : undefined);
  if (!busy && observedTotal !== undefined && (knownTotal?.scope !== scope || knownTotal.total !== observedTotal)) setKnownTotal({ scope, total: observedTotal });
  const unfilteredCount = observedTotal ?? (knownTotal?.scope === scope ? knownTotal.total : undefined);
  const showControls = Boolean(busy) || unfilteredCount === undefined || unfilteredCount > 10;
  const filtered = total === undefined ? records.filter((record) => matchesRecord(searchText(record), state.query) && filters.every((filter) => !selectedFilter(filter) || (filter.matches ? filter.matches(record, selectedFilter(filter)) : filter.value(record) === selectedFilter(filter)))) : records;
  const count = total ?? filtered.length;
  const skip = total === undefined ? Math.min(state.skip, Math.max(0, Math.floor((count - 1) / state.limit) * state.limit)) : state.skip;
  const visible = total === undefined ? filtered.slice(skip, skip + state.limit) : filtered;
  const content = (visible.length > 0 || renderWhenEmpty) && render(visible);
  const controls = <>{showControls && <div className="print-hide"><FilterBar filters={filters.length}><FilterSearch label="Search records" value={state.query} onChange={(event) => state.change('q', event.target.value)} />{filters.map((filter) => <FilterSelect key={filter.key} label={filter.label} value={selectedFilter(filter) || 'all'} onValueChange={(value) => state.change(filter.key, value === 'all' ? '' : value)} options={filter.defaultValue ? filter.options : [{ value: 'all', label: filter.label }, ...filter.options]} />)}</FilterBar></div>}{busy ? <div role="status" className="h-24 animate-pulse rounded bg-muted"><span className="sr-only">{copy('Loading…')}</span></div> : !visible.length && <p className="py-4 text-sm text-muted-foreground">{copy(empty)}</p>}</>;
  const navigation = <Pager skip={skip} pageSize={state.limit} total={count} count={visible.length} busy={busy} pageSizes={[10, 20, 50]} onPageSizeChange={(size) => state.change('limit', String(size))} onPrevious={() => state.change('skip', String(Math.max(0, skip - state.limit)))} onNext={() => state.change('skip', String(skip + state.limit))} />;
  const attributes = { 'data-slot': 'record-list', 'data-scope': scope, 'data-query': state.query, 'data-total': count, 'data-unfiltered-total': unfilteredCount, 'data-controls': showControls ? 'full' : 'compact', 'data-skip': skip, 'data-limit': state.limit, 'aria-busy': Boolean(busy) };
  if (layout === 'groups') return <div data-slot="record-collection" data-scope={scope} className="min-w-0"><section {...attributes} className="min-w-0 space-y-3">{controls}{!busy && content && <div data-slot="record-groups" data-scope={scope} className="space-y-6">{content}</div>}{navigation}</section></div>;
  return <section {...attributes} className="min-w-0 space-y-3">{controls}{!busy && <ListOwner.Provider value={true}>{content}</ListOwner.Provider>}{navigation}</section>;
}
