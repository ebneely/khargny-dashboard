'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Link2, Plus } from 'lucide-react';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { SubscriberPlaceOverview } from '@/lib/api/subscribers';
import { placeCover } from '@/lib/place-list';
import { searchPickerPlaces } from '@/lib/place-picker-search';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, MoneyText, RequestError, subscriberError, useSubscriberText } from './subscriber-ui';
import { OwnerStatusIcon } from './place-owner-tab';
import { PlanChip } from './plan-choices';
import { RecordCell } from './record-cell';

function PlaceRows({ places }: { places: SubscriberPlaceOverview[] }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  return <Table>
    <TableHeader><TableRow>
      <TableHead>{copy('Name')}</TableHead>
      <TableHead className="hidden sm:table-cell">{copy('City')}</TableHead>
      <TableHead>{copy('Plan')}</TableHead>
      <TableHead className="text-end">{copy('Price')}</TableHead>
      <TableHead className="text-end">{copy('Ads running')}</TableHead>
      <TableHead column="status">{copy('Status')}</TableHead>
      <TableHead column="actions" className="text-end">{copy('Open place')}</TableHead>
    </TableRow></TableHeader>
    <TableBody>{places.map((place) => <TableRow key={place.id} data-subscriber-place-id={place.id}>
      <TableCell><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={place.coverImage ?? placeCover(place)} /></TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">{place.city ? pick(place.city.name, place.city.nameEn) : '—'}</TableCell>
      <TableCell><PlanChip plan={place.plan ?? undefined} /></TableCell>
      <TableCell className="text-end tabular-nums">{place.monthlyPrice ? <MoneyText value={place.monthlyPrice} mutedUnit /> : '—'}</TableCell>
      <TableCell className="text-end tabular-nums">{place.adsRunning}</TableCell>
      <TableCell column="status"><OwnerStatusIcon status={place.status} /></TableCell>
      <TableCell column="actions" className="text-end"><Button nativeButton={false} data-ro-allow="true" variant="ghost" size="icon-sm" aria-label={copy('Open place')} title={copy('Open place')} render={<Link href={`/dashboard/places/${place.id}`} />}><ExternalLink aria-hidden="true" /></Button></TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}

/**
 * The owner's Places tab: every linked place with its plan, money, running ads and
 * status, plus a search that links another free place. Linking goes through the place
 * owner endpoint, so the one-owner rule, history and audit apply here too.
 */
export function SubscriberPlacesOverview({ subscriberId, canWrite, revision }: { subscriberId: string; canWrite: boolean; revision?: unknown }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const load = React.useCallback(() => adminApi.get<{ data: SubscriberPlaceOverview[] }>(`/v1/admin/subscribers/${subscriberId}/places`), [subscriberId]);
  const resource = useSubscriberResource(load, revision);
  const places = resource.data?.data ?? [];
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<SubscriberPlaceOverview[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const result = await searchPickerPlaces({ search: term.trim() || undefined, status: 'active', subscriberId: 'none', limit: 10, skip: 0 });
        if (active) setResults(result.items as unknown as SubscriberPlaceOverview[]);
      } catch {
        if (active) setError(copy('Could not load the places. Try again.'));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [open, term, copy]);

  const link = async (placeId: string) => {
    setSaving(placeId); setError('');
    try {
      await adminApi.post(`/v1/admin/places/${placeId}/owner`, { subscriberId });
      setOpen(false); setTerm('');
      await resource.refetch();
    } catch (caught) {
      setError(subscriberError(caught, lang));
    } finally {
      setSaving('');
    }
  };

  return <Card data-slot="owner-places-tab">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle>{copy("The owner's places")}</CardTitle>
      {canWrite && <Button type="button" size="xs" variant="outline" onClick={() => setOpen(true)}><Plus aria-hidden="true" />{copy('Add a place')}</Button>}
    </CardHeader>
    <CardContent className="space-y-3">
      {resource.loading && <LoadingState />}
      {resource.error && <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} />}
      {!resource.loading && !resource.error && !places.length && <p className="text-sm text-muted-foreground">{copy('No places linked to this owner yet.')}</p>}
      {places.length > 0 && <div data-testid="owner-places-grid"><PlaceRows places={places} /></div>}
    </CardContent>
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setOpen(false); setTerm(''); setError(''); } }}>
      <DialogContent className="sm:max-w-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader><DialogTitle>{copy('Add a place')}</DialogTitle><DialogDescription>{copy('Link another place to this owner')}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Input aria-label={copy('Search places by name...')} value={term} onChange={(event) => setTerm(event.target.value)} placeholder={copy('Search places by name...')} autoFocus />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="max-h-64 space-y-1 overflow-y-auto" aria-busy={loading}>
            {loading && <p className="py-2 text-sm text-muted-foreground">{copy('Loading…')}</p>}
            {!loading && !results.length && <p className="py-2 text-sm text-muted-foreground">{copy('No free places match this search.')}</p>}
            {results.map((place) => <div key={place.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={place.coverImage ?? placeCover(place)} />
              <Button type="button" size="sm" variant="outline" aria-label={`${copy('Link')} ${place.nameEn ?? place.name}`} disabled={Boolean(saving)} onClick={() => { void link(place.id); }}><Link2 aria-hidden="true" />{saving === place.id ? copy('Saving…') : copy('Link')}</Button>
            </div>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </Card>;
}
