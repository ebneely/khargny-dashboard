/**
 * The dashboard's System section (scale/13-observability.md): the payload shape the backend
 * sends, and the pure rules the section draws with. Typed from the backend's own
 * `src/system/system.logic.ts` so a change there is a type error here, not a silent gap.
 */

export type CheckStatus = 'ok' | 'warn' | 'down' | 'off';

export interface StatusCheck {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  value: string;
  detail: string;
  since: string | null;
  todo: string | null;
}

export interface SystemCounts {
  ok: number;
  warn: number;
  down: number;
  off: number;
}

export interface SystemStatus {
  generatedAt: string;
  counts: SystemCounts;
  checks: StatusCheck[];
}

/** The four states in the order the owner reads them: working, needs a look, stopped, switched off. */
export const STATUS_ORDER: readonly CheckStatus[] = ['ok', 'warn', 'down', 'off'];

/**
 * The groups in the spec's order. A group the server adds later still appears, after these,
 * in the order it first arrives.
 */
export const GROUP_ORDER: readonly string[] = [
  'Deploys', 'Dependencies', 'Jobs', 'Queues', 'SEO', 'Traffic', 'Website', 'Cache',
];

export interface StatusPresentation {
  /** Which icon the row and the legend draw; the shape, not the colour, carries the state. */
  icon: 'check' | 'alert' | 'cross' | 'slash';
  /** English copy key for the word beside the icon. */
  label: string;
}

export const STATUS_PRESENTATION: Record<CheckStatus, StatusPresentation> = {
  ok: { icon: 'check', label: 'Fine' },
  warn: { icon: 'alert', label: 'Check' },
  down: { icon: 'cross', label: 'Down' },
  off: { icon: 'slash', label: 'Off' },
};

/** A status this build does not know is treated as one to look at, never as fine. */
export function statusPresentation(status: string | null | undefined): StatusPresentation {
  return STATUS_PRESENTATION[status as CheckStatus] ?? STATUS_PRESENTATION.warn;
}

export function isCheckStatus(value: unknown): value is CheckStatus {
  return typeof value === 'string' && (STATUS_ORDER as readonly string[]).includes(value);
}

/** Counts read off the checks themselves. Unknown statuses are skipped, never counted as fine. */
export function countChecks(checks: readonly StatusCheck[] | null | undefined): SystemCounts {
  const counts: SystemCounts = { ok: 0, warn: 0, down: 0, off: 0 };
  for (const check of checks ?? []) {
    if (check && isCheckStatus(check.status)) counts[check.status] += 1;
  }
  return counts;
}

/**
 * The counts the header shows. The server's own totals win; without them the checks are counted
 * here. Nothing to count is `null` (shown as "—"), never a row of zeros that claims a clean bill.
 */
export function systemCounts(status: SystemStatus | null | undefined): SystemCounts | null {
  if (!status) return null;
  const server = status.counts;
  if (server && STATUS_ORDER.every((key) => typeof server[key] === 'number')) {
    return { ok: server.ok, warn: server.warn, down: server.down, off: server.off };
  }
  const checks = Array.isArray(status.checks) ? status.checks : null;
  if (!checks || checks.length === 0) return null;
  return countChecks(checks);
}

export interface CheckGroup {
  group: string;
  checks: StatusCheck[];
}

/** Rows grouped for reading, in the spec's group order, keeping each group's own row order. */
export function groupChecks(checks: readonly StatusCheck[] | null | undefined): CheckGroup[] {
  const byGroup = new Map<string, StatusCheck[]>();
  for (const check of checks ?? []) {
    if (!check || typeof check.group !== 'string' || !check.group) continue;
    const rows = byGroup.get(check.group);
    if (rows) rows.push(check);
    else byGroup.set(check.group, [check]);
  }
  const known = GROUP_ORDER.filter((group) => byGroup.has(group));
  const extra = [...byGroup.keys()].filter((group) => !GROUP_ORDER.includes(group));
  return [...known, ...extra].map((group) => ({ group, checks: byGroup.get(group) ?? [] }));
}

export type AgeUnit = 'now' | 'minute' | 'hour' | 'day';

export interface RelativeAge {
  unit: AgeUnit;
  amount: number;
}

/**
 * How long ago a timestamp was, in the one unit a person would say it in. A clock that is a
 * little ahead of the server reads as "just now" instead of a negative age.
 */
export function relativeAge(iso: string | null | undefined, now: number): RelativeAge | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at) || !Number.isFinite(now)) return null;
  const seconds = Math.round((now - at) / 1000);
  if (seconds < 45) return { unit: 'now', amount: 0 };
  if (seconds < 3600) return { unit: 'minute', amount: Math.max(1, Math.floor(seconds / 60)) };
  if (seconds < 86400) return { unit: 'hour', amount: Math.floor(seconds / 3600) };
  return { unit: 'day', amount: Math.floor(seconds / 86400) };
}

/** The copy key for an age: "just now", "minute ago", "hours ago"… English is the dictionary key. */
export function ageCopyKey(age: RelativeAge): string {
  if (age.unit === 'now') return 'just now';
  return `${age.unit}${age.amount === 1 ? '' : 's'} ago`;
}
