export type CalendarLength = { months: number; days?: never } | { days: number; months?: never };

export function daysInCalendarMonth(year: number, month: number): number {
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInCalendarMonth(year, month);
}

export function calendarStamp(value: string): number {
  if (!isCalendarDate(value)) throw new Error('INVALID_CALENDAR_DATE');
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function shiftCalendarDays(value: string, days: number): string {
  const result = new Date(calendarStamp(value) + days * 86400000).toISOString().slice(0, 10);
  if (!isCalendarDate(result)) throw new Error('INVALID_CALENDAR_DATE');
  return result;
}

export function shiftCalendarMonth(value: string, months: number): string {
  calendarStamp(value);
  const [year, month, day] = value.split('-').map(Number);
  const index = year * 12 + month - 1 + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index % 12 + 1;
  const result = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, daysInCalendarMonth(nextYear, nextMonth))).padStart(2, '0')}`;
  if (!isCalendarDate(result)) throw new Error('INVALID_CALENDAR_DATE');
  return result;
}

export function subscriptionEnd(start: string, length: CalendarLength): string {
  calendarStamp(start);
  const amount = length.days ?? length.months;
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('INVALID_CALENDAR_LENGTH');
  if (length.days !== undefined) return shiftCalendarDays(start, length.days - 1);
  const nextMonth = shiftCalendarMonth(`${start.slice(0, 7)}-01`, length.months);
  const day = Number(start.slice(8));
  if (day === 1) return shiftCalendarDays(nextMonth, -1);
  const [year, month] = nextMonth.split('-').map(Number);
  return `${nextMonth.slice(0, 7)}-${String(Math.min(day - 1, daysInCalendarMonth(year, month))).padStart(2, '0')}`;
}

export function calendarDayCount(start: string, end: string): number {
  return Math.round((calendarStamp(end) - calendarStamp(start)) / 86400000) + 1;
}

export function renewalStart(end: string, today: string): string {
  return [shiftCalendarDays(end, 1), today].sort().at(-1)!;
}

export function formatCalendarDate(value: string, lang: 'en' | 'ar', month: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(calendarStamp(value));
}
