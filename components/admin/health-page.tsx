'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { localeFor } from '@/lib/locale';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from './dashboard-text';
import { PageActions } from './page-actions';
import { SystemStatusCard } from './system-status';
import { Field, LoadingState, RequestError, StatusBadge } from './subscriber-ui';
import { SegmentedControl } from './segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CHECK_META, PUBLISH_CHECKS } from './publish-missing';
import type { PlaceCheckId, PublishCheckLevels, PublishLevel } from '@/lib/api/types';

// GET /v1/admin/seo/health (decision 0008, section 4): the newest snapshot of every area.
type Status = 'ok' | 'warn' | 'fail' | 'not_connected';
type Detail = Record<string, unknown>;
interface Area { area: string; status: Status; detail: Detail; taken_at: string }
interface Health { running: boolean; google: { configured: boolean; enabled: boolean; property: string; account: string | null }; areas: Area[] }
interface SearchTotals { clicks: number; impressions: number; position: number; topQueries: { query: string; clicks: number; impressions: number; position: number }[]; topPages: { page: string; clicks: number; impressions: number }[] }

type Say = (words: string) => string;
type Num = (value: number) => string;
const num = (value: unknown) => (typeof value === 'number' ? value : 0);
const list = <T,>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);

/** One line per area in plain words, the pages it affects, and what to do while it is not fine. The order is the plan's. */
const AREAS: { area: string; label: string; needs?: string; say: (d: Detail, n: Num, copy: Say) => string; pages?: (d: Detail) => string[]; todo?: (d: Detail, copy: Say) => string }[] = [
  { area: 'indexing', label: 'Indexing', needs: 'Indexing: needs Google Search Console.',
    say: (d, n, copy) => `${n(num(d.indexed))} ${copy('of')} ${n(num(d.checked))} ${copy('checked pages are on Google')} (${n(num(d.expected))} ${copy('place pages in total')}).`,
    pages: (d) => list<{ slug: string; locale: string; coverage_state: string | null }>(d.notIndexed).map((p) => `${p.locale === 'ar' ? '/ar' : ''}/…/${p.slug}/ · ${p.coverage_state ?? '—'}`),
    todo: (_d, copy) => copy('Pages that are not on Google are listed with Google’s own reason.') },
  { area: 'google_sitemaps', label: 'Sitemaps read by Google',
    say: (d, n, copy) => `${n(list(d.sitemaps).length)} ${copy('sitemaps submitted to Google')}.`,
    pages: (d) => list<{ path: string; errors?: string }>(d.sitemaps).filter((m) => Number(m.errors) > 0).map((m) => m.path),
    todo: (_d, copy) => copy('Open Search Console > Sitemaps to read the error.') },
  { area: 'sitemap', label: 'Sitemap',
    say: (d, n, copy) => (num(d.urls) ? `${n(num(d.urls))} ${copy('pages in the sitemap')}.` : `${copy('The sitemap did not load')}${d.http ? ` (HTTP ${n(num(d.http))})` : ''}.`),
    todo: (_d, copy) => copy('The website builds the sitemap. Check that /sitemap.xml opens.') },
  { area: 'speed', label: 'Speed (real users)', needs: 'Speed: needs a Chrome UX Report key (CRUX_API_KEY) on the server.',
    say: (d, n, copy) => { const lcp = Number((d.phone as Detail | undefined)?.largest_contentful_paint ?? 0); return lcp ? `${copy('Main content shows on phones in')} ${n(Math.round(lcp / 100) / 10)} ${copy('seconds (good is under 2.5).')}` : copy('Google has no real-user speed data for this site yet.'); },
    todo: (_d, copy) => copy('Pages are slow to show their main content on phones.') },
  { area: 'structured_data', label: 'Structured data',
    say: (d, n, copy) => `${n(num(d.sampled))} ${copy('place pages sampled')}, ${n(list(d.problems).length)} ${copy('with missing business data')}.`,
    pages: (d) => list<{ url: string; missing: string[] }>(d.problems).map((p) => `${p.url} · ${p.missing.join(', ')}`),
    todo: (_d, copy) => copy('The place page adds this data itself; a place missing its name or address needs editing.') },
  { area: 'languages', label: 'Languages (English and Arabic pairs)',
    say: (d, n, copy) => `${n(num(d.checked))} ${copy('pages checked')}, ${n(num(d.missingPair))} ${copy('without an English and Arabic pair')}.`,
    pages: (d) => list<string>(d.pages),
    todo: (_d, copy) => copy('Each page needs its English and Arabic twin in the sitemap.') },
  { area: 'links', label: 'Links',
    say: (d, n, copy) => `${n(num(d.sampled))} ${copy('pages sampled')}, ${n(list(d.problems).length)} ${copy('did not open')}.`,
    pages: (d) => list<{ url: string; status: number }>(d.problems).map((p) => `${p.url} · ${p.status || '—'}`),
    todo: (_d, copy) => copy('Open each page; fix it or remove it from the website.') },
  { area: 'search_overall', label: 'Search overall', needs: 'Search overall: needs Google Search Console.',
    say: (d, n, copy) => (d.error ? String(d.error) : `${n(num(d.clicks))} ${copy('clicks and')} ${n(num(d.impressions))} ${copy('impressions in the last 28 days')}.`) },
  { area: 'geo', label: 'AI search (GEO)',
    say: (d, n, copy) => { const blocked = list<string>(d.blockedBots); return `${blocked.length ? `${copy('robots.txt blocks these AI crawlers')}: ${blocked.join(', ')}.` : copy('AI crawlers (ChatGPT, Claude, Perplexity) can read the site.')} ${copy(d.llmsTxt ? 'llms.txt is in place.' : 'llms.txt is missing.')}`; },
    todo: (d, copy) => `${d.llmsTxt ? '' : `${copy('Add an llms.txt file to the website: a short guide to the site for AI engines.')} `}${copy('Whether AI engines cite 5argny in their answers is not measured yet: it needs paid API keys.')}` },
];
const CHIP: Record<Status, [label: string, tone: string]> = { ok: ['Fine', 'active'], warn: ['Check', 'paused'], fail: ['Failing', 'cancelled'], not_connected: ['Not connected', 'draft'] };

