'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Clock3, Copy, History, Link2, Plus, Unlink, UserRound, XCircle } from 'lucide-react';
import { adminApi, toList } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { PlaceOwnerHistory, PlaceOwnerInvite, PlaceOwnerResponse, Subscriber } from '@/lib/api/subscribers';
import { useDashboardCopy } from './dashboard-text';
import { ActionDialog, LoadingState, MoneyText, RequestError, StatusBadge, subscriberError, useSubscriberText, type ActionSpec } from './subscriber-ui';
import { DateCell } from './date-cell';
import { PlanChip } from './plan-choices';

const STATUS = {
  active: { icon: CheckCircle2, en: 'Active', tone: 'text-primary' },
  scheduled: { icon: Clock3, en: 'Scheduled', tone: 'text-info' },
  expired: { icon: AlertTriangle, en: 'Expired', tone: 'text-warning' },
  cancelled: { icon: XCircle, en: 'Cancelled', tone: 'text-destructive' },
} as const;

type StatusKey = keyof typeof STATUS;

export function OwnerStatusIcon({ status }: { status: StatusKey | null }) {
  const copy = useDashboardCopy();
  if (!status) return <span aria-label={copy('No subscription')}>—</span>;
  const meta = STATUS[status];
  const Icon = meta.icon;
  return <span className={`inline-flex items-center ${meta.tone}`} title={copy(meta.en)}>
    <Icon aria-hidden="true" className="size-4" />
    <span className="sr-only">{copy(meta.en)}</span>
  </span>;
}

function OwnerStatusLegend() {
  const copy = useDashboardCopy();
  return <div data-slot="owner-status-legend" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
    <span className="font-medium text-foreground">{copy('Status legend')}:</span>
    {(Object.keys(STATUS) as StatusKey[]).map((key) => {
      const meta = STATUS[key];
      const Icon = meta.icon;
      return <span key={key} className="inline-flex items-center gap-1"><Icon aria-hidden="true" className={`size-3.5 ${meta.tone}`} />{copy(meta.en)}</span>;
    })}
    <span className="inline-flex items-center gap-1">— {copy('No subscription')}</span>
  </div>;
}

function HistoryRow({ row }: { row: PlaceOwnerHistory }) {
  const copy = useDashboardCopy();
  return <li data-slot="owner-history-row" className="flex flex-wrap items-start justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 font-medium"><span className="truncate">{row.subscriberName}</span>{!row.unlinkedAt && <StatusBadge status="active">{copy('Active link')}</StatusBadge>}</p>
      <p className="text-xs text-muted-foreground">{copy('Linked')} <DateCell value={row.linkedAt} />{row.linkedBy ? <> {copy('by')} {row.linkedBy}</> : null}</p>
      {row.unlinkedAt && <p className="text-xs text-muted-foreground">{copy('Unlinked')} <DateCell value={row.unlinkedAt} />{row.unlinkedBy ? <> {copy('by')} {row.unlinkedBy}</> : null}</p>}
    </div>
  </li>;
}

/**
 * The Owner tab on a place: who owns it now, the actions that change that, and every
 * link and unlink ever made. The API refuses a second active owner for one place.
 */
