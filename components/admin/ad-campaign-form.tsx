'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AdsPageHeader } from './ads-page-header';
import { AdSurfacePicker } from './ads-round-b-ui';
import { AdsPlaceChoices, AdsSubscriberChoices } from './ads-record-pickers';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { DateField } from './date-field';
import { PresetChoices } from './preset-choices';
import { SegmentedControl } from './segmented-control';
import { FormActionBar } from './form-action-bar';
import { Field, LoadingState, RequestError } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adminApi } from '@/lib/api/admin-client';
import { adsBApi, type Agreement, type PromotionCampaign } from '@/lib/api/ads-round-b';
import { adsError, alwaysOnPayload, subscriberBatch, surfaceTarget, validAdsRange } from '@/lib/ads-round7b';
import { cairoDate, type PlaceDetailResponse, type Subscriber } from '@/lib/api/subscribers';
import type { AdPlaceSummary } from '@/lib/api/ads';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { placeCover } from '@/lib/place-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdCampaignForm(props: { campaignId?: string; initialPlaceId?: string; canWrite: boolean }) { return <React.Suspense fallback={<LoadingState />}><CampaignForm {...props} /></React.Suspense>; }
function CampaignForm({ campaignId, initialPlaceId, canWrite }: { campaignId?: string; initialPlaceId?: string; canWrite: boolean }) {
  const copy = useDashboardCopy(); const { pick, lang } = useDashboardLang(); const params = useSearchParams(); const router = useRouter(); const today = cairoDate();
  const [step, setStep] = React.useState('who'); const [source, setSource] = React.useState('place');
  const [place, setPlace] = React.useState<AdPlaceSummary | null>(null); const [subscriber, setSubscriber] = React.useState<Subscriber | null>(null); const [placeIds, setPlaceIds] = React.useState<string[]>([]);
  const [surfaceKey, setSurfaceKey] = React.useState(params.get('surface') ?? ''); const [campaign, setCampaign] = React.useState<PromotionCampaign | null>(null);
  const initialValues = { advertiserName: '', advertiserPhone: '', amountPaid: '0', currency: 'EGP', startDate: today, endDate: shiftCalendarDays(today, 29), notes: '', reason: '' };
  const [values, setValues] = React.useState(initialValues);
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState(''); const [saved, setSaved] = React.useState(false); const writing = React.useRef(false);
  const alwaysOn = campaign?.kind === 'always_on' || !campaignId && params.get('kind') === 'always_on';
  const load = React.useCallback(async () => {
    const catalogue = await adsBApi.surfaces(today, shiftCalendarDays(today, 55));
    if (campaignId) {
      const row = await adminApi.get<PromotionCampaign>(`/v1/admin/ads/campaigns/${campaignId}`);
      setCampaign(row); setPlace(row.place); setValues({ advertiserName: row.advertiserName, advertiserPhone: row.advertiserPhone ?? '', amountPaid: String(row.amountPaid), currency: row.currency, startDate: row.startDate, endDate: row.endDate ?? shiftCalendarDays(today, 29), notes: row.notes ?? '', reason: row.reason ?? '' });
      setSurfaceKey(catalogue.data.find(surface => surface.surface === row.placement && surface.scope.cityId === (row.cityId ?? null) && surface.scope.areaKey === (row.areaKey ?? null) && surface.scope.categoryId === (row.categoryId ?? null) && surface.scope.sectionId === (row.sectionId ?? null))?.key ?? '');
    } else if (initialPlaceId) {
      const response = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${encodeURIComponent(initialPlaceId)}`); const row = 'place' in response ? response.place : response;
      setPlace({ ...row, rating: String(row.rating), coverImage: row.coverImage ?? null });
    }
    return catalogue;
  }, [campaignId, initialPlaceId, today, setCampaign, setPlace, setSurfaceKey]);
  const resource = useSubscriberResource(load); const selected = resource.data?.data.find(row => row.key === surfaceKey);
  const availabilityLoad = React.useCallback(async () => validAdsRange(values.startDate, alwaysOn ? values.startDate : values.endDate, 92) ? adsBApi.surfaces(values.startDate, alwaysOn ? values.startDate : values.endDate) : null, [values.startDate, values.endDate, alwaysOn]);
  const availability = useSubscriberResource(availabilityLoad);
  const targetFrozen = Boolean(campaignId && campaign?.state !== 'scheduled');
  const locked = !canWrite || busy || saved || resource.loading || Boolean(resource.error);
  const change = (field: keyof typeof values, value: string) => { if (!locked) setValues(current => ({ ...current, [field]: value })); };
  const count = source === 'subscriber' && !campaignId ? placeIds.length : place ? 1 : 0;
  const agreement = (): Agreement => ({ advertiserName: values.advertiserName.trim(), advertiserPhone: values.advertiserPhone.trim() || undefined, amountPaid: Number(values.amountPaid), currency: values.currency, startDate: values.startDate, endDate: alwaysOn ? null : values.endDate, notes: values.notes.trim() || undefined });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (locked || writing.current) return;
    const errors: { step: string }[] = [];
    if (!count) errors.push({ step: 'who' });
    if (!selected) errors.push({ step: 'where' });
    if (!validAdsRange(values.startDate, alwaysOn ? values.startDate : values.endDate, 366)) errors.push({ step: 'when' });
    if (!values.advertiserName.trim() || !values.amountPaid.trim() || !Number.isFinite(Number(values.amountPaid)) || Number(values.amountPaid) < 0 || !/^[A-Z]{3}$/.test(values.currency) || alwaysOn && !values.reason.trim()) errors.push({ step: 'money' });
    if (errors.length) { setStep(errors[0].step); setError(copy('Choose the places, target, dates, advertiser and a valid amount; always-on also needs a reason.')); return; }
    if (!selected) return;
    writing.current = true; setBusy(true); setError('');
    try {
      const target = surfaceTarget(selected); const common = agreement();
      if (source === 'subscriber' && !campaignId) await adsBApi.createSubscriberCampaigns(subscriberBatch(subscriber?.id ?? '', placeIds, target, { ...common, ...(alwaysOn ? { kind: 'always_on', reason: values.reason.trim(), endDate: null } : {}) }));
      else {
        const body = alwaysOn ? alwaysOnPayload(place!.id, target, common, values.reason) : { ...common, ...target, placeId: place!.id };
        if (campaignId) await adminApi.patch(`/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}`, body);
        else await adsBApi.createCampaign(body);
      }
      setSaved(true); toast.success(copy('Promotion saved. The backend checks eligibility before serving.')); router.push(alwaysOn ? '/dashboard/ads/always-on' : '/dashboard/ads/campaigns');
    } catch (caught) { setError(copy(adsError(caught))); }
    finally { writing.current = false; setBusy(false); }
  };
  const targetName = selected?.name ?? copy('No target selected');
  return <div className="min-w-0 space-y-6"><AdsPageHeader form title={campaignId ? 'Edit campaign' : alwaysOn ? 'Add always-on promotion' : 'New campaign'} description="Choose who, where, when and the recorded agreement before saving." actions={[{ label: 'Back to campaigns', href: '/dashboard/ads/campaigns', readOnly: true }]} />
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load campaign details.')} retry={() => { void resource.refetch(); }} /> : <form id="campaign-form" onSubmit={submit} className="space-y-6">
      <SegmentedControl label="Campaign steps" value={step} onValueChange={setStep} options={[{ value: 'who', label: 'Who' }, { value: 'where', label: 'Where' }, { value: 'when', label: 'When' }, { value: 'money', label: 'Money' }]} />
      {step === 'who' && <Card><CardHeader><CardTitle>{copy('Who')}</CardTitle></CardHeader><CardContent className="space-y-4">{!campaignId && <SegmentedControl label="Campaign recipient" value={source} onValueChange={value => { if (!locked) setSource(value); }} options={[{ value: 'place', label: 'A place' }, { value: 'subscriber', label: 'For a subscriber' }]} />}{source === 'place' || campaignId ? <><AdsPlaceChoices selected={place ? [place.id] : []} disabled={locked || Boolean(campaignId)} onChange={setPlace} />{place && <RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} />}</> : <AdsSubscriberChoices subscriber={subscriber} selected={placeIds} disabled={locked} onSubscriber={row => { setSubscriber(row); setPlaceIds([]); change('advertiserName', row.name); }} onToggle={id => { if (!locked) setPlaceIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 100 ? [...current, id] : current); }} />}</CardContent></Card>}
      {step === 'where' && <Card><CardHeader><CardTitle>{copy('Where')}</CardTitle></CardHeader><CardContent className="space-y-4">{targetFrozen && <p className="text-sm text-muted-foreground">{copy('The target cannot change after the campaign starts.')}</p>}<AdSurfacePicker surfaces={resource.data?.data ?? []} selected={surfaceKey} disabled={locked || targetFrozen} onChange={surface => setSurfaceKey(surface.key)} /></CardContent></Card>}
      {step === 'when' && <Card><CardHeader><CardTitle>{copy('When')}</CardTitle></CardHeader><CardContent className="space-y-4">{!alwaysOn && <PresetChoices label="Booking length" value={null} options={[{ value: '7', label: copy('7 days') }, { value: '14', label: copy('14 days') }, { value: '30', label: copy('30 days') }]} disabled={locked} onValueChange={days => change('endDate', shiftCalendarDays(values.startDate, Number(days) - 1))} />}<div className="grid gap-4 sm:grid-cols-2"><Field label={copy('Start date')}><DateField disabled={locked} value={values.startDate} onChange={value => change('startDate', value)} /></Field>{!alwaysOn && <Field label={copy('End date')}><DateField disabled={locked} value={values.endDate} min={values.startDate} onChange={value => change('endDate', value)} /></Field>}</div><p className="text-sm text-muted-foreground">{copy(alwaysOn ? 'No end date. It stays eligible until you stop it.' : 'Calendar dates are inclusive in Africa/Cairo.')}</p>{availability.loading ? <LoadingState /> : availability.error ? <RequestError message={copy('Could not load availability.')} retry={() => { void availability.refetch(); }} /> : availability.data && selected ? <RecordList scope="booking-days" records={availability.data.data.find(row => row.key === surfaceKey)?.days ?? []} searchText={row => row.date} render={visible => <div>{visible.map(day => <div key={day.date} className="flex min-h-14 flex-wrap gap-3 border-b py-2"><RecordCell icon="calendar" name={day.date} /><p className="ms-auto text-sm">{day.booked} {copy('booked')} · {day.free} {copy('free')}</p></div>)}</div>} /> : <p className="text-sm text-muted-foreground">{copy('Availability is limited to 92 days per request. The backend validates the full booking when saving.')}</p>}</CardContent></Card>}
      {step === 'money' && <Card><CardHeader><CardTitle>{copy('Recorded agreement')}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label={copy('Advertiser name')}><Input value={values.advertiserName} onChange={event => change('advertiserName', event.target.value)} disabled={locked} maxLength={120} required /></Field><Field label={copy('Advertiser phone (optional)')}><Input value={values.advertiserPhone} onChange={event => change('advertiserPhone', event.target.value)} disabled={locked} maxLength={40} type="tel" /></Field><Field label={copy('Amount per place')}><Input value={values.amountPaid} onChange={event => change('amountPaid', event.target.value)} disabled={locked} type="number" min="0" step="0.01" required /></Field><Field label={copy('Currency')}><Input value={values.currency} onChange={event => change('currency', event.target.value.toUpperCase())} disabled={locked} maxLength={3} required /></Field>{alwaysOn && <Field label={copy('Reason (required)')}><Input value={values.reason} onChange={event => change('reason', event.target.value)} disabled={locked} required /></Field>}<Field label={copy('Notes (optional)')}><Input value={values.notes} onChange={event => change('notes', event.target.value)} disabled={locked} maxLength={2000} /></Field><p className="text-sm text-muted-foreground sm:col-span-2">{copy('This is an offline agreement, not cash received. One campaign is created for each selected place, or none if any place is refused.')}</p></CardContent></Card>}
      <p className="rounded bg-muted p-4 text-sm" aria-live="polite">{source === 'subscriber' ? subscriber?.name : place ? pick(place.name, place.nameEn) : copy('Choose a place')} · {count.toLocaleString(lang)} {copy('places')} · {targetName} · {values.startDate} — {alwaysOn ? copy('No end date') : values.endDate} · {values.amountPaid} {values.currency} {copy('per place')} · {copy('The amount is recorded separately for each selected place.')}</p>
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={step === 'who' || locked} onClick={() => setStep(['who', 'where', 'when', 'money'][Math.max(0, ['who', 'where', 'when', 'money'].indexOf(step) - 1)])}>{copy('Back')}</Button><Button type="button" variant="outline" disabled={step === 'money' || locked} onClick={() => setStep(['who', 'where', 'when', 'money'][Math.min(3, ['who', 'where', 'when', 'money'].indexOf(step) + 1)])}>{copy('Next step')}</Button></div>
      <FormActionBar creating={!campaignId && !saved} dirty={!saved && Boolean(campaignId || surfaceKey || place || subscriber || placeIds.length || JSON.stringify(values) !== JSON.stringify(initialValues))} saving={busy} error={error} disabled={locked || step !== 'money'} disabledReason={step !== 'money' ? copy('Review the recorded agreement before saving.') : undefined} form="campaign-form" primaryLabel={copy(campaignId ? 'Save campaign' : alwaysOn ? 'Create always-on promotion' : 'Create campaign')} cancelHref="/dashboard/ads/campaigns" />
    </form>}
  </div>;
}
