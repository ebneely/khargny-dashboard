'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { NumbersWindow } from '@/lib/api/numbers';
import { SegmentedControl } from '../segmented-control';
import { DateField } from '../date-field';
import { Button } from '@/components/ui/button';
import { useDashboardCopy } from '../dashboard-text';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';

/** Every number is a window that ends now (DIRECTION "Rolling windows"), plus All time (owner 2026-11-14); one switch on every Numbers page. */
const CHOICES = [{ value: 'live', label: 'Live now' }, { value: '24h', label: '24 h' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'all', label: 'All time' }];
export type { NumbersWindow };

/** What each window counts, said on screen. */
export const WINDOW_WORDS: Record<NumbersWindow, string> = { live: 'the last 5 minutes', '24h': 'the last 24 hours', '7d': 'the last 7 days', '30d': 'the last 30 days', all: 'all time' };

/** The chosen window from the address; old `?period=7|30|custom` links still open their window. */
export function readNumbersWindow(params: URLSearchParams): NumbersWindow | 'custom' {
  const chosen = params.get('window') ?? ({ '7': '7d', '30': '30d', custom: 'custom' } as Record<string, string>)[params.get('period') ?? ''];
  return chosen === 'live' || chosen === '24h' || chosen === '7d' || chosen === 'all' || chosen === 'custom' ? chosen : '30d';
}

/** A custom range's whole Cairo days (the only from/to the dashboard still sends). */
export function customRange(params: URLSearchParams) {
  const today = cairoDate();
  return { from: params.get('from') ?? shiftCalendarDays(today, -29), to: params.get('to') ?? today };
}

/** What a report route gets: `window` (back from now), or from/to for a custom range. */
export function numbersRange(chosen: NumbersWindow | 'custom', params: URLSearchParams): { window?: NumbersWindow; from?: string; to?: string } {
  return chosen === 'custom' ? customRange(params) : { window: chosen };
}

/**
 * The whole Cairo days a daily trend is drawn for (the engagement report stores days, so a
 * 24-hour window is today and yesterday). Live has no days of its own and All time has no
 * start, so both draw the last 30 days — the dates are always printed beside the chart.
 */
export function trendRange(chosen: NumbersWindow | 'custom', params: URLSearchParams): { from: string; to: string } {
  if (chosen === 'custom') return customRange(params);
  const days = chosen === '24h' ? 2 : chosen === '7d' ? 7 : 30;
  const today = cairoDate();
  return { from: shiftCalendarDays(today, -(days - 1)), to: today };
}

/** `here`: the window stays a query value on this page (Places hype), Live included, no custom range. */
export function WindowSwitch({ here = false }: { here?: boolean }) {
  const copy = useDashboardCopy();
  const pathname = usePathname();
  const params = useSearchParams();
  const chosen = readNumbersWindow(params);
  const value = here && chosen === 'custom' ? '30d' : chosen;
  const choose = (next: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set('window', next);
    query.delete('period');
    if (next !== 'custom') { query.delete('from'); query.delete('to'); }
    for (const key of Array.from(query.keys())) if (key.endsWith('-skip')) query.delete(key);
    window.history.replaceState(null, '', `${pathname}?${query}`);
  };
  const setDate = (name: 'from' | 'to', date: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set(name, date);
    for (const key of Array.from(query.keys())) if (key.endsWith('-skip')) query.delete(key);
    window.history.replaceState(null, '', `${pathname}?${query}`);
  };
  const { from, to } = customRange(params);
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-2">
    <SegmentedControl label="Numbers window" value={value === 'custom' ? '' : value} onValueChange={choose} options={CHOICES} />
    {!here && <Button data-ro-allow="true" type="button" variant="ghost" size="sm" aria-pressed={value === 'custom'} className={value === 'custom' ? 'bg-muted text-foreground' : 'text-muted-foreground'} onClick={() => choose('custom')}>{copy('Custom range')}</Button>}
  </div>
    {value === 'custom' ? <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">{copy('From')}<DateField readOnlyControl value={from} max={to} onChange={(date) => setDate('from', date)} /></label><label className="space-y-1 text-sm">{copy('To')}<DateField readOnlyControl value={to} min={from} onChange={(date) => setDate('to', date)} /></label></div>
      : <p className="text-sm text-muted-foreground">{value === 'all' ? copy('Every number here is the total since we started counting. The hype score stays the last 30 days.') : <>{copy('Every number here counts back from now:')} {copy(WINDOW_WORDS[value])}.</>}</p>}
  </div>;
}
