'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SubmissionMediaRow } from '@/lib/api/submissions';
import { useDashboardCopy } from './dashboard-text';

const seconds = (value: number | null) => value === null ? '' : `0:${String(Math.round(value)).padStart(2, '0')}`;

/** The customer's screenshots and videos: thumbnails that open a lightbox; videos play inline there. */
export function SubmissionMedia({ media, photoUrl }: { media: SubmissionMediaRow[]; photoUrl?: string | null }) {
  const copy = useDashboardCopy();
  const items: SubmissionMediaRow[] = [...(photoUrl ? [{ type: 'image' as const, url: photoUrl, thumbUrl: photoUrl, width: null, height: null, size: 0, durationSeconds: null }] : []), ...media];
  const [open, setOpen] = React.useState<number | null>(null);
  if (!items.length) return null;
  const current = open === null ? null : items[open];
  const step = (by: number) => setOpen((index) => index === null ? null : (index + by + items.length) % items.length);
  return <>
    <ul className="flex flex-wrap gap-2" aria-label={copy('Attached proof')}>{items.map((item, index) => <li key={index}>
      <button type="button" data-ro-allow="true" onClick={() => setOpen(index)} className="relative block size-16 overflow-hidden rounded-md border bg-muted transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary" aria-label={copy(item.type === 'video' ? 'Play the video' : 'Open the photo')}>
        {item.type === 'image' && (item.thumbUrl || item.url)
          // eslint-disable-next-line @next/next/no-img-element -- signed, expiring links: next/image would cache them
          ? <img src={item.thumbUrl || item.url!} alt="" className="size-full object-cover" loading="lazy" />
          : <span className="flex size-full flex-col items-center justify-center gap-0.5 text-muted-foreground"><Play className="size-5" aria-hidden="true" /><span className="text-xs tabular-nums" dir="ltr">{seconds(item.durationSeconds)}</span></span>}
      </button>
    </li>)}</ul>
    <Dialog open={current !== null} onOpenChange={(value) => { if (!value) setOpen(null); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{copy(current?.type === 'video' ? 'Video from the customer' : 'Photo from the customer')}</DialogTitle><DialogDescription className="tabular-nums">{open !== null && `${open + 1} / ${items.length}`}</DialogDescription></DialogHeader>
        {current && (current.url
          ? current.type === 'video'
            ? <video key={current.url} src={current.url} controls playsInline preload="metadata" className="max-h-[70vh] w-full rounded-md bg-black" />
            // eslint-disable-next-line @next/next/no-img-element -- signed, expiring links
            : <img src={current.url} alt={copy('Photo from the customer')} className="max-h-[70vh] w-full rounded-md object-contain" />
          : <p className="text-sm text-muted-foreground">{copy('This file could not be opened. Storage did not answer.')}</p>)}
        {items.length > 1 && <div className="flex justify-between"><Button variant="outline" size="sm" data-ro-allow="true" onClick={() => step(-1)}><ChevronLeft className="rtl:rotate-180" aria-hidden="true" />{copy('Previous')}</Button><Button variant="outline" size="sm" data-ro-allow="true" onClick={() => step(1)}>{copy('Next')}<ChevronRight className="rtl:rotate-180" aria-hidden="true" /></Button></div>}
      </DialogContent>
    </Dialog>
  </>;
}
