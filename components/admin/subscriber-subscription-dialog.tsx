'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { cairoDate, type SubscriberDetail, type Subscription } from '@/lib/api/subscribers';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { calendarDayCount, formatCalendarDate, isCalendarDate, renewalStart, subscriptionEnd } from '@/lib/subscription-calendar';
import { subscriptionPresets, subscriptionRequest, trialPreset, usedTrial, type SubscriptionDraft } from '@/lib/subscription-presets';
import { useDashboardCopy } from './dashboard-text';
import { DateField } from './date-field';
import { PresetChoices } from './preset-choices';
import { Field, RequestError, SubscriberSelect, subscriberValidation, textareaClass, useSubscriberText } from './subscriber-ui';

export function SubscriberSubscriptionDialog(props: { subscriber: SubscriberDetail; renewal?: Subscription; canWrite: boolean; refresh: () => Promise<boolean>; onClose: () => void }) {
  return props.canWrite ? <SubscriptionForm {...props} /> : null;
}

function SubscriptionForm({ subscriber, renewal, canWrite, refresh, onClose }: { subscriber: SubscriberDetail; renewal?: Subscription; canWrite: boolean; refresh: () => Promise<boolean>; onClose: () => void }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const session = useCurrentSession();
  const superAdmin = session.data?.user.role === 'super_admin';
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const today = cairoDate();
  const [draft, setDraft] = React.useState<SubscriptionDraft>(() => {
    const start = renewal ? renewalStart(renewal.endDate, today) : today;
    return { placeId: renewal?.placeId ?? subscriber.places[0]?.id ?? '', planName: renewal?.planName ?? '', startDate: start, endDate: start, notes: '', amount: '', method: 'cash', paidAt: today, paymentNotes: '' };
  });
  const [chosen, setChosen] = React.useState<string | null>(null);
  const [trialKind, setTrialKind] = React.useState<string | null>(null);
  const [override, setOverride] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const submitting = React.useRef(false);
  const amountRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState('');
  const [dateError, setDateError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const namedTrial = trialPreset(draft.planName);
  const free = Boolean(trialKind || namedTrial);
  const trialId = trialKind ?? namedTrial?.id;
  const used = trialId ? usedTrial(subscriber.subscriptions, draft.placeId, trialId) : undefined;
  const validRange = isCalendarDate(draft.startDate) && isCalendarDate(draft.endDate) && draft.endDate >= draft.startDate;
  const overlaps = validRange && subscriber.subscriptions.some((subscription) => subscription.placeId === draft.placeId && subscription.status !== 'cancelled' && draft.startDate <= subscription.endDate && draft.endDate >= subscription.startDate);
  const setField = (name: keyof SubscriptionDraft, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setError(''); setFieldErrors((current) => ({ ...current, [name]: '' }));
    if (name === 'startDate' || name === 'endDate') { setChosen(null); setDateError(''); }
    if (name === 'placeId') { setChosen(null); setTrialKind(null); setOverride(false); setDateError(''); }
    if (name === 'planName') setOverride(false);
  };
  const choose = (id: string) => {
    const next = subscriptionPresets.find((entry) => entry.id === id);
    if (!next || busy || (next.trial && !superAdmin && usedTrial(subscriber.subscriptions, draft.placeId, id))) return;
    const start = renewal ? renewalStart(renewal.endDate, cairoDate()) : cairoDate();
    setChosen(id); setTrialKind(next.trial ? next.id : null); setOverride(false); setDateError(''); setError(''); setFieldErrors({});
    setDraft((current) => ({ ...current, planName: copy(next.label), startDate: start, endDate: subscriptionEnd(start, next.length), amount: '', paidAt: cairoDate() }));
    if (!next.trial) requestAnimationFrame(() => amountRef.current?.focus());
  };
  const usedText = (start: string) => `${copy('Already used on')} ${formatCalendarDate(start, lang)}`;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || submitting.current) return;
    if (!validRange) { setDateError(copy('Enter a valid start and end date.')); return; }
    if (overlaps) { setDateError(copy('These dates overlap an existing subscription for this place. Choose another date range.')); return; }
    if (used && (!superAdmin || !override)) { setError(superAdmin ? copy('Confirm that this place may receive another free trial.') : usedText(used.startDate)); return; }
    if (!draft.planName.trim()) { setFieldErrors({ planName: copy('Plan name is required.') }); return; }
    if (!free && draft.amount && !isCalendarDate(draft.paidAt)) { setFieldErrors({ paidAt: copy('Enter a valid payment date.') }); return; }
    submitting.current = true; setBusy(true); setError(''); setDateError(''); setFieldErrors({});
    try {
      const request = subscriptionRequest(subscriber.id, renewal, draft, free);
      await adminApi.post<Subscription>(request.path, request.body, { headers: { 'Idempotency-Key': idempotencyKey } });
      const refreshed = await refresh();
      if (refreshed) toast.success(copy('Saved'));
      onClose();
    } catch (caught) {
      const validation = subscriberValidation(caught, Object.keys(draft), lang);
      setFieldErrors(validation.fields);
      if (caught instanceof AdminApiError && caught.code === 'SUBSCRIPTION_OVERLAP') setDateError(validation.message);
      else setError(validation.message);
    } finally { submitting.current = false; setBusy(false); }
  };
  const methods = ['Cash', 'InstaPay', 'Bank transfer', 'Wallet', 'Other'].map((label, index) => ({ label: copy(label), value: ['cash', 'instapay', 'bank_transfer', 'wallet', 'other'][index] }));
  const rangeMessage = dateError || (overlaps ? copy('These dates overlap an existing subscription for this place. Choose another date range.') : '');
  const rangeId = React.useId();
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="sm:max-w-xl" showCloseButton={!busy} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DialogHeader><DialogTitle>{copy(renewal ? 'Renew subscription' : 'New subscription')}</DialogTitle><DialogDescription>{copy('Choose a length or enter your own dates. Nothing is saved until you confirm.')}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="max-h-[60vh] space-y-4 overflow-y-auto px-1">
          <PresetChoices label={copy('Subscription length')} value={chosen} disabled={busy} onValueChange={choose} options={subscriptionPresets.map((entry) => {
            const previous = entry.trial ? usedTrial(subscriber.subscriptions, draft.placeId, entry.id) : undefined;
            return { value: entry.id, label: copy(entry.label), disabled: Boolean(previous && !superAdmin), reason: previous ? usedText(previous.startDate) : undefined };
          })} />
          {used && superAdmin && <label className="flex items-start gap-2 text-sm"><Checkbox checked={override} disabled={busy} onCheckedChange={setOverride} />{copy('Confirm that this place may receive another free trial.')}</label>}
          {!renewal && <Field label={copy('Place')} error={fieldErrors.placeId}><SubscriberSelect value={draft.placeId} required disabled={busy} onValueChange={(value) => setField('placeId', value)} options={subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) }))} /></Field>}
          <Field label={copy('Plan name')} error={fieldErrors.planName}><Input required value={draft.planName} onChange={(event) => setField('planName', event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy('Start date (Cairo)')} error={fieldErrors.startDate}><DateField value={draft.startDate} required disabled={busy} aria-describedby={rangeId} aria-invalid={Boolean(rangeMessage)} onChange={(value) => setField('startDate', value)} /></Field>
            <Field label={copy('End date (inclusive)')} error={fieldErrors.endDate}><DateField value={draft.endDate} min={isCalendarDate(draft.startDate) ? draft.startDate : undefined} required disabled={busy} aria-describedby={rangeId} aria-invalid={Boolean(rangeMessage)} onChange={(value) => setField('endDate', value)} /></Field>
          </div>
          <div id={rangeId} className="space-y-2">
            <p aria-live="polite" className="text-sm text-muted-foreground">{validRange ? `${formatCalendarDate(draft.startDate, lang)} ${copy('to')} ${formatCalendarDate(draft.endDate, lang)} · ${calendarDayCount(draft.startDate, draft.endDate).toLocaleString(lang)} ${copy('days')}` : copy('Enter a valid start and end date.')}</p>
            {rangeMessage && <p role="alert" className="text-sm text-destructive">{rangeMessage}</p>}
          </div>
          {!renewal && <Field label={copy('Subscription notes')} error={fieldErrors.notes}><textarea className={textareaClass} value={draft.notes} onChange={(event) => setField('notes', event.target.value)} /></Field>}
          {free ? <p role="status" className="text-sm text-muted-foreground">{copy('Free trial: no payment is recorded')}</p> : <>
            <Field label={copy('First payment (EGP, optional)')} error={fieldErrors.amount}><Input ref={amountRef} type="text" inputMode="decimal" dir="ltr" pattern="[0-9٠-٩]+([.٫][0-9٠-٩]{1,2})?" value={draft.amount} onChange={(event) => setField('amount', event.target.value)} /></Field>
            <Field label={copy('Payment method')} error={fieldErrors.method}><SubscriberSelect value={draft.method} options={methods} required disabled={busy} onValueChange={(value) => setField('method', value)} /></Field>
            <Field label={copy('Payment date')} error={fieldErrors.paidAt}><DateField value={draft.paidAt} required disabled={busy} onChange={(value) => setField('paidAt', value)} /></Field>
            <Field label={copy('Payment notes')} error={fieldErrors.paymentNotes}><textarea className={textareaClass} value={draft.paymentNotes} onChange={(event) => setField('paymentNotes', event.target.value)} /></Field>
          </>}
        </fieldset>
        {error && <RequestError message={error} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy('Back')}</Button><Button type="submit" disabled={busy || overlaps || Boolean(used && (!superAdmin || !override))}>{copy(busy ? 'Saving…' : 'Confirm')}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
