import { adminApi } from './admin-client';
import type { PeopleCell } from '@/lib/people';

/** Rolling windows people are prepared for (there is no Live: a person count needs a day to mean something). */
export type PeopleWindow = '24h' | '7d' | '30d' | 'all';
export type PeopleMetric = 'views' | 'likes' | 'saves' | 'shares' | 'goes' | 'searchTaps' | 'searches';
export type PeopleRow = Record<PeopleMetric, PeopleCell | null>;
export interface PeopleResponse { window: PeopleWindow; webEstimated: boolean; site: PeopleRow; items: Record<string, PeopleRow> }

export const loadPeople = (window: PeopleWindow, ids: string[]) =>
  adminApi.get<PeopleResponse>('/v1/admin/people', { window, ids: ids.join(',') });
