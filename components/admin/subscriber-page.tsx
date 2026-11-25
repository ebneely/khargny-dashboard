'use client';

import * as React from 'react';
import { PageActions } from './page-actions';
import { ActionBarNavigation } from './form-action-bar';
import { ContactRound } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { SubscriberDetail } from '@/lib/api/subscribers';
import { SubscriberProfileForm } from './subscriber-profile-form';
import { SubscriberSubscriptions } from './subscriber-subscriptions';
import { SubscriberBrand } from './subscriber-brand';
import { TrialBadge } from './trial-badge';
import { PlanChip } from './plan-choices';
import { SubscriberVisits } from './subscriber-visits';
import { SubscriberAccountPanel } from './subscriber-account';
import { SubscriberPlaceDetails } from './subscriber-place-details';
import { PlaceMenuEditor } from './place-menu-editor';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, SavedRefreshError, MoneyText, RequestError, StatusBadge, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberPage({ subscriberId, canWrite: mayWrite }: { subscriberId?: string; canWrite: boolean }) {
  const { text, lang, pick } = useSubscriberText();
  const copy = useDashboardCopy();
  const load = React.useCallback(() => subscriberId ? adminApi.get<SubscriberDetail>(`/v1/admin/subscribers/${subscriberId}`) : Promise.resolve(null), [subscriberId]);
  const resource = useSubscriberResource(load);
  const subscriber = resource.data;
  const canWrite = mayWrite && (!subscriberId || (!resource.loading && !resource.error));
  return <ActionBarNavigation fallback={!canWrite} links={[{ label: 'Back to subscribers', href: '/dashboard/money/owners' }]}><div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header>
      <PageActions form actions={[{ label: 'Back to subscribers', href: "/dashboard/money/owners", readOnly: true }]} />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><ContactRound className="size-5 text-primary" aria-hidden="true" />{subscriber?.name ?? text(subscriberId ? 'Subscriber' : 'New subscriber', subscriberId ? 'المشترك' : 'مشترك جديد')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text('Manage details, places, subscriptions, visits, account and pricing.', 'إدارة البيانات والأماكن والاشتراكات والزيارات والحساب والأسعار.')}</p>
        </div>
        {subscriber && <div className="flex flex-wrap items-center gap-3"><SubscriberBrand isBrand={subscriber.isBrand} /><StatusBadge status={subscriber.status} /><PlanChip plan={subscriber.currentSubscription?.plan} /><TrialBadge planName={subscriber.currentSubscription?.planName} planKind={subscriber.currentSubscription?.planKind} /><span className="text-sm">{text('Paid total', 'إجمالي المدفوع')}: <MoneyText value={subscriber.paidTotal} /></span></div>}
      </div>
    </header>
    {subscriberId && resource.loading && <LoadingState />}
    {resource.error && (resource.savedRefreshFailed ? <SavedRefreshError retry={() => { void resource.refetch(); }} /> : <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} />)}
    {!subscriberId && <SubscriberProfileForm canWrite={canWrite} onSaved={resource.refreshAfterSave} />}
    {/* Four tabs by job (DIRECTION section 1); older ?tab=visits and ?tab=menus links open Places, which now holds both. */}
    {subscriber && <UrlTabs values={['details', 'places', 'subscriptions', 'account']} renamed={{ visits: 'places', menus: 'places' }}>
      <TabsList aria-label={text('Subscriber sections', 'أقسام المشترك')}>
        <TabsTrigger value="details">{copy('Overview')}</TabsTrigger>
        <TabsTrigger value="places">{text('Places', 'الأماكن')}</TabsTrigger>
        <TabsTrigger value="subscriptions">{copy('Billing')}</TabsTrigger>
        <TabsTrigger value="account">{copy('Owner portal')}</TabsTrigger>
      </TabsList>
      <SubscriberProfileForm subscriber={subscriber} canWrite={canWrite} onSaved={resource.refreshAfterSave} placesContent={<>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{text('Place details', 'تفاصيل الأماكن')}</h2>
          {!subscriber.places.length && <p className="text-sm text-muted-foreground">{text('Link a place to manage its details and pricing.', 'اربط مكاناً لإدارة تفاصيله وأسعاره.')}</p>}
          {subscriber.places.map((place) => <SubscriberPlaceDetails key={place.id} placeId={place.id} canWrite={canWrite} revision={subscriber} />)}
        </section>
        <SubscriberVisits subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} />
        {subscriber.places.length > 0 && <section className="space-y-6">
          <h2 className="text-lg font-semibold">{text('Pricing', 'الأسعار')}</h2>
          {subscriber.places.map((place, placeIndex) => <section key={place.id} className="space-y-3"><h3 className="font-semibold">{pick(place.name, place.nameEn)}</h3><PlaceMenuEditor placeId={place.id} canWrite={canWrite} primaryAction={placeIndex === 0} onChanged={resource.refreshAfterSave} /></section>)}
        </section>}
      </>} />
      <UrlTabsContent value="subscriptions"><SubscriberSubscriptions subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /></UrlTabsContent>
      <UrlTabsContent value="account" className="space-y-6"><SubscriberAccountPanel key={subscriber.id} subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /></UrlTabsContent>
    </UrlTabs>}
  </div></ActionBarNavigation>;
}
