'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { applyCorrection, loadInbox, loadOwnerRequests, rejectCorrection, replyOwnerRequest, type AppReportRow, type CorrectionRow, type NoHoursRow, type OwnerRequestRow } from '@/lib/api/inbox';

const TABS = ['corrections', 'reports', 'no-hours', 'owner-requests', 'photos', 'lister-documents', 'trip-reports'] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  corrections: 'Corrections', reports: 'Reports', 'no-hours': 'Places without hours', 'owner-requests': 'Owner requests',
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
      <UrlTabsContent value="reports" lazy><Reports /></UrlTabsContent>
      <UrlTabsContent value="no-hours" lazy><PlacesWithoutHours /></UrlTabsContent>
      <UrlTabsContent value="owner-requests" lazy><OwnerRequests canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="photos" lazy><GoTo title="Photo submissions" text="Owners' photos are reviewed on each subscriber's Account tab, beside the owner's photo permissions." href="/dashboard/subscribers" action="Open subscribers" /></UrlTabsContent>
      <UrlTabsContent value="lister-documents" lazy><GoTo title="Lister documents" text="ID and license papers sent by trip listers wait in the Marketplace." href="/dashboard/tourism?tab=listers&listers-kyc=pending" action="Review documents" /></UrlTabsContent>
      <UrlTabsContent value="trip-reports" lazy><GoTo title="Trip reports" text="Customer reports about trips are closed in the Marketplace." href="/dashboard/tourism?tab=reports" action="Open trip reports" /></UrlTabsContent>
    </UrlTabs>
  </div>;
}

/** A list card: loading, a missing route (backend not deployed yet), an error with Retry, empty, or rows. */
function InboxList<T>({ title, empty, resource, render }: { title: string; empty: string; resource: ReturnType<typeof useSubscriberResource<T[]>>; render: (rows: T[]) => React.ReactNode }) {
  const copy = useDashboardCopy();
  const rows = resource.data ?? [];
  const status = resource.error instanceof AdminApiError ? resource.error.status : 0;
  return <Card><CardHeader><CardTitle>{copy(title)}{resource.data && rows.length > 0 && <span className="ms-2 font-normal text-muted-foreground tabular-nums">{rows.length}</span>}</CardTitle></CardHeader><CardContent>
    {resource.loading ? <LoadingState />
      : status === 404 ? <p className="text-sm text-muted-foreground">{copy('This list is not on the server yet. It fills in here as soon as the backend sends it.')}</p>
      : status === 503 ? <p className="text-sm text-muted-foreground">{copy('This list is switched off on this server.')}</p>
      : resource.error ? <RequestError message={copy('Could not load this list.')} retry={() => { void resource.refetch(); }} />
      : !rows.length ? <p className="text-sm text-muted-foreground">{copy(empty)}</p>
      : <div>{render(rows)}</div>}
  </CardContent></Card>;
}

/** Age since it arrived; past the 48 h promise it turns red and says so (never colour alone). */
function Age({ createdAt }: { createdAt: string }) {
  const { text, lang } = useSubscriberText();
  const [now] = React.useState(() => Date.now());
  const hours = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 3_600_000));
  const late = hours >= PROMISE_HOURS;
  const age = hours < 1 ? text('Under 1 hour ago', 'من أقل من ساعة') : hours < 48 ? text(`${hours} h ago`, `من ${hours} ساعة`) : text(`${Math.floor(hours / 24)} days ago`, `من ${Math.floor(hours / 24)} يوم`);
  const full = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(new Date(createdAt));
  return <span title={full} className={`inline-flex items-center gap-1 ${late ? 'font-medium text-destructive' : 'text-muted-foreground'}`}><Clock className="size-3.5" aria-hidden="true" />{age}{late && <span>{text('Past the 48 h promise', 'تعدّى وعد الـ 48 ساعة')}</span>}</span>;
}

const shown = (value: unknown) => value === null || value === undefined || value === '' ? '—' : typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);

function Photo({ url }: { url?: string | null }) {
  const copy = useDashboardCopy();
  return url ? <a href={url} target="_blank" rel="noreferrer" aria-label={copy('Open the photo')} className="shrink-0"><RecordThumbnail src={url} size={48} /></a> : null;
}

const KIND_LABELS: Record<CorrectionRow['kind'], string> = { hours: 'Hours', location: 'Location', phone: 'Phone', closed: 'Closed for good', photos: 'Photos', prices: 'Prices', name: 'Name', other: 'Something else' };
const SOURCE_LABELS: Record<CorrectionRow['source'], string> = { visit: 'Was there', staff: 'Works there', online: 'Saw it online' };

