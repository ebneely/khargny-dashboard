'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { Field, LoadingState, RequestError } from './subscriber-ui';
import { adminApi, toList } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { AdPlaceSummary } from '@/lib/api/ads';
import type { Subscriber } from '@/lib/api/subscribers';
import { placeCover } from '@/lib/place-list';

export function AdsPlaceChoices(props: { selected: string[]; onChange: (place: AdPlaceSummary) => void; disabled?: boolean; multiple?: boolean }) { return <React.Suspense fallback={<LoadingState />}><PlaceChoices {...props} /></React.Suspense>; }
function PlaceChoices({ selected, onChange, disabled, multiple }: { selected: string[]; onChange: (place: AdPlaceSummary) => void; disabled?: boolean; multiple?: boolean }) {
  const copy = useDashboardCopy(); const address = useListAddress('place-picker'); const query = address.query; const skip = address.skip; const limit = address.limit;
  const load = React.useCallback(async () => toList<AdPlaceSummary>(await adminApi.get('/v1/admin/places', { search: query || undefined, status: 'active', skip, limit })), [query, skip, limit]);
  const resource = useSubscriberResource(load);
  return <div className="space-y-3">{resource.error && <RequestError message={copy('Could not search places. Try again.')} retry={() => { void resource.refetch(); }} />}<RecordList scope="place-picker" address={address} records={resource.data?.items ?? []} total={resource.data?.total ?? 0} busy={resource.loading} searchText={row => `${row.name} ${row.nameEn ?? ''}`} render={visible => <div>{visible.map(place => <div key={place.id} className="flex min-h-14 items-center gap-3 border-b py-2"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} />{multiple ? <Checkbox aria-label={copy('Select place') + ': ' + place.name} checked={selected.includes(place.id)} disabled={disabled || resource.loading} onCheckedChange={() => { if (!disabled) onChange(place); }} /> : <RowActions recordName={place.name} actions={[{ label: 'Choose place', icon: <Check />, disabled: disabled || resource.loading, onClick: () => onChange(place) }]} />}</div>)}</div>} /></div>;
}
export function AdsSubscriberChoices(props: { subscriber: Subscriber | null; selected: string[]; onSubscriber: (subscriber: Subscriber) => void; onToggle: (id: string) => void; disabled?: boolean }) { return <React.Suspense fallback={<LoadingState />}><SubscriberChoices {...props} /></React.Suspense>; }
function SubscriberChoices({ subscriber, selected, onSubscriber, onToggle, disabled }: { subscriber: Subscriber | null; selected: string[]; onSubscriber: (subscriber: Subscriber) => void; onToggle: (id: string) => void; disabled?: boolean }) {
  const copy = useDashboardCopy(); const address = useListAddress('subscriber-picker'); const { query, skip, limit } = address;
  const load = React.useCallback(async () => toList<Subscriber>(await adminApi.get('/v1/admin/subscribers', { search: query || undefined, status: 'active', skip, limit })), [query, skip, limit]);
  const resource = useSubscriberResource(load); const [error, setError] = React.useState(''); const [choosing, setChoosing] = React.useState(false); const request = React.useRef(0); const blocked = React.useRef(Boolean(disabled));
  React.useEffect(() => { blocked.current = Boolean(disabled); }, [disabled]);
  const choose = async (row: Subscriber) => {
    if (choosing || blocked.current) return;
    const generation = ++request.current; setError(''); setChoosing(true);
    try { const detail = await adminApi.get<Subscriber>(`/v1/admin/subscribers/${encodeURIComponent(row.id)}`); if (request.current === generation && !blocked.current) onSubscriber(detail); }
    catch { if (request.current === generation) setError(copy('Could not load subscribers.')); }
    finally { if (request.current === generation) setChoosing(false); }
  };
  React.useEffect(() => () => { request.current++; }, []);
  return <div className="space-y-4">{(resource.error || error) && <RequestError message={error || copy('Could not load subscribers.')} retry={() => { void resource.refetch(); }} />}<RecordList scope="subscriber-picker" address={address} records={resource.data?.items ?? []} total={resource.data?.total ?? 0} busy={resource.loading} searchText={row => row.name} render={visible => <div>{visible.map(row => <div key={row.id} className="flex min-h-14 items-center gap-3 border-b py-2"><RecordCell name={row.name} /><RowActions recordName={row.name} actions={[{ label: 'Choose subscriber', icon: <Check />, disabled: disabled || choosing || resource.loading, onClick: () => { void choose(row); } }]} /></div>)}</div>} />
    {subscriber && <Field label={`${copy('Places belonging to')} ${subscriber.name}`}><RecordList scope="subscriber-places" records={subscriber.places} searchText={row => `${row.name} ${row.nameEn ?? ''}`} render={visible => <div>{visible.map(place => <label key={place.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b py-2"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} /><Checkbox aria-label={copy('Select place') + ': ' + place.name} disabled={disabled} checked={selected.includes(place.id)} onCheckedChange={() => onToggle(place.id)} /></label>)}</div>} /></Field>}
  </div>;
}
