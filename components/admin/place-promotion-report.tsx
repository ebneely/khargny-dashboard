'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { Eye } from 'lucide-react';
import { AdsSubscriptionAction } from './ads-subscription-action';
import { RowActions } from './row-actions';
import { sourceLabels, surfaceLabels } from '@/lib/ads-round7b';
import type { SurfaceKind } from '@/lib/api/ads-round-b';
import { DateCell, DateRange } from './date-cell';
import { PageActions } from './page-actions';
import { ActionBarNavigation } from './form-action-bar';
import { RequestError, useSubscriberText } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';
import { Badge } from '@/components/ui/badge';

export interface PlacePromotionRow {
  id: string;
  source: 'campaign' | 'plan' | 'manual' | 'always_on' | 'shuffle' | 'organic'; campaignId?: string | null; subscriptionId?: string | null; testId?: string | null;
  surface: string;
  state: string | null; scope?: string; sponsored?: boolean;
  reason: string | null;
  shownNow: boolean | null;
  startDate: string | null;
  endDate: string | null;
  impressions: number | null;
  taps: number | null;
  metricsFrom: string;
  metricsTo: string;
  metricsUnavailableReason?: string;
  target: { cityId: string | null; region: string | null; categoryId: string | null };
}
export function PlacePromotionReport({ placeId, canWrite }: { placeId: string; canWrite: boolean }) {
  const { text, lang } = useSubscriberText();
  const copy = useDashboardCopy();
  const load = React.useCallback(() => adminApi.get<{ placeId: string; promotedNow: boolean; from: string; to: string; promotions: PlacePromotionRow[]; pastCampaigns: PlacePromotionRow[] }>(`/v1/admin/places/${placeId}/promotions`), [placeId]);
  const resource = useSubscriberResource(load);
  const report = resource.data;
  const render = (rows: PlacePromotionRow[], scope: string) => <RecordList scope={scope} records={rows} busy={resource.loading} searchText={row => `${row.surface} ${row.source} ${row.state} ${row.scope ?? ''} ${row.target?.region ?? ''}`} filters={[{ key: 'source', label: 'All promotion sources', options: [{ value: 'campaign', label: 'Campaign' }, { value: 'plan', label: 'From a plan' }, { value: 'manual', label: 'Editorial pin' }, { value: 'always_on', label: 'By hand' }, { value: 'shuffle', label: 'Shuffle test' }, { value: 'organic', label: 'Organic' }], value: row => row.source }]} render={visible => <ul>{visible.map(row => <li key={row.id} className="flex min-h-14 min-w-0 flex-wrap gap-3 border-b py-4"><div className="min-w-0 flex-1"><RecordCell icon={row.source === 'plan' ? 'plan' : 'section'} name={copy(surfaceLabels[row.surface as SurfaceKind] ?? row.surface)} context={`${copy(row.source === 'manual' ? 'Editorial pin' : sourceLabels[row.source])}${row.scope ? ` · ${row.scope}` : ''}`} chips={row.sponsored === undefined ? undefined : <Badge variant="secondary">{copy(row.sponsored ? 'Sponsored' : 'Not sponsored')}</Badge>} />{row.startDate && (row.endDate ? <DateRange start={row.startDate} end={row.endDate} /> : <p className="text-sm"><DateCell value={row.startDate} /> · {row.source === 'always_on' && copy('No end date')}</p>)}<p className="text-sm text-muted-foreground">{row.shownNow === null ? text('Search display depends on a visitor query.', 'الظهور في البحث يعتمد على بحث الزائر.') : row.shownNow ? text('Shown now', 'يظهر الآن') : text('Not shown in the current serving preview.', 'لا يظهر في معاينة العرض الحالية.')}</p>{row.reason && <p className="text-sm text-muted-foreground">{text('Backend reason', 'سبب الخادم')}: <bdi>{row.reason}</bdi></p>}{row.target?.region && <p className="text-sm" dir="auto">{row.target.region}</p>}{row.impressions !== null && row.impressions !== undefined && row.taps !== null && row.taps !== undefined ? <p className="text-sm tabular-nums">{row.impressions.toLocaleString(lang)} {copy('shown')} · {row.taps.toLocaleString(lang)} {copy('taps')}{row.metricsFrom && row.metricsTo && <> · <DateRange start={row.metricsFrom} end={row.metricsTo} /></>}</p> : <p className="text-sm text-muted-foreground">{row.source === 'manual' ? text('This manual placement has no booking dates or placement counters.', 'هذا الموضع اليدوي ليس له تواريخ حجز أو عدادات خاصة بالموضع.') : copy('Promotion-specific metrics unavailable')}</p>}</div><Badge variant="outline">{copy(row.state ?? 'Not serving')}</Badge>{row.subscriptionId ? <AdsSubscriptionAction placeId={placeId} subscriptionId={row.subscriptionId} name={row.surface} /> : row.testId ? <RowActions recordName={row.surface} actions={[{ label: 'View ranked results', icon: <Eye />, href: `/dashboard/ads/results?tab=shuffle&test=${encodeURIComponent(row.testId)}` }]} /> : row.campaignId ? <RowActions recordName={row.surface} actions={[{ label: 'View report', icon: <Eye />, href: `/dashboard/ads/${encodeURIComponent(row.campaignId)}/report` }]} /> : null}</li>)}</ul>} />;
  return <ActionBarNavigation links={[{ label: 'Cancel', href: '/dashboard/places' }]} fallback={!canWrite}><section className="min-w-0 space-y-6"><header className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">{copy('Ads for this place')}</h2><PageActions actions={[{ label: 'Promote this place', href: '/dashboard/ads/new?placeId=' + encodeURIComponent(placeId), allowed: canWrite }]} /></header>{resource.error && <RequestError message={text('Could not load this place’s promotion report.', 'تعذر تحميل تقرير الترويج لهذا المكان.')} retry={() => { void resource.refetch(); }} />}{report && <p role="status">{report.promotedNow ? text('Promoted now; rotation may change what a visitor sees.', 'يُروّج له الآن؛ قد يغيّر التناوب ما يراه الزائر.') : copy('Not promoted anywhere.')}</p>}<p className="text-sm text-muted-foreground">{copy('This report describes eligibility and accepted delivery, not a visitor-specific card order. Use Where ads appear for the exact preview.')}</p><h3 className="font-semibold">{copy('All promotion sources')}</h3>{render(report?.promotions ?? [], 'place-promotions')}<h3 className="font-semibold">{copy('Past campaigns')}</h3>{render(report?.pastCampaigns ?? [], 'place-past-promotions')}{report && <p className="text-sm text-muted-foreground">{text('Counters are accepted backend events within this report window; manual counters are not invented.', 'العدادات أحداث قبلها الخادم خلال فترة التقرير؛ لا تُختلق عدادات للمواضع اليدوية.')} <DateRange start={report.from} end={report.to} /></p>}</section></ActionBarNavigation>;
}
