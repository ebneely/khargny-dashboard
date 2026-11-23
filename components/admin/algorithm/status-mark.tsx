'use client';

import {
  Circle, CircleAlert, Flame, FlaskConical, Moon, Sparkles, TrendingDown, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { useDashboardCopy } from '../dashboard-text';
import { cn } from '@/lib/utils';
import type { AlgorithmStatus } from '@/lib/api/algorithm';
import { ALGORITHM_STATUS_MEANINGS, ALGORITHM_STATUS_ORDER, ALGORITHM_STATUS_WORDS } from '@/lib/algorithm-status';

/** One distinct shape per status, so the mark reads without its colour (decision 0006, section 4b). */
const STATUS_ICONS: Record<AlgorithmStatus, LucideIcon> = {
  new: Sparkles,
  trial: FlaskConical,
  rising: TrendingUp,
  hyped: Flame,
  normal: Circle,
  cooling: TrendingDown,
  resting: Moon,
  needs_listing: CircleAlert,
};

/** A status mark's icon; it always sits beside the status word, so it is decorative for assistive technology. */
export function StatusIcon({ status, className = 'size-4' }: { status: AlgorithmStatus; className?: string }) {
  const Icon = STATUS_ICONS[status] ?? Circle;
  return <Icon aria-hidden="true" className={className} />;
}

/** Icon + word, with an optional count; used in the status filter chips. */
export function StatusMark({ status, count }: { status: AlgorithmStatus; count?: number }) {
  const copy = useDashboardCopy();
  return <>
    <StatusIcon status={status} />
    {copy(ALGORITHM_STATUS_WORDS[status])}
    {typeof count === 'number' && <span className="tabular-nums">{count.toLocaleString('en-US')}</span>}
  </>;
}

/** The compact key beside the status chips: what every mark means, in decision 0006's words. */
export function AlgorithmStatusLegend({ className }: { className?: string }) {
  const copy = useDashboardCopy();
  return <details className={cn('rounded-lg bg-muted/50 px-3 py-2 text-sm', className)}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center font-medium [&::-webkit-details-marker]:hidden">{copy('What do these mean?')}</summary>
    <dl className="mt-1 grid gap-3 sm:grid-cols-2">
      {ALGORITHM_STATUS_ORDER.map((status) => <div key={status} className="flex gap-2">
        <StatusIcon status={status} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <dt className="font-medium">{copy(ALGORITHM_STATUS_WORDS[status])}</dt>
          <dd className="text-muted-foreground">{copy(ALGORITHM_STATUS_MEANINGS[status])}</dd>
        </div>
      </div>)}
    </dl>
  </details>;
}
