'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A single headline number.
 *
 * A stat tile, not a one-bar chart: for a current value with no comparison, the number IS
 * the visualization. The icon carries a tint so the row scans, but the value itself wears a
 * text token — a number painted in a series color reads as a category, which it is not.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      {loading ? (
        // A skeleton, not a spinner: the tile keeps its height so the row does not reflow
        // when the numbers land.
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" aria-hidden="true" />
      ) : (
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-foreground">
          {value.toLocaleString('en-US')}
        </p>
      )}
      {hint && (
        <p className={cn('mt-1 text-xs text-muted-foreground', loading && 'opacity-0')}>{hint}</p>
      )}
    </div>
  );
}
