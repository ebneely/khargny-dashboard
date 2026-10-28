'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Map as MapIcon, Check, X, EyeOff, UserX, Flag, Banknote, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { averageRating, TOURISM_API, TRIP_STATUS_ORDER, tripCover, type ListerRow, type OwedLister, type Redemption, type TourismOverview, type TourismReport, type TourismSettings, type TourismTrip } from '@/lib/api/tourism';
import { DateCell, DateRange } from '../date-cell';
import { RecordCell } from '../record-cell';
import { RecordList } from '../record-list';
import { RowActions } from '../row-actions';
import { SegmentedControl } from '../segmented-control';
import { ActionDialog, LoadingState, RequestError, StatusBadge, type ActionSpec } from '../subscriber-ui';
import { CalmLine, LevelChip, ListerName, Metrics, TripDialog, tourismError, tripTitle, useTourismAction, useTourismText, VerifiedSeal } from './tourism-ui';

const TABS = ['today', 'listers', 'trips', 'cash', 'reports'] as const;

export function TourismPage({ canWrite }: { canWrite: boolean }) {
  const { text, lang } = useTourismText();
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="max-w-2xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><MapIcon className="size-5 text-primary" aria-hidden="true" />{text('Trips marketplace', 'سوق الرحلات')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{text('5argny is a free marketplace. Check listers, approve their trips, pay back the 250 EGP cash rewards and handle reports.', 'خرجني سوق مجاني. راجع المنظّمين، اقبل رحلاتهم، رجّع لهم الـ٢٥٠ جنيه كاش، وتابع البلاغات.')}</p>
      {!canWrite && <p className="mt-2 text-sm text-muted-foreground">{text('You can read everything here. Only admins can change it.', 'تقدر تشوف كل حاجة هنا، والتعديل للأدمن بس.')}</p>}
    </header>
    <UrlTabs values={TABS}>
      <TabsList aria-label={text('Trips marketplace sections', 'أقسام سوق الرحلات')}>
        <TabsTrigger value="today">{text('Today', 'النهارده')}</TabsTrigger>
        <TabsTrigger value="listers">{text('Listers', 'المنظّمين')}</TabsTrigger>
        <TabsTrigger value="trips">{text('Trips', 'الرحلات')}</TabsTrigger>
        <TabsTrigger value="cash">{text('Cash rewards', 'مكافآت الكاش')}</TabsTrigger>
        <TabsTrigger value="reports">{text('Reports', 'البلاغات')}</TabsTrigger>
      </TabsList>
      <UrlTabsContent value="today" lazy className="space-y-6"><TodayTab /></UrlTabsContent>
      <UrlTabsContent value="listers" lazy><ListersTab /></UrlTabsContent>
      <UrlTabsContent value="trips" lazy><TripsTab canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="cash" lazy className="space-y-6"><CashTab canWrite={canWrite} /></UrlTabsContent>
      <UrlTabsContent value="reports" lazy><ReportsTab canWrite={canWrite} /></UrlTabsContent>
    </UrlTabs>
  </div>;
}

// ---------- Today ----------