/** Numbers > Health: the whole site's SEO and AI-search state in one place. */
export function HealthPage() {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => adminApi.get<Health>('/v1/admin/seo/health'), []);
  const resource = useSubscriberResource(load);
  const { refetch } = resource;
  const [started, setStarted] = React.useState(false);
  const n: Num = (value) => value.toLocaleString(localeFor(lang));
  const data = resource.data;
  const running = started || !!data?.running;

  // While a check runs the page asks again every 5 seconds; it stops by itself when the server says it finished.
  React.useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => { void refetch().then(() => setStarted(false)); }, 5000);
    return () => window.clearInterval(timer);
  }, [running, refetch]);

  const run = async () => {
    try { await adminApi.post('/v1/admin/seo/run'); setStarted(true); toast.success(copy('Health check started. Results appear here in about a minute.')); }
    catch { toast.error(copy('Could not start the health check. Try again.')); }
  };

  const byArea = new Map((data?.areas ?? []).map((a) => [a.area, a]));
  const shown = AREAS.filter((a) => byArea.has(a.area));
  const count = (status: Status) => shown.filter((a) => byArea.get(a.area)!.status === status).length;
  const last = (data?.areas ?? []).reduce((max, a) => (a.taken_at > max ? a.taken_at : max), '');
  const totals = byArea.get('search_overall')?.status === 'ok' ? (byArea.get('search_overall')!.detail as unknown as SearchTotals) : null;

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{copy('Health')}</h2>
      <p className="text-sm text-muted-foreground" aria-live="polite">{running ? copy('Checking the website now…') : last ? `${copy('Last checked')} ${dashboardDateTime(last, lang)}. ${copy('It also runs by itself every night.')}` : copy('Can Google and AI search find and read 5argny.com? Checked every night.')}</p></div>
      <PageActions actions={[{ label: 'Run the health check', icon: <RefreshCw />, disabled: running, disabledReason: 'A check is running.', onClick: () => { void run(); } }]} /></header>

    <SystemStatusCard />

    {resource.loading && !data ? <Card><CardContent><LoadingState /></CardContent></Card>
      : resource.error || !data ? <RequestError message={copy('Could not load the health report.')} retry={() => { void refetch(); }} />
      : <>
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>{copy('Site checks')}</CardTitle>
            {shown.length > 0 && <CardDescription className="tabular-nums">{n(count('ok'))} {copy('fine')} · {n(count('warn') + count('fail'))} {copy('to look at')} · {n(count('not_connected'))} {copy('not connected')}</CardDescription>}</div></CardHeader>
          <CardContent>
            {!shown.length ? <p className="text-sm text-muted-foreground">{copy('Site checks: none has run yet. Press “Run the health check”; the first results take about a minute.')}</p>
              : <ul className="divide-y divide-border">{shown.map((spec) => {
                const a = byArea.get(spec.area)!;
                const [chip, tone] = CHIP[a.status] ?? CHIP.warn;
                const pages = a.status === 'not_connected' ? [] : spec.pages?.(a.detail) ?? [];
                return <li key={spec.area} className="flex min-h-14 flex-wrap items-start gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-64 space-y-1 text-sm">
                    <p className="font-medium">{copy(spec.label)}</p>
                    <p className="text-muted-foreground">{a.status === 'not_connected' ? copy(spec.needs ?? 'Not connected') : spec.say(a.detail, n, copy)}</p>
                    {(a.status === 'warn' || a.status === 'fail') && spec.todo && <p>{copy('What to do')}: {spec.todo(a.detail, copy)}</p>}
                    {pages.length > 0 && <details><summary className="cursor-pointer text-muted-foreground">{copy('Pages affected')} <span className="tabular-nums">({n(pages.length)})</span></summary>
                      <ul className="mt-1 space-y-1">{pages.map((p) => <li key={p} dir="ltr" className="break-all text-start">{p}</li>)}</ul></details>}
                  </div>
                  <StatusBadge status={tone}>{copy(chip)}</StatusBadge>
                </li>;
              })}</ul>}
          </CardContent>
        </Card>

        {totals && <Card>
          <CardHeader><CardTitle>{copy('Top searches on Google')}</CardTitle><CardDescription>{copy('The whole site, last 28 days.')} {copy('Average position')}: <span className="tabular-nums">{n(Math.round(totals.position * 10) / 10)}</span></CardDescription></CardHeader>
          <CardContent><Table><TableHeader><TableRow><TableHead>{copy('Search')}</TableHead><TableHead className="text-end">{copy('Position')}</TableHead><TableHead className="text-end">{copy('Clicks')}</TableHead><TableHead className="text-end">{copy('Impressions')}</TableHead></TableRow></TableHeader>
            <TableBody>{totals.topQueries.map((q) => <TableRow key={q.query}><TableCell dir="auto" className="font-medium">{q.query}</TableCell><TableCell className="text-end tabular-nums">{n(Math.round(q.position * 10) / 10)}</TableCell><TableCell className="text-end tabular-nums">{n(q.clicks)}</TableCell><TableCell className="text-end tabular-nums">{n(q.impressions)}</TableCell></TableRow>)}</TableBody></Table></CardContent>
        </Card>}

        <GoogleCard google={data.google} />
        <QualitySettings />
      </>}
  </div>;
}

