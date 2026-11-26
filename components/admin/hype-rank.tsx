'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardCopy } from './dashboard-text';
import { rankText, type HypeRankInfo } from '@/lib/people';

/**
 * "#12 of 1,240 · top 1%" beside every hype number, with the week's movement; team only,
 * never on customer screens. One line inside a pill sized to its text; in a narrow cell
 * it says "#12 · 1%" and keeps the full sentence in the label and the title.
 */
export function HypeRank({ rank, area, category, className }: { rank?: HypeRankInfo | null; area?: string; category?: string; className?: string }) {
  const copy = useDashboardCopy();
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const parent = element.parentElement ?? element;
    const measure = () => {
      const width = parent.getBoundingClientRect().width;
      setNarrow(width > 0 && width < 150);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(parent);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [rank]);
  if (!rank) return <span className={cn('text-xs text-muted-foreground', className)}>{copy('No hype yet')}</span>;
  const moved = rank.moved;
  const where = [
    rank.areaRank && area ? `#${rank.areaRank.rank.toLocaleString('en-US')} ${copy('in')} ${area}` : '',
    rank.categoryRank && category ? `#${rank.categoryRank.rank.toLocaleString('en-US')} ${copy('in')} ${category}` : '',
  ].filter(Boolean).join(' · ');
  const full = rankText(rank, copy('of'), copy('top'));
  const short = `#${rank.rank.toLocaleString('en-US')} · ${rank.topPercent}%`;
  return <span ref={ref} data-slot="hype-rank" className={cn('inline-flex max-w-full flex-nowrap items-center gap-x-1.5 text-xs tabular-nums text-muted-foreground', className)} title={[full, where].filter(Boolean).join(' · ')}>
    <span data-slot="hype-rank-pill" aria-label={full} className="inline-block whitespace-nowrap rounded-full bg-accent px-2 py-0.5 font-medium text-primary">{narrow ? short : full}</span>
    {moved ? <span className="inline-flex shrink-0 items-center gap-0.5" aria-label={`${moved > 0 ? copy('up') : copy('down')} ${Math.abs(moved)} ${copy('vs last week')}`}>
      {moved > 0 ? <ArrowUp aria-hidden="true" className="size-3 text-primary" /> : <ArrowDown aria-hidden="true" className="size-3" />}{Math.abs(moved).toLocaleString('en-US')}<span className="sr-only">{copy('vs last week')}</span></span> : null}
  </span>;
}
