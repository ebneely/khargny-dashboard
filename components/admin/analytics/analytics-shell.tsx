'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { WindowSwitch, customRange, numbersRange, readNumbersWindow } from './window-switch';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '../filter-bar';
import { useDashboardCopy } from '../dashboard-text';
import { stripLang, useDashboardLang } from '@/lib/dashboard-lang';
import type { AdminCity } from '@/lib/api/types';
import { loadInsightOptions, type InsightQuery } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { isCalendarDate, calendarStamp } from '@/lib/subscription-calendar';
import { LoadingState } from '../subscriber-ui';

const FiltersContext = React.createContext<{ query: InsightQuery; valid: boolean; period: string; cities: AdminCity[] } | null>(null);
export function useInsightFilters() {
  const value = React.useContext(FiltersContext);
  if (!value) throw new Error('Analytics filters missing');
  return value;
}

export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingState />}><AnalyticsContent>{children}</AnalyticsContent></React.Suspense>;
}

function AnalyticsContent({ children }: { children: React.ReactNode }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
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
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value && value !== 'all') next.set(name, value); else next.delete(name);
    for (const key of Array.from(next.keys())) if (key.endsWith('-skip')) next.delete(key);
    window.history.replaceState(null, '', `${pathname}?${next}`);
  };
  const live = ['/dashboard/numbers/live', '/dashboard/numbers/health'].some((p) => stripLang(pathname).startsWith(p)); // pages with their own timing: no window or filters
  return <FiltersContext.Provider value={{ query, valid, period, cities: cities.data ?? [] }}><div className="min-w-0 space-y-6">
    <header><h1 className="font-display text-2xl font-semibold">{copy('Numbers')}</h1></header>
    {!live && <WindowSwitch />}
    {!live && <div className="space-y-3">
      <FilterBar filters={2}><FilterSelect label="All platforms" value={query.platform ?? 'all'} onValueChange={(value) => change('platform', value)} options={[{ value: 'all', label: 'All platforms' }, { value: 'app', label: 'App' }, { value: 'web', label: 'Web' }]} /><FilterSelect label="All cities" value={query.cityId ?? 'all'} onValueChange={(value) => change('cityId', value)} options={[{ value: 'all', label: 'All cities' }, ...(cities.data ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} /></FilterBar>
      {cities.error && <p role="alert" className="text-sm text-destructive">{copy('Could not load cities.')} <Button data-ro-allow="true" type="button" variant="outline" onClick={() => { void cities.refetch(); }}>{copy('Retry')}</Button></p>}
      {chosen === 'custom' && <p className="text-sm text-muted-foreground">{copy('A custom range counts whole Cairo days, both dates included.')}</p>}
      {!valid && <p role="alert" className="text-sm text-destructive">{copy('Choose an ordered range of at most 401 days.')}</p>}
    </div>}
    {(valid || live) && children}
  </div></FiltersContext.Provider>;
}
