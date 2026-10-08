'use client';

/**
 * HoursEditor — set a week of opening hours in a few clicks instead of 14 typed times.
 *
 * The old grid gave every day its own pair of <input type="time"> fields. Filling a normal
 * week meant typing 14 times through a fiddly control, which took editors several minutes
 * per place. Almost every real place has ONE schedule that repeats, with at most a late
 * weekend and a closed day — so the editor is built around that instead:
 *
 *   1. a preset ("Open 24 hours", "9–5", "10 to midnight") fills the whole week at once
 *   2. or: pick days (with All / Weekdays / Weekend shortcuts), pick times from dropdowns
 *      in 30-minute steps, hit Apply
 *   3. the week below is a read-only summary with a Closed toggle per day
 *
 * The common case — same hours every day — is preset, or three clicks. Times are dropdowns
 * rather than free text because opening times land on the hour or half hour essentially
 * always, and picking from a list is far quicker than typing HH:MM.
 */

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useMemo, useState } from 'react';
import { Check, Clock, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDashboardLang, type DashLang } from '@/lib/dashboard-lang';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseHoursText } from '@/lib/parse-hours';
import type { PlaceHour } from '@/lib/api/hooks/use-place-hours';

/** Egypt's week starts on Saturday; show it that way rather than Sunday-first. */
const DISPLAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
const SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAYS = [0, 1, 2, 3, 4]; // Sun–Thu, the Egyptian working week
const WEEKEND = [5, 6]; // Fri–Sat

/** 00:00 … 23:30 in 30-minute steps. */
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

