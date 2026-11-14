'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { Check, Clock, Inbox, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
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

const TABS = ['corrections', 'reports', 'renewals', 'no-hours', 'owner-requests', 'photos', 'lister-documents', 'trip-reports'] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  corrections: 'Corrections', reports: 'Reports', renewals: 'Renewal receipts', 'no-hours': 'Places without hours', 'owner-requests': 'Owner requests',
  photos: 'Photo submissions', 'lister-documents': 'Lister documents', 'trip-reports': 'Trip reports',
};
const PROMISE_HOURS = 48;

export function InboxPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  return <div className="min-w-0 space-y-6">
    <header><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Inbox className="size-5 text-primary" aria-hidden="true" />{copy('Inbox')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('Everything waiting on a person, oldest first. We answer within 48 hours.')}</p></header>
    <UrlTabs values={TABS}>
      <TabsList aria-label={copy('Inbox lists')}>{TABS.map((tab) => <TabsTrigger key={tab} value={tab}>{copy(TAB_LABELS[tab])}</TabsTrigger>)}</TabsList>
      <UrlTabsContent value="corrections" lazy><Corrections canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="reports" lazy><Reports canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="renewals" lazy><RenewalsPage canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="no-hours" lazy><PlacesWithoutHours /></UrlTabsContent>
      <UrlTabsContent value="owner-requests" lazy><OwnerRequests canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="photos" lazy><Card><CardHeader><CardTitle>{copy('Photo submissions')}</CardTitle></CardHeader><CardContent><PendingPhotos canWrite={canWrite} /></CardContent></Card></UrlTabsContent>
      <UrlTabsContent value="lister-documents" lazy><GoTo title="Lister documents" text="ID and license papers sent by trip listers wait in the Marketplace." href="/dashboard/marketplace?tab=listers&listers-kyc=pending" action="Review documents" /></UrlTabsContent>
      <UrlTabsContent value="trip-reports" lazy><GoTo title="Trip reports" text="Customer reports about trips are closed in the Marketplace." href="/dashboard/marketplace?tab=reports" action="Open trip reports" /></UrlTabsContent>
    </UrlTabs>
  </div>;
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

const KIND_LABELS: Record<CorrectionRow['kind'], string> = { hours: 'Hours', location: 'Location', phone: 'Phone', closed: 'Closed for good', photos: 'Photos', prices: 'Prices', name: 'Name', other: 'Something else' };
const SOURCE_LABELS: Record<CorrectionRow['source'], string> = { visit: 'Was there', staff: 'Works there', online: 'Saw it online' };

function Corrections({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const [pages, setPages] = React.useState(1);
  const load = React.useCallback(() => loadInbox<CorrectionRow>('corrections', pages), [pages]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const decide = async (run: () => Promise<unknown>, done: (result: unknown) => string) => {
    let result: unknown;
    try { result = await run(); }
    catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) { void resource.refetch(); throw new Error(copy('Someone already decided this correction.')); }
      throw caught;
    }
    toast.success(copy(done(result)));
    await resource.refetch();
  };
  return <>
    <InboxList title="Corrections" empty="No corrections are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row, index) => {
      const place = pick(row.placeName ?? '', row.placeNameEn ?? null) || copy('Place');
      // Rows arrive grouped per place, the place with the most open corrections first.
      const firstOfPlace = index === 0 || rows[index - 1].placeId !== row.placeId;
      return <div key={row.id}>{firstOfPlace && <p className="flex items-center gap-2 pt-4 pb-1 text-sm font-semibold"><Link className="underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{place}</Link>{(row.placeOpen ?? 1) > 1 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary tabular-nums">{row.placeOpen} {copy('open corrections')}</span>}</p>}<div className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setAction({ title: copy('Apply this correction?'), description: copy('A clear phone, name, pin or full week of hours replaces the place’s value at once. Anything else is marked applied, and you make the change on the place page.'), submit: () => decide(() => applyCorrection(row.id), (result) => (result as { written?: boolean } | null)?.written ? 'Applied. Live on the website now.' : 'Marked as applied. Nothing was written to the place: make the change on the place page.') })}><Check aria-hidden="true" />{copy('Apply')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setAction({ title: copy('Reject this correction?'), description: copy('Your reply is kept with the correction. The sender cannot read replies yet.'), fields: [{ name: 'reply', label: copy('Reply (one line)'), required: true }], submit: (values) => decide(() => rejectCorrection(row.id, String(values.reply).trim()), () => 'Rejected. Your reply is kept with it.') })}><X aria-hidden="true" />{copy('Reject')}</Button>
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
    <InboxList title="Reports" empty="No reports are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <Button size="sm" variant="outline" onClick={() => close(row)}><Check aria-hidden="true" />{copy('Close')}</Button>}><div className="flex min-w-0 gap-3"><div className="min-w-0 space-y-1">
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
    <InboxList title="Owner requests" empty="No owner requests are waiting." resource={resource} more={() => setPages(pages + 1)} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => reply(row, 'done')}><Check aria-hidden="true" />{copy('Done')}</Button><Button size="sm" variant="ghost" onClick={() => reply(row, 'declined')}><X aria-hidden="true" />{copy('Decline')}</Button></div>}>
      <div className="min-w-0 space-y-1"><p className="text-sm"><Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{pick(row.placeName ?? '', row.placeNameEn) || copy('Open the place')}</Link> <span className="text-muted-foreground">{copy(REQUEST_LABELS[row.kind as keyof typeof REQUEST_LABELS] ?? 'Something else')}</span></p><p dir="auto" className="whitespace-pre-line break-words text-sm">{row.detail.message}</p><p className="text-sm"><Age createdAt={row.createdAt} /></p></div>
    </RecordRow></div>)} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

function GoTo({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  const copy = useDashboardCopy();
  return <Card><CardHeader><CardTitle>{copy(title)}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{copy(text)}</p><Button variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={href} />}>{copy(action)}</Button></CardContent></Card>;
}
