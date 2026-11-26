'use client';

import { EyeOff } from 'lucide-react';
import { useDashboardCopy } from './dashboard-text';

/**
 * PLACES-DIRECTION §13 cascade, item 10: how many publishable places a city, area or
 * category holds. Zero is not an error: it is hidden from the public side, and the
 * marker says so in words (an icon plus the words, never colour alone).
 */
export function LiveBadge({ live }: { live: number | undefined }) {
  const copy = useDashboardCopy();
  if (live === undefined || live === null) return null;
  if (live > 0)
    return (
      <span data-slot="live-count" className="inline-flex items-center gap-1 text-sm tabular-nums">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        {live} <span className="text-muted-foreground">{copy('public')}</span>
      </span>
    );
  return (
    <span
      data-slot="live-zero"
      title={copy('Hidden — 0 public places')}
      className="inline-flex min-h-5 max-w-[190px] items-center gap-1 rounded-md bg-muted px-1.5 text-[11px] leading-none text-muted-foreground"
    >
      <EyeOff className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{copy('Hidden — 0 public places')}</span>
    </span>
  );
}