function TodayTab() {
  const { text, lang, num, egp } = useTourismText();
  const load = React.useCallback(() => Promise.all([adminApi.get<TourismOverview>(`${TOURISM_API}/overview`), adminApi.get<{ owedByLister: OwedLister[] }>(`${TOURISM_API}/redemptions`)]), []);
  const resource = useSubscriberResource(load);
  if (resource.loading && !resource.data) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />;
  const [overview, { owedByLister }] = resource.data;
  const owed = owedByLister.reduce((sum, row) => sum + row.owedEgp, 0);
  const inbox = [
    { count: overview.listers.pending ?? 0, label: text(`${num(overview.listers.pending ?? 0)} ${plural(overview.listers.pending ?? 0, 'lister', 'listers')} sent ID and license for review`, `${num(overview.listers.pending ?? 0)} منظّم بعتوا البطاقة والرخصة للمراجعة`), action: text('Review documents', 'راجع المستندات'), href: '?tab=listers&listers-kyc=pending' },
    { count: overview.trips.pending ?? 0, label: text(`${num(overview.trips.pending ?? 0)} verified ${plural(overview.trips.pending ?? 0, 'trip waits', 'trips wait')} for your approval`, `${num(overview.trips.pending ?? 0)} رحلة موثّقة مستنية موافقتك`), action: text('Review trips', 'راجع الرحلات'), href: '?tab=trips&trips-status=pending' },
    { count: overview.rewards.disputed ?? 0, label: text(`${num(overview.rewards.disputed ?? 0)} ${plural(overview.rewards.disputed ?? 0, 'customer says they did', 'customers say they did')} not get their cash`, `${num(overview.rewards.disputed ?? 0)} عميل قالوا إنهم مستلموش الكاش`), action: text('Decide', 'قرّر'), href: '?tab=cash#disputes' },
    { count: overview.openReports, label: text(`${num(overview.openReports)} customer ${plural(overview.openReports, 'report is', 'reports are')} open`, `${num(overview.openReports)} بلاغ من العملاء مفتوح`), action: text('Open reports', 'افتح البلاغات'), href: '?tab=reports' },
    { count: owed, label: text(`5argny owes listers ${egp(owed)} for cash they handed out (${num(owedByLister.length)} ${plural(owedByLister.length, 'lister', 'listers')})`, `خرجني عليها ${egp(owed)} للمنظّمين مقابل الكاش اللي سلّموه (${num(owedByLister.length)} منظّم)`), action: text('Pay listers', 'ادفع للمنظّمين'), href: '?tab=cash#owed' },
  ].filter((item) => item.count > 0);
  const { budget } = overview;
  const spentShare = budget.budgetEgp ? Math.min(100, Math.round((budget.spentEgp / budget.budgetEgp) * 100)) : 0;
  const freeListers = (overview.listers.none ?? 0) + (overview.listers.rejected ?? 0);
  return <>
    <Card><CardHeader><CardTitle>{text('Needs you today', 'محتاج منك النهارده')}</CardTitle></CardHeader><CardContent>
      {!inbox.length ? <CalmLine>{text('Nothing waiting ✓', 'مفيش حاجة مستنية ✓')}</CalmLine>
        : <ul className="divide-y">{inbox.map((item) => <li key={item.href} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2"><span className="text-sm">{item.label}</span><Button size="sm" variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={item.href} />}>{item.action}</Button></li>)}</ul>}
    </CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{text('Marketplace', 'السوق')}</CardTitle><CardDescription>{text('Who lists, what is public and who books.', 'مين بيعرض، إيه الظاهر للناس، ومين بيحجز.')}</CardDescription></CardHeader><CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Fact label={<span className="inline-flex items-center gap-1">{text('Verified listers', 'منظّمين موثّقين')}<VerifiedSeal size={14} /></span>} value={num(overview.listers.verified ?? 0)} />
          <Fact label={text('Free listers (no documents checked)', 'منظّمين بإعلان مجاني (من غير مستندات)')} value={num(freeListers)} />
          <Fact label={text('Public trips', 'رحلات ظاهرة للناس')} value={num(overview.trips.live ?? 0)} />
          <Fact label={text('Trips hidden, rejected or cancelled', 'رحلات مخفية أو مرفوضة أو ملغية')} value={num((overview.trips.hidden ?? 0) + (overview.trips.rejected ?? 0) + (overview.trips.cancelled ?? 0))} />
          <Fact label={text('Customers signed up', 'عملاء مسجّلين')} value={num(overview.customers)} />
          <Fact label={text('Bookings not cancelled', 'حجوزات قائمة')} value={num(overview.activeBookings)} />
        </dl>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text('Cash reward budget', 'ميزانية مكافآت الكاش')}</CardTitle><CardDescription>{overview.settings.rewardsEnabled ? text(`Customers get ${egp(overview.settings.rewardAmountEgp)} cash at the lister's office. Stops by itself when the budget runs out.`, `العميل بياخد ${egp(overview.settings.rewardAmountEgp)} كاش من مكتب المنظّم. بتقف لوحدها لما الميزانية تخلص.`) : text('Cash rewards are off. Customers earn none until you turn them on.', 'مكافآت الكاش مقفولة. محدش هياخد كاش لحد ما تفتحها.')}</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={text(`${num(spentShare)}% of the budget used`, `اتصرف ${num(spentShare)}٪ من الميزانية`)}><div className="h-full rounded-full bg-success" style={{ width: `${spentShare}%` }} /></div>
        <dl className="grid grid-cols-3 gap-3 text-sm"><Fact label={text('Budget', 'الميزانية')} value={egp(budget.budgetEgp)} /><Fact label={text('Handed out', 'اتصرف')} value={egp(budget.spentEgp)} /><Fact label={text('Left', 'فاضل')} value={egp(budget.leftEgp)} /></dl>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Fact label={text('Waiting for the customer to visit', 'مستنية العميل يروح المكتب')} value={num(overview.rewards.waiting ?? 0)} />
          <Fact label={text('Cash given, waiting for the customer to confirm', 'اتسلّم الكاش ومستني تأكيد العميل')} value={num(overview.rewards.cash_given ?? 0)} />
          <Fact label={text('Confirmed, to pay back', 'متأكدة ولسه هنرجّعها')} value={num(overview.rewards.confirmed ?? 0)} />
          <Fact label={text('Paid back to listers', 'اترجّعت للمنظّمين')} value={num(overview.rewards.reimbursed ?? 0)} />
          <Fact label={text('Disputed', 'متنازع عليها')} value={num(overview.rewards.disputed ?? 0)} />
          <Fact label={text('Voided by the team', 'ألغاها الفريق')} value={num(overview.rewards.void ?? 0)} />
        </dl>
      </CardContent></Card>
    </div>
  </>;
}

const plural = (count: number, one: string, many: string) => count === 1 ? one : many;

function Fact({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex flex-col"><dt className="text-muted-foreground">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value}</dd></div>;
}

// ---------- Listers ----------

export function useKindLabel() {
  const { text } = useTourismText();
  return (kind: string) => ({ agency: text('Travel agency', 'شركة سياحة'), guide: text('Guide', 'مرشد'), individual: text('Organizer', 'منظّم') }[kind] ?? kind);
}

export function KycChip({ status }: { status: string }) {
  const { text } = useTourismText();
  return status === 'none' ? <StatusBadge status="none">{text('No documents sent', 'مبعتش مستندات')}</StatusBadge> : status === 'pending' ? <StatusBadge status="pending">{text('Documents waiting', 'مستندات مستنية')}</StatusBadge> : <StatusBadge status={status} />;
}

function ListersTab() {
  const { text, lang, num } = useTourismText();
  const kind = useKindLabel();
  const load = React.useCallback(() => adminApi.get<ListerRow[]>(`${TOURISM_API}/agencies`), []);
  const resource = useSubscriberResource(load);
  if (resource.error) return <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />;
  // Documents waiting for review come first; the rest keep the API's newest-first order.
  const rows = [...(resource.data ?? [])].sort((a, b) => Number(b.kycStatus === 'pending') - Number(a.kycStatus === 'pending'));
  return <Card><CardHeader><CardTitle>{text('Listers', 'المنظّمين')}</CardTitle><CardDescription>{text('Agencies, guides and organizers who list trips. Verified listers sent their ID, selfie, license and InstaPay.', 'شركات ومرشدين ومنظّمين بيعرضوا رحلات. الموثّق بعت البطاقة وسيلفي والرخصة وحساب إنستاباي.')}</CardDescription></CardHeader><CardContent>
    {!resource.loading && !rows.length ? <CalmLine>{text('No listers yet.', 'لسه مفيش منظّمين.')}</CalmLine>
      : <RecordList scope="listers" records={rows} busy={resource.loading} searchText={(row) => `${row.name} ${row.city}`} empty={text('No lister matches this search.', 'مفيش منظّم بالاسم ده.')}
        filters={[{ key: 'kyc', label: text('All listers', 'كل المنظّمين'), options: [{ value: 'pending', label: text('Documents waiting', 'مستندات مستنية') }, { value: 'verified', label: text('Verified', 'موثّق') }, { value: 'rejected', label: text('Rejected', 'مرفوض') }, { value: 'none', label: text('No documents sent', 'مبعتش مستندات') }], value: (row) => row.kycStatus }]}
        render={(visible) => <div className="overflow-x-auto"><Table layout="list"><TableHeader><TableRow>
          <TableHead>{text('Lister', 'المنظّم')}</TableHead><TableHead>{text('Documents', 'المستندات')}</TableHead><TableHead className="text-end">{text('Trips', 'الرحلات')}</TableHead><TableHead>{text('Likes · views · rating', 'إعجاب · مشاهدة · تقييم')}</TableHead>
        </TableRow></TableHeader><TableBody>{visible.map((row) => <TableRow key={row.id}>
          <TableCell><Link href={`/dashboard/tourism/listers/${row.id}`} className="underline-offset-4 hover:underline focus-visible:underline"><RecordCell name={row.name} icon="location" chips={<>{row.kycStatus === 'verified' && <VerifiedSeal />}{row.status === 'suspended' && <StatusBadge status="suspended" />}</>} context={`${kind(row.kind)} · ${row.city}`} /></Link></TableCell>
          <TableCell><KycChip status={row.kycStatus} /></TableCell>
          <TableCell className="text-end tabular-nums">{num(row.trips)}</TableCell>
          <TableCell><Metrics likes={row.likeCount} views={row.viewCount} rating={averageRating(row.ratingSum, row.ratingCount)} ratingCount={row.ratingCount} /></TableCell>
        </TableRow>)}</TableBody></Table></div>} />}
  </CardContent></Card>;
}

// ---------- Trips ----------

function TripsTab({ canWrite }: { canWrite: boolean }) {
  const { text, lang, egp, num } = useTourismText();
  const params = useSearchParams();
  const load = React.useCallback(() => adminApi.get<TourismTrip[]>(`${TOURISM_API}/trips`), []);
  const resource = useSubscriberResource(load);
  const [openId, setOpenId] = React.useState<string | null>(params.get('trip'));
  const [selected, setSelected] = React.useState<string[]>([]);
  const { run, busy } = useTourismAction(resource.refetch);
  const rows = React.useMemo(() => [...(resource.data ?? [])].sort((a, b) => TRIP_STATUS_ORDER.indexOf(a.status) - TRIP_STATUS_ORDER.indexOf(b.status)), [resource.data]);
  const pendingIds = rows.filter((row) => row.status === 'pending').map((row) => row.id);
  const chosen = selected.filter((id) => pendingIds.includes(id));
  const open = (id: string | null) => {
    setOpenId(id);
    const next = new URLSearchParams(window.location.search);
    if (id) next.set('trip', id); else next.delete('trip');
    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
  };
  const approveSelected = () => run(async () => {
    const results = await Promise.allSettled(chosen.map((id) => adminApi.post(`${TOURISM_API}/trips/${id}/approve`, {})));
    setSelected([]);
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed) toast.error(text(`${num(failed)} trips changed before you approved them.`, `${num(failed)} رحلة اتغيّرت قبل ما توافق عليها.`));
  }, text(`Approved ${num(chosen.length)} trips. They are public now.`, `اتقبلت ${num(chosen.length)} رحلة وبقت ظاهرة للناس.`));
  if (resource.error) return <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />;
  return <Card><CardHeader><CardTitle>{text('Trips', 'الرحلات')}</CardTitle><CardDescription>{text('Trips from verified listers wait for your approval. Free listings go public at once with the disclaimer; you can hide any trip.', 'رحلات المنظّمين الموثّقين مستنية موافقتك. الإعلان المجاني بيظهر على طول مع التنبيه، وتقدر تخفي أي رحلة.')}</CardDescription></CardHeader><CardContent className="space-y-3">
    {canWrite && chosen.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3"><span className="text-sm">{text(`${num(chosen.length)} trips selected`, `${num(chosen.length)} رحلة متحددة`)}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected([])}>{text('Clear', 'إلغاء التحديد')}</Button><Button size="sm" disabled={busy} onClick={() => { void approveSelected(); }}><Check aria-hidden="true" />{text(`Approve ${num(chosen.length)} trips`, `اقبل ${num(chosen.length)} رحلة`)}</Button></div></div>}
    {!resource.loading && !rows.length ? <CalmLine>{text('No trips yet.', 'لسه مفيش رحلات.')}</CalmLine>
      : <RecordList scope="trips" records={rows} busy={resource.loading} searchText={(row) => `${row.title} ${row.titleEn ?? ''} ${row.destination} ${row.agency.name}`} empty={text('Nothing here ✓', 'مفيش حاجة هنا ✓')}
        filters={[
          { key: 'status', label: text('All states', 'كل الحالات'), options: [{ value: 'pending', label: text('Waiting for review', 'بانتظار المراجعة') }, { value: 'live', label: text('Public', 'ظاهرة') }, { value: 'rejected', label: text('Rejected', 'مرفوضة') }, { value: 'hidden', label: text('Hidden', 'مخفية') }, { value: 'cancelled', label: text('Cancelled by the lister', 'ألغاها المنظّم') }], value: (row) => row.status },
          { key: 'level', label: text('All levels', 'كل المستويات'), options: [{ value: 'monitored', label: text('Verified listers', 'منظّمين موثّقين') }, { value: 'free', label: text('Free listings', 'إعلانات مجانية') }], value: (row) => row.monitored ? 'monitored' : 'free' },
        ]}
        render={(visible) => <div className="overflow-x-auto"><Table layout="list"><TableHeader><TableRow>
          <TableHead>{text('Trip', 'الرحلة')}</TableHead><TableHead>{text('Lister', 'المنظّم')}</TableHead><TableHead>{text('Dates', 'المواعيد')}</TableHead><TableHead className="text-end">{text('Price per seat', 'سعر الكرسي')}</TableHead><TableHead column="status">{text('State', 'الحالة')}</TableHead><TableHead column="actions"><span className="sr-only">{text('Actions', 'إجراءات')}</span></TableHead>
        </TableRow></TableHeader><TableBody>{visible.map((row) => <TableRow key={row.id}>
          <TableCell><div className="flex items-center gap-2">{canWrite && row.status === 'pending' && <Checkbox aria-label={text(`Select ${tripTitle(row, lang)}`, `اختار ${tripTitle(row, lang)}`)} checked={selected.includes(row.id)} onCheckedChange={(checked) => setSelected((list) => checked ? [...list, row.id] : list.filter((id) => id !== row.id))} />}
            <button type="button" className="text-start underline-offset-4 hover:underline focus-visible:underline" onClick={() => open(row.id)}><RecordCell nameAr={row.title} nameEn={row.titleEn} thumbnail={tripCover(row)} chips={(row.reports ?? 0) > 0 ? <span className="inline-flex items-center gap-0.5 text-xs text-warning"><Flag className="size-3" aria-hidden="true" />{text(row.reports === 1 ? '1 report' : `${num(row.reports ?? 0)} reports`, `${num(row.reports ?? 0)} بلاغ`)}</span> : undefined} context={<>{row.destination} · <LevelChip verified={row.monitored} /></>} /></button></div></TableCell>
          <TableCell><ListerName name={row.agency.name} verified={row.agency.verified} href={`/dashboard/tourism/listers/${row.agency.id}`} /><p className="text-xs text-muted-foreground">{text(`${num(row.seatsBooked)} of ${num(row.seatsTotal)} seats booked`, `${num(row.seatsBooked)} من ${num(row.seatsTotal)} كرسي محجوز`)}</p></TableCell>
          <TableCell><DateRange start={row.startsAt} end={row.endsAt} /></TableCell>
          <TableCell className="text-end tabular-nums">{egp(row.priceEgp)}</TableCell>
          <TableCell column="status"><StatusBadge status={row.status} /></TableCell>
          <TableCell column="actions"><RowActions recordName={tripTitle(row, lang)} actions={[{ label: text('Open trip', 'افتح الرحلة'), icon: <Eye aria-hidden="true" />, onClick: () => open(row.id) }]} /></TableCell>
        </TableRow>)}</TableBody></Table></div>} />}
    <TripDialog trip={rows.find((row) => row.id === openId) ?? null} canWrite={canWrite} onClose={() => open(null)} onChanged={resource.refetch} />
  </CardContent></Card>;
}

// ---------- Cash rewards ----------

const REWARD_KIND: Record<string, [string, string]> = { early_bird: ['Early bird', 'أول الحاجزين'], invite_welcome: ['Welcome gift', 'هدية الترحيب'], invite_bonus: ['Friend bonus', 'مكافأة دعوة صاحبك'] };

function CashTab({ canWrite }: { canWrite: boolean }) {
  const { text, lang, egp, num } = useTourismText();
  const load = React.useCallback(() => adminApi.get<{ owedByLister: OwedLister[]; items: Redemption[] }>(`${TOURISM_API}/redemptions`), []);
  const resource = useSubscriberResource(load);
  const [ask, setAsk] = React.useState<ActionSpec | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { run, busy } = useTourismAction(resource.refetch);
  if (resource.loading && !resource.data) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />;
  const { owedByLister, items } = resource.data;
  const disputes = items.filter((item) => item.status === 'disputed');
  const chosen = owedByLister.filter((row) => selected.includes(row.agencyId));
  const payList = (rows: OwedLister[]) => <ul className="space-y-1 text-sm">{rows.map((row) => <li key={row.agencyId}>{row.agencyName}: <strong className="tabular-nums">{egp(row.owedEgp)}</strong> {text('to InstaPay', 'على إنستاباي')} <span dir="ltr" className="font-medium">{row.instapay ?? text('not set', 'مش متسجّل')}</span></li>)}</ul>;
  const pay = (rows: OwedLister[]) => setAsk({
    title: rows.length === 1 ? text(`Mark ${egp(rows[0].owedEgp)} to ${rows[0].agencyName} as paid?`, `تسجيل ${egp(rows[0].owedEgp)} لـ${rows[0].agencyName} كمدفوعة؟`) : text(`Mark ${num(rows.length)} listers as paid?`, `تسجيل ${num(rows.length)} منظّم كمدفوع لهم؟`),
    description: text('Send the money by InstaPay first, then confirm. The lister sees it as paid back.', 'حوّل الفلوس على إنستاباي الأول وبعدين أكّد. المنظّم هيشوفها اترجّعت.') + ' ' + rows.map((row) => `${row.agencyName} → ${row.instapay ?? '—'} (${egp(row.owedEgp)})`).join(' · '),
    submit: async () => { await run(async () => { await Promise.all(rows.map((row) => adminApi.post(`${TOURISM_API}/agencies/${row.agencyId}/reimburse`))); setSelected([]); }, text('Marked as paid. The listers see it in their portal.', 'اتسجّلت مدفوعة والمنظّمين هيشوفوها في البوابة.')); },
  });
  const decide = (item: Redemption, decision: 'confirm' | 'void') => setAsk({
    title: decision === 'confirm' ? text(`Count ${egp(item.amountEgp)} as given by ${item.agencyName}?`, `نحسب ${egp(item.amountEgp)} إن ${item.agencyName} سلّمها؟`) : text(`Void the ${egp(item.amountEgp)} cash reward?`, `إلغاء مكافأة ${egp(item.amountEgp)} كاش؟`),
    description: decision === 'confirm' ? text('5argny will pay this amount back to the lister with the next payment.', 'خرجني هترجّع المبلغ ده للمنظّم مع الدفعة الجاية.') : text('The lister is not paid back for it, and it returns to the budget.', 'المنظّم مش هيترجّع له المبلغ، والمبلغ يرجع للميزانية.'),
    fields: [{ name: 'note', label: text('Note for the record (what you found)', 'ملاحظة للسجل (اللي عرفته)'), type: 'textarea', required: true }],
    submit: async (values) => { await run(() => adminApi.post(`${TOURISM_API}/redemptions/${item.id}/resolve`, { decision, note: String(values.note) }), decision === 'confirm' ? text('Counted as given. Added to what 5argny owes the lister.', 'اتحسبت مسلّمة واتضافت للي على خرجني للمنظّم.') : text('Cash reward voided.', 'اتلغت المكافأة.')); },
  });
  return <>
    <Card id="owed"><CardHeader><CardTitle>{text('What 5argny owes listers', 'اللي على خرجني للمنظّمين')}</CardTitle><CardDescription>{text('Cash rewards the customer confirmed receiving. Pay each lister by InstaPay, then mark it as paid.', 'مكافآت الكاش اللي العميل أكّد إنه استلمها. حوّل لكل منظّم على إنستاباي وبعدين سجّلها مدفوعة.')}</CardDescription></CardHeader><CardContent className="space-y-3">
      {!owedByLister.length ? <CalmLine>{text('Nothing owed ✓', 'مفيش فلوس علينا ✓')}</CalmLine> : <>
        {canWrite && chosen.length > 1 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3"><span className="text-sm">{text(`${num(chosen.length)} listers selected · ${egp(chosen.reduce((s, r) => s + r.owedEgp, 0))}`, `${num(chosen.length)} منظّم متحددين · ${egp(chosen.reduce((s, r) => s + r.owedEgp, 0))}`)}</span><Button size="sm" disabled={busy} onClick={() => pay(chosen)}><Banknote aria-hidden="true" />{text(`Mark ${num(chosen.length)} listers as paid`, `سجّل ${num(chosen.length)} منظّم مدفوع لهم`)}</Button></div>}
        <ul className="divide-y">{owedByLister.map((row) => <li key={row.agencyId} aria-label={row.agencyName} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
          <span className="flex items-center gap-3">{canWrite && <Checkbox aria-label={text(`Select ${row.agencyName}`, `اختار ${row.agencyName}`)} checked={selected.includes(row.agencyId)} onCheckedChange={(checked) => setSelected((list) => checked ? [...list, row.agencyId] : list.filter((id) => id !== row.agencyId))} />}
            <span><Link href={`/dashboard/tourism/listers/${row.agencyId}`} className="font-medium underline-offset-4 hover:underline">{row.agencyName}</Link><span className="block text-sm text-muted-foreground">{text(`${egp(row.owedEgp)} for ${num(row.count)} ${plural(row.count, 'cash reward', 'cash rewards')} · InstaPay `, `${egp(row.owedEgp)} عن ${num(row.count)} مكافأة كاش · إنستاباي `)}<span dir="ltr" className="text-foreground">{row.instapay ?? text('not set', 'مش متسجّل')}</span></span></span></span>
          {canWrite && <Button size="sm" variant="outline" disabled={busy} onClick={() => pay([row])}><Banknote aria-hidden="true" />{text('Mark as paid', 'سجّلها مدفوعة')}</Button>}
        </li>)}</ul>
        {canWrite && chosen.length === 1 && payList(chosen)}
      </>}
    </CardContent></Card>
    <Card id="disputes"><CardHeader><CardTitle>{text('Disputes', 'النزاعات')}</CardTitle><CardDescription>{text('The lister says it handed the cash, the customer says no. Call both, then decide.', 'المنظّم بيقول سلّم الكاش والعميل بيقول لأ. كلّم الاتنين وبعدين قرّر.')}</CardDescription></CardHeader><CardContent>
      {!disputes.length ? <CalmLine>{text('No disputes ✓', 'مفيش نزاعات ✓')}</CalmLine>
        : <ul className="divide-y">{disputes.map((item) => <li key={item.id} aria-label={item.customerName} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
          <span className="text-sm"><strong className="tabular-nums">{egp(item.amountEgp)}</strong> · {text(`${item.agencyName} says it gave the cash to ${item.customerName}`, `${item.agencyName} بيقول سلّم الكاش لـ${item.customerName}`)} · <DateCell value={item.cashGivenAt} /></span>
          {canWrite && <span className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(item, 'confirm')}><Check aria-hidden="true" />{text('Count as given', 'اتحسبت مسلّمة')}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(item, 'void')}><X aria-hidden="true" />{text('Void', 'إلغاء')}</Button></span>}
        </li>)}</ul>}
    </CardContent></Card>
    <RewardSettings canWrite={canWrite} />
    <Card><CardHeader><CardTitle>{text('Cash handed out', 'الكاش اللي اتسلّم')}</CardTitle><CardDescription>{text('Every cash reward a lister handed at its office, newest first.', 'كل مكافأة كاش منظّم سلّمها في مكتبه، الأحدث الأول.')}</CardDescription></CardHeader><CardContent>
      {!items.length ? <CalmLine>{text('No cash handed out yet.', 'لسه محدش سلّم كاش.')}</CalmLine>
        : <RecordList scope="cash" records={items} searchText={(item) => `${item.customerName} ${item.agencyName}`} empty={text('Nothing here ✓', 'مفيش حاجة هنا ✓')}
          filters={[{ key: 'status', label: text('All states', 'كل الحالات'), options: [{ value: 'cash_given', label: text('Waiting for the customer to confirm', 'مستني تأكيد العميل') }, { value: 'confirmed', label: text('Confirmed, to pay back', 'متأكدة ولسه هنرجّعها') }, { value: 'disputed', label: text('Disputed', 'متنازع عليها') }, { value: 'reimbursed', label: text('Paid back', 'اترجّعت') }], value: (item) => item.status }]}
          render={(visible) => <div className="overflow-x-auto"><Table layout="list"><TableHeader><TableRow><TableHead>{text('Customer', 'العميل')}</TableHead><TableHead>{text('Lister', 'المنظّم')}</TableHead><TableHead className="text-end">{text('Cash', 'الكاش')}</TableHead><TableHead>{text('Handed on', 'اتسلّم يوم')}</TableHead><TableHead>{text('State', 'الحالة')}</TableHead></TableRow></TableHeader>
            <TableBody>{visible.map((item) => <TableRow key={item.id}><TableCell><RecordCell name={item.customerName} icon="receipt" context={<>{text(...(REWARD_KIND[item.kind] ?? [item.kind, item.kind]))}{item.resolutionNote && <> · {text('Team note', 'ملاحظة الفريق')}: {item.resolutionNote}</>}</>} /></TableCell><TableCell>{item.agencyName}</TableCell><TableCell className="text-end tabular-nums">{egp(item.amountEgp)}</TableCell><TableCell><DateCell value={item.cashGivenAt} /></TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}</TableBody></Table></div>} />}
    </CardContent></Card>
    <ActionDialog action={ask} onClose={() => setAsk(null)} />
  </>;
}

const SETTING_FIELDS: { key: Exclude<keyof TourismSettings, 'rewardsEnabled'>; en: string; ar: string; hintEn: string; hintAr: string }[] = [
  { key: 'rewardAmountEgp', en: 'Cash per reward (EGP)', ar: 'قيمة المكافأة (جنيه)', hintEn: 'What the customer gets at the office.', hintAr: 'اللي العميل بياخده من المكتب.' },
  { key: 'budgetEgp', en: 'Total budget (EGP)', ar: 'الميزانية الكلية (جنيه)', hintEn: 'Rewards stop when this is used up.', hintAr: 'المكافآت بتقف لما تخلص.' },
  { key: 'earlyBirdPerTrip', en: 'Early birds per trip', ar: 'أول الحاجزين في كل رحلة', hintEn: 'The first bookings on a verified trip that earn cash.', hintAr: 'أول حجوزات في الرحلة الموثّقة اللي تاخد كاش.' },
  { key: 'inviteCap', en: 'Friends one customer can invite', ar: 'عدد الأصحاب اللي العميل يدعيهم', hintEn: 'Each invited friend earns the inviter one reward.', hintAr: 'كل صاحب بيجيب للي دعاه مكافأة.' },
  { key: 'weeklyCapPerAgency', en: 'Rewards per lister per week', ar: 'مكافآت كل منظّم في الأسبوع', hintEn: 'A lister cannot hand out more in one week.', hintAr: 'المنظّم ميقدرش يسلّم أكتر من كده في الأسبوع.' },
];

function RewardSettings({ canWrite }: { canWrite: boolean }) {
  const { text, lang, egp, num } = useTourismText();
  const load = React.useCallback(() => adminApi.get<TourismSettings>(`${TOURISM_API}/settings`), []);
  const resource = useSubscriberResource(load);
  const [draft, setDraft] = React.useState<Record<string, string | boolean> | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const saved = resource.data;
  // The rules are edited in a dialog so the Cash tab stays short; the card shows them as one sentence.
  const values = draft;
  const dirty = Boolean(draft && saved && (draft.rewardsEnabled !== saved.rewardsEnabled || SETTING_FIELDS.some((field) => Number(draft[field.key]) !== saved[field.key])));
  const invalid = values ? SETTING_FIELDS.find((field) => !/^\d+$/.test(String(values[field.key]))) : undefined;
  const edit = () => { if (saved) { setError(''); setDraft(Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, typeof value === 'boolean' ? value : String(value)]))); } };
  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!values || invalid) return;
    setSaving(true); setError('');
    try {
      await adminApi.put(`${TOURISM_API}/settings`, { rewardsEnabled: Boolean(values.rewardsEnabled), ...Object.fromEntries(SETTING_FIELDS.map((field) => [field.key, Number(values[field.key])])) });
      await resource.refetch(); setDraft(null);
      toast.success(text('Saved. New bookings follow these rules now.', 'اتحفظ. الحجوزات الجديدة هتمشي بالقواعد دي.'));
    } catch (caught) { setError(tourismError(caught, lang)); }
    finally { setSaving(false); }
  };
  return <Card><CardHeader><CardTitle>{text('Cash reward rules', 'قواعد مكافآت الكاش')}</CardTitle><CardDescription>{text('Cash only on verified trips, handed by the lister at its office, paid back by 5argny weekly.', 'الكاش على الرحلات الموثّقة بس، المنظّم بيسلّمه في مكتبه وخرجني بترجّعه أسبوعياً.')}</CardDescription></CardHeader><CardContent>
    {resource.error ? <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} /> : !saved ? <LoadingState /> : <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm">{saved.rewardsEnabled ? text('On', 'شغّالة') : text('Off: no new rewards', 'مقفولة: مفيش مكافآت جديدة')} · {text(`${egp(saved.rewardAmountEgp)} per reward · budget ${egp(saved.budgetEgp)} · first ${num(saved.earlyBirdPerTrip)} bookings per trip · up to ${num(saved.inviteCap)} invited friends · ${num(saved.weeklyCapPerAgency)} rewards per lister a week`, `${egp(saved.rewardAmountEgp)} للمكافأة · الميزانية ${egp(saved.budgetEgp)} · أول ${num(saved.earlyBirdPerTrip)} حجوزات في كل رحلة · لحد ${num(saved.inviteCap)} أصحاب · ${num(saved.weeklyCapPerAgency)} مكافأة لكل منظّم في الأسبوع`)}</p>
      {canWrite && <Button variant="outline" onClick={edit}>{text('Change reward rules', 'غيّر قواعد المكافآت')}</Button>}
    </div>}
    {values && <Dialog open onOpenChange={(open) => { if (!open && !saving) setDraft(null); }}><DialogContent className="sm:max-w-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DialogHeader><DialogTitle>{text('Cash reward rules', 'قواعد مكافآت الكاش')}</DialogTitle><DialogDescription>{text('Changes apply to new bookings at once.', 'التغيير بيسري على الحجوزات الجديدة فوراً.')}</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
      <label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-medium">{text('Cash rewards on', 'مكافآت الكاش شغّالة')}</span><span className="block text-sm text-muted-foreground">{text('Off stops new rewards; ones already earned stay.', 'لو قفلتها مفيش مكافآت جديدة، واللي اتكسبت بتفضل.')}</span></span><Switch aria-label={text('Cash rewards on', 'مكافآت الكاش شغّالة')} checked={Boolean(values.rewardsEnabled)} disabled={!canWrite} onCheckedChange={(checked) => setDraft({ ...values, rewardsEnabled: checked })} /></label>
      <div className="grid gap-4 sm:grid-cols-2">{SETTING_FIELDS.map((field) => <div key={field.key} className="space-y-1"><label htmlFor={`setting-${field.key}`} className="text-sm font-medium">{text(field.en, field.ar)}</label><Input id={`setting-${field.key}`} inputMode="numeric" dir="ltr" disabled={!canWrite} aria-invalid={invalid?.key === field.key || undefined} value={String(values[field.key])} onChange={(event) => setDraft({ ...values, [field.key]: event.target.value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))) })} /><p className="text-xs text-muted-foreground">{invalid?.key === field.key ? <span className="text-destructive">{text('Write a whole number.', 'اكتب رقم صحيح.')}</span> : text(field.hintEn, field.hintAr)}</p></div>)}</div>
      {error && <RequestError message={error} />}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setDraft(null)}>{text('Back', 'رجوع')}</Button><Button type="submit" disabled={!dirty || saving || Boolean(invalid)}>{saving ? text('Saving…', 'جارٍ الحفظ…') : text('Save reward rules', 'احفظ قواعد المكافآت')}</Button></div>
    </form></DialogContent></Dialog>}
  </CardContent></Card>;
}

