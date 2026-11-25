/**
 * The shape of a daily engagement series, kept pure so the drawing component only paints it.
 *
 * The report returns only the days it has stored counts for, and its definition says a
 * missing day is not a measured zero. A gap therefore breaks the drawing into segments
 * instead of drawing a line or a bar at zero.
 *
 * The calendar math is local (UTC stamps on `YYYY-MM-DD`) so this module has no dependency
 * and its test needs no app alias.
 */
export interface TrendPoint { date: string; value: number }
export interface TrendPlacement { x: number; value: number }
export interface TrendShape {
  /** Whole Cairo days in the requested range. */
  days: number;
  /** The highest known value; at least 1 so a chart never divides by zero. */
  max: number;
  /** Runs of consecutive known days, each point placed 0..1 across the range. */
  segments: TrendPlacement[][];
  /** Days that carry a stored count. */
  knownDays: number;
}

function dayStamp(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function shiftDays(date: string, days: number): string {
  return new Date(dayStamp(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Place the known days of a series across the requested calendar range. */
export function trendShape(points: readonly TrendPoint[], from: string, to: string): TrendShape {
  const days = Math.max(1, Math.round((dayStamp(to) - dayStamp(from)) / 86_400_000) + 1);
  const indexByDate = new Map<string, number>();
  for (let index = 0; index < days; index += 1) indexByDate.set(shiftDays(from, index), index);
  const known = new Map<number, number>();
  for (const point of points) {
    const index = indexByDate.get(point.date);
    if (index === undefined) continue;
    if (!Number.isFinite(point.value) || point.value < 0) continue;
    known.set(index, point.value);
  }
  const ordered = [...known.entries()].sort((first, second) => first[0] - second[0]);
  const segments: TrendPlacement[][] = [];
  let current: TrendPlacement[] = [];
  let previousIndex = -2;
  for (const [index, value] of ordered) {
    if (index !== previousIndex + 1 && current.length) {
      segments.push(current);
      current = [];
    }
    current.push({ x: days === 1 ? 0.5 : index / (days - 1), value });
    previousIndex = index;
  }
  if (current.length) segments.push(current);
  const max = ordered.reduce((top, [, value]) => Math.max(top, value), 0);
  return { days, max: Math.max(1, max), segments, knownDays: ordered.length };
}

/**
 * How far a period moved against the period before it, as a percentage.
 *
 * There is no comparison when the earlier period counted nothing: that is unknown, never
 * an infinite rise.
 */
export function changeAgainstPrevious(periodTotal: number, previousPeriodTotal: number): number | null {
  if (!Number.isFinite(periodTotal) || !Number.isFinite(previousPeriodTotal)) return null;
  if (previousPeriodTotal <= 0) return null;
  return ((periodTotal - previousPeriodTotal) / previousPeriodTotal) * 100;
}
