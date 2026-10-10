'use client';

import * as React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { AdsSubscriptionAction } from './ads-subscription-action';
import { AdsPageHeader } from './ads-page-header';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { DateCell } from './date-cell';
import { useDashboardCopy } from './dashboard-text';
import { ActionDialog, LoadingState, RequestError, SavedRefreshError, type ActionSpec } from './subscriber-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi, toList } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adsBApi, type PromotionCampaign } from '@/lib/api/ads-round-b';
import type { PromotionReport } from '@/lib/api/promotion-report';
import { adsError, surfaceLabels, promotionReasonLabels } from '@/lib/ads-round7b';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { placeCover } from '@/lib/place-list';

export function AdsAlwaysOnPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang(); const [action, setAction] = React.useState<ActionSpec | null>(null);
  const load = React.useCallback(async () => {
    const [manual, plans] = await Promise.all([adminApi.get('/v1/admin/ads/always-on'), adminApi.get<PromotionReport>('/v1/admin/promotions')]);
    return { manual: toList<PromotionCampaign>(manual).items, plans };
  }, []);
  const resource = useSubscriberResource(load);
  const manual = (resource.data?.manual ?? []).map(row => ({ id: row.id, place: row.place, source: 'manual', state: row.state, startDate: row.startDate, endDate: null, where: `${copy(surfaceLabels[row.placement])} · ${row.areaKey ?? row.categoryId ?? row.cityId ?? copy('All Egypt')}`, impressions: row.totals.impressions, taps: row.totals.taps, reason: row.reason, href: `/dashboard/ads/${row.id}/report` }));
  const plans = (resource.data?.plans.data ?? []).filter(row => row.source === 'plan').map(row => ({ id: row.subscriptionId!, place: row.place, source: 'plan', state: row.promotedToday ? 'live' : row.state, startDate: row.startDate, endDate: row.endDate, where: row.placements.map(slot => `${copy(surfaceLabels[slot.placement])} · ${slot.scope}`).join(' / '), impressions: row.delivery.reduce((sum, value) => sum + value.impressions, 0), taps: row.delivery.reduce((sum, value) => sum + value.taps, 0), reason: row.reason ? copy(promotionReasonLabels[row.reason] ?? 'Not serving') : null, href: `/dashboard/places/${row.place.id}?tab=ads` }));
  const locked = !canWrite || resource.loading || Boolean(resource.error) || resource.savedRefreshFailed;
  return <div className="space-y-6"><AdsPageHeader title="Always on" description="Manual promotions have no end date. Owner Plus promotions come from the plan and are read-only here." actions={[{ label: 'Add always-on promotion', href: '/dashboard/ads/new?kind=always_on', allowed: canWrite }]} />
    {resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    <Card><CardContent className="space-y-4">{resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load always-on promotions.')} retry={() => { void resource.refetch(); }} /> : <><p className="text-sm text-muted-foreground">{copy('Manual totals are lifetime accepted campaign counters; plan totals cover the report range. Do not add them as one period.')}</p>{resource.data?.plans && <p className="text-sm">{copy(resource.data.plans.planPromotionsEnabled ? 'Plan promotion is enabled.' : 'Plan promotion is switched off; subscriptions do not serve promotions.')} · {resource.data.plans.from} — {resource.data.plans.to}</p>}<RecordList scope="always-on" records={[...manual, ...plans]} searchText={row => `${row.place.name} ${row.place.nameEn ?? ''} ${row.where} ${row.reason ?? ''}`} filters={[{ key: 'source', label: 'All promotion sources', options: [{ value: 'manual', label: 'By hand' }, { value: 'plan', label: 'Owner Plus plan' }], value: row => row.source }, { key: 'state', label: 'All states', options: [{ value: 'live', label: 'Live' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'ended', label: 'Ended' }], value: row => row.state }]} empty="No always-on promotions yet. Create one with a reason, or review an Owner Plus subscription." render={visible => <div>{visible.map(row => <div key={`${row.source}-${row.id}`} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-3"><div className="min-w-0 flex-1"><RecordCell nameAr={row.place.name} nameEn={row.place.nameEn} thumbnail={placeCover(row.place)} chips={<Badge variant="secondary">{copy(row.source === 'plan' ? 'Owner Plus plan' : 'By hand')}</Badge>} context={row.where} /><p className="mt-1 text-sm text-muted-foreground">{copy('Since')} <DateCell value={row.startDate} /> · {copy(row.state === 'live' ? 'Live' : row.state === 'ended' ? 'Ended' : row.state === 'scheduled' ? 'Scheduled' : 'Not serving')} · {row.reason}</p></div><p className="text-sm tabular-nums">{row.impressions.toLocaleString(lang)} {copy('shown')} · {row.taps.toLocaleString(lang)} {copy('taps')}</p>{row.source === 'plan' ? <AdsSubscriptionAction placeId={row.place.id} subscriptionId={row.id} name={row.place.name} /> : <RowActions recordName={row.place.name} actions={[{ label: row.source === 'plan' ? 'View subscription' : 'View report', href: row.href, icon: <CalendarDays /> }, ...(row.source === 'manual' && !['ended', 'expired'].includes(row.state) && canWrite ? [{ label: 'Stop', icon: <X />, destructive: true, disabled: locked, onClick: () => setAction({ title: copy('Stop always-on promotion?'), description: copy('This permanently ends this promotion. It cannot be resumed. The place, recorded agreement and delivery history remain.'), destructive: true, submit: async () => { if (locked) return; try { await adsBApi.stopAlwaysOn(row.id); } catch (caught) { throw new Error(copy(adsError(caught))); } await resource.refreshAfterSave(); } }) }] : [])]} />}</div>)}</div>} /></>}</CardContent></Card>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
