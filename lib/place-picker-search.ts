import { adminApi, toList } from './api/admin-client';
import type { LinkedPlaceRow } from '@/components/admin/subscriber-place-table';

export async function searchPickerPlaces(params: { cityId?: string; search?: string; status?: string; limit: number; skip: number; subscriberId?: string }) {
  return toList<LinkedPlaceRow>(await adminApi.get<unknown>('/v1/admin/places', params));
}
