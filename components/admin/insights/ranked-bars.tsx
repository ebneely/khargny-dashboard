'use client';

import * as React from 'react';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { DashboardText } from '@/components/admin/dashboard-text';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { translateDashboardCopy } from '@/lib/dashboard-copy';

export type RankedRow = {
  key: string;
  label: string;
  value?: number;
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
  scope,
}: {
  rows: RankedRow[];
  emptyLabel: string;
  /** Accessible name for the measure being plotted, e.g. "Views". */
  valueLabel: string;
  max?: number;
  scope: string;
}) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const measureLabel = translateDashboardCopy(valueLabel.charAt(0).toUpperCase() + valueLabel.slice(1), lang);
  const max = maxOverride ?? Math.max(1, ...rows.map((r) => r.value ?? 0));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground"><DashboardText>{emptyLabel}</DashboardText></p>
    );
  }

  return (
    <RecordList scope={scope} records={rows} searchText={(row) => row.label} render={(visible) => <ul className="flex flex-col gap-3">
      {visible.map((row, i) => {
        const pct = row.value === undefined ? 0 : Math.round((row.value / max) * 100);
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
            <RecordCell icon="location" name={row.label} thumbnail={null} />
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {row.value === undefined ? '—' : row.value.toLocaleString(lang)}
            </span>
            <div
              className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${row.label}: ${row.value === undefined ? '—' : row.value.toLocaleString(lang)} ${measureLabel}`}
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
    </ul>} />
  );
}
