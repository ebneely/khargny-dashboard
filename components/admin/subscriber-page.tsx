'use client';

import * as React from 'react';
import Link from 'next/link';
import { ContactRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { SubscriberDetail } from '@/lib/api/subscribers';
import { SubscriberProfileForm } from './subscriber-profile-form';
import { SubscriberSubscriptions } from './subscriber-subscriptions';
import { SubscriberVisits } from './subscriber-visits';
import { SubscriberAccountPanel } from './subscriber-account';
import { SubscriberPlaceDetails } from './subscriber-place-details';
import { PlaceMenuEditor } from './place-menu-editor';
import { LoadingState, SavedRefreshError, MoneyText, RequestError, StatusBadge, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberPage({ subscriberId, canWrite: mayWrite }: { subscriberId?: string; canWrite: boolean }) {
  const { text, lang, pick } = useSubscriberText();
  const load = React.useCallback(() => subscriberId ? adminApi.get<SubscriberDetail>(`/v1/admin/subscribers/${subscriberId}`) : Promise.resolve(null), [subscriberId]);
  const resource = useSubscriberResource(load);
  const subscriber = resource.data;
  const canWrite = mayWrite && (!subscriberId || (!resource.loading && !resource.error));
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header>
      <Link href="/dashboard/subscribers" className="text-sm text-muted-foreground underline underline-offset-4">{text('Back to subscribers', 'العودة للمشتركين')}</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ContactRound className="size-5 text-primary" aria-hidden="true" />{subscriber?.name ?? text(subscriberId ? 'Subscriber' : 'New subscriber', subscriberId ? 'المشترك' : 'مشترك جديد')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text('Manage details, places, subscriptions, visits, account and pricing.', 'إدارة البيانات والأماكن والاشتراكات والزيارات والحساب والأسعار.')}</p>
        </div>
        {subscriber && <div className="flex flex-wrap items-center gap-3"><StatusBadge status={subscriber.status} /><span className="text-sm">{text('Paid total', 'إجمالي المدفوع')}: <MoneyText value={subscriber.paidTotal} /></span></div>}
      </div>
    </header>
    {subscriberId && resource.loading && <LoadingState />}
    {resource.error && (resource.savedRefreshFailed ? <SavedRefreshError retry={() => { void resource.refetch(); }} /> : <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} />)}
    {!subscriberId && <SubscriberProfileForm canWrite={canWrite} onSaved={resource.refreshAfterSave} />}
    {subscriber && <UrlTabs values={["details", "places", "subscriptions", "visits", "account", "menus"]}>
      <TabsList aria-label={text('Subscriber sections', 'أقسام المشترك')}>
        <TabsTrigger value="details">{text('Details', 'البيانات')}</TabsTrigger>
        <TabsTrigger value="places">{text('Places', 'الأماكن')}</TabsTrigger>
        <TabsTrigger value="subscriptions">{text('Subscriptions', 'الاشتراكات')}</TabsTrigger>
        <TabsTrigger value="visits">{text('Visits', 'الزيارات')}</TabsTrigger>
        <TabsTrigger value="account">{text('Account', 'الحساب')}</TabsTrigger>
        <TabsTrigger value="menus">{text('Pricing', 'الأسعار')}</TabsTrigger>
      </TabsList>
      <SubscriberProfileForm subscriber={subscriber} canWrite={canWrite} onSaved={resource.refreshAfterSave} placesContent={
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{text('Place details', 'تفاصيل الأماكن')}</h2>
          {!subscriber.places.length && <p className="text-sm text-muted-foreground">{text('Link a place to manage its details and pricing.', 'اربط مكاناً لإدارة تفاصيله وأسعاره.')}</p>}
          {subscriber.places.map((place) => <SubscriberPlaceDetails key={place.id} placeId={place.id} canWrite={canWrite} revision={subscriber} />)}
        </section>
      } />
      <UrlTabsContent value="subscriptions"><SubscriberSubscriptions subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /></UrlTabsContent>
      <UrlTabsContent value="visits"><SubscriberVisits subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /></UrlTabsContent>
      <UrlTabsContent value="account"><SubscriberAccountPanel key={subscriber.id} subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /></UrlTabsContent>
      <UrlTabsContent value="menus" lazy className="space-y-6">
        <h2 className="text-lg font-semibold">{text('Pricing', 'الأسعار')}</h2>
        {!subscriber.places.length && <Card><CardHeader><CardTitle>{text('No linked places', 'لا توجد أماكن مرتبطة')}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{text('Link a place in the Places tab to add its pricing.', 'اربط مكاناً في تبويب الأماكن لإضافة أسعاره.')}</p></CardContent></Card>}
        {subscriber.places.map((place, placeIndex) => <section key={place.id} className="space-y-3"><h3 className="font-semibold">{pick(place.name, place.nameEn)}</h3><PlaceMenuEditor placeId={place.id} canWrite={canWrite} primaryAction={placeIndex === 0} onChanged={resource.refreshAfterSave} /></section>)}
      </UrlTabsContent>
    </UrlTabs>}
  </div>;
}
