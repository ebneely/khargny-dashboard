import { adminApi, AdminApiError } from './admin-client';
import type { AdPlaceSummary, AdCampaign } from './ads';

export type SurfaceKind = 'featured' | 'top10' | 'city' | 'area' | 'category' | 'search' | 'section';
export type PromotionSource = 'campaign' | 'always_on' | 'plan' | 'organic' | 'shuffle';
export interface AdTarget { placement: SurfaceKind; cityId?: string | null; areaKey?: string | null; categoryId?: string | null; sectionId?: string | null }
export interface SurfaceOccupant { placeId: string; name: string; nameEn?: string | null; source: PromotionSource; sponsored: boolean; campaignId?: string | null; subscriptionId?: string | null; startDate?: string; endDate?: string | null; status?: string }
export interface AdSurface {
  key: string; surface: SurfaceKind; name: string; capacity: number; maxSlots: number; enabled: boolean;
  promotionKind: 'paid' | 'editorial' | null; sellable: boolean;
  scope: { key: string; cityId: string | null; areaKey: string | null; categoryId: string | null; sectionId: string | null };
  totals?: { bookedDays: number; freeDays: number; shown: number; taps: number };
  occupants: SurfaceOccupant[]; days?: { date: string; capacity: number; booked: number; free: number }[];
  sevenDay: { from: string; to: string; shown: number; taps: number };
}
export interface SurfaceResponse { from: string; to: string; timezone: string; data: AdSurface[]; meta?: { page: number; limit: number; total: number } }
export interface SurfaceSummary { from: string; to: string; timezone: string; totals: { surfaces: number; withFreeSpace: number; nobodyPromoted: number }; byKind: { kind: SurfaceKind; surfaces: number; withFreeSpace: number; nobodyPromoted: number }[]; byCity: { cityId: string | null; surfaces: number; withFreeSpace: number; nobodyPromoted: number }[] }
export interface SurfaceQuery { kind?: string; cityId?: string; q?: string; state?: string; page?: number; limit?: number; detail?: 'summary' | 'full' }
export interface SurfacePreview { key: string; capacity: number; maxSlots: number; enabled: boolean; rotation: { bucket: number; nextAt: string }; items: { place: AdPlaceSummary; sponsored: boolean; source: PromotionSource; campaignId: string | null; subscriptionId: string | null; testId: string | null }[] }
export interface Agreement { advertiserName: string; advertiserPhone?: string; amountPaid: number; currency: string; startDate: string; endDate: string | null; notes?: string }
export type PromotionCampaign = Omit<AdCampaign, 'placement' | 'endDate'> & AdTarget & { endDate: string | null; kind: 'campaign' | 'always_on'; reason?: string | null };
export interface AdMeasures { shown: number; taps: number; tapRate: number | null; directions: number; saves: number }
export type ResultGroup = 'surface' | 'area' | 'city' | 'place' | 'source';
export interface AdsResults { from: string; to: string; previous: { from: string; to: string }; groupBy: ResultGroup; data: (AdMeasures & { key: string; cover?: string | null; name?: string | null; nameEn?: string | null; city?: { name: string; nameEn: string | null } | null; slug?: string; coverImage?: string | null; previous: AdMeasures })[]; meta: { page: number; limit: number; total: number }; csv?: string }
export interface Opportunity { kind: 'area' | 'category'; key: string; visits: number; name?: string | null; nameEn?: string | null }
export interface AdsSummary { from: string; to: string; currencies: { currency: string; bookedAmount: string | number; bookedCount: number }[]; dateBasis: string; moneyBasis: string; timezone: string }
export interface ShuffleTest extends Omit<AdTarget, 'placement'> { id: string; surface: SurfaceKind; scope: string; name: string; mode: 'explicit' | 'all_eligible'; status: 'active' | 'stopped'; startDate: string; endDate: string; placeIds?: string[]; notes?: string }
export interface ShuffleRank extends AdMeasures { rank: number; placeId: string; name: string; share: number | null; expectedShare: number; note: string | null }
export interface ShuffleResults { test: ShuffleTest; timezone: string; sharing: string; data: ShuffleRank[] }
const legacyQueries = new Set<string>();
const localSearchResponses = new WeakSet<object>();
export function adsUsesLocalSearch(value: unknown) { return Boolean(value && typeof value === 'object' && localSearchResponses.has(value)); }
async function legacyRead<T>(path: string, base: Record<string, string | number | undefined>) {
  const result = await adminApi.get<T>(path, base);
  if (result && typeof result === 'object') localSearchResponses.add(result);
  return result;
}
export function unsupportedAdsQuery(message: string, fields: string[]) {
  const messages = message.split(',').map(value => value.trim()).filter(Boolean);
  return messages.length > 0 && messages.every(value => {
    const match = /^property (\w+) should not exist$/.exec(value);
    return Boolean(match && fields.includes(match[1]));
  });
}
export async function adsCompatibleRead<T>(path: string, base: Record<string, string | number | undefined>, additions: Record<string, string | number | undefined>) {
  if (legacyQueries.has(path)) return legacyRead<T>(path, base);
  if (!Object.values(additions).some(value => value !== undefined)) return adminApi.get<T>(path, base);
  try { return await adminApi.get<T>(path, { ...base, ...additions }); }
  catch (caught) {
    if (!(caught instanceof AdminApiError) || caught.status !== 400 || !unsupportedAdsQuery(caught.message, Object.keys(additions))) throw caught;
    legacyQueries.add(path);
    return legacyRead<T>(path, base);
  }
}
export const adsBApi = {
  surfaces: (from: string, to: string, query: SurfaceQuery = {}) => adsCompatibleRead<SurfaceResponse>('/v1/admin/ads/surfaces', { from, to }, { ...query }),
  surfacesSummary: (from: string, to: string) => adminApi.get<SurfaceSummary>('/v1/admin/ads/surfaces/summary', { from, to }),
  preview: (key: string, query?: string) => adminApi.get<SurfacePreview>(`/v1/admin/ads/surfaces/${encodeURIComponent(key)}/preview`, { q: query || undefined }),
  results: (from: string, to: string, groupBy: ResultGroup, page = 1, limit = 50, q?: string) => adsCompatibleRead<AdsResults>('/v1/admin/ads/results', { from, to, groupBy, page, limit }, { ...(q ? { q } : {}) }),
  createCampaign: (body: Agreement & AdTarget & { placeId: string; kind?: 'always_on'; reason?: string }) => adminApi.post('/v1/admin/ads/campaigns', body),
  createSubscriberCampaigns: (body: Agreement & AdTarget & { subscriberId: string; placeIds: string[] }) => adminApi.post('/v1/admin/ads/campaigns/for-subscriber', body),
  stopAlwaysOn: (id: string) => adminApi.post(`/v1/admin/ads/campaigns/${encodeURIComponent(id)}/stop`),
  createShuffle: (body: AdTarget & { name: string; mode: 'explicit' | 'all_eligible'; startDate: string; endDate: string; placeIds?: string[]; notes?: string }) => adminApi.post('/v1/admin/ads/shuffle-tests', body),
  shuffleResults: (id: string) => adminApi.get<ShuffleResults>(`/v1/admin/ads/shuffle-tests/${encodeURIComponent(id)}/results`),
  reorderSections: (body: { sectionIds: string[]; expectedOrder: string[] }) => adminApi.put('/v1/admin/storefront/sections/reorder', body),
};