function Corrections({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const load = React.useCallback(() => loadInbox<CorrectionRow>('corrections'), []);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const decide = async (run: () => Promise<unknown>, done: string) => {
    try { await run(); }
    catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) { void resource.refetch(); throw new Error(copy('Someone already decided this correction.')); }
      throw caught;
    }
    toast.success(copy(done));
    await resource.refetch();
  };
  return <>
    <InboxList title="Corrections" empty="No corrections are waiting." resource={resource} render={(rows) => rows.map((row) => {
      const place = pick(row.placeName ?? '', row.placeNameEn ?? null) || copy('Place');
      return <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setAction({ title: copy('Apply this correction?'), description: copy('The suggested value replaces the place’s value and is live on the website at once.'), submit: () => decide(() => applyCorrection(row.id), 'Applied. Live on the website now.') })}><Check aria-hidden="true" />{copy('Apply')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setAction({ title: copy('Reject this correction?'), description: copy('The person who sent it sees your reply.'), fields: [{ name: 'reply', label: copy('Reply (one line)'), required: true }], submit: (values) => decide(() => rejectCorrection(row.id, String(values.reply).trim()), 'Rejected. Your reply was sent.') })}><X aria-hidden="true" />{copy('Reject')}</Button>
      </div>}>
        <div className="flex min-w-0 gap-3"><Photo url={row.photoUrl} /><div className="min-w-0 space-y-1.5">
          <p className="text-sm"><Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/places/${row.placeId}`}>{place}</Link> <span className="text-muted-foreground">{copy(KIND_LABELS[row.kind] ?? 'Something else')}</span></p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm"><dt className="text-muted-foreground">{copy('Now')}</dt><dd dir="auto" className="break-words">{shown(row.current)}</dd><dt className="text-muted-foreground">{copy('Suggested')}</dt><dd dir="auto" className="break-words font-medium">{shown(row.answer)}</dd></dl>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="text-muted-foreground">{copy(SOURCE_LABELS[row.source] ?? 'Saw it online')}</span><Age createdAt={row.createdAt} /></p>
        </div></div>
      </RecordRow></div>;
    })} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

const REPORT_LABELS: Record<AppReportRow['kind'], string> = { bug: 'Something broke', wrong: 'Wrong information', slow: 'Slow', account: 'Saved places', idea: 'An idea', other: 'Something else' };

function Reports() {
  const copy = useDashboardCopy();
  const load = React.useCallback(() => loadInbox<AppReportRow>('reports'), []);
  const resource = useSubscriberResource(load);
  return <InboxList title="Reports" empty="No reports are waiting." resource={resource} render={(rows) => rows.map((row) => <div key={row.id} className="flex min-w-0 gap-3 border-b py-3 last:border-b-0"><Photo url={row.photoUrl} /><div className="min-w-0 space-y-1">
    <p className="text-sm font-medium">{copy(REPORT_LABELS[row.kind] ?? 'Something else')}</p>
    <p dir="auto" className="whitespace-pre-line break-words text-sm">{row.text}</p>
    <p className="text-sm"><Age createdAt={row.createdAt} /></p>
  </div></div>)} />;
}

function PlacesWithoutHours() {
  const copy = useDashboardCopy();
  const load = React.useCallback(() => loadInbox<NoHoursRow>('no_hours'), []);
  const resource = useSubscriberResource(load);
  return <InboxList title="Places without hours" empty="Every live place has its opening hours." resource={resource} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-2 last:border-b-0"><RecordRow align="center" actions={<Button size="sm" variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={`/dashboard/places/${row.id}?tab=hours`} />}>{copy('Add hours')}</Button>}><RecordCell nameAr={row.name} nameEn={row.nameEn ?? null} thumbnail={placeCover(row)} /></RecordRow></div>)} />;
}

const REQUEST_LABELS: Record<OwnerRequestRow['kind'], string> = { category: 'Change the category', location: 'Move the pin', city: 'Change the city', other: 'Something else' };

function OwnerRequests({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const resource = useSubscriberResource(loadOwnerRequests);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const reply = (row: OwnerRequestRow, state: 'done' | 'declined') => setAction({
    title: copy(state === 'done' ? 'Mark this request done?' : 'Decline this request?'),
    description: copy('The owner sees your reply in the portal.'),
    destructive: state === 'declined',
    fields: [{ name: 'reply', label: copy('Reply (one line)'), required: true }],
    submit: async (values) => { await replyOwnerRequest(row.id, state, String(values.reply).trim()); toast.success(copy('Reply sent to the owner.')); await resource.refetch(); },
  });
  return <>
    <InboxList title="Owner requests" empty="No owner requests are waiting." resource={resource} render={(rows) => rows.map((row) => <div key={row.id} className="border-b py-3 last:border-b-0"><RecordRow actions={canWrite && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => reply(row, 'done')}><Check aria-hidden="true" />{copy('Done')}</Button><Button size="sm" variant="ghost" onClick={() => reply(row, 'declined')}><X aria-hidden="true" />{copy('Decline')}</Button></div>}>
      <div className="min-w-0 space-y-1"><p className="text-sm"><span className="font-medium">{copy(REQUEST_LABELS[row.kind] ?? 'Something else')}</span> <Link className="text-muted-foreground underline underline-offset-4" href={`/dashboard/places/${row.placeId}`}>{copy('Open the place')}</Link></p><p dir="auto" className="whitespace-pre-line break-words text-sm">{row.message}</p><p className="text-sm"><Age createdAt={row.createdAt} /></p></div>
    </RecordRow></div>)} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}

function GoTo({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  const copy = useDashboardCopy();
  return <Card><CardHeader><CardTitle>{copy(title)}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{copy(text)}</p><Button variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={href} />}>{copy(action)}</Button></CardContent></Card>;
}
