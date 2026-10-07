export interface AdminPlace {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  cityId: string;
  categoryId: string;
  description: string | null;
  descriptionEn: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl?: string | null;
  amenities?: { id: string }[];
  tags?: { id: string }[];
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  priceRange: number | null;
  hasMenu?: boolean;
  priceVerified?: boolean;
  visitedByUs?: boolean;
  featured: boolean;
  rating: number;
  viewCount: number;
  /** Lifetime saves. Monotonic — un-saving never decrements it. */
  saveCount?: number;
  /** Lifetime Directions/Go taps from web + app. Monotonic. */
  directionsCount?: number;
  region?: string | null;
  status: 'active' | 'draft';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // The backend spreads the whole city/category row, so `slug` and `id` have always been
  // present at runtime; the type simply never admitted it. `city.slug` is what builds the
  // link to the public page.
  city?: { id?: string; slug?: string; name: string; nameEn?: string | null };
  category?: { id?: string; slug?: string; nameAr: string; nameEn: string | null };
  _count?: { images: number; videos: number };
  hasMedia?: boolean;
}

export type AdminOptions<T> = T[] | { data?: T[]; items?: T[] };

export interface AdminPlaceList {
  items: AdminPlace[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminPlaceFilters {
  search?: string;
  cityId?: string;
  categoryId?: string;
  status?: string;
  /** true: only places with a photo or video. false: only those with neither. */
  hasMedia?: boolean;
  sortBy?: string;
  skip?: number;
  limit?: number;
}

export interface AdminCity {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  region: string | null;
  /** The areas (English catalog keys) this city offers; null when not curated. */
  areaKeys: string[] | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  lat: number | null;
  lng: number | null;
  featured: boolean;
  status: 'active' | 'draft';
  parentCityId: string | null;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // place counts attached by the admin cities list (total incl. draft, and active)
  placeCount?: number;
  activePlaceCount?: number;
}

export interface AdminCityList {
  items: AdminCity[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminCityFilters {
  region?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface AdminCategory {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  status: 'active' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface AdminAmenity {
  id: string;
  name: string;
  nameEn: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AdminTag {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin (US-dev-ADM-001/002/003) — consumed by /dashboard/admins/{list,new,[id]/edit}.
// Sanitized: passwordHash never serializes. Mirrors Modules/admins/contract.ts
// (AdminsRoutes + Admin + AdminList + CreateAdmin + UpdateAdmin Zod contracts).
// ─────────────────────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'admin' | 'viewer';
export type AdminStatus = 'active' | 'disabled';

export const ADMIN_ROLES: readonly AdminRole[] = ['super_admin', 'admin', 'viewer'] as const;
export const ADMIN_STATUSES: readonly AdminStatus[] = ['active', 'disabled'] as const;

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminList {
  items: Admin[];
  skip: number;
  limit: number;
}

export interface AdminFilters {
  skip?: number;
  limit?: number;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  role?: AdminRole;
}

export interface UpdateAdminInput {
  role?: AdminRole;
  status?: AdminStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Place amenities assignment (US-admin-AMN-001)
// Mirrors Modules/amenities/contract.ts `AssignAmenitiesToPlace` response
// (POST /v1/admin/amenities/place/:placeId/assign). Replace-semantics — the
// server echoes the full assigned-set so the client can reconcile local state
// without a second fetch.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaceAmenityAssignment {
  placeId: string;
  amenityIds: string[];
}

// POST /v1/admin/tags/place/:placeId/assign — body { tagIds }. Replace-semantics:
// the sent set becomes the place's full tag set (US-admin-TAG-001).
export interface PlaceTagAssignment {
  placeId: string;
  tagIds: string[];
}
