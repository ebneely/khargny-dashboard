'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { usePlaceMedia } from '@/lib/api/hooks/use-place-media';
import { cairoDate, optionalText, type SubscriberDetail, type Visit } from '@/lib/api/subscribers';
import { ActionDialog, type ActionSpec, Field, LoadingState, RequestError, SavedRefreshError, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberVisits({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, pick } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  return <Card id="visits"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{text('Visits and creatives', 'الزيارات والمواد الإبداعية')}</CardTitle>{canWrite && <Button disabled={!subscriber.places.length} onClick={() => setAction({ title: text('Add visit', 'إضافة زيارة'), fields: [
    { name: 'placeId', label: text('Place', 'المكان'), type: 'select', value: subscriber.places[0]?.id ?? '', required: true, options: subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) })) },
    { name: 'visitedAt', label: text('Visit date (Cairo)', 'تاريخ الزيارة (القاهرة)'), type: 'date', value: cairoDate(), required: true },
    { name: 'notes', label: text('Visit notes', 'ملاحظات الزيارة'), type: 'textarea' },
    { name: 'consent', label: text('Photo / video consent received', 'تم الحصول على موافقة التصوير'), type: 'checkbox', value: false },
  ], submit: async (values, idempotencyKey) => { if (!canWrite) return; await adminApi.post<Visit>(`/v1/admin/places/${values.placeId}/visits`, { visitedAt: values.visitedAt, notes: optionalText(values.notes), consent: values.consent, subscriberId: subscriber.id }, { headers: { 'Idempotency-Key': idempotencyKey } }); const refreshed = await refresh(); if (refreshed) toast.success(text('Visit saved', 'تم حفظ الزيارة')); } })}>{text('Add visit', 'إضافة زيارة')}</Button>}</CardHeader><CardContent className="space-y-6">{!subscriber.visits.length && <p className="text-sm text-muted-foreground">{text('No visits yet. Record a visit before uploading its images and videos.', 'لا توجد زيارات بعد. سجل زيارة قبل رفع صورها وفيديوهاتها.')}</p>}{subscriber.visits.map((visit) => <VisitCreatives key={visit.id} visit={visit} placeName={pick(subscriber.places.find((place) => place.id === visit.placeId)?.name, subscriber.places.find((place) => place.id === visit.placeId)?.nameEn) || visit.placeId} canWrite={canWrite} refresh={refresh} />)}<ActionDialog action={action} onClose={() => setAction(null)} /></CardContent></Card>;
}

function VisitCreatives({ visit, placeName, canWrite, refresh }: { visit: Visit; placeName: string; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, lang } = useSubscriberText();
  const media = usePlaceMedia(visit.placeId, visit.id);
  const [error, setError] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [savedRefreshFailed, setSavedRefreshFailed] = React.useState(false);
  const retryMedia = async () => { if (await media.refetch()) setSavedRefreshFailed(false); };
  const images = media.images.filter((image) => image.visitId === visit.id);
  const videos = media.videos.filter((video) => video.visitId === visit.id);
  return <section className="space-y-3 border-t pt-4"><header className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{placeName} · <span className="tabular-nums">{visit.visitedAt}</span></h3><p className="mt-1 text-sm text-muted-foreground">{visit.imageCount} {text('images', 'صور')} · {visit.videoCount} {text('videos', 'فيديوهات')} · {visit.consent ? text('Consent recorded', 'الموافقة مسجلة') : text('No photo consent recorded', 'لم تُسجل موافقة التصوير')}</p></div></header>{visit.notes && <p className="whitespace-pre-wrap text-sm">{visit.notes}</p>}
    {media.loading ? <LoadingState /> : media.isError ? savedRefreshFailed ? <SavedRefreshError retry={() => { void retryMedia(); }} /> : <RequestError message={text('Could not load visit media.', 'تعذر تحميل وسائط الزيارة.')} retry={() => { void retryMedia(); }} /> : !images.length && !videos.length ? <p className="text-sm text-muted-foreground">{text('No creatives uploaded for this visit.', 'لم تُرفع مواد إبداعية لهذه الزيارة.')}</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image) => <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-ring"><Image src={image.urls?.small ?? image.url} alt={image.altText || text('Visit photo', 'صورة الزيارة')} width={320} height={220} unoptimized className="aspect-video w-full object-cover" /></a>)}{videos.map((video) => <video key={video.id} src={video.url} poster={video.posterUrl ?? video.thumbnailUrl ?? undefined} controls preload="metadata" className="aspect-video w-full rounded-lg bg-muted" aria-label={text('Visit video', 'فيديو الزيارة')} />)}</div>}
    {canWrite && <Field label={text('Upload images and videos', 'رفع صور وفيديوهات')}><input type="file" multiple accept="image/*,video/*" className="block w-full rounded-lg border border-input p-3 text-sm file:me-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 focus-visible:ring-2 focus-visible:ring-ring" disabled={uploading || media.busy || media.loading || media.isError || savedRefreshFailed} onChange={async (event) => {
      const files = Array.from(event.target.files ?? []); event.target.value = '';
      if (!canWrite || !files.length || media.loading || media.isError || savedRefreshFailed) return;
      setUploading(true); setError('');
      try {
        if (files.some((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) throw new Error(text('Choose only images and videos.', 'اختر صوراً وفيديوهات فقط.'));
        const imagesResult = await media.uploadMany(files.filter((file) => file.type.startsWith('image/')));
        if (!imagesResult.refreshed) { setSavedRefreshFailed(imagesResult.uploaded); await refresh(); return; }
        const videosResult = await media.uploadVideos(files.filter((file) => file.type.startsWith('video/')));
        if (!videosResult.refreshed) setSavedRefreshFailed(imagesResult.uploaded || videosResult.uploaded);
        await refresh();
      } catch (caught) { setError(subscriberError(caught, lang)); }
      finally { setUploading(false); }
    }} /></Field>}
    {media.queue.map((entry) => <div key={entry.id} className="space-y-1" role={entry.status === 'error' ? 'alert' : 'status'}><p className="break-all text-sm">{entry.name} · {entry.status === 'error' ? text('Upload failed — select the file again to retry.', 'فشل الرفع — اختر الملف مرة أخرى لإعادة المحاولة.') : entry.status === 'done' ? text('Uploaded', 'تم الرفع') : `${entry.percent}%`}</p>{entry.status !== 'error' && <progress max={100} value={entry.percent} className="h-2 w-full accent-primary" aria-label={entry.name} />}{entry.status === 'error' && <p className="text-sm text-destructive">{lang === 'en' ? entry.error : text('Upload failed.', 'فشل الرفع.')}</p>}</div>)}{error && <RequestError message={error} />}
  </section>;
}
