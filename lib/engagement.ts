import { Bookmark, Heart, Navigation, Eye } from 'lucide-react';

export const engagementMetrics = [
  { key: 'views', label: 'Views', icon: Eye },
  { key: 'saves', label: 'Saves', icon: Bookmark },
  { key: 'likes', label: 'Likes', icon: Heart },
  { key: 'directions', label: '5argny taps', icon: Navigation },
] as const;

export type EngagementMetric = typeof engagementMetrics[number]['key'];
export const engagementNumber = (value: number | null | undefined, lang: string) => typeof value === 'number' ? value.toLocaleString(lang) : '—';
