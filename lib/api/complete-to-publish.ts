import { adminApi } from "./admin-client";
import type { PlaceCheckId } from "./types";

/**
 * PLACES-DIRECTION 13: the admin queue of active places that are not publishable,
 * highest 30-day views first. The server pages by an opaque offset cursor.
 */
export interface CompleteToPublishRow {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  cityId: string;
  categoryId: string;
  city: { id: string; slug: string; name: string; nameEn: string | null };
  category: { name: string; nameEn: string | null };
  views: number;
  missing: PlaceCheckId[];
  counts: { photos: number; amenities: number; tags: number; hours: number };
  updatedAt: string;
}

export interface CompleteToPublishPage {
  data: CompleteToPublishRow[];
  meta: {
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
    has_more: boolean;
    nextCursor: string | null;
  };
}

export const loadCompleteToPublish = (query: {
  city?: string;
  category?: string;
  missing?: string;
  limit?: number;
  cursor?: string | null;
}) =>
  adminApi.get<CompleteToPublishPage>("/v1/admin/places/complete-to-publish", {
    city: query.city,
    category: query.category,
    missing: query.missing,
    limit: query.limit,
    cursor: query.cursor ?? undefined,
  });

/** Rule 11 "Missing price": publishable places whose tracked check is missing. */
export const loadMissingCheck = (query: { check: string; city?: string; category?: string; limit?: number; cursor?: string | null }) =>
  adminApi.get<CompleteToPublishPage>('/v1/admin/places/missing-check', {
    check: query.check,
    city: query.city,
    category: query.category,
    limit: query.limit,
    cursor: query.cursor ?? undefined,
  });
