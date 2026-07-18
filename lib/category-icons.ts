// The set of category icons an admin can pick in the dashboard. Each value is a lucide icon
// name the frontend knows how to render (khargny-frontend CAT_ICON must cover every value here).
// Keeping this list the single source of truth avoids the admin typing a name the site can't draw.
export const CATEGORY_ICONS: { value: string; label: string }[] = [
  { value: 'utensils', label: 'Restaurant (utensils)' },
  { value: 'coffee', label: 'Cafe (coffee)' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'waves', label: 'Beach (waves)' },
  { value: 'trees', label: 'Nature (trees)' },
  { value: 'mountain', label: 'Desert / mountain' },
  { value: 'shopping-bag', label: 'Shopping' },
  { value: 'building-2', label: 'Hotel / building' },
  { value: 'camera', label: 'Attraction (camera)' },
  { value: 'palmtree', label: 'Oasis (palm)' },
  { value: 'ship', label: 'Cruise / boat' },
  { value: 'tent', label: 'Camp (tent)' },
  { value: 'music', label: 'Nightlife (music)' },
  { value: 'map-pin', label: 'Generic pin' },
];
