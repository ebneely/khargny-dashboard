import type { AdminCity } from '@/lib/api/types';

export type AdPlacement = 'featured' | 'top10' | 'city' | 'area' | 'category' | 'search' | 'section';
export type AdCampaignState = 'live' | 'scheduled' | 'paused' | 'ended' | 'expired';
export type AdCampaignStatus = 'active' | 'paused' | 'ended';

export interface AdPlaceSummary {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  cityId: string;
  status: string;
  coverImage: string | null;
  rating?: string;
  saveCount?: number;
  directionsCount?: number;
  viewCount?: number;
}

export interface AdCitySummary {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
}

export interface AdTotals {
  impressions: number;
  taps: number;
  ctr: number | null;
  reach: number;
}

export interface AdCampaign {
  category?: { id: string; nameAr: string; nameEn: string | null } | null;
  section?: { id: string; titleAr: string; titleEn: string | null } | null;
  areaKey?: string | null;
  categoryId?: string | null;
  sectionId?: string | null;
  kind?: 'campaign' | 'always_on';
  id: string;
  placeId: string;
  place: AdPlaceSummary;
  placement: AdPlacement;
  cityId: string | null;
  city: AdCitySummary | null;
  advertiserName: string;
  advertiserPhone: string | null;
  amountPaid: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: AdCampaignStatus;
  state: AdCampaignState;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totals: AdTotals;
}

export interface AdCampaignInput {
  placeId: string;
  placement: AdPlacement;
  cityId?: string | null;
  advertiserName: string;
  advertiserPhone?: string;
  amountPaid: number;
  currency?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export type AdCampaignMutation = AdCampaign & { warnings?: string[] };

export interface AdReportDay extends AdTotals {
  date: string;
}

export interface AdCampaignReport {
  campaign: AdCampaign;
  generatedAt: string;
  timezone: string;
  totals: AdTotals;
  days: AdReportDay[];
  methodology: {
    impression: string;
    tap: string;
    reach: string;
  };
}

export interface AdInventoryDay {
  date: string;
  booked: number;
  capacity: number;
  campaignIds: string[];
}

export interface AdInventoryScope {
  placement: AdPlacement;
  cityId: string | null;
  city: AdCitySummary | null;
  days: AdInventoryDay[];
}

export interface AdInventory {
  from: string;
  to: string;
  timezone: string;
  capacity: Record<AdPlacement, number>;
  scopes: AdInventoryScope[];
}

export interface TopPlaceComponents {
  rating: number;
  saves: number;
  directions: number;
  views: number;
}

export interface TopPlacePreviewItem {
  position: number;
  rank: number | null;
  sponsored: boolean;
  campaignId: string | null;
  score: number | null;
  place: AdPlaceSummary & { region?: string | null };
  components?: TopPlaceComponents;
}

export interface SponsoredQueueItem {
  campaignId: string;
  placeId: string;
  placeName: string;
  advertiserName: string;
  shownNow: boolean;
}

export interface TopPlacesPreview {
  city: AdCitySummary | null;
  formula: {
    version: string;
    weights: TopPlaceComponents;
  };
  rotation: { bucket: number; nextAt: string };
  items: TopPlacePreviewItem[];
  candidates: number;
  sponsoredQueue: SponsoredQueueItem[];
}

export type AdsCity = Pick<AdminCity, 'id' | 'slug' | 'name' | 'nameEn' | 'status'>;

export function displayName(
  arabic: string | null | undefined,
  english: string | null | undefined,
): string {
  return arabic?.trim() || english?.trim() || '—';
}

export function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : '—';
}

export function formatCtr(value: number | null | undefined): string {
  return typeof value !== 'number' ? '—' : `${(value * 100).toFixed(2)}%`;
}

export function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
