'use client';

import { PageActions } from './page-actions';
import * as React from 'react';
import { Pencil, Plus, RefreshCw, X, ArrowRightLeft } from 'lucide-react';
import { RowActions } from './row-actions';
import { RecordCell } from './record-cell';
import { RecordList, RecordRow, useListAddress } from './record-list';
import { placeCover } from '@/lib/place-list';
import { DateCell } from './date-cell';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { cairoDate, optionalText, type Payment, type SubscriberDetail, type Subscription } from '@/lib/api/subscribers';
import { ActionDialog, type ActionField, type ActionSpec, MoneyText, StatusBadge, useSubscriberText } from './subscriber-ui';
import { SubscriberSubscriptionDialog } from './subscriber-subscription-dialog';
import { TrialBadge } from './trial-badge';
import { PlanChip } from './plan-choices';
import { SubscriberChangePlan } from './subscriber-change-plan';
import { SubscriberPeriodLinks } from './subscriber-period-links';
import { SubscriberRenewalActions } from './subscriber-renewal-actions';
import { timeLeftLabel } from '@/lib/renewal-display';
import { trialPreset } from '@/lib/subscription-presets';
import { useDashboardCopy } from './dashboard-text';

export function SubscriberSubscriptions({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const copy = useDashboardCopy();
  const historyAddress = useListAddress('subscription-history');
  const [linkedPeriod, setLinkedPeriod] = React.useState<string | null>(null);
  const revealPeriod = (id: string) => {
    const index = subscriber.subscriptions.findIndex((subscription) => subscription.id === id);
    if (index < 0) return;
    const params = new URLSearchParams(window.location.search);
    for (const key of ['q', 'state', 'place']) params.delete('subscription-history-' + key);
    params.set('subscription-history-skip', String(Math.floor(index / historyAddress.limit) * historyAddress.limit));
    window.history.replaceState(null, '', window.location.pathname + '?' + params + '#subscription-' + id);
    setLinkedPeriod(id);
  };
  React.useEffect(() => {
    if (linkedPeriod) document.getElementById('subscription-' + linkedPeriod)?.scrollIntoView({ block: 'start' });
  }, [linkedPeriod, historyAddress.skip, historyAddress.query]);
  const [changePlan, setChangePlan] = React.useState<Subscription | null>(null);
  const { text, pick, lang } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [subscriptionAction, setSubscriptionAction] = React.useState<{ renewal?: Subscription } | null>(null);
  const methods = [{ value: 'cash', label: text('Cash', 'نقداً') }, { value: 'instapay', label: text('InstaPay', 'إنستاباي') }, { value: 'bank_transfer', label: text('Bank transfer', 'تحويل بنكي') }, { value: 'wallet', label: text('Wallet', 'محفظة') }, { value: 'other', label: text('Other', 'أخرى') }];
  const paymentFields = (required: boolean): ActionField[] => [
    { name: 'amount', label: text(required ? 'Amount (EGP)' : 'First payment (EGP, optional)', required ? 'المبلغ (جنيه)' : 'الدفعة الأولى (جنيه، اختياري)'), type: 'money', required },
    { name: 'method', label: text('Payment method', 'طريقة الدفع'), type: 'select', value: 'cash', options: methods, required: true },
    { name: 'paidAt', label: text('Payment date', 'تاريخ الدفع'), type: 'date', value: cairoDate(), required: true },
    { name: 'paymentNotes', label: text('Payment notes', 'ملاحظات الدفع'), type: 'textarea' },
  ];
  const payment = (values: Record<string, string | boolean>) => ({ amount: values.amount, method: values.method, paidAt: values.paidAt, notes: optionalText(values.paymentNotes) });
  const perform = (title: string, fields: ActionField[], submit: ActionSpec['submit'], destructive = false, description?: string) => setAction({ title, fields, destructive, description, submit: async (values, idempotencyKey) => { if (!canWrite) return; await submit(values, idempotencyKey); const refreshed = await refresh(); if (refreshed) toast.success(text('Saved', 'تم الحفظ')); } });
  const newSubscription = () => { if (canWrite) setSubscriptionAction({}); };
  const edit = (subscription: Subscription) => perform(text('Edit subscription', 'تعديل الاشتراك'), [
    { name: 'planName', label: text('Plan name', 'اسم الخطة'), value: subscription.planName, required: true },
    { name: 'startDate', label: text('Start date', 'تاريخ البداية'), type: 'date', value: subscription.startDate, required: true },
    { name: 'endDate', label: text('End date', 'تاريخ النهاية'), type: 'date', value: subscription.endDate, required: true },
    { name: 'notes', label: text('Notes', 'ملاحظات'), type: 'textarea', value: subscription.notes ?? '' },
  ], async (values) => {
    if (String(values.endDate) < String(values.startDate)) throw new Error(text('End date must not precede the start date.', 'تاريخ النهاية يجب ألا يسبق تاريخ البداية.'));
    await adminApi.patch(`/v1/admin/subscriptions/${subscription.id}`, { ...values, notes: optionalText(values.notes) });
  });
  const renew = (subscription: Subscription) => {
    if (canWrite && subscription.status !== 'cancelled' && !subscription.supersededAt) setSubscriptionAction({ renewal: subscription });
  };
  const current = subscriber.currentSubscription;
  return <Card id="subscriptions"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{text('Subscriptions and payments', 'الاشتراكات والمدفوعات')}</CardTitle><PageActions actions={[{ label: 'New subscription', allowed: canWrite, disabled: !subscriber.places.length, disabledReason: text('Link a place first.', 'اربط مكاناً أولاً.'), onClick: newSubscription }]} /></CardHeader><CardContent className="space-y-6">
    <div data-slot="current-subscription" className="space-y-3 rounded-lg bg-muted p-4">
    {current ? <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{text('Current subscription', 'الاشتراك الحالي')}: {current.planName} <PlanChip plan={current.plan} /><TrialBadge planName={current.planName} planKind={current.planKind} /></p><p className="mt-1 text-sm tabular-nums"><DateCell value={current.startDate} /> — <DateCell value={current.endDate} /></p></div><StatusBadge status={current.status} /></div> : <p className="text-sm text-muted-foreground">{text('No current subscription. Link a place, then add a subscription.', 'لا يوجد اشتراك حالي. اربط مكاناً ثم أضف اشتراكاً.')}</p>}
    <SubscriberRenewalActions key={subscriber.id} subscriber={subscriber} canWrite={canWrite} refresh={refresh} />
        </div>
    <h3 className="font-medium">{text('Subscription history', 'سجل الاشتراكات')}</h3>
    {!subscriber.subscriptions.length && <p className="text-sm text-muted-foreground">{text('No subscriptions recorded yet.', 'لم تُسجل اشتراكات بعد.')}</p>}
    <RecordList layout="groups" scope="subscription-history" address={historyAddress} records={subscriber.subscriptions} searchText={(subscription) => { const place = subscriber.places.find((entry) => entry.id === subscription.placeId); return `${subscription.planName} ${place?.name ?? subscription.placeId} ${place?.nameEn ?? ''} ${subscription.startDate} ${subscription.endDate} ${subscription.notes ?? ''}`; }} filters={[{ key: 'state', label: 'All statuses', options: [{ value: 'scheduled', label: 'Scheduled' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'superseded', label: 'Superseded' }], value: (subscription) => subscription.supersededAt ? 'superseded' : subscription.status }, { key: 'place', label: 'All places', options: subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) })), value: (subscription) => subscription.placeId }]} render={(visible) => <div className="space-y-6">{visible.map((subscription) => <section id={`subscription-${subscription.id}`} key={subscription.id} className="space-y-3 border-t pt-4"><RecordRow actions={canWrite && <RowActions recordName={subscription.planName} actions={[
        ...(!trialPreset(subscription.planName, subscription.planKind) ? [{ label: text('Add payment', 'إضافة دفعة'), icon: <Plus aria-hidden="true" />, onClick: () => perform(text('Add payment', 'إضافة دفعة'), paymentFields(true), async (values, idempotencyKey) => { await adminApi.post<Payment>(`/v1/admin/subscriptions/${subscription.id}/payments`, payment(values), { headers: { 'Idempotency-Key': idempotencyKey } }); }) }] : []),
        { label: text('Edit', 'تعديل'), icon: <Pencil aria-hidden="true" />, onClick: () => edit(subscription) },
        ...(subscription.status === 'active' && !subscription.supersededAt ? [{ label: copy('Change plan'), icon: <ArrowRightLeft aria-hidden="true" />, onClick: () => setChangePlan(subscription) }] : []),
        ...(subscription.status !== 'cancelled' && !subscription.supersededAt ? [
          { label: text('Renew', 'تجديد'), icon: <RefreshCw aria-hidden="true" />, onClick: () => renew(subscription) },
          { label: text('Cancel', 'إلغاء'), icon: <X aria-hidden="true" />, destructive: true, onClick: () => perform(text('Cancel subscription?', 'إلغاء الاشتراك؟'), [], async () => { await adminApi.post(`/v1/admin/subscriptions/${subscription.id}/cancel`); }, true, text('This cancels the subscription. Recorded payments remain in the history.', 'يلغي هذا الإجراء الاشتراك. تظل المدفوعات المسجلة في السجل.')) },
        ] : []),
      ]} />}><div><RecordCell icon="calendar" name={subscription.planName} context={pick(subscriber.places.find((place) => place.id === subscription.placeId)?.name, subscriber.places.find((place) => place.id === subscription.placeId)?.nameEn) || subscription.placeId} thumbnail={placeCover(subscriber.places.find((place) => place.id === subscription.placeId) ?? {})} chips={<><PlanChip plan={subscription.plan} /><TrialBadge planName={subscription.planName} planKind={subscription.planKind} /></>} /><p className="mt-1 text-sm tabular-nums"><DateCell value={subscription.startDate} /> — <DateCell value={subscription.endDate} /></p><p className="mt-1 text-sm">{timeLeftLabel(subscription, lang)}</p>{subscription.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{subscription.notes}</p>}</div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={subscription.supersededAt ? "superseded" : subscription.status} /><MoneyText value={subscription.paidTotal} /></div></RecordRow>
      <SubscriberPeriodLinks subscription={subscription} history={subscriber.subscriptions} onNavigate={revealPeriod} />

      {!subscription.payments.length ? <p className="text-sm text-muted-foreground">{text('No payments recorded.', 'لم تُسجل دفعات.')}</p> : <RecordList scope={`payments-${subscription.id}`} records={subscription.payments} searchText={(entry) => `${entry.paidAt} ${entry.amount ?? ''} ${entry.notes ?? ''} ${entry.recordedBy.email} ${methods.find((method) => method.value === entry.method)?.label ?? ''}`} filters={[{ key: 'method', label: 'All payment methods', options: methods, value: (entry) => entry.method }]} render={(visiblePayments) => <Table layout="list"><TableHeader><TableRow>{[text('Date', 'التاريخ'), text('Amount', 'المبلغ'), text('Method', 'الطريقة'), text('Notes', 'ملاحظات'), text('Recorded by', 'سجلها')].map((label) => <TableHead key={label} className={label === text('Amount', 'المبلغ') ? 'text-end' : 'text-start'}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{visiblePayments.map((entry) => <TableRow key={entry.id}><TableCell className="text-start"><RecordCell icon="receipt" name={entry.paidAt} context={methods.find((method) => method.value === entry.method)?.label} /><div className="mt-2 space-y-1 text-sm sm:hidden"><MoneyText value={entry.amount} /><p className="break-words">{entry.notes || '—'}</p><p className="break-words">{entry.recordedBy.email}</p></div></TableCell><TableCell className="text-end tabular-nums"><MoneyText value={entry.amount} /></TableCell><TableCell>{methods.find((method) => method.value === entry.method)?.label}</TableCell><TableCell className="max-w-64 whitespace-pre-wrap">{entry.notes || '—'}</TableCell><TableCell>{entry.recordedBy.email}</TableCell></TableRow>)}</TableBody></Table>} />}
    </section>)}</div>} />{changePlan && <SubscriberChangePlan subscription={changePlan} canWrite={canWrite} refresh={refresh} onClose={() => setChangePlan(null)} />}<ActionDialog action={action} onClose={() => setAction(null)} />{subscriptionAction && <SubscriberSubscriptionDialog subscriber={subscriber} renewal={subscriptionAction.renewal} canWrite={canWrite} refresh={refresh} onClose={() => setSubscriptionAction(null)} />}
  </CardContent></Card>;
}
