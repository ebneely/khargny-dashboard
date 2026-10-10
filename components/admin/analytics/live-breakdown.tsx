'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { LiveRank } from '@/lib/live-status';
import { useDashboardCopy } from '../dashboard-text';

export function liveTime(at: string, lang: string, includeDate = false) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang, { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit', hour12: true, ...(includeDate ? { day: 'numeric', month: 'short', year: 'numeric' } as const : {}) }).format(date);
}

export function LiveBreakdown({ title, rows = [] }: { title: string; rows?: LiveRank[] }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const maximum = Math.max(1, ...rows.map(row => row.count ?? 0));
  const number = (value?: number | null) => typeof value === 'number' ? value.toLocaleString(lang) : '—';
  const name = (row: LiveRank) => (lang === 'ar' ? row.name || row.nameEn : row.nameEn || row.name) || copy(({ web: 'Website', app: 'App', ar: 'Arabic', en: 'English' } as Record<string, string>)[row.id] ?? 'Unknown');
  return <Card><CardHeader><CardTitle>{copy(title)}</CardTitle></CardHeader><CardContent>
    {!rows.length ? <p className="text-sm text-muted-foreground">{copy('No counted activity in this breakdown.')}</p> : <dl data-slot="live-breakdown" className="space-y-4">{rows.map(row => <div key={row.id} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3"><dt className="min-w-0 break-words text-sm font-medium">{name(row)}</dt><dd className="shrink-0 text-sm tabular-nums">{number(row.count)} <span className="text-muted-foreground">{copy('counted events')}</span></dd></div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, (row.count ?? 0) / maximum * 100))}%` }} /></div>
      <dd className="text-sm text-muted-foreground">{number(row.visitors)} {copy(row.visitors === 1 ? 'estimated visitor' : 'estimated visitors')} · {number(row.actions)} {copy('Actions')}{!row.complete && <> · {copy('Incomplete')}</>}</dd>
    </div>)}</dl>}
  </CardContent></Card>;
}
