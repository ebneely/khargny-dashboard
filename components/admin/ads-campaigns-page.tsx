'use client';

import { readCampaignList } from '@/lib/ads-campaign-list';

import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { placeCover } from '@/lib/place-list';
import { DateRange } from './date-cell';
import { RowActions, type RowAction } from './row-actions';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import * as React from 'react';
import Link from 'next/link';
import { useUrlTab } from '@/lib/use-url-tab';
import { CircleStop, FileText, Pause, Pencil, Play, Plus } from 'lucide-react';
import { AdCampaignActionDialog, type CampaignAction } from '@/components/admin/ad-campaign-action-dialog';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { AdStateBadge } from '@/components/admin/ad-state-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentedControl } from './segmented-control';
import { useSubscriberText } from './subscriber-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { surfaceLabels, adsError } from '@/lib/ads-round7b';
import { adminApi } from '@/lib/api/admin-client';
import {
  formatCount,
  formatCtr,
  formatMoney,
  type AdCampaign,
  type AdPlacement,
} from '@/lib/api/ads';

type ListTab = 'live' | 'scheduled' | 'paused' | 'ended' | 'all';

const TABS: { value: ListTab; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended + expired' },
  { value: 'all', label: 'All' },
];

export interface CampaignListInitialFilters {
  placement?: AdPlacement;
  cityId?: string;
  placeId?: string;
  campaignIds?: string[];
}

export function AdsCampaignsPage({ initialFilters, canWrite }: { initialFilters: CampaignListInitialFilters; canWrite: boolean }) {
  return <React.Suspense fallback={null}><CampaignsContent initialFilters={initialFilters} canWrite={canWrite} /></React.Suspense>;
}

