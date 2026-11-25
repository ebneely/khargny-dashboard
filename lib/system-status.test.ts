import { describe, expect, it } from 'vitest';
import {
  ageCopyKey,
  countChecks,
  groupChecks,
  relativeAge,
  STATUS_ORDER,
  statusPresentation,
  systemCounts,
  type StatusCheck,
  type SystemStatus,
} from './system-status';

const row = (id: string, group: string, status: StatusCheck['status'] = 'ok'): StatusCheck => ({
  id, group, status, label: id, value: '1 ms', detail: '', since: null, todo: null,
});

const status = (checks: StatusCheck[], counts?: SystemStatus['counts']): SystemStatus => ({
  generatedAt: '2026-11-25T10:00:00.000Z',
  counts: counts as SystemStatus['counts'],
  checks,
});

describe('system status grouping', () => {
  it('should follow the spec group order even when rows arrive mixed', () => {
    const grouped = groupChecks([
      row('cache.detail', 'Cache'),
      row('web-home', 'Website'),
      row('deploy.backend', 'Deploys'),
      row('job.seo', 'Jobs'),
    ]);
    expect(grouped.map((entry) => entry.group)).toEqual(['Deploys', 'Jobs', 'Website', 'Cache']);
  });

  it('should keep each group’s own row order', () => {
    const grouped = groupChecks([row('a', 'Queues'), row('b', 'Deploys'), row('c', 'Queues')]);
    expect(grouped[1]).toEqual({ group: 'Queues', checks: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'c' })] });
  });

  it('should show a group the spec does not name after the known ones', () => {
    const grouped = groupChecks([row('x', 'Billing'), row('y', 'Cache'), row('z', 'Another')]);
    expect(grouped.map((entry) => entry.group)).toEqual(['Cache', 'Billing', 'Another']);
  });

  it('should drop nothing but not invent empty groups', () => {
    expect(groupChecks([row('a', 'Deploys')]).map((entry) => entry.group)).toEqual(['Deploys']);
    expect(groupChecks([])).toEqual([]);
    expect(groupChecks(null)).toEqual([]);
  });
});

describe('system status counts', () => {
  it('should use the server’s totals when it sends all four', () => {
    const counts = systemCounts(status([row('a', 'Deploys')], { ok: 31, warn: 4, down: 1, off: 6 }));
    expect(counts).toEqual({ ok: 31, warn: 4, down: 1, off: 6 });
  });

  it('should count the rows itself when totals are missing', () => {
    const counts = systemCounts(status([row('a', 'Deploys'), row('b', 'Jobs', 'warn'), row('c', 'Jobs', 'down'), row('d', 'Cache', 'off')]));
    expect(counts).toEqual({ ok: 1, warn: 1, down: 1, off: 1 });
  });

  it('should count the rows when the server’s totals are partial', () => {
    const counts = systemCounts(status([row('a', 'Deploys'), row('b', 'Jobs', 'down')], { ok: 1 } as SystemStatus['counts']));
    expect(counts).toEqual({ ok: 1, warn: 0, down: 1, off: 0 });
  });

  it('should say unknown (null) rather than zero when there is nothing to count', () => {
    expect(systemCounts(null)).toBeNull();
    expect(systemCounts(undefined)).toBeNull();
    expect(systemCounts(status([]))).toBeNull();
  });

  it('should never count an unknown status as fine', () => {
    expect(countChecks([row('a', 'Deploys', 'mystery' as StatusCheck['status'])])).toEqual({ ok: 0, warn: 0, down: 0, off: 0 });
  });
});

describe('system status rendering rules', () => {
  it('should give every status its own icon shape and word', () => {
    const words = STATUS_ORDER.map((value) => statusPresentation(value));
    expect(words.map((entry) => entry.icon)).toEqual(['check', 'alert', 'cross', 'slash']);
    expect(words.map((entry) => entry.label)).toEqual(['Fine', 'Check', 'Down', 'Off']);
    expect(new Set(words.map((entry) => entry.icon)).size).toBe(4);
  });

  it('should treat a status this build does not know as one to look at', () => {
    expect(statusPresentation('mystery')).toEqual(statusPresentation('warn'));
    expect(statusPresentation(null)).toEqual(statusPresentation('warn'));
  });
});

describe('relative time', () => {
  const at = '2026-11-25T10:00:00.000Z';
  const now = Date.parse(at);
  const later = (seconds: number) => now + seconds * 1000;

  it('should read a fresh or slightly future stamp as just now', () => {
    expect(relativeAge(at, later(0))).toEqual({ unit: 'now', amount: 0 });
    expect(relativeAge(at, later(44))).toEqual({ unit: 'now', amount: 0 });
    expect(relativeAge(at, later(-60))).toEqual({ unit: 'now', amount: 0 });
  });

  it('should move from minutes to hours to days at the real boundaries', () => {
    expect(relativeAge(at, later(45))).toEqual({ unit: 'minute', amount: 1 });
    expect(relativeAge(at, later(90))).toEqual({ unit: 'minute', amount: 1 });
    expect(relativeAge(at, later(30 * 60))).toEqual({ unit: 'minute', amount: 30 });
    expect(relativeAge(at, later(3599))).toEqual({ unit: 'minute', amount: 59 });
    expect(relativeAge(at, later(3600))).toEqual({ unit: 'hour', amount: 1 });
    expect(relativeAge(at, later(23 * 3600))).toEqual({ unit: 'hour', amount: 23 });
    expect(relativeAge(at, later(86400))).toEqual({ unit: 'day', amount: 1 });
    expect(relativeAge(at, later(3 * 86400))).toEqual({ unit: 'day', amount: 3 });
  });

  it('should be empty without a usable stamp', () => {
    expect(relativeAge(null, now)).toBeNull();
    expect(relativeAge('', now)).toBeNull();
    expect(relativeAge('not a date', now)).toBeNull();
  });

  it('should name a singular amount without an s', () => {
    expect(ageCopyKey({ unit: 'now', amount: 0 })).toBe('just now');
    expect(ageCopyKey({ unit: 'minute', amount: 1 })).toBe('minute ago');
    expect(ageCopyKey({ unit: 'minute', amount: 2 })).toBe('minutes ago');
    expect(ageCopyKey({ unit: 'hour', amount: 1 })).toBe('hour ago');
    expect(ageCopyKey({ unit: 'day', amount: 5 })).toBe('days ago');
  });
});
