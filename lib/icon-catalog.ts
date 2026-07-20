/**
 * The canonical icon catalog — the ONLY icon names an admin can assign to a category or an
 * amenity. Every value is a lucide icon name.
 *
 * Lucide is the single icon library across all three surfaces: lucide-react in this
 * dashboard and in khargny-frontend, lucide-react-native in the Expo app. The names and the
 * glyphs are identical in all three packages, and every icon is bundled at build time — none
 * is fetched at runtime. So "wifi" here is the same drawing everywhere it appears.
 *
 * This file is mirrored, byte for byte in its ICONS array, by:
 *   - khargny-frontend/src/lib/icon-catalog.ts
 *   - khargny-app/khargny_expo_app/constants/icon-catalog.ts
 * Each of those maps the same names to its platform's lucide components. When you add an
 * entry here you MUST add it in both, or the icon silently falls back to a generic pin.
 * The renderers are keyed by these strings, so a typo degrades rather than crashes.
 */

export type IconGroup = 'places' | 'food' | 'facilities' | 'comfort' | 'access' | 'general';

export interface IconEntry {
  /** lucide icon name — what gets stored in categories.icon / amenities.icon */
  value: string;
  /** what the admin reads in the picker */
  label: string;
  group: IconGroup;
  /** extra words the picker search should match (e.g. Arabic-ish concepts, synonyms) */
  keywords?: string[];
}

