'use client';

import { HypeRank } from '@/components/admin/hype-rank';
import * as React from 'react';
import { Activity, ArrowDown, ArrowRight, ArrowUp, ChevronRight, Clock, Eye, Inbox, Layers, Megaphone, Plus, Route, Search, UserPlus, Users, Wallet, type LucideIcon } from 'lucide-react';
import Link from '@/components/lang-link';
import { Button } from '@/components/ui/button';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadAnswers, loadHype, loadInsights } from '@/lib/api/numbers';
import { loadInbox } from '@/lib/api/inbox';
import { adminApi } from '@/lib/api/admin-client';
import type { AdCampaign } from '@/lib/api/ads';
import type { SubscriberSummary } from '@/lib/api/subscribers';
import { cairoDate } from '@/lib/api/subscribers';
import { engagementSummary, metricTotal } from '@/lib/api/engagement-report';
import { engagementMetrics } from '@/lib/engagement';
import { changeAgainstPrevious } from '@/lib/engagement-trend';
import { loadLiveBundle } from '@/lib/api/live-status';
import { liveNowTotals, liveState } from '@/lib/live-status';
import { readCampaignList } from '@/lib/ads-campaign-list';
import { runningAdsTotals } from '@/lib/algorithm-money';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { AR_LOCALE, localeFor } from '@/lib/locale';
import { QUEUES, useShellInboxCounts } from './dashboard-shell';
import { useDashboardCopy } from './dashboard-text';
import { RequestError } from './subscriber-ui';

const PROMISE_HOURS = 48;
/** The home's engagement band counts the last seven Cairo days (engagement #30). */
const HOME_DAYS = 7;
/** The insight kinds, in the dashboard's one vocabulary (the same words Analytics uses). */
const KIND_WORDS: Record<string, string> = { rising: 'Rising', fading: 'Fading', hype_now: 'Hype now', gap: 'Gap', money: 'Money' };

// Stable loaders: `useSubscriberResource` re-runs when its loader changes identity, so an
// inline arrow would restart the 250 ms read on every render and never settle.
const loadMoneySummary = () => adminApi.get<SubscriberSummary>('/v1/admin/subscribers/summary');
const loadRunningAds = () => readCampaignList((skip, limit) => adminApi.get('/v1/admin/ads/campaigns', { state: 'live', skip, limit }));
const loadLiveNow = () => loadLiveBundle('5m');
const loadChanges = () => loadInsights('24h');

function Panel({ title, more, children }: { title: string; more?: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(23,23,26,0.05),0_2px_10px_rgba(23,23,26,0.04)]"><header className="flex items-center gap-3 px-4 pt-3.5 pb-2.5"><h2 className="flex-1 text-sm font-semibold">{title}</h2>{more}</header>{children}</section>;
}

function JobRow({ href, icon, title, sub, count, late }: { href: string; icon: React.ReactNode; title: string; sub?: string; count?: number | null; late?: string }) {
  return <Link href={href} className="flex min-h-14 items-center gap-3 border-t border-border px-4 py-2.5 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
    <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-brand-50 text-primary">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{title}</span>{sub && <span className="block truncate text-[12.5px] text-muted-foreground">{sub}</span>}</span>
    {late && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{late}</span>}
    {count !== undefined && <strong className="min-w-7 text-end text-lg font-semibold tabular-nums">{count === null ? '—' : count}</strong>}
    <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
  </Link>;
}

/** One engagement measure: the icon, its name and its number, with the change it made. */
function MeasureTile({ label, value, hint, icon: Icon, loading }: { label: string; value?: number; hint?: React.ReactNode; icon: LucideIcon; loading?: boolean }) {
  return <div data-slot="home-measure" className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(23,23,26,0.05),0_2px_10px_rgba(23,23,26,0.04)]">
    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{label}</p>
    {loading ? <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" aria-hidden="true" />
      : <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value === undefined ? '—' : value.toLocaleString('en-US')}</p>}
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

