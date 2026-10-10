'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import type { KeywordConcept, KeywordPlace, ReportPage } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { KeywordEditor } from './keyword-editor';
import { KeywordAssignment } from './keyword-assignment';
import { RecordList } from '../record-list';
import { placeCover } from '@/lib/place-list';
import { RecordCell } from '../record-cell';
import { useDashboardCopy } from '../dashboard-text';
import { LoadingState, RequestError, SavedRefreshError } from '../subscriber-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export async function loadKeywordPlaces(id: string) {
  const result: KeywordPlace[] = [];
  while (true) {
    const page = await adminApi.get<ReportPage<KeywordPlace>>(`/v1/admin/tags/${id}/places`, { skip: result.length, limit: 200 });
    result.push(...page.data);
    if (result.length >= page.meta.total) return result;
    if (!page.data.length) throw new Error('Incomplete keyword places');
  }
}

export function KeywordDetailPage({ id }: { id: string }) {
  const copy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
  const load = React.useCallback(async () => {
    const [keyword, places] = await Promise.all([adminApi.get<KeywordConcept>(`/v1/admin/tags/${id}`), loadKeywordPlaces(id)]);
    return { keyword, places };
  }, [id]);
  const resource = useSubscriberResource(load);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data) return <RequestError message={copy('Could not load keyword.')} retry={() => { void resource.refetch(); }} />;
  return <div className="space-y-5"><h2 className="break-words text-xl font-semibold">{copy('Keyword')}: {resource.data.keyword.name}</h2>
    {resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    <Card><CardHeader><CardTitle>{copy('Keyword details')}</CardTitle></CardHeader><CardContent><KeywordEditor key={JSON.stringify(resource.data.keyword)} keyword={resource.data.keyword} disabled={resource.savedRefreshFailed} onSaved={resource.refreshAfterSave} /></CardContent></Card>
    <Card><CardHeader><CardTitle>{copy('Assigned places')}</CardTitle></CardHeader><CardContent><RecordList scope="keyword-places" records={resource.data.places} searchText={(place) => `${place.name} ${place.nameEn}`} filters={[{ key: 'status', label: 'All place statuses', options: [{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'inactive', label: 'Deactivated' }], value: (place) => place.status }]} render={(places) => <ul className="divide-y">{places.map((place) => <li key={place.id} className="py-3"><Link href={`/dashboard/places/${place.id}`}><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} context={copy(place.status === 'active' ? 'Active' : place.status === 'draft' ? 'Draft' : 'Deactivated')} /></Link></li>)}</ul>} /></CardContent></Card>
    {!readOnly && <KeywordAssignment id={id} disabled={resource.savedRefreshFailed} onApplied={resource.refreshAfterSave} />}
  </div>;
}
