'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { searchPickerPlaces } from '@/lib/place-picker-search';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { placeCover } from '@/lib/place-list';
import { RecordList, useListAddress } from './record-list';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { RecordCell } from './record-cell';
import { RequestError, useSubscriberText } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';

export function PlaceSearchPicker({ value, onChange, disabled }: { value: SubscriberPlace | null; onChange: (place: SubscriberPlace) => void; disabled?: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const address = useListAddress('override-place-picker');
  const { query: search, skip, limit } = address;
  const cityId = address.get('city');
  const { data: cities } = useAdminCities({ limit: 100 }, true);
  const load = React.useCallback(() => searchPickerPlaces({ search: search.trim() || undefined, limit, skip, cityId: cityId || undefined }), [search, skip, limit, cityId]);
  const resource = useSubscriberResource(load);
  return <div className="min-w-0 space-y-3">
    {value && <RecordCell nameAr={value.name} nameEn={value.nameEn} thumbnail={placeCover(value)} />}
    {resource.error && <RequestError message={copy('Could not load places. Try again.')} retry={() => { void resource.refetch(); }} />}
    <RecordList scope="override-place-picker" address={address} records={resource.data?.items ?? []} total={resource.data?.total ?? 0} busy={resource.loading} searchText={(place) => `${place.name} ${place.nameEn ?? ''}`} filters={[{ key: 'city', label: 'All cities', options: (cities?.items ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) })), value: (place) => place.cityId }]} render={(visible) => <div className="max-h-64 overflow-y-auto">{visible.map((place) => <div key={place.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b py-2"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} /><Button type="button" variant="outline" disabled={disabled} aria-pressed={value?.id === place.id} onClick={() => onChange(place)}>{copy('Choose this place')}</Button></div>)}</div>} />
  </div>;
}
