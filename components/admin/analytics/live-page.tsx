'use client';

import * as React from 'react';
import Link from 'next/link';
import { LiveBreakdown, liveTime } from './live-breakdown';
import { Eye, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordList } from '../record-list';
import { placeCover } from '@/lib/place-list';
import { RecordCell, type RecordIcon } from '../record-cell';
import { RowActions } from '../row-actions';
import { PageActions } from '../page-actions';
import { SegmentedControl } from '../segmented-control';
import { useDashboardCopy } from '../dashboard-text';
import { LoadingState, RequestError } from '../subscriber-ui';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useUrlTab } from '@/lib/use-url-tab';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adminApi } from '@/lib/api/admin-client';
import { loadLiveBundle } from '@/lib/api/live-status';
import { createLivePoller, liveWindows, liveState, lineSegments, liveStepLabels, type LiveBundle, type LiveWindow, type LiveMeasure, type LivePoint, type LiveRank, type LiveJourney } from '@/lib/live-status';

const presetLabels = ['1 minute', '5 minutes', '15 minutes', '30 minutes', '1 hour', '3 hours', '6 hours', '12 hours', '24 hours'];
export function LivePage() { return <React.Suspense fallback={<LoadingState />}><LiveContent /></React.Suspense>; }
function LiveContent() {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang(); const preset = useUrlTab([...liveWindows], '5m', 'window'); const windowChoice = preset.value as LiveWindow;
  const [bundle, setBundle] = React.useState<LiveBundle | null>(null); const [status, setStatus] = React.useState<'loading' | 'ready' | 'disabled' | 'error'>('loading'); const [now, setNow] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null); const poller = React.useRef<ReturnType<typeof createLivePoller<LiveBundle>> | null>(null);
  React.useEffect(() => {
    const control = createLivePoller({ window: '5m', hidden: () => document.hidden, load: loadLiveBundle, scheduler: { set: (fn, ms) => setTimeout(fn, ms), clear: token => window.clearTimeout(token) }, onResult: value => { setBundle(value); setStatus('ready'); setNow(Date.now()); }, onError: error => { setStatus(liveState(error)); } });
    poller.current = control;
    const initial = new URLSearchParams(window.location.search).get('window'); if (initial && liveWindows.includes(initial as LiveWindow)) control.setWindow(initial as LiveWindow);
    control.start(); const visibility = () => control.visibility(); document.addEventListener('visibilitychange', visibility);
    const clock = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1000);
    return () => { control.stop(); clearInterval(clock); document.removeEventListener('visibilitychange', visibility); if (poller.current === control) poller.current = null; };
  }, []);
  React.useEffect(() => { poller.current?.setWindow(windowChoice); }, [windowChoice]);
  const current = bundle?.summary.window === windowChoice ? bundle : null;
  const age = current ? Math.max(0, Math.floor((now - Date.parse(current.summary.generatedAt)) / 1000)) : null;
  const number = (value: number | null | undefined) => value === null || value === undefined ? '—' : value.toLocaleString(lang);
  const reports = current ? [current.summary, current.where, current.top, current.journeys, current.searches, current.funnel] : [];
  const dropped = Object.fromEntries(['budget', 'breaker_open', 'backlog_full', 'salt_missing', 'disabled', 'error'].map(reason => [reason, Math.max(0, ...reports.map(report => report.dropped?.[reason] ?? 0))]));
  const gaps = reports.some(report => !report.coverage?.complete); const omissions = Math.max(0, ...reports.map(report => report.coverage?.dimensionContributionsOmitted ?? 0)); const rankedOmitted = Math.max(0, ...reports.map(report => report.rankedRowsOmitted ?? 0));
  const droppedTotal = Object.values(dropped).reduce((total, count) => total + count, 0);
  const comparisonAvailable = ['visitors', 'visits', 'pages', 'actions'].some(metric => typeof current?.summary.previous?.totals?.[metric as LiveMeasure] === 'number');
  const datedWindow = current ? cairoDay(current.summary.from) !== cairoDay(current.summary.to) : false;
  const currentVisitors = current?.summary.now?.totals?.visitors;
  const displayState = status === 'disabled' ? 'disabled' : current ? typeof currentVisitors === 'number' ? 'ready' : 'unknown' : status === 'ready' ? 'loading' : status;
  return <div data-live-state={displayState} className="min-w-0 space-y-6"><header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{copy('Live')}</h2><p className="text-sm text-muted-foreground" aria-live="polite" data-slot="live-age">{age === null ? copy('Waiting for the first live snapshot.') : `${copy('Updated')} ${age.toLocaleString(lang)} ${copy('seconds ago')}`}</p></div><PageActions mobileMirrorWhenHidden actions={[{ label: 'Refresh live activity', readOnly: true, icon: <RefreshCw />, onClick: () => poller.current?.refresh() }]} /></header>
    <SegmentedControl label="Live window" value={windowChoice} onValueChange={preset.onValueChange} options={liveWindows.map((value, index) => ({ value, label: presetLabels[index] }))} />
    {status === 'disabled' ? <Card><CardContent><p role="status" className="text-sm">{copy('Live activity is switched off. Historical reports are still available.')}</p></CardContent></Card> : status === 'error' ? <RequestError message={copy('Live activity is temporarily unavailable. No empty counts have been substituted.')} retry={() => poller.current?.refresh()} /> : !current ? <LoadingState /> : <>
      <section aria-label={copy('Right now')} className="space-y-1"><h3 className="text-sm font-medium text-muted-foreground">{copy('Right now')}</h3><p className="font-display text-4xl font-semibold tabular-nums">{number(currentVisitors)} <span className="text-base font-normal text-muted-foreground">{copy(currentVisitors === 1 ? 'estimated visitor' : 'estimated visitors')}</span></p>{typeof currentVisitors !== 'number' && <p className="text-sm text-muted-foreground">{copy('Recent minutes are missing.')}</p>}<p className="text-sm text-muted-foreground">{liveTime(current.summary.from, lang, datedWindow)} — {liveTime(current.summary.to, lang, datedWindow)} · {copy('Cairo time')}</p></section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><LiveMetric metric="visitors" label="Unique visitors (estimate)" bundle={current} /><LiveMetric metric="visits" label="Visits started" bundle={current} /><LiveMetric metric="pages" label="Pages viewed" bundle={current} /><LiveMetric metric="actions" label="Actions" bundle={current} /></div>
      {!comparisonAvailable && <p className="text-sm text-muted-foreground">{copy('Yesterday is not available for comparison.')}</p>}
      {gaps && <p role="status" className="text-sm text-muted-foreground">{copy('Some minutes are unknown. Lines break at gaps; missing activity is never zero.')}</p>}
      {droppedTotal > 0 && <p data-slot="live-dropped-note" className="text-sm text-muted-foreground">{copy('Some activity was not counted.')}: <span className="tabular-nums">{number(droppedTotal)}</span></p>}
      <details className="rounded-lg bg-muted/50 p-4 text-sm"><summary className="cursor-pointer font-medium">{copy('How this is counted')}</summary><div className="mt-3 space-y-3 text-muted-foreground">
        <p>{copy('Observed accepted events only; visitors are an estimate. Visits count starts, not people still online.')}</p>
        {!comparisonAvailable && <p>{copy('Comparison unavailable; prior minutes expired or were not observed.')}</p>}
        <p>{copy('The selected window applies to every live block. Short windows refresh every 5 seconds, longer ones every minute; refresh pauses while this tab is hidden.')}</p>
        {droppedTotal > 0 && <><p>{copy('Dropped or unconfirmed events on this backend instance since boot, not a window or fleet total.')}</p><dl data-slot="live-counting-reasons" className="space-y-2">{Object.entries(dropped).filter(([, count]) => count > 0).map(([reason, count]) => <div key={reason} className="flex items-baseline justify-between gap-3"><dt>{copy(({ budget: 'Write budget exceeded', breaker_open: 'Redis cooldown', backlog_full: 'Redis write backlog full', salt_missing: 'Daily privacy salt missing', disabled: 'Collection switched off', error: 'Redis collection error' } as Record<string, string>)[reason])}</dt><dd className="tabular-nums">{number(count)}</dd></div>)}</dl></>}
        {omissions > 0 && <p>{copy('Dimension contributions omitted')}: {number(omissions)}</p>}{rankedOmitted > 0 && <p>{copy('Additional ranked records are not included in the top 50')}: {number(rankedOmitted)}</p>}
        <p>{copy('Anonymous visit numbers rotate at Cairo midnight. Duration is last activity minus first, not proof someone is still online. Only the latest 100 steps are retained.')}</p>
      </div></details>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3"><LiveBreakdown title="Website or app" rows={current.where.platforms} /><LiveBreakdown title="Language" rows={current.where.languages} /><LiveBreakdown title="Cities being browsed" rows={current.where.cities} /></div>
      <p className="text-sm text-muted-foreground">{copy('Browsed cities are not visitor locations. Visitors can appear in several groups; do not sum these estimates.')}</p>
      <LiveRanking title="Top pages" rows={current.top.pages} icon="route" scope="live-pages" /><LiveRanking title="Top places" rows={current.top.places} scope="live-places" />
      <Card><CardHeader><CardTitle>{copy('Recent journeys')}</CardTitle></CardHeader><CardContent className="space-y-4"><Journeys report={current.journeys} onChoose={setSelected} /></CardContent></Card>
      {selected && <JourneyDetail visit={selected} window={windowChoice} />}
      <Card><CardHeader><CardTitle>{copy('What they searched')}</CardTitle></CardHeader><CardContent><RecordList scope="live-searches" records={current.searches.terms ?? []} searchText={row => row.term} render={visible => <div>{visible.map(row => <div key={row.term} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><Link data-ro-allow="true" className="rounded focus-visible:outline-ring" href={`/dashboard/analytics/search-terms/${encodeURIComponent(row.term)}?period=custom&from=${cairoDay(current.summary.from)}&to=${cairoDay(current.summary.to)}`}><RecordCell icon="search" name={row.term} /></Link><p className="ms-auto text-sm tabular-nums">{number(row.searches)} {copy('settled searches')} · {number(row.noResults)} {copy('No results')} · {number(row.clicks)} {copy('result clicks')}</p></div>)}</div>} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{copy('Live funnel')}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{copy('Estimated distinct active visits reaching each ordered stage, including visits that started before this window.')}</p><RecordList scope="live-funnel" records={current.funnel.stages ?? []} searchText={row => row.name} render={visible => <div>{visible.map(row => <div key={row.name} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon="route" name={copy(liveStepLabels[row.name] ?? 'Unknown step')} /><p className="ms-auto text-sm tabular-nums">{number(row.visits)} {copy('visits')} · {copy('Rate from previous step')}: {row.rateFromPrevious === null ? '—' : (row.rateFromPrevious * 100).toLocaleString(lang, { maximumFractionDigits: 1 }) + '%'}</p></div>)}</div>} /></CardContent></Card>
    </>}
  </div>;
}
function cairoDay(at: string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at)); }
export function LiveMetric({ metric, label, bundle }: { metric: LiveMeasure; label: string; bundle: LiveBundle }) {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang(); const summary = bundle.summary; const value = summary.totals?.[metric];
  return <Card><CardHeader><CardTitle>{copy(label)}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-2xl font-semibold tabular-nums">{value === undefined || value === null ? '—' : value.toLocaleString(lang)}</p>{typeof value !== 'number' && <p className="text-sm text-muted-foreground">{copy('Some minutes were not observed.')}</p>}<LiveLine current={summary.series ?? []} previous={summary.previous?.series ?? []} metric={metric} />{typeof summary.previous?.totals?.[metric] === 'number' && <p className="text-sm text-muted-foreground">{copy('Same window yesterday')}: {summary.previous.totals[metric].toLocaleString(lang)}</p>}</CardContent></Card>;
}
function LiveLine({ current, previous, metric }: { current: LivePoint[]; previous: LivePoint[]; metric: LiveMeasure }) {
  const copy = useDashboardCopy(); const maximum = Math.max(1, ...[...current, ...previous].map(point => point.values?.[metric] ?? 0));
  const paths = (points: LivePoint[]) => lineSegments(points, metric).map(segment => segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${points.findIndex(row => row.at === point.at) / Math.max(1, points.length - 1) * 200},${40 - point.value / maximum * 36}`).join(' ') + (segment.length === 1 ? ' h0.5' : ''));
  return <svg viewBox="0 0 202 44" role="img" aria-label={copy('Observed activity line; gaps are unknown. Faint line is yesterday when available.')} className="h-12 w-full text-primary" fill="none">{paths(previous).map((value, index) => <path key={`previous-${index}`} d={value} stroke="currentColor" opacity="0.3" strokeWidth="2" />)}{paths(current).map((value, index) => <path key={index} d={value} stroke="currentColor" strokeWidth="2" />)}</svg>;
}
function LiveRanking({ title, rows = [], icon, scope }: { title: string; rows?: LiveRank[]; icon?: RecordIcon; scope: string }) {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang();
  const name = (row: LiveRank) => row.name || row.nameEn ? undefined : copy(({ web: 'Website', app: 'App', unknown: 'Unknown', ar: 'Arabic', en: 'English' } as Record<string, string>)[row.id] ?? row.id);
  return <Card><CardHeader><CardTitle>{copy(title)}</CardTitle></CardHeader><CardContent><RecordList scope={scope} records={rows} searchText={row => `${row.id} ${row.name ?? ''} ${row.nameEn ?? ''}`} render={visible => <div>{visible.map(row => <div key={row.id} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon={icon === 'location' ? 'location' : icon === 'route' ? 'route' : undefined} thumbnail={placeCover(row)} name={name(row)} nameAr={row.name} nameEn={row.nameEn} /><p className="ms-auto text-sm tabular-nums">{typeof row.visitors !== 'number' ? copy('Unknown visitors') : `${row.visitors.toLocaleString(lang)} ${copy(row.visitors === 1 ? 'estimated visitor' : 'estimated visitors')}`} · {typeof row.actions === 'number' ? row.actions.toLocaleString(lang) : '—'} {copy('Actions')} · {typeof row.count === 'number' ? row.count.toLocaleString(lang) : '—'} {copy('counted events')}</p></div>)}</div>} /></CardContent></Card>;
}
function Journeys({ report, onChoose }: { report: LiveBundle['journeys']; onChoose: (id: string) => void }) {
  const copy = useDashboardCopy(); const [extra, setExtra] = React.useState<LiveBundle['journeys'] | null>(null); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState(''); const request = React.useRef(0);
  const current = extra?.generatedAt === report.generatedAt ? extra : report;
  React.useEffect(() => () => { request.current++; }, [report]);
  const more = async () => {
    if (busy || !current.nextBefore) return; const generation = ++request.current; setBusy(true); setError('');
    try { const result = await adminApi.get<LiveBundle['journeys']>('/v1/admin/analytics/live/journeys', { window: report.window, limit: 20, before: current.nextBefore }); if (generation === request.current) setExtra({ ...result, generatedAt: report.generatedAt, visits: [...current.visits, ...result.visits.filter(row => !current.visits.some(previous => previous.visit === row.visit))] }); }
    catch { if (generation === request.current) setError(copy('Could not load more journeys.')); } finally { setBusy(false); }
  };
  return <><RecordList scope="live-journeys" records={current.visits ?? []} searchText={row => `${row.entry?.name ?? row.entry?.target ?? copy('Unknown')} ${(row.steps ?? []).map(step => step.name ?? step.target).join(' ')}`} render={visible => <div>{visible.map((journey, index) => <div key={journey.visit} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-3"><div className="min-w-0 flex-1"><RecordCell icon="route" name={`${copy('Visit')} ${(current.visits.indexOf(journey) + 1 || index + 1)}`} context={`${copy(journey.platform === 'web' ? 'Website' : journey.platform === 'app' ? 'App' : 'Unknown')} · ${journey.durationSeconds} ${copy('seconds')} · ${copy('Entry')}: ${journey.entry?.name ?? journey.entry?.target ?? copy('Unknown')}`} /><p className="mt-2 flex flex-wrap gap-1">{(journey.steps ?? []).slice(-6).map((step, stepIndex) => <Badge key={stepIndex} variant="secondary">{copy(liveStepLabels[step.kind] ?? 'Unknown step')} · {step.name ?? step.target}</Badge>)}</p>{journey.truncated && <Badge variant="secondary">{copy('Earlier steps truncated')}</Badge>}{journey.gap && <Badge variant="secondary">{copy('Some journey steps were lost')}</Badge>}</div><RowActions recordName={copy('Visit')} actions={[{ label: 'Open every retained step', icon: <Eye />, onClick: () => onChoose(journey.visit) }]} /></div>)}</div>} />{error && <RequestError message={error} />}{current.nextBefore && <Button variant="outline" data-ro-allow="true" disabled={busy} onClick={() => { void more(); }}>{copy(busy ? 'Loading…' : 'Load more journeys')}</Button>}</>;
}
function JourneyDetail({ visit, window }: { visit: string; window: LiveWindow }) {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang();
  const load = React.useCallback(() => adminApi.get<{ journey: LiveJourney }>(`/v1/admin/analytics/live/journeys/${encodeURIComponent(visit)}`, { window }), [visit, window]); const resource = useSubscriberResource(load);
  return <Card><CardHeader><CardTitle>{copy('Every retained journey step')}</CardTitle></CardHeader><CardContent className="space-y-3">{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('This journey expired or could not be read. Refresh the feed and choose a current visit.')} retry={() => { void resource.refetch(); }} /> : resource.data && <><p className="text-sm">{copy('Started at')}: {liveTime(resource.data.journey.startedAt, lang)} · {copy('Entry')}: {resource.data.journey.entry.name ?? resource.data.journey.entry.target}</p>{resource.data.journey.truncated && <p className="text-sm">{copy('Earlier steps truncated')}</p>}{resource.data.journey.gap && <p className="text-sm">{copy('Some journey steps were lost')}</p>}<RecordList scope="journey-steps" records={resource.data.journey.steps ?? []} searchText={row => `${row.kind} ${row.name ?? row.target}`} render={visible => <div>{visible.map((step, index) => <div key={`${step.at}-${index}`} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon="route" name={copy(liveStepLabels[step.kind] ?? 'Unknown step')} context={step.name ?? step.target} /><time className="ms-auto text-sm tabular-nums" dateTime={step.at}>{new Intl.DateTimeFormat(lang, { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(step.at))}</time></div>)}</div>} /></>}</CardContent></Card>;
}
