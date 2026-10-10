'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { renewalsApi, type ReminderKind, type ReminderResult } from '@/lib/api/renewals';
import { cairoDate, type SubscriberDetail } from '@/lib/api/subscribers';
import { timeLeftLabel } from '@/lib/renewal-display';
import { renewalError } from '@/lib/renewal-error';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { ActionDialog, type ActionSpec, RequestError, SubscriberSelect, useSubscriberText } from './subscriber-ui';
import { DateCell } from './date-cell';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { RenewalCashDialog } from './renewal-cash-dialog';

export function SubscriberRenewalActions({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, lang } = useSubscriberText();
  const session = useCurrentSession();
  const superAdmin = session.data?.user.role === 'super_admin';
  const current = subscriber.currentSubscription ?? subscriber.subscriptions.find(row => !row.supersededAt && ['active', 'expired'].includes(row.status));
  const load = React.useCallback(() => renewalsApi.list({ subscriberId: subscriber.id }), [subscriber.id]);
  const requests = useSubscriberResource(load, subscriber);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const params = useSearchParams();
  const cash = params.get('renewals-cash') === '1';
  const setCash = (value: boolean) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set('renewals-cash', '1');
    else for (const key of [...next.keys()]) if (key === 'renewals-cash' || key.startsWith('cash-subscribers-') || key.startsWith('cash-periods-')) next.delete(key);
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
  };
  const [grace, setGrace] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<ReminderKind>('ending_soon');
  const [language, setLanguage] = React.useState<'ar' | 'en'>('ar');
  const [notices, setNotices] = React.useState<Partial<Record<ReminderKind, ReminderResult>>>({});
  const [limited, setLimited] = React.useState<Partial<Record<ReminderKind, string>>>({});
  const notice = notices[kind];
  const sentToday = notice?.notice.day === cairoDate();
  const blockedToday = limited[kind] === cairoDate();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const send = async () => {
    if (!canWrite || sentToday || blockedToday || writing.current) return;
    writing.current = true; setBusy(true); setError('');
    try { const result = await renewalsApi.reminder(subscriber.id, kind, language); setNotices(previous => ({ ...previous, [kind]: result })); }
    catch (caught) { if (caught && typeof caught === 'object' && 'code' in caught && caught.code === 'REMINDER_RATE_LIMIT') setLimited(previous => ({ ...previous, [kind]: cairoDate() })); setError(renewalError(caught, lang)); }
    finally { writing.current = false; setBusy(false); }
  };
  const extend = () => {
    if (!canWrite || !current || current.graceUntil && !superAdmin) return;
    setAction({ title: text('Extend 7 days?', 'تمديد ٧ أيام؟'), description: text('The place stays active during grace. These days come out of the next paid period: renewal still starts the day after the original end. The backend returns the grace date after confirmation.', 'يبقى المكان نشطاً خلال المهلة. تُحتسب هذه الأيام من الفترة المدفوعة التالية؛ يبدأ التجديد في اليوم التالي للنهاية الأصلية. يعيد الخادم تاريخ المهلة بعد التأكيد.'), fields: [{ name: 'reason', label: text('Reason', 'السبب'), type: 'textarea', required: !!current.graceUntil }], submit: async values => {
      if (!canWrite) return;
      const result = await renewalsApi.extendGrace(current.id, String(values.reason ?? '').trim() || undefined);
      setGrace(result.graceUntil);
      if (!await refresh()) setError(text('Grace was saved. Refresh before taking another action.', 'حُفظت المهلة. حدّث البيانات قبل أي إجراء آخر.'));
    } });
  };
  const kinds = [{ value: 'ending_soon', label: text('Ending soon', 'قرب انتهاء الاشتراك') }, { value: 'unpaid_renewal', label: text('Unpaid renewal', 'تجديد غير مدفوع') }, { value: 'in_grace', label: text('In grace', 'في المهلة') }];
  return <section className="space-y-4" data-slot="subscriber-renewal-actions">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="min-w-0 space-y-2">
    {current && <p className="text-sm" data-slot="time-left">{timeLeftLabel(current, lang)}{current.graceUntil && <> · {text('Grace until', 'المهلة حتى')} <DateCell value={current.graceUntil} /></>}</p>}
    {grace && <p role="status">{text('Grace saved until', 'حُفظت المهلة حتى')} <DateCell value={grace} /></p>}
    </div>
    {canWrite && <div className="space-y-2 sm:ms-auto"><div className="flex flex-wrap gap-2 sm:justify-end"><Button type="button" variant="outline" disabled={!current || busy || !!grace && !current.graceUntil || !!current.graceUntil && !superAdmin} title={current?.graceUntil && !superAdmin ? text('Another extension needs a super admin and a reason.', 'التمديد مرة أخرى يحتاج المسؤول الأعلى وسبباً.') : undefined} onClick={extend}>{text('Extend 7 days', 'تمديد ٧ أيام')}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setCash(true)}>{text('Record cash renewal', 'تسجيل تجديد نقدي')}</Button></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><label className="min-w-0"><span className="sr-only">{text('Reminder kind', 'نوع التذكير')}</span><SubscriberSelect value={kind} onValueChange={value => setKind(value as ReminderKind)} options={kinds} disabled={busy} /></label><label className="min-w-0"><span className="sr-only">{text('Recipient language', 'لغة المستلم')}</span><SubscriberSelect value={language} onValueChange={value => setLanguage(value as 'ar' | 'en')} options={[{ value: 'ar', label: text('Arabic', 'العربية') }, { value: 'en', label: text('English', 'الإنجليزية') }]} disabled={busy} /></label><Button type="button" disabled={busy || sentToday || blockedToday} onClick={() => { void send(); }}>{text('Send reminder', 'إرسال تذكير')}</Button></div></div>}
    </div>
    {canWrite && <div className="space-y-2"><p className="text-sm text-muted-foreground">{sentToday || blockedToday ? text('This kind was already sent today in Cairo; one per day.', 'أُرسل هذا النوع اليوم بتوقيت القاهرة؛ مرة واحدة يومياً.') : text('Stores a portal notice and prepares WhatsApp text; it does not send WhatsApp or SMS.', 'يسجل تنبيهاً في البوابة ويجهز رسالة واتساب؛ لا يرسل واتساب أو رسالة نصية.')}</p><p className="text-sm text-muted-foreground">{notice ? <>{text('Last sent in this review', 'آخر إرسال في هذه المراجعة')}: <DateCell value={notice.notice.createdAt} /></> : text('The API does not provide reminder history. The server still enforces the daily limit.', 'لا توفر الواجهة سجل التذكيرات. يطبق الخادم الحد اليومي رغم ذلك.')}</p>{notice && <><p dir="auto" className="break-words rounded-lg bg-muted p-3 text-sm">{notice.message}</p><a className="underline" href={notice.whatsappUrl} target="_blank" rel="noopener noreferrer">{text('Open prepared WhatsApp message', 'فتح رسالة واتساب المجهزة')}</a></>}</div>}
    {requests.error && <RequestError message={renewalError(requests.error, lang)} retry={() => { void requests.refetch(); }} />}
    <RecordList scope="subscriber-renewals" records={(requests.data ?? []).filter(row => ['submitted', 'needs_proof'].includes(row.status))} busy={requests.loading} empty="No open renewal request." searchText={row => `${row.place.name} ${row.place.nameEn ?? ''} ${row.note ?? ''}`} filters={[{ key: 'state', label: 'All renewal states', options: [{ value: 'submitted', label: 'Waiting for review' }, { value: 'needs_proof', label: 'Needs a clearer proof' }], value: row => row.status }]} render={visible => <ul>{visible.map(row => <li key={row.id} className="min-h-14 border-b py-3"><Link href={`/dashboard/subscribers?tab=renewals&renewals-request=${row.id}`}><RecordCell icon="receipt" name={text('Open renewal request', 'طلب تجديد مفتوح')} context={row.place.name} /></Link></li>)}</ul>} />

    {error && <RequestError message={error} />}
    <ActionDialog action={action} onClose={() => setAction(null)} />
    {cash && <RenewalCashDialog canWrite={canWrite} subscriberId={subscriber.id} onClose={() => setCash(false)} refresh={refresh} />}
  </section>;
}