export function PlaceOwnerTab({ placeId, placeName, placePhone, canWrite }: { placeId: string; placeName: string; placePhone: string | null; canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const load = React.useCallback(() => adminApi.get<PlaceOwnerResponse>(`/v1/admin/places/${placeId}/owner`), [placeId]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [message, setMessage] = React.useState('');
  const [invite, setInvite] = React.useState<PlaceOwnerInvite | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkTerm, setLinkTerm] = React.useState('');
  const [linkResults, setLinkResults] = React.useState<Subscriber[]>([]);
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [linkError, setLinkError] = React.useState('');
  const [linkSaving, setLinkSaving] = React.useState('');
  const owner = resource.data?.owner ?? null;
  const history = resource.data?.history ?? [];

  React.useEffect(() => {
    if (!linkOpen) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLinkLoading(true); setLinkError('');
      try {
        const raw = await adminApi.get<unknown>('/v1/admin/subscribers', { search: linkTerm.trim() || undefined, limit: 20 });
        if (active) setLinkResults(toList<Subscriber>(raw).items);
      } catch {
        if (active) setLinkError(copy('Could not load owners. Try again.'));
      } finally {
        if (active) setLinkLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [linkOpen, linkTerm, copy]);

  const create = () => setAction({
    title: copy('Create owner for this place'),
    description: copy('The owner is created from this place and gets the portal invite.'),
    fields: [
      { name: 'name', label: copy('Name'), value: placeName, required: true },
      { name: 'phone', label: copy('Phone'), type: 'tel', value: placePhone ?? '', required: true },
      { name: 'email', label: copy('Email (optional)'), type: 'email' },
    ],
    submit: async (values) => {
      const result = await adminApi.post<PlaceOwnerResponse & { invite: PlaceOwnerInvite }>(`/v1/admin/places/${placeId}/owner/create`, { name: values.name, phone: values.phone, email: values.email ? values.email : null });
      setInvite(result.invite);
      setMessage(copy('Owner created.'));
      setCopied(false);
      await resource.refetch();
    },
  });

  const unlink = () => setAction({
    title: copy('Unlink this owner?'),
    description: copy('The place becomes free. The link history is kept and every subscription stays.'),
    destructive: true,
    submit: async () => {
      await adminApi.delete(`/v1/admin/places/${placeId}/owner`);
      setMessage(copy('Owner unlinked.'));
      await resource.refetch();
    },
  });

  const link = async (subscriber: Subscriber) => {
    setLinkSaving(subscriber.id); setLinkError('');
    try {
      await adminApi.post(`/v1/admin/places/${placeId}/owner`, { subscriberId: subscriber.id });
      setLinkOpen(false); setLinkTerm(''); setMessage(copy('Linked.'));
      await resource.refetch();
    } catch (caught) {
      setLinkError(subscriberError(caught, lang));
    } finally {
      setLinkSaving('');
    }
  };

  return <div className="space-y-6">
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
    {invite && <Card data-slot="owner-portal-invite"><CardHeader><CardTitle>{copy('Portal invite')}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground">{copy('Share this temporary password with the owner. It is shown once.')}</p><div className="flex flex-wrap items-center gap-2"><code dir="ltr" className="rounded-md bg-muted px-2 py-1 text-sm">{invite.temporaryPassword}</code>{invite.phone && <span className="text-sm text-muted-foreground" dir="ltr">{invite.phone}</span>}<Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(invite.temporaryPassword); setCopied(true); }}><Copy aria-hidden="true" />{copied ? copy('Copied.') : copy('Copy')}</Button></div></CardContent></Card>}
    <Card>
      <CardHeader data-slot="owner-card-header" className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><UserRound aria-hidden="true" className="size-5 text-primary" />{copy('Owner details')}</CardTitle>
        {canWrite && owner && <Button type="button" variant="outline" size="xs" onClick={unlink}><Unlink aria-hidden="true" />{copy('Unlink owner')}</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {resource.loading && <LoadingState />}
        {resource.error && <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} />}
        {!resource.loading && !resource.error && !owner && <div data-slot="owner-empty" className="space-y-4">
          <div><h3 className="font-semibold">{copy('No owner yet')}</h3><p className="text-sm text-muted-foreground">{copy('This place has no owner. Create one from the place, or link an existing owner.')}</p></div>
          {canWrite && <div className="flex flex-wrap gap-2"><Button type="button" size="xs" onClick={create}><Plus aria-hidden="true" />{copy('Create owner for this place')}</Button><Button type="button" size="xs" variant="outline" onClick={() => setLinkOpen(true)}><Link2 aria-hidden="true" />{copy('Link an existing owner')}</Button></div>}
        </div>}
        {owner && <div data-slot="owner-card" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{owner.name}</p>
            <PlanChip plan={owner.plan ?? undefined} />
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Phone')}</dt><dd dir="ltr" className="truncate ms-0">{owner.phone ?? '—'}</dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Email')}</dt><dd dir="ltr" className="truncate ms-0">{owner.email ?? '—'}</dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Plan')}</dt><dd className="ms-0">{owner.plan ? copy(owner.plan === 'owner_plus' ? 'Owner Plus' : 'Owner') : '—'}</dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Status')}</dt><dd className="ms-0"><OwnerStatusIcon status={owner.status} /></dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Renewal date')}</dt><dd className="ms-0">{owner.renewalDate ? <DateCell value={owner.renewalDate} /> : '—'}</dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Owner since')}</dt><dd className="ms-0">{owner.since ? <DateCell value={owner.since} /> : '—'}</dd></div>
            <div className="flex items-center justify-start gap-2"><dt className="shrink-0 text-muted-foreground">{copy('Monthly price')}</dt><dd className="ms-0">{owner.monthlyPrice ? <MoneyText value={owner.monthlyPrice} /> : '—'}</dd></div>
          </dl>
          <OwnerStatusLegend />
        </div>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History aria-hidden="true" className="size-5 text-primary" />{copy('Link history')}</CardTitle></CardHeader>
      <CardContent>{history.length ? <ul data-slot="owner-history">{history.map((row) => <HistoryRow key={row.id} row={row} />)}</ul> : <p className="text-sm text-muted-foreground">{copy('No link history yet.')}</p>}</CardContent>
    </Card>
    <ActionDialog action={action} onClose={() => setAction(null)} />
    <Dialog open={linkOpen} onOpenChange={(open) => { if (!open) { setLinkOpen(false); setLinkTerm(''); setLinkError(''); } }}>
      <DialogContent className="sm:max-w-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader><DialogTitle>{copy('Link an existing owner')}</DialogTitle><DialogDescription>{copy('Search owners by name or phone')}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Input aria-label={copy('Search owners...')} value={linkTerm} onChange={(event) => setLinkTerm(event.target.value)} placeholder={copy('Search owners...')} autoFocus />
          {linkError && <p role="alert" className="text-sm text-destructive">{linkError}</p>}
          <div className="max-h-64 space-y-1 overflow-y-auto" aria-busy={linkLoading}>
            {linkLoading && <p className="py-2 text-sm text-muted-foreground">{copy('Loading…')}</p>}
            {!linkLoading && !linkResults.length && <p className="py-2 text-sm text-muted-foreground">{copy('No owners match this search.')}</p>}
            {linkResults.map((subscriber) => <div key={subscriber.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{subscriber.name}</p><p className="text-xs text-muted-foreground" dir="ltr">{subscriber.phone}</p></div>
              <Button type="button" size="sm" variant="outline" aria-label={`${copy('Link')} ${subscriber.name}`} disabled={Boolean(linkSaving)} onClick={() => { void link(subscriber); }}>{linkSaving === subscriber.id ? copy('Saving…') : copy('Link')}</Button>
            </div>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
