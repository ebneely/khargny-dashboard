'use client';

import { PageActions } from './page-actions';
import { ActionBarNavigation } from './form-action-bar';
import { SubscriberBrand } from './subscriber-brand';
import { supportsBrands } from '@/lib/subscriber-brand';
import { useUrlTab } from '@/lib/use-url-tab';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentedControl } from './segmented-control';
import { useDashboardCopy } from './dashboard-text';
import { TrialBadge } from './trial-badge';
import { PlanChip } from './plan-choices';
import { SubscriberPlans } from './subscriber-plans';
import { RenewalsPage } from './renewals-page';
import { timeLeftLabel } from '@/lib/renewal-display';
import type { RenewalFilter } from '@/lib/api/subscribers';

import { RecordCell } from './record-cell';
import { DateCell } from './date-cell';
import { RecordList, useListAddress } from './record-list';
import * as React from 'react';
import Link from 'next/link';
import { Plus, ContactRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { lastSubscriberPage, type Subscriber, type SubscriberSummary } from '@/lib/api/subscribers';
import { loadAllCities } from '@/lib/api/hooks/use-admin-cities';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { SubscriberRenewalContact } from './subscriber-renewal-contact';
import { LoadingState, MoneyText, RequestError, StatusBadge, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscribersPage({ canWrite }: { canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><SubscribersContent canWrite={canWrite} /></React.Suspense>;
}

function SubscribersContent({ canWrite }: { canWrite: boolean }) {
  const [settingsForm, setSettingsForm] = React.useState<'contact' | 'plans'>('contact');
  const copy = useDashboardCopy();
  const tab = useUrlTab(['list', 'renewals', 'settings']);
  const brand = useUrlTab(['all', 'true', 'false'], 'all', 'brand');
  const [brandSupported, setBrandSupported] = React.useState(false);
  const { text, pick, lang } = useSubscriberText();
  const address = useListAddress('subscribers');
  const search = address.query;
  const requestedStatus = address.get('status');
  const status = ['active', 'inactive'].includes(requestedStatus) ? requestedStatus : '';
  const cityId = address.get('city');
  const expiring = address.get('expiry') === '30';
  const requestedRenewal = address.get('renewal');
  const renewal = ['ending_soon', 'awaiting_review', 'in_grace', 'ended'].includes(requestedRenewal) ? requestedRenewal as RenewalFilter : undefined;
  const skip = address.skip;
  const limit = address.limit;
  const setSkip = React.useCallback((next: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('subscribers-skip', String(next));
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
  }, []);
  const load = React.useCallback(async () => { const result = await adminApi.list<Subscriber>('/v1/admin/subscribers', { skip, limit, brand: brandSupported && brand.value !== 'all' ? brand.value : undefined, search: search.trim() || undefined, status: status || undefined, cityId: cityId || undefined, expiringWithinDays: expiring ? 30 : undefined, renewal }); if (result.items.length) setBrandSupported(supportsBrands(result.items)); return result; }, [skip, limit, search, status, cityId, expiring, renewal, brand.value, brandSupported]);
  const list = useSubscriberResource(load);
  const validSkip = list.data ? lastSubscriberPage(skip, list.data.total, limit) : skip;
  React.useEffect(() => {
    if (list.loading || list.error || skip === validSkip) return;
    const timer = window.setTimeout(() => setSkip(validSkip), 0);
    return () => window.clearTimeout(timer);
  }, [list.loading, list.error, skip, validSkip, setSkip]);
  const loadSummary = React.useCallback(() => adminApi.get<SubscriberSummary>('/v1/admin/subscribers/summary'), []);
  const summary = useSubscriberResource(loadSummary);
  const loadCities = React.useCallback(() => loadAllCities(), []);
  const cities = useSubscriberResource(loadCities);
  const filter = (change: () => void) => { setSkip(0); change(); };
  return <ActionBarNavigation links={tab.value !== 'list' && canWrite ? [{ label: 'New subscriber', href: '/dashboard/subscribers/new' }] : []}><div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ContactRound className="size-5 text-primary" aria-hidden="true" />{text('Subscribers', 'المشتركون')}</h1><p className="mt-1 text-sm text-muted-foreground">{text('Keep places, subscriptions, visits and subscriber accounts together.', 'الأماكن والاشتراكات والزيارات وحسابات المشتركين في مكان واحد.')}</p></div><PageActions form={tab.value !== 'list'} actions={[{ label: "New subscriber", href: "/dashboard/subscribers/new", allowed: canWrite, icon: <Plus className="size-4" aria-hidden="true" /> }]} /></header>
    <UrlTabs values={["list", "renewals", "settings"]}>
    <TabsList aria-label={copy("Subscriber sections")}><TabsTrigger value="list">{copy("Subscribers list")}</TabsTrigger><TabsTrigger value="renewals">{copy("Renewals")}</TabsTrigger><TabsTrigger value="settings">{copy("Settings")}</TabsTrigger></TabsList>
    <UrlTabsContent value="renewals" lazy><RenewalsPage canWrite={canWrite} /></UrlTabsContent>
    <UrlTabsContent value="settings" lazy className="space-y-6"><SubscriberRenewalContact canWrite={canWrite} active={settingsForm === 'contact'} onEdit={() => setSettingsForm('contact')} /><SubscriberPlans canWrite={canWrite} active={settingsForm === 'plans'} onEdit={() => setSettingsForm('plans')} /></UrlTabsContent>
    <UrlTabsContent value="list" className="space-y-6">
    {summary.loading ? <LoadingState /> : summary.error ? <RequestError message={subscriberError(summary.error, lang)} retry={() => { void summary.refetch(); }} /> : summary.data && <div className="grid gap-3 sm:grid-cols-3">{[
      { label: text('Active subscribers', 'المشتركون النشطون'), value: summary.data.active },
      { label: text('Ending within 7 days', 'تنتهي خلال ٧ أيام'), value: summary.data.endingSoon ?? '—', href: '/dashboard/subscribers?tab=list&subscribers-renewal=ending_soon' },
      { label: text('Waiting for review', 'بانتظار المراجعة'), value: summary.data.awaitingReview ?? '—', href: '/dashboard/subscribers?tab=list&subscribers-renewal=awaiting_review' },
      { label: text('Expiring within 30 days', 'تنتهي خلال ٣٠ يوماً'), value: summary.data.expiringWithin30Days },
      { label: text('Revenue this month', 'إيرادات هذا الشهر'), value: <MoneyText value={summary.data.revenueThisMonth} /> },
      ...(typeof summary.data.brands === 'number' ? [{ label: copy('Brands'), value: summary.data.brands }] : []),
      ...(typeof summary.data.revenueThisMonthBrands === 'string' ? [{ label: copy('Brand revenue this month'), value: <><MoneyText value={summary.data.revenueThisMonthBrands} /></> }] : []),
    ].map((metric) => <Card key={metric.label}><CardContent><p className="text-sm text-muted-foreground">{"href" in metric && metric.href ? <Link className="underline" href={metric.href}>{metric.label}</Link> : metric.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value}</p></CardContent></Card>)}</div>}
    <Card><CardContent className="space-y-5">
      {brandSupported && <SegmentedControl label="Subscriber type" value={brand.value} options={[{ value: "all", label: "All" }, { value: "true", label: "Brands" }, { value: "false", label: "Individuals" }]} onValueChange={(value) => filter(() => brand.onValueChange(value))} />}
      {cities.error && <RequestError message={text('Cities could not be loaded.', 'تعذر تحميل المدن.')} retry={() => { void cities.refetch(); }} />}
      {list.error && <RequestError message={subscriberError(list.error, lang)} retry={() => { void list.refetch(); }} />}
      <RecordList scope="subscribers" address={address} records={list.data?.items ?? []} total={list.data?.total ?? 0} busy={list.loading || skip !== validSkip} searchText={(subscriber) => `${subscriber.name} ${subscriber.phone}`} empty="No subscribers found" filters={[
        { key: 'status', label: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], value: (subscriber) => subscriber.status },
        { key: 'city', label: 'All cities', options: (cities.data?.items ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) })), value: () => '' },
        { key: 'expiry', label: 'All expiry dates', options: [{ value: '30', label: 'Expiring within 30 days' }], value: () => '' },
        { key: 'renewal', label: 'All renewal timings', options: [{ value: 'ending_soon', label: `${copy('Ending within 7 days')} (${summary.data?.endingSoon ?? '—'})` }, { value: 'awaiting_review', label: `${copy('Waiting for review')} (${summary.data?.awaitingReview ?? '—'})` }, { value: 'in_grace', label: `${copy('In grace')} (${summary.data?.inGrace ?? '—'})` }, { value: 'ended', label: `${copy('Ended')} (${summary.data?.ended ?? '—'})` }], value: () => '' },
      ]} render={(visible) => <div className="overflow-x-auto"><Table layout="list"><TableHeader><TableRow>{[text('Name', 'الاسم'), text('Phone', 'الهاتف'), text('Places', 'الأماكن'), text('Status', 'الحالة'), text('Subscription ends', 'نهاية الاشتراك'), text('Time left', 'المدة المتبقية'), text('Paid total', 'إجمالي المدفوع')].map((label) => <TableHead key={label} column={label === text('Status', 'الحالة') ? 'status' : undefined} className={label === text('Paid total', 'إجمالي المدفوع') ? 'text-end' : 'text-start'}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((subscriber) => <TableRow key={subscriber.id}><TableCell><Link className="font-medium underline-offset-4 hover:underline focus-visible:underline" href={`/dashboard/subscribers/${subscriber.id}`}><RecordCell name={subscriber.name} context={`${subscriber.phone} · ${copy(subscriber.status === 'active' ? 'Active' : 'Inactive')}`} chips={<><SubscriberBrand isBrand={subscriber.isBrand} /><PlanChip plan={subscriber.currentSubscription?.plan} /><TrialBadge planName={subscriber.currentSubscription?.planName} planKind={subscriber.currentSubscription?.planKind} /></>} /><div className="mt-1 space-y-1 text-xs text-muted-foreground md:hidden"><p>{subscriber.places.map((place) => pick(place.name, place.nameEn)).join(' · ') || text('No linked places', 'لا توجد أماكن مرتبطة')}</p><p>{subscriber.currentSubscription && timeLeftLabel(subscriber.currentSubscription, lang)}</p><p>{text('Subscription ends', 'نهاية الاشتراك')}: {subscriber.currentSubscription?.endDate ? <DateCell value={subscriber.currentSubscription.endDate} /> : text('No subscription', 'بدون اشتراك')}</p><p>{text('Paid total', 'إجمالي المدفوع')}: <MoneyText value={subscriber.paidTotal} /></p></div></Link></TableCell><TableCell><span dir="ltr">{subscriber.phone}</span></TableCell><TableCell className="max-w-64 whitespace-normal"><p className="line-clamp-2 leading-4" title={subscriber.places.map((place) => pick(place.name, place.nameEn)).join(' · ')}>{subscriber.places.map((place) => pick(place.name, place.nameEn)).join(' · ') || text('No linked places', 'لا توجد أماكن مرتبطة')}</p></TableCell><TableCell column="status"><StatusBadge status={subscriber.status} /></TableCell><TableCell className="text-start">{subscriber.currentSubscription?.endDate ? <DateCell value={subscriber.currentSubscription.endDate} /> : text('No subscription', 'بدون اشتراك')}</TableCell><TableCell className="text-start">{subscriber.currentSubscription ? timeLeftLabel(subscriber.currentSubscription, lang) : text('No subscription', 'بدون اشتراك')}</TableCell><TableCell className="text-end tabular-nums"><MoneyText value={subscriber.paidTotal} /></TableCell></TableRow>)}</TableBody></Table></div>} />
    </CardContent></Card>
    </UrlTabsContent></UrlTabs>
  </div></ActionBarNavigation>;
}
