'use client';

import * as React from 'react';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { moodsApi, type MoodPreviewPlace, type MoodWeights } from '@/lib/api/moods';
import { accentOf } from '@/lib/mood-tokens';
import { cn } from '@/lib/utils';

/**
 * The city's top ten for one mood. Without `weights` it reads the saved fit; with them it
 * asks for the unsaved draft (debounced), so the admin sees the effect of a chip before saving.
 */
export function MoodPreview({ moodId, cityId, accent, weights, compact }: { moodId: string; cityId: string; accent: string; weights?: MoodWeights; compact?: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const weightsKey = weights ? JSON.stringify(weights) : '';
  const requestKey = `${moodId}|${cityId}|${weightsKey}`;
  // The answer carries the key it belongs to, so "loading" is a comparison, never a second setState.
  const [answer, setAnswer] = React.useState<{ key: string; rows: MoodPreviewPlace[]; failed: boolean } | null>(null);
  const tone = accentOf(accent);
  const current = answer?.key === requestKey ? answer : null;
  const busy = !current;

  React.useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      const request = weights ? moodsApi.draftPreview(moodId, JSON.parse(weightsKey) as MoodWeights, cityId || undefined) : moodsApi.preview(moodId, cityId || undefined);
      request
        .then((rows) => { if (live) setAnswer({ key: requestKey, rows, failed: false }); })
        .catch(() => { if (live) setAnswer({ key: requestKey, rows: [], failed: true }); });
    }, weights ? 450 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [moodId, cityId, weightsKey, requestKey, weights]);

  if (current?.failed) return <p className="text-sm text-muted-foreground" role="status">{copy('Could not load the preview.')}</p>;
  if (!current) return <div className="h-24 animate-pulse rounded bg-muted" aria-busy="true" />;
  const rows = current.rows;
  if (!rows.length) return <p className="text-sm text-muted-foreground" role="status">{copy('No places match this mood in this city yet.')}</p>;

  return <div data-slot="mood-preview" className={cn('min-w-0', busy && 'opacity-70')} aria-busy={busy}>
    <ol className="divide-y">
      {rows.slice(0, compact ? 5 : 10).map((place, index) => <li key={place.id} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2">
        <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
        <div className="min-w-0">
          <p className="truncate text-start font-medium" title={pick(place.name, place.nameEn)}><span dir="auto">{pick(place.name, place.nameEn)}</span></p>
          <p className="truncate text-start text-sm text-muted-foreground"><span dir="auto">{place.category?.en || place.category?.ar || '—'}{place.region ? ` · ${place.region}` : ''}</span></p>
        </div>
        <div className="flex w-24 shrink-0 items-center justify-end gap-2">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full', tone.bar)} style={{ width: `${Math.round(place.fit * 100)}%` }} /></span>
          <span className="w-10 text-end text-sm tabular-nums text-muted-foreground" title={copy('Fit')}>{place.fit > 0 ? `${Math.round(place.fit * 100)}%` : '—'}</span>
        </div>
      </li>)}
    </ol>
  </div>;
}
