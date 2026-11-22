import { adminApi } from './admin-client';
import type { NumbersWindow } from './numbers';

/**
 * Decision 0006/0007 (team side): the ranking rules, the places they currently rank, and the leads a search
 * produced. Read-only except the settings version, which only a super admin may save.
 */
export interface AlgorithmSettingsRow {
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  values: Record<string, unknown>;
}

export type AlgorithmStatus =
  | 'new'
  | 'normal'
  | 'trial'
  | 'rising'
  | 'hyped'
  | 'cooling'
  | 'resting'
  | 'needs_listing';

export interface AlgorithmPlaceRow {
  placeId: string;
  name: string;
  nameEn: string | null;
  cityId: string | null;
  status: AlgorithmStatus;
  paid: boolean;
  hype: number;
  hypePrev7: number;
  hype7: number;
  interestRate: number | null;
  trialShown: number | null;
  statusSince: string;
  reason: string | null;
  missingHours: boolean;
}

export interface AlgorithmPlaceList {
  items: AlgorithmPlaceRow[];
  total: number;
  page: number;
  limit: number;
  counts: Record<string, number>;
}

export interface AlgorithmPreview {
  statusCounts: { before: Record<string, number>; after: Record<string, number> };
  sampleFeed: { placeId: string; name: string; slot: string; mark: string | null }[];
  learnedKeywords?: { learnedNow: number; wouldAssign: number; wouldRemove: number };
}

export interface LeadRow {
  term: string;
  searches: number;
  leads: number;
  converted: number;
  topPlaces: { placeId: string; name: string; leads: number }[];
}

export interface LeadsReport {
  window: string;
  leads: LeadRow[];
  missedDemand: { term: string; searches: number; shownButNoTap: number }[];
  scope?: { from?: string; to?: string; platform?: string; cityId?: string | null };
}

export const loadAlgorithmSettings = () =>
  adminApi.get<AlgorithmSettingsRow>('/v1/admin/algorithm/settings');

export const saveAlgorithmSettings = (values: Record<string, unknown>, note: string) =>
  adminApi.put<AlgorithmSettingsRow>('/v1/admin/algorithm/settings', { values, note });

export const previewAlgorithm = (values: Record<string, unknown>) =>
  adminApi.post<AlgorithmPreview>('/v1/admin/algorithm/preview', { values });

export const runAlgorithm = () => adminApi.post<unknown>('/v1/admin/algorithm/run');

export const loadAlgorithmPlaces = (query: {
  status?: string;
  cityId?: string;
  paid?: string;
  q?: string;
  page: number;
  limit: number;
}) => adminApi.get<AlgorithmPlaceList>('/v1/admin/algorithm/places', query);

export const loadLeads = (window: NumbersWindow, cityId?: string) =>
  adminApi.get<LeadsReport>('/v1/admin/leads', { window, cityId });
