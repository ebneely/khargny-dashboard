'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { Check, Clock, Inbox, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/dash-router';
import { QUEUES, useShellInboxCounts } from './dashboard-shell';
import { RecordRow } from './record-list';
import { RecordCell, RecordThumbnail } from './record-cell';
import { useDashboardCopy } from './dashboard-text';
import { ActionDialog, LoadingState, RequestError, useSubscriberText, type ActionSpec } from './subscriber-ui';
import { AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { placeCover } from '@/lib/place-list';
import { applyCorrection, closeReport, loadInbox, rejectCorrection, replyOwnerRequest, type AppReportRow, type CorrectionRow, type InboxPage, type NoHoursRow } from '@/lib/api/inbox';
import { loadSubmissions, type SubmissionRow } from '@/lib/api/submissions';
import { SubmissionValue } from './submission-value';
import { SubmissionMedia } from './submission-media';
import { deviceText } from './submissions-page';
import { PendingPhotos } from './subscriber-photos';
import { RenewalsPage } from './renewals-page';
import { AR_LOCALE } from '@/lib/locale';

const PROMISE_HOURS = 48;

export function InboxPage({ canWrite }: { canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><InboxContent canWrite={canWrite} /></React.Suspense>;
}

/**
 * Queues with their counts on the side, the chosen queue beside them (DIRECTION section 1).
 * J/K move between items, A applies or approves, R rejects; ?run=1 walks every queue in turn.
 */
function InboxContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const params = useSearchParams();
  const router = useRouter();
  const counts = useShellInboxCounts();
  const waiting = QUEUES.filter((entry) => entry.id !== 'no-hours' && (counts?.[entry.count] ?? 0) > 0);
  const asked = params.get('queue') ?? params.get('tab');
  const run = params.get('run') === '1';
  const queue = QUEUES.find((entry) => entry.id === asked)?.id ?? waiting[0]?.id ?? 'corrections';
  const open = (id: string, keepRun = run) => router.replace(`/dashboard/inbox?queue=${id}${keepRun ? '&run=1' : ''}`);
  const order = (id: string) => QUEUES.findIndex((entry) => entry.id === id);
  const nextQueue = waiting.find((entry) => order(entry.id) > order(queue)) ?? waiting.find((entry) => entry.id !== queue);
  const content = React.useRef<HTMLDivElement>(null);
  useInboxKeys(content);
  const item = (entry: (typeof QUEUES)[number]) => <button key={entry.id} type="button" data-ro-allow="true" aria-current={entry.id === queue ? 'page' : undefined} onClick={() => open(entry.id)}
    className={`flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-start text-sm lg:w-full ${entry.id === queue ? 'bg-brand-50 font-medium text-primary' : 'text-foreground hover:bg-muted'}`}>
    <span className="min-w-0 flex-1 truncate">{copy(entry.label)}</span><span className="tabular-nums text-xs font-semibold">{counts?.[entry.count] || ''}</span></button>;
  const empty = counts !== null && (counts[QUEUES.find((entry) => entry.id === queue)!.count] ?? 0) === 0;
  return <div className="min-w-0 space-y-5">
    <header><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Inbox className="size-5 text-primary" aria-hidden="true" />{copy('Inbox')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('Everything waiting on a person, oldest first. We answer within 48 hours.')} <span className="hidden lg:inline">{copy('Keys: J and K move, A applies, R rejects.')}</span></p></header>
    {run && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-2.5 text-sm" role="status"><span className="font-medium text-primary">{copy('Working through everything that waits, queue by queue.')}</span><span className="flex-1" />{nextQueue && <Button size="sm" variant="outline" data-ro-allow="true" onClick={() => open(nextQueue.id)}>{copy('Next queue')}: {copy(nextQueue.label)}</Button>}<Button size="sm" variant="ghost" data-ro-allow="true" onClick={() => open(queue, false)}>{copy('Stop')}</Button></div>}
    <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
      <nav aria-label={copy('Inbox lists')} className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:block lg:space-y-0.5 lg:self-start lg:rounded-2xl lg:bg-card lg:p-2 lg:shadow-sm">
        <p className="hidden px-2.5 pt-1 pb-1.5 text-xs text-muted-foreground lg:block">{copy('Waiting on you, 48 hours each')}</p>
        {QUEUES.filter((entry) => entry.id !== 'no-hours').map(item)}
        <p className="hidden px-2.5 pt-3 pb-1.5 text-xs text-muted-foreground lg:block">{copy('When you have time')}</p>
        {QUEUES.filter((entry) => entry.id === 'no-hours').map(item)}
      </nav>
      <div ref={content} className="min-w-0 space-y-4">
        {queue === 'corrections' && <Corrections canWrite={canWrite} />}
        {queue === 'reports' && <Reports canWrite={canWrite} />}
        {queue === 'renewals' && <RenewalsPage canWrite={canWrite} />}
        {queue === 'no-hours' && <PlacesWithoutHours />}
        {queue === 'owner-requests' && <OwnerRequests canWrite={canWrite} />}
        {queue === 'photos' && <Card><CardHeader><CardTitle>{copy('Owner photos')}</CardTitle></CardHeader><CardContent><PendingPhotos canWrite={canWrite} /></CardContent></Card>}
        {queue === 'lister-documents' && <GoTo title="Host papers" text="ID and license papers sent by hosts wait in the Marketplace." href="/dashboard/marketplace?tab=listers&listers-kyc=pending" action="Review the papers" />}
        {queue === 'trip-reports' && <GoTo title="Trip reports" text="Customer reports about trips are closed in the Marketplace." href="/dashboard/marketplace?tab=reports" action="Open trip reports" />}
        {empty && nextQueue && <Button variant="outline" size="sm" data-ro-allow="true" onClick={() => open(nextQueue.id)}>{copy('Next')}: {copy(nextQueue.label)} ({counts?.[nextQueue.count]})</Button>}
      </div>
    </div>
  </div>;
}

/** J/K select the next or previous item in the open queue; A and R press its apply and reject buttons. */
function useInboxKeys(content: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, select, [contenteditable=true]') || document.querySelector('[role="dialog"]')) return;
      const rows = Array.from(content.current?.querySelectorAll<HTMLElement>('[data-inbox-row]') ?? []);
      if (!rows.length) return;
      const current = rows.findIndex((row) => row.dataset.selected === 'true');
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        event.preventDefault();
        const at = Math.max(0, Math.min(rows.length - 1, current < 0 ? 0 : current + (key === 'j' ? 1 : -1)));
        rows.forEach((row, index) => { row.dataset.selected = String(index === at); });
        rows[at].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if ((key === 'a' || key === 'r') && current >= 0) {
        const button = rows[current].querySelector<HTMLButtonElement>(`[data-key="${key}"]`);
        if (button) { event.preventDefault(); button.click(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [content]);
}

/** A list card: loading, a missing route (backend not deployed yet), an error with Retry, empty, or rows; the count is the server's. */
function InboxList<T>({ title, empty, resource, render, more }: { title: string; empty: string; resource: ReturnType<typeof useSubscriberResource<InboxPage<T>>>; render: (rows: T[]) => React.ReactNode; more?: () => void }) {
  const copy = useDashboardCopy();
  const rows = resource.data?.rows ?? [];
  const total = resource.data?.total ?? 0;
  const status = resource.error instanceof AdminApiError ? resource.error.status : 0;
  return <Card><CardHeader><CardTitle>{copy(title)}{total > 0 && <span className="ms-2 font-normal text-muted-foreground tabular-nums">{total}</span>}</CardTitle></CardHeader><CardContent>
    {resource.loading ? <LoadingState />
      : status === 404 ? <p className="text-sm text-muted-foreground">{copy('This list is not on the server yet. It fills in here as soon as the backend sends it.')}</p>
      : status === 503 ? <p className="text-sm text-muted-foreground">{copy('This list is switched off on this server.')}</p>
      : resource.error ? <RequestError message={copy('Could not load this list.')} retry={() => { void resource.refetch(); }} />
      : !rows.length ? <p className="text-sm text-muted-foreground">{copy(empty)}</p>
      : <div>{render(rows)}{more && rows.length < total && <Button className="mt-3" variant="outline" size="sm" data-ro-allow="true" onClick={more}>{copy('Show the next 100')}</Button>}</div>}
  </CardContent></Card>;
}

/** Age since it arrived; past the 48 h promise it turns red and says so (never colour alone). */
function Age({ createdAt }: { createdAt: string }) {
  const { text, lang } = useSubscriberText();
  const [now, setNow] = React.useState(() => Date.now());
  // The 48 h promise turns red while the page stays open.
  React.useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const hours = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 3_600_000));
  const late = hours >= PROMISE_HOURS;
  const age = hours < 1 ? text('Under 1 hour ago', 'من أقل من ساعة') : hours < 48 ? text(`${hours} h ago`, `من ${hours} ساعة`) : text(`${Math.floor(hours / 24)} days ago`, `من ${Math.floor(hours / 24)} يوم`);
  const full = new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(new Date(createdAt));
  return <span title={full} className={`inline-flex items-center gap-1 ${late ? 'font-medium text-destructive' : 'text-muted-foreground'}`}><Clock className="size-3.5" aria-hidden="true" />{age}{late && <span>{text('Past the 48 h promise', 'تعدّى وعد الـ 48 ساعة')}</span>}</span>;
}

function Photo({ url }: { url?: string | null }) {
  const copy = useDashboardCopy();
  return url ? <a href={url} target="_blank" rel="noreferrer" aria-label={copy('Open the photo')} className="shrink-0"><RecordThumbnail src={url} size={48} /></a> : null;
}

export const KIND_LABELS: Record<CorrectionRow['kind'], string> = { hours: 'Hours', location: 'Location', phone: 'Phone', closed: 'Closed for good', photos: 'Photos', prices: 'Prices', name: 'Name', other: 'Something else' };
const SOURCE_LABELS: Record<CorrectionRow['source'], string> = { visit: 'Was there', staff: 'Works there', online: 'Saw it online' };

/** The Apply and Reject dialogs of one customer correction. The Inbox and a place's Quality tab open the same ones, on the same rows. */
export function correctionDialogs(copy: (value: string) => string, id: string, refetch: () => Promise<unknown>): { apply: ActionSpec; reject: ActionSpec } {
  const decide = async (run: () => Promise<unknown>, done: (result: unknown) => string) => {
    let result: unknown;
    try { result = await run(); }
    catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) { void refetch(); throw new Error(copy('Someone already decided this correction.')); }
      throw caught;
    }
    toast.success(copy(done(result)));
    await refetch();
  };
  return {
    apply: { title: copy('Apply this correction?'), description: copy('A clear phone, name, pin or full week of hours replaces the place’s value at once. Anything else is marked applied, and you make the change on the place page.'), submit: () => decide(() => applyCorrection(id), (result) => (result as { written?: boolean } | null)?.written ? 'Applied. Live on the website now.' : 'Marked as applied. Nothing was written to the place: make the change on the place page.') },
    reject: { title: copy('Reject this correction?'), description: copy('Your reply is kept with the correction. The sender cannot read replies yet.'), fields: [{ name: 'reply', label: copy('Reply (one line)'), required: true }], submit: (values) => decide(() => rejectCorrection(id, String(values.reply).trim()), () => 'Rejected. Your reply is kept with it.') },
  };
}

