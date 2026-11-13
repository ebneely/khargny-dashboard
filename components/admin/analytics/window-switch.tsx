'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '../segmented-control';
import { DateField } from '../date-field';
import { Button } from '@/components/ui/button';
import { useDashboardCopy } from '../dashboard-text';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';

/** Every number is a window that ends now (DIRECTION "Rolling windows"); one switch on every Numbers page. */
const CHOICES = [{ value: 'live', label: 'Live now' }, { value: '24h', label: '24 h' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }];
export type NumbersWindow = '24h' | '7d' | '30d';

// The analytics routes still read whole Cairo days (from/to), so 24 h asks for yesterday and today.
const CALENDAR_DAYS: Record<NumbersWindow, number> = { '24h': 2, '7d': 7, '30d': 30 };

/** The chosen window from the address; old `?period=7|30|custom` links still open their window. */
export function readNumbersWindow(params: URLSearchParams): NumbersWindow | 'custom' {
  const chosen = params.get('window') ?? ({ '7': '7d', '30': '30d', custom: 'custom' } as Record<string, string>)[params.get('period') ?? ''];
  return chosen === '24h' || chosen === '7d' || chosen === 'custom' ? chosen : '30d';
}

/** The from/to the backend understands today, kept beside `window` until every route reads the window. */
export function numbersRange(chosen: NumbersWindow | 'custom', params: URLSearchParams) {
  const today = cairoDate();
  if (chosen === 'custom') return { from: params.get('from') ?? shiftCalendarDays(today, -29), to: params.get('to') ?? today };
  return { from: shiftCalendarDays(today, 1 - CALENDAR_DAYS[chosen]), to: today };
}

export function WindowSwitch() {
  const copy = useDashboardCopy();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const live = pathname.startsWith('/dashboard/analytics/live');
  const value = live ? 'live' : readNumbersWindow(params);
  const choose = (next: string) => {
    if (next === 'live') { router.push('/dashboard/analytics/live'); return; }
    const query = new URLSearchParams(live ? '' : window.location.search);
    query.set('window', next);
    query.delete('period');
    if (next !== 'custom') { query.delete('from'); query.delete('to'); }
    for (const key of Array.from(query.keys())) if (key.endsWith('-skip')) query.delete(key);
    if (live) router.push(`/dashboard/analytics?${query}`);
    else window.history.replaceState(null, '', `${pathname}?${query}`);
  };
  const setDate = (name: 'from' | 'to', date: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set(name, date);
    for (const key of Array.from(query.keys())) if (key.endsWith('-skip')) query.delete(key);
    window.history.replaceState(null, '', `${pathname}?${query}`);
  };
  const { from, to } = numbersRange(value === 'custom' ? 'custom' : '30d', params);
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-2">
    <SegmentedControl label="Numbers window" value={value === 'custom' ? '' : value} onValueChange={choose} options={CHOICES} />
    {!live && <Button data-ro-allow="true" type="button" variant="ghost" size="sm" aria-pressed={value === 'custom'} className={value === 'custom' ? 'bg-muted text-foreground' : 'text-muted-foreground'} onClick={() => choose('custom')}>{copy('Custom range')}</Button>}
  </div>
    {value === 'custom' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">{copy('From')}<DateField readOnlyControl value={from} max={to} onChange={(date) => setDate('from', date)} /></label><label className="space-y-1 text-sm">{copy('To')}<DateField readOnlyControl value={to} min={from} onChange={(date) => setDate('to', date)} /></label></div>}
  </div>;
}
