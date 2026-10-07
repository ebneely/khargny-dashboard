'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, ContactRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { lastSubscriberPage, type Subscriber, type SubscriberSummary } from '@/lib/api/subscribers';
import type { AdminCity } from '@/lib/api/types';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { SubscriberRenewalContact } from './subscriber-renewal-contact';
import { Field, LoadingState, MoneyText, RequestError, SubscriberSelect, StatusBadge, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscribersPage({ canWrite }: { canWrite: boolean }) {
  const { text, pick, lang } = useSubscriberText();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [expiring, setExpiring] = React.useState(false);
  const [skip, setSkip] = React.useState(0);
  const limit = 20;
  const load = React.useCallback(() => adminApi.list<Subscriber>('/v1/admin/subscribers', { skip, limit, search: search.trim() || undefined, status: status || undefined, cityId: cityId || undefined, expiringWithinDays: expiring ? 30 : undefined }), [skip, search, status, cityId, expiring]);
  const list = useSubscriberResource(load);
  const validSkip = list.data ? lastSubscriberPage(skip, list.data.total, limit) : skip;
  React.useEffect(() => {
    if (list.loading || list.error || skip === validSkip) return;
    const timer = window.setTimeout(() => setSkip(validSkip), 0);
    return () => window.clearTimeout(timer);
  }, [list.loading, list.error, skip, validSkip]);
  const loadSummary = React.useCallback(() => adminApi.get<SubscriberSummary>('/v1/admin/subscribers/summary'), []);
  const summary = useSubscriberResource(loadSummary);
  const loadCities = React.useCallback(() => adminApi.list<AdminCity>('/v1/admin/cities', { limit: 100 }), []);
  const cities = useSubscriberResource(loadCities);
  const filter = (change: () => void) => { setSkip(0); change(); };
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ContactRound className="size-5 text-primary" aria-hidden="true" />{text('Subscribers', 'المشتركون')}</h1><p className="mt-1 text-sm text-muted-foreground">{text('Keep places, subscriptions, visits and subscriber accounts together.', 'الأماكن والاشتراكات والزيارات وحسابات المشتركين في مكان واحد.')}</p></div>{canWrite && <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/subscribers/new" />}><Plus className="size-4" aria-hidden="true" />{text('New subscriber', 'مشترك جديد')}</Button>}</header>
    {summary.loading ? <LoadingState /> : summary.error ? <RequestError message={subscriberError(summary.error, lang)} retry={() => { void summary.refetch(); }} /> : summary.data && <div className="grid gap-3 sm:grid-cols-3">{[
      { label: text('Active subscribers', 'المشتركون النشطون'), value: summary.data.active },
      { label: text('Expiring within 30 days', 'تنتهي خلال ٣٠ يوماً'), value: summary.data.expiringWithin30Days },
      { label: text('Revenue this month', 'إيرادات هذا الشهر'), value: <MoneyText value={summary.data.revenueThisMonth} /> },
    ].map((metric) => <Card key={metric.label}><CardContent><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value}</p></CardContent></Card>)}</div>}
    <SubscriberRenewalContact canWrite={canWrite} />
    <Card><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={text('Search name or phone', 'بحث بالاسم أو الهاتف')}><Input data-ro-allow="true" type="search" value={search} onChange={(event) => filter(() => setSearch(event.target.value))} placeholder={text('Name or 01…', 'الاسم أو 01…')} /></Field>
        <Field label={text('Status', 'الحالة')}><SubscriberSelect data-ro-allow="true" value={status} onValueChange={(value) => filter(() => setStatus(value))} options={[{ value: '', label: text('All statuses', 'كل الحالات') }, { value: 'active', label: text('Active', 'نشط') }, { value: 'inactive', label: text('Inactive', 'غير نشط') }]} /></Field>
        <Field label={text('City', 'المدينة')}><SubscriberSelect data-ro-allow="true" value={cityId} disabled={cities.loading || Boolean(cities.error)} onValueChange={(value) => filter(() => setCityId(value))} options={[{ value: '', label: text('All cities', 'كل المدن') }, ...(cities.data?.items ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }))]} /></Field>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm"><Checkbox data-ro-allow="true" checked={expiring} onCheckedChange={(checked) => filter(() => setExpiring(checked))} />{text('Expiring within 30 days', 'تنتهي خلال ٣٠ يوماً')}</label>
      </div>
      {cities.error && <RequestError message={text('Cities could not be loaded.', 'تعذر تحميل المدن.')} retry={() => { void cities.refetch(); }} />}
      {list.loading || skip !== validSkip ? <LoadingState /> : list.error ? <RequestError message={subscriberError(list.error, lang)} retry={() => { void list.refetch(); }} /> : !list.data?.items.length ? <div className="py-12 text-center"><p className="font-medium">{text('No subscribers found', 'لا يوجد مشتركون')}</p><p className="mt-1 text-sm text-muted-foreground">{text('Try another search or clear the filters.', 'جرب بحثاً آخر أو أزل الفلاتر.')}</p></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{[text('Name', 'الاسم'), text('Phone', 'الهاتف'), text('Places', 'الأماكن'), text('Status', 'الحالة'), text('Subscription ends', 'نهاية الاشتراك'), text('Paid total', 'إجمالي المدفوع')].map((label) => <TableHead key={label} className="text-start">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{list.data.items.map((subscriber) => <TableRow key={subscriber.id}><TableCell><Link className="font-medium underline-offset-4 hover:underline focus-visible:underline" href={`/dashboard/subscribers/${subscriber.id}`}>{subscriber.name}</Link></TableCell><TableCell><span dir="ltr">{subscriber.phone}</span></TableCell><TableCell className="max-w-64 whitespace-normal">{subscriber.places.map((place) => pick(place.name, place.nameEn)).join(' · ') || text('No linked places', 'لا توجد أماكن مرتبطة')}</TableCell><TableCell><StatusBadge status={subscriber.status} /></TableCell><TableCell className="tabular-nums">{subscriber.currentSubscription?.endDate ?? text('No subscription', 'بدون اشتراك')}</TableCell><TableCell><MoneyText value={subscriber.paidTotal} /></TableCell></TableRow>)}</TableBody></Table></div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground" aria-live="polite">{list.loading || list.error || skip !== validSkip ? text('Waiting for results', 'في انتظار النتائج') : `${skip + (list.data?.items.length ? 1 : 0)}–${skip + (list.data?.items.length ?? 0)} / ${list.data?.total ?? 0}`}</p><div className="flex gap-2"><Button data-ro-allow="true" variant="outline" disabled={skip === 0 || list.loading} onClick={() => setSkip(Math.max(0, skip - limit))}>{text('Previous', 'السابق')}</Button><Button data-ro-allow="true" variant="outline" disabled={list.loading || Boolean(list.error) || skip + limit >= (list.data?.total ?? 0)} onClick={() => setSkip(skip + limit)}>{text('Next', 'التالي')}</Button></div></footer>
    </CardContent></Card>
  </div>;
}
