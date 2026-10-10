import { adminApi } from './admin-client';

export type BadgeKey = 'pricing' | 'price_match' | 'visited' | 'most_5argnyd' | 'most_saved' | 'most_viewed';
export type BadgeIconKey = 'tag' | 'price-check' | 'mark' | 'flame' | 'heart' | 'eye';
export interface BadgeRule { measure: 'directions' | 'save' | 'view'; scope: 'city' | 'city_category'; windowDays: 7 | 30 | 90 | null; winners: number; floor: number }
export interface ManagedBadge {
  key: BadgeKey; family: 'status' | 'achievement'; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string;
  icon: BadgeIconKey; enabled: boolean; sortOrder: number; rule: BadgeRule | null; holderCount: number; updatedAt: string; updatedBy: string | null;
}
export interface BadgeRun { id: string; startedAt: string; finishedAt: string | null; trigger: 'stale' | 'manual' | 'rule_change'; counts: { candidates: number; awards: number }; error: string | null }
export interface BadgeCatalogue { data: ManagedBadge[]; lastRun: BadgeRun | null; nextDue: { day: string; timezone: 'Africa/Cairo'; onRead: boolean; dueNow: boolean } }
export interface BadgeScope { type: 'city' | 'city_category'; city: { id: string; name: string; nameEn: string | null; slug: string }; category?: { id: string; name: string; nameEn: string | null } }
export interface BadgeOverride { id: string; badgeKey: BadgeKey; placeId: string; kind: 'exclude' | 'pin'; reason: string; until: string | null; adminId: string; createdAt: string; expired: boolean }
export interface BadgeHolder {
  cover?: string | null;
  placeId?: string; id?: string; name: string; nameEn: string | null; slug?: string; cityId: string; categoryId: string | null;
  rank: number | null; value: number | null; window: { start: string | null; end: string; days: number | null } | null;
  computedAt?: string; scope?: BadgeScope | null; source: 'earned' | 'pinned' | 'status'; override?: BadgeOverride | null;
}
export interface BadgeCandidate {
  cover?: string | null;
  id: string; name: string; nameEn: string | null; slug: string; cityId: string; categoryId: string | null; value: number;
  position: number; candidates: number; rank: number | null; scope?: BadgeScope; city: BadgeScope['city']; category: BadgeScope['category']; override: 'pin' | 'exclude' | null;
}
export interface BadgeHolders { holders: BadgeHolder[]; nextCandidates: BadgeCandidate[]; rule?: BadgeRule }
export interface BadgePreview { key: BadgeKey; enabled: boolean; rule: BadgeRule; window: { start: string | null; end: string }; awards: BadgeCandidate[]; candidates: BadgeCandidate[] }
export interface PlaceBadgeStatus { key: BadgeKey; enabled: boolean; held: boolean; rank: number | null; candidates: number | null; value: number | null; floor: number | null; windowDays: number | null; scope: BadgeScope | null; override: BadgeOverride | null; eligible?: boolean; window?: { start: string | null; end: string } }
export type BadgePatch = Partial<Pick<ManagedBadge, 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'icon' | 'enabled' | 'sortOrder'>> & { rule?: BadgeRule };
export const achievementKeys: BadgeKey[] = ['most_5argnyd', 'most_saved', 'most_viewed'];
export const badgesApi = {
  catalogue: () => adminApi.get<BadgeCatalogue>('/v1/admin/badges'),
  update: (key: BadgeKey, patch: BadgePatch) => adminApi.patch<ManagedBadge>(`/v1/admin/badges/${key}`, patch),
  holders: (key: BadgeKey, filters: { cityId?: string; categoryId?: string } = {}) => adminApi.get<BadgeHolders>(`/v1/admin/badges/${key}/holders`, filters),
  preview: (key: BadgeKey, rule: BadgeRule, cityId?: string) => adminApi.get<BadgePreview>(`/v1/admin/badges/${key}/preview`, { rule: JSON.stringify(rule), cityId }),
  recompute: () => adminApi.post<BadgeRun>('/v1/admin/badges/recompute'),
  overrides: (key: BadgeKey) => adminApi.get<BadgeOverride[]>(`/v1/admin/badges/${key}/overrides`),
  addOverride: (key: BadgeKey, body: { placeId: string; kind: 'pin' | 'exclude'; reason: string; until?: string }) => adminApi.post<BadgeOverride>(`/v1/admin/badges/${key}/overrides`, body),
  removeOverride: (key: BadgeKey, id: string) => adminApi.delete<{ deleted: true }>(`/v1/admin/badges/${key}/overrides/${id}`),
  placeStatus: (id: string) => adminApi.get<{ badgeStatus?: PlaceBadgeStatus[] }>(`/v1/admin/places/${id}`),
};
