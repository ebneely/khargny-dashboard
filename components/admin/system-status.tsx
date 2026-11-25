'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CircleCheck, CircleSlash, CircleX, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from '@/lib/api/admin-client';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { localeFor } from '@/lib/locale';
import { cn } from '@/lib/utils';
import {
  ageCopyKey,
  groupChecks,
  relativeAge,
  STATUS_ORDER,
  statusPresentation,
  systemCounts,
  type CheckStatus,
  type StatusCheck,
  type SystemStatus,
} from '@/lib/system-status';
import { useDashboardCopy } from './dashboard-text';
import { RequestError } from './subscriber-ui';

/** The status → icon mapping. Shape carries the state; the colour only reinforces it. */
const STATUS_ICON = {
  check: CircleCheck,
  alert: TriangleAlert,
  cross: CircleX,
  slash: CircleSlash,
} as const;

const STATUS_TONE: Record<CheckStatus, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  down: 'text-error',
  off: 'text-muted-foreground',
};

/** Icon only: the word beside it (legend) or the screen-reader line in the row names the state. */
function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const Icon = STATUS_ICON[statusPresentation(status).icon];
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', STATUS_TONE[status] ?? STATUS_TONE.warn, className)} />;
}

/**
 * The Health page's System section (scale/13-observability.md): live checks of deploys,
 * dependencies, jobs, queues, SEO, traffic, the website and cache, above the SEO areas.
 *
 * One card: totals and the icon legend at the top, then one labelled group per area. It asks
 * again every 30 s while the tab is visible; a reading in hand stays on screen while it
 * refreshes, so the page never collapses back to a skeleton or shifts.
 */
export function SystemStatusCard() {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const { data: session } = useCurrentSession();
  const load = React.useCallback(() => adminApi.get<SystemStatus>('/v1/admin/system/status'), []);
  const resource = useSubscriberResource(load);
  const { data, refetch } = resource;
  const [now, setNow] = React.useState(() => Date.now());
  const [probing, setProbing] = React.useState(false);

  const n = (value: number) => value.toLocaleString(localeFor(lang));

  const refresh = React.useCallback(() => {
    setNow(Date.now());
    return refetch();
  }, [refetch]);

  // Every 30 s while the tab is visible; hidden, it waits, and it asks once on return.
  React.useEffect(() => {
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => { void refresh(); }, 30_000);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        start();
      } else stop();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  // Only a super admin or an admin may run the probes; a viewer reads the same rows without it.
  const role = session?.user?.role;
  const canRun = !readOnly && (role === 'super_admin' || role === 'admin');

  const run = async () => {
    setProbing(true);
    try {
      await adminApi.post<SystemStatus>('/v1/admin/system/probe');
      const updated = await refresh();
      if (updated) toast.success(copy('Checks finished. The list is up to date.'));
      else toast.error(copy('The checks ran, but the list could not refresh. Try Retry.'));
    } catch {
      toast.error(copy('Could not run the checks. Try again.'));
    } finally {
      setProbing(false);
    }
  };

  const sayAge = (iso: string | null | undefined) => {
    const age = relativeAge(iso, now);
    if (!age) return '—';
    const key = ageCopyKey(age);
    return age.unit === 'now' ? copy(key) : `${n(age.amount)} ${copy(key)}`;
  };

  const counts = systemCounts(data);
  const groups = groupChecks(data?.checks);

  return <Card data-slot="system-status">
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
      <div>
        <CardTitle>{copy('System')}</CardTitle>
        <CardDescription>{copy('Live checks of deploys, dependencies, jobs, queues, SEO, traffic, the website and the cache. They refresh every 30 seconds while this page is open.')}</CardDescription>
      </div>
      {canRun && <Button variant="outline" onClick={() => { void run(); }} disabled={probing} title={probing ? copy('The checks are running.') : undefined}>
        <RefreshCw aria-hidden="true" className={probing ? 'animate-spin motion-reduce:animate-none' : undefined} />
        {copy('Run checks now')}
      </Button>}
    </CardHeader>
    <CardContent className="space-y-5">
      {!data && !resource.error && <SystemStatusSkeleton />}
      {!data && resource.error && <RequestError message={copy('Could not load the system checks.')} retry={() => { void refresh(); }} />}
      {data && <>
        {resource.error && <RequestError message={copy('The last reading is shown; the refresh failed.')} retry={() => { void refresh(); }} />}

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={copy('Status totals')}>
            {STATUS_ORDER.map((status) => {
              const presentation = statusPresentation(status);
              const total = counts?.[status];
              return <li key={status} className="flex items-center gap-1.5 text-sm">
                <StatusIcon status={status} />
                <span className="font-semibold tabular-nums">{typeof total === 'number' ? n(total) : '—'}</span>
                <span className="text-muted-foreground">{copy(presentation.label)}</span>
              </li>;
            })}
          </ul>
          <p className="text-sm text-muted-foreground">{copy('Last updated')}: <time dateTime={data.generatedAt} title={dashboardDateTime(data.generatedAt, lang)}>{sayAge(data.generatedAt)}</time></p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium">{copy('Legend')}</span>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {STATUS_ORDER.map((status) => <li key={status} className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              {copy(statusPresentation(status).label)}
            </li>)}
          </ul>
        </div>

        {groups.length === 0
          ? <p className="text-sm text-muted-foreground">{copy('No system check has reported yet. The list fills as the server answers.')}</p>
          : <div className="space-y-5">{groups.map((group) => <CheckGroupList key={group.group} group={group.group} checks={group.checks} sayAge={sayAge} />)}</div>}
      </>}
    </CardContent>
  </Card>;
}

