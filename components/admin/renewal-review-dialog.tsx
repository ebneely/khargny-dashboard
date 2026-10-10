'use client';

import * as React from 'react';
import { renewalsApi, type RenewalRequest, type RenewalMethod } from '@/lib/api/renewals';
import { cairoDate, decimalMoney, type Subscription } from '@/lib/api/subscribers';
import { renewalError } from '@/lib/renewal-error';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateField } from './date-field';
import { DateRange } from './date-cell';
import { RenewalProof } from './renewal-proof';
import { FormActionBar, ActionBarNavigation } from './form-action-bar';
import { Field, MoneyText, RequestError, SubscriberSelect, textareaClass, useSubscriberText } from './subscriber-ui';

export function RenewalReviewDialog({ request, canWrite, onClose, refresh }: { request: RenewalRequest; canWrite: boolean; onClose: () => void; refresh: () => Promise<boolean> }) {
  const { text, pick, lang } = useSubscriberText();
  const [mode, setMode] = React.useState<'confirm' | 'ask-proof' | 'reject' | null>(null);
  const [amount, setAmount] = React.useState(request.claimedAmount);
  const [method, setMethod] = React.useState<RenewalMethod>(request.method);
  const [paidOn, setPaidOn] = React.useState(cairoDate());
  const [note, setNote] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [error, setError] = React.useState('');
  const [closed, setClosed] = React.useState(request.status === 'confirmed' || request.status === 'rejected');
  const [result, setResult] = React.useState<Subscription | null>(null);
  const methods = [{ value: 'cash', label: text('Cash', 'نقداً') }, { value: 'instapay', label: text('InstaPay', 'إنستاباي') }, { value: 'wallet', label: text('Wallet', 'محفظة') }, { value: 'bank_transfer', label: text('Bank transfer', 'تحويل بنكي') }];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || writing.current || !mode || closed) return;
    writing.current = true; setBusy(true); setError('');
    try {
      if (mode === 'confirm') {
        if (paidOn > cairoDate()) throw new Error('INVALID_PAID_ON');
        const normalizedAmount = decimalMoney(amount);
        if (!/^\d{1,10}\.\d{2}$/.test(normalizedAmount)) throw new Error('INVALID_AMOUNT');
        const response = await renewalsApi.confirm(request.id, { amount: normalizedAmount, method, paidOn, note: note.trim() || null });
        setResult(response.subscription); setClosed(true);
      } else {
        if (!reason.trim() || reason.length > 2000) throw new Error('INVALID_REASON');
        if (mode === 'reject') { await renewalsApi.reject(request.id, reason.trim()); setClosed(true); }
        else { await renewalsApi.askProof(request.id, reason.trim()); setClosed(true); }
      }
      setMode(null);
      if (!await refresh()) setError(text('Saved, but refresh failed. Do not submit again.', 'تم الحفظ لكن تعذر التحديث. لا ترسل الطلب مرة أخرى.'));
    } catch (caught) {
      setError(renewalError(caught, lang));
      if (caught && typeof caught === 'object' && 'code' in caught && ['NOT_SUBMITTED', 'RENEWAL_CLOSED'].includes(String(caught.code))) { setClosed(true); setMode(null); await refresh(); }
    }
    finally { writing.current = false; setBusy(false); }
  };
  return <ActionBarNavigation links={[]}><Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" dir={lang === 'ar' ? 'rtl' : 'ltr'} showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{text('Review renewal', 'مراجعة التجديد')} · {request.subscriber.name}</DialogTitle><DialogDescription>{text('A request is a payment claim. Only confirmation records money and renews the period.', 'الطلب هو إقرار بالدفع. التأكيد وحده يسجل المال ويجدد الفترة.')}</DialogDescription></DialogHeader>
    <div className="space-y-3"><p>{pick(request.place.name, request.place.nameEn)} · {request.plan === 'owner_plus' ? text('Owner Plus', 'أونر بلس') : text('Owner', 'أونر')} · {request.months} {text('months', 'أشهر')}</p><p>{text('Claimed amount', 'المبلغ المذكور')}: <MoneyText value={request.claimedAmount} /> · {methods.find(entry => entry.value === request.method)?.label}</p>{request.note && <p dir="auto" className="break-words">{request.note}</p>}{request.rejectReason && <p dir="auto" className="break-words">{request.rejectReason}</p>}<RenewalProof request={request} /></div>
    <p className="rounded-lg bg-muted p-3 text-sm">{text('Confirmation starts the next period the day after the old end date. Any grace days are inside that paid period, not extra days. Exact new dates are returned after confirmation; this API has no date preview.', 'يبدأ التجديد في اليوم التالي لنهاية الفترة الأصلية. أيام المهلة جزء من الفترة المدفوعة وليست أياماً إضافية. يعيد الخادم التواريخ الجديدة بعد التأكيد؛ لا توفر الواجهة معاينة للتواريخ.')}</p>
    {result && <p role="status">{text('Confirmed. New period:', 'تم التأكيد. الفترة الجديدة:')} <DateRange start={result.startDate} end={result.endDate} /></p>}
    {closed && !result && <p role="status">{text('This request is not awaiting confirmation.', 'هذا الطلب ليس بانتظار التأكيد.')}</p>}
    {canWrite && !closed && !mode && <div className="flex flex-wrap gap-2"><Button disabled={request.status !== 'submitted'} onClick={() => setMode('confirm')}>{text('Confirm renewal', 'تأكيد التجديد')}</Button><Button variant="outline" onClick={() => setMode('ask-proof')}>{text('Ask for a clearer proof', 'طلب إثبات أوضح')}</Button><Button variant="destructive" onClick={() => setMode('reject')}>{text('Reject renewal', 'رفض التجديد')}</Button></div>}
    {mode && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-3">{mode === 'confirm' ? <><Field label={text('Verified amount (EGP)', 'المبلغ المتحقق منه (جنيه)')}><Input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" dir="ltr" required /></Field><Field label={text('Payment method', 'طريقة الدفع')}><SubscriberSelect value={method} onValueChange={value => setMethod(value as RenewalMethod)} options={methods} /></Field><Field label={text('Paid on', 'تاريخ الدفع')}><DateField value={paidOn} onChange={setPaidOn} max={cairoDate()} required /></Field><Field label={text('Internal note', 'ملاحظة داخلية')}><textarea className={textareaClass} value={note} onChange={event => setNote(event.target.value)} maxLength={5000} /></Field>{method !== 'cash' && !request.hasProof && <p role="status">{text('Non-cash confirmation is unavailable without private proof.', 'تأكيد الدفع غير النقدي غير متاح دون إثبات خاص.')}</p>}</> : <Field label={text('Reason the subscriber will read', 'السبب الذي سيقرأه المشترك')}><textarea className={textareaClass} value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} /></Field>}</fieldset><FormActionBar dirty saving={busy}><Button type="button" variant="outline" disabled={busy} onClick={() => setMode(null)}>{text('Back', 'رجوع')}</Button><Button type="submit" disabled={busy || mode === 'confirm' && method !== 'cash' && !request.hasProof}>{busy ? text('Saving…', 'جارٍ الحفظ…') : mode === 'confirm' ? text('Confirm renewal', 'تأكيد التجديد') : mode === 'reject' ? text('Reject renewal', 'رفض التجديد') : text('Ask for a clearer proof', 'طلب إثبات أوضح')}</Button></FormActionBar></form>}
    {error && <RequestError message={error} />}
    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{closed ? text('Done', 'تم') : text('Cancel', 'إلغاء')}</Button>
  </DialogContent></Dialog></ActionBarNavigation>;
}
