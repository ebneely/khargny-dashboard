export interface PlaceListMedia {
  coverImage?: string | null;
  images?: { url: string; urls?: { small?: string } }[];
}

export function placeCover(place: PlaceListMedia) {
  return place.coverImage !== undefined ? place.coverImage : place.images?.[0]?.urls?.small || place.images?.[0]?.url || null;
}

export function placeOwner(place: { subscriber?: { id: string; name?: string } | null; subscriberId?: string | null }) {
  return place.subscriber !== undefined ? place.subscriber : place.subscriberId ? { id: place.subscriberId } : null;
}

