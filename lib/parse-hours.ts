/**
 * Parse a pasted opening-hours block (from Google Maps, a website, a WhatsApp message)
 * into our 7-day structure.
 *
 * Deliberately NOT a Google Maps scraper. Reading hours out of the Maps page means parsing
 * an undocumented JSON blob from Google's HTML: it breaks their terms for automated access,
 * hits consent walls and datacenter-IP blocks, and changes shape without notice — so it
 * would fail silently and publish wrong hours. Here the admin copies the text themselves and
 * this only parses what they pasted, which is both legitimate and stable.
 *
 * Handles the shapes that actually turn up:
 *   Monday      9 AM–10 PM          Friday   Closed
 *   Tuesday, 9:30 AM to 11:00 PM    Saturday Open 24 hours
 *   الاثنين     ٩ ص–١٠ م             الجمعة   مغلق
 * plus 24-hour times (09:00-22:00), en/em dashes, and Arabic-Indic digits.
 */

export interface ParsedDay {
  dayOfWeek: number; // 0=Sunday … 6=Saturday
  openTime: string | null; // 'HH:mm'
  closeTime: string | null;
  isClosed: boolean;
}

export interface ParseResult {
  days: ParsedDay[];
  /** Lines that looked like content but could not be understood — shown to the admin. */
  unparsed: string[];
}

const DAY_PATTERNS: { day: number; patterns: string[] }[] = [
  { day: 0, patterns: ['sunday', 'sun', 'الأحد', 'الاحد', 'احد'] },
  { day: 1, patterns: ['monday', 'mon', 'الإثنين', 'الاثنين', 'اثنين'] },
  { day: 2, patterns: ['tuesday', 'tue', 'الثلاثاء', 'ثلاثاء'] },
  { day: 3, patterns: ['wednesday', 'wed', 'الأربعاء', 'الاربعاء', 'اربعاء'] },
  { day: 4, patterns: ['thursday', 'thu', 'الخميس', 'خميس'] },
  { day: 5, patterns: ['friday', 'fri', 'الجمعة', 'جمعة'] },
  { day: 6, patterns: ['saturday', 'sat', 'السبت', 'سبت'] },
];

/** ٠١٢٣٤٥٦٧٨٩ and ۰۱۲۳۴۵۶۷۸۹ → 0123456789 */
function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

function normalize(line: string): string {
  return normalizeDigits(line)
    .replace(/[‐-―−]/g, '-') // every dash variant → '-'
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dayFromLine(line: string): number | null {
  const lower = line.toLowerCase();
  for (const { day, patterns } of DAY_PATTERNS) {
    for (const p of patterns) {
      // Match at a word boundary so "sun" doesn't hit inside "sunset".
      const re = new RegExp(`(^|[^a-z\\u0600-\\u06ff])${p}([^a-z\\u0600-\\u06ff]|$)`, 'i');
      if (re.test(lower)) return day;
    }
  }
  return null;
}

/** "9 AM" | "9:30 PM" | "21:30" | "٩ ص" → "HH:mm" */
function parseTime(raw: string): string | null {
  const t = raw.trim().toLowerCase();

  // Arabic meridiem: ص = AM, م = PM
  const isArAm = /ص/.test(t);
  const isArPm = /م/.test(t);

  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) return null;

  const meridiem = m[3] || (isArAm ? 'am' : isArPm ? 'pm' : null);
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// No \b around the Arabic alternatives: JS word boundaries are defined against [A-Za-z0-9_],
// so \bمغلق\b never matches and every Arabic "closed" line fell through to the time parser.
const CLOSED_RE = /(\bclosed\b|مغلق|مغلقة|اجازة|إجازة|مقفول)/i;
const ALLDAY_RE = /(open 24 ?hours|24 ?hours|24\/7|طوال اليوم|24 ساعة|مفتوح 24)/i;

export function parseHoursText(input: string): ParseResult {
  const days: ParsedDay[] = [];
  const unparsed: string[] = [];
  const seen = new Set<number>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = normalize(rawLine);
    if (!line) continue;

    const day = dayFromLine(line);
    if (day === null) {
      // Ignore obvious noise (headers like "Hours", "Opening hours") rather than
      // reporting it as a failure the admin has to think about.
      if (!/^(hours|opening hours|ساعات العمل|مواعيد العمل)$/i.test(line)) {
        unparsed.push(rawLine.trim());
      }
      continue;
    }
    if (seen.has(day)) continue; // first entry wins; Google repeats days in some layouts
    seen.add(day);

    if (CLOSED_RE.test(line)) {
      days.push({ dayOfWeek: day, openTime: null, closeTime: null, isClosed: true });
      continue;
    }

    if (ALLDAY_RE.test(line)) {
      days.push({ dayOfWeek: day, openTime: '00:00', closeTime: '23:59', isClosed: false });
      continue;
    }

    // Strip the day name, then split the remainder on '-' or 'to'/'إلى'/'حتى'.
    const rest = line.replace(/^[^\d]*?(?=\d)/, '');
    const parts = rest.split(/\s*(?:-|to|إلى|الى|حتى)\s*/i).filter(Boolean);
    if (parts.length < 2) {
      unparsed.push(rawLine.trim());
      continue;
    }

    const open = parseTime(parts[0]);
    const close = parseTime(parts[1]);
    if (!open || !close) {
      unparsed.push(rawLine.trim());
      continue;
    }

    days.push({ dayOfWeek: day, openTime: open, closeTime: close, isClosed: false });
  }

  return { days, unparsed };
}
