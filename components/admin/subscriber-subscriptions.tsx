'use client';

import * as React from 'react';
import { Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { RowActions } from './row-actions';
import { DateCell } from './date-cell';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { cairoDate, optionalText, type Payment, type SubscriberDetail, type Subscription } from '@/lib/api/subscribers';
import { ActionDialog, type ActionField, type ActionSpec, MoneyText, StatusBadge, useSubscriberText } from './subscriber-ui';

export function SubscriberSubscriptions({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, pick } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const methods = [{ value: 'cash', label: text('Cash', 'نقداً') }, { value: 'instapay', label: text('InstaPay', 'إنستاباي') }, { value: 'bank_transfer', label: text('Bank transfer', 'تحويل بنكي') }, { value: 'wallet', label: text('Wallet', 'محفظة') }, { value: 'other', label: text('Other', 'أخرى') }];
  const paymentFields = (required: boolean): ActionField[] => [
    { name: 'amount', label: text(required ? 'Amount (EGP)' : 'First payment (EGP, optional)', required ? 'المبلغ (جنيه)' : 'الدفعة الأولى (جنيه، اختياري)'), type: 'money', required },
    { name: 'method', label: text('Payment method', 'طريقة الدفع'), type: 'select', value: 'cash', options: methods, required: true },
    { name: 'paidAt', label: text('Payment date', 'تاريخ الدفع'), type: 'date', value: cairoDate(), required: true },
    { name: 'paymentNotes', label: text('Payment notes', 'ملاحظات الدفع'), type: 'textarea' },
  ];
  const payment = (values: Record<string, string | boolean>) => ({ amount: values.amount, method: values.method, paidAt: values.paidAt, notes: optionalText(values.paymentNotes) });
  const perform = (title: string, fields: ActionField[], submit: ActionSpec['submit'], destructive = false, description?: string) => setAction({ title, fields, destructive, description, submit: async (values, idempotencyKey) => { if (!canWrite) return; await submit(values, idempotencyKey); const refreshed = await refresh(); if (refreshed) toast.success(text('Saved', 'تم الحفظ')); } });
  const newSubscription = () => perform(text('New subscription', 'اشتراك جديد'), [
    { name: 'placeId', label: text('Place', 'المكان'), type: 'select', required: true, value: subscriber.places[0]?.id ?? '', options: subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) })) },
    { name: 'planName', label: text('Plan name', 'اسم الخطة'), required: true },
    { name: 'startDate', label: text('Start date (Cairo)', 'تاريخ البداية (القاهرة)'), type: 'date', value: cairoDate(), required: true },
    { name: 'endDate', label: text('End date (inclusive)', 'تاريخ النهاية (شامل)'), type: 'date', value: cairoDate(), required: true },
    { name: 'notes', label: text('Subscription notes', 'ملاحظات الاشتراك'), type: 'textarea' },
    ...paymentFields(false),
  ], async (values, idempotencyKey) => {
    if (String(values.endDate) < String(values.startDate)) throw new Error(text('End date must not precede the start date.', 'تاريخ النهاية يجب ألا يسبق تاريخ البداية.'));
    await adminApi.post<Subscription>(`/v1/admin/subscribers/${subscriber.id}/subscriptions`, { placeId: values.placeId, planName: values.planName, startDate: values.startDate, endDate: values.endDate, notes: optionalText(values.notes), ...(values.amount ? { payment: payment(values) } : {}) }, { headers: { 'Idempotency-Key': idempotencyKey } });
  });
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
    const next = new Date(`${subscription.endDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const start = next.toISOString().slice(0, 10);
    perform(text('Renew subscription', 'تجديد الاشتراك'), [
      { name: 'planName', label: text('Plan name', 'اسم الخطة'), value: subscription.planName, required: true },
      { name: 'endDate', label: text('New end date', 'تاريخ النهاية الجديد'), type: 'date', required: true, min: start, value: start },
      ...paymentFields(false),
    ], async (values, idempotencyKey) => {
      if (String(values.endDate) < start) throw new Error(text('Choose an end date after the current subscription.', 'اختر تاريخ نهاية بعد الاشتراك الحالي.'));
      await adminApi.post<Subscription>(`/v1/admin/subscriptions/${subscription.id}/renew`, { planName: values.planName, endDate: values.endDate, ...(values.amount ? { payment: payment(values) } : {}) }, { headers: { 'Idempotency-Key': idempotencyKey } });
    }, false, `${text('The next subscription starts on', 'يبدأ الاشتراك التالي في')} ${start}.`);
  };
  const current = subscriber.currentSubscription;
  return <Card id="subscriptions"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{text('Subscriptions and payments', 'الاشتراكات والمدفوعات')}</CardTitle>{canWrite && <Button disabled={!subscriber.places.length} onClick={newSubscription}>{text('New subscription', 'اشتراك جديد')}</Button>}</CardHeader><CardContent className="space-y-6">
    {current ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4"><div><p className="font-medium">{text('Current subscription', 'الاشتراك الحالي')}: {current.planName}</p><p className="mt-1 text-sm tabular-nums"><DateCell value={current.startDate} /> — <DateCell value={current.endDate} /></p></div><StatusBadge status={current.status} /></div> : <p className="text-sm text-muted-foreground">{text('No current subscription. Link a place, then add a subscription.', 'لا يوجد اشتراك حالي. اربط مكاناً ثم أضف اشتراكاً.')}</p>}
    <h3 className="font-medium">{text('Subscription history', 'سجل الاشتراكات')}</h3>
    {!subscriber.subscriptions.length && <p className="text-sm text-muted-foreground">{text('No subscriptions recorded yet.', 'لم تُسجل اشتراكات بعد.')}</p>}
    {subscriber.subscriptions.map((subscription) => <section key={subscription.id} className="space-y-3 border-t pt-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold">{subscription.planName} · {pick(subscriber.places.find((place) => place.id === subscription.placeId)?.name, subscriber.places.find((place) => place.id === subscription.placeId)?.nameEn) || subscription.placeId}</h4><p className="mt-1 text-sm tabular-nums"><DateCell value={subscription.startDate} /> — <DateCell value={subscription.endDate} /></p>{subscription.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{subscription.notes}</p>}</div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={subscription.status} /><MoneyText value={subscription.paidTotal} /></div></div>
      {canWrite && <RowActions recordName={subscription.planName} actions={[
        { label: text('Add payment', 'إضافة دفعة'), icon: <Plus aria-hidden="true" />, onClick: () => perform(text('Add payment', 'إضافة دفعة'), paymentFields(true), async (values, idempotencyKey) => { await adminApi.post<Payment>(`/v1/admin/subscriptions/${subscription.id}/payments`, payment(values), { headers: { 'Idempotency-Key': idempotencyKey } }); }) },
        { label: text('Edit', 'تعديل'), icon: <Pencil aria-hidden="true" />, onClick: () => edit(subscription) },
        ...(subscription.status !== 'cancelled' ? [
          { label: text('Renew', 'تجديد'), icon: <RefreshCw aria-hidden="true" />, onClick: () => renew(subscription) },
          { label: text('Cancel', 'إلغاء'), icon: <X aria-hidden="true" />, destructive: true, onClick: () => perform(text('Cancel subscription?', 'إلغاء الاشتراك؟'), [], async () => { await adminApi.post(`/v1/admin/subscriptions/${subscription.id}/cancel`); }, true, text('This cancels the subscription. Recorded payments remain in the history.', 'يلغي هذا الإجراء الاشتراك. تظل المدفوعات المسجلة في السجل.')) },
        ] : []),
      ]} />}
      {!subscription.payments.length ? <p className="text-sm text-muted-foreground">{text('No payments recorded.', 'لم تُسجل دفعات.')}</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{[text('Date', 'التاريخ'), text('Amount', 'المبلغ'), text('Method', 'الطريقة'), text('Notes', 'ملاحظات'), text('Recorded by', 'سجلها')].map((label) => <TableHead key={label} className={label === text('Amount', 'المبلغ') ? 'text-end' : 'text-start'}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{subscription.payments.map((entry) => <TableRow key={entry.id}><TableCell className="text-start"><DateCell value={entry.paidAt} /></TableCell><TableCell className="text-end tabular-nums"><MoneyText value={entry.amount} /></TableCell><TableCell>{methods.find((method) => method.value === entry.method)?.label}</TableCell><TableCell className="max-w-64 whitespace-pre-wrap">{entry.notes || '—'}</TableCell><TableCell>{entry.recordedBy.email}</TableCell></TableRow>)}</TableBody></Table></div>}
    </section>)}<ActionDialog action={action} onClose={() => setAction(null)} />
  </CardContent></Card>;
}
