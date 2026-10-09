'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { adminApi, toList } from '@/lib/api/admin-client';
import type { AdPlaceSummary } from '@/lib/api/ads';
import type { Subscriber, SubscriberPlace, PlaceDetailResponse } from '@/lib/api/subscribers';
import { useDashboardCopy } from './dashboard-text';
import { Field, RequestError, SubscriberSelect, useSubscriberText } from './subscriber-ui';

export function AdSubscriberPicker({ disabled, onChange, onSubscriber }: { disabled?: boolean; onChange: (place: AdPlaceSummary | null) => void; onSubscriber: (name: string) => void }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const [query, setQuery] = React.useState('');
  const [subscribers, setSubscribers] = React.useState<Subscriber[]>([]);
  const [subscriber, setSubscriber] = React.useState<Subscriber | null>(null);
  const [placeId, setPlaceId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const request = React.useRef(0);
  const placeRequest = React.useRef(0);
  const invalidateSelection = React.useCallback(() => { placeRequest.current++; }, []);
  React.useEffect(() => invalidateSelection, [invalidateSelection]);
  React.useEffect(() => {
    const requestId = ++request.current;
    const timer = window.setTimeout(async () => {
      if (disabled || !query.trim()) { setSubscribers([]); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const result = await adminApi.get<unknown>('/v1/admin/subscribers', { search: query.trim(), limit: 20 });
        if (requestId === request.current) setSubscribers(toList<Subscriber>(result).items);
      } catch { if (requestId === request.current) setError(copy('Could not load subscribers.')); }
      finally { if (requestId === request.current) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); if (request.current === requestId) request.current = requestId + 1; };
  }, [query, disabled, copy]);
  const choosePlace = async (place: SubscriberPlace) => {
    const requestId = ++placeRequest.current;
    setLoading(true); setError(''); onChange(null); setPlaceId('');
    try {
      const response = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${place.id}`);
      if (requestId !== placeRequest.current) return;
      const full = 'place' in response ? response.place : response;
      if (full.status !== 'active') { setError(copy('Choose an active place.')); return; }
      setPlaceId(full.id);
      onChange({ ...place, cityId: full.cityId, status: full.status, coverImage: full.coverImage ?? null });
    } catch { if (requestId === placeRequest.current) setError(copy('Could not load this place.')); }
    finally { if (requestId === placeRequest.current) setLoading(false); }
  };
  return <div className="space-y-4">
    <Field label={copy('Search subscriber')}><Input type="search" disabled={disabled} value={query} onChange={(event) => { invalidateSelection(); setSubscriber(null); setPlaceId(''); onChange(null); setQuery(event.target.value); }} /></Field>
    {error && <RequestError message={error} />}
    <Field label={copy('Subscriber')}><SubscriberSelect value={subscriber?.id ?? ''} disabled={disabled || loading} options={[{ value: '', label: copy('Choose a subscriber') }, ...subscribers.map((entry) => ({ value: entry.id, label: entry.name }))]} onValueChange={(value) => { invalidateSelection(); const entry = subscribers.find((entry) => entry.id === value); setSubscriber(entry ?? null); setPlaceId(''); onChange(null); if (entry) onSubscriber(entry.name); }} /></Field>
    {subscriber && <Field label={copy('Subscriber’s place')}><SubscriberSelect value={placeId} disabled={disabled || loading} options={[{ value: '', label: copy('Choose a place') }, ...subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) }))]} onValueChange={(value) => { const place = subscriber.places.find((entry) => entry.id === value); if (place) void choosePlace(place); else { invalidateSelection(); setPlaceId(''); onChange(null); } }} /></Field>}
    {subscriber && !subscriber.places.length && <p className="text-sm text-muted-foreground">{copy('This subscriber has no linked places.')}</p>}
  </div>;
}
