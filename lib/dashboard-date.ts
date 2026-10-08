import type { DashLang } from './dashboard-lang';

export function dashboardDate(value: string | null | undefined, lang: DashLang, full = false): string {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00Z' : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: full ? 'full' : 'short', ...(full ? { timeStyle: 'long' as const } : {}), timeZone: 'UTC',
  }).format(date);
}


export function dashboardDateRange(start: string | null | undefined, end: string | null | undefined, lang: DashLang): string {
  const dates = [start, end].map((value) => value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00Z' : value) : null);
  const [first, last] = dates;
  const sameYear = first && last && !Number.isNaN(first.getTime()) && !Number.isNaN(last.getTime()) && first.getUTCFullYear() === last.getUTCFullYear();
  const format = (date: Date | null, year: boolean) => !date || Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' as const } : {}), timeZone: 'UTC' }).format(date);
  return format(first, !sameYear) + ' – ' + format(last, true);
}
