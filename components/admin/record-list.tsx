'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterBar, FilterSearch, FilterSelect } from './filter-bar';
import { Pager } from './pager';
import { useDashboardCopy } from './dashboard-text';
import { listOffset, matchesRecord } from '@/lib/record-list';

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
export type RecordFilter<T> = { key: string; label: string; options: { value: string; label: string }[]; value: (record: T) => string; defaultValue?: string };

export function RecordList<T>(props: {
  scope: string; records: T[]; searchText: (record: T) => string;
  filters?: RecordFilter<T>[]; render: (records: T[]) => React.ReactNode;
  empty?: string; address?: ListAddress; total?: number; busy?: boolean; renderWhenEmpty?: boolean;
}) {
  return <React.Suspense fallback={<div className="h-24 animate-pulse rounded bg-muted" />}><RecordListContent {...props} /></React.Suspense>;
}

function RecordListContent<T>({ scope, records, searchText, filters = [], render, empty = 'No matching records.', address, total, busy, renderWhenEmpty }: React.ComponentProps<typeof RecordList<T>>) {
  const local = useListAddress(scope);
  const state = address ?? local;
  const copy = useDashboardCopy();
  const selectedFilter = (filter: RecordFilter<T>) => filter.options.some((option) => option.value === state.get(filter.key)) ? state.get(filter.key) : filter.defaultValue ?? '';
  const filtered = total === undefined ? records.filter((record) => matchesRecord(searchText(record), state.query) && filters.every((filter) => !selectedFilter(filter) || filter.value(record) === selectedFilter(filter))) : records;
  const count = total ?? filtered.length;
  const skip = total === undefined ? Math.min(state.skip, Math.max(0, Math.floor((count - 1) / state.limit) * state.limit)) : state.skip;
  const visible = total === undefined ? filtered.slice(skip, skip + state.limit) : filtered;
  return <section data-slot="record-list" data-scope={scope} data-query={state.query} data-total={count} data-skip={skip} data-limit={state.limit} aria-busy={Boolean(busy)} className="min-w-0 space-y-3">
    <div className="print-hide"><FilterBar filters={filters.length}><FilterSearch label="Search records" value={state.query} onChange={(event) => state.change('q', event.target.value)} />{filters.map((filter) => <FilterSelect key={filter.key} label={filter.label} value={selectedFilter(filter) || 'all'} onValueChange={(value) => state.change(filter.key, value === 'all' ? '' : value)} options={filter.defaultValue ? filter.options : [{ value: 'all', label: filter.label }, ...filter.options]} />)}</FilterBar></div>
    {busy ? <div role="status" className="h-24 animate-pulse rounded bg-muted"><span className="sr-only">{copy('Loading…')}</span></div> : <>{!visible.length && <p className="py-4 text-sm text-muted-foreground">{copy(empty)}</p>}{(visible.length > 0 || renderWhenEmpty) && render(visible)}</>}
    <Pager skip={skip} pageSize={state.limit} total={count} count={visible.length} busy={busy} pageSizes={[10, 20, 50]} onPageSizeChange={(size) => state.change('limit', String(size))} onPrevious={() => state.change('skip', String(Math.max(0, skip - state.limit)))} onNext={() => state.change('skip', String(skip + state.limit))} />
  </section>;
}
