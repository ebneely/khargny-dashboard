'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardCopy } from './dashboard-text';
import { rankCount, type HypeRankInfo } from '@/lib/people';

/**
 * "#12 of 1,240 · top 1%" beside every hype number, with the week's movement; team only, never on customer screens.
 * The rank and the top % are separate pieces so a narrow table column wraps between them instead of clipping.
 */
export function HypeRank({ rank, area, category, className }: { rank?: HypeRankInfo | null; area?: string; category?: string; className?: string }) {
  const copy = useDashboardCopy();
  if (!rank) return <span className={cn('text-xs text-muted-foreground', className)}>{copy('No hype yet')}</span>;
  const moved = rank.moved;
  const where = [
    rank.areaRank && area ? `#${rank.areaRank.rank.toLocaleString('en-US')} ${copy('in')} ${area}` : '',
    rank.categoryRank && category ? `#${rank.categoryRank.rank.toLocaleString('en-US')} ${copy('in')} ${category}` : '',
  ].filter(Boolean).join(' · ');
  return <span data-slot="hype-rank" title={where || undefined} className={cn('inline-flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground', className)}>
    <span className="whitespace-nowrap rounded-full bg-accent px-1.5 py-0.5 font-medium text-primary">{rankCount(rank, copy('of'))}</span>
    <span className="whitespace-nowrap">{`· ${copy('top')} ${rank.topPercent}%`}</span>
    {moved ? <span className="inline-flex items-center gap-0.5 whitespace-nowrap" aria-label={`${moved > 0 ? copy('up') : copy('down')} ${Math.abs(moved)} ${copy('vs last week')}`}>
      {moved > 0 ? <ArrowUp aria-hidden="true" className="size-3" /> : <ArrowDown aria-hidden="true" className="size-3" />}{Math.abs(moved).toLocaleString('en-US')}<span className="sr-only">{copy('vs last week')}</span></span> : null}
  </span>;
}