// ---------- Reports ----------

function ReportsTab({ canWrite }: { canWrite: boolean }) {
  const { text, lang } = useTourismText();
  const [status, setStatus] = React.useState<'open' | 'closed'>('open');
  const load = React.useCallback(() => adminApi.get<TourismReport[]>(`${TOURISM_API}/reports`, { status }), [status]);
  const resource = useSubscriberResource(load);
  const [ask, setAsk] = React.useState<ActionSpec | null>(null);
  const { run, busy } = useTourismAction(resource.refetch);
  const rows = resource.data ?? [];
  return <Card><CardHeader><CardTitle>{text('Customer reports', 'بلاغات العملاء')}</CardTitle><CardDescription>{text('A customer flagged a trip. Look at it, hide it or suspend the lister if needed, then close the report.', 'عميل بلّغ عن رحلة. شوفها، اخفيها أو أوقف المنظّم لو محتاج، وبعدين اقفل البلاغ.')}</CardDescription></CardHeader><CardContent className="space-y-3">
    <SegmentedControl label={text('Report state', 'حالة البلاغ')} value={status} onValueChange={(value) => setStatus(value as 'open' | 'closed')} options={[{ value: 'open', label: text('Open', 'مفتوحة') }, { value: 'closed', label: text('Closed', 'مقفولة') }]} />
    {resource.error ? <RequestError message={tourismError(resource.error, lang)} retry={() => { void resource.refetch(); }} />
      : resource.loading ? <LoadingState />
      : !rows.length ? <CalmLine>{status === 'open' ? text('No open reports ✓', 'مفيش بلاغات مفتوحة ✓') : text('No closed reports yet.', 'لسه مفيش بلاغات مقفولة.')}</CalmLine>
      : <ul className="divide-y">{rows.map((report) => <li key={report.id} aria-label={report.tripTitle} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium">“{report.reason}”</p>
          <p className="text-muted-foreground">{text('Trip', 'الرحلة')}: <Link className="text-foreground underline-offset-4 hover:underline" href={`/dashboard/tourism?tab=trips&trip=${report.tripId}`}>{report.tripTitle}</Link> <StatusBadge status={report.tripStatus} /> · {text('Lister', 'المنظّم')}: <ListerName name={report.agencyName} verified={report.monitored} href={`/dashboard/tourism/listers/${report.agencyId}`} /></p>
          <p className="text-muted-foreground">{text('Reported by', 'بلّغ عنها')} {report.customerName} · <DateCell value={report.createdAt} /></p>
        </div>
        {canWrite && report.status === 'open' && <RowActions recordName={report.tripTitle} actions={[
          { label: text('Close report', 'اقفل البلاغ'), icon: <Check aria-hidden="true" />, disabled: busy, onClick: () => { void run(() => adminApi.post(`${TOURISM_API}/reports/${report.id}/close`), text('Report closed.', 'اتقفل البلاغ.')); } },
          ...(['live', 'pending'].includes(report.tripStatus) ? [{ label: text('Hide trip', 'إخفاء الرحلة'), icon: <EyeOff aria-hidden="true" />, destructive: true, onClick: () => setAsk({ title: text('Hide this trip?', 'إخفاء الرحلة دي؟'), destructive: true, description: text('Customers stop seeing it at once. Existing bookings stay.', 'الناس هتبطّل تشوفها فوراً. الحجوزات الموجودة بتفضل.'), submit: async () => { await run(() => adminApi.post(`${TOURISM_API}/trips/${report.tripId}/hide`, {}), text('Trip hidden.', 'اتخفت الرحلة.')); } }) }] : []),
          { label: text('Suspend lister', 'إيقاف المنظّم'), icon: <UserX aria-hidden="true" />, destructive: true, onClick: () => setAsk({ title: text(`Suspend ${report.agencyName}?`, `إيقاف ${report.agencyName}؟`), destructive: true, description: text('All its trips leave the site and it cannot add new ones until you activate it again.', 'كل رحلاته هتختفي من الموقع ومش هيقدر يضيف جديد لحد ما ترجّعه.'), submit: async () => { await run(() => adminApi.post(`${TOURISM_API}/agencies/${report.agencyId}/suspend`), text('Lister suspended.', 'اتوقف المنظّم.')); } }) },
        ]} />}
      </li>)}</ul>}
    <ActionDialog action={ask} onClose={() => setAsk(null)} />
  </CardContent></Card>;
}

