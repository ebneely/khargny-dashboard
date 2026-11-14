'use client';

import { SegmentedNavigation } from './segmented-control';

export function FeaturesSwitch({ keywords }: { keywords: boolean }) {
  return <SegmentedNavigation label="Kind of feature" value={keywords ? 'keywords' : 'amenities'} options={[
    { value: 'amenities', label: 'Amenities', href: '/dashboard/places/library/features' },
    { value: 'keywords', label: 'Keywords', href: '/dashboard/places/library/features?kind=keywords' },
  ]} />;
}
