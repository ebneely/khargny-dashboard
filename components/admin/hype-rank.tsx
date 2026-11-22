'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardCopy } from './dashboard-text';
import { rankText, type HypeRankInfo } from '@/lib/people';

/** "#12 of 1,240 · top 1%" beside every hype number, with the week's movement; team only, never on customer screens. */
export function HypeRank({ rank, area, category, className }: { rank?: HypeRankInfo | null; area?: string; category?: string; className?: string }) {
  const copy = useDashboardCopy();
  if (!rank) return <span className={cn('text-xs text-muted-foreground', className)}>{copy('No hype yet')}</span>;
  const moved = rank.moved;
  const where = [
    rank.areaRank && area ? `#${rank.areaRank.rank.toLocaleString('en-US')} ${copy('in')} ${area}` : '',
    rank.categoryRank && category ? `#${rank.categoryRank.rank.toLocaleString('en-US')} ${copy('in')} ${category}` : '',
  ].filter(Boolean).join(' · ');
  return <span data-slot="hype-rank" className={cn('inline-flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-muted-foreground', className)} title={where || undefined}>
    <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-primary">{rankText(rank, copy('of'), copy('top'))}</span>
    {moved ? <span className="inline-flex items-center gap-0.5" aria-label={`${moved > 0 ? copy('up') : copy('down')} ${Math.abs(moved)} ${copy('vs last week')}`}>
      {moved > 0 ? <ArrowUp aria-hidden="true" className="size-3 text-primary" /> : <ArrowDown aria-hidden="true" className="size-3" />}{Math.abs(moved).toLocaleString('en-US')}<span className="sr-only">{copy('vs last week')}</span></span> : null}
  </span>;
}
