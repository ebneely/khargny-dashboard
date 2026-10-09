'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { AdPlacePicker } from './ad-place-picker';
import { AdSubscriberPicker } from './ad-subscriber-picker';
import { AdBookedCapacity } from './ad-booked-capacity';
import { AdsPageHeader } from './ads-page-header';
import { AdStateBadge } from './ad-state-badge';
import { DateField } from './date-field';
import { PresetChoices } from './preset-choices';
import { SegmentedControl } from './segmented-control';
import { DashboardText, useDashboardCopy } from './dashboard-text';
import { FormActionBar } from './form-action-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi, toList } from '@/lib/api/admin-client';
import { useFormChanges } from '@/lib/use-form-changes';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { type PlaceDetailResponse, cairoDate } from '@/lib/api/subscribers';
import { subscriptionEnd, isCalendarDate } from '@/lib/subscription-calendar';
import { campaignErrors, campaignPayload, type CampaignValues, type CampaignStep } from '@/lib/ads-round5';
import type { AdCampaign, AdCampaignMutation, AdCitySummary, AdPlacement, AdPlaceSummary } from '@/lib/api/ads';

const EMPTY_FORM: CampaignValues = { placeId: '', placement: 'featured', cityId: '', startDate: '', endDate: '', advertiserName: '', advertiserPhone: '', amountPaid: '0', currency: 'EGP', notes: '' };
const STEPS: { value: CampaignStep; label: string }[] = [{ value: 'who', label: 'Who' }, { value: 'where', label: 'Where' }, { value: 'when', label: 'When' }, { value: 'money', label: 'Money' }];
function campaignValues(campaign: AdCampaign): CampaignValues {
  return { placeId: campaign.placeId, placement: campaign.placement, cityId: campaign.cityId ?? '', startDate: campaign.startDate, endDate: campaign.endDate, advertiserName: campaign.advertiserName, advertiserPhone: campaign.advertiserPhone ?? '', amountPaid: String(campaign.amountPaid), currency: campaign.currency, notes: campaign.notes ?? '' };
}

