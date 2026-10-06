'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { AdPlacePicker } from '@/components/admin/ad-place-picker';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { AdStateBadge } from '@/components/admin/ad-state-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi, toList } from '@/lib/api/admin-client';
import {
  displayName,
  type AdCampaign,
  type AdCampaignInput,
  type AdCampaignMutation,
  type AdCitySummary,
  type AdPlacement,
  type AdPlaceSummary,
} from '@/lib/api/ads';

type FormValues = {
  placeId: string;
  placement: AdPlacement;
  cityId: string;
  startDate: string;
  endDate: string;
  advertiserName: string;
  advertiserPhone: string;
  amountPaid: string;
  currency: string;
  notes: string;
};

const EMPTY_FORM: FormValues = {
  placeId: '',
  placement: 'featured',
  cityId: '',
  startDate: '',
  endDate: '',
  advertiserName: '',
  advertiserPhone: '',
  amountPaid: '0',
  currency: 'EGP',
  notes: '',
};

export function AdCampaignForm({ campaignId, canWrite }: { campaignId?: string; canWrite: boolean }) {
  const router = useRouter();
  const editing = Boolean(campaignId);
  const [campaign, setCampaign] = React.useState<AdCampaign | null>(null);
  const [selectedPlace, setSelectedPlace] = React.useState<AdPlaceSummary | null>(null);
  const [cities, setCities] = React.useState<AdCitySummary[]>([]);
  const [values, setValues] = React.useState<FormValues>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requests: [Promise<unknown>, Promise<AdCampaign>?] = [
        adminApi.get<unknown>('/v1/admin/cities', { status: 'active', limit: 100 }),
      ];
      if (campaignId) requests.push(adminApi.get<AdCampaign>(`/v1/admin/ads/campaigns/${campaignId}`));
      const [cityResponse, loadedCampaign] = await Promise.all(requests);
      setCities(toList<AdCitySummary>(cityResponse).items);
      if (loadedCampaign) {
        setCampaign(loadedCampaign);
        setSelectedPlace(loadedCampaign.place);
        setValues({
          placeId: loadedCampaign.placeId,
          placement: loadedCampaign.placement,
          cityId: loadedCampaign.cityId ?? '',
          startDate: loadedCampaign.startDate,
          endDate: loadedCampaign.endDate,
          advertiserName: loadedCampaign.advertiserName,
          advertiserPhone: loadedCampaign.advertiserPhone ?? '',
          amountPaid: String(loadedCampaign.amountPaid),
          currency: loadedCampaign.currency,
          notes: loadedCampaign.notes ?? '',
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load campaign details.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setField = <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const targetingLocked = editing && campaign?.state !== 'scheduled';

  const validate = (): string | null => {
    if (!values.placeId) return 'Choose a place.';
    if (!values.advertiserName.trim()) return 'Enter the advertiser name.';
    if (!values.startDate || !values.endDate) return 'Choose both booking dates.';
    if (values.endDate < values.startDate) return 'End date must be on or after the start date.';
    if (values.placement === 'top10' && values.cityId && selectedPlace?.cityId !== values.cityId) {
      return 'For a city Top 10 campaign, choose the place’s own city.';
    }
    const amount = Number(values.amountPaid);
    if (!Number.isFinite(amount) || amount < 0) return 'Amount paid must be zero or more.';
    if (!/^[A-Z]{3}$/.test(values.currency)) return 'Currency must be three uppercase letters.';
    return null;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || saving || createdId) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const body: AdCampaignInput = {
      placeId: values.placeId,
      placement: values.placement,
      cityId: values.placement === 'top10' ? values.cityId || null : null,
      startDate: values.startDate,
      endDate: values.endDate,
      advertiserName: values.advertiserName.trim(),
      advertiserPhone: editing ? values.advertiserPhone.trim() : values.advertiserPhone.trim() || undefined,
      amountPaid: Number(values.amountPaid),
      currency: values.currency,
      notes: editing ? values.notes.trim() : values.notes.trim() || undefined,
    };

    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const result = campaignId
        ? await adminApi.patch<AdCampaignMutation>(`/v1/admin/ads/campaigns/${campaignId}`, body)
        : await adminApi.post<AdCampaignMutation>('/v1/admin/ads/campaigns', body);
      const nextWarnings = result.warnings ?? [];
      setWarnings(nextWarnings);
      setCampaign(result);
      setSelectedPlace(result.place);
      if (campaignId) {
        toast.success('Campaign saved.');
        router.refresh();
      } else if (nextWarnings.length > 0) {
        setCreatedId(result.id);
        toast.success('Campaign created with inventory warnings.');
      } else {
        toast.success('Campaign created.');
        router.push(`/dashboard/ads/${result.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not ${editing ? 'save' : 'create'} the campaign.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AdsPageHeader title={editing ? 'Edit campaign' : 'New campaign'} description="Loading booking details…" />
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  if (editing && !campaign) {
    return (
      <div>
        <AdsPageHeader title="Edit campaign" description="Review and update a booked placement." />
        <Card><CardContent className="py-10 text-center">
          <p className="mb-3 text-sm text-destructive" role="alert">{error ?? 'Campaign not found.'}</p>
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <AdsPageHeader
        title={editing ? 'Edit campaign' : 'New campaign'}
        description={editing ? 'Update the booking record and advertiser details.' : 'Book a Featured or Top 10 placement for an active place.'}
        actions={campaignId ? (
          <Button render={<Link href={`/dashboard/ads/${campaignId}/report`} />} variant="outline">
            <FileText className="size-4" />Open report
          </Button>
        ) : undefined}
      />

      <form onSubmit={submit} noValidate className="space-y-5">
        {campaign && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <AdStateBadge state={campaign.state} />
            <span className="text-sm text-muted-foreground">Campaign targeting can only change while scheduled.</span>
          </div>
        )}

        {targetingLocked && (
          <div className="flex gap-3 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Place, placement and city are locked because this campaign is no longer scheduled.
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-lg border border-warning bg-warning-bg p-4 text-warning" role="status">
            <div className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" aria-hidden="true" />Inventory warning</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
            <p className="mt-2 text-sm">The booking is saved. Oversold campaigns rotate fairly.</p>
          </div>
        )}

        {createdId && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-success-bg px-4 py-3 text-success">
            <span className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4" />Campaign created.</span>
            <Button render={<Link href={`/dashboard/ads/${createdId}`} />} type="button" variant="outline" size="sm">Open campaign</Button>
          </div>
        )}

        {error && <p className="rounded-lg border border-destructive/20 bg-error-bg px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

        <Card>
          <CardHeader><CardTitle>Placement</CardTitle></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Place" htmlFor="ad-place-search" className="md:col-span-2">
              <AdPlacePicker
                value={values.placeId}
                selectedPlace={selectedPlace}
                onChange={(place) => {
                  setSelectedPlace(place);
                  setField('placeId', place?.id ?? '');
                  if (values.placement === 'top10' && values.cityId && place?.cityId !== values.cityId) setField('cityId', '');
                }}
                disabled={targetingLocked}
              />
            </Field>
            <Field label="Placement" htmlFor="ad-placement">
              <Select
                value={values.placement}
                onValueChange={(value) => {
                  if (value) {
                    setField('placement', value as AdPlacement);
                    if (value === 'featured') setField('cityId', '');
                  }
                }}
                disabled={targetingLocked}
              >
                <SelectTrigger id="ad-placement" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured · national</SelectItem>
                  <SelectItem value="top10">Top 10</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {values.placement === 'top10' && (
              <Field label="Top 10 city" htmlFor="ad-city" hint="Leave as All Egypt for the national list.">
                <Select value={values.cityId || 'all'} onValueChange={(value) => value && setField('cityId', value === 'all' ? '' : value)} disabled={targetingLocked}>
                  <SelectTrigger id="ad-city" className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Egypt</SelectItem>
                    {cities.map((city) => <SelectItem key={city.id} value={city.id}>{displayName(city.name, city.nameEn)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Start date" htmlFor="ad-start" hint="Calendar dates are inclusive in Africa/Cairo.">
              <Input id="ad-start" type="date" value={values.startDate} onChange={(event) => setField('startDate', event.target.value)} required />
            </Field>
            <Field label="End date" htmlFor="ad-end">
              <Input id="ad-end" type="date" value={values.endDate} onChange={(event) => setField('endDate', event.target.value)} min={values.startDate || undefined} required />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Advertiser and payment record</CardTitle></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="Advertiser name" htmlFor="ad-advertiser">
              <Input id="ad-advertiser" value={values.advertiserName} onChange={(event) => setField('advertiserName', event.target.value)} maxLength={120} required />
            </Field>
            <Field label="Advertiser phone" htmlFor="ad-phone" hint="Optional; stored for the admin team only.">
              <Input id="ad-phone" type="tel" dir="ltr" value={values.advertiserPhone} onChange={(event) => setField('advertiserPhone', event.target.value)} maxLength={40} />
            </Field>
            <Field label="Amount paid" htmlFor="ad-amount">
              <Input id="ad-amount" type="number" min="0" step="0.01" value={values.amountPaid} onChange={(event) => setField('amountPaid', event.target.value)} required />
            </Field>
            <Field label="Currency" htmlFor="ad-currency">
              <Input id="ad-currency" value={values.currency} onChange={(event) => setField('currency', event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} minLength={3} maxLength={3} required />
            </Field>
            <Field label="Notes" htmlFor="ad-notes" hint="Optional internal notes; maximum 2,000 characters." className="md:col-span-2">
              <textarea
                id="ad-notes"
                value={values.notes}
                onChange={(event) => setField('notes', event.target.value)}
                maxLength={2000}
                rows={5}
                className="w-full resize-y rounded-(--radius-ds-lg) border border-input bg-white px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button render={<Link href="/dashboard/ads" />} type="button" variant="ghost"><ArrowLeft className="size-4" />Back to campaigns</Button>
          <Button type="submit" disabled={!canWrite || saving || Boolean(createdId)}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
