/**
 * The two things a mood carries besides its names: a lucide icon name and an accent token
 * name. Both are strings stored by the backend and rendered by every surface, so the same
 * mood looks the same on the dashboard, the website and the app. Accents are tokens, never
 * raw colours: a client maps a token to its own palette (light/dark).
 */

export interface MoodIconEntry {
  value: string;
  label: string;
}

/** The mood row's own set: the eight seeds plus the alternates an admin can pick. */
export const MOOD_ICONS: MoodIconEntry[] = [
  { value: 'coffee', label: 'Coffee' },
  { value: 'heart', label: 'Heart' },
  { value: 'moon-star', label: 'Moon and stars' },
  { value: 'users', label: 'Family' },
  { value: 'party-popper', label: 'Party' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'utensils', label: 'Utensils' },
  { value: 'compass', label: 'Compass' },
  { value: 'cake-slice', label: 'Cake' },
  { value: 'wine', label: 'Wine' },
  { value: 'music', label: 'Music' },
  { value: 'waves', label: 'Waves' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'trees', label: 'Trees' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'flame', label: 'Flame' },
  { value: 'star', label: 'Star' },
  { value: 'moon', label: 'Moon' },
  { value: 'sun', label: 'Sun' },
];

export interface MoodAccentEntry {
  value: string;
  label: string;
  /** The tile / chosen chip. */
  chip: string;
  /** The small solid dot the list uses to read the accent at a glance. */
  dot: string;
  /** The fit bar in the preview. */
  bar: string;
}

export const MOOD_ACCENTS: MoodAccentEntry[] = [
  { value: 'sky', label: 'Sky', chip: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  { value: 'rose', label: 'Rose', chip: 'bg-rose-500/12 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  { value: 'amber', label: 'Amber', chip: 'bg-amber-500/12 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  { value: 'violet', label: 'Violet', chip: 'bg-violet-500/12 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  { value: 'slate', label: 'Slate', chip: 'bg-slate-500/12 text-slate-700 dark:text-slate-300', dot: 'bg-slate-500', bar: 'bg-slate-500' },
  { value: 'orange', label: 'Orange', chip: 'bg-orange-500/12 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  { value: 'emerald', label: 'Emerald', chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  { value: 'gold', label: 'Gold', chip: 'bg-yellow-500/12 text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', bar: 'bg-yellow-500' },
  { value: 'accent', label: 'Brand accent', chip: 'bg-primary/12 text-primary', dot: 'bg-primary', bar: 'bg-primary' },
];

const FALLBACK_ACCENT = MOOD_ACCENTS[MOOD_ACCENTS.length - 1];
const FALLBACK_ICON = 'sparkles';

export const accentOf = (value: string | null | undefined) =>
  MOOD_ACCENTS.find((accent) => accent.value === value) ?? FALLBACK_ACCENT;

export const moodIconName = (value: string | null | undefined) =>
  MOOD_ICONS.some((icon) => icon.value === value) ? value! : FALLBACK_ICON;

/** The weight levels a chip cycles through: off, then 1 to 3. */
export const WEIGHT_LEVELS = [0, 1, 2, 3] as const;
export type WeightLevel = (typeof WEIGHT_LEVELS)[number];

export const nextWeight = (current: number): WeightLevel =>
  WEIGHT_LEVELS[((WEIGHT_LEVELS.indexOf(current as WeightLevel) + 1) % WEIGHT_LEVELS.length)];
