import { MapPin } from 'lucide-react';
import { GOVERNORATES, govKey } from '@/lib/governorates';
import { cn } from '@/lib/utils';

type CityLike = { name?: string | null; nameEn?: string | null; slug?: string | null };

/** The governorate landmark for a city (same drawing as the customer apps), or a MapPin when the city is not one of the 27. */
export function GovIcon({ city, className }: { city: CityLike | null | undefined; className?: string }) {
  const g = city && GOVERNORATES[govKey(city.slug) ?? govKey(city.nameEn) ?? govKey(city.name) ?? ''];
  const cls = cn('size-4 shrink-0 text-muted-foreground', className);
  if (!g) return <MapPin aria-hidden className={cls} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cls}>
      <path d={g.d} />
    </svg>
  );
}
