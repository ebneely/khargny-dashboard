import { adminApi } from './admin-client';
import type { Subscription } from './subscribers';

export type PlanKey = 'owner' | 'owner_plus';
export type PlanKind = 'paid' | 'trial_14_days' | 'trial_1_month';
export type PlanMonths = '1' | '2' | '3' | '6';
export type PlanFeature = 'portal_edit' | 'services_prices' | 'badge_eligibility' | 'statistics' | 'area_category_promotion' | 'featured_rotation' | 'city_top10_rotation' | 'monthly_report';
export interface PlanCatalogueRow {
  plan: PlanKey;
  nameAr: string;
  nameEn: string;
  features: PlanFeature[];
  prices: Record<PlanMonths, string | null>;
  currency: 'EGP';
  active: boolean;
  updatedAt: string;
}
export type PlanPatch = Partial<Pick<PlanCatalogueRow, 'nameAr' | 'nameEn' | 'features' | 'active'>> & { price1Month?: string | null; price2Months?: string | null; price3Months?: string | null; price6Months?: string | null };
export interface ChangePlanResult {
  previous: Subscription;
  current: Subscription;
  difference: { amount: string; currency: 'EGP'; daysLeft: number; credit: boolean };
}
export type ChangePlanPreview = Omit<ChangePlanResult, 'current'> & { dryRun: true; current: Omit<Subscription, 'id'> & { id: null } };
export const plansApi = {
  catalogue: () => adminApi.get<PlanCatalogueRow[]>('/v1/admin/plans'),
  update: (plan: PlanKey, patch: PlanPatch) => adminApi.patch<PlanCatalogueRow>(`/v1/admin/plans/${plan}`, patch),
  publicCatalogue: () => adminApi.get<{ plans: (Omit<PlanCatalogueRow, 'prices' | 'active' | 'updatedAt'> & { prices: Partial<Record<PlanMonths, string>> })[]; renewalPhone: string | null; renewalWhatsapp: string | null }>('/v1/plans'),
  promotions: () => adminApi.get<{ planPromotionsEnabled?: boolean }>('/v1/admin/promotions'),
  change: (id: string, body: { plan: PlanKey; effective: 'now'; payment?: { amount: string; method: string; paidAt: string } }) => adminApi.post<ChangePlanResult>(`/v1/admin/subscriptions/${id}/change-plan`, body),
  previewChange: (id: string, body: { plan: PlanKey; effective: 'now' }) => adminApi.post<ChangePlanPreview>(`/v1/admin/subscriptions/${id}/change-plan`, { ...body, dryRun: true }),
};
