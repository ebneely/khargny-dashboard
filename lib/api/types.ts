export interface AdminPlace {
  id: string;
  name: string;
  slug: string;
  cityId: string;
  categoryId: string;
  status: 'active' | 'draft';
  featured: boolean;
  rating: number;
  viewCount: number;
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
