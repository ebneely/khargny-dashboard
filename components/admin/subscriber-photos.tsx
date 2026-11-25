'use client';

import { dashboardDateTime } from '@/lib/dashboard-date';
import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { ActionDialog, type ActionSpec, RequestError, useSubscriberText } from './subscriber-ui';
import { LoadingState } from './subscriber-ui';
import { localeFor } from '@/lib/locale';

interface PhotoSubmission {
  id: string;
  placeId: string;
  placeName: string;
  placeNameEn: string | null;
  width: number;
  height: number;
  createdAt: string;
}

/** Photos waiting for review: one owner's, or every owner's when subscriberId is left out (Inbox). */
export function PendingPhotos({ subscriberId, canWrite }: { subscriberId?: string; canWrite: boolean }) {
  const { text, lang } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const load = React.useCallback(() => adminApi.get<PhotoSubmission[]>('/v1/admin/photo-submissions', subscriberId ? { subscriberId } : {}), [subscriberId]);
  const resource = useSubscriberResource(load);
  const review = async (id: string, verb: 'approve' | 'reject', body?: unknown) => {
    await adminApi.post(`/v1/admin/photo-submissions/${id}/${verb}`, body);
    toast.success(verb === 'approve' ? text('Photo published', 'تم نشر الصورة') : text('Photo rejected', 'تم رفض الصورة'));
    await resource.refetch();
  };
  const rows = resource.data ?? [];
  return <section aria-labelledby="pending-photos" className="space-y-3">
    <h3 id="pending-photos" className="text-sm font-medium">{text('Photos waiting for review', 'صور تنتظر المراجعة')}{rows.length ? ` (${rows.length.toLocaleString(localeFor(lang))})` : ''}</h3>
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={text('Could not load the photos waiting for review.', 'تعذر تحميل الصور المنتظرة.')} retry={() => { void resource.refetch(); }} />
      : !rows.length ? <p className="text-sm text-muted-foreground">{text('No photos are waiting.', 'لا توجد صور منتظرة.')}</p>
      : <ul className="grid gap-3 sm:grid-cols-2">{rows.map((row) => <li key={row.id} className="space-y-2 rounded-lg border p-3">
        <PrivatePhoto path={`/v1/admin/photo-submissions/${row.id}/image`} alt={text(`Photo for ${row.placeNameEn ?? row.placeName}`, `صورة لـ ${row.placeName}`)} />
        <p className="text-sm font-medium">{lang === 'ar' ? row.placeName : row.placeNameEn ?? row.placeName}</p>
        <p className="text-xs text-muted-foreground">{row.width}×{row.height} {dashboardDateTime(row.createdAt, lang)}</p>
        {canWrite && <div className="flex gap-2">
          <Button size="sm" onClick={() => { void review(row.id, 'approve'); }}><Check aria-hidden="true" />{text('Approve', 'قبول')}</Button>
          <Button size="sm" variant="outline" onClick={() => setAction({ title: text('Reject this photo?', 'رفض هذه الصورة؟'), destructive: true, description: text('The owner sees your reason in the portal.', 'يرى صاحب المكان السبب في البوابة.'), fields: [{ name: 'reason', label: text('Reason', 'السبب'), type: 'textarea', required: true }], submit: async (values) => { await review(row.id, 'reject', { reason: String(values.reason) }); } })}><X aria-hidden="true" />{text('Reject', 'رفض')}</Button>
        </div>}
      </li>)}</ul>}
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </section>;
}

/** Pending photos are private: fetched with the admin session, shown from a local blob URL. */
export function PrivatePhoto({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    adminApi.blob(path, controller.signal).then((blob) => { url = URL.createObjectURL(blob); setSrc(url); }).catch(() => undefined);
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return src ? <Image src={src} alt={alt} width={400} height={300} unoptimized className="aspect-[4/3] w-full rounded-md object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse rounded-md bg-muted" aria-hidden="true" />;
}
