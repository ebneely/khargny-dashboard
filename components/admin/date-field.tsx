'use client';

import * as React from 'react';
import { Popover } from '@base-ui/react/popover';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { cairoDate } from '@/lib/api/subscribers';
import { calendarStamp, daysInCalendarMonth, isCalendarDate, shiftCalendarDays, shiftCalendarMonth } from '@/lib/subscription-calendar';
import { useDashboardCopy } from './dashboard-text';
import { cn } from '@/lib/utils';

type DateFieldProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & { value: string; onChange: (value: string) => void; min?: string; max?: string };

export function DateField({ value, onChange, min = '1000-01-01', max = '9999-12-31', disabled, ...props }: DateFieldProps) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const copy = useDashboardCopy();
  const today = cairoDate();
  const bounded = (date: string) => date < min ? min : date > max ? max : date;
  const initial = bounded(isCalendarDate(value) ? value : today);
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(initial);
  const [month, setMonth] = React.useState(initial.slice(0, 7));
  const [typed, setTyped] = React.useState<string | null>(null);
  const [observed, setObserved] = React.useState(value);
  if (observed !== value) { setObserved(value); setTyped(null); }
  const inputRef = React.useRef<HTMLInputElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const format = (date: string) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(calendarStamp(date));
  const fullDate = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(calendarStamp(date));
  const [year, monthNumber] = month.split('-').map(Number);
  const first = `${month}-01`;
  const offset = new Date(calendarStamp(first)).getUTCDay();
  const days = daysInCalendarMonth(year, monthNumber);
  const select = (date: string) => { onChange(date); setTyped(null); setOpen(false); };
  const moveCursor = (date: string) => {
    const next = bounded(date);
    setCursor(next); setMonth(next.slice(0, 7));
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  };
  const onDayKey = (event: React.KeyboardEvent, date: string) => {
    const day = new Date(calendarStamp(date)).getUTCDay();
    const delta = event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : event.key === 'ArrowRight' ? (lang === 'ar' ? -1 : 1) : event.key === 'ArrowLeft' ? (lang === 'ar' ? 1 : -1) : event.key === 'Home' ? -day : event.key === 'End' ? 6 - day : null;
    if (delta !== null || event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      try { moveCursor(delta !== null ? shiftCalendarDays(date, delta) : shiftCalendarMonth(date, event.key === 'PageUp' ? -1 : 1)); } catch { return; }
    }
  };
  const changeText = (raw: string) => {
    const normalized = raw.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/\u200f|\u200e/g, '').trim();
    const parts = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const date = parts ? `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : normalized;
    onChange(isCalendarDate(date) && date >= min && date <= max ? date : '');
    setObserved(isCalendarDate(date) && date >= min && date <= max ? date : '');
    setTyped(raw);
  };
  return <DirectionProvider direction={lang === 'ar' ? 'rtl' : 'ltr'}><Popover.Root open={open} onOpenChange={(next) => { if (next) { const date = bounded(isCalendarDate(value) ? value : today); setCursor(date); setMonth(date.slice(0, 7)); } setOpen(next); }}>
    <div className="relative min-w-0">
      <Input {...props} ref={inputRef} type="text" disabled={disabled} value={typed ?? (isCalendarDate(value) ? format(value) : '')} placeholder={copy('DD/MM/YYYY')} className={cn('pe-10', props.className)} onChange={(event) => changeText(event.target.value)} onBlur={() => { if (isCalendarDate(value)) setTyped(null); }} onClick={() => { if (!disabled) { setCursor(initial); setMonth(initial.slice(0, 7)); setOpen(true); } }} onKeyDown={(event) => { if (event.key === 'ArrowDown' && !disabled) { event.preventDefault(); setCursor(initial); setMonth(initial.slice(0, 7)); setOpen(true); } }} />
      <Popover.Trigger disabled={disabled} render={<Button type="button" variant="ghost" size="icon-sm" />} className="absolute end-1 top-1/2 -translate-y-1/2" aria-label={copy('Open calendar')}><CalendarDays aria-hidden="true" /></Popover.Trigger>
    </div>
    <Popover.Portal><Popover.Positioner anchor={inputRef} align="start" sideOffset={4} className="z-50"><Popover.Popup dir={lang === 'ar' ? 'rtl' : 'ltr'} finalFocus={inputRef} initialFocus={() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`) ?? true} className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={copy('Previous month')} disabled={month <= min.slice(0, 7)} onClick={() => { const date = shiftCalendarMonth(first, -1); setMonth(date.slice(0, 7)); setCursor(bounded(date)); }}>{lang === 'ar' ? <ChevronRight /> : <ChevronLeft />}</Button>
        <Popover.Title className="text-sm font-medium" aria-live="polite">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(calendarStamp(first))}</Popover.Title>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={copy('Next month')} disabled={month >= max.slice(0, 7)} onClick={() => { const date = shiftCalendarMonth(first, 1); setMonth(date.slice(0, 7)); setCursor(bounded(date)); }}>{lang === 'ar' ? <ChevronLeft /> : <ChevronRight />}</Button>
      </div>
      <div ref={gridRef} role="grid" aria-label={copy('Choose date')}>
        <div role="row" className="grid grid-cols-7">{Array.from({ length: 7 }, (_, index) => <span role="columnheader" key={index} className="py-1 text-center text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(calendarStamp('2026-10-04') + index * 86400000)}</span>)}</div>
        {Array.from({ length: Math.ceil((offset + days) / 7) }, (_, week) => <div role="row" className="grid grid-cols-7" key={week}>{Array.from({ length: 7 }, (_, weekday) => {
          const day = week * 7 + weekday - offset + 1;
          if (day < 1 || day > days) return <span role="gridcell" key={weekday} />;
          const date = `${month}-${String(day).padStart(2, '0')}`;
          return <span role="gridcell" key={weekday} aria-selected={value === date}><Button variant="ghost" type="button" data-date={date} disabled={disabled || date < min || date > max} tabIndex={cursor === date ? 0 : -1} aria-label={fullDate(date)} aria-current={today === date ? 'date' : undefined} className={cn('flex h-9 w-full items-center justify-center rounded-full text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40', value === date && 'bg-primary text-primary-foreground hover:bg-primary', today === date && value !== date && 'font-medium ring-1 ring-border')} onKeyDown={(event) => onDayKey(event, date)} onClick={() => select(date)}>{day.toLocaleString(lang)}</Button></span>;
        })}</div>)}
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" disabled={disabled || today < min || today > max} onClick={() => select(today)}>{copy('Today')}</Button>
    </Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root></DirectionProvider>;
}
