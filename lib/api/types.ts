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
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  priceRange: number | null;
  featured: boolean;
  rating: number;
  viewCount: number;
  status: 'active' | 'draft';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  city?: { name: string };
  category?: { nameAr: string; nameEn: string | null };
  _count?: { images: number; videos: number };
}

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
  descriptionAr: string | null;
  descriptionEn: string | null;
  lat: number | null;
  lng: number | null;
  featured: boolean;
  status: 'active' | 'draft';
  parentCityId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

export type AdminRole = 'super_admin' | 'editor' | 'viewer';
export type AdminStatus = 'active' | 'disabled';

export const ADMIN_ROLES: readonly AdminRole[] = ['super_admin', 'editor', 'viewer'] as const;
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
