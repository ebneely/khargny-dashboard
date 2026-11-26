'use client';

import * as React from 'react';
import { SegmentedControl } from './segmented-control';
import { useDashboardCopy } from './dashboard-text';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadPeople, type PeopleResponse, type PeopleRow, type PeopleWindow } from '@/lib/api/people';
import type { PeopleMode } from '@/lib/people';

const OPTIONS = [{ value: 'all', label: 'All' }, { value: 'people', label: 'People' }, { value: 'new', label: 'New' }, { value: 'returning', label: 'Returning' }];

/** The one switch that changes every count beside it: All actions, different People, New or Returning people. */
export function PeopleSwitch({ value, onValueChange }: { value: PeopleMode; onValueChange: (mode: PeopleMode) => void }) {
  return <SegmentedControl label="Count" value={value} onValueChange={(v) => onValueChange(v as PeopleMode)} options={OPTIONS} />;
}

/** The note that belongs under the whole toolbar row, beside the window sentence. */
export function usePeopleCaption(value: PeopleMode, estimated?: boolean) {
  const copy = useDashboardCopy();
  return value !== 'all' && estimated ? copy('Web visitors are told apart by a browser cookie, so web people are estimated.') : null;
}

/**
 * The prepared people for the visible rows, fetched only while a people mode is on (All needs nothing).
 * `window` null (Live) has none: every count then shows "—" in the people modes.
 */
export function usePeople(window: PeopleWindow | null, ids: string[], enabled: boolean): { data: PeopleResponse | null; loading: boolean } {
  const key = ids.join(',');
  const load = React.useCallback(() => (window && enabled && key ? loadPeople(window, key.split(',')) : Promise.resolve(null)), [window, enabled, key]);
  const res = useSubscriberResource(load);
  return { data: res.data, loading: res.loading };
}

const PEOPLE_WINDOWS: readonly string[] = ['24h', '7d', '30d', 'all'];

/** The site row (people who did it anywhere on 5argny) for a page window; null for Live and custom days. */
export function useSitePeople(window: string | undefined): PeopleRow | null {
  const load = React.useCallback(() => (window && PEOPLE_WINDOWS.includes(window) ? loadPeople(window as PeopleWindow, []) : Promise.resolve(null)), [window]);
  return useSubscriberResource(load).data?.site ?? null;
}