function Corrections({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const [pages, setPages] = React.useState(1);
  const load = React.useCallback(() => loadInbox<CorrectionRow>('corrections', pages), [pages]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const dialogs = (id: string) => correctionDialogs(copy, id, resource.refetch);
  return <>
    <InboxList title="Corrections" empty="No corrections are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row, index) => {
      const place = pick(row.placeName ?? '', row.placeNameEn ?? null) || copy('Place');
      // Rows arrive grouped per place, the place with the most open corrections first.
      const firstOfPlace = index === 0 || rows[index - 1].placeId !== row.placeId;
      return <div key={row.id}>{firstOfPlace && <p className="flex items-center gap-2 pt-4 pb-1 text-sm font-semibold"><Link className="underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{place}</Link>{(row.placeOpen ?? 1) > 1 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary tabular-nums">{row.placeOpen} {copy('open corrections')}</span>}</p>}<div data-inbox-row className="-mx-2 rounded-lg border-b px-2 py-3 last:border-b-0 data-[selected=true]:bg-brand-50"><RecordRow actions={canWrite && <div className="flex gap-2">
        <Button size="sm" variant="outline" data-key="a" onClick={() => setAction(dialogs(row.id).apply)}><Check aria-hidden="true" />{copy('Apply')}</Button>
        <Button size="sm" variant="ghost" data-key="r" onClick={() => setAction(dialogs(row.id).reject)}><X aria-hidden="true" />{copy('Reject')}</Button>
      </div>}>
        <div className="flex min-w-0 gap-3"><div className="min-w-0 space-y-1.5">
          <p className="text-sm"><Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{place}</Link> <span className="text-muted-foreground">{copy(KIND_LABELS[row.kind] ?? 'Something else')}</span></p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm"><dt className="text-muted-foreground">{copy('Now')}</dt><dd className="min-w-0 break-words"><SubmissionValue value={row.current} /></dd><dt className="text-muted-foreground">{copy('Suggested')}</dt><dd className="min-w-0 break-words font-medium"><SubmissionValue value={row.answer} /></dd></dl>
          <SubmissionMedia media={row.media ?? []} photoUrl={row.photoUrl} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="text-muted-foreground">{copy(SOURCE_LABELS[row.source] ?? 'Saw it online')}</span>{row.reporter && <span className="text-muted-foreground tabular-nums">{copy('Sender')}: {row.reporter.total} {copy('sent')}, {row.reporter.applied} {copy('applied')}, {row.reporter.rejected} {copy('rejected')}</span>}<Age createdAt={row.createdAt} /></p>
        </div></div>
      </RecordRow></div></div>;
    })} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

