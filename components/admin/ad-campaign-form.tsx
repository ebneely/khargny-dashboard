'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useRouter } from '@/lib/dash-router';
import { AdsPlaceChoices } from './ads-record-pickers';
import { RecordCell } from './record-cell';
import { DateField } from './date-field';
import { PresetChoices } from './preset-choices';
import { Field, LoadingState, RequestError } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adminApi } from '@/lib/api/admin-client';
import { loadInsightOptions } from '@/lib/api/search-insights';
import { loadHype } from '@/lib/api/numbers';
import { adsError, validAdsRange } from '@/lib/ads-round7b';
import { cairoDate, type PlaceDetailResponse } from '@/lib/api/subscribers';
import type { AdminPlace } from '@/lib/api/types';
import type { AdCampaign, AdPlaceSummary } from '@/lib/api/ads';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { placeCover } from '@/lib/place-list';
import { localeFor } from '@/lib/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Target = 'featured' | 'city' | 'area' | 'category';
type Named = { id: string; name: string; nameEn: string | null };
const STEPS = ['Place', 'Where and to whom', 'Budget and dates', 'Payment and review'] as const;

/**
 * Sell an ad (DIRECTION section 2, "Ads in the dashboard"): place → where and to whom → budget and
 * dates → payment and review. No seat picker and no availability: the backend never refuses an
 * ad for lack of space. Change (`campaignId`) is the same form, the target frozen once it started.
 */
