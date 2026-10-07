'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { PlaceMenuEditor } from './place-menu-editor';
import { PlaceDetailsCard } from './subscriber-place-details';
import { SavedRefreshError, useSubscriberText } from './subscriber-ui';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { PlaceDetailResponse } from '@/lib/api/subscribers';

export function PlaceMenuPage({ placeId, canWrite }: { placeId: string; canWrite: boolean }) {
  const { text, lang } = useSubscriberText();
  const load = useCallback(async () => {
    const result = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${placeId}`);
    return 'place' in result ? result.place : result;
  }, [placeId]);
  const resource = useSubscriberResource(load);
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}><header><Link href={`/dashboard/places/${placeId}`} className="text-sm text-muted-foreground underline underline-offset-4">{text('Back to place', 'العودة للمكان')}</Link><h1 className="mt-3 font-display text-2xl font-semibold">{text('Place menu', 'قائمة المكان')}</h1></header><PlaceDetailsCard placeId={placeId} canWrite={canWrite} resource={resource} />{resource.error && resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}<PlaceMenuEditor placeId={placeId} canWrite={canWrite && !resource.loading && !resource.error} onChanged={resource.refreshAfterSave} /></div>;
}
