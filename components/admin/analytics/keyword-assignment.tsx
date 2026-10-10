'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { adminApi, AdminApiError, toList } from '@/lib/api/admin-client';
import { previewAssignment, applyAssignment, loadInsightOptions, type AssignmentBody, type AssignmentPreview } from '@/lib/api/search-insights';
import type { AdminPlace, AdminCity, AdminCategory } from '@/lib/api/types';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { placeCover } from '@/lib/place-list';
import { RecordList, useListAddress } from '../record-list';
import { RecordCell } from '../record-cell';
import { SegmentedControl } from '../segmented-control';
import { Field, SubscriberSelect, RequestError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function KeywordAssignment({ id, disabled, onApplied }: { id: string; disabled?: boolean; onApplied: () => Promise<boolean> }) {
  const copy = useDashboardCopy();
  const { pick, lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const [method, setMethod] = React.useState('pick');
  const [mode, setMode] = React.useState<'add' | 'remove'>('add');
  const [selected, setSelected] = React.useState<AdminPlace[]>([]);
  const [where, setWhere] = React.useState({ cityId: '', categoryId: '', region: '', search: '' });
  const [allConfirmed, setAllConfirmed] = React.useState(false);
  const [review, setReview] = React.useState<{ body: AssignmentBody; preview: AssignmentPreview } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const submitting = React.useRef(false);
  const [error, setError] = React.useState('');
  const [savedRefreshFailed, setSavedRefreshFailed] = React.useState(false);
  const address = useListAddress('assign-picker');
  const { query: search, skip, limit } = address;
  const loadChoices = React.useCallback(async () => {
    const [cities, categories] = await Promise.all([loadInsightOptions<AdminCity>('/v1/admin/cities'), loadInsightOptions<AdminCategory>('/v1/admin/categories')]);
    return { cities, categories };
  }, []);
  const choices = useSubscriberResource(loadChoices);
  const loadPlaces = React.useCallback(async () => method === 'pick' ? toList<AdminPlace>(await adminApi.get('/v1/admin/places', { search, skip, limit })) : { items: [], total: 0, skip: 0, limit }, [method, search, skip, limit]);
  const places = useSubscriberResource(loadPlaces);
  const selector = Object.fromEntries(Object.entries(where).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
  const body: AssignmentBody = method === 'pick' ? { add: mode === 'add' ? selected.map((place) => place.id) : [], remove: mode === 'remove' ? selected.map((place) => place.id) : [], dryRun: true } : { tagIds: [id], where: selector, mode, dryRun: true };
  const fingerprint = JSON.stringify(body);
  const current = React.useRef(fingerprint);
  React.useEffect(() => { current.current = fingerprint; }, [fingerprint]);
  const reviewed = review && JSON.stringify(review.body) === fingerprint ? review : null;
  const locked = readOnly || busy || disabled || savedRefreshFailed;
  const emptySelection = method === 'pick' ? selected.length === 0 : Object.keys(selector).length === 0 && !allConfirmed;
  const request = async (apply: boolean) => {
    if (submitting.current || locked || emptySelection || apply && !reviewed) return;
    submitting.current = true; setBusy(true); setError('');
    const snapshot = JSON.parse(fingerprint) as AssignmentBody;
    try {
      if (apply && reviewed) {
        await applyAssignment(id, reviewed.body, reviewed.preview);
        setReview(null); setSelected([]);
        if (!await onApplied()) setSavedRefreshFailed(true); else toast.success(copy('Assignment saved'));
      } else {
        const preview = await previewAssignment(id, snapshot);
        if (current.current === JSON.stringify(snapshot)) setReview({ body: snapshot, preview });
      }
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) { setReview(null); setError(copy('The selection changed. Preview again and review the new digest before applying.')); }
      else if (caught instanceof AdminApiError && caught.status === 422) setError(copy('Narrow the selection or remove merged places, then preview again.'));
      else setError(copy('Could not update keyword assignments. Your selection is kept.'));
    } finally { submitting.current = false; setBusy(false); }
  };
  const number = (value: number) => value.toLocaleString(lang);
  return <Card><CardHeader><CardTitle>{copy('Assign keyword to places')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Preview first. Applying changes only this keyword and preserves other keywords.')}</p></CardHeader><CardContent className="space-y-4">
    <fieldset disabled={locked} className="min-w-0 space-y-4"><SegmentedControl label="Assignment method" value={method} onValueChange={(value) => { setMethod(String(value)); setReview(null); }} options={[{ value: 'pick', label: 'Pick places' }, { value: 'selector', label: 'Use a selector' }]} /><SegmentedControl label="Assignment action" value={mode} onValueChange={(value) => { setMode(value as 'add' | 'remove'); setReview(null); }} options={[{ value: 'add', label: 'Add keyword' }, { value: 'remove', label: 'Remove keyword' }]} />
      {method === 'pick' ? <>
        {places.error ? <RequestError message={copy('Could not load places.')} retry={() => { void places.refetch(); }} /> : <RecordList scope="assign-picker" address={address} records={places.data?.items ?? []} total={places.data?.total ?? 0} busy={places.loading} searchText={(place) => `${place.name} ${place.nameEn}`} render={(rows) => <ul className="divide-y">{rows.map((place) => <li key={place.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} context={place.city ? pick(place.city.name, place.city.nameEn) : undefined} /><Button type="button" variant="outline" role="checkbox" aria-checked={selected.some((entry) => entry.id === place.id)} disabled={locked} onClick={() => setSelected((current) => current.some((entry) => entry.id === place.id) ? current.filter((entry) => entry.id !== place.id) : [...current, place])}>{copy(selected.some((entry) => entry.id === place.id) ? 'Selected' : 'Select place')}</Button></li>)}</ul>} />}
        <p className="text-sm tabular-nums">{number(selected.length)} {copy('places selected')}</p>
        {!!selected.length && <RecordList scope="selected-places" records={selected} searchText={(place) => `${place.name} ${place.nameEn}`} render={(rows) => <ul className="divide-y">{rows.map((place) => <li key={place.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} /><Button type="button" variant="outline" onClick={() => setSelected((current) => current.filter((entry) => entry.id !== place.id))}>{copy('Remove selection')}</Button></li>)}</ul>} />}
      </> : <div className="grid gap-4 sm:grid-cols-2"><Field label={copy('City')}><SubscriberSelect value={where.cityId || 'all'} options={[{ value: 'all', label: copy('All cities') }, ...(choices.data?.cities ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} onValueChange={(cityId) => setWhere({ ...where, cityId: cityId === 'all' ? '' : cityId, region: '' })} /></Field><Field label={copy('Category')}><SubscriberSelect value={where.categoryId || 'all'} options={[{ value: 'all', label: copy('All categories') }, ...(choices.data?.categories ?? []).map((category) => ({ value: category.id, label: pick(category.nameAr, category.nameEn) }))]} onValueChange={(categoryId) => setWhere({ ...where, categoryId: categoryId === 'all' ? '' : categoryId })} /></Field><Field label={copy('Area key — optional')}><Input value={where.region} onChange={(event) => setWhere({ ...where, region: event.target.value })} /></Field><Field label={copy('Place name search — optional')}><Input value={where.search} onChange={(event) => setWhere({ ...where, search: event.target.value })} /></Field><p className="text-sm text-muted-foreground sm:col-span-2">{copy('Selectors combine with AND. Area is an exact key; search matches place names only. Draft places can be assigned.')}</p>{!Object.keys(selector).length && <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1 size-5" checked={allConfirmed} onChange={(event) => setAllConfirmed(event.target.checked)} />{copy('I intend to select all non-deleted, unmerged places.')}</label>}</div>}
    </fieldset>
    {choices.error && <RequestError message={copy('Could not load selector options.')} retry={() => { void choices.refetch(); }} />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{savedRefreshFailed && <p role="alert" className="text-sm text-destructive">{copy('Saved, but could not refresh. Reload before changing anything else.')}</p>}
    <Button type="button" variant="outline" disabled={locked || emptySelection || method === 'selector' && (choices.loading || !!choices.error)} onClick={() => { void request(false); }}>{copy(busy ? 'Working…' : 'Preview assignment')}</Button>
    {reviewed && <section className="min-w-0 space-y-3 rounded-lg border p-3"><h3 className="font-semibold">{copy('Review assignment')}</h3><p className="text-sm tabular-nums">{number(reviewed.preview.added)} {copy('links added')} · {number(reviewed.preview.removed)} {copy('links removed')}</p><p className="text-xs text-muted-foreground">{copy('Plan digest')}</p><code dir="ltr" className="block break-all text-xs">{reviewed.preview.planDigest}</code>
      <RecordList scope="assignment-preview" records={reviewed.preview.selectedPlaces} searchText={(place) => place.name} render={(rows) => <ul className="divide-y">{rows.map((place) => <li key={place.id} className="py-3"><RecordCell nameAr={place.name} thumbnail={null} context={[place.region, copy(reviewed.preview.changes.find((change) => change.placeId === place.id)?.mode === 'add' ? 'Add keyword' : reviewed.preview.changes.some((change) => change.placeId === place.id) ? 'Remove keyword' : 'No change')].filter(Boolean).join(' · ')} /></li>)}</ul>} />
      <Button type="button" variant="outline" disabled={locked} onClick={() => { void request(true); }}>{copy('Apply reviewed assignment')}</Button>
    </section>}
  </CardContent></Card>;
}
