'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { AdsPageHeader } from './ads-page-header';
import { AdSurfacePicker } from './ads-round-b-ui';
import { AdsPlaceChoices } from './ads-record-pickers';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { FormActionBar } from './form-action-bar';
import { SegmentedControl } from './segmented-control';
import { DateField } from './date-field';
import { Field, LoadingState, RequestError } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adsBApi } from '@/lib/api/ads-round-b';
import type { AdPlaceSummary } from '@/lib/api/ads';
import { adsError, shufflePayload, surfaceTarget } from '@/lib/ads-round7b';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { placeCover } from '@/lib/place-list';

export function AdsShuffleForm({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const router = useRouter(); const today = cairoDate();
  const [name, setName] = React.useState(''); const [mode, setMode] = React.useState('all_eligible'); const [places, setPlaces] = React.useState<AdPlaceSummary[]>([]); const [surface, setSurface] = React.useState('');
  const [from, setFrom] = React.useState(today); const [to, setTo] = React.useState(shiftCalendarDays(today, 6)); const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false); const [saved, setSaved] = React.useState(false); const [error, setError] = React.useState(''); const writing = React.useRef(false);
  const load = React.useCallback(() => adsBApi.surfaces(today, shiftCalendarDays(today, 55)), [today]); const resource = useSubscriberResource(load);
  const locked = !canWrite || busy || saved || resource.loading || Boolean(resource.error);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (locked || writing.current) return;
    const target = resource.data?.data.find(row => row.key === surface); if (!target) { setError(copy('Choose a target.')); return; }
    let body; try { body = shufflePayload({ name, mode: mode as 'explicit' | 'all_eligible', placeIds: places.map(row => row.id), startDate: from, endDate: to, notes: notes.trim() || undefined }, surfaceTarget(target)); } catch (caught) { setError(copy((caught as Error).message)); return; }
    writing.current = true; setBusy(true); setError('');
    try { await adsBApi.createShuffle(body); setSaved(true); toast.success(copy('Shuffle test created.')); router.push('/dashboard/ads/results?tab=shuffle'); }
    catch (caught) { setError(copy(adsError(caught))); } finally { writing.current = false; setBusy(false); }
  };
  return <div className="space-y-6"><AdsPageHeader form title="New shuffle test" description="Share unoccupied positions to compare eligible places, without marking them Sponsored." actions={[{ label: 'Back to results', href: '/dashboard/ads/results?tab=shuffle', readOnly: true }]} />{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load surfaces.')} retry={() => { void resource.refetch(); }} /> : <form id="shuffle-create" onSubmit={submit} className="space-y-6">
    <Card><CardHeader><CardTitle>{copy('Test and target')}</CardTitle></CardHeader><CardContent className="space-y-4"><Field label={copy('Test name')}><Input required maxLength={120} value={name} disabled={locked} onChange={event => setName(event.target.value)} /></Field><AdSurfacePicker allowEditorial surfaces={resource.data?.data ?? []} selected={surface} onChange={row => setSurface(row.key)} disabled={locked} /></CardContent></Card>
    <Card><CardHeader><CardTitle>{copy('Eligible places')}</CardTitle></CardHeader><CardContent className="space-y-4"><SegmentedControl label="Shuffle members" value={mode} onValueChange={value => { if (!locked) setMode(value); }} options={[{ value: 'all_eligible', label: 'All eligible places' }, { value: 'explicit', label: 'Choose places' }]} /><p className="text-sm text-muted-foreground">{copy('The backend snapshots 2 to 1000 matching public places at creation. Later places do not join the test.')}</p>{mode === 'explicit' && <><AdsPlaceChoices multiple disabled={locked} selected={places.map(row => row.id)} onChange={place => setPlaces(current => current.some(row => row.id === place.id) ? current.filter(row => row.id !== place.id) : [...current, place])} /><RecordList scope="shuffle-selected" records={places} searchText={row => row.name} render={visible => <div>{visible.map(row => <div key={row.id} className="flex min-h-14 items-center gap-3 border-b py-2"><RecordCell nameAr={row.name} nameEn={row.nameEn} thumbnail={placeCover(row)} /><RowActions recordName={row.name} actions={[{ label: 'Remove from test', icon: <X />, disabled: locked, onClick: () => setPlaces(current => current.filter(place => place.id !== row.id)) }]} /></div>)}</div>} /></>}</CardContent></Card>
    <Card><CardHeader><CardTitle>{copy('Dates')}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label={copy('Start date')}><DateField disabled={locked} value={from} onChange={setFrom} /></Field><Field label={copy('End date')}><DateField disabled={locked} value={to} min={from} onChange={setTo} /></Field><Field label={copy('Notes (optional)')}><Input value={notes} maxLength={2000} disabled={locked} onChange={event => setNotes(event.target.value)} /></Field></CardContent></Card>
    <FormActionBar creating dirty={Boolean(name || surface)} saving={busy} error={error} disabled={locked} form="shuffle-create" primaryLabel={copy('Create shuffle test')} cancelHref="/dashboard/ads/results?tab=shuffle" />
  </form>}</div>;
}