/** Today: what waits on the team, the engagement summary, live now, money that needs a hand, and what moved (home #30). */
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
  const days = React.useState(() => { const to = cairoDate(); return { from: shiftCalendarDays(to, -(HOME_DAYS - 1)), to }; })[0];
  const loadEngagement = React.useCallback(() => engagementSummary(days), [days]);
  const engagement = useSubscriberResource(loadEngagement);
  const live = useSubscriberResource(loadLiveNow);
  const money = useSubscriberResource<SubscriberSummary>(loadMoneySummary);
  const ads = useSubscriberResource<AdCampaign[]>(loadRunningAds);
  const changes = useSubscriberResource(loadChanges);
  const liveTotals = liveNowTotals(live.data);
  const runningAds = ads.data ? runningAdsTotals(ads.data).ads : null;
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
  const changeLine = (metric: (typeof engagementMetrics)[number]['key']) => {
    const row = metricTotal(engagement.data, metric);
    const change = row ? changeAgainstPrevious(row.periodTotal, row.previousPeriodTotal) : null;
    if (change === null) return '—';
    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : null;
    return <>{Icon && <Icon className="me-1 inline size-3" aria-hidden="true" />}<span className="tabular-nums">{change > 0 ? '+' : ''}{Math.round(change)}%</span></>;
  };
  const liveTiles = [
    { label: 'People online', value: liveTotals?.visitors, icon: Users },
    { label: 'Visits started', value: liveTotals?.visits, icon: Activity },
    { label: 'Pages viewed', value: liveTotals?.pages, icon: Eye },
    { label: 'Actions', value: liveTotals?.actions, icon: Route },
  ];
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-semibold">{copy('Today')}</h1><p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>{stamp}. {counts === null ? '' : total ? `${n(total)} ${copy('things wait on you')}${late ? `, ${n(late)} ${copy('late')}` : ''}.` : copy('Nothing waits on you.')}</p></div>
      {total > 0 && <Button nativeButton={false} render={<Link href="/dashboard/inbox?run=1" />}><ArrowRight className="rtl:rotate-180" aria-hidden="true" />{copy('Start with the oldest')}</Button>}
    </header>

    <section aria-labelledby="home-at-a-glance" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="home-at-a-glance" className="text-base font-semibold">{copy('At a glance')}</h2><p className="mt-0.5 text-sm text-muted-foreground">{copy('Engagement, the last 7 days')}. {copy('Compared with the 7 days before.')}</p></div>
        <Link href="/dashboard/algorithm/today#insights-engagement" className="text-[12.5px] font-medium text-primary">{copy('Open the numbers')}</Link>
      </div>
      {engagement.error ? <RequestError message={copy('Could not load the engagement.')} retry={() => { void engagement.refetch(); }} />
        : <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{engagementMetrics.map(({ key, label, icon }) =>
          <MeasureTile key={key} label={copy(label)} loading={engagement.loading} value={engagement.loading ? undefined : metricTotal(engagement.data, key)?.periodTotal} hint={engagement.loading ? undefined : changeLine(key)} icon={icon} />)}</div>}
    </section>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Panel title={copy('Waiting on you')} more={<Link href="/dashboard/inbox" className="text-[12.5px] font-medium text-primary">{copy('Open Inbox')}</Link>}>
          {counts === null ? <div className="h-28 animate-pulse bg-muted/50" /> : waiting.length ? waiting.map((queue) => { const a = age(oldest.data?.[queue.id]); return <JobRow key={queue.id} href={`/dashboard/inbox?queue=${queue.id}`} icon={<Inbox className="size-4" aria-hidden="true" />} title={copy(queue.job)} sub={a.text || undefined} count={counts[queue.count]} late={a.late ? copy('Past the 48 h promise') : undefined} />; })
            : <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{copy('All clear. New corrections, reports, receipts and photos land in the Inbox.')}</p>}
        </Panel>
        <Panel title={copy('Money and renewals')} more={<Link href="/dashboard/algorithm/money" className="text-[12.5px] font-medium text-primary">{copy('Open Money')}</Link>}>
          <JobRow href="/dashboard/inbox?queue=renewals" icon={<Inbox className="size-4" aria-hidden="true" />} title={copy('Renewal receipts waiting')} count={counts ? counts.renewals : undefined} />
          <JobRow href="/dashboard/money/owners" icon={<Wallet className="size-4" aria-hidden="true" />} title={copy('Renewing within 30 days')} count={money.loading ? undefined : money.data ? money.data.expiringWithin30Days : null} />
          <JobRow href="/dashboard/money/ads" icon={<Megaphone className="size-4" aria-hidden="true" />} title={copy('Running ads')} count={ads.loading ? undefined : runningAds} />
          {(money.error || ads.error) && <div className="border-t border-border p-4"><RequestError message={copy('Could not load the money summary.')} retry={() => { void money.refetch(); void ads.refetch(); }} /></div>}
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
        <Panel title={copy('Right now')} more={<Link href="/dashboard/algorithm/today#live-now" className="text-[12.5px] font-medium text-primary">{copy('Open the numbers')}</Link>}>
          {live.loading ? <div className="h-28 animate-pulse bg-muted/50" /> : live.error ? <div className="border-t border-border p-4">{liveState(live.error) === 'disabled' ? <p className="text-sm text-muted-foreground">{copy('Live is switched off on this run.')}</p> : <RequestError message={copy('Could not load the live snapshot.')} retry={() => { void live.refetch(); }} />}</div>
            : !live.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load the live snapshot.')} retry={() => { void live.refetch(); }} /></div>
              : !liveTotals ? <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{copy('No live snapshot is available right now.')}</p>
              : <dl className="grid grid-cols-2 gap-3 border-t border-border p-4">{liveTiles.map(({ label, value, icon: Icon }) => <div key={label}>
                <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{copy(label)}</dt>
                <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{typeof value === 'number' ? n(value) : '—'}</dd>
              </div>)}</dl>}
        </Panel>
        <Panel title={copy('What changed')} more={<Link href="/dashboard/algorithm/today#numbers-insights" className="text-[12.5px] font-medium text-primary">{copy('Open what moved')}</Link>}>
          {changes.loading ? <div className="h-40 animate-pulse bg-muted/50" /> : changes.error || !changes.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load what changed.')} retry={() => { void changes.refetch(); }} /></div>
            : !changes.data.cards.length ? <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{copy('Nothing moved enough to call out in the last 24 hours.')}</p>
              : <ul>{changes.data.cards.slice(0, 2).map((card, at) => <li key={`${card.kind}-${at}`} className="border-t border-border"><Link href={card.action.href} className="block px-4 py-2.5 hover:bg-muted/60">
                <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-2 py-0.5">{copy(KIND_WORDS[card.kind] ?? card.kind)}</span><span dir="ltr" className="tabular-nums">{card.number}</span></span>
                <span className="mt-1 block text-sm">{lang === 'ar' ? card.sentenceAr : card.sentence}</span>
              </Link></li>)}</ul>}
        </Panel>
        <Panel title={copy('Last 24 hours')} more={<Link href="/dashboard/algorithm/today?window=24h" className="text-[12.5px] font-medium text-primary">{copy('Algorithm')}</Link>}>
          {answers.loading ? <div className="h-40 animate-pulse bg-muted/50" /> : answers.error || !answers.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load the answers.')} retry={() => { void answers.refetch(); }} /></div>
            : <ul>{answers.data.answers.slice(0, 4).map((answer) => <li key={answer.key} className="border-t border-border"><Link href={answer.href} className="block px-4 py-2.5 hover:bg-muted/60"><span className="block text-xs text-muted-foreground">{copy(answer.question)}</span><span className="block text-sm">{lang === 'ar' ? answer.sentenceAr : answer.sentence}</span></Link></li>)}</ul>}
        </Panel>
        <Panel title={copy('Hype now')} more={<span className="text-xs text-muted-foreground">{copy('30-day sum, uncapped')}</span>}>
          {hype.loading ? <div className="h-40 animate-pulse bg-muted/50" /> : hype.error || !hype.data ? <div className="border-t border-border p-4"><RequestError message={copy('Could not load the hype.')} retry={() => { void hype.refetch(); }} /></div>
            : !hype.data.items.length ? <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{copy('No place has hype in the last 24 hours.')}</p>
              : <ol>{hype.data.items.slice(0, 5).map((item, at) => <li key={item.id} className="border-t border-border"><Link href={`/dashboard/places/${item.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60"><span className="w-4 text-xs text-muted-foreground tabular-nums">{n(at + 1)}</span><span dir="auto" className="min-w-0 flex-1 truncate text-sm font-medium">{pick(item.name, item.nameEn)}</span><span className="text-sm font-semibold tabular-nums">{n(item.points)}</span>{item.rank ? <HypeRank className="ms-2" rank={{ rank: item.rank, total: item.total ?? 0, topPercent: item.topPercent ?? 100, moved: item.moved ?? null }} /> : null}</Link></li>)}</ol>}
        </Panel>
      </div>
    </div>
  </div>;
}
