'use client';

import { useDashboardCopy } from '../dashboard-text';

export function SessionTrend({ series }: { series: { day?: string; sessions: number }[] }) {
  const copy = useDashboardCopy();
  const days = new Map<string, number>();
  for (const row of series) if (typeof row.day === 'string' && Number.isFinite(row.sessions)) days.set(row.day, (days.get(row.day) ?? 0) + row.sessions);
  const values = Array.from(days).sort(([first], [second]) => first.localeCompare(second)).map(([, value]) => value);
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => `${2 + index * 116 / (values.length - 1)},${26 - value * 24 / max}`).join(' ');
  return <svg viewBox="0 0 120 28" className="mt-3 h-8 w-full text-primary" role="img" aria-label={copy('Session trend for the selected period')}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
