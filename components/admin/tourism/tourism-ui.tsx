'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, EyeOff, Eye, X, Heart, Star, Flag, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminApiError, adminApi } from '@/lib/api/admin-client';
import { TOURISM_API, tripCover, type TourismReport, type TourismTrip } from '@/lib/api/tourism';
import { DateRange } from '../date-cell';
import { ActionDialog, RequestError, StatusBadge, type ActionSpec, useSubscriberText } from '../subscriber-ui';

/** Words the website and the lister portal use (briefs/tourism-parity.md). */
export function useTourismText() {
  const { text, lang, pick } = useSubscriberText();
  const num = React.useCallback((value: number) => value.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB'), [lang]);
  const egp = React.useCallback((value: number) => text(`${num(value)} EGP`, `${num(value)} جنيه`), [num, text]);
  return { text, lang, pick, num, egp };
}

export function tourismError(error: unknown, lang: 'en' | 'ar') {
  const code = error instanceof AdminApiError ? error.code : '';
  const known: Record<string, [string, string]> = {
    TRIP_STATE_CHANGED: ['Someone already changed this trip. The list is refreshed.', 'حد غيّر الرحلة دي قبلك. اتحدّثت القائمة.'],
    NOT_IN_REVIEW: ['These documents are no longer waiting for review.', 'المستندات دي مبقتش مستنية مراجعة.'],
    NOT_OPEN: ['This cash reward is no longer waiting for a decision.', 'المكافأة دي مبقتش مستنية قرار.'],
    REASON_REQUIRED: ['Write the reason.', 'اكتب السبب.'],
    LISTER_NOT_FOUND: ['This lister no longer exists.', 'المنظّم ده مبقاش موجود.'],
    REPORT_NOT_FOUND: ['This report no longer exists.', 'البلاغ ده مبقاش موجود.'],
  };
  const hit = known[code];
  if (hit) return hit[lang === 'ar' ? 1 : 0];
  return lang === 'ar' ? 'تعذر إكمال الطلب. تحقق من الاتصال ثم أعد المحاولة.' : 'Could not finish the request. Check the connection and retry.';
}

/** Runs one team action, says what happened, then refreshes the screen. */
export function useTourismAction(refresh: () => unknown) {
  const { lang } = useTourismText();
  const [busy, setBusy] = React.useState(false);
  const run = React.useCallback(async (call: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await call(); toast.success(done); }
    catch (error) { toast.error(tourismError(error, lang)); }
    finally { setBusy(false); await refresh(); }
  }, [lang, refresh]);
  return { run, busy };
}

const SEAL_PATH = 'M12 1L14.43 2.92L17.5 2.47L18.65 5.35L21.53 6.5L21.08 9.57L23 12L21.08 14.43L21.53 17.5L18.65 18.65L17.5 21.53L14.43 21.08L12 23L9.57 21.08L6.5 21.53L5.35 18.65L2.47 17.5L2.92 14.43L1 12L2.92 9.57L2.47 6.5L5.35 5.35L6.5 2.47L9.57 2.92Z';

