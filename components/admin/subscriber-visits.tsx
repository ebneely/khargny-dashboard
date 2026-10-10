'use client';

import { PageActions } from './page-actions';
import * as React from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { placeCover } from '@/lib/place-list';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { usePlaceMedia } from '@/lib/api/hooks/use-place-media';
import { cairoDate, optionalText, type SubscriberDetail, type Visit } from '@/lib/api/subscribers';
import { ActionDialog, type ActionSpec, Field, LoadingState, RequestError, SavedRefreshError, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberVisits({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, pick } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  return <Card id="visits"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{text('Visits and creatives', 'الزيارات والمواد الإبداعية')}</CardTitle>{<PageActions actions={[{ label: 'Add visit', allowed: canWrite, disabled: !subscriber.places.length, disabledReason: text('Link a place first.', 'اربط مكاناً أولاً.'), onClick: () => setAction({ title: text('Add visit', 'إضافة زيارة'), fields: [
    { name: 'placeId', label: text('Place', 'المكان'), type: 'select', value: subscriber.places[0]?.id ?? '', required: true, options: subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) })) },
    { name: 'visitedAt', label: text('Visit date (Cairo)', 'تاريخ الزيارة (القاهرة)'), type: 'date', value: cairoDate(), required: true },
    { name: 'notes', label: text('Visit notes', 'ملاحظات الزيارة'), type: 'textarea' },
    { name: 'consent', label: text('Photo / video consent received', 'تم الحصول على موافقة التصوير'), type: 'checkbox', value: false },
  ], submit: async (values, idempotencyKey) => { if (!canWrite) return; await adminApi.post<Visit>(`/v1/admin/places/${values.placeId}/visits`, { visitedAt: values.visitedAt, notes: optionalText(values.notes), consent: values.consent, subscriberId: subscriber.id }, { headers: { 'Idempotency-Key': idempotencyKey } }); const refreshed = await refresh(); if (refreshed) toast.success(text('Visit saved', 'تم حفظ الزيارة')); } }) }]} />}</CardHeader><CardContent className="space-y-6">{!subscriber.visits.length && <p className="text-sm text-muted-foreground">{text('No visits yet. Record a visit before uploading its images and videos.', 'لا توجد زيارات بعد. سجل زيارة قبل رفع صورها وفيديوهاتها.')}</p>}{<RecordList layout="groups" scope="subscriber-visits" records={subscriber.visits} searchText={(visit) => { const place = subscriber.places.find((entry) => entry.id === visit.placeId); return `${place?.name ?? visit.placeId} ${place?.nameEn ?? ''} ${visit.visitedAt} ${visit.notes ?? ''} ${visit.visitedBy.email}`; }} filters={[{ key: 'place', label: 'All places', options: subscriber.places.map((place) => ({ value: place.id, label: pick(place.name, place.nameEn) })), value: (visit) => visit.placeId }, { key: 'consent', label: 'All consent states', options: [{ value: 'yes', label: 'Consent recorded' }, { value: 'no', label: 'No photo consent recorded' }], value: (visit) => visit.consent ? 'yes' : 'no' }]} render={(visible) => <div className="space-y-6">{visible.map((visit) => <VisitCreatives key={visit.id} visit={visit} place={subscriber.places.find((place) => place.id === visit.placeId)} placeName={pick(subscriber.places.find((place) => place.id === visit.placeId)?.name, subscriber.places.find((place) => place.id === visit.placeId)?.nameEn) || visit.placeId} canWrite={canWrite} refresh={refresh} />)}</div>} />}<ActionDialog action={action} onClose={() => setAction(null)} /></CardContent></Card>;
}

function VisitCreatives({ visit, placeName, place, canWrite, refresh }: { visit: Visit; placeName: string; place?: SubscriberPlace; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, lang } = useSubscriberText();
  const media = usePlaceMedia(visit.placeId, visit.id);
  const [error, setError] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [savedRefreshFailed, setSavedRefreshFailed] = React.useState(false);
  const retryMedia = async () => { if (await media.refetch()) setSavedRefreshFailed(false); };
  const images = media.images.filter((image) => image.visitId === visit.id);
  const videos = media.videos.filter((video) => video.visitId === visit.id);
  return <section className="space-y-3 border-t pt-4"><header className="flex flex-wrap justify-between gap-3"><div><RecordCell nameAr={place?.name ?? placeName} nameEn={place?.nameEn} thumbnail={place ? placeCover(place) : null} context={visit.visitedAt} /><p className="mt-1 text-sm text-muted-foreground">{visit.imageCount} {text('images', 'صور')} · {visit.videoCount} {text('videos', 'فيديوهات')} · {visit.consent ? text('Consent recorded', 'الموافقة مسجلة') : text('No photo consent recorded', 'لم تُسجل موافقة التصوير')}</p></div></header>{visit.notes && <p className="whitespace-pre-wrap text-sm">{visit.notes}</p>}
    {media.loading ? <LoadingState /> : media.isError ? savedRefreshFailed ? <SavedRefreshError retry={() => { void retryMedia(); }} /> : <RequestError message={text('Could not load visit media.', 'تعذر تحميل وسائط الزيارة.')} retry={() => { void retryMedia(); }} /> : !images.length && !videos.length ? <p className="text-sm text-muted-foreground">{text('No creatives uploaded for this visit.', 'لم تُرفع مواد إبداعية لهذه الزيارة.')}</p> : <RecordList scope={`visit-media-${visit.id}`} records={[...images.map((image) => ({ id: image.id, kind: 'image', label: image.altText || text('Visit photo', 'صورة الزيارة'), thumbnail: image.urls?.small ?? image.url, image, video: null })), ...videos.map((video) => ({ id: video.id, kind: 'video', label: text('Visit video', 'فيديو الزيارة'), thumbnail: video.posterUrl ?? video.thumbnailUrl ?? null, image: null, video }))]} searchText={(row) => `${row.label} ${row.id}`} filters={[{ key: 'kind', label: 'All media types', options: [{ value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }], value: (row) => row.kind }]} render={(visible) => <ul className="divide-y">{visible.map((row) => <li key={`${row.kind}-${row.id}`} className="min-w-0 space-y-3 py-3">{row.image ? <a href={row.image.url} target="_blank" rel="noreferrer" className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring"><RecordCell name={row.label} context={row.id} thumbnail={row.thumbnail} /></a> : <><RecordCell name={row.label} context={row.id} thumbnail={row.thumbnail} /><video src={row.video?.url} poster={row.thumbnail ?? undefined} controls preload="metadata" className="aspect-video w-full max-w-lg rounded-lg bg-muted" aria-label={row.label} /></>}</li>)}</ul>} />}

    {canWrite && <Field label={text('Upload images and videos', 'رفع صور وفيديوهات')}><FileUpload label={lang === 'ar' ? 'اختر صوراً وفيديوهات' : 'Choose images and videos'} description={lang === 'ar' ? 'صور وفيديوهات من الزيارة.' : 'Photos and videos from the visit.'} multiple accept="image/*,video/*" disabled={uploading || media.busy || media.loading || media.isError || savedRefreshFailed} onChange={async (event) => {
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
