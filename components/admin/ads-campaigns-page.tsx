'use client';

import * as React from 'react';
import Link from 'next/link';
import { useUrlTab } from '@/lib/use-url-tab';
import { CircleStop, FileText, Pause, Pencil, Play, Plus } from 'lucide-react';
import { AdCampaignActionDialog, type CampaignAction } from '@/components/admin/ad-campaign-action-dialog';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { AdStateBadge } from '@/components/admin/ad-state-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import {
  displayName,
  formatCount,
  formatCtr,
  formatDate,
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
      placement: initialFilters.placement,
      cityId: initialFilters.cityId,
      placeId: initialFilters.placeId,
    };
    try {
      let rows: AdCampaign[];
      if (tab === 'ended') {
        const [ended, expired] = await Promise.all([
          adminApi.get<AdCampaign[]>('/v1/admin/ads/campaigns', { ...params, state: 'ended' }),
          adminApi.get<AdCampaign[]>('/v1/admin/ads/campaigns', { ...params, state: 'expired' }),
        ]);
        rows = [...ended, ...expired].sort((a, b) => b.startDate.localeCompare(a.startDate));
      } else {
        rows = await adminApi.get<AdCampaign[]>('/v1/admin/ads/campaigns', {
          ...params,
          state: tab === 'all' ? undefined : tab,
        });
      }
      if (initialFilters.campaignIds?.length) {
        const allowed = new Set(initialFilters.campaignIds);
        rows = rows.filter((campaign) => allowed.has(campaign.id));
      }
      if (requestId === requestRef.current) setCampaigns(rows);
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Could not load campaigns.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [initialFilters.campaignIds, initialFilters.cityId, initialFilters.placeId, initialFilters.placement, tab]);

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
        description="Manage booked placements, serving state, advertiser records and performance."
        actions={
          canWrite && <Button render={<Link href="/dashboard/ads/new" />}>
            <Plus className="size-4" aria-hidden="true" />New campaign
          </Button>
        }
      />

      {hasInventoryFilter && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-info-bg px-4 py-3 text-sm text-info">
          <span>Showing campaigns linked from an inventory scope or day.</span>
          <Link href="/dashboard/ads" className="font-medium underline underline-offset-4">Clear filter</Link>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={onValueChange}>
            <TabsList className="h-auto max-w-full flex-wrap justify-start" aria-label="Campaign state">
              {TABS.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading campaigns">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : error ? (
            <div className="py-10 text-center" role="alert">
              <p className="mb-3 text-sm text-destructive">{error}</p>
              <Button data-ro-allow="true" variant="outline" onClick={() => void load()}>Retry</Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium">No campaigns in this view</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another state or create a campaign to book inventory.</p>
            </div>
          ) : (
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Place</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Taps</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link href={canWrite ? `/dashboard/ads/${campaign.id}` : `/dashboard/ads/${campaign.id}/report`} className="font-medium hover:text-primary">
                        {displayName(campaign.place.name, campaign.place.nameEn)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p>{campaign.advertiserName}</p>
                      {campaign.advertiserPhone && <p className="text-xs text-muted-foreground" dir="ltr">{campaign.advertiserPhone}</p>}
                    </TableCell>
                    <TableCell>{campaign.placement === 'featured' ? 'Featured' : 'Top 10'}</TableCell>
                    <TableCell>{campaign.city ? displayName(campaign.city.name, campaign.city.nameEn) : 'All Egypt'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</TableCell>
                    <TableCell>{formatMoney(campaign.amountPaid, campaign.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(campaign.totals.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(campaign.totals.taps)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCtr(campaign.totals.ctr)}</TableCell>
                    <TableCell><AdStateBadge state={campaign.state} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          render={<Link href={`/dashboard/ads/${campaign.id}/report`} />}
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open report for ${campaign.advertiserName}`}
                          title="Report"
                        >
                          <FileText className="size-4" />
                        </Button>
                        {canWrite && <Button
                          render={<Link href={`/dashboard/ads/${campaign.id}`} />}
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit campaign for ${campaign.advertiserName}`}
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>}
                        {canWrite && <LifecycleActions campaign={campaign} onAction={(action) => setPending({ campaign, action })} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

function LifecycleActions({ campaign, onAction }: { campaign: AdCampaign; onAction: (action: CampaignAction) => void }) {
  const actionButton = (
    action: CampaignAction,
    label: string,
    Icon: typeof Pause,
    destructive = false,
  ) => (
    <Button
      type="button"
      variant={destructive ? 'destructive' : 'ghost'}
      size="icon-sm"
      onClick={() => onAction(action)}
      aria-label={`${label} campaign for ${campaign.advertiserName}`}
      title={label}
    >
      <Icon className="size-4" />
    </Button>
  );

  if (campaign.state === 'ended' || campaign.state === 'expired') return null;
  return (
    <>
      {campaign.state === 'paused'
        ? actionButton('resume', 'Resume', Play)
        : actionButton('pause', 'Pause', Pause)}
      {actionButton('end', 'End', CircleStop, true)}
    </>
  );
}
