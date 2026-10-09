'use client';

import { PageActions } from './page-actions';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
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
  return <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}><header><PageActions form actions={[{ label: 'Back to place', href: `/dashboard/places/${placeId}`, readOnly: true }]} /><h1 className="mt-3 font-display text-2xl font-semibold">{text('Pricing', 'الأسعار')}</h1><p className="mt-1 text-sm text-muted-foreground">{text('Manage items and services, prices and visibility.', 'إدارة الأصناف والخدمات والأسعار والظهور.')}</p></header><PlaceDetailsCard placeId={placeId} canWrite={canWrite} resource={resource} />{resource.error && resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}<PlaceMenuEditor placeId={placeId} canWrite={canWrite && !resource.loading && !resource.error} onChanged={resource.refreshAfterSave} /></div>;
}

export function PlaceMenuTab({ placeId, disabled }: { placeId: string; disabled: boolean }) {
  const session = useCurrentSession();
  const role = session.data?.user.role;
  const canWrite = !disabled && !session.isLoading && !session.isError && (role === 'admin' || role === 'super_admin');
  return <PlaceMenuEditor placeId={placeId} canWrite={canWrite} />;
}