/** Is Search Console connected, and the owner's steps while it is not. The key itself never reaches the dashboard. */
function GoogleCard({ google }: { google: Health['google'] }) {
  const copy = useDashboardCopy();
  const state = !google.configured ? 'Not connected' : google.enabled ? 'Connected' : 'Switched off';
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>{copy('Google Search Console')}</CardTitle>
      <CardDescription>{copy('Where the search words, positions and indexing come from.')}</CardDescription></div>
      <StatusBadge status={state === 'Connected' ? 'active' : 'draft'}>{copy(state)}</StatusBadge></CardHeader>
    <CardContent className="space-y-3 text-sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1"><dt className="text-muted-foreground">{copy('Property')}</dt><dd dir="ltr" className="break-all text-start">{google.property}</dd>
        {google.account && <><dt className="text-muted-foreground">{copy('Service account')}</dt><dd dir="ltr" className="break-all text-start">{google.account}</dd></>}</dl>
      {!google.configured ? <div className="rounded-lg bg-muted p-3"><p className="font-medium">{copy('To connect (once, by the owner):')}</p>
        <ol className="mt-1 list-decimal space-y-1 ps-5">
          <li>{copy('In Google Cloud, create a project and switch on the Search Console API.')}</li>
          <li>{copy('Create a service account there and download its JSON key.')}</li>
          <li>{copy('In Search Console, add the service account’s email as a user on the 5argny.com property.')}</li>
          <li>{copy('Hand the key to the developer: it is stored on the server as GSC_SERVICE_ACCOUNT_JSON, never in the dashboard.')}</li>
        </ol></div>
        : <p className="text-muted-foreground">{copy('This account must be a user on the property in Search Console. Numbers arrive with the nightly sync.')}</p>}
    </CardContent>
  </Card>;
}