export function AdCampaignForm({ campaignId, initialPlaceId, canWrite }: { campaignId?: string; initialPlaceId?: string; canWrite: boolean }) {
  const router = useRouter();
  const copy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
  const editing = Boolean(campaignId);
  const [campaign, setCampaign] = React.useState<AdCampaign | null>(null);
  const [selectedPlace, setSelectedPlace] = React.useState<AdPlaceSummary | null>(null);
  const [cities, setCities] = React.useState<AdCitySummary[]>([]);
  const [values, setValues] = React.useState<CampaignValues>(EMPTY_FORM);
  const [step, setStep] = React.useState<CampaignStep>('who');
  const [source, setSource] = React.useState('place');
  const [preset, setPreset] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const submitting = React.useRef(false);
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cityResponse, loadedCampaign] = await Promise.all([adminApi.get<unknown>('/v1/admin/cities', { status: 'active', limit: 100 }), campaignId ? adminApi.get<AdCampaign>(`/v1/admin/ads/campaigns/${campaignId}`) : Promise.resolve(null)]);
      setLoadFailed(false);
      setCities(toList<AdCitySummary>(cityResponse).items);
      if (!loadedCampaign && initialPlaceId) {
        const response = await adminApi.get<PlaceDetailResponse>('/v1/admin/places/' + encodeURIComponent(initialPlaceId));
        const place = 'place' in response ? response.place : response;
        setSelectedPlace({ ...place, rating: String(place.rating), coverImage: place.coverImage ?? null });
        setValues((current) => ({ ...current, placeId: place.id }));
      }
      if (loadedCampaign) { setCampaign(loadedCampaign); setSelectedPlace(loadedCampaign.place); setValues(campaignValues(loadedCampaign)); }
    } catch { setLoadFailed(true); setError(copy('Could not load campaign details.')); }
    finally { setLoading(false); }
  }, [campaignId, initialPlaceId, copy]);
  React.useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const setField = <Key extends keyof CampaignValues>(key: Key, value: CampaignValues[Key]) => { setValues((current) => ({ ...current, [key]: value })); setError(null); };
  const choosePlace = (place: AdPlaceSummary | null) => { setSelectedPlace(place); setField('placeId', place?.id ?? ''); if (values.placement === 'top10' && values.cityId && place?.cityId !== values.cityId) setField('cityId', ''); };
  const formChanges = useFormChanges(values, campaign ? campaignValues(campaign) : EMPTY_FORM);
  const targetingLocked = editing && campaign?.state !== 'scheduled';
  const errors = campaignErrors(values, selectedPlace?.cityId);
  const next = () => {
    setShowErrors(true);
    if (errors.some((entry) => entry.step === step)) return;
    setStep(STEPS[Math.min(3, STEPS.findIndex((entry) => entry.value === step) + 1)].value);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || loadFailed || submitting.current || createdId || loading) return;
    setShowErrors(true);
    if (errors.length) { setStep(errors[0].step); return; }
    if (!editing && step !== 'money') { next(); return; }
    submitting.current = true; setSaving(true); setError(null); setWarnings([]);
    try {
      const body = campaignPayload(values, editing);
      const result = campaignId ? await adminApi.patch<AdCampaignMutation>(`/v1/admin/ads/campaigns/${campaignId}`, body) : await adminApi.post<AdCampaignMutation>('/v1/admin/ads/campaigns', body);
      const nextWarnings = result.warnings ?? [];
      setWarnings(nextWarnings); setCampaign(result); setSelectedPlace(result.place);
      if (campaignId) { toast.success(copy('Campaign saved.')); router.refresh(); }
      else if (nextWarnings.length) { setCreatedId(result.id); toast.success(copy('Campaign created with capacity warnings.')); }
      else { toast.success(copy('Campaign created.')); router.push(`/dashboard/ads/${result.id}`); }
      formChanges.markSaved();
    } catch { setError(copy(editing ? 'Could not save the campaign.' : 'Could not create the campaign.')); }
    finally { submitting.current = false; setSaving(false); }
  };
  const summary = copy('Promote {place} on {surface} in {scope}, {from} to {to}, for {money}.').replace('{place}', selectedPlace ? pick(selectedPlace.name, selectedPlace.nameEn) : copy('Choose a place')).replace('{surface}', copy(values.placement === 'featured' ? 'Home Featured rail' : 'City Top 10')).replace('{scope}', values.cityId ? pick(cities.find((city) => city.id === values.cityId)?.name, cities.find((city) => city.id === values.cityId)?.nameEn) : copy('All Egypt')).replace('{from}', values.startDate).replace('{to}', values.endDate).replace('{money}', `${values.amountPaid} ${values.currency}`);
  const panel = (value: CampaignStep, children: React.ReactNode) => {
    const card = <Card><CardHeader><CardTitle>{copy(STEPS.find((entry) => entry.value === value)!.label)}</CardTitle></CardHeader><CardContent className="space-y-5">{showErrors && errors.filter((entry) => entry.step === value).map((entry) => <p key={entry.message} className="text-sm text-destructive" role="alert">{copy(entry.message)}</p>)}{children}</CardContent></Card>;
    return editing ? card : <TabsContent value={value} keepMounted>{card}</TabsContent>;
  };
  return <div>
    <AdsPageHeader title={editing ? 'Edit campaign' : 'New campaign'} description={editing ? 'Update the booked promotion and advertiser details.' : 'Choose who, where, when and money before booking.'} form actions={campaignId ? [{ label: 'Open report', href: `/dashboard/ads/${campaignId}/report`, readOnly: true, icon: <FileText className="size-4" aria-hidden="true" /> }] : undefined} />
    {loading ? <div className="space-y-3" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div> : editing && !campaign ? <Card><CardContent><p role="alert" className="mb-3 text-sm text-destructive">{error ?? copy('Campaign not found.')}</p><Button data-ro-allow="true" variant="outline" onClick={() => { void load(); }}>{copy('Retry')}</Button></CardContent></Card> : <form id="campaign-form" onSubmit={submit} noValidate className="space-y-5">
      {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button data-ro-allow="true" variant="outline" onClick={() => { void load(); }}>{copy('Retry')}</Button></div>}
      {campaign && <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-4"><AdStateBadge state={campaign.state} /><span className="text-sm text-muted-foreground">{copy('Campaign targeting can only change while scheduled.')}</span></div>}
      {targetingLocked && <p className="flex gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />{copy('Place, surface and city are locked because this campaign is no longer scheduled.')}</p>}
      {warnings.length > 0 && <div role="status" className="rounded-lg bg-warning-bg p-4 text-warning"><p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" aria-hidden="true" />{copy('Capacity warning')}</p><ul className="mt-2 list-inside list-disc text-sm">{warnings.map((warning) => <li key={warning}>{copy(warning)}</li>)}</ul><p className="mt-2 text-sm">{copy('The booking is saved. Oversold campaigns rotate fairly.')}</p></div>}
      {createdId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success-bg p-4 text-success"><span className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" aria-hidden="true" />{copy('Campaign created.')}</span><Button type="button" variant="outline" nativeButton={false} render={<Link href={`/dashboard/ads/${createdId}`} />}>{copy('Open campaign')}</Button></div>}
      <Tabs value={step} onValueChange={(value) => setStep(value as CampaignStep)} className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {!editing && <TabsList aria-label={copy('Campaign steps')}>{STEPS.map((entry, index) => <TabsTrigger key={entry.value} value={entry.value} className={showErrors && errors.some((error) => error.step === entry.value) ? 'text-destructive' : undefined}>{new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(index + 1)} · {copy(entry.label)}{showErrors && errors.some((error) => error.step === entry.value) && <AlertTriangle className="size-4" aria-label={copy('Needs attention')} />}</TabsTrigger>)}</TabsList>}
        {panel('who', <fieldset disabled={!canWrite || loadFailed || saving || targetingLocked || Boolean(createdId)} className="space-y-5">
          {!editing && <SegmentedControl label="Choose who to promote" value={source} options={[{ value: 'place', label: 'A place' }, { value: 'subscriber', label: 'A subscriber’s place' }]} onValueChange={(value) => { setSource(value); choosePlace(null); }} />}
          {source === 'subscriber' && !editing ? <AdSubscriberPicker disabled={!canWrite || loadFailed || saving || Boolean(createdId)} onChange={choosePlace} onSubscriber={(name) => { if (!values.advertiserName) setField('advertiserName', name); }} /> : <Field label="Place" htmlFor="ad-place-search"><AdPlacePicker value={values.placeId} selectedPlace={selectedPlace} onChange={choosePlace} disabled={!canWrite || loadFailed || saving || targetingLocked || Boolean(createdId)} /></Field>}
        </fieldset>)}
        {panel('where', <fieldset disabled={!canWrite || loadFailed || saving || targetingLocked || Boolean(createdId)} className="grid gap-5 md:grid-cols-2">
          <Field label="Where it appears" htmlFor="campaign-placement"><Select value={values.placement} disabled={!canWrite || loadFailed || saving || targetingLocked || Boolean(createdId)} onValueChange={(value) => { if (value) { setField('placement', value as AdPlacement); if (value === 'featured') setField('cityId', ''); } }}><SelectTrigger id="campaign-placement" className="min-h-11 w-full"><SelectValue>{copy(values.placement === 'featured' ? 'Home Featured rail' : 'City Top 10')}</SelectValue></SelectTrigger><SelectContent><SelectItem value="featured">{copy('Home Featured rail')}</SelectItem><SelectItem value="top10">{copy('City Top 10')}</SelectItem></SelectContent></Select></Field>
          {values.placement === 'top10' ? <Field label="Top 10 city" htmlFor="ad-city" hint="Leave as All Egypt for the national list."><Select value={values.cityId || 'all'} disabled={!canWrite || loadFailed || saving || targetingLocked || Boolean(createdId)} onValueChange={(value) => { if (value) setField('cityId', value === 'all' ? '' : value); }}><SelectTrigger id="ad-city" className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{copy('All Egypt')}</SelectItem>{cities.map((city) => <SelectItem key={city.id} value={city.id}>{pick(city.name, city.nameEn)}</SelectItem>)}</SelectContent></Select></Field> : <p className="text-sm text-muted-foreground">{copy('Featured appears across all Egypt.')}</p>}
        </fieldset>)}
        {panel('when', <><fieldset disabled={!canWrite || loadFailed || saving || Boolean(createdId)} className="space-y-5"><PresetChoices label={copy('Campaign length')} value={preset} disabled={!canWrite || loadFailed || saving || Boolean(createdId)} options={[{ value: '7', label: copy('7 days') }, { value: '14', label: copy('14 days') }, { value: '30', label: copy('30 days') }]} onValueChange={(value) => { const start = isCalendarDate(values.startDate) ? values.startDate : cairoDate(); setValues((current) => ({ ...current, startDate: start, endDate: subscriptionEnd(start, { days: Number(value) }) })); setPreset(value); }} /><div className="grid gap-5 md:grid-cols-2"><Field label="Start date" htmlFor="ad-start" hint="Calendar dates are inclusive in Africa/Cairo."><DateField id="ad-start" value={values.startDate} onChange={(value) => { setField('startDate', value); setPreset(null); }} required /></Field><Field label="End date" htmlFor="ad-end"><DateField id="ad-end" value={values.endDate} min={isCalendarDate(values.startDate) ? values.startDate : undefined} onChange={(value) => { setField('endDate', value); setPreset(null); }} required /></Field></div></fieldset>{(editing || step === 'when') && <AdBookedCapacity from={values.startDate} to={values.endDate} placement={values.placement} cityId={values.placement === 'top10' ? values.cityId || null : null} />}</>)}
        {panel('money', <><fieldset disabled={!canWrite || loadFailed || saving || Boolean(createdId)} className="grid gap-5 md:grid-cols-2"><Field label="Advertiser name" htmlFor="ad-advertiser"><Input id="ad-advertiser" value={values.advertiserName} onChange={(event) => setField('advertiserName', event.target.value)} maxLength={120} required /></Field><Field label="Advertiser phone" htmlFor="ad-phone" hint="Optional; stored for the admin team only."><Input id="ad-phone" type="tel" dir="ltr" value={values.advertiserPhone} onChange={(event) => setField('advertiserPhone', event.target.value)} maxLength={40} /></Field><Field label="Amount paid" htmlFor="ad-amount"><Input id="ad-amount" type="number" min="0" step="0.01" value={values.amountPaid} onChange={(event) => setField('amountPaid', event.target.value)} required /></Field><Field label="Currency" htmlFor="ad-currency"><Input id="ad-currency" value={values.currency} onChange={(event) => setField('currency', event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} minLength={3} maxLength={3} required /></Field><Field label="Notes" htmlFor="ad-notes" hint="Optional internal notes; maximum 2,000 characters." className="md:col-span-2"><textarea id="ad-notes" value={values.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} rows={5} className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-ring" /></Field></fieldset>
          <p className="rounded-lg bg-muted p-4 text-sm" aria-live="polite">{summary}</p>
        </>)}
      </Tabs>
      {!editing && step !== 'money' && <Button type="button" variant="outline" onClick={next} disabled={saving || Boolean(createdId)}>{copy('Next step')}</Button>}
      {canWrite && <FormActionBar form="campaign-form" dirty={formChanges.dirty} saving={saving} error={error} disabled={loadFailed || Boolean(createdId) || (!editing && step !== 'money')} cancelHref="/dashboard/ads/campaigns" primaryLabel={copy(editing ? 'Save changes' : 'Create campaign')} />}
    </form>}
  </div>;
}

function Field({ label, htmlFor, hint, className, children }: { label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label htmlFor={htmlFor}><DashboardText>{label}</DashboardText></Label><div className="mt-2">{children}</div>{hint && <p className="mt-1.5 text-sm text-muted-foreground"><DashboardText>{hint}</DashboardText></p>}</div>;
}
