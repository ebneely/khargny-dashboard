'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { Check, Inbox as InboxIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminApiError } from '@/lib/api/admin-client';
import { applyCorrection, closeReport, rejectCorrection, replyOwnerRequest } from '@/lib/api/inbox';
import { loadSubmissions, reviewPhoto, type SubmissionFilters, type SubmissionRow, type SubmissionType } from '@/lib/api/submissions';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadAllCities } from '@/lib/api/hooks/use-admin-cities';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { GovIcon } from '@/components/gov-icon';
import { useDashboardCopy } from './dashboard-text';
import { DateField } from './date-field';
import { FilterBar, FilterSelect } from './filter-bar';
import { useListAddress } from './record-list';
import { SubmissionMedia } from './submission-media';
import { SubmissionValue } from './submission-value';
import { PrivatePhoto } from './subscriber-photos';
import { ActionDialog, LoadingState, RequestError, StatusBadge, useSubscriberText, type ActionSpec } from './subscriber-ui';

export const TYPE_LABELS: Record<SubmissionType, string> = { correction: 'Correction', report: 'Report', owner_request: 'Owner request', photo: 'Owner photo' };
export const KIND_LABELS: Record<string, string> = {
  hours: 'Hours', location: 'Location', phone: 'Phone', closed: 'Closed for good', photos: 'Photos', prices: 'Prices', name: 'Name',
  bug: 'Something broke', wrong: 'Wrong information', slow: 'Slow', account: 'Saved places', idea: 'An idea',
  category: 'Change the category', city: 'Change the city', photo: 'New photo', other: 'Something else',
};
const SOURCE_LABELS: Record<string, string> = { visit: 'Was there', staff: 'Works there', online: 'Saw it online' };
const STATUS_LABELS: Record<string, string> = { open: 'Waiting', pending: 'Waiting', applied: 'Applied', rejected: 'Rejected', closed: 'Closed', done: 'Done', declined: 'Declined', approved: 'Approved' };
const STATUS_TONE: Record<string, string> = { open: 'pending', pending: 'pending', applied: 'active', approved: 'active', done: 'active', closed: 'inactive', rejected: 'inactive', declined: 'inactive' };

/** Device and app version a report was sent from, in one readable line. */
export function deviceText(device: Record<string, unknown> | null | undefined) {
  if (!device) return '';
  const pick = (...keys: string[]) => keys.map((key) => device[key]).find((value) => typeof value === 'string' || typeof value === 'number');
  const app = pick('appVersion', 'app', 'version', 'build');
  const os = [pick('os', 'platform'), pick('osVersion')].filter(Boolean).join(' ');
  const model = pick('model', 'device', 'brand');
  return [app && `v${String(app).replace(/^v/, '')}`, os, model].filter(Boolean).join(', ');
}

/** Places > Submissions: everything customers and owners sent, with its proof, newest first. */
export function SubmissionsPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  return <div className="min-w-0 space-y-6">
    <header><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><InboxIcon className="size-5 text-primary" aria-hidden="true" />{copy('Submissions')}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy('Everything customers and owners sent about places: corrections, reports, owner requests and owner photos, with the screenshots and videos they attached.')}</p></header>
    <SubmissionsList canWrite={canWrite} />
  </div>;
}