/** The same signed seal the website, the app and the lister portal show beside a verified lister. */
export function VerifiedSeal({ size = 16 }: { size?: number }) {
  const { text } = useTourismText();
  const label = text('Verified by 5argny', 'موثّق من خرجني');
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="inline-block shrink-0 align-[-0.15em]"><title>{label}</title>
    <path d={SEAL_PATH} fill="var(--brand-600)" stroke="var(--brand-600)" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M7.6 12.3l3 3 5.9-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** Verified lister / free listing, the two levels customers see. */
export function LevelChip({ verified }: { verified: boolean }) {
  const { text } = useTourismText();
  return verified
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700"><VerifiedSeal size={14} />{text('Verified', 'موثّق')}</span>
    : <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{text('Free listing', 'إعلان مجاني')}</span>;
}

export function ListerName({ name, verified, href }: { name: string; verified: boolean; href?: string }) {
  const body = <span className="inline-flex items-center gap-1 font-medium">{name}{verified && <VerifiedSeal />}</span>;
  return href ? <Link href={href} className="underline-offset-4 hover:underline focus-visible:underline">{body}</Link> : body;
}

export function Rating({ rating, count }: { rating: number | null; count: number }) {
  const { text, num } = useTourismText();
  return <span className="inline-flex items-center gap-1 tabular-nums" title={text('Customer rating', 'تقييم العملاء')}><Star className="size-3.5 text-warning" aria-hidden="true" />{rating === null ? text('No ratings yet', 'لا تقييمات بعد') : text(`${num(rating)} (${num(count)} ${count === 1 ? 'rating' : 'ratings'})`, `${num(rating)} (${num(count)} تقييم)`)}</span>;
}

/** Likes · views · rating, in words, the same three numbers places carry. */
export function Metrics({ likes, views, rating, ratingCount }: { likes: number; views: number; rating: number | null; ratingCount: number }) {
  const { text, num } = useTourismText();
  return <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
    <span className="inline-flex items-center gap-1 tabular-nums"><Heart className="size-3.5" aria-hidden="true" />{text(`${num(likes)} ${likes === 1 ? 'like' : 'likes'}`, `${num(likes)} إعجاب`)}</span>
    <span className="inline-flex items-center gap-1 tabular-nums"><Eye className="size-3.5" aria-hidden="true" />{text(`${num(views)} ${views === 1 ? 'view' : 'views'}`, `${num(views)} مشاهدة`)}</span>
    <Rating rating={rating} count={ratingCount} />
  </span>;
}

/** An empty list is one calm line, never an empty box. */
export function CalmLine({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><CircleCheck className="size-4 text-success" aria-hidden="true" />{children}</p>;
}

export function tripTitle(trip: Pick<TourismTrip, 'title' | 'titleEn'>, lang: 'en' | 'ar') {
  return lang === 'en' && trip.titleEn ? trip.titleEn : trip.title;
}

/** Trip review actions that fit its state: approve/reject while waiting, hide while public, unhide after. */
export function tripActions(trip: Pick<TourismTrip, 'id' | 'status' | 'title' | 'titleEn'>, text: (en: string, ar: string) => string, run: ReturnType<typeof useTourismAction>['run'], ask: (action: ActionSpec) => void) {
  const post = (verb: string, body: object = {}) => () => adminApi.post(`${TOURISM_API}/trips/${trip.id}/${verb}`, body);
  return [
    trip.status === 'pending' && { key: 'approve', label: text('Approve trip', 'قبول الرحلة'), icon: <Check aria-hidden="true" />, onClick: () => run(post('approve'), text('Trip approved. It is public now.', 'اتقبلت الرحلة وبقت ظاهرة للناس.')) },
    trip.status === 'pending' && { key: 'reject', label: text('Reject trip', 'رفض الرحلة'), icon: <X aria-hidden="true" />, onClick: () => ask({ title: text('Reject this trip?', 'رفض الرحلة دي؟'), destructive: true, description: text('The lister sees your reason and can edit the trip and send it again.', 'المنظّم هيشوف السبب ويقدر يعدّل الرحلة ويبعتها تاني.'), fields: [{ name: 'reason', label: text('Reason', 'السبب'), type: 'textarea', required: true }], submit: async (values) => { await run(post('reject', { reason: String(values.reason) }), text('Trip rejected. The lister sees the reason.', 'اترفضت الرحلة والمنظّم هيشوف السبب.')); } }) },
    ['live', 'pending'].includes(trip.status) && { key: 'hide', label: text('Hide trip', 'إخفاء الرحلة'), destructive: true, icon: <EyeOff aria-hidden="true" />, onClick: () => ask({ title: text('Hide this trip?', 'إخفاء الرحلة دي؟'), destructive: true, description: text('Customers stop seeing it at once. Existing bookings stay.', 'الناس هتبطّل تشوفها فوراً. الحجوزات الموجودة بتفضل.'), submit: async () => { await run(post('hide'), text('Trip hidden.', 'اتخفت الرحلة.')); } }) },
    trip.status === 'hidden' && { key: 'unhide', label: text('Unhide trip', 'إظهار الرحلة'), icon: <Eye aria-hidden="true" />, onClick: () => run(post('unhide'), text('Trip is public again.', 'الرحلة رجعت ظاهرة.')) },
  ].filter((action): action is Exclude<typeof action, false> => Boolean(action));
}

/** One trip with everything the team checks before approving it. Opened from any list. */
export function TripDialog({ trip, canWrite, onClose, onChanged }: { trip: TourismTrip | null; canWrite: boolean; onClose: () => void; onChanged: () => unknown }) {
  const { text, lang, egp, num } = useTourismText();
  const [ask, setAsk] = React.useState<ActionSpec | null>(null);
  const [reports, setReports] = React.useState<TourismReport[] | null>(null);
  const [reportsFailed, setReportsFailed] = React.useState(false);
  const { run, busy } = useTourismAction(async () => { await onChanged(); onClose(); });
  const id = trip?.id;
  const openReports = trip?.reports ?? 0;
  React.useEffect(() => {
    if (!id || !openReports) return;
    let live = true;
    adminApi.get<TourismReport[]>(`${TOURISM_API}/reports`, { status: 'open' }).then((rows) => { if (live) setReports(rows.filter((row) => row.tripId === id)); }).catch(() => { if (live) setReportsFailed(true); });
    return () => { live = false; setReports(null); setReportsFailed(false); };
  }, [id, openReports]);
  if (!trip) return null;
  const cover = tripCover(trip);
  const actions = canWrite ? tripActions(trip, text, run, setAsk) : [];
  const facts: [string, React.ReactNode][] = [
    [text('Lister', 'المنظّم'), <ListerName key="l" name={trip.agency.name} verified={trip.agency.verified} href={`/dashboard/tourism/listers/${trip.agency.id}`} />],
    [text('Level', 'المستوى'), <LevelChip key="v" verified={trip.monitored} />],
    [text('Type', 'النوع'), trip.kind === 'event' ? text('Event', 'إيفنت') : text('Trip', 'رحلة')],
    [text('Destination', 'الوجهة'), `${trip.destination} · ${text('from', 'من')} ${trip.departureCity}`],
    [text('Dates', 'المواعيد'), <DateRange key="d" start={trip.startsAt} end={trip.endsAt} />],
    [text('Price per seat', 'سعر الكرسي'), egp(trip.priceEgp)],
    [text('Seats booked', 'الكراسي المحجوزة'), text(`${num(trip.seatsBooked)} of ${num(trip.seatsTotal)}`, `${num(trip.seatsBooked)} من ${num(trip.seatsTotal)}`)],
  ];
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">{tripTitle(trip, lang)}<StatusBadge status={trip.status} /></DialogTitle>
        <DialogDescription>{trip.titleEn && trip.titleEn !== trip.title ? (lang === 'ar' ? trip.titleEn : trip.title) : text('Everything the lister sent for this trip.', 'كل اللي المنظّم بعته عن الرحلة.')}</DialogDescription>
      </DialogHeader>
      {cover ? <Image src={cover} alt={text('Trip cover photo', 'صورة غلاف الرحلة')} width={640} height={400} unoptimized className="aspect-[16/10] w-full rounded-xl object-cover" /> : <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">{text('No cover photo yet', 'لسه مفيش صورة غلاف')}</div>}
      {trip.rejectionReason && <p className="rounded-lg bg-muted p-3 text-sm">{text('Rejected because: ', 'اترفضت بسبب: ')}{trip.rejectionReason}</p>}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="flex flex-col"><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}</dl>
      <Metrics likes={trip.likeCount} views={trip.viewCount} rating={trip.rating} ratingCount={trip.ratingCount} />
      {trip.description && <section className="space-y-1"><h3 className="text-sm font-semibold">{text('About the trip', 'عن الرحلة')}</h3><p className="whitespace-pre-line text-sm">{trip.description}</p></section>}
      {trip.includes && <section className="space-y-1"><h3 className="text-sm font-semibold">{text('Included', 'شامل')}</h3><ul className="list-disc ps-5 text-sm">{trip.includes.split('\n').filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul></section>}
      <section className="space-y-1"><h3 className="flex items-center gap-1 text-sm font-semibold"><Flag className="size-4" aria-hidden="true" />{text('Open reports', 'بلاغات مفتوحة')}</h3>
        {!openReports ? <CalmLine>{text('No open reports on this trip ✓', 'مفيش بلاغات مفتوحة على الرحلة ✓')}</CalmLine>
          : reportsFailed ? <RequestError message={text('Could not load the reports.', 'تعذر تحميل البلاغات.')} />
          : <ul className="space-y-1 text-sm">{(reports ?? []).map((report) => <li key={report.id} className="rounded-lg bg-muted p-2">“{report.reason}” · {report.customerName}</li>)}</ul>}
      </section>
      {actions.length > 0 && <div className="flex flex-wrap justify-end gap-2 border-t pt-4">{actions.map((action, index) => <Button key={action.key} variant={index === 0 && action.key === 'approve' ? 'default' : action.destructive ? 'destructive' : 'outline'} disabled={busy} onClick={action.onClick}>{action.icon}{action.label}</Button>)}</div>}
      <ActionDialog action={ask} onClose={() => setAsk(null)} />
    </DialogContent>
  </Dialog>;
}

/** KYC photos are private: fetched with the team session and shown from a local blob; click to enlarge. */
export function PrivatePhoto({ path, label }: { path: string; label: string }) {
  const { text } = useTourismText();
  const [src, setSrc] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    adminApi.blob(path, controller.signal).then((blob) => { url = URL.createObjectURL(blob); setSrc(url); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return <figure className="space-y-1">
    {src ? <button type="button" onClick={() => setOpen(true)} className="block w-full overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-ring" aria-label={text(`Enlarge: ${label}`, `تكبير: ${label}`)}><Image src={src} alt={label} width={320} height={240} unoptimized className="aspect-[4/3] w-full object-cover transition-transform duration-150 hover:scale-[1.02] motion-reduce:transition-none" /></button>
      : failed ? <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted p-2 text-center text-xs text-muted-foreground">{text('Photo could not load', 'تعذر تحميل الصورة')}</div>
      : <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" aria-hidden="true" />}
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    {src && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>{text('Private photo, only the team sees it.', 'صورة خاصة، الفريق بس اللي يشوفها.')}</DialogDescription></DialogHeader><Image src={src} alt={label} width={1200} height={900} unoptimized className="max-h-[70vh] w-full rounded-lg object-contain" /></DialogContent></Dialog>}
  </figure>;
}
