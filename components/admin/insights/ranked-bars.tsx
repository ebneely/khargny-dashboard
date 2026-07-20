'use client';

import * as React from 'react';

export type RankedRow = {
  key: string;
  label: string;
  value: number;
  /** Secondary context shown under the label, e.g. "12 places". */
  meta?: string;
};

/**
 * Horizontal ranked bars — magnitude across named items.
 *
 * Form: comparing magnitude low→high, so the color job is SEQUENTIAL — one hue, darker for
 * bigger. Not categorical: these items are not distinct series and painting each city its
 * own hue would imply an identity the data does not have, while burying the ranking that
 * is the actual point.
 *
 * Horizontal because the labels are place names (long, and Arabic in one language); a
 * column chart would either clip them or turn them 45°.
 *
 * One measure per chart, one axis. Views, saves and directions differ by an order of
 * magnitude, so they are never plotted together — the caller switches between them.
 */
export function RankedBars({
  rows,
  emptyLabel,
  valueLabel,
  max: maxOverride,
}: {
  rows: RankedRow[];
  emptyLabel: string;
  /** Accessible name for the measure being plotted, e.g. "Views". */
  valueLabel: string;
  max?: number;
}) {
  const max = maxOverride ?? Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const pct = Math.round((row.value / max) * 100);
        // Sequential steps: the leader is darkest, the tail lightest, so rank is legible
        // without reading a single number. Four steps, not a per-row gradient — a
        // continuous ramp implies precision the ranking does not carry.
        const step =
          i === 0
            ? 'var(--brand-700)'
            : i < 3
              ? 'var(--brand-600)'
              : i < 6
                ? 'var(--brand-500)'
                : 'var(--brand-400)';
        return (
          <li key={row.key} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1">
            <span className="truncate text-sm font-medium text-foreground" title={row.label}>
              {row.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {row.value.toLocaleString('en-US')}
            </span>
            <div
              className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${row.label}: ${row.value.toLocaleString('en-US')} ${valueLabel}`}
            >
              <div
                className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                style={{ width: `${pct}%`, background: step }}
              />
            </div>
            {row.meta && (
              <span className="col-span-2 -mt-0.5 text-xs text-muted-foreground">{row.meta}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