function CampaignsContent({ initialFilters, canWrite }: { initialFilters: CampaignListInitialFilters; canWrite: boolean }) {
  const controlCopy = useDashboardCopy();
  const { pick } = useSubscriberText();
  const { value: tab, onValueChange } = useUrlTab(TABS.map((item) => item.value), initialFilters.campaignIds?.length ? 'all' : 'live');
  const [campaigns, setCampaigns] = React.useState<AdCampaign[]>([]);
  const requestRef = React.useRef(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<{ campaign: AdCampaign; action: CampaignAction } | null>(null);

  const load = React.useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    const params = {
      kind: 'campaign',
      placement: initialFilters.placement,
      cityId: initialFilters.cityId,
      placeId: initialFilters.placeId,
    };
    try {
      let rows: AdCampaign[];
      if (tab === 'ended') {
        const [ended, expired] = await Promise.all([
          readCampaignList((skip, limit) => adminApi.get('/v1/admin/ads/campaigns', { ...params, state: 'ended', skip, limit })),
          readCampaignList((skip, limit) => adminApi.get('/v1/admin/ads/campaigns', { ...params, state: 'expired', skip, limit })),
        ]);
        rows = [...ended, ...expired].sort((a, b) => b.startDate.localeCompare(a.startDate));
      } else {
        rows = await readCampaignList((skip, limit) => adminApi.get('/v1/admin/ads/campaigns', {
          ...params,
          state: tab === 'all' ? undefined : tab, skip, limit,
        }));
      }
      if (initialFilters.campaignIds?.length) {
        const allowed = new Set(initialFilters.campaignIds);
        rows = rows.filter((campaign) => allowed.has(campaign.id));
      }
      if (requestId === requestRef.current) setCampaigns(rows);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(controlCopy(adsError(caught)));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [controlCopy, initialFilters.campaignIds, initialFilters.cityId, initialFilters.placeId, initialFilters.placement, tab]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const hasInventoryFilter = Boolean(
    initialFilters.campaignIds?.length || initialFilters.cityId || initialFilters.placement || initialFilters.placeId,
  );

  return (
    <div>
      <AdsPageHeader
        title="Ad campaigns"
        description="Manage booked promotions, serving state, advertiser records and performance."
        actions={[{ label: 'New campaign', href: '/dashboard/ads/new', allowed: canWrite, icon: <Plus className="size-4" aria-hidden="true" /> }]}
      />

      {hasInventoryFilter && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-info-bg px-4 py-3 text-sm text-info">
          <span><DashboardText>Showing campaigns for the selected surface.</DashboardText></span>
          <Link href="/dashboard/ads/campaigns" className="font-medium underline underline-offset-4"><DashboardText>Clear filter</DashboardText></Link>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <SegmentedControl label="Campaign state" value={tab} onValueChange={onValueChange} options={TABS} />

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label={controlCopy("Loading campaigns")}>
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : error ? (
            <div className="py-10 text-center" role="alert">
              <p className="mb-3 text-sm text-destructive">{error}</p>
              <Button data-ro-allow="true" variant="outline" onClick={() => void load()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium"><DashboardText>No campaigns in this view</DashboardText></p>
              <p className="mt-1 text-sm text-muted-foreground"><DashboardText>Try another state or create a campaign to book space.</DashboardText></p>
            </div>
          ) : (
            <RecordList scope="campaigns" records={campaigns} searchText={(campaign) => `${campaign.place.name} ${campaign.place.nameEn ?? ''} ${campaign.advertiserName} ${campaign.advertiserPhone ?? ''}`} filters={[{ key: 'placement', label: 'All surfaces', options: Object.entries(surfaceLabels).map(([value, label]) => ({ value, label })), value: (campaign) => campaign.placement }]} render={(visible) => <Table layout="campaigns">
              <TableHeader>
                <TableRow>
                  <TableHead><DashboardText>Place</DashboardText></TableHead>
                  <TableHead><DashboardText>Advertiser</DashboardText></TableHead>
                  <TableHead><DashboardText>Where it appears</DashboardText></TableHead>
                  <TableHead><DashboardText>Dates</DashboardText></TableHead>
                  <TableHead className="text-end"><DashboardText>Amount</DashboardText></TableHead>
                  <TableHead className="text-end"><DashboardText>Impr.</DashboardText></TableHead>
                  <TableHead className="text-end"><DashboardText>Taps</DashboardText></TableHead>
                  <TableHead className="text-end"><DashboardText>CTR</DashboardText></TableHead>
                  <TableHead column="status"><DashboardText>State</DashboardText></TableHead>
                  <TableHead column="actions" className="text-end"><DashboardText>Actions</DashboardText></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link href={canWrite ? `/dashboard/ads/${campaign.id}` : `/dashboard/ads/${campaign.id}/report`} className="font-medium hover:text-primary">
                        <RecordCell nameAr={campaign.place.name} nameEn={campaign.place.nameEn} thumbnail={placeCover(campaign.place)} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 leading-4" title={campaign.advertiserName}>{campaign.advertiserName}</p>
                      {campaign.advertiserPhone && <p className="truncate text-xs text-muted-foreground" dir="ltr" title={campaign.advertiserPhone}>{campaign.advertiserPhone}</p>}
                    </TableCell>
                    <TableCell className="text-muted-foreground"><p className="line-clamp-2 leading-4" title={`${controlCopy(surfaceLabels[campaign.placement])} · ${campaign.city ? pick(campaign.city.name, campaign.city.nameEn) : controlCopy('All Egypt')} ${campaign.areaKey ?? (campaign.category ? pick(campaign.category.nameAr, campaign.category.nameEn) : null) ?? (campaign.section ? pick(campaign.section.titleAr, campaign.section.titleEn) : null) ?? campaign.categoryId ?? campaign.sectionId ?? ''}`}>{controlCopy(surfaceLabels[campaign.placement])} · {campaign.city ? pick(campaign.city.name, campaign.city.nameEn) : controlCopy('All Egypt')} {campaign.areaKey ?? (campaign.category ? pick(campaign.category.nameAr, campaign.category.nameEn) : null) ?? (campaign.section ? pick(campaign.section.titleAr, campaign.section.titleEn) : null) ?? campaign.categoryId ?? campaign.sectionId ?? ''}</p></TableCell>
                    <TableCell className="text-muted-foreground"><DateRange start={campaign.startDate} end={campaign.endDate} /></TableCell>
                    <TableCell className="text-end tabular-nums">{formatMoney(campaign.amountPaid, campaign.currency)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCount(campaign.totals?.impressions)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCount(campaign.totals?.taps)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCtr(campaign.totals?.ctr)}</TableCell>
                    <TableCell column="status"><AdStateBadge state={campaign.state} /></TableCell>
                    <TableCell column="actions" className="text-end">
                      <RowActions recordName={campaign.advertiserName} actions={[
                        { label: 'Report', icon: <FileText aria-hidden="true" />, href: `/dashboard/ads/${campaign.id}/report` },
                        ...(canWrite ? [{ label: 'Edit', icon: <Pencil aria-hidden="true" />, href: `/dashboard/ads/${campaign.id}` }, ...campaignLifecycleActions(campaign, (action) => setPending({ campaign, action }))] : []),
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>} />
          )}
        </CardContent>
      </Card>

      <AdCampaignActionDialog
        canWrite={canWrite}
        campaign={pending?.campaign ?? null}
        action={pending?.action ?? null}
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        onCompleted={() => { setPending(null); void load(); }}
      />
    </div>
  );
}

export function campaignLifecycleActions(campaign: AdCampaign, onAction: (action: CampaignAction) => void): RowAction[] {
  if (campaign.state === 'ended' || campaign.state === 'expired') return [];
  const paused = campaign.state === 'paused';
  return [
    { label: paused ? 'Resume' : 'Pause', icon: paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />, onClick: () => onAction(paused ? 'resume' : 'pause') },
    { label: 'End', icon: <CircleStop aria-hidden="true" />, destructive: true, onClick: () => onAction('end') },
  ];
}
