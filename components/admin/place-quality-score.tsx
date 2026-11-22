'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Bot, Home, Search, Users } from 'lucide-react';
import Link from '@/components/lang-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { CorrectionRow } from '@/lib/api/inbox';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { localeFor } from '@/lib/locale';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { ActionDialog, LoadingState, RequestError, StatusBadge, type ActionSpec } from './subscriber-ui';
import { DateCell } from './date-cell';
import { KIND_LABELS, correctionDialogs } from './inbox-page';
import { SubmissionValue } from './submission-value';
import { useDashboardCopy } from './dashboard-text';

// GET /v1/admin/places/:id/quality (decision 0008)
interface Fix { code: string; group: string; who: 'auto' | 'team' | 'owner'; label: string; gain: number }
interface Concern { id: string; kind: CorrectionRow['kind']; answer: unknown; status: 'open' | 'applied' | 'rejected'; reply: string | null; created_at: string; media_count: number }
interface SearchQuery { locale: string; query: string; clicks: number; impressions: number; position: number; ctr: number }
export interface SearchWords { state: 'not_connected' | 'waiting' | 'ok' | 'off'; queries: SearchQuery[]; words: { w1: number; w2: number; w3: number; w4: number } | null; trend: { impressions: number; before: number; percent: number | null } | null; quickWins: SearchQuery[] }
interface Quality {
  score: number | null;
  parts: Record<'listing' | 'accurate' | 'fresh' | 'findable', { earned: number; max: number }> | null;
  fixes: Fix[];
  computedAt: string | null;
  concerns: Concern[];
  autoFixes: { id: string; fix: string; applied_at: string; undone_at: string | null }[];
  search: SearchWords;
}

const WHO = { auto: { icon: Bot, label: 'Automatic' }, team: { icon: Users, label: 'Team' }, owner: { icon: Home, label: 'Place owner' } } as const;
const PART_LABEL = { listing: 'Listing', accurate: 'Accuracy', fresh: 'Freshness', findable: 'Findability' } as const;
/** Where a fix is done: the tab of this place page that holds it, and the words on its button. */
const FIX_TAB: Record<string, [tab: string, button: string]> = {
  photos: ['photos', 'Open Media'], hours: ['hours', 'Open Hours'], menu: ['menu', 'Open Menu & prices'], features: ['features', 'Open Features'],
  phone: ['details', 'Open Details'], price_band: ['details', 'Open Details'], location: ['details', 'Open Details'], fresh: ['details', 'Open Details'],
};
const CONCERN_STATE = { open: ['Open', 'open'], applied: ['Applied', 'confirmed'], rejected: ['Rejected', 'rejected'] } as const;

