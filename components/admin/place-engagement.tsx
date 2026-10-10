'use client';

import { engagementMetrics, engagementNumber } from '@/lib/engagement';
import type { AdminPlace } from '@/lib/api/types';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from './dashboard-text';

export function PlaceEngagement({ place }: { place: AdminPlace }) {
  const { lang } = useDashboardLang();
  const copy = useDashboardCopy();
  const values = { views: place.viewCount, saves: place.saveCount, likes: place.likeCount, directions: place.directionsCount };
  return <section aria-label={copy('Place engagement')} className="mb-6 space-y-2"><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{engagementMetrics.map(({ key, label, icon: Icon }) => <div key={key}><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{copy(label)}</dt><dd className="mt-1 tabular-nums">{engagementNumber(values[key], lang)}</dd></div>)}</dl><p className="text-sm text-muted-foreground">{copy('Views, saves and taps are lifetime counters. Likes are the current committed count; unavailable fields stay —.')}</p></section>;
}
