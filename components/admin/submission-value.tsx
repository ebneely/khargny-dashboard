'use client';

import * as React from 'react';
import { MapPin, Phone } from 'lucide-react';
import { useDashboardCopy } from './dashboard-text';
import { useSubscriberText } from './subscriber-ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** '22:00:00' -> '10 pm', '09:30' -> '9:30 am' (12-hour time, Western digits). */
export function t12(value: unknown, lang: 'en' | 'ar' = 'en') {
  const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hour)) return String(value);
  return `${((hour + 11) % 12) + 1}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${lang === 'ar' ? (hour < 12 ? 'ص' : 'م') : hour < 12 ? 'am' : 'pm'}`;
}

type Day = { dayOfWeek: number; openTime?: string | null; closeTime?: string | null; isClosed?: boolean | null };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isWeek = (value: unknown): value is Day[] => Array.isArray(value) && value.length > 0 && value.every((day) => isRecord(day) && 'dayOfWeek' in day);
const words = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase());

/**
 * A correction's value as a person reads it: hours as a week in 12-hour time, a phone as a
 * call link, a pin as a map link, a name with its English name; anything else as labelled lines.
 * Never raw JSON.
 */
export function SubmissionValue({ value }: { value: unknown }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') return <>{copy(value ? 'Yes' : 'No')}</>;
  if (typeof value === 'string' || typeof value === 'number') return <span dir="auto">{String(value)}</span>;
  if (isWeek(value)) return <ul className="space-y-0.5">{[...value].sort((first, second) => first.dayOfWeek - second.dayOfWeek).map((day) => <li key={day.dayOfWeek} className="flex gap-3"><span className="w-24 shrink-0 text-muted-foreground">{copy(WEEKDAYS[day.dayOfWeek] ?? '')}</span><span dir="auto" className="tabular-nums">{day.isClosed || !day.openTime ? copy('Closed') : `${t12(day.openTime, lang)} – ${t12(day.closeTime, lang)}`}</span></li>)}</ul>;
  if (Array.isArray(value)) return <ul className="space-y-0.5">{value.map((item, index) => <li key={index}><SubmissionValue value={item} /></li>)}</ul>;
  if (!isRecord(value)) return <>{String(value)}</>;
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    const at = `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`;
    return <a className="inline-flex items-center gap-1.5 underline underline-offset-4" href={`https://www.google.com/maps?q=${value.lat},${value.lng}`} target="_blank" rel="noreferrer"><MapPin className="size-3.5" aria-hidden="true" /><span dir="ltr" className="tabular-nums">{at}</span>{copy('Open the map')}</a>;
  }
  if (typeof value.phone === 'string' && Object.keys(value).length === 1) return <a className="inline-flex items-center gap-1.5 underline underline-offset-4" href={`tel:${value.phone.replace(/\s+/g, '')}`}><Phone className="size-3.5" aria-hidden="true" /><span dir="ltr">{value.phone}</span></a>;
  if ('name' in value && Object.keys(value).every((key) => key === 'name' || key === 'nameEn')) return <span dir="auto">{String(value.name ?? '')}{value.nameEn ? <span className="text-muted-foreground"> ({String(value.nameEn)})</span> : null}</span>;
  if ('hours' in value && Object.keys(value).length === 1) return <SubmissionValue value={value.hours} />;
  // The apps send free text as { text } (hours, prices, phone typed by hand).
  if (typeof value.text === 'string' && Object.keys(value).length === 1) return !value.text.trim() ? <span className="text-muted-foreground">—</span> : <span dir="auto" className="whitespace-pre-line">{value.text}</span>;
  const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '');
  if (!entries.length) return <span className="text-muted-foreground">—</span>;
  return <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">{entries.map(([key, item]) => <React.Fragment key={key}><dt className="text-muted-foreground">{copy(words(key))}</dt><dd className="min-w-0 break-words"><SubmissionValue value={item} /></dd></React.Fragment>)}</dl>;
}
