import { adminApi } from '@/lib/api/admin-client';

/** The place as the location check lists it: enough to open the edit page and see the pin. */
export interface LocationCheckPlace {
  placeId: string;
  name: string;
  nameEn: string | null;
  slug: string;
  city: { id: string; name: string; nameEn: string | null; slug: string } | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
}

export interface LocationCheckSharedPin {
  lat: number;
  lng: number;
  count: number;
  places: LocationCheckPlace[];
}

export interface LocationCheckMissingCentre {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
}

export interface LocationCheckReport {
  thresholdKm: number;
  counts: { farFromCity: number; sharedPins: number; outsideEgypt: number };
  missingCentres: LocationCheckMissingCentre[];
  farFromCity: LocationCheckPlace[];
  sharedPins: LocationCheckSharedPin[];
  outsideEgypt: LocationCheckPlace[];
}

export const loadLocationCheck = () =>
  adminApi.get<LocationCheckReport>('/v1/admin/places/location-check');
