'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

import { PageActions } from './page-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { achievementKeys, badgesApi, type BadgeOverride, type ManagedBadge } from '@/lib/api/badges';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardCopy } from './dashboard-text';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { DateCell } from './date-cell';
import { RecordList, useListAddress } from './record-list';
import { LoadingState, RequestError, StatusBadge, useSubscriberText } from './subscriber-ui';

export function BadgeOverrides({ badges, canWrite, revision, onAdd, onRemove }: { badges: ManagedBadge[]; canWrite: boolean; revision: number; onAdd: () => void; onRemove: (override: BadgeOverride) => void }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const address = useListAddress('overrides');
  const badgeName = (key: string) => { const badge = badges.find((entry) => entry.key === key); return badge ? pick(badge.nameAr, badge.nameEn) : key; };
  const load = React.useCallback(async () => (await Promise.all(achievementKeys.map((key) => badgesApi.overrides(key)))).flat(), []);
  const resource = useSubscriberResource(load, revision);
  const rows = resource.data ?? [];
  return <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{copy('Overrides')}</CardTitle><PageActions actions={[{ label: 'Add override', allowed: canWrite, onClick: onAdd }]} /></CardHeader><CardContent className="min-w-0 space-y-4">
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load overrides. Try again.')} retry={() => { void resource.refetch(); }} /> : <RecordList empty="No overrides. Pins and exclusions are team decisions, not earned activity." scope="overrides" address={address} records={rows} searchText={(row) => `${badgeName(row.badgeKey)} ${row.reason} ${row.adminId} ${row.placeId}`} filters={[
      { key: 'state', label: 'Override state', defaultValue: 'active', options: [{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'any', label: 'All override states' }], value: (row) => address.get('state') === 'any' ? 'any' : row.expired ? 'expired' : 'active' },
      { key: 'badge', label: 'All badges', options: achievementKeys.map((key) => ({ value: key, label: badgeName(key) })), value: (row) => row.badgeKey },
      { key: 'kind', label: 'All override kinds', options: [{ value: 'pin', label: 'Pinned' }, { value: 'exclude', label: 'Excluded' }], value: (row) => row.kind },
    ]} render={(visible) => <div data-list-table="badges"><Table layout="list"><TableHeader><TableRow>{['Place', 'Badge', 'Kind', 'Until', 'Reason', 'Added by', 'State'].map((label) => <TableHead key={label}>{copy(label)}</TableHead>)}{canWrite && <TableHead column="actions">{copy('Actions')}</TableHead>}</TableRow></TableHeader><TableBody>{visible.map((row) => <OverrideRow key={row.id} row={row} badge={badges.find((badge) => badge.key === row.badgeKey)} canWrite={canWrite} onRemove={() => onRemove(row)} />)}</TableBody></Table></div>} />}
  </CardContent></Card>;
}
function OverrideRow({ row, badge, canWrite, onRemove }: { row: BadgeOverride; badge?: ManagedBadge; canWrite: boolean; onRemove: () => void }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const name = row.placeId;
  const kind = <StatusBadge status={row.kind === 'pin' ? 'paused' : 'inactive'}>{copy(row.kind === 'pin' ? 'Pinned' : 'Excluded')}</StatusBadge>;
  const until = row.until ? <DateCell value={row.until} /> : copy('No end');
  const badgeName = badge ? pick(badge.nameAr, badge.nameEn) : row.badgeKey;
  return <TableRow><TableCell><Link href={`/dashboard/places/${row.placeId}`}><RecordCell icon="override" name={name} context={row.reason} thumbnail={null} /></Link><div className="mt-2 space-y-1 break-words text-sm text-muted-foreground sm:hidden"><p>{badgeName} · {kind}</p><p>{copy('Until')}: {until}</p><p>{row.reason}</p><p>{copy('Added by')}: {row.adminId} · <DateCell value={row.createdAt} /></p><StatusBadge status={row.expired ? 'expired' : 'active'} /></div></TableCell><TableCell>{badgeName}</TableCell><TableCell>{kind}</TableCell><TableCell>{until}</TableCell><TableCell className="whitespace-normal break-words">{row.reason}</TableCell><TableCell className="whitespace-normal break-words"><p>{row.adminId}</p><DateCell value={row.createdAt} /></TableCell><TableCell><StatusBadge status={row.expired ? 'expired' : 'active'} /></TableCell>{canWrite && <TableCell column="actions"><RowActions recordName={name} actions={[{ label: copy('Remove'), icon: <Trash2 aria-hidden="true" />, destructive: true, onClick: onRemove }]} /></TableCell>}</TableRow>;
}
