'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadAnswers, loadHype, loadInsights, type HypeItem, type HypeKind, type InsightCard, type NumbersWindow } from '@/lib/api/numbers';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { RequestError } from '../subscriber-ui';
import { SegmentedControl } from '../segmented-control';
import { useDashboardCopy } from '../dashboard-text';
import { cn } from '@/lib/utils';

/** Western digits in both languages (owner rule). */
const digits = (n: number) => n.toLocaleString('en-US');
const WINDOW_WORDS: Record<NumbersWindow, string> = { live: 'this hour', '24h': 'the last 24 hours', '7d': 'the last 7 days', '30d': 'the last 30 days' };
const KIND_WORDS: Record<InsightCard['kind'], string> = { rising: 'Rising', fading: 'Fading', hype_now: 'Hype now', gap: 'Gap', money: 'Money' };

function Skeleton({ rows }: { rows: number }) {
  return <div className="space-y-3" aria-busy="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>;
}

/** T045: the fixed questions, answered first. */
function Answers({ window }: { window: NumbersWindow }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => loadAnswers(window), [window]);
  const res = useSubscriberResource(load);
  return <Card data-slot="numbers-answers">
    <CardHeader><CardTitle>{copy('Answers')}</CardTitle><p className="text-sm text-muted-foreground">{copy('What the numbers say about')} {copy(WINDOW_WORDS[window])}.</p></CardHeader>
    <CardContent>
      {res.loading ? <Skeleton rows={7} /> : res.error || !res.data ? <RequestError message={copy('Could not load the answers.')} retry={() => { void res.refetch(); }} /> :
        <ul className="divide-y">{res.data.answers.map((a) => <li key={a.key}>
          <Link href={a.href} className="group flex min-h-14 items-center gap-4 rounded-lg px-2 py-3 -mx-2 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
            <div className="min-w-0 flex-1"><p className="text-sm text-muted-foreground">{copy(a.question)}</p><p className="mt-0.5">{lang === 'ar' ? a.sentenceAr : a.sentence}</p></div>
            {a.number && <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-medium tabular-nums"><bdi>{lang === 'ar' ? a.numberAr : a.number}</bdi></span>}
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 rtl:-scale-x-100 text-muted-foreground group-hover:text-foreground" />
          </Link></li>)}</ul>}
    </CardContent>
  </Card>;
}

/** T044: insight cards, ranked by the backend (change × volume). */
function Insights({ window }: { window: NumbersWindow }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => loadInsights(window), [window]);
  const res = useSubscriberResource(load);
  return <section aria-labelledby="numbers-insights" className="space-y-3">
    <div><h2 id="numbers-insights" className="font-display text-xl font-semibold">{copy('What moved')}</h2><p className="mt-1 text-sm text-muted-foreground">{res.data ? `${copy('Compared:')} ${copy(res.data.compared)}.` : copy('What moved, compared with its usual pace.')}</p></div>
    {res.loading ? <Skeleton rows={3} /> : res.error || !res.data ? <RequestError message={copy('Could not load the insights.')} retry={() => { void res.refetch(); }} /> :
      !res.data.cards.length ? <Card><CardContent><p className="text-muted-foreground">{copy('Nothing moved enough to call out in')} {copy(WINDOW_WORDS[window])}. {copy('Small numbers are left out on purpose.')}</p></CardContent></Card> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{res.data.cards.map((card, i) => <Card key={i} data-insight-kind={card.kind} className="flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', card.kind === 'rising' || card.kind === 'hype_now' ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground')}>{copy(KIND_WORDS[card.kind])}</span>
            <span dir="ltr" className="text-2xl font-semibold tabular-nums">{card.number}</span>
          </div>
          <p className="font-medium">{lang === 'ar' ? card.sentenceAr : card.sentence}</p>
          <p className="text-sm text-muted-foreground">{lang === 'ar' ? card.whyAr : card.why}</p>
          <Link href={card.action.href} className="mt-auto inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline">{copy(card.action.label)}<ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" /></Link>
        </CardContent>
      </Card>)}</div>}
  </section>;
}

