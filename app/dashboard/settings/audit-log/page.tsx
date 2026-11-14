'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useListAddress } from '@/components/admin/record-list';
import { Pager } from '@/components/admin/pager';
import { LoadingState, RequestError } from '@/components/admin/subscriber-ui';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { dashboardDateTime } from '@/lib/dashboard-date';

interface AuditEntry { id: string; action: string; entityType: string; entityId: string | null; apiKeyId: string | null; createdAt: string; admin: { id: string; email: string } | null }
interface AuditPage { data: AuditEntry[]; meta: { total: number } }

// Records that have their own dashboard page; every other type shows its id only.
const RECORD_PAGES: Record<string, string> = { places: '/dashboard/places/', tags: '/dashboard/tags/', cities: '/dashboard/cities/', subscriber: '/dashboard/subscribers/' };
const words = (value: string) => value.replace(/[_.:-]+/g, ' ');

export default function AuditLogPage() {
  return <React.Suspense fallback={<LoadingState />}><AuditLog /></React.Suspense>;
}

function AuditLog() {
  const copy = useDashboardCopy();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const address = useListAddress('audit');
  const { skip, limit } = address;
  const load = React.useCallback(() => adminApi.get<AuditPage>('/v1/admin/audit-logs', { skip, limit }), [skip, limit]);
  const resource = useSubscriberResource(load);
  const rows = resource.data?.data ?? [];
  const forbidden = (resource.error as { status?: number } | null)?.status === 403;
  return <div className="flex flex-col gap-6">
    <div>
      <Link href="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground"><DashboardText>← Settings</DashboardText></Link>
      <h1 className="mt-3 font-display text-2xl font-semibold"><DashboardText>Audit log</DashboardText></h1>
      <p className="mt-2 text-sm text-muted-foreground"><DashboardText>Every change the team made, newest first. Times are Cairo time.</DashboardText></p>
    </div>
    <Card><CardContent>
      {resource.loading && !resource.data ? <LoadingState /> : resource.error ? <RequestError message={copy(forbidden ? 'Only a super admin can read the audit log.' : 'Could not load the audit log.')} retry={forbidden ? undefined : () => { void resource.refetch(); }} /> : <>
        {!rows.length && <p className="py-4 text-sm text-muted-foreground"><DashboardText>No changes recorded yet.</DashboardText></p>}
        <ul className="divide-y">{rows.map(entry => {
          const page = entry.entityId ? RECORD_PAGES[entry.entityType] : undefined;
          return <li key={entry.id} className="flex min-h-14 flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium"><span dir="ltr">{entry.admin?.email ?? copy('Deleted admin')}</span>{entry.apiKeyId && <span className="text-muted-foreground"> ({copy('through an API key')})</span>}</p>
              <p className="text-sm text-muted-foreground">{words(entry.action)}, {words(entry.entityType)}{entry.entityId && <> {page ? <Link className="underline underline-offset-4" href={page + entry.entityId}>{copy('Open record')}</Link> : <span dir="ltr" className="font-mono text-xs">{entry.entityId.slice(0, 8)}</span>}</>}</p>
            </div>
            <time dateTime={entry.createdAt} className="shrink-0 text-sm tabular-nums text-muted-foreground">{dashboardDateTime(entry.createdAt, lang)}</time>
          </li>;
        })}</ul>
        <Pager skip={skip} pageSize={limit} total={resource.data?.meta.total ?? 0} count={rows.length} busy={resource.loading} pageSizes={[10, 20, 50]} onPageSizeChange={size => address.change('limit', String(size))} onPrevious={() => address.change('skip', String(Math.max(0, skip - limit)))} onNext={() => address.change('skip', String(skip + limit))} />
      </>}
    </CardContent></Card>
  </div>;
}
