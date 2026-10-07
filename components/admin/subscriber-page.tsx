'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const subscriber = resource.data; const canWrite = mayWrite && (!subscriberId || (!resource.loading && !resource.error));
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}><header><Link href="/dashboard/subscribers" className="text-sm text-muted-foreground underline underline-offset-4">{text('Back to subscribers', 'العودة للمشتركين')}</Link><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{subscriber?.name ?? text(subscriberId ? 'Subscriber' : 'New subscriber', subscriberId ? 'المشترك' : 'مشترك جديد')}</h1>{subscriber && <div className="flex flex-wrap items-center gap-3"><StatusBadge status={subscriber.status} /><span className="text-sm">{text('Paid total', 'إجمالي المدفوع')}: <MoneyText value={subscriber.paidTotal} /></span></div>}</div></header>
    {subscriberId && resource.loading && <LoadingState />}{resource.error && (resource.savedRefreshFailed ? <SavedRefreshError retry={() => { void resource.refetch(); }} /> : <RequestError message={subscriberError(resource.error, lang)} retry={() => { void resource.refetch(); }} />)}
    {(!subscriberId || subscriber) && <><nav className="flex max-w-full gap-4 overflow-x-auto border-b pb-3 text-sm" aria-label={text('Subscriber sections', 'أقسام المشترك')}><a href="#profile" className="shrink-0 underline-offset-4 hover:underline">{text('Details', 'البيانات')}</a>{subscriber && [['subscriptions', text('Subscriptions', 'الاشتراكات')], ['place-details', text('Places', 'الأماكن')], ['visits', text('Visits', 'الزيارات')], ['account', text('Account', 'الحساب')], ['menus', text('Menus', 'القوائم')]].map(([id, label]) => <a className="shrink-0 underline-offset-4 hover:underline" key={id} href={`#${id}`}>{label}</a>)}</nav><section id="profile"><SubscriberProfileForm subscriber={subscriber ?? undefined} canWrite={canWrite} onSaved={resource.refreshAfterSave} /></section>{subscriber && <><SubscriberSubscriptions subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /><section id="place-details" className="space-y-4"><h2 className="text-lg font-semibold">{text('Place details', 'تفاصيل الأماكن')}</h2>{!subscriber.places.length && <p className="text-sm text-muted-foreground">{text('Link a place to manage its details and menu.', 'اربط مكاناً لإدارة تفاصيله وقائمته.')}</p>}{subscriber.places.map((place) => <SubscriberPlaceDetails key={place.id} placeId={place.id} canWrite={canWrite} revision={subscriber} />)}</section><SubscriberVisits subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /><SubscriberAccountPanel key={subscriber.id} subscriber={subscriber} canWrite={canWrite} refresh={resource.refreshAfterSave} /><section id="menus" className="space-y-6"><h2 className="text-lg font-semibold">{text('Menus', 'القوائم')}</h2>{!subscriber.places.length && <Card><CardHeader><CardTitle>{text('No linked places', 'لا توجد أماكن مرتبطة')}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{text('Link a place above to add its menu.', 'اربط مكاناً بالأعلى لإضافة قائمته.')}</p></CardContent></Card>}{subscriber.places.map((place) => <section key={place.id} className="space-y-3"><h3 className="font-semibold">{pick(place.name, place.nameEn)}</h3><PlaceMenuEditor placeId={place.id} canWrite={canWrite} onChanged={resource.refreshAfterSave} /></section>)}</section></>}</>}
  </div>;
}
