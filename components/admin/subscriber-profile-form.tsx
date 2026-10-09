'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useDashboardCopy } from './dashboard-text';
import { subscriberBrandFields } from '@/lib/subscriber-brand';
import { PhoneField } from './phone-field';
import { subscriberContactErrors, subscriberPhonePayload } from '@/lib/subscriber-phone';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { optionalText, type PlaceDetailResponse, type Subscriber, type SubscriberDetail, type SubscriberPlace } from '@/lib/api/subscribers';
import { consumeSubscriberDraft, sameSubscriberPlaces } from '@/lib/subscriber-draft';
import { SubscriberPlaceTable } from './subscriber-place-table';
import { FormActionBar } from './form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { ActionDialog, type ActionSpec, Field, LoadingState, RequestError, SubscriberSelect, subscriberValidation, textareaClass, useSubscriberText } from './subscriber-ui';

export function SubscriberProfileForm({ subscriber, canWrite, onSaved, placesContent }: { subscriber?: SubscriberDetail; canWrite: boolean; onSaved: () => Promise<boolean>; placesContent?: React.ReactNode }) {
  const copy = useDashboardCopy();
  const { text, lang } = useSubscriberText();
  const router = useRouter();
  const formId = React.useId();
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const subscriberId = subscriber?.id;
  const [values, setValues] = React.useState({ isBrand: subscriber?.isBrand ?? false, name: subscriber?.name ?? '', phone: subscriber?.phone ?? '', whatsapp: subscriber?.whatsapp ?? '', email: subscriber?.email ?? '', notes: subscriber?.notes ?? '', status: subscriber?.status ?? 'active' });
  const [places, setPlaces] = React.useState<SubscriberPlace[]>(subscriber?.places ?? []);
  const [persistedPlaces, setPersistedPlaces] = React.useState<SubscriberPlace[]>(subscriber?.places ?? []);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
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
            setValues({ ...parsed.values, isBrand: parsed.values.isBrand ?? false }); setPlaces(parsed.places);
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
  const profileChanges = useFormChanges(values, { isBrand: subscriber?.isBrand ?? false, name: subscriber?.name ?? '', phone: subscriber?.phone ?? '', whatsapp: subscriber?.whatsapp ?? '', email: subscriber?.email ?? '', notes: subscriber?.notes ?? '', status: subscriber?.status ?? 'active' });
  const contactErrors = subscriberContactErrors(values);
  const disabledReason = Object.values(contactErrors).map(copy).join(' ');
  const contactError = (name: string) => fieldErrors[name] || (touched[name] && contactErrors[name] ? copy(contactErrors[name]) : undefined);
  const changeContact = (name: 'name' | 'phone' | 'whatsapp' | 'email', value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setSaved(false);
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || submitting.current || returnLoading) return;
    if (Object.keys(contactErrors).length) { setTouched({ name: true, phone: true, whatsapp: true, email: true }); setFieldErrors(Object.fromEntries(Object.entries(contactErrors).map(([key, value]) => [key, copy(value)]))); return; }
    submitting.current = true;
    setBusy(true); setError(''); setSaved(false); setFieldErrors({});
    try {
      const { status, isBrand, ...draft } = values;
      const profile = { ...draft, phone: subscriberPhonePayload(draft.phone), ...subscriberBrandFields(subscriber?.isBrand, isBrand), whatsapp: draft.whatsapp.trim() ? subscriberPhonePayload(draft.whatsapp) : null, email: optionalText(draft.email), notes: optionalText(draft.notes) };
      if (subscriber) {
        await adminApi.patch<Subscriber>(`/v1/admin/subscribers/${subscriber.id}`, { ...profile, status });
        try { window.sessionStorage.removeItem(draftKey); } catch {}
        const refreshed = await onSaved();
        if (refreshed) { profileChanges.markSaved(); setSaved(true); toast.success(text('Subscriber saved', 'تم حفظ المشترك')); }
      } else {
        const created = await adminApi.post<Subscriber>('/v1/admin/subscribers', {
          ...subscriberBrandFields(undefined, isBrand),
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
      const validation = subscriberValidation(caught, ['name', 'phone', 'whatsapp', 'email', 'notes', 'status', 'isBrand'], lang);
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
  const requestSavePlaces = () => {
    const removesPlaces = persistedPlaces.some((place) => !places.some((entry) => entry.id === place.id));
    if (removesPlaces) setAction({ title: text('Unlink places?', 'فك ارتباط الأماكن؟'), description: text('Removed places will no longer be linked to this subscriber. Their existing subscriptions and media remain recorded.', 'لن تبقى الأماكن المُزالة مرتبطة بهذا المشترك. تبقى اشتراكاتها ووسائطها المسجلة.'), destructive: true, submit: async () => { await savePlaces(); } });
    else void savePlaces().catch(() => {});
  };
  const linkedPlaces = <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{text('A place can belong to one subscriber. Link as many places as needed.', 'يمكن ربط المكان بمشترك واحد فقط. أضف أي عدد من الأماكن.')}</p>
    <SubscriberPlaceTable value={places} persisted={persistedPlaces} subscriberId={subscriberId} readOnly={!canWrite} disabled={busy || returnLoading} onChange={(next) => { setPlaces(next); setPlacesSaved(false); }} />
    {canWrite && <Button type="button" variant="outline" onClick={createPlace} disabled={busy || returnLoading}><Plus className="size-4" />{text('Create a new place', 'إنشاء مكان جديد')}</Button>}
    {subscriber && !sameSubscriberPlaces(places, persistedPlaces) && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{text('Unsaved linked-place changes. Save linked places to apply them.', 'توجد تغييرات غير محفوظة للأماكن المرتبطة. احفظ الأماكن المرتبطة لتطبيقها.')}</p>}{placesSaved && sameSubscriberPlaces(places, persistedPlaces) && <p role="status" className="text-sm text-success">{text('Linked places saved.', 'تم حفظ الأماكن المرتبطة.')}</p>}{returnLoading && <LoadingState />}{placeError && <RequestError message={placeError} retry={returnFailed ? () => setReturnRetry((current) => current + 1) : undefined} />}
  </div>;
  const details = <Card><CardHeader className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{text('Subscriber details', 'بيانات المشترك')}</CardTitle><CardDescription className="mt-1">{text('Contact information and internal notes.', 'بيانات الاتصال والملاحظات الداخلية.')}</CardDescription></div></CardHeader><CardContent><form id={formId} onSubmit={saveProfile} className="space-y-5"><fieldset disabled={!canWrite || busy || returnLoading} className="grid gap-4 sm:grid-cols-2">{(['name', 'phone', 'whatsapp', 'email'] as const).map((name) => {
    const required = name === 'name' || name === 'phone';
    const label = { name: 'Name', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email' }[name];
    const fieldId = formId + '-' + name;
    const message = contactError(name);
    return <div key={name} className="min-w-0 space-y-2">
      <Field label={copy(label)} required={required} optional={!required} error={message}>
      {name === 'phone' || name === 'whatsapp' ? <PhoneField showError={false} id={fieldId} value={values[name]} required={required} disabled={!canWrite || busy || returnLoading} error={message} onBlur={() => setTouched((current) => ({ ...current, [name]: true }))} onChange={(value) => changeContact(name, value)} /> : <Input id={fieldId} type={name === 'email' ? 'email' : 'text'} value={values[name]} required={required} dir={name === 'email' ? 'ltr' : undefined} onBlur={() => setTouched((current) => ({ ...current, [name]: true }))} onChange={(event) => changeContact(name, event.target.value)} />}
      </Field>
      {name === 'whatsapp' && canWrite && <Button type="button" variant="outline" size="sm" disabled={!values.phone || Boolean(contactErrors.phone) || busy || returnLoading} onClick={() => changeContact('whatsapp', values.phone)}>{copy('Same as phone')}</Button>}
    </div>;
  })}{subscriber && <Field label={text('Status', 'الحالة')} error={fieldErrors.status}><SubscriberSelect value={values.status} disabled={!canWrite || busy || returnLoading} options={[{ value: 'active', label: text('Active', 'نشط') }, { value: 'inactive', label: text('Inactive', 'غير نشط') }]} onValueChange={(value) => { setValues({ ...values, status: value as 'active' | 'inactive' }); setSaved(false); }} /></Field>}<div className="sm:col-span-2 space-y-1"><label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={values.isBrand} onCheckedChange={(checked) => { setValues({ ...values, isBrand: checked }); setSaved(false); }} />{copy("Brand (a known business or chain)")}</label><p className="text-sm text-muted-foreground">{copy("Internal mark only; plans and prices do not change.")}</p>{fieldErrors.isBrand && <p role="alert" className="text-sm text-destructive">{fieldErrors.isBrand}</p>}</div><div className="sm:col-span-2"><Field label={text('Internal notes', 'ملاحظات داخلية')} error={fieldErrors.notes}><textarea className={textareaClass} value={values.notes} onChange={(event) => { setValues({ ...values, notes: event.target.value }); setSaved(false); }} /></Field></div></fieldset>{!subscriber && linkedPlaces}{error && <RequestError message={error} />}{saved && <p role="status" className="text-sm text-success">{text('Subscriber saved.', 'تم حفظ المشترك.')}</p>}</form></CardContent>{canWrite && <FormActionBar form={formId} dirty={profileChanges.dirty || (!subscriber && places.length > 0)} saving={busy} error={error} disabled={busy || returnLoading || Boolean(disabledReason)} disabledReason={disabledReason} cancelHref="/dashboard/subscribers" primaryLabel={text(subscriber ? 'Save details' : 'Create subscriber', subscriber ? 'حفظ البيانات' : 'إنشاء المشترك')} />}</Card>;
  return <>{subscriber ? <><TabsContent value="details" keepMounted>{details}</TabsContent><TabsContent value="places" keepMounted className="space-y-6"><Card><CardHeader><CardTitle>{text('Linked places', 'الأماكن المرتبطة')}</CardTitle></CardHeader><CardContent>{linkedPlaces}</CardContent></Card>{placesContent}{canWrite && <FormActionBar dirty={!sameSubscriberPlaces(places, persistedPlaces)} saving={busy} error={placeError} disabled={busy || returnLoading} onSave={requestSavePlaces} cancelHref="/dashboard/subscribers" primaryLabel={text('Save linked places', 'حفظ الأماكن المرتبطة')} />}</TabsContent></> : details}<ActionDialog action={action} onClose={() => setAction(null)} /></>;
}
