'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SegmentedControl, SegmentedNavigation } from '../segmented-control';
import { DateField } from '../date-field';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '../filter-bar';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { AdminCity } from '@/lib/api/types';
import { loadInsightOptions, type InsightQuery } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { cairoDate } from '@/lib/api/subscribers';
import { isCalendarDate, calendarStamp, shiftCalendarDays } from '@/lib/subscription-calendar';
import { LoadingState } from '../subscriber-ui';

const tabs = [{ value: '', label: 'Overview' }, { value: 'search-terms', label: 'Search terms' }, { value: 'missing-words', label: 'Missing words' }, { value: 'movement', label: 'Movement' }, { value: 'keywords', label: 'Keywords' }];
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
  const today = cairoDate();
  const requested = params.get('period') ?? '30';
  const period = ['7', '30', '90', 'custom'].includes(requested) ? requested : '30';
  const from = period === 'custom' ? params.get('from') ?? shiftCalendarDays(today, -29) : shiftCalendarDays(today, 1 - Number(period));
  const to = period === 'custom' ? params.get('to') ?? today : today;
  const platform = params.get('platform');
  const query: InsightQuery = { from, to, platform: platform === 'app' || platform === 'web' || platform === 'unknown' ? platform : undefined, cityId: params.get('cityId') || undefined };
  const valid = isCalendarDate(from) && isCalendarDate(to) && from <= to && calendarStamp(to) - calendarStamp(from) <= 400 * 86400000;
  const loadCities = React.useCallback(() => loadInsightOptions<AdminCity>('/v1/admin/cities'), []);
  const cities = useSubscriberResource(loadCities);
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value && value !== 'all') next.set(name, value); else next.delete(name);
    for (const key of Array.from(next.keys())) if (key.endsWith('-skip')) next.delete(key);
    window.history.replaceState(null, '', `${pathname}?${next}`);
  };
  const shared = new URLSearchParams();
  for (const key of ['period', 'from', 'to', 'platform', 'cityId']) if (params.get(key)) shared.set(key, params.get(key)!);
  const value = tabs.find((tab) => tab.value && pathname.startsWith(`/dashboard/analytics/${tab.value}`))?.value ?? '';
  return <FiltersContext.Provider value={{ query, valid, period, cities: cities.data ?? [] }}><div className="min-w-0 space-y-6">
    <header><h1 className="font-display text-2xl font-semibold">{copy('Analytics')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('Search and movement, measured in Cairo calendar days.')}</p></header>
    <SegmentedNavigation label="Analytics sections" value={value} options={tabs.map((tab) => ({ ...tab, href: `/dashboard/analytics${tab.value ? '/' + tab.value : ''}?${shared}` }))} />
    <div className="space-y-3"><SegmentedControl label="Analytics period" value={period} onValueChange={(next) => change('period', String(next))} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: 'custom', label: 'Custom range' }]} />
      {period === 'custom' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">{copy('From')}<DateField readOnlyControl value={from} max={to} onChange={(date) => change('from', date)} /></label><label className="space-y-1 text-sm">{copy('To')}<DateField readOnlyControl value={to} min={from} onChange={(date) => change('to', date)} /></label></div>}
      <FilterBar filters={2}><FilterSelect label="All platforms" value={query.platform ?? 'all'} onValueChange={(value) => change('platform', value)} options={[{ value: 'all', label: 'All platforms' }, { value: 'app', label: 'App' }, { value: 'web', label: 'Web' }, { value: 'unknown', label: 'Unknown platform' }]} /><FilterSelect label="All cities" value={query.cityId ?? 'all'} onValueChange={(value) => change('cityId', value)} options={[{ value: 'all', label: 'All cities' }, ...(cities.data ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} /></FilterBar>
      {cities.error && <p role="alert" className="text-sm text-destructive">{copy('Could not load cities.')} <Button data-ro-allow="true" type="button" variant="outline" onClick={() => { void cities.refetch(); }}>{copy('Retry')}</Button></p>}
      <p className="text-sm text-muted-foreground"><span dir="ltr">{from} – {to}</span> · {copy('Cairo · inclusive dates')}</p>
      {!valid && <p role="alert" className="text-sm text-destructive">{copy('Choose an ordered range of at most 401 days.')}</p>}
    </div>
    {valid && children}
  </div></FiltersContext.Provider>;
}