// The quality group of the algorithm settings (decision 0006 store): PUT sends every group back, so the others are kept as read.
type QualityValues = {
  minForTrial: number;
  googleEnabled: boolean;
  siteProperty: string;
  siteUrl: string;
  quickWinMinImpressions: number;
  publishChecks?: PublishCheckLevels;
};
type SettingsRow = { values: Record<string, unknown> & { quality?: QualityValues } };

/** Rule 11 start values: price tracked, every other check required. */
const START_LEVELS = Object.fromEntries(
  PUBLISH_CHECKS.map((id) => [id, id === 'price' ? 'tracked' : 'required']),
) as PublishCheckLevels;

/** One sentence per check, so a level never needs a guess. */
const CHECK_SENTENCES: Record<PlaceCheckId, string> = {
  names: 'A place needs its name in Arabic and in English.',
  area: 'A place needs the area inside its city (Zamalek, not just Cairo).',
  pin: 'A place needs its map pin, latitude and longitude.',
  address: 'A place needs a street address.',
  phone: 'A place needs a phone number customers can call.',
  hours: 'A place needs at least one row of opening hours.',
  photos: 'A place needs three approved photos.',
  amenities: 'A place needs three amenities (parking, delivery, seating…).',
  tags: 'A place needs at least one tag customers search with.',
  conflicts: 'A place cannot offer alcohol or a bar and also claim to be for kids or families.',
  quiet: 'A place cannot be tagged quiet and also offer live music or performances.',
  price: 'A place needs its price range. Tracked until the price sweep has run.',
};

const LEVEL_WORDS: { value: PublishLevel; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'tracked', label: 'Tracked' },
  { value: 'off', label: 'Off' },
];

type PublishPreview = { live: number; hidden: number; missing: Record<string, number> };