export function SubmissionsList({ canWrite, placeId }: { canWrite: boolean; placeId?: string }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const address = useListAddress(placeId ? 'place-submissions' : 'submissions');
  const filters: SubmissionFilters = {
    type: (address.get('type') || undefined) as SubmissionType | undefined,
    status: (address.get('status') || undefined) as 'open' | 'closed' | undefined,
    cityId: placeId ? undefined : address.get('city') || undefined,
    placeId: placeId ?? (address.get('place') || undefined),
    from: address.get('from') || undefined,
    to: address.get('to') || undefined,
  };
  const key = JSON.stringify(filters);
  const [pages, setPages] = React.useState(1);
  const [pagesKey, setPagesKey] = React.useState(key);
  // A filter change starts again from page 1. Adjusting during render (not in an effect)
  // re-renders before anything is painted, so no results from the new filter are shown first.
  if (pagesKey !== key) {
    setPagesKey(key);
    setPages(1);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key is the filters
  const load = React.useCallback(() => loadSubmissions(filters, pages), [key, pages]);
  const resource = useSubscriberResource(load);
  const loadCities = React.useCallback(() => loadAllCities(), []);
  const cities = useSubscriberResource(loadCities);
  const cityList = cities.data?.items ?? [];
  const [openId, setOpenId] = React.useState<string | null>(null);
  const rows = resource.data?.rows ?? [];
  const total = resource.data?.total ?? 0;
  const opened = rows.find((row) => row.id === openId) ?? null;
  const placeFilterName = filters.placeId && !placeId ? rows.find((row) => row.placeId === filters.placeId) : null;
  return <div className="space-y-4">
    <FilterBar filters={placeId ? 4 : 5}>
      <FilterSelect label="All types" value={filters.type ?? 'all'} onValueChange={(value) => address.change('type', value === 'all' ? '' : value)} options={[{ value: 'all', label: 'All types' }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
      <FilterSelect label="Any status" value={filters.status ?? 'all'} onValueChange={(value) => address.change('status', value === 'all' ? '' : value)} options={[{ value: 'all', label: 'Any status' }, { value: 'open', label: 'Waiting' }, { value: 'closed', label: 'Decided' }]} />
      {!placeId && <FilterSelect label="All cities" value={filters.cityId ?? 'all'} onValueChange={(value) => address.change('city', value === 'all' ? '' : value)} options={[{ value: 'all', label: 'All cities' }, ...cityList.map((city) => ({ value: city.id, label: pick(city.name, city.nameEn), icon: <GovIcon city={city} /> }))]} />}
      <DateField aria-label={copy('From')} value={filters.from ?? ''} onChange={(value) => address.change('from', value)} />
      <DateField aria-label={copy('To')} value={filters.to ?? ''} onChange={(value) => address.change('to', value)} />
    </FilterBar>
    {placeFilterName && <p className="flex items-center gap-2 text-sm">{copy('Place')}: <span className="font-medium">{pick(placeFilterName.placeName ?? '', placeFilterName.placeNameEn)}</span><Button size="sm" variant="ghost" data-ro-allow="true" onClick={() => address.change('place', '')}><X aria-hidden="true" />{copy('All places')}</Button></p>}
    <Card><CardContent className="pt-4">
      {resource.loading && !resource.data ? <LoadingState />
        : resource.error ? <RequestError message={copy(resource.error instanceof AdminApiError && resource.error.status === 404 ? 'This list is not on the server yet. It fills in here as soon as the backend sends it.' : 'Could not load this list.')} retry={() => { void resource.refetch(); }} />
        : !rows.length ? <p className="text-sm text-muted-foreground">{copy('Nothing matches these choices.')}</p>
        : <>
          <p className="pb-2 text-sm text-muted-foreground tabular-nums">{total} {copy('submissions')}</p>
          <ul>{rows.map((row) => {
            const city = cityList.find((entry) => entry.id === row.cityId);
            return <li key={row.id} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b py-3 last:border-b-0">
              <div className="min-w-0 flex-1 basis-64 space-y-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-medium">{copy(TYPE_LABELS[row.type])}</span><span className="text-muted-foreground">{copy(KIND_LABELS[row.kind] ?? 'Something else')}</span><StatusBadge status={STATUS_TONE[row.status] ?? 'inactive'}>{copy(STATUS_LABELS[row.status] ?? row.status)}</StatusBadge>{row.media.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{row.media.length} {copy('attached')}</span>}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">{row.placeId ? <>{city && <GovIcon city={city} />}{placeId ? null : <button type="button" data-ro-allow="true" className="underline-offset-4 hover:underline" onClick={() => address.change('place', row.placeId!)}>{pick(row.placeName ?? '', row.placeNameEn)}</button>}</> : <span>{copy('The app or website')}</span>}<time dateTime={row.createdAt} className="tabular-nums">{dashboardDateTime(row.createdAt, lang)}</time></p>
                <p dir="auto" className="line-clamp-1 text-sm">{row.detail.text ?? row.detail.message ?? ''}</p>
              </div>
              <Button size="sm" variant="outline" data-ro-allow="true" onClick={() => setOpenId(row.id)}>{copy('Open')}</Button>
            </li>;
          })}</ul>
          {rows.length < total && <Button className="mt-3" variant="outline" size="sm" data-ro-allow="true" onClick={() => setPages(pages + 1)}>{copy('Show more')}</Button>}
        </>}
    </CardContent></Card>
    {opened && <SubmissionDetail row={opened} canWrite={canWrite} onClose={() => setOpenId(null)} refresh={async () => { await resource.refetch(); }} />}
  </div>;
}

/** One submission in full: the proof, the value now against the suggested one, and the team's actions. */
export function SubmissionDetail({ row, canWrite, onClose, refresh }: { row: SubmissionRow; canWrite: boolean; onClose: () => void; refresh: () => Promise<void> }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const run = (spec: ActionSpec) => setAction({ ...spec, submit: async (values, key) => {
    try { await spec.submit(values, key); }
    catch (caught) { if (caught instanceof AdminApiError && caught.status === 409) { await refresh(); throw new Error(copy('Someone already decided this.')); } throw caught; }
    await refresh(); onClose();
  } });
  const reply = (title: string, required: boolean, submit: (text: string) => Promise<unknown>, done: string, destructive = false): ActionSpec => ({
    title: copy(title), destructive, fields: [{ name: 'reply', label: copy(required ? 'Reply (one line)' : 'Reply (optional)'), required }],
    submit: async (values) => { await submit(String(values.reply ?? '').trim()); toast.success(copy(done)); },
  });
  const actions = !canWrite || !row.waiting ? null
    : row.type === 'correction' ? <>
      <Button size="sm" onClick={() => run({ title: copy('Apply this correction?'), description: copy('A clear phone, name, pin or full week of hours replaces the place’s value at once. Anything else is marked applied, and you make the change on the place page.'), submit: async () => { const result = await applyCorrection(row.id); toast.success(copy(result?.written ? 'Applied. Live on the website now.' : 'Marked as applied. Nothing was written to the place: make the change on the place page.')); } })}><Check aria-hidden="true" />{copy('Apply')}</Button>
      <Button size="sm" variant="outline" onClick={() => run(reply('Reject this correction?', true, (text) => rejectCorrection(row.id, text), 'Rejected. Your reply is kept with it.'))}><X aria-hidden="true" />{copy('Reject')}</Button></>
    : row.type === 'report' ? <Button size="sm" variant="outline" onClick={() => run(reply('Close this report?', false, (text) => closeReport(row.id, text), 'Closed.'))}><Check aria-hidden="true" />{copy('Close')}</Button>
    : row.type === 'owner_request' ? <>
      <Button size="sm" onClick={() => run(reply('Mark this request done?', true, (text) => replyOwnerRequest(row.id, 'done', text), 'Reply sent to the owner.'))}><Check aria-hidden="true" />{copy('Done')}</Button>
      <Button size="sm" variant="outline" onClick={() => run(reply('Decline this request?', true, (text) => replyOwnerRequest(row.id, 'declined', text), 'Reply sent to the owner.', true))}><X aria-hidden="true" />{copy('Decline')}</Button></>
    : <>
      <Button size="sm" onClick={() => run({ title: copy('Publish this photo on the place?'), submit: async () => { await reviewPhoto(row.id, 'approve'); toast.success(copy('Photo published')); } })}><Check aria-hidden="true" />{copy('Approve')}</Button>
      <Button size="sm" variant="outline" onClick={() => run({ title: copy('Reject this photo?'), destructive: true, description: copy('The owner sees your reason in the portal.'), fields: [{ name: 'reason', label: copy('Reason'), type: 'textarea', required: true }], submit: async (values) => { await reviewPhoto(row.id, 'reject', String(values.reason)); toast.success(copy('Photo rejected')); } })}><X aria-hidden="true" />{copy('Reject')}</Button></>;
  const device = deviceText(row.detail.device);
  return <>
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader><DialogTitle>{copy(TYPE_LABELS[row.type])}: {copy(KIND_LABELS[row.kind] ?? 'Something else')}</DialogTitle><DialogDescription className="tabular-nums">{dashboardDateTime(row.createdAt, lang)} <StatusBadge status={STATUS_TONE[row.status] ?? 'inactive'}>{copy(STATUS_LABELS[row.status] ?? row.status)}</StatusBadge></DialogDescription></DialogHeader>
        <div className="space-y-4 text-sm">
          {row.placeId && <p><Link className="font-medium underline underline-offset-4" href={`/dashboard/places/${row.placeId}`}>{pick(row.placeName ?? '', row.placeNameEn)}</Link></p>}
          {row.type === 'photo' && <div className="max-w-sm"><PrivatePhoto path={`/v1/admin/photo-submissions/${row.id}/image`} alt={copy('Photo from the owner')} /></div>}
          <SubmissionMedia media={row.media} photoUrl={row.photoUrl} />
          {row.type === 'correction' && <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2"><dt className="text-muted-foreground">{copy('Now')}</dt><dd className="min-w-0 break-words"><SubmissionValue value={row.detail.current} /></dd><dt className="text-muted-foreground">{copy('Suggested')}</dt><dd className="min-w-0 break-words font-medium"><SubmissionValue value={row.detail.answer} /></dd><dt className="text-muted-foreground">{copy('Sender')}</dt><dd>{copy(SOURCE_LABELS[row.detail.source ?? ''] ?? 'Saw it online')}</dd></dl>}
          {(row.detail.text || row.detail.message) && <p dir="auto" className="whitespace-pre-line break-words">{row.detail.text ?? row.detail.message}</p>}
          {device && <p className="text-muted-foreground"><span>{copy('Sent from')}</span> <span dir="ltr">{device}</span></p>}
          {row.reply && <p className="rounded-md bg-muted p-3"><span className="text-muted-foreground">{copy('Team reply')}: </span><span dir="auto">{row.reply}</span></p>}
          {actions && <div className="flex flex-wrap gap-2 border-t pt-4">{actions}</div>}
        </div>
      </DialogContent>
    </Dialog>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}
