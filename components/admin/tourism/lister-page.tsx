'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Banknote, Check, Map as MapIcon, UserCheck, UserX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { TOURISM_API, tripCover, type DocumentType, type ListerDetail } from '@/lib/api/tourism';
import { DateCell, DateRange } from '../date-cell';
import { RecordCell } from '../record-cell';
import { ActionDialog, LoadingState, RequestError, StatusBadge, type ActionSpec } from '../subscriber-ui';
import { CalmLine, LevelChip, Metrics, PrivatePhoto, tourismError, useTourismAction, useTourismText, VerifiedSeal } from './tourism-ui';
import { KycChip, useKindLabel } from './tourism-page';

const DOCUMENTS: [DocumentType, string, string][] = [['id_front', 'National ID, front', 'البطاقة، الوش'], ['id_back', 'National ID, back', 'البطاقة، الضهر'], ['selfie', 'Selfie', 'سيلفي'], ['license', 'License or commercial registry', 'الرخصة أو السجل التجاري']];

export function ListerPage({ listerId, canWrite, canSeeDocuments }: { listerId: string; canWrite: boolean; canSeeDocuments: boolean }) {
  const { text, lang, egp, num } = useTourismText();
  const kind = useKindLabel();
  const load = React.useCallback(() => adminApi.get<ListerDetail>(`${TOURISM_API}/agencies/${listerId}`), [listerId]);
  const resource = useSubscriberResource(load);
  const [ask, setAsk] = React.useState<ActionSpec | null>(null);
  const [showCancelled, setShowCancelled] = React.useState(false);
  const { run, busy } = useTourismAction(resource.refetch);
  const lister = resource.data;
  const Back = lang === 'ar' ? ArrowRight : ArrowLeft;
  const post = (verb: string, body?: object) => () => adminApi.post(`${TOURISM_API}/agencies/${listerId}/${verb}`, body);
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="space-y-3">
      <Link href="/dashboard/tourism?tab=listers" className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"><Back className="size-4" aria-hidden="true" />{text('Back to listers', 'رجوع للمنظّمين')}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><MapIcon className="size-5 text-primary" aria-hidden="true" />{lister?.name ?? text('Lister', 'المنظّم')}{lister?.verified && <VerifiedSeal size={22} />}</h1>
          {lister && <p className="mt-1 text-sm text-muted-foreground">{kind(lister.kind)} · {lister.city} · {text('joined', 'انضم')} <DateCell value={lister.createdAt} /></p>}
        </div>
        {lister && <div className="flex flex-wrap items-center gap-2"><LevelChip verified={lister.verified} />{!lister.verified && <KycChip status={lister.kycStatus} />}<StatusBadge status={lister.status} /></div>}
      </div>
    </header>
    {resource.loading && !lister && <LoadingState />}
    {resource.error && <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />}
    {lister && <>
      {lister.kycStatus !== 'none' && <Card><CardHeader><CardTitle>{text('Documents', 'المستندات')}</CardTitle><CardDescription>{lister.kycStatus === 'pending' ? text('Check that the selfie matches the ID, the names match the license and the InstaPay, then verify. Verified listers get the seal, need your approval for each trip and can hand out cash rewards.', 'اتأكد إن السيلفي زي البطاقة، والأسامي زي الرخصة وحساب إنستاباي، وبعدين وثّق. المنظّم الموثّق بياخد العلامة، وكل رحلة له محتاجة موافقتك، ويقدر يسلّم مكافآت الكاش.') : lister.kycStatus === 'rejected' ? `${text('Rejected because: ', 'اترفض بسبب: ')}${lister.kycRejectionReason ?? '—'}` : text('Checked and verified.', 'اتراجعت واتوثّقت.')}</CardDescription></CardHeader><CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{([[text('Owner name', 'اسم صاحب الحساب'), lister.ownerName], [text('National ID number', 'الرقم القومي'), lister.nationalId], [text('License number', 'رقم الرخصة'), lister.licenseNumber], [text('InstaPay (to pay back cash)', 'إنستاباي (لرجوع الكاش)'), lister.instapay], [text('Phone (team only)', 'الموبايل (للفريق بس)'), lister.phone]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium"><bdi>{value || '—'}</bdi></dd></div>)}<div><dt className="text-muted-foreground">{text('Sent on', 'اتبعتت يوم')}</dt><dd><DateCell value={lister.kycSubmittedAt} /></dd></div></dl>
        {canSeeDocuments ? <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">{DOCUMENTS.filter(([type]) => lister.documents.some((doc) => doc.type === type)).map(([type, en, ar]) => <PrivatePhoto key={type} path={`${TOURISM_API}/agencies/${listerId}/documents/${type}`} label={text(en, ar)} />)}</div>
          : <p className="text-sm text-muted-foreground">{text('ID photos are shown to admins only.', 'صور البطاقة بتظهر للأدمن بس.')}</p>}
        {canWrite && lister.kycStatus === 'pending' && <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button disabled={busy} onClick={() => { void run(post('verify'), text('Verified. The lister has the seal now.', 'اتوثّق المنظّم وبقت عنده العلامة.')); }}><Check aria-hidden="true" />{text('Verify lister', 'وثّق المنظّم')}</Button>
          <Button variant="outline" disabled={busy} onClick={() => setAsk({ title: text('Reject these documents?', 'رفض المستندات دي؟'), destructive: true, description: text('The lister sees your reason and can send new documents. It stays a free listing meanwhile.', 'المنظّم هيشوف السبب ويقدر يبعت مستندات جديدة، وبيفضل إعلان مجاني لحد كده.'), fields: [{ name: 'reason', label: text('Reason', 'السبب'), type: 'textarea', required: true }], submit: async (values) => { await run(post('reject', { reason: String(values.reason) }), text('Documents rejected. The lister sees the reason.', 'اترفضت المستندات والمنظّم هيشوف السبب.')); } })}><X aria-hidden="true" />{text('Reject documents', 'ارفض المستندات')}</Button>
        </div>}
      </CardContent></Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>{text('How its trips do', 'أداء رحلاته')}</CardTitle></CardHeader><CardContent className="space-y-2">
          <Metrics likes={lister.metrics.likeCount} views={lister.metrics.viewCount} rating={lister.metrics.rating} ratingCount={lister.metrics.ratingCount} />
          <p className="text-sm text-muted-foreground">{text(`${num(lister.metrics.trips)} trips · ${num(lister.metrics.seatsBooked)} seats booked`, `${num(lister.metrics.trips)} رحلة · ${num(lister.metrics.seatsBooked)} كرسي محجوز`)}</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{text('Cash rewards money', 'فلوس مكافآت الكاش')}</CardTitle><CardDescription>{text('What 5argny owes this lister for cash it handed to customers.', 'اللي على خرجني للمنظّم ده مقابل الكاش اللي سلّمه للعملاء.')}</CardDescription></CardHeader><CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">{([[text('To pay now', 'مطلوب دفعه دلوقتي'), lister.redemptions.owedEgp], [text('Waiting for the customer to confirm', 'مستني تأكيد العميل'), lister.redemptions.waitingAnswerEgp], [text('Disputed', 'متنازع عليه'), lister.redemptions.disputedEgp], [text('Already paid back', 'اترجّع خلاص'), lister.redemptions.reimbursedEgp]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="text-lg font-semibold tabular-nums">{egp(value)}</dd></div>)}</dl>
          {lister.redemptions.owedEgp > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm"><span>{text('Send by InstaPay to', 'حوّل على إنستاباي')} <strong dir="ltr">{lister.instapay ?? text('not set', 'مش متسجّل')}</strong></span>
            {canWrite && <Button size="sm" disabled={busy} onClick={() => setAsk({ title: text(`Mark ${egp(lister.redemptions.owedEgp)} as paid?`, `تسجيل ${egp(lister.redemptions.owedEgp)} كمدفوعة؟`), description: text(`Send ${egp(lister.redemptions.owedEgp)} to InstaPay ${lister.instapay ?? '—'} first, then confirm.`, `حوّل ${egp(lister.redemptions.owedEgp)} على إنستاباي ${lister.instapay ?? '—'} الأول وبعدين أكّد.`), submit: async () => { await run(post('reimburse'), text('Marked as paid. The lister sees it in its portal.', 'اتسجّلت مدفوعة والمنظّم هيشوفها في البوابة.')); } })}><Banknote aria-hidden="true" />{text('Mark as paid', 'سجّلها مدفوعة')}</Button>}
          </div>}
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>{text('Trips', 'الرحلات')} <span className="text-muted-foreground tabular-nums">({num(lister.trips.length)})</span></CardTitle></CardHeader><CardContent>
        {!lister.trips.length ? <CalmLine>{text('No trips yet.', 'لسه مفيش رحلات.')}</CalmLine>
          : <ul className="divide-y">{lister.trips.filter((trip) => showCancelled || trip.status !== 'cancelled').map((trip) => <li key={trip.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
            <Link href={`/dashboard/tourism?tab=trips&trip=${trip.id}`} className="underline-offset-4 hover:underline"><RecordCell nameAr={trip.title} nameEn={trip.titleEn} thumbnail={tripCover(trip)} context={<DateRange start={trip.startsAt} end={trip.endsAt} />} /></Link>
            <span className="flex flex-wrap items-center gap-3"><span className="text-sm tabular-nums">{egp(trip.priceEgp)}</span><StatusBadge status={trip.status} /></span>
          </li>)}</ul>}
        {!showCancelled && lister.trips.some((trip) => trip.status === 'cancelled') && <p className="flex flex-wrap items-center gap-2 pt-2 text-sm text-muted-foreground">{text(`${num(lister.trips.filter((trip) => trip.status === 'cancelled').length)} trips cancelled by the lister are not shown.`, `${num(lister.trips.filter((trip) => trip.status === 'cancelled').length)} رحلة ألغاها المنظّم مش ظاهرة.`)}<Button size="sm" variant="ghost" data-ro-allow="true" onClick={() => setShowCancelled(true)}>{text('Show them', 'اعرضها')}</Button></p>}
      </CardContent></Card>
      {canWrite && <Card><CardHeader><CardTitle>{text('Account', 'الحساب')}</CardTitle><CardDescription>{lister.status === 'active' ? text('Suspending takes all its trips off the site until you activate it again.', 'الإيقاف بيشيل كل رحلاته من الموقع لحد ما ترجّعه.') : text('Suspended: its trips are off the site.', 'موقوف: رحلاته مش ظاهرة على الموقع.')}</CardDescription></CardHeader><CardContent>
        {lister.status === 'active'
          ? <Button variant="destructive" disabled={busy} onClick={() => setAsk({ title: text(`Suspend ${lister.name}?`, `إيقاف ${lister.name}؟`), destructive: true, description: text('All its trips leave the site and it cannot add new ones until you activate it again.', 'كل رحلاته هتختفي من الموقع ومش هيقدر يضيف جديد لحد ما ترجّعه.'), submit: async () => { await run(post('suspend'), text('Lister suspended.', 'اتوقف المنظّم.')); } })}><UserX aria-hidden="true" />{text('Suspend lister', 'إيقاف المنظّم')}</Button>
          : <Button variant="outline" disabled={busy} onClick={() => { void run(post('activate'), text('Lister active again.', 'المنظّم رجع نشط.')); }}><UserCheck aria-hidden="true" />{text('Activate lister', 'تفعيل المنظّم')}</Button>}
      </CardContent></Card>}
    </>}
    <ActionDialog action={ask} onClose={() => setAsk(null)} />
  </div>;
}
