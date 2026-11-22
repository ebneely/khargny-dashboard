'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '../filter-bar';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { AdminCity } from '@/lib/api/types';
import { loadInsightOptions, type InsightQuery } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { isCalendarDate, calendarStamp } from '@/lib/subscription-calendar';
import { PEOPLE_MODES, type PeopleMode } from '@/lib/people';
import { customRange, numbersRange, readNumbersWindow } from '../analytics/window-switch';

/**
 * The one set of choices behind every Algorithm page: the window, the platform, the city and the count
 * (All / People / New / Returning). Kept in the address so a page, a reload and a shared link agree.
 */
export interface InsightFiltersValue {
  query: InsightQuery;
  /** A preset window for the routes that only speak `window` (answers, hype, people). */
  window: Exclude<ReturnType<typeof readNumbersWindow>, 'custom'>;
  people: PeopleMode;
  setPeople: (mode: PeopleMode) => void;
  valid: boolean;
  period: string;
  cities: AdminCity[];
  citiesError: boolean;
  refetchCities: () => void;
  change: (name: string, value: string) => void;
}

const FiltersContext = React.createContext<InsightFiltersValue | null>(null);

export function useInsightFilters() {
  const value = React.useContext(FiltersContext);
  if (!value) throw new Error('Algorithm filters missing');
  return value;
}

const isPeopleMode = (value: string | null): value is PeopleMode =>
  value !== null && (PEOPLE_MODES as readonly string[]).includes(value);

export function InsightFiltersProvider({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const chosen = readNumbersWindow(params);
  // `period` stays the day count the ads opportunities report reads (7 or 30 only).
  const period = { live: '1', '24h': '1', '7d': '7', '30d': '30', all: '30', custom: 'custom' }[chosen];
  const platform = params.get('platform');
  // A window goes as `window` (back from now); only a custom range sends whole days.
  const query: InsightQuery = { ...numbersRange(chosen, params), platform: platform === 'app' || platform === 'web' ? platform : undefined, cityId: params.get('cityId') || undefined };
  const { from, to } = customRange(params);
  const valid = chosen !== 'custom' || (isCalendarDate(from) && isCalendarDate(to) && from <= to && calendarStamp(to) - calendarStamp(from) <= 400 * 86400000);
  const loadCities = React.useCallback(() => loadInsightOptions<AdminCity>('/v1/admin/cities'), []);
  const cities = useSubscriberResource(loadCities);
  const who = params.get('who');
  const people: PeopleMode = isPeopleMode(who) ? who : 'all';

  const change = React.useCallback((name: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value && value !== 'all') next.set(name, value); else next.delete(name);
    for (const key of Array.from(next.keys())) if (key.endsWith('-skip')) next.delete(key);
    window.history.replaceState(null, '', `${pathname}?${next}`);
  }, [pathname]);

  const setPeople = React.useCallback((mode: PeopleMode) => change('who', mode === 'all' ? 'all' : mode), [change]);

  const value = React.useMemo<InsightFiltersValue>(() => ({
    query, window: chosen === 'custom' ? '30d' : chosen, people, setPeople, valid, period, cities: cities.data ?? [], citiesError: !!cities.error, refetchCities: () => { void cities.refetch(); }, change,
  }), [query, chosen, people, setPeople, valid, period, cities.data, cities.error, cities.refetch, change]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

/** Platform and city, the same two filters Numbers used; a custom range says what it counts. */
export function InsightFilterControls({ showCities = true }: { showCities?: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const { query, cities, citiesError, refetchCities, change, valid, period } = useInsightFilters();
  return <div className="space-y-3">
    <FilterBar filters={showCities ? 2 : 1}>
      <FilterSelect label="All platforms" value={query.platform ?? 'all'} onValueChange={(value) => change('platform', value)} options={[{ value: 'all', label: 'All platforms' }, { value: 'app', label: 'App' }, { value: 'web', label: 'Web' }]} />
      {showCities && <FilterSelect label="All cities" value={query.cityId ?? 'all'} onValueChange={(value) => change('cityId', value)} options={[{ value: 'all', label: 'All cities' }, ...cities.map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} />}
    </FilterBar>
    {citiesError && <p role="alert" className="text-sm text-destructive">{copy('Could not load cities.')} <Button data-ro-allow="true" type="button" variant="outline" onClick={refetchCities}>{copy('Retry')}</Button></p>}
    {period === 'custom' && <p className="text-sm text-muted-foreground">{copy('A custom range counts whole Cairo days, both dates included.')}</p>}
    {!valid && <p role="alert" className="text-sm text-destructive">{copy('Choose an ordered range of at most 401 days.')}</p>}
  </div>;
}