export function AdCampaignForm(props: { campaignId?: string; initialPlaceId?: string; canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><SellFlow {...props} /></React.Suspense>;
}

function SellFlow({ campaignId, initialPlaceId, canWrite }: { campaignId?: string; initialPlaceId?: string; canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick, lang } = useDashboardLang();
  const router = useRouter();
  const today = cairoDate();
  const n = (value: number) => value.toLocaleString(localeFor(lang));
  const [step, setStep] = React.useState(0);
  const [place, setPlace] = React.useState<AdminPlace | null>(null);
  const [campaign, setCampaign] = React.useState<AdCampaign | null>(null);
  const [target, setTarget] = React.useState<Target>('area');
  const [cityOnly, setCityOnly] = React.useState(true);
  const [values, setValues] = React.useState({ amount: '', startDate: today, endDate: shiftCalendarDays(today, 29), advertiserName: '', advertiserPhone: '', notes: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const placeDetail = React.useCallback(async (id: string) => {
    const response = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${encodeURIComponent(id)}`);
    return 'place' in response ? response.place : response;
  }, []);
  const load = React.useCallback(async () => {
    const [cities, categories] = await Promise.all([loadInsightOptions<Named>('/v1/admin/cities'), loadInsightOptions<Named & { nameAr?: string }>('/v1/admin/categories')]);
    if (campaignId) {
      const row = await adminApi.get<AdCampaign>(`/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}`);
      setCampaign(row); setPlace(await placeDetail(row.placeId));
      setTarget(['featured', 'city', 'area', 'category'].includes(row.placement) ? row.placement as Target : 'featured');
      setCityOnly(Boolean(row.cityId));
      setValues({ amount: String(row.amountPaid), startDate: row.startDate, endDate: row.endDate ?? shiftCalendarDays(row.startDate, 29), advertiserName: row.advertiserName, advertiserPhone: row.advertiserPhone ?? '', notes: row.notes ?? '' });
      setStep(1);
    } else if (initialPlaceId) { setPlace(await placeDetail(initialPlaceId)); setStep(1); }
    return { cities, categories };
  }, [campaignId, initialPlaceId, placeDetail, setCampaign, setPlace, setTarget, setCityOnly, setValues, setStep]);
  const lists = useSubscriberResource(load);
  const choosePlace = async (summary: AdPlaceSummary) => { setError(''); try { const row = await placeDetail(summary.id); setPlace(row); setTarget(row.region ? 'area' : 'city'); } catch (caught) { setError(copy(adsError(caught))); } };

  const city = lists.data?.cities.find((row) => row.id === place?.cityId);
  const category = lists.data?.categories.find((row) => row.id === place?.categoryId);
  const cityName = city ? pick(city.name, city.nameEn) : copy('its city');
  const categoryName = category ? pick(category.nameAr ?? category.name, category.nameEn) : copy('its category');
  const area = place?.region ?? '';
  const where: Record<Target, [string, string]> = {
    featured: [copy('Everyone in Egypt'), copy('Shown to people anywhere, in the home feed.')],
    city: [`${copy('People in')} ${cityName}`, copy('Shown to people looking at places in this city.')],
    area: [`${copy('People in')} ${area || copy('its area')}, ${cityName}`, copy('Shown to people looking at this area: the closest match.')],
    category: [`${copy('People looking for')} ${categoryName}`, copy('Shown among places of the same kind.')],
  };
  const started = Boolean(campaign && campaign.state !== 'scheduled');

  // Expected reach, only from real numbers: the last 30 days of views on the target's places.
  const reachLoad = React.useCallback(async () => {
    if (step !== 3 || (target !== 'area' && target !== 'category')) return null;
    const { items } = await loadHype('30d', target);
    const key = target === 'area' ? area : place?.categoryId;
    return items.find((item) => item.id === key || item.name === key || item.nameEn === key)?.views ?? null;
  }, [step, target, area, place?.categoryId]);
  const reach = useSubscriberResource(reachLoad);

  const days = validAdsRange(values.startDate, values.endDate, 366) ? Math.round((Date.parse(values.endDate) - Date.parse(values.startDate)) / 86_400_000) + 1 : 0;
  const amount = Number(values.amount);
  const stepError = [
    !place ? 'Choose the place to promote.' : '',
    target === 'area' && !area ? 'This place has no area yet: choose its city or category.' : '',
    !days ? 'Choose a start and an end date, up to a year.' : !values.amount.trim() || !Number.isFinite(amount) || amount < 0 ? 'Write the amount for the whole period.' : '',
    !values.advertiserName.trim() ? 'Write who pays for the ad.' : '',
  ];
  const next = () => { const problem = stepError[step]; if (problem) { setError(copy(problem)); return; } setError(''); setStep(step + 1); };
  const sell = async () => {
    const problem = stepError.find(Boolean);
    if (problem || !place) { setError(copy(problem || 'Choose the place to promote.')); return; }
    setBusy(true); setError('');
    const body = {
      placement: target,
      cityId: target === 'city' || target === 'area' || (target === 'category' && cityOnly) ? place.cityId : null,
      areaKey: target === 'area' ? area : null,
      categoryId: target === 'category' ? place.categoryId : null,
      advertiserName: values.advertiserName.trim(), advertiserPhone: values.advertiserPhone.trim() || undefined,
      amountPaid: amount, currency: 'EGP', startDate: values.startDate, endDate: values.endDate, notes: values.notes.trim() || undefined,
    };
    try {
      // The API's `warnings` speak of slots; seats are gone, so they are not shown.
      if (campaignId) await adminApi.patch(`/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}`, started ? { amountPaid: body.amountPaid, endDate: body.endDate, advertiserName: body.advertiserName, advertiserPhone: body.advertiserPhone, notes: body.notes } : body);
      else await adminApi.post('/v1/admin/ads/campaigns', { ...body, placeId: place.id });
      toast.success(copy(campaignId ? 'Saved. The ad keeps running with the new terms.' : 'Sold. The ad starts on its first day.'));
      router.push('/dashboard/money/ads');
    } catch (caught) { setError(copy(adsError(caught))); }
    finally { setBusy(false); }
  };
  const set = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const locked = !canWrite || busy;

  return <div className="mx-auto max-w-3xl space-y-6">
    <header><h1 className="font-display text-2xl font-semibold">{copy(campaignId ? 'Change this ad' : 'Sell an ad')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('Four steps. Nothing is saved before the last one.')}</p></header>
    <ol className="flex flex-wrap gap-2" aria-label={copy('Steps')}>{STEPS.map((label, at) => <li key={label} aria-current={at === step ? 'step' : undefined} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium', at === step ? 'bg-primary text-primary-foreground' : at < step ? 'bg-brand-50 text-primary' : 'bg-muted text-muted-foreground')}>{at < step ? <Check className="size-3.5" aria-hidden="true" /> : <span className="tabular-nums">{n(at + 1)}</span>}{copy(label)}</li>)}</ol>
    {lists.loading ? <LoadingState /> : lists.error ? <RequestError message={copy('Could not load this ad.')} retry={() => { void lists.refetch(); }} /> : <Card><CardHeader><CardTitle>{copy(STEPS[step])}</CardTitle></CardHeader><CardContent className="space-y-4">
      {step === 0 && <>{place && <RecordCell nameAr={place.name} nameEn={place.nameEn ?? null} thumbnail={placeCover(place)} />}<AdsPlaceChoices selected={place ? [place.id] : []} disabled={locked || Boolean(campaignId)} onChange={(summary) => { void choosePlace(summary); }} /></>}
      {step === 1 && <>{started && <p className="text-sm text-muted-foreground">{copy('This ad has started, so where it shows stays as it is.')}</p>}
        <div role="radiogroup" aria-label={copy('Where and to whom')} className="grid gap-2">{(['featured', 'city', 'area', 'category'] as Target[]).map((option) => <button key={option} type="button" role="radio" aria-checked={target === option} disabled={locked || started || (option === 'area' && !area)} onClick={() => setTarget(option)}
          className={cn('flex items-start gap-3 rounded-xl border p-3 text-start transition-colors disabled:opacity-50', target === option ? 'border-primary bg-brand-50' : 'border-border hover:bg-muted')}>
          <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', target === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{target === option && <Check className="size-3" aria-hidden="true" />}</span>
          <span><span className="block text-sm font-medium">{where[option][0]}</span><span className="block text-sm text-muted-foreground">{where[option][1]}</span></span>
        </button>)}</div>
        {target === 'category' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={cityOnly} disabled={locked || started} onChange={(event) => setCityOnly(event.target.checked)} />{copy('Only in')} {cityName}</label>}
      </>}
      {step === 2 && <>
        <PresetChoices label={copy('How long')} value={null} disabled={locked} options={[7, 14, 30].map((d) => ({ value: String(d), label: `${n(d)} ${copy('days')}` }))} onValueChange={(d) => set('endDate', shiftCalendarDays(values.startDate, Number(d) - 1))} />
        <div className="grid gap-4 sm:grid-cols-2"><Field label={copy('First day')}><DateField disabled={locked || started} value={values.startDate} onChange={(value) => set('startDate', value)} /></Field><Field label={copy('Last day')}><DateField disabled={locked} value={values.endDate} min={values.startDate} onChange={(value) => set('endDate', value)} /></Field></div>
        <Field label={copy('Amount for the whole period (EGP)')}><Input className="max-w-60" inputMode="decimal" type="number" min="0" step="0.01" value={values.amount} disabled={locked} onChange={(event) => set('amount', event.target.value)} /></Field>
        {days > 0 && amount > 0 && <p className="text-sm">{n(days)} {copy('days')}: {n(Math.round(amount / days * 100) / 100)} {copy('EGP a day')}</p>}
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{copy('Paying per 1,000 shows, per tap, or a monthly package comes with the shared ad pool. Today an ad is one amount for its dates.')}</p>
      </>}
      {step === 3 && <>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={copy('Who pays')}><Input value={values.advertiserName} maxLength={120} disabled={locked} onChange={(event) => set('advertiserName', event.target.value)} /></Field><Field label={copy('Phone')} optional><Input type="tel" dir="ltr" value={values.advertiserPhone} maxLength={40} disabled={locked} onChange={(event) => set('advertiserPhone', event.target.value)} /></Field></div>
        <Field label={copy('Notes')} optional><Input value={values.notes} maxLength={2000} disabled={locked} onChange={(event) => set('notes', event.target.value)} /></Field>
        <p className="text-sm text-muted-foreground">{copy('This records an offline agreement, not cash received.')}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">{copy('Place')}</dt><dd dir="auto">{place ? pick(place.name, place.nameEn ?? null) : '—'}</dd>
          <dt className="text-muted-foreground">{copy('Shown to')}</dt><dd>{where[target][0]}{target === 'category' && cityOnly ? `, ${cityName}` : ''}</dd>
          <dt className="text-muted-foreground">{copy('Dates')}</dt><dd className="tabular-nums">{values.startDate} — {values.endDate} ({n(days)} {copy('days')})</dd>
          <dt className="text-muted-foreground">{copy('Amount')}</dt><dd className="tabular-nums">{values.amount ? `${n(amount)} EGP` : '—'}</dd>
          <dt className="text-muted-foreground">{copy('Expected reach')}</dt><dd>{target === 'area' || target === 'category' ? reach.loading ? '…' : reach.data != null ? `${copy('Last 30 days, places here were opened')} ${n(reach.data)} ${copy('times')}.` : copy('Too few views here in the last 30 days to say.') : copy('No estimate for this target yet.')}</dd>
        </dl>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => (step === 0 || (campaignId && step === 1) ? router.push('/dashboard/money/ads') : (setError(''), setStep(step - 1)))}>{copy(step === 0 || (campaignId && step === 1) ? 'Cancel' : 'Back')}</Button>
        {step < 3 ? <Button type="button" disabled={locked} onClick={next}>{copy('Next')}</Button> : <Button type="button" disabled={locked} onClick={() => { void sell(); }}>{copy(busy ? 'Saving…' : campaignId ? 'Save the changes' : 'Sell the ad')}</Button>}
      </div>
    </CardContent></Card>}
  </div>;
}
