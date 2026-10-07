'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import type { AdPlaceSummary } from '@/lib/api/ads';
import { optionalText, type PlaceDetailResponse, type Subscriber, type SubscriberDetail, type SubscriberPlace } from '@/lib/api/subscribers';
import { consumeSubscriberDraft, sameSubscriberPlaces } from '@/lib/subscriber-draft';
import { AdPlacePicker } from './ad-place-picker';
import { ActionDialog, type ActionSpec, Field, LoadingState, RequestError, SubscriberSelect, subscriberValidation, textareaClass, useSubscriberText } from './subscriber-ui';

export function SubscriberProfileForm({ subscriber, canWrite, onSaved, placesContent }: { subscriber?: SubscriberDetail; canWrite: boolean; onSaved: () => Promise<boolean>; placesContent?: React.ReactNode }) {
  const { text, lang, pick } = useSubscriberText();
  const router = useRouter();
  const formId = React.useId();
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const subscriberId = subscriber?.id;
  const [values, setValues] = React.useState({ name: subscriber?.name ?? '', phone: subscriber?.phone ?? '', whatsapp: subscriber?.whatsapp ?? '', email: subscriber?.email ?? '', notes: subscriber?.notes ?? '', status: subscriber?.status ?? 'active' });
  const [places, setPlaces] = React.useState<SubscriberPlace[]>(subscriber?.places ?? []);
  const [persistedPlaces, setPersistedPlaces] = React.useState<SubscriberPlace[]>(subscriber?.places ?? []);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const roundTrip = React.useRef(false);
  const submitting = React.useRef(false);
  const restoredPlaces = React.useRef<SubscriberPlace[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [placeError, setPlaceError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [placesSaved, setPlacesSaved] = React.useState(false);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [returnLoading, setReturnLoading] = React.useState(false);
  const draftLoaded = React.useRef(false);
  const [returnRetry, setReturnRetry] = React.useState(0);
  const [returnFailed, setReturnFailed] = React.useState(false);
  const draftKey = `subscriber-draft:${subscriber?.id ?? 'new'}`;
  const returnTo = `/dashboard/subscribers/${subscriber?.id ?? 'new'}`;
  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams(window.location.search);
      const linkedPlace = params.get('linkedPlace');
      try {
        if (!draftLoaded.current) {
          const parsed = consumeSubscriberDraft<{ values: typeof values; places: SubscriberPlace[] }>(window.sessionStorage, draftKey, params.get('placeReturn'));
          if (parsed && active && canWrite) {
            setValues(parsed.values); setPlaces(parsed.places);
            restoredPlaces.current = parsed.places;
          }
          draftLoaded.current = true;
        }
        if (linkedPlace && /^[a-f0-9-]{36}$/.test(linkedPlace)) {
          setReturnFailed(false);
          setReturnLoading(true);
          const response = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${linkedPlace}`);
          const place = 'place' in response ? response.place : response;
          if (!active) return;
          if (subscriberId && canWrite) {
            const current = await adminApi.get<SubscriberDetail>(`/v1/admin/subscribers/${subscriberId}`);
            if (!active) return;
            const placeIds = Array.from(new Set([...current.places.map((entry) => entry.id), place.id]));
            const updated = await adminApi.put<Subscriber>(`/v1/admin/subscribers/${subscriberId}/places`, { placeIds });
            if (!active) return;
            const selected = restoredPlaces.current ?? current.places;
            const displayed = selected.some((entry) => entry.id === place.id) ? selected : [...selected, place];
            setPersistedPlaces(updated.places);
            setPlaces(displayed);
            setPlacesSaved(sameSubscriberPlaces(displayed, updated.places));
          } else {
            setPlaces((current) => current.some((entry) => entry.id === place.id) ? current : [...current, place]);
          }
          if (params.has('placeSetupIncomplete')) setPlaceError(text('Place created, but its media or details need attention. Open Edit place to finish setup.', 'تم إنشاء المكان لكن بعض الوسائط أو التفاصيل لم تُحفظ. افتح تعديل المكان لإكمالها.'));
          router.replace(subscriberId ? `${returnTo}?tab=places` : returnTo, { scroll: false });
          if (subscriberId && canWrite) {
            const refreshed = await onSaved();
            if (!refreshed && active) setPlacesSaved(false);
          }
        } else if (params.has('placeReturn')) {
          router.replace(subscriberId ? `${returnTo}?tab=places` : returnTo, { scroll: false });
        }
      } catch (caught) { if (active) { setPlaceError(subscriberValidation(caught, [], lang).message); setReturnFailed(Boolean(linkedPlace)); } }
      finally { if (active) setReturnLoading(false); }
    }, 0);
    return () => {
      active = false; window.clearTimeout(timer);
      if (!roundTrip.current && draftLoaded.current) { try { window.sessionStorage.removeItem(draftKey); } catch {} }
    };
  }, [draftKey, lang, text, router, returnTo, returnRetry, subscriberId, canWrite, onSaved]);
  const createPlace = () => {
    const token = crypto.randomUUID();
    try { window.sessionStorage.setItem(draftKey, JSON.stringify({ token, draft: { values, places } })); }
    catch { setPlaceError(text('Could not preserve this draft. Save the subscriber before creating a place.', 'تعذر الاحتفاظ بالمسودة. احفظ المشترك قبل إنشاء مكان.')); return; }
    roundTrip.current = true;
    router.push(`/dashboard/places/new?subscriberReturn=${encodeURIComponent(`${returnTo}?placeReturn=${token}`)}`);
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || submitting.current || returnLoading) return;
    submitting.current = true;
    setBusy(true); setError(''); setSaved(false); setFieldErrors({});
    try {
      const { status, ...draft } = values;
      const profile = { ...draft, whatsapp: optionalText(draft.whatsapp), email: optionalText(draft.email), notes: optionalText(draft.notes) };
      if (subscriber) {
        await adminApi.patch<Subscriber>(`/v1/admin/subscribers/${subscriber.id}`, { ...profile, status });
        try { window.sessionStorage.removeItem(draftKey); } catch {}
        const refreshed = await onSaved();
        if (refreshed) { setSaved(true); toast.success(text('Subscriber saved', 'تم حفظ المشترك')); }
      } else {
        const created = await adminApi.post<Subscriber>('/v1/admin/subscribers', {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          whatsapp: profile.whatsapp,
          email: profile.email,
          notes: profile.notes,
          placeIds: places.map((place) => place.id),
        }, { headers: { 'Idempotency-Key': idempotencyKey } });
        try { window.sessionStorage.removeItem(draftKey); } catch {}
        router.push(`/dashboard/subscribers/${created.id}`);
      }
    } catch (caught) {
      const validation = subscriberValidation(caught, ['name', 'phone', 'whatsapp', 'email', 'notes', 'status'], lang);
      setFieldErrors(validation.fields); setError(validation.message);
    }
    finally { submitting.current = false; setBusy(false); }
  };
  const savePlaces = async () => {
    if (!canWrite || !subscriber || busy) return;
    setBusy(true); setPlaceError(''); setPlacesSaved(false);
    try {
      const updated = await adminApi.put<Subscriber>(`/v1/admin/subscribers/${subscriber.id}/places`, { placeIds: places.map((place) => place.id) });
      setPersistedPlaces(updated.places); setPlaces(updated.places);
      try { window.sessionStorage.removeItem(draftKey); } catch {}
      const refreshed = await onSaved();
      if (refreshed) { setPlacesSaved(true); toast.success(text('Linked places saved', 'تم حفظ الأماكن المرتبطة')); }
    } catch (caught) { setPlaceError(subscriberValidation(caught, [], lang).message); throw caught; }
    finally { setBusy(false); }
  };
  const linkedPlaces = <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{text('A place can belong to one subscriber. Link as many places as needed.', 'يمكن ربط المكان بمشترك واحد فقط. أضف أي عدد من الأماكن.')}</p>
    {!places.length && <p className="text-sm">{text('No linked places yet.', 'لا توجد أماكن مرتبطة بعد.')}</p>}
    <ul className="divide-y">{places.map((place) => <li key={place.id} className="flex min-h-12 items-center gap-3 py-2"><Link href={`/dashboard/places/${place.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{pick(place.name, place.nameEn)}</Link>{canWrite && <Button type="button" variant="ghost" size="icon-sm" disabled={busy || returnLoading} aria-label={`${text('Unlink', 'إزالة الربط')} ${pick(place.name, place.nameEn)}`} onClick={() => { setPlaces(places.filter((entry) => entry.id !== place.id)); setPlacesSaved(false); }}><X className="size-4" /></Button>}</li>)}</ul>
    {canWrite && <><AdPlacePicker value="" selectedPlace={null} onChange={(place: AdPlaceSummary | null) => { if (place) { setPlaces((current) => current.some((entry) => entry.id === place.id) ? current : [...current, place]); setPlacesSaved(false); } }} disabled={busy || returnLoading} /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={createPlace} disabled={busy || returnLoading}><Plus className="size-4" aria-hidden="true" />{text('Create a new place', 'إنشاء مكان جديد')}</Button>{subscriber && <Button type="button" onClick={() => {
      const removesPlaces = persistedPlaces.some((place) => !places.some((entry) => entry.id === place.id));
      if (removesPlaces) setAction({ title: text('Unlink places?', 'فك ارتباط الأماكن؟'), description: text('Removed places will no longer be linked to this subscriber. Their existing subscriptions and media remain recorded.', 'لن تبقى الأماكن المُزالة مرتبطة بهذا المشترك. تبقى اشتراكاتها ووسائطها المسجلة.'), destructive: true, submit: async () => { await savePlaces(); } });
      else void savePlaces().catch(() => {});
    }} disabled={busy || returnLoading}>{text('Save linked places', 'حفظ الأماكن المرتبطة')}</Button>}</div></>}
    {subscriber && !sameSubscriberPlaces(places, persistedPlaces) && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{text('Unsaved linked-place changes. Save linked places to apply them.', 'توجد تغييرات غير محفوظة للأماكن المرتبطة. احفظ الأماكن المرتبطة لتطبيقها.')}</p>}{placesSaved && sameSubscriberPlaces(places, persistedPlaces) && <p role="status" className="text-sm text-success">{text('Linked places saved.', 'تم حفظ الأماكن المرتبطة.')}</p>}{returnLoading && <LoadingState />}{placeError && <RequestError message={placeError} retry={returnFailed ? () => setReturnRetry((current) => current + 1) : undefined} />}
  </div>;
  const details = <Card><CardHeader className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{text('Subscriber details', 'بيانات المشترك')}</CardTitle><CardDescription className="mt-1">{text('Contact information and internal notes.', 'بيانات الاتصال والملاحظات الداخلية.')}</CardDescription></div>{canWrite && <Button type="submit" form={formId} disabled={busy || returnLoading}>{busy ? text('Saving…', 'جارٍ الحفظ…') : text(subscriber ? 'Save details' : 'Create subscriber', subscriber ? 'حفظ البيانات' : 'إنشاء المشترك')}</Button>}</CardHeader><CardContent><form id={formId} onSubmit={saveProfile} className="space-y-5"><fieldset disabled={!canWrite || busy || returnLoading} className="grid gap-4 sm:grid-cols-2">{([
    ['name', text('Name', 'الاسم'), 'text'], ['phone', text('Phone', 'الهاتف'), 'tel'], ['whatsapp', text('WhatsApp', 'واتساب'), 'tel'], ['email', text('Email', 'البريد الإلكتروني'), 'email'],
  ] as const).map(([name, label, type]) => <Field key={name} label={label} error={fieldErrors[name]}><Input type={type} value={values[name]} required={name === 'name' || name === 'phone'} dir={type === 'tel' || type === 'email' ? 'ltr' : undefined} onChange={(event) => { setValues({ ...values, [name]: event.target.value }); setSaved(false); }} /></Field>)}{subscriber && <Field label={text('Status', 'الحالة')} error={fieldErrors.status}><SubscriberSelect value={values.status} disabled={!canWrite || busy || returnLoading} options={[{ value: 'active', label: text('Active', 'نشط') }, { value: 'inactive', label: text('Inactive', 'غير نشط') }]} onValueChange={(value) => { setValues({ ...values, status: value as 'active' | 'inactive' }); setSaved(false); }} /></Field>}<div className="sm:col-span-2"><Field label={text('Internal notes', 'ملاحظات داخلية')} error={fieldErrors.notes}><textarea className={textareaClass} value={values.notes} onChange={(event) => { setValues({ ...values, notes: event.target.value }); setSaved(false); }} /></Field></div></fieldset>{!subscriber && linkedPlaces}{error && <RequestError message={error} />}{saved && <p role="status" className="text-sm text-success">{text('Subscriber saved.', 'تم حفظ المشترك.')}</p>}</form></CardContent></Card>;
  return <>{subscriber ? <><TabsContent value="details" keepMounted>{details}</TabsContent><TabsContent value="places" keepMounted className="space-y-6"><Card><CardHeader><CardTitle>{text('Linked places', 'الأماكن المرتبطة')}</CardTitle></CardHeader><CardContent>{linkedPlaces}</CardContent></Card>{placesContent}</TabsContent></> : details}<ActionDialog action={action} onClose={() => setAction(null)} /></>;
}