type SortKey = 'score' | 'views' | 'likes' | 'saves' | 'shares' | 'goes';
const COLUMNS: { key: SortKey; label: string }[] = [{ key: 'score', label: 'Hype' }, { key: 'views', label: 'Views' }, { key: 'likes', label: 'Loves' }, { key: 'saves', label: 'Saves' }, { key: 'shares', label: 'Shares' }, { key: 'goes', label: '5argny taps' }];

/** T046: hype ranking with a sortable Hype column; team only. */
function Hype({ window }: { window: NumbersWindow }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const [kind, setKind] = React.useState<HypeKind>('place');
  const [sort, setSort] = React.useState<SortKey>('score');
  const [all, setAll] = React.useState(false);
  const load = React.useCallback(() => loadHype(window, kind), [window, kind]);
  const res = useSubscriberResource(load);
  const rows = [...(res.data?.items ?? [])].sort((a: HypeItem, b: HypeItem) => b[sort] - a[sort] || b.points - a.points);
  const shown = all ? rows : rows.slice(0, 10);
  return <Card data-slot="numbers-hype">
    <CardHeader className="flex flex-wrap items-start justify-between gap-3">
      <div><CardTitle>{copy('Hype')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{copy('Views 1, loves 3, saves 4, shares 5, 5argny taps 6 points. The top one scores 100. Team only.')}</p></div>
      <SegmentedControl label="Hype of" value={kind} onValueChange={(v) => { setKind(v as HypeKind); setAll(false); }} options={[{ value: 'place', label: 'Places' }, { value: 'area', label: 'Areas' }, { value: 'category', label: 'Categories' }, { value: 'collection', label: 'Collections' }]} />
    </CardHeader>
    <CardContent>
      {res.loading ? <Skeleton rows={5} /> : res.error || !res.data ? <RequestError message={copy('Could not load the hype.')} retry={() => { void res.refetch(); }} /> :
        !rows.length ? <p className="text-muted-foreground">{copy('No views, loves, saves, shares or 5argny taps in')} {copy(WINDOW_WORDS[window])}.</p> :
        <><table className="w-full text-sm"><thead><tr className="text-muted-foreground">
          <th className="py-2 text-start font-normal">{copy('Name')}</th>
          {COLUMNS.map((c) => <th key={c.key} aria-sort={sort === c.key ? 'descending' : undefined} className="py-2 text-end font-normal"><button type="button" data-ro-allow="true" onClick={() => setSort(c.key)} className={cn('-me-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-muted', sort === c.key && 'bg-muted font-medium text-foreground')}>{copy(c.label)}{sort === c.key && <ArrowDown aria-hidden="true" className="size-3" />}</button></th>)}
        </tr></thead><tbody className="divide-y">{shown.map((r) => <tr key={r.id} className="h-14 hover:bg-muted/40">
          <td className="py-2 pe-3"><span className="font-medium" dir="auto">{kind === 'place' ? <Link href={`/dashboard/places/${r.id}`} className="hover:underline">{pick(r.name, r.nameEn)}</Link> : pick(r.name, r.nameEn)}</span></td>
          <td className="py-2 text-end"><span className="inline-flex min-w-12 items-center justify-end gap-2 font-semibold tabular-nums"><span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${r.score}%` }} /></span>{r.score}</span></td>
          {COLUMNS.slice(1).map((c) => <td key={c.key} className="py-2 text-end tabular-nums text-muted-foreground">{digits(r[c.key])}</td>)}
        </tr>)}</tbody></table>
        {rows.length > 10 && <button type="button" data-ro-allow="true" onClick={() => setAll(!all)} className="mt-3 rounded-full px-3 py-1 text-sm font-medium text-primary hover:bg-accent">{all ? copy('Show the top 10') : `${copy('Show all')} ${digits(rows.length)}`}</button>}</>}
    </CardContent>
  </Card>;
}

/** The smart top of Numbers: answers, then insight cards, then hype, all following the window switch. */
export function NumbersSmart({ window }: { window: NumbersWindow }) {
  return <div className="space-y-6"><Answers window={window} /><Insights window={window} /><Hype window={window} /></div>;
}