const REPORT_LABELS: Record<AppReportRow['kind'], string> = { bug: 'Something broke', wrong: 'Wrong information', slow: 'Slow', account: 'Saved places', idea: 'An idea', other: 'Something else' };

function Reports({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const [pages, setPages] = React.useState(1);
  const load = React.useCallback(() => loadInbox<AppReportRow>('reports', pages), [pages]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const close = (row: AppReportRow) => setAction({
    title: copy('Close this report?'),
    description: copy('A reply is optional and kept with the report. The sender cannot read replies yet.'),
    fields: [{ name: 'reply', label: copy('Reply (optional)') }],
    submit: async (values) => {
      try { await closeReport(row.id, String(values.reply ?? '').trim()); }
      catch (caught) { if (caught instanceof AdminApiError && caught.status === 409) { void resource.refetch(); throw new Error(copy('Someone already closed this report.')); } throw caught; }
      toast.success(copy('Closed.'));
      await resource.refetch();
    },
  });
  return <>
    <InboxList title="Reports" empty="No reports are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <Button size="sm" variant="outline" data-key="a" onClick={() => close(row)}><Check aria-hidden="true" />{copy('Close')}</Button>}><div className="flex min-w-0 gap-3"><div className="min-w-0 space-y-1">
      <p className="text-sm font-medium">{copy(REPORT_LABELS[row.kind] ?? 'Something else')}</p>
      <p dir="auto" className="whitespace-pre-line break-words text-sm">{row.text}</p>
      <SubmissionMedia media={row.media ?? []} photoUrl={row.photoUrl} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><Age createdAt={row.createdAt} />{deviceText(row.device) && <span className="text-muted-foreground">{copy('Sent from')} <span dir="ltr">{deviceText(row.device)}</span></span>}</p>
    </div></div></RecordRow></div>)} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

function PlacesWithoutHours() {
  const copy = useDashboardCopy();
  const [pages, setPages] = React.useState(1);
  const load = React.useCallback(() => loadInbox<NoHoursRow>('no_hours', pages), [pages]);
  const resource = useSubscriberResource(load);
  return <InboxList title="Places without hours" empty="Every live place has its opening hours." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-2 last:border-b-0"><RecordRow align="center" actions={<Button size="sm" variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={`/dashboard/places/${row.id}?tab=hours`} />}>{copy('Add hours')}</Button>}><RecordCell nameAr={row.name} nameEn={row.nameEn ?? null} thumbnail={placeCover(row)} /></RecordRow></div>)} />;
}

const REQUEST_LABELS: Record<'category' | 'location' | 'city' | 'other', string> = { category: 'Change the category', location: 'Move the pin', city: 'Change the city', other: 'Something else' };

function OwnerRequests({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const [pages, setPages] = React.useState(1);
  const load = React.useCallback(() => loadSubmissions({ type: 'owner_request', status: 'open', sort: 'oldest' }, pages, 100), [pages]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const reply = (row: SubmissionRow, state: 'done' | 'declined') => setAction({
    title: copy(state === 'done' ? 'Mark this request done?' : 'Decline this request?'),
    description: copy('The owner sees your reply in the portal.'),
    destructive: state === 'declined',
    fields: [{ name: 'reply', label: copy('Reply (one line)'), required: true }],
    submit: async (values) => { await replyOwnerRequest(row.id, state, String(values.reply).trim()); toast.success(copy('Reply sent to the owner.')); await resource.refetch(); },
  });
  return <>
    <InboxList title="Owner requests" empty="No owner requests are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <div className="flex gap-2"><Button size="sm" variant="outline" data-key="a" onClick={() => reply(row, 'done')}><Check aria-hidden="true" />{copy('Done')}</Button><Button size="sm" variant="ghost" data-key="r" onClick={() => reply(row, 'declined')}><X aria-hidden="true" />{copy('Decline')}</Button></div>}>
      <div className="min-w-0 space-y-1"><p className="text-sm"><Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{pick(row.placeName ?? '', row.placeNameEn) || copy('Open the place')}</Link> <span className="text-muted-foreground">{copy(REQUEST_LABELS[row.kind as keyof typeof REQUEST_LABELS] ?? 'Something else')}</span></p><p dir="auto" className="whitespace-pre-line break-words text-sm">{row.detail.message}</p><p className="text-sm"><Age createdAt={row.createdAt} /></p></div>
    </RecordRow></div>)} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

function GoTo({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  const copy = useDashboardCopy();
  return <Card><CardHeader><CardTitle>{copy(title)}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{copy(text)}</p><Button variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={href} />}>{copy(action)}</Button></CardContent></Card>;
}
