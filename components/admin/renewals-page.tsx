'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin-client';
import { renewalsApi, type RenewalPreview, type RenewalOutcome, type RenewalStatus } from '@/lib/api/renewals';
import type { Subscriber } from '@/lib/api/subscribers';
import { renewalError } from '@/lib/renewal-error';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RecordList, useListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { SubscriberBrand } from './subscriber-brand';
import { renewalWaitLabel, renewalSentLabel } from '@/lib/renewal-display';
import { FormActionBar } from './form-action-bar';
import { RenewalReviewDialog } from './renewal-review-dialog';
import { RenewalCashDialog } from './renewal-cash-dialog';
import { MoneyText, RequestError, useSubscriberText } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';
import { PageActions } from './page-actions';

export function RenewalsPage({ canWrite }: { canWrite: boolean }) {
  const { text, pick, lang } = useSubscriberText();
  const copy = useDashboardCopy();
  const params = useSearchParams();
  const address = useListAddress('renewals');
  const state = address.get('state');
  const status = ['submitted', 'needs_proof', 'confirmed', 'rejected'].includes(state) ? state as RenewalStatus : undefined;
  const overdue = address.get('age') === 'overdue';
  const load = React.useCallback(() => renewalsApi.list({ status, olderThan24h: overdue || undefined }), [status, overdue]);
  const resource = useSubscriberResource(load);
  const loadContext = React.useCallback(async () => {
    const first = await adminApi.list<Subscriber>('/v1/admin/subscribers', { skip: 0, limit: 100 });
    const rows = [...first.items];
    while (rows.length < first.total) {
      const page = await adminApi.list<Subscriber>('/v1/admin/subscribers', { skip: rows.length, limit: 100 });
      if (!page.items.length) throw new Error('INCOMPLETE_SUBSCRIBERS');
      rows.push(...page.items);
    }
    return rows;
  }, []);
  const context = useSubscriberResource(loadContext);
  const subscribers = new Map((context.data ?? []).map(row => [row.id, row]));
  const [selected, setSelected] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<{ ids: string[]; data: RenewalPreview } | null>(null);
  const [outcomes, setOutcomes] = React.useState<RenewalOutcome[]>([]);
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [error, setError] = React.useState('');
  const cash = params.get('renewals-cash') === '1';
  const setCash = (value: boolean) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set('renewals-cash', '1');
    else for (const key of [...next.keys()]) if (key === 'renewals-cash' || key.startsWith('cash-subscribers-') || key.startsWith('cash-periods-')) next.delete(key);
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
  };
  const requests = resource.data ?? [];
  const request = requests.find(row => row.id === params.get('renewals-request'));
  const open = (id?: string) => {
    const next = new URLSearchParams(window.location.search);
    if (id) next.set('renewals-request', id); else next.delete('renewals-request');
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
  };
  const toggle = (id: string, checked: boolean) => {
    if (!canWrite || busy) return;
    setSelected(current => checked ? current.length < 100 ? [...current, id] : current : current.filter(value => value !== id));
    setPreview(null); setOutcomes([]); setError('');
  };
  const runBulk = async () => {
    if (!canWrite || writing.current || !selected.length) return;
    writing.current = true; setBusy(true); setError('');
    try {
      if (!preview) setPreview({ ids: [...selected], data: await renewalsApi.preview(selected) });
      else {
        const response = await renewalsApi.apply(preview.ids, preview.data.planDigest);
        setOutcomes(response.outcomes);
        setSelected(current => current.filter(id => !response.outcomes.some(row => row.id === id && row.status === 'confirmed')));
        setPreview(null);
        if (!await resource.refreshAfterSave()) setError(text('Some requests were saved; refresh failed. Do not repeat confirmations.', 'حُفظت بعض الطلبات لكن تعذر التحديث. لا تكرر التأكيدات.'));
      }
    } catch (caught) { setError(renewalError(caught, lang)); setPreview(null); }
    finally { writing.current = false; setBusy(false); }
  };
  const statusText = (value: RenewalStatus) => copy({ submitted: 'Waiting for review', needs_proof: 'Needs a clearer proof', confirmed: 'Confirmed', rejected: 'Rejected' }[value]);
  const methods = [{ value: 'cash', label: 'Cash' }, { value: 'instapay', label: 'InstaPay' }, { value: 'wallet', label: 'Wallet' }, { value: 'bank_transfer', label: 'Bank transfer' }];
  return <section className="min-w-0 space-y-6" data-slot="renewals-queue">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold">{text('Renewals', 'التجديدات')}</h2><p className="max-w-prose text-sm text-muted-foreground">{text('Oldest first. We promise a review within 24 hours; a submission is not a payment.', 'الأقدم أولاً. نلتزم بالمراجعة خلال ٢٤ ساعة؛ إرسال الطلب ليس إثباتاً لاستلام المال.')}</p></div><PageActions form actions={[{ label: 'Record cash renewal', onClick: () => setCash(true), allowed: canWrite, disabled: busy }]} /></header>
    {resource.error && <RequestError message={renewalError(resource.error, lang)} retry={() => { void resource.refetch(); }} />}
    {context.error && <p role="status" className="text-sm text-muted-foreground">{text('Subscriber brand details could not load. The queue is still available.', 'تعذر تحميل تفاصيل علامات المشتركين. قائمة الطلبات ما زالت متاحة.')}</p>}
    <Card><CardContent><RecordList scope="renewals" address={address} records={requests} busy={resource.loading} empty="No renewal requests match these choices." searchText={row => `${row.subscriber.name} ${row.place.name} ${row.place.nameEn ?? ''} ${row.note ?? ''}`} filters={[
      { key: 'state', label: 'All renewal states', options: ['submitted', 'needs_proof', 'confirmed', 'rejected'].map(value => ({ value, label: statusText(value as RenewalStatus) })), value: row => row.status },
      { key: 'method', label: 'All payment methods', options: methods, value: row => row.method },
      { key: 'age', label: 'Any waiting time', options: [{ value: 'overdue', label: 'Older than 24 hours' }, { value: 'recent', label: 'Within 24 hours' }], value: row => row.olderThan24h ? 'overdue' : 'recent' },
    ]} render={visible => <div className="divide-y">{visible.map(row => <article key={row.id} className="flex min-h-14 min-w-0 flex-wrap items-start gap-3 py-4" data-renewal-id={row.id}>
      {canWrite && <Checkbox aria-label={`${text('Select renewal', 'اختيار التجديد')} ${row.subscriber.name}`} checked={selected.includes(row.id)} disabled={busy || row.status !== 'submitted' || selected.length >= 100 && !selected.includes(row.id)} onCheckedChange={checked => toggle(row.id, Boolean(checked))} />}
      <div className="min-w-0 flex-1 basis-48"><Link href={`/dashboard/subscribers/${row.subscriberId}`}><RecordCell name={row.subscriber.name} chips={<SubscriberBrand isBrand={subscribers.get(row.subscriberId)?.isBrand} />} context={pick(row.place.name, row.place.nameEn)} /></Link><p className="mt-2 text-sm">{copy(row.plan === 'owner_plus' ? 'Owner Plus' : 'Owner')} · {row.months} {text('months', 'أشهر')}</p><p className="text-sm"><MoneyText value={row.claimedAmount} /> · {copy(methods.find(method => method.value === row.method)?.label ?? '')}</p><p className="text-sm text-muted-foreground"><time dateTime={row.createdAt}>{renewalSentLabel(row.createdAt, lang)}</time> · {renewalWaitLabel(row.createdAt, lang)} · {copy(row.olderThan24h ? 'Older than 24 hours' : 'Within 24 hours')}</p><p className="text-sm text-muted-foreground">{row.hasProof ? text('Private proof attached', 'إثبات خاص مرفق') : row.method === 'cash' ? text('No receipt picture attached.', 'لا توجد صورة إيصال مرفقة.') : text('No picture: sent on WhatsApp', 'لا توجد صورة: أُرسلت على واتساب')}</p></div>
      <div className="flex flex-wrap items-center gap-2"><Badge variant={row.olderThan24h && row.status === 'submitted' ? 'destructive' : 'outline'}>{statusText(row.status)}</Badge><Button type="button" variant="outline" data-ro-allow="true" onClick={() => open(row.id)}>{text('Open request', 'فتح الطلب')}</Button></div>
    </article>)}</div>} /></CardContent></Card>
    {!resource.loading && params.has('renewals-request') && !request && <RequestError message={text('This request is outside the current filters. Clear the state and age filters to find it.', 'هذا الطلب خارج المرشحات الحالية. امسح مرشحي الحالة والعمر للعثور عليه.')} />}
    {preview && <section className="space-y-3" data-slot="renewal-bulk-preview"><h3 className="font-semibold">{text('Bulk preview — no amount overrides', 'معاينة جماعية — دون تغيير المبالغ')}</h3><p className="text-sm text-muted-foreground">{text('Each amount and eligibility comes from the backend. Exact new dates are not supplied by this preview.', 'كل مبلغ وقرار أهلية صادر من الخادم. هذه المعاينة لا تعيد التواريخ الجديدة الدقيقة.')}</p><RecordList scope="renewal-preview" records={preview.data.items} searchText={row => requests.find(request => request.id === row.id)?.subscriber.name ?? row.id} filters={[{ key: 'eligible', label: 'All preview results', options: [{ value: 'yes', label: 'Ready to confirm' }, { value: 'no', label: 'Excluded' }], value: row => row.wouldConfirm ? 'yes' : 'no' }]} render={visible => <ul>{visible.map(row => <li key={row.id} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-3"><RecordCell icon="receipt" name={requests.find(request => request.id === row.id)?.subscriber.name ?? row.id} context={row.wouldConfirm ? copy('Ready to confirm') : renewalError(row.reason, lang)} /><MoneyText value={row.amount} /></li>)}</ul>} /><p className="break-all text-xs text-muted-foreground">{text('Preview digest', 'بصمة المعاينة')}: <bdi>{preview.data.planDigest}</bdi></p></section>}
    {outcomes.length > 0 && <section className="space-y-3" data-slot="renewal-bulk-results"><h3 className="font-semibold">{text('Bulk results — each request is independent', 'نتائج المجموعة — كل طلب مستقل')}</h3><RecordList scope="renewal-results" records={outcomes} searchText={row => `${requests.find(request => request.id === row.id)?.subscriber.name ?? row.id} ${row.reason ?? ''}`} filters={[{ key: 'result', label: 'All results', options: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'excluded', label: 'Excluded' }, { value: 'failed', label: 'Failed' }], value: row => row.status }]} render={visible => <ul>{visible.map(row => <li key={row.id} className="min-h-14 border-b py-3"><RecordCell icon="receipt" name={requests.find(request => request.id === row.id)?.subscriber.name ?? row.id} context={row.status === 'confirmed' ? copy('Confirmed') : renewalError(row.reason, lang)} /></li>)}</ul>} /><p className="text-sm text-muted-foreground">{text('Refresh and preview remaining work again. A failure never undoes a confirmed sibling.', 'حدّث الطلبات المتبقية وعاينها مرة أخرى. فشل طلب لا يلغي تأكيد طلب آخر.')}</p></section>}
    {error && <RequestError message={error} />}
    {request && <RenewalReviewDialog key={request.id} request={request} canWrite={canWrite && !busy} onClose={() => open()} refresh={resource.refreshAfterSave} />}
    {cash && canWrite && <RenewalCashDialog onClose={() => setCash(false)} refresh={resource.refreshAfterSave} />}
    {canWrite && <FormActionBar active={!cash && !request} dirty={selected.length > 0} saving={busy} disabled={!!preview && !preview.data.items.some(row => row.wouldConfirm)} onSave={() => { void runBulk(); }} primaryLabel={preview ? text('Confirm selected renewals', 'تأكيد التجديدات المختارة') : text('Preview selected renewals', 'معاينة التجديدات المختارة')} onCancel={() => { setSelected([]); setPreview(null); setOutcomes([]); }} extraActions={<Button type="button" variant="outline" disabled={busy} onClick={() => setCash(true)}>{text('Record cash renewal', 'تسجيل تجديد نقدي')}</Button>} error={error} />}
  </section>;
}
