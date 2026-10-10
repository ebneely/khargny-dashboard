import { Tag, BadgeCheck, MapPinCheck, Flame, Heart, Eye } from 'lucide-react';
import type { BadgeIconKey } from '@/lib/api/badges';

export function BadgeIcon({ icon }: { icon: BadgeIconKey }) {
  const Icon = { tag: Tag, 'price-check': BadgeCheck, mark: MapPinCheck, flame: Flame, heart: Heart, eye: Eye }[icon];
  return <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />;
}
