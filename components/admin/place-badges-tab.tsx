'use client';

import * as React from 'react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminApiError } from '@/lib/api/admin-client';
import { badgesApi } from '@/lib/api/badges';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { badgeExplanation, statusBadgeRules } from '@/lib/badge-rules';
import { useDashboardCopy } from './dashboard-text';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { DateCell } from './date-cell';
import { LoadingState, RequestError, StatusBadge, useSubscriberText } from './subscriber-ui';

export function PlaceBadgesTab({ placeId }: { placeId: string }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const load = React.useCallback(async () => {
    const [catalogue, detail] = await Promise.all([badgesApi.catalogue(), badgesApi.placeStatus(placeId)]);
    return { catalogue, statuses: detail.badgeStatus };
  }, [placeId]);
  const resource = useSubscriberResource(load);
  return <Card><CardHeader><CardTitle>{copy('Badges')}</CardTitle></CardHeader><CardContent className="min-w-0 space-y-4">{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy(resource.error instanceof AdminApiError && resource.error.status === 404 ? 'Badges are not available on this server yet' : 'Could not load badges. Try again.')} retry={() => { void resource.refetch(); }} /> : !resource.data?.statuses ? <RequestError message={copy('Badge explanations are unavailable on this server.')} /> : <RecordList scope={`place-badges-${placeId}`} records={[...resource.data.catalogue.data].sort((first, second) => Number(second.enabled) - Number(first.enabled) || first.sortOrder - second.sortOrder)} searchText={(badge) => `${badge.nameAr} ${badge.nameEn} ${badge.descriptionAr} ${badge.descriptionEn}`} filters={[{ key: 'family', label: 'All badge families', options: [{ value: 'status', label: 'Status badges' }, { value: 'achievement', label: 'Achievement badges' }], value: (badge) => badge.family }, { key: 'held', label: 'All badge states', options: [{ value: 'held', label: 'Held' }, { value: 'not-held', label: 'Not held' }, { value: 'hidden', label: 'Hidden everywhere' }], value: (badge) => !badge.enabled ? 'hidden' : resource.data?.statuses?.some((status) => status.key === badge.key && status.held) ? 'held' : 'not-held' }]} render={(visible) => <div className="divide-y">{visible.map((badge) => {
    const status = resource.data?.statuses?.find((row) => row.key === badge.key);
    return <div key={badge.key} className="min-w-0 space-y-3 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><RecordCell icon="badge" badgeIcon={badge.icon} nameAr={badge.nameAr} nameEn={badge.nameEn} /></div><StatusBadge status={badge.enabled && status?.held ? 'active' : 'inactive'}>{copy(!badge.enabled ? 'Hidden everywhere' : status?.held ? 'Held' : 'Not held')}</StatusBadge></div>
      <p className="break-words text-sm text-muted-foreground">{status ? badge.family === 'status' && badge.enabled ? copy(statusBadgeRules[badge.key as keyof typeof statusBadgeRules]) : badgeExplanation(status, badge.rule, lang) : copy('Badge explanations are unavailable on this server.')}</p>
      {status?.override && !status.override.expired && <p className="text-sm text-muted-foreground">{copy('Until')}: {status.override.until ? <DateCell value={status.override.until} /> : copy('No end')} · <Link className="underline" href="/dashboard/badges?tab=overrides">{copy('Overrides')}</Link></p>}
    </div>;
  })}</div>} />}</CardContent></Card>;
}