function QualitySettings() {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const number = (value: number) => value.toLocaleString(localeFor(lang));
  const { data: session } = useCurrentSession();
  const [row, setRow] = React.useState<SettingsRow | null>(null);
  const [quality, setQuality] = React.useState<QualityValues | null>(null);
  const [levels, setLevels] = React.useState<PublishCheckLevels>(START_LEVELS);
  const [savedLevels, setSavedLevels] = React.useState<PublishCheckLevels>(START_LEVELS);
  const [liveNow, setLiveNow] = React.useState<{ live: number; hidden: number } | null>(null);
  const [preview, setPreview] = React.useState<PublishPreview | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const superAdmin = session?.user?.role === 'super_admin';
  React.useEffect(() => {
    if (!superAdmin) return;
    adminApi.get<SettingsRow>('/v1/admin/algorithm/settings').then((r) => {
      setRow(r);
      setQuality(r.values.quality ?? null);
      const next = (r.values.quality?.publishChecks ?? START_LEVELS) as PublishCheckLevels;
      setLevels(next);
      setSavedLevels(next);
    }).catch(() => undefined);
    adminApi.get<{ live: number; hidden: number }>('/v1/admin/algorithm/publish/status').then(setLiveNow).catch(() => undefined);
  }, [superAdmin]);
  if (!superAdmin || !row || !quality) return null;
  const min = Number(quality.minForTrial);
  const valid = Number.isInteger(min) && min >= 0 && min <= 100;
  const gateChanged = JSON.stringify(levels) !== JSON.stringify(savedLevels);
  const setLevel = (check: PlaceCheckId, level: PublishLevel) =>
    setLevels((current) => ({ ...current, [check]: level }));
  const put = async () => {
    const nextQuality = { ...quality, publishChecks: levels };
    const next = await adminApi.put<SettingsRow>('/v1/admin/algorithm/settings', {
      values: { ...row.values, quality: nextQuality },
      note: 'quality settings',
    });
    setRow(next);
    setQuality(next.values.quality ?? nextQuality);
    setSavedLevels(levels);
    setPreview(null);
    setConfirming(false);
    const status = await adminApi
      .get<{ live: number; hidden: number }>('/v1/admin/algorithm/publish/status')
      .catch(() => null);
    if (status) setLiveNow(status);
  };
  const save = async () => {
    if (!valid) return;
    if (gateChanged) {
      setBusy(true);
      try {
        setPreview(
          await adminApi.post<PublishPreview>('/v1/admin/algorithm/publish/preview', {
            publishChecks: levels,
          }),
        );
        setConfirming(true);
      } catch {
        toast.error(copy('Could not preview the publish gate.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await put();
      toast.success(copy('Quality settings saved. Place statuses follow within the hour.'));
    } catch {
      toast.error(copy('Could not save the quality settings. Check the values and try again.'));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      await put();
      toast.success(copy('Publish gate saved. Every place was rebuilt.'));
    } catch {
      toast.error(copy('Could not save the quality settings. Check the values and try again.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Card>
        <CardHeader><CardTitle>{copy('Quality settings')}</CardTitle><CardDescription>{copy('Super admin only. They apply to every place.')}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="max-w-xs"><Field label={copy('Lowest quality score for a fair-chance trial')} error={valid ? undefined : copy('Enter a whole number from 0 to 100.')}>
            <Input type="number" inputMode="numeric" min={0} max={100} value={String(quality.minForTrial)} onChange={(e) => setQuality({ ...quality, minForTrial: e.target.value === '' ? NaN : Number(e.target.value) })} /></Field>
            <p className="mt-1 text-sm text-muted-foreground">{copy('A place below this score waits as “needs listing”. 0 switches the rule off.')}</p></div>
          <label className="flex max-w-md items-center justify-between gap-4 text-sm"><span>{copy('Read Google Search Console every night')}</span>
            <Switch checked={quality.googleEnabled} onCheckedChange={(on: boolean) => setQuality({ ...quality, googleEnabled: on })} /></label>

          <div className="space-y-2 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold">{copy('Publish gate')}</h3>
              <p className="text-sm text-muted-foreground">
                {copy('A place is public only when every Required check passes. A Tracked check that is missing is listed in Inbox and on the place, but never hides it. Off checks are not checked.')}
                {liveNow ? ` ${number(liveNow.live)} ${copy('places are live')} · ${number(liveNow.hidden)} ${copy('hidden')}.` : ''}
              </p>
            </div>
            <ul className="divide-y" data-slot="publish-checks">
              {PUBLISH_CHECKS.map((check) => {
                const Icon = CHECK_META[check].icon;
                return (
                  <li key={check} className="flex min-h-11 flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />{copy(CHECK_META[check].label)}</p>
                      <p className="text-xs leading-4 text-muted-foreground">{copy(CHECK_SENTENCES[check])}</p>
                    </div>
                    <SegmentedControl
                      label={CHECK_META[check].label}
                      size="compact"
                      value={levels[check]}
                      options={LEVEL_WORDS}
                      onValueChange={(value) => setLevel(check, value as PublishLevel)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          <div><Button variant="outline" onClick={() => { void save(); }} disabled={busy || !valid}>{copy('Save quality settings')}</Button></div>
        </CardContent>
      </Card>
      <Dialog open={confirming} onOpenChange={(open) => { if (!busy) { setConfirming(open); if (!open) setPreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy('Save the publish gate?')}</DialogTitle>
            <DialogDescription>
              {preview
                ? `${number(preview.live)} ${copy('places will be live')}, ${number(preview.hidden)} ${copy('hidden')}.`
                : copy('Saving rebuilds every place now.')}
              {' '}{copy('Every place is rebuilt now, and the public site follows at once.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setConfirming(false); setPreview(null); }}>{copy('Cancel')}</Button>
            <Button type="button" disabled={busy} onClick={() => { void confirm(); }}>{copy('Save and rebuild')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
