'use client';

import { HypeRank } from '@/components/admin/hype-rank';
import * as React from 'react';
import { ArrowRight, ChevronRight, Clock, Inbox, Layers, Megaphone, Plus, Search, UserPlus } from 'lucide-react';
import Link from '@/components/lang-link';
import { Button } from '@/components/ui/button';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadAnswers, loadHype } from '@/lib/api/numbers';
import { loadInbox } from '@/lib/api/inbox';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { AR_LOCALE, localeFor } from '@/lib/locale';
import { QUEUES, useShellInboxCounts } from './dashboard-shell';
import { useDashboardCopy } from './dashboard-text';
import { RequestError } from './subscriber-ui';

const PROMISE_HOURS = 48;

function Panel({ title, more, children }: { title: string; more?: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(23,23,26,0.05),0_2px_10px_rgba(23,23,26,0.04)]"><header className="flex items-center gap-3 px-4 pt-3.5 pb-2.5"><h2 className="flex-1 text-sm font-semibold">{title}</h2>{more}</header>{children}</section>;
}

function JobRow({ href, icon, title, sub, count, late }: { href: string; icon: React.ReactNode; title: string; sub?: string; count?: number; late?: string }) {
  return <Link href={href} className="flex min-h-14 items-center gap-3 border-t border-border px-4 py-2.5 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
    <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-brand-50 text-primary">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{title}</span>{sub && <span className="block truncate text-[12.5px] text-muted-foreground">{sub}</span>}</span>
    {late && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{late}</span>}
    {count !== undefined && <strong className="min-w-7 text-end text-lg font-semibold tabular-nums">{count}</strong>}
    <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
  </Link>;
}