export const ICONS: IconEntry[] = [
  // ── Place kinds ──────────────────────────────────────────────────────────────────────
  { value: 'landmark', label: 'Landmark', group: 'places', keywords: ['monument', 'historic'] },
  { value: 'waves', label: 'Beach / water', group: 'places', keywords: ['sea', 'pool', 'swim'] },
  { value: 'trees', label: 'Nature / park', group: 'places', keywords: ['garden', 'green'] },
  { value: 'mountain', label: 'Desert / mountain', group: 'places', keywords: ['hike', 'valley'] },
  { value: 'palmtree', label: 'Oasis / palm', group: 'places', keywords: ['resort', 'tropical'] },
  { value: 'tent', label: 'Camp', group: 'places', keywords: ['camping', 'outdoor'] },
  { value: 'ship', label: 'Cruise / boat', group: 'places', keywords: ['felucca', 'sail'] },
  { value: 'building-2', label: 'Hotel / building', group: 'places', keywords: ['stay', 'lodge'] },
  { value: 'camera', label: 'Attraction / photo spot', group: 'places', keywords: ['sight', 'view'] },
  { value: 'shopping-bag', label: 'Shopping', group: 'places', keywords: ['mall', 'market', 'souq'] },
  { value: 'music', label: 'Nightlife / music', group: 'places', keywords: ['live', 'concert', 'bar'] },
  { value: 'store', label: 'Shop / store', group: 'places', keywords: ['retail', 'kiosk'] },
  { value: 'hotel', label: 'Hotel / resort', group: 'places', keywords: ['stay', 'accommodation'] },
  { value: 'bed-double', label: 'Guesthouse', group: 'places', keywords: ['hostel', 'rooms'] },
  { value: 'ferris-wheel', label: 'Theme park', group: 'places', keywords: ['fun', 'rides', 'amusement'] },
  { value: 'gamepad-2', label: 'Games / arcade', group: 'places', keywords: ['playstation', 'gaming'] },
  { value: 'dumbbell', label: 'Gym / fitness', group: 'places', keywords: ['workout', 'sport'] },
  { value: 'volleyball', label: 'Sports venue', group: 'places', keywords: ['football', 'court', 'pitch'] },
  { value: 'waves-ladder', label: 'Swimming pool', group: 'places', keywords: ['pool', 'swim', 'aqua'] },
  { value: 'clapperboard', label: 'Cinema', group: 'places', keywords: ['movie', 'film'] },
  { value: 'theater', label: 'Theatre / shows', group: 'places', keywords: ['stage', 'performance'] },
  { value: 'palette', label: 'Art / gallery', group: 'places', keywords: ['museum', 'exhibition'] },
  { value: 'book-open', label: 'Library / books', group: 'places', keywords: ['reading', 'study'] },
  { value: 'graduation-cap', label: 'Education', group: 'places', keywords: ['school', 'university'] },
  { value: 'stethoscope', label: 'Clinic / medical', group: 'places', keywords: ['doctor', 'hospital'] },
  { value: 'scissors', label: 'Salon / barber', group: 'places', keywords: ['hair', 'beauty', 'spa'] },
  { value: 'flower-2', label: 'Spa / wellness', group: 'places', keywords: ['massage', 'relax'] },
  { value: 'fuel', label: 'Fuel station', group: 'places', keywords: ['petrol', 'gas', 'benzine'] },
  { value: 'church', label: 'Church', group: 'places', keywords: ['worship', 'religious'] },
  { value: 'sunset', label: 'Viewpoint / sunset', group: 'places', keywords: ['scenic', 'horizon'] },
  { value: 'anchor', label: 'Marina / port', group: 'places', keywords: ['harbour', 'dock'] },
  { value: 'map-pin', label: 'Generic pin', group: 'general', keywords: ['default', 'other'] },
  { value: 'star', label: 'Featured / special', group: 'general', keywords: ['highlight', 'top'] },
  { value: 'sparkles', label: 'New / trending', group: 'general', keywords: ['hot', 'popular'] },
  { value: 'compass', label: 'Explore', group: 'general', keywords: ['discover', 'guide'] },

  // ── Food & drink ─────────────────────────────────────────────────────────────────────
  { value: 'utensils', label: 'Restaurant', group: 'food', keywords: ['eat', 'dining', 'food'] },
  { value: 'coffee', label: 'Cafe / coffee', group: 'food', keywords: ['tea', 'espresso'] },
  { value: 'ice-cream-cone', label: 'Dessert / ice cream', group: 'food', keywords: ['sweet'] },
  { value: 'cake-slice', label: 'Bakery / cake', group: 'food', keywords: ['pastry', 'sweets'] },
  { value: 'pizza', label: 'Fast food', group: 'food', keywords: ['burger', 'takeaway'] },
  { value: 'wine', label: 'Drinks', group: 'food', keywords: ['bar', 'juice', 'cocktail'] },
  { value: 'soup', label: 'Local cuisine', group: 'food', keywords: ['traditional', 'home food'] },
  { value: 'sandwich', label: 'Snacks', group: 'food', keywords: ['light bites'] },
  { value: 'beef', label: 'Grill / meat', group: 'food', keywords: ['bbq', 'kebab', 'steak'] },
  { value: 'fish', label: 'Seafood', group: 'food', keywords: ['fish', 'grilled fish'] },
  { value: 'salad', label: 'Healthy / salads', group: 'food', keywords: ['vegan', 'diet'] },
  { value: 'croissant', label: 'Breakfast', group: 'food', keywords: ['brunch', 'morning'] },
  { value: 'cup-soda', label: 'Juice bar', group: 'food', keywords: ['smoothie', 'fresh juice'] },
  { value: 'candy', label: 'Sweets / candy', group: 'food', keywords: ['confectionery'] },
  { value: 'shopping-cart', label: 'Grocery / market', group: 'food', keywords: ['supermarket'] },

  // ── Facilities ───────────────────────────────────────────────────────────────────────
  { value: 'wifi', label: 'Wi-Fi', group: 'facilities', keywords: ['internet', 'free wifi'] },
  { value: 'square-parking', label: 'Parking', group: 'facilities', keywords: ['car park', 'valet'] },
  { value: 'toilet', label: 'Toilet', group: 'facilities', keywords: ['restroom', 'wc', 'bathroom'] },
  { value: 'shower-head', label: 'Showers', group: 'facilities', keywords: ['changing room'] },
  { value: 'plug-zap', label: 'Power sockets', group: 'facilities', keywords: ['charging', 'laptop'] },
  { value: 'tv', label: 'TV / screens', group: 'facilities', keywords: ['sports', 'match'] },
  { value: 'credit-card', label: 'Card payment', group: 'facilities', keywords: ['visa', 'cashless'] },
  { value: 'banknote', label: 'Cash only', group: 'facilities', keywords: ['money'] },
  { value: 'clock', label: 'Open 24 hours', group: 'facilities', keywords: ['24/7', 'late'] },
  { value: 'bike', label: 'Delivery', group: 'facilities', keywords: ['takeaway', 'courier'] },
  { value: 'car', label: 'Drive-through', group: 'facilities', keywords: ['valet', 'car'] },
  { value: 'briefcase', label: 'Work friendly', group: 'facilities', keywords: ['laptop', 'meeting'] },

  // ── Comfort & atmosphere ─────────────────────────────────────────────────────────────
  { value: 'leaf', label: 'Calm place', group: 'comfort', keywords: ['quiet', 'peaceful', 'relax'] },
  { value: 'sun', label: 'Outdoor seating', group: 'comfort', keywords: ['terrace', 'open air'] },
  { value: 'umbrella', label: 'Shaded area', group: 'comfort', keywords: ['shade', 'cover'] },
  { value: 'snowflake', label: 'Air conditioning', group: 'comfort', keywords: ['ac', 'cool'] },
  { value: 'flame', label: 'Heating / fire pit', group: 'comfort', keywords: ['warm', 'winter'] },
  { value: 'volume-2', label: 'Live music', group: 'comfort', keywords: ['band', 'dj'] },
  { value: 'cigarette', label: 'Smoking area', group: 'comfort', keywords: ['shisha', 'hookah'] },
  { value: 'eye', label: 'Scenic view', group: 'comfort', keywords: ['nile', 'panorama', 'sunset'] },

  // ── Access & audience ────────────────────────────────────────────────────────────────
  { value: 'accessibility', label: 'Wheelchair accessible', group: 'access', keywords: ['ramp'] },
  { value: 'baby', label: 'Kids friendly', group: 'access', keywords: ['children', 'play area'] },
  { value: 'users', label: 'Family friendly', group: 'access', keywords: ['groups', 'family'] },
  { value: 'paw-print', label: 'Pet friendly', group: 'access', keywords: ['dog', 'animals'] },
  { value: 'moon-star', label: 'Prayer room', group: 'access', keywords: ['mosque', 'masjid'] },
  { value: 'shield-check', label: 'Security', group: 'access', keywords: ['safe', 'guard'] },
  { value: 'circle-parking', label: 'Valet parking', group: 'access', keywords: ['valet'] },
  { value: 'venetian-mask', label: 'Adults only', group: 'access', keywords: ['21+', 'over 18'] },
  { value: 'languages', label: 'English spoken', group: 'access', keywords: ['bilingual'] },

  // ── More facilities ──────────────────────────────────────────────────────────────────
  { value: 'wind', label: 'Ventilated / open air', group: 'facilities', keywords: ['airy'] },
  { value: 'refrigerator', label: 'Fridge / cold storage', group: 'facilities', keywords: ['cold'] },
  { value: 'washing-machine', label: 'Laundry', group: 'facilities', keywords: ['wash'] },
  { value: 'printer', label: 'Printing', group: 'facilities', keywords: ['copy', 'scan'] },
  { value: 'lock', label: 'Lockers', group: 'facilities', keywords: ['storage', 'safe'] },
  { value: 'phone', label: 'Reservations', group: 'facilities', keywords: ['booking', 'call'] },
  { value: 'calendar-check', label: 'Events / bookings', group: 'facilities', keywords: ['party'] },
  { value: 'wallet', label: 'Mobile wallet', group: 'facilities', keywords: ['instapay', 'vodafone cash'] },
  { value: 'truck', label: 'Catering', group: 'facilities', keywords: ['outside catering'] },
  { value: 'blocks', label: 'Kids play area', group: 'facilities', keywords: ['playground', 'soft play'] },

  // ── More comfort ─────────────────────────────────────────────────────────────────────
  { value: 'trees', label: 'Garden seating', group: 'comfort', keywords: ['green', 'outdoor'] },
  { value: 'armchair', label: 'Comfy seating', group: 'comfort', keywords: ['lounge', 'sofa'] },
  { value: 'moon', label: 'Open late', group: 'comfort', keywords: ['night', 'after hours'] },
  { value: 'sun-medium', label: 'Sunny terrace', group: 'comfort', keywords: ['rooftop'] },
  { value: 'mountain-snow', label: 'Mountain view', group: 'comfort', keywords: ['scenic'] },
  { value: 'ship-wheel', label: 'Sea view', group: 'comfort', keywords: ['nile view', 'water view'] },
  { value: 'party-popper', label: 'Lively', group: 'comfort', keywords: ['busy', 'vibrant'] },
  { value: 'headphones', label: 'Quiet zone', group: 'comfort', keywords: ['study', 'focus'] },
];

