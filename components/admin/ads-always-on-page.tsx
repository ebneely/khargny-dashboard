'use client';

import * as React from 'react';
import { Pin, X } from 'lucide-react';
import { AdsPageHeader } from './ads-page-header';
import { RecordCell } from './record-cell';
import { placeCover } from '@/lib/place-list';
import { RecordList } from './record-list';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, toList } from '@/lib/api/admin-client';
import type { HomeSection, HomePin } from '@/lib/api/storefront';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { ActionDialog, type ActionSpec, LoadingState, RequestError, useSubscriberText } from './subscriber-ui';

export function AdsAlwaysOnPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const load = React.useCallback(async () => {
    const sections = toList<HomeSection>(await adminApi.get<unknown>('/v1/admin/storefront/sections')).items.filter((section) => section.enabled).sort((first, second) => first.sortOrder - second.sortOrder);
    const rows: { section: HomeSection; place: HomePin }[] = [];
    for (const section of sections) {
      const places = toList<HomePin>(await adminApi.get<unknown>(`/v1/admin/storefront/sections/${section.id}/places`)).items;
      rows.push(...places.map((place) => ({ section, place })));
    }
    return rows;
  }, []);
  const resource = useSubscriberResource(load);
  return <div className="space-y-6">
    <AdsPageHeader title="Always on" description="Editorial homepage pins stay until removed. They are not paid campaigns." actions={[{ label: 'Manage homepage sections', href: '/dashboard/ads/placements#homepage-sections', allowed: canWrite, icon: <Pin className="size-4" aria-hidden="true" /> }]} />
    <Card><CardContent>{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load homepage pins.')} retry={() => { void resource.refetch(); }} /> : !resource.data?.length ? <p className="py-6 text-sm text-muted-foreground">{copy('No places are pinned in enabled homepage sections.')}</p> : <div className="overflow-x-auto"><RecordList scope="pins" records={resource.data} searchText={({ section, place }) => `${place.name} ${place.nameEn ?? ''} ${section.titleAr} ${section.titleEn ?? ''}`} filters={[{ key: 'section', label: 'All sections', options: Array.from(new Map(resource.data.map(({ section }) => [section.id, { value: section.id, label: pick(section.titleAr, section.titleEn) }])).values()), value: ({ section }) => section.id }]} render={(visible) => <Table layout="list"><TableHeader><TableRow><TableHead>{copy('Place')}</TableHead><TableHead>{copy('Where it appears')}</TableHead><TableHead column="actions">{copy('Actions')}</TableHead></TableRow></TableHeader><TableBody>{visible.map(({ section, place }) => <TableRow key={`${section.id}-${place.id}`}><TableCell><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} chips={<Badge variant="secondary">{copy('Not sponsored')}</Badge>} /></TableCell><TableCell className="whitespace-normal">{pick(section.titleAr, section.titleEn)}</TableCell><TableCell column="actions">{canWrite && <RowActions recordName={pick(place.name, place.nameEn)} actions={[{ label: 'Stop', icon: <X aria-hidden="true" />, destructive: true, onClick: () => setAction({ title: copy('Stop this homepage pin?'), description: copy('This removes the pin from this section only. Paid campaigns and the place are unchanged. Empty automatic sections return to automatic selection.'), destructive: true, submit: async () => {
      if (!canWrite) return;
      const current = toList<HomePin>(await adminApi.get<unknown>(`/v1/admin/storefront/sections/${section.id}/places`)).items;
      await adminApi.put(`/v1/admin/storefront/sections/${section.id}/places`, { placeIds: current.filter((entry) => entry.id !== place.id).map((entry) => entry.id) });
      await resource.refreshAfterSave();
    } }) }]} />}</TableCell></TableRow>)}</TableBody></Table>} /></div>}</CardContent></Card>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
