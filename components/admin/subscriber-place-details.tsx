'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { PlaceDetailResponse } from '@/lib/api/subscribers';
import type { AdminPlace } from '@/lib/api/types';
import { priceBandLabel } from '@/lib/price-bands';
import { LoadingState, RequestError, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberPlaceDetails({ placeId, canWrite, revision }: { placeId: string; canWrite: boolean; revision?: unknown }) {

  const load = React.useCallback(async () => {
    const result = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${placeId}`);
    return 'place' in result ? result.place : result;
  }, [placeId]);
  const place = useSubscriberResource(load, revision);
  return <PlaceDetailsCard placeId={placeId} canWrite={canWrite} resource={place} />;
}

export function PlaceDetailsCard({ placeId, canWrite, resource }: { placeId: string; canWrite: boolean; resource: { data: AdminPlace | null; loading: boolean; error: Error | null; refetch: () => Promise<boolean> } }) {
  const { text, lang, pick } = useSubscriberText();
  const place = resource;
  return <Card><CardHeader><CardTitle>{place.data ? pick(place.data.name, place.data.nameEn) : text('Place details', 'تفاصيل المكان')}</CardTitle></CardHeader><CardContent className="space-y-4">{place.loading && <LoadingState />}{place.error && <RequestError message={subscriberError(place.error, lang)} retry={() => { void place.refetch(); }} />}{place.data && !place.error && <><p className="font-medium">{priceBandLabel(place.data.priceRange, lang)} <span className="text-sm font-normal text-muted-foreground">{text('per person', 'للفرد')}</span></p><div className="flex flex-wrap gap-2">{place.data.hasMenu && <Badge variant="secondary">{text('Has menu', 'لديه قائمة')}</Badge>}{place.data.priceVerified && <Badge variant="secondary">{text('Price verified', 'السعر موثق')}</Badge>}{place.data.visitedByUs && <Badge variant="secondary">{text('Visited by us', 'زرناه')}</Badge>}</div><p className="text-sm text-muted-foreground">{text('Website, opening hours, contacts, socials and location are maintained on the place page.', 'الموقع الإلكتروني والمواعيد وجهات الاتصال والتواصل والموقع الجغرافي تُدار في صفحة المكان.')}</p><div className="flex flex-wrap gap-2"><Button nativeButton={false} data-ro-allow="true" variant="outline" render={<Link href={`/dashboard/places/${placeId}`} />}>{canWrite ? text('Edit place', 'تعديل المكان') : text('View place', 'عرض المكان')}</Button><Button nativeButton={false} data-ro-allow="true" variant="outline" render={<Link href={`/dashboard/places/${placeId}/menu`} />}>{text('Menu', 'القائمة')}</Button></div></>}</CardContent></Card>;
}
