'use client';

import * as React from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { renewalsApi, type RenewalRequest } from '@/lib/api/renewals';
import { decimalMoney, type Subscriber, type SubscriberDetail, type Subscription } from '@/lib/api/subscribers';
import type { PlanKey, PlanCatalogueRow } from '@/lib/api/plans';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { renewalError } from '@/lib/renewal-error';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { DateRange } from './date-cell';
import { PlanChoices } from './plan-choices';
import { FormActionBar, ActionBarNavigation } from './form-action-bar';
import { Field, RequestError, SubscriberSelect, textareaClass, useSubscriberText } from './subscriber-ui';

export function RenewalCashDialog({ subscriberId: initialId, onClose, refresh, canWrite = true }: { subscriberId?: string; canWrite?: boolean; onClose: () => void; refresh: () => Promise<boolean> }) {
  const { text, pick, lang } = useSubscriberText();
  const [openedWritable] = React.useState(canWrite);
  const address = useListAddress('cash-subscribers');
  const [subscriberId, setSubscriberId] = React.useState(initialId ?? '');
  const subscriberStatus = address.get('status');
  const loadSubscribers = React.useCallback(() => !subscriberId ? adminApi.list<Subscriber>('/v1/admin/subscribers', { search: address.query || undefined, skip: address.skip, limit: address.limit, status: subscriberStatus || undefined }) : Promise.resolve({ items: [], total: 0, skip: 0, limit: 10 }), [subscriberId, address.query, address.skip, address.limit, subscriberStatus]);
  const subscribers = useSubscriberResource(loadSubscribers);
  const loadDetail = React.useCallback(() => subscriberId ? adminApi.get<SubscriberDetail>(`/v1/admin/subscribers/${subscriberId}`) : Promise.resolve(null), [subscriberId]);
  const detail = useSubscriberResource(loadDetail);
  const loadCatalogue = React.useCallback(() => adminApi.get<PlanCatalogueRow[]>('/v1/admin/plans'), []);
  const catalogue = useSubscriberResource(loadCatalogue);
  const [period, setPeriod] = React.useState<Subscription | null>(null);
  const [plan, setPlan] = React.useState<PlanKey>('owner');
  const [months, setMonths] = React.useState('1');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [submitted, setSubmitted] = React.useState<RenewalRequest | null>(null);
  const [existingId, setExistingId] = React.useState<string | null>(null);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || !period || writing.current || submitted) return;
    writing.current = true; setBusy(true); setError(''); setExistingId(null);
    try {
      if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) throw new Error('INVALID_PROOF_FILE');
      const normalizedAmount = decimalMoney(amount);
      if (!/^\d{1,10}\.\d{2}$/.test(normalizedAmount)) throw new Error('INVALID_AMOUNT');
      if (!catalogue.data?.find(row => row.plan === plan)?.active) throw new Error('PLAN_INACTIVE');
      const form = new FormData();
      form.set('subscriptionId', period.id); form.set('plan', plan); form.set('months', months); form.set('claimedAmount', normalizedAmount); form.set('method', 'cash');
      if (note.trim()) form.set('note', note.trim());
      if (file) form.set('proof', file);
      const response = await renewalsApi.submitCash(form);
      setSubmitted(response);
      if (!await refresh()) setError(text('Submitted, but refresh failed. Do not submit again.', 'أُرسل الطلب لكن تعذر التحديث. لا ترسله مرة أخرى.'));
    } catch (caught) { if (caught instanceof AdminApiError) setExistingId(caught.requestId); setError(renewalError(caught, lang)); }
    finally { writing.current = false; setBusy(false); }
  };
  const changeSubscriber = (id: string) => { setSubscriberId(id); setPeriod(null); };
  if (!openedWritable && !canWrite) return null;
  return <ActionBarNavigation links={[]}><Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" dir={lang === 'ar' ? 'rtl' : 'ltr'} showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{text('Record cash renewal', 'تسجيل تجديد نقدي')}</DialogTitle><DialogDescription>{text('This creates a waiting request, not a payment. A team member must confirm it separately.', 'ينشئ هذا طلباً بانتظار المراجعة، وليس دفعة. يجب أن يؤكده أحد أفراد الفريق بصورة منفصلة.')}</DialogDescription></DialogHeader>
    {!subscriberId && <RecordList scope="cash-subscribers" address={address} records={subscribers.data?.items ?? []} total={subscribers.data?.total ?? 0} busy={subscribers.loading} searchText={row => row.name} filters={[{ key: 'status', label: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], value: row => row.status }]} render={visible => <ul>{visible.map(row => <li key={row.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b py-3"><RecordCell name={row.name} /><Button variant="outline" disabled={busy || !canWrite} onClick={() => changeSubscriber(row.id)}>{text('Choose subscriber', 'اختيار المشترك')}</Button></li>)}</ul>} />}
    {detail.data && !period && <RecordList scope="cash-periods" records={detail.data.subscriptions.filter(row => row.status !== 'cancelled' && !row.supersededAt)} searchText={row => `${row.planName} ${row.startDate} ${row.endDate}`} filters={[{ key: 'status', label: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'scheduled', label: 'Scheduled' }], value: row => row.status }]} render={visible => <ul>{visible.map(row => <li key={row.id} data-cash-period={row.id} className="flex min-h-14 flex-wrap justify-between gap-3 border-b py-3"><div><RecordCell icon="calendar" name={pick(detail.data?.places.find(place => place.id === row.placeId)?.name, detail.data?.places.find(place => place.id === row.placeId)?.nameEn) || row.placeId} context={row.planName} /><DateRange start={row.startDate} end={row.endDate} /></div><Button variant="outline" disabled={busy || !canWrite} onClick={() => { setPeriod(row); setPlan(row.plan ?? 'owner'); }}>{text('Choose period', 'اختيار الفترة')}</Button></li>)}</ul>} />}
    {[subscribers.error, detail.error, catalogue.error].filter(Boolean).map((caught, index) => <RequestError key={index} message={renewalError(caught, lang)} />)}
    {period && !submitted && <form onSubmit={save} className="space-y-4"><p>{detail.data?.name} · <DateRange start={period.startDate} end={period.endDate} /></p><fieldset className="space-y-3" disabled={busy || !canWrite}><PlanChoices value={plan} onValueChange={setPlan} catalogue={catalogue.data ?? []} disabled={busy || !canWrite || catalogue.loading} /><Field label={text('Length', 'المدة')}><SubscriberSelect value={months} onValueChange={setMonths} options={['1', '2', '3', '6'].map(value => ({ value, label: `${value} ${text('months', 'أشهر')}` }))} /></Field><Field label={text('Claimed amount (EGP)', 'المبلغ المذكور (جنيه)')}><Input value={amount} inputMode="decimal" dir="ltr" required onChange={event => setAmount(event.target.value)} /></Field><Field label={text('Note', 'ملاحظة')}><textarea className={textareaClass} value={note} maxLength={5000} onChange={event => setNote(event.target.value)} /></Field><FileUpload label={text('Receipt picture (optional)', 'صورة الإيصال (اختيارية)')} description={text('Private storage is currently unavailable on production. Cash without a picture can be submitted. JPEG, PNG or WebP, up to 5 MB.', 'التخزين الخاص غير متاح حالياً على الإنتاج. يمكن إرسال النقد دون صورة. JPEG أو PNG أو WebP حتى ٥ ميجابايت.')} accept="image/jpeg,image/png,image/webp" disabled={busy || !canWrite} onChange={event => setFile(event.target.files?.[0] ?? null)} /></fieldset><FormActionBar dirty saving={busy} primaryLabel={text('Submit cash request', 'إرسال الطلب النقدي')} onCancel={onClose} disabled={!canWrite || catalogue.loading || !!catalogue.error} /></form>}
    {submitted && <p role="status">{text('Cash request submitted. It is waiting for explicit confirmation in Renewals.', 'أُرسل الطلب النقدي. ينتظر التأكيد الصريح في التجديدات.')}</p>}
    {(existingId || submitted) && <Link className="block break-words underline" href={`/dashboard/subscribers?tab=renewals&renewals-request=${existingId ?? submitted?.id}`}>{text('Open request in queue', 'فتح الطلب في القائمة')}</Link>}
    {error && <RequestError message={error} />}
    {(submitted || !period) && <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{submitted ? text('Done', 'تم') : text('Cancel', 'إلغاء')}</Button>}
  </DialogContent></Dialog></ActionBarNavigation>;
}
