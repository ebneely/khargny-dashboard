import { Tag, BadgeCheck, MapPinCheck, Flame } from 'lucide-react';
import { engagementMetrics } from '@/lib/engagement';
import type { BadgeIconKey } from '@/lib/api/badges';

export function BadgeIcon({ icon }: { icon: BadgeIconKey }) {
  const Icon = { tag: Tag, 'price-check': BadgeCheck, mark: MapPinCheck, flame: Flame, heart: engagementMetrics.find(metric => metric.key === 'likes')!.icon, eye: engagementMetrics.find(metric => metric.key === 'views')!.icon }[icon] ?? Tag;
  return <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />;
}