function CheckGroupList({ group, checks, sayAge }: { group: string; checks: StatusCheck[]; sayAge: (iso: string | null | undefined) => string }) {
  const copy = useDashboardCopy();
  const id = React.useId();
  return <section aria-labelledby={id} data-slot="system-group" data-group={group}>
    <h3 id={id} className="text-sm font-semibold">{copy(group)}</h3>
    <ul className="mt-1 divide-y divide-border">{checks.map((check) => <CheckRow key={check.id} check={check} sayAge={sayAge} />)}</ul>
  </section>;
}

/** One check: status icon, its name, the reading, how long since it last ran. Detail and to-do follow when it is not fine. */
function CheckRow({ check, sayAge }: { check: StatusCheck; sayAge: (iso: string | null | undefined) => string }) {
  const copy = useDashboardCopy();
  const presentation = statusPresentation(check.status);
  const notFine = check.status !== 'ok';
  return <li className="grid min-h-14 grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3 sm:grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,15rem)_7rem]" data-slot="system-check" data-status={check.status}>
    <span className="mt-0.5 flex items-start">
      <StatusIcon status={check.status} />
      <span className="sr-only">{copy('Status')}: {copy(presentation.label)}</span>
    </span>
    <div className="min-w-0 space-y-1 text-sm">
      <p className="font-medium" dir="auto">{copy(check.label)}</p>
      {notFine && check.detail && <p className="text-muted-foreground" dir="auto">{copy(check.detail)}</p>}
      {notFine && check.todo && <p dir="auto"><span className="font-medium">{copy('What to do')}: </span>{copy(check.todo)}</p>}
    </div>
    <p className="col-start-2 min-w-0 break-words text-sm tabular-nums text-muted-foreground sm:col-start-auto sm:text-end" dir="auto">
      <span className="sm:hidden">{copy('Value')}: </span>{check.value || '—'}
    </p>
    <p className="col-start-2 text-sm tabular-nums text-muted-foreground sm:col-start-auto sm:text-end">
      <span className="sm:hidden">{copy('Since')}: </span>{sayAge(check.since)}
    </p>
  </li>;
}

/** Shaped like the section it replaces: the totals line, then rows. */
function SystemStatusSkeleton() {
  const copy = useDashboardCopy();
  return <div role="status" className="space-y-4">
    <span className="sr-only">{copy('Loading…')}</span>
    <div className="flex flex-wrap items-center gap-5">
      {STATUS_ORDER.map((status) => <Skeleton key={status} className="h-5 w-24" />)}
    </div>
    <div className="space-y-2">
      {[0, 1, 2, 3, 4, 5].map((row) => <Skeleton key={row} className="h-12 w-full" />)}
    </div>
  </div>;
}
