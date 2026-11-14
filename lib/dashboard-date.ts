import type { DashLang } from './dashboard-lang';
import { AR_LOCALE } from '@/lib/locale';

export function dashboardDate(value: string | null | undefined, lang: DashLang, full = false): string {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00Z' : value);
  if (Number.isNaN(date.getTime())) return '—';
  if (full && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return dashboardDateTime(value, lang);
  return new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-GB', {
    dateStyle: full ? 'full' : 'short', timeZone: 'UTC',
  }).format(date);
}

/** Date and 12-hour time in Cairo time, Western digits. The one formatter for every timestamp on screen. */
export function dashboardDateTime(value: string | number | Date | null | undefined, lang: DashLang | string): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(date);
}


export function dashboardDateRange(start: string | null | undefined, end: string | null | undefined, lang: DashLang): string {
  const dates = [start, end].map((value) => value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00Z' : value) : null);
  const [first, last] = dates;
  const sameYear = first && last && !Number.isNaN(first.getTime()) && !Number.isNaN(last.getTime()) && first.getUTCFullYear() === last.getUTCFullYear();
  const format = (date: Date | null, year: boolean) => !date || Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' as const } : {}), timeZone: 'UTC' }).format(date);
  return format(first, !sameYear) + ' – ' + format(last, true);
}