/** "14:30" → "2:30 PM" — editors read wall-clock time faster than 24-hour. */
function label12h(hhmm: string): string {
  const [hStr, m] = hhmm.split(':');
  const h = Number(hStr);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

interface Preset {
  label: string;
  open: string | null;
  close: string | null;
  closed?: boolean;
  /** Days this preset touches; omitted means the whole week. */
  days?: number[];
}

const PRESETS: Preset[] = [
  { label: 'Open 24 hours', open: '00:00', close: '23:59' },
  { label: '9 AM – 5 PM', open: '09:00', close: '17:00' },
  { label: '10 AM – 10 PM', open: '10:00', close: '22:00' },
  { label: '10 AM – midnight', open: '10:00', close: '00:00' },
  { label: '12 PM – 2 AM', open: '12:00', close: '02:00' },
  { label: 'Closed all week', open: null, close: null, closed: true },
];

function summarize(h: PlaceHour, lang: DashLang): string {
  if (h.isClosed) return 'Closed';
  if (!h.openTime || !h.closeTime) return lang === 'ar' ? 'ساعات العمل: غير محدد' : 'Opening hours: not set';
  if (h.openTime === '00:00' && (h.closeTime === '23:59' || h.closeTime === '00:00')) {
    return 'Open 24 hours';
  }
  return `${label12h(h.openTime)} – ${label12h(h.closeTime)}`;
}

export function HoursEditor({
  hours,
  disabled,
  setDay,
  setDays,
}: {
  hours: PlaceHour[];
  disabled?: boolean;
  setDay: (day: number, patch: Partial<PlaceHour>) => void;
  setDays: (days: number[], patch: Partial<PlaceHour>) => void;
}) {
  const { lang } = useDashboardLang();
  const controlCopy = useDashboardCopy();
  const [selected, setSelected] = useState<number[]>([...WEEKDAYS, ...WEEKEND]);
  const [open, setOpen] = useState('10:00');
  const [close, setClose] = useState('22:00');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState<{ applied: number; unparsed: string[] } | null>(null);

  const allDays = useMemo(() => [...WEEKDAYS, ...WEEKEND], []);
  const isAll = selected.length === 7;

  const toggleDay = (day: number) =>
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const applyPreset = (p: Preset) => {
    const days = p.days ?? allDays;
    setDays(days, {
      openTime: p.open,
      closeTime: p.close,
      isClosed: Boolean(p.closed),
    });
  };

  // Paste the hours block straight off Google Maps (or a website) instead of clicking. We
  // parse text the admin copied themselves — see lib/parse-hours.ts for why this is not a
  // Maps scraper.
  const applyPaste = () => {
    const { days, unparsed } = parseHoursText(pasteText);
    for (const d of days) {
      setDay(d.dayOfWeek, {
        openTime: d.openTime,
        closeTime: d.closeTime,
        isClosed: d.isClosed,
      });
    }
    setPasteResult({ applied: days.length, unparsed });
  };

  const applySelection = () => {
    setDays(selected, { openTime: open, closeTime: close, isClosed: false });
  };

  return (
    <div className="space-y-5" data-trace-id="place-hours-editor">
      {/* ── Presets: the whole week in one click ─────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <DashboardText>Quick presets — applies to every day</DashboardText>
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => applyPreset(p)}
              data-trace-id={`place-hours-preset-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Paste from Google Maps / a website ───────────────────────────────────────── */}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setPasteOpen((v) => !v)}
          data-trace-id="place-hours-paste-toggle"
        >
          <ClipboardPaste className="h-4 w-4" />
          <DashboardText>Paste hours from Google Maps</DashboardText>
        </Button>

        {pasteOpen && (
          <div className="mt-2 space-y-2 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
              <DashboardText>On Google Maps, expand the opening hours, select the whole block and copy it. Paste it here — English or Arabic, 12- or 24-hour, &ldquo;Closed&rdquo; and &ldquo;Open 24 hours&rdquo; all work.</DashboardText>
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={7}
              dir="auto"
              placeholder={controlCopy('Monday  9 AM–10 PM\nTuesday  9 AM–10 PM\nWednesday  Closed')}
              disabled={disabled}
              data-trace-id="place-hours-paste-input"
              className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={disabled || !pasteText.trim()}
                onClick={applyPaste}
                data-trace-id="place-hours-paste-apply"
                variant="outline"
              >
                <DashboardText>Fill hours from this</DashboardText>
              </Button>
              {pasteResult && (
                <span className="text-xs text-muted-foreground">
                  {lang === 'ar' ? `تم ملء ${pasteResult.applied} يوم.` : `Filled ${pasteResult.applied} day${pasteResult.applied === 1 ? '' : 's'}.`}
                  {pasteResult.unparsed.length > 0 &&
                    `${lang === 'ar' ? ' تعذرت قراءة: ' : " Couldn't read: "}${pasteResult.unparsed.slice(0, 3).join(' · ')}`}
                </span>
              )}
            </div>
            {pasteResult && pasteResult.applied > 0 && (
              <p className="text-xs text-muted-foreground">
                <DashboardText>Check the week below before saving — pasted text is a starting point, not a source of truth.</DashboardText>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Custom: pick days, pick times, apply ─────────────────────────────────────── */}
      <div className="rounded-md border p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <DashboardText>Or set specific days</DashboardText>
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {DISPLAY_ORDER.map((d) => (
            <Button variant="ghost"
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(d)}
              aria-pressed={selected.includes(d)}
              data-trace-id={`place-hours-pick-day-${d}`}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                selected.includes(d)
                  ? 'border-[var(--brand-700)] bg-muted text-foreground'
                  : 'border-border hover:bg-muted',
              )}
            >
              {lang === 'ar' ? <DashboardText>{FULL_LABELS[d]}</DashboardText> : SHORT_LABELS[d]}
            </Button>
          ))}
          <span className="mx-1 text-muted-foreground">|</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={disabled}
            onClick={() => setSelected(isAll ? [] : allDays)}>
            {isAll ? 'None' : 'All'}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={disabled}
            onClick={() => setSelected(WEEKDAYS)}>
            <DashboardText>Sun–Thu</DashboardText>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={disabled}
            onClick={() => setSelected(WEEKEND)}>
            <DashboardText>Fri–Sat</DashboardText>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Select value={open} disabled={disabled} onValueChange={(value) => { if (value) setOpen(value); }}>
            <SelectTrigger aria-label={lang === 'ar' ? 'وقت الفتح' : 'Opening time'} data-trace-id="place-hours-bulk-open" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{TIME_OPTIONS.map((timeOption) => <SelectItem key={timeOption} value={timeOption}>{label12h(timeOption)}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground"><DashboardText>to</DashboardText></span>
          <Select value={close} disabled={disabled} onValueChange={(value) => { if (value) setClose(value); }}>
            <SelectTrigger aria-label={lang === 'ar' ? 'وقت الإغلاق' : 'Closing time'} data-trace-id="place-hours-bulk-close" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{TIME_OPTIONS.map((timeOption) => <SelectItem key={timeOption} value={timeOption}>{label12h(timeOption)}</SelectItem>)}</SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            disabled={disabled || selected.length === 0}
            onClick={applySelection}
            data-trace-id="place-hours-apply"
            variant="outline"
          >
            <Check className="h-4 w-4" />
            {lang === 'ar' ? `تطبيق على ${selected.length === 7 ? 'كل الأيام' : `${selected.length} يوم`}` : `Apply to ${selected.length === 7 ? 'all days' : `${selected.length} day${selected.length === 1 ? '' : 's'}`}`}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || selected.length === 0}
            onClick={() => setDays(selected, { isClosed: true, openTime: null, closeTime: null })}
            data-trace-id="place-hours-mark-closed"
          >
            <DashboardText>Mark closed</DashboardText>
          </Button>
        </div>
      </div>

      {/* ── The resulting week, as plain text ────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <DashboardText>This week</DashboardText>
        </p>
        <div className="divide-y rounded-md border" data-trace-id="place-hours-grid">
          {DISPLAY_ORDER.map((d) => {
            const h = hours[d];
            if (!h) return null;
            return (
              <div
                key={d}
                className="flex min-h-14 flex-wrap items-center gap-3 px-3 py-2 hover:bg-muted/50 focus-within:bg-muted/50"
                data-trace-id={`place-hours-day-${d}`}
              >
                <span className="w-24 shrink-0 text-sm font-medium"><DashboardText>{FULL_LABELS[d]}</DashboardText></span>
                <span
                  className={cn(
                    'flex-1 text-sm',
                    h.isClosed
                      ? 'text-muted-foreground'
                      : !h.openTime || !h.closeTime
                        ? 'text-[var(--warning)]'
                        : 'text-foreground',
                  )}
                >
                  {summarize(h, lang)}
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={h.isClosed}
                    disabled={disabled}
                    onChange={(e) =>
                      setDay(d, {
                        isClosed: e.target.checked,
                        ...(e.target.checked ? { openTime: null, closeTime: null } : {}),
                      })
                    }
                    data-trace-id={`place-hours-closed-${d}`}
                  />
                  <DashboardText>Closed</DashboardText>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