/** Today: what waits on the team, oldest first, and how the last 24 hours went (DIRECTION section 1; owner: a jobs-based home). */
export function TodayPage() {
  const copy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
  const counts = useShellInboxCounts();
  const n = (value: number) => value.toLocaleString(localeFor(lang));
  // The oldest correction and report tell the 48-hour promise; the other queues show their counts.
  const loadOldest = React.useCallback(async () => {
    const [corrections, reports] = await Promise.all([loadInbox<{ createdAt: string }>('corrections'), loadInbox<{ createdAt: string }>('reports')]);
    const oldest = (rows: { createdAt: string }[]) => rows.reduce((min, row) => Math.min(min, Date.parse(row.createdAt)), Infinity);
    return { corrections: oldest(corrections.rows), reports: oldest(reports.rows) } as Record<string, number>;
  }, []);
  const oldest = useSubscriberResource(loadOldest);
  const answers = useSubscriberResource(React.useCallback(() => loadAnswers('24h'), []));
  const hype = useSubscriberResource(React.useCallback(() => loadHype('24h', 'place'), []));
  const [now] = React.useState(() => Date.now());
  const age = (at?: number) => {
    if (!at || !Number.isFinite(at)) return { text: '', late: false };
    const hours = Math.floor((now - at) / 3_600_000);
    return { text: hours < 24 ? `${copy('Oldest')} ${n(hours)} ${copy('h')}` : `${copy('Oldest')} ${n(Math.floor(hours / 24))} ${copy('d')} ${n(hours % 24)} ${copy('h')}`, late: hours >= PROMISE_HOURS };
  };
  const waiting = QUEUES.filter((queue) => queue.id !== 'no-hours' && (counts?.[queue.count] ?? 0) > 0);
  const total = waiting.reduce((sum, queue) => sum + (counts?.[queue.count] ?? 0), 0);
  const late = waiting.filter((queue) => age(oldest.data?.[queue.id]).late).length;
  const stamp = new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-GB', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(now));
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold">{copy('Today')}</h1><p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>{stamp}. {counts === null ? '' : total ? `${n(total)} ${copy('things wait on you')}${late ? `, ${n(late)} ${copy('late')}` : ''}.` : copy('Nothing waits on you.')}</p></div>
      {total > 0 && <Button nativeButton={false} render={<Link href="/dashboard/inbox?run=1" />}><ArrowRight className="rtl:rotate-180" aria-hidden="true" />{copy('Start with the oldest')}</Button>}
    </header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Panel title={copy('Waiting on you')} more={<Link href="/dashboard/inbox" className="text-[12.5px] font-medium text-primary">{copy('Open Inbox')}</Link>}>
          {counts === null ? <div className="h-28 animate-pulse bg-muted/50" /> : waiting.length ? waiting.map((queue) => { const a = age(oldest.data?.[queue.id]); return <JobRow key={queue.id} href={`/dashboard/inbox?queue=${queue.id}`} icon={<Inbox className="size-4" aria-hidden="true" />} title={copy(queue.job)} sub={a.text || undefined} count={counts[queue.count]} late={a.late ? copy('Past the 48 h promise') : undefined} />; })
            : <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{copy('All clear. New corrections, reports, receipts and photos land in the Inbox.')}</p>}
        </Panel>
        <Panel title={copy('When you have time')}>
          <JobRow href="/dashboard/inbox?queue=no-hours" icon={<Clock className="size-4" aria-hidden="true" />} title={copy('Add missing hours')} sub={copy('Live places with no opening hours')} count={counts?.no_hours} />
          <JobRow href="/dashboard/algorithm/demand" icon={<Search className="size-4" aria-hidden="true" />} title={copy('Fix searches that found nothing')} sub={copy('Teach the search the words people use')} />
        </Panel>
        <Panel title={copy('Start something')}>
          <div className="flex flex-wrap gap-2 border-t border-border p-4">{([['/dashboard/places/new', 'Add a place', Plus], ['/dashboard/money/ads/new', 'Sell an ad', Megaphone], ['/dashboard/money/owners/new', 'New owner', UserPlus], ['/dashboard/places/library/collections', 'Make a collection', Layers]] as const).map(([href, label, Icon]) =>
            <Button key={href} variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}><Icon aria-hidden="true" />{copy(label)}</Button>)}</div>
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title={copy('Last 24 hours')} more={<Link href="/dashboard/algorithm/today?window=24h" className="text-[12.5px] font-medium text-primary">{copy('Algorithm')}</Link>}>
          {answers.loading ? <div className="h-40 animate-pulse bg-muted/50" /> : answers.error || !answers.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load the answers.')} retry={() => { void answers.refetch(); }} /></div>
            : <ul>{answers.data.answers.slice(0, 4).map((answer) => <li key={answer.key} className="border-t border-border"><Link href={answer.href} className="block px-4 py-2.5 hover:bg-muted/60"><span className="block text-xs text-muted-foreground">{copy(answer.question)}</span><span className="block text-sm">{lang === 'ar' ? answer.sentenceAr : answer.sentence}</span></Link></li>)}</ul>}
        </Panel>
        <Panel title={copy('Hype now')} more={<span className="text-xs text-muted-foreground">{copy('30-day sum, uncapped')}</span>}>
          {hype.loading ? <div className="h-40 animate-pulse bg-muted/50" /> : hype.error || !hype.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load the hype.')} retry={() => { void hype.refetch(); }} /></div>
            : <ol>{hype.data.items.slice(0, 5).map((item, at) => <li key={item.id} className="border-t border-border"><Link href={`/dashboard/places/${item.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60"><span className="w-4 text-xs text-muted-foreground tabular-nums">{n(at + 1)}</span><span dir="auto" className="min-w-0 flex-1 truncate text-sm font-medium">{pick(item.name, item.nameEn)}</span><span className="text-sm font-semibold tabular-nums">{n(item.points)}</span>{item.rank ? <HypeRank className="ms-2" rank={{ rank: item.rank, total: item.total ?? 0, topPercent: item.topPercent ?? 100, moved: item.moved ?? null }} /> : null}</Link></li>)}</ol>}
        </Panel>
      </div>
    </div>
  </div>;
}
