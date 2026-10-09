import { adminApi, toList } from '@/lib/api/admin-client';
import type { AdCampaign, AdCampaignReport, AdInventory } from '@/lib/api/ads';
import { isCalendarDate } from '@/lib/subscription-calendar';

function readableReport(value: unknown, campaignId: string): value is AdCampaignReport {
  const report = value as Partial<AdCampaignReport> | null;
  return report?.campaign?.id === campaignId
    && typeof report.campaign.startDate === 'string'
    && typeof report.campaign.state === 'string'
    && typeof report.campaign.place?.name === 'string'
    && Array.isArray(report.days)
    && report.days.every((day) => day && isCalendarDate(day.date)
      && Number.isFinite(day.impressions) && day.impressions >= 0
      && Number.isFinite(day.taps) && day.taps >= 0);
}

async function loadCampaignReportData(filters?: { placeId?: string }) {
  const campaigns = toList<AdCampaign>(await adminApi.get<unknown>('/v1/admin/ads/campaigns', filters)).items;
  const reports: AdCampaignReport[] = [];
  const failedCampaigns: AdCampaign[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, campaigns.length) }, async () => {
    while (next < campaigns.length) {
      const campaign = campaigns[next++];
      try {
        const report = await adminApi.get<unknown>(`/v1/admin/ads/campaigns/${campaign.id}/report`);
        if (!readableReport(report, campaign.id)) throw new Error('Unreadable campaign report.');
        reports.push(report);
      } catch {
        failedCampaigns.push(campaign);
      }
    }
  }));
  reports.sort((first, second) => second.campaign.startDate.localeCompare(first.campaign.startDate));
  failedCampaigns.sort((first, second) => first.id.localeCompare(second.id));
  return { campaigns, reports, failedCampaigns };
}

export async function loadCampaignReports(filters?: { placeId?: string }): Promise<AdCampaignReport[]> {
  const data = await loadCampaignReportData(filters);
  if (data.failedCampaigns.length) throw new Error('Could not load campaign reports.');
  return data.reports;
}

export async function loadTodayPromotionData(today: string) {
  const [data, capacity] = await Promise.all([
    loadCampaignReportData(),
    adminApi.get<AdInventory>('/v1/admin/ads/inventory', { from: today, to: today }).then((value) => {
      if (!Array.isArray(value?.scopes) || !value.scopes.every((scope) => Array.isArray(scope.days))) throw new Error('Unreadable capacity.');
      return value;
    }).catch(() => null),
  ]);
  return { ...data, capacity };
}