/** Place > Quality, top part: the score, what to fix, the customer concerns and the Google search words. */
export function QualityOverview({ placeId, canWrite }: { placeId: string; canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => adminApi.get<Quality>(`/v1/admin/places/${encodeURIComponent(placeId)}/quality`), [placeId]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [busy, setBusy] = React.useState('');
  const n = (value: number) => value.toLocaleString(localeFor(lang));
  const data = resource.data;

  const post = async (key: string, path: string, done: string) => {
    setBusy(key);
    try { await adminApi.post(path); toast.success(copy(done)); await resource.refetch(); }
    catch { toast.error(copy('Could not apply. Try again.')); } finally { setBusy(''); }
  };
  // Both automatic fixes are the same write: a description made from the place's own facts.
  const applyFix = (code: string) => post(code, `/v1/admin/places/${placeId}/quality/fixes/description/apply`, 'Applied. The description is live on the website now.');
  const undo = (id: string) => post(`undo${id}`, `/v1/admin/quality/fixes/${id}/undo`, 'Undone. The old text is back.');

  if (resource.loading && !data) return <Card><CardContent><LoadingState /></CardContent></Card>;
  if (resource.error || !data) return <RequestError message={copy('Could not load the quality score.')} retry={() => { void resource.refetch(); }} />;
  const possible = data.fixes.reduce((sum, f) => sum + f.gain, 0);
  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle>{copy('Quality score')}</CardTitle>
        <CardDescription>{copy('Recalculated every 10 minutes for places that changed.')}{data.computedAt && <> {copy('Last calculated')}: <span className="tabular-nums">{dashboardDateTime(data.computedAt, lang)}</span></>}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {data.score === null ? <p className="text-sm text-muted-foreground">{copy('Quality score: not calculated yet. It appears within 10 minutes.')}</p> : <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{n(data.score)}</span>
            <span className="text-sm text-muted-foreground">{copy('out of 100')}</span>
            {possible > 0 && <span className="text-sm text-muted-foreground tabular-nums">+{n(possible)} {copy('points still to gain')}</span>}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
            {/* Animate UI's progress role as CSS: ease-out, settled by 550 ms, no overshoot */}
            <div className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-[550ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none rtl:origin-right" style={{ transform: `scaleX(${data.score / 100})` }} />
          </div>
          {data.parts && <ul className="flex flex-wrap gap-2 text-sm">{(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => <li key={k} className="rounded-full bg-muted px-3 py-1"><span className="text-muted-foreground">{copy(PART_LABEL[k])}</span> <span className="font-medium tabular-nums">{n(data.parts![k].earned)}/{n(data.parts![k].max)}</span></li>)}</ul>}
        </>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>{copy('Fix list')}{data.fixes.length > 0 && <span className="ms-2 font-normal text-muted-foreground tabular-nums">{n(data.fixes.length)}</span>}</CardTitle><CardDescription>{copy('Biggest gain first. Each fix says who can do it.')}</CardDescription></CardHeader>
      <CardContent>
        {!data.fixes.length ? <p className="text-sm text-muted-foreground">{copy('Fix list: nothing to fix. This place earns every point it can.')}</p> : <ul className="divide-y divide-border">{data.fixes.map((f) => {
          const Who = WHO[f.who];
          const tab = FIX_TAB[f.code];
          return <li key={f.code} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <span className="w-10 shrink-0 text-sm font-medium tabular-nums" title={`+${n(f.gain)} ${copy('points')}`}>+{n(f.gain)}</span>
            <span className="min-w-0 flex-1 basis-48 text-sm">{copy(f.label)}</span>
            <StatusBadge status="draft"><Who.icon aria-hidden="true" />{copy(Who.label)}</StatusBadge>
            {f.who === 'auto' && canWrite && <Button size="sm" variant="outline" disabled={busy === f.code} onClick={() => { void applyFix(f.code); }}>{copy('Write it now')}</Button>}
            {tab && <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/dashboard/places/${placeId}?tab=${tab[0]}`} />}>{copy(tab[1])}</Button>}
          </li>;
        })}</ul>}
        {data.autoFixes.length > 0 && <div className="mt-4 rounded-lg bg-muted p-3"><p className="text-sm font-medium">{copy('Applied automatically')}</p>
          <ul className="mt-1 space-y-1">{data.autoFixes.map((a) => <li key={a.id} className="flex min-h-10 flex-wrap items-center justify-between gap-3 text-sm">
            <span>{copy('Description written from the place’s own facts')} <span className="text-muted-foreground">· <DateCell value={a.applied_at} />{a.undone_at && <> · {copy('undone')}</>}</span></span>
            {canWrite && !a.undone_at && <Button size="sm" variant="ghost" disabled={busy === `undo${a.id}`} onClick={() => { void undo(a.id); }}>{copy('Undo the description')}</Button>}</li>)}</ul></div>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>{copy('Customer concerns')}{data.concerns.some((c) => c.status === 'open') && <span className="ms-2 font-normal text-muted-foreground tabular-nums">{n(data.concerns.filter((c) => c.status === 'open').length)}</span>}</CardTitle>
        <CardDescription>{copy('The same concerns as the Inbox. Deciding one here or there updates both.')}</CardDescription></div>
        <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/dashboard/inbox?queue=corrections" />}>{copy('Open the Inbox queue')}</Button></CardHeader>
      <CardContent>
        {!data.concerns.length ? <p className="text-sm text-muted-foreground">{copy('Customer concerns: none sent for this place.')}</p> : <ul className="divide-y divide-border">{data.concerns.map((c) => {
          const [label, tone] = CONCERN_STATE[c.status] ?? CONCERN_STATE.open;
          const dialogs = correctionDialogs(copy, c.id, resource.refetch);
          return <li key={c.id} className="flex min-h-14 flex-wrap items-start gap-3 py-3">
            <div className="min-w-0 flex-1 basis-56 space-y-1 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-medium">{copy(KIND_LABELS[c.kind] ?? 'Something else')}<StatusBadge status={tone}>{copy(label)}</StatusBadge></p>
              <div className="min-w-0 break-words"><SubmissionValue value={c.answer} /></div>
              {c.reply && <p dir="auto" className="text-muted-foreground">{copy('Reply')}: {c.reply}</p>}
              <p className="text-muted-foreground"><DateCell value={c.created_at} />{c.media_count > 0 && <> · <span className="tabular-nums">{n(c.media_count)}</span> {copy('photos or videos, shown in the Inbox')}</>}</p>
            </div>
            {c.status === 'open' && canWrite && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setAction(dialogs.apply)}>{copy('Apply')}</Button><Button size="sm" variant="ghost" onClick={() => setAction(dialogs.reject)}>{copy('Reject')}</Button></div>}
          </li>;
        })}</ul>}
      </CardContent>
    </Card>

    <SearchWordsCard search={data.search} forOwner={false} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}

/** The words people type into Google to reach this place, from Search Console. "Not connected" until the key is on the server. */
export function SearchWordsCard({ search, forOwner }: { search: SearchWords; forOwner: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const n = (value: number) => value.toLocaleString(localeFor(lang));
  const message = search.state === 'not_connected' ? copy(forOwner ? 'Google search words are not available yet.' : 'Google is not connected yet. Connect it on Numbers > Health; the words people search to find this place will show here.')
    : search.state === 'waiting' ? copy('Connected. The first numbers arrive after tonight’s sync.') : search.state === 'off' ? copy('Google search is switched off in the quality settings.') : '';
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Search className="size-4 text-primary" aria-hidden="true" />{copy('Found on Google')}</CardTitle>
      <CardDescription>{copy('What people searched on Google before opening this place, last 28 days.')}</CardDescription></div>
      {search.state !== 'ok' && <StatusBadge status="draft">{copy(search.state === 'waiting' ? 'Waiting for data' : search.state === 'off' ? 'Switched off' : 'Not connected')}</StatusBadge>}
      {search.state === 'not_connected' && !forOwner && <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/dashboard/algorithm/health" />}>{copy('Open Health')}</Button>}</CardHeader>
    <CardContent className="space-y-4">
      {search.state !== 'ok' ? <p className="text-sm text-muted-foreground">{message}</p> : !search.queries.length ? <p className="text-sm text-muted-foreground">{copy('Found on Google: no searches reached this place in the last 28 days.')}</p> : <>
        <Table><TableHeader><TableRow><TableHead>{copy('Search')}</TableHead><TableHead className="text-end">{copy('Position')}</TableHead><TableHead className="text-end">{copy('Clicks')}</TableHead><TableHead className="text-end">{copy('Impressions')}</TableHead><TableHead className="text-end">{copy('Click rate')}</TableHead></TableRow></TableHeader>
          <TableBody>{search.queries.map((q) => <TableRow key={q.locale + q.query}><TableCell><span dir="auto" className="font-medium">{q.query}</span> <span className="text-muted-foreground">{copy(q.locale === 'ar' ? 'Arabic page' : 'English page')}</span></TableCell><TableCell className="text-end tabular-nums">{n(Math.round(q.position * 10) / 10)}</TableCell><TableCell className="text-end tabular-nums">{n(q.clicks)}</TableCell><TableCell className="text-end tabular-nums">{n(q.impressions)}</TableCell><TableCell className="text-end tabular-nums">{n(q.ctr)}%</TableCell></TableRow>)}</TableBody></Table>
        {search.words && <div><p className="text-sm font-medium">{copy('Words per search')}</p><ul className="mt-2 flex flex-wrap gap-2 text-sm">{([['1 word', search.words.w1], ['2 words', search.words.w2], ['3 words', search.words.w3], ['4 or more words', search.words.w4]] as const).map(([k, v]) => <li key={k} className="rounded-full bg-muted px-3 py-1"><span className="text-muted-foreground">{copy(k)}</span> <span className="font-medium tabular-nums">{n(v)}%</span></li>)}</ul></div>}
        {search.trend && <p className="text-sm text-muted-foreground">{copy('Impressions, last 28 days vs the 28 before')}: <span className="font-medium text-foreground tabular-nums">{n(search.trend.impressions)}</span> <span className="tabular-nums">/ {n(search.trend.before)}{search.trend.percent !== null && <> ({search.trend.percent > 0 ? '+' : ''}{n(search.trend.percent)}%)</>}</span></p>}
        {search.quickWins.length > 0 && <div><p className="text-sm font-medium">{copy('Quick wins')}</p><p className="text-sm text-muted-foreground">{copy('Searches ranked 8 to 20 with many impressions. Add the words to the description or a heading to move up.')}</p>
          <ul className="mt-2 divide-y divide-border">{search.quickWins.map((q) => <li key={q.locale + q.query} className="flex min-h-10 flex-wrap items-center justify-between gap-3 py-2 text-sm"><span dir="auto" className="font-medium">{q.query}</span><span className="text-muted-foreground tabular-nums">{copy('Position')} {n(Math.round(q.position * 10) / 10)} · {n(q.impressions)} {copy('impressions')}</span></li>)}</ul></div>}
      </>}
    </CardContent>
  </Card>;
}
