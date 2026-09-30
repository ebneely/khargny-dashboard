import { AdsCampaignsPage, type CampaignListInitialFilters } from '@/components/admin/ads-campaigns-page';
import type { AdPlacement } from '@/lib/api/ads';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const placementValue = first(query.placement);
  const placement = placementValue === 'featured' || placementValue === 'top10'
    ? placementValue as AdPlacement
    : undefined;
  const campaignIds = first(query.campaignIds)?.split(',').filter(Boolean);
  const initialFilters: CampaignListInitialFilters = {
    placement,
    cityId: first(query.cityId),
    placeId: first(query.placeId),
    campaignIds,
  };

  return <AdsCampaignsPage initialFilters={initialFilters} />;
}