/** Every valid icon name, for validation and for the renderers' coverage tests. */
export const ICON_VALUES: string[] = ICONS.map((i) => i.value);

export const ICON_GROUP_LABELS: Record<IconGroup, string> = {
  places: 'Place kinds',
  food: 'Food & drink',
  facilities: 'Facilities',
  comfort: 'Comfort & atmosphere',
  access: 'Access & audience',
  general: 'General',
};

/**
 * Categories and amenities answer different questions, so they get different lists.
 *
 * A category says what a place IS ("Cafe", "Beach") — offering it "Wheelchair accessible"
 * is noise. An amenity says what a place HAS ("Wi-Fi", "Parking") — offering it "Cruise /
 * boat" is noise. Showing one combined list made both pickers long and mostly irrelevant.
 */
const CATEGORY_GROUPS: IconGroup[] = ['places', 'food', 'general'];
const AMENITY_GROUPS: IconGroup[] = ['facilities', 'comfort', 'access', 'general'];

export const CATEGORY_ICONS = ICONS.filter((i) => CATEGORY_GROUPS.includes(i.group));
export const AMENITY_ICONS = ICONS.filter((i) => AMENITY_GROUPS.includes(i.group));

export type IconScope = 'category' | 'amenity' | 'all';

export function iconsForScope(scope: IconScope): IconEntry[] {
  if (scope === 'category') return CATEGORY_ICONS;
  if (scope === 'amenity') return AMENITY_ICONS;
  return ICONS;
}
