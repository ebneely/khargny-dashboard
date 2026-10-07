'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { isEgyptianMobile, type SubscriberSettings } from '@/lib/api/subscribers';
import { Field, LoadingState, RequestError, SavedRefreshError, subscriberError, subscriberValidation, useSubscriberText } from './subscriber-ui';

export function SubscriberRenewalContact({ canWrite }: { canWrite: boolean }) {
  const { text, lang } = useSubscriberText();
  const load = React.useCallback(() => adminApi.get<SubscriberSettings>('/v1/admin/subscribers/settings'), []);
  const resource = useSubscriberResource(load);

  return <Card>
    <CardHeader>
      <CardTitle>{text('Renewal contact', 'جهة اتصال التجديد')}</CardTitle>
      <p className="text-sm text-muted-foreground">{text(
        'Shown to subscribers in their portal when their subscription is not active.',
        'يظهر للمشتركين في بوابتهم عند انتهاء الاشتراك.',
      )}</p>
    </CardHeader>
    <CardContent>
      {resource.loading ? <LoadingState /> : resource.error ?
        <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} /> :
        resource.data && <RenewalContactForm settings={resource.data} canWrite={canWrite} />}
    </CardContent>
  </Card>;
}

function RenewalContactForm({ settings, canWrite }: { settings: SubscriberSettings; canWrite: boolean }) {
  const { text, lang } = useSubscriberText();
  const [phone, setPhone] = React.useState(settings.renewalPhone ?? '');
  const [whatsapp, setWhatsapp] = React.useState(settings.renewalWhatsapp ?? '');
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [refreshFailed, setRefreshFailed] = React.useState(false);
  const saving = React.useRef(false);
  const fields = [
    { name: 'renewalPhone', label: text('Phone', 'الهاتف'), value: phone, update: setPhone },
    { name: 'renewalWhatsapp', label: text('WhatsApp', 'واتساب'), value: whatsapp, update: setWhatsapp },
  ];

  const reread = async () => {
    setBusy(true);
    try {
      const result = await adminApi.get<SubscriberSettings>('/v1/admin/subscribers/settings');
      setPhone(result.renewalPhone ?? ''); setWhatsapp(result.renewalWhatsapp ?? '');
      setRefreshFailed(false); setSaved(true); setError('');
    } catch {
      setRefreshFailed(true); setSaved(false);
    } finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || saving.current || refreshFailed) return;
    setSaved(false);
    setError('');
    setFieldErrors({});
    const invalid = fields.find((field) => field.value.trim() && !isEgyptianMobile(field.value));
    if (invalid) {
      setError(`${invalid.label}: ${text('Enter an Egyptian mobile number (01…, +20…, 0020… or 20…).', 'أدخل رقم موبايل مصري (01… أو +20… أو 0020… أو 20…).')}`);
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await adminApi.put<SubscriberSettings>('/v1/admin/subscribers/settings', {
        renewalPhone: phone.trim() ? phone : null,
        renewalWhatsapp: whatsapp.trim() ? whatsapp : null,
      });
      await reread();
    } catch (caught) {
      const validation = subscriberValidation(caught, fields.map((field) => field.name), lang);
      setFieldErrors(validation.fields); setError(validation.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  if (!canWrite) return <dl className="grid gap-4 sm:grid-cols-2">
    {fields.map((field) => <div key={field.name}>
      <dt className="text-sm text-muted-foreground">{field.label}</dt>
      <dd className="mt-1 font-medium"><span dir={field.value ? "ltr" : undefined} className={field.value ? undefined : "text-muted-foreground"}>{field.value || `${field.label}: ${text('not set', 'غير محدد')}`}</span></dd>
    </div>)}
  </dl>;

  return <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <fieldset disabled={busy || refreshFailed} className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => <Field key={field.name} label={field.label} error={fieldErrors[field.name]}>
        <Input name={field.name} type="tel" dir="ltr" autoComplete="tel" value={field.value}
          placeholder="01XXXXXXXXX" onChange={(event) => {
            field.update(event.target.value);
            setSaved(false);
            setError('');
          }} />
      </Field>)}
    </fieldset>
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={busy || refreshFailed}>{busy ? text('Saving…', 'جارٍ الحفظ…') : text('Save renewal contact', 'حفظ جهة اتصال التجديد')}</Button>
      {saved && <p role="status" className="text-sm text-green-700 dark:text-green-400">{text('Renewal contact saved', 'تم حفظ جهة اتصال التجديد')}</p>}
    </div>
    {error && <RequestError message={error} />}
    {refreshFailed && <SavedRefreshError retry={() => { void reread(); }} />}
  </form>;
}
