'use client';

import * as React from 'react';
import Image from 'next/image';
import { CalendarDays, Search, Tag, Route, Receipt, Layers, SlidersHorizontal, KeyRound, MapPin, Shapes, Sparkles, LayoutGrid } from 'lucide-react';
import { BadgeIcon } from './badge-icon';
import type { BadgeIconKey } from '@/lib/api/badges';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';

const recordIcons = {
  badge: { icon: Sparkles, en: 'Badge', ar: 'شارة' },
  calendar: { icon: CalendarDays, en: 'Day or period', ar: 'يوم أو فترة' },
  search: { icon: Search, en: 'Search term', ar: 'كلمة بحث' },
  tag: { icon: Tag, en: 'Keyword', ar: 'كلمة مفتاحية' },
  route: { icon: Route, en: 'Page path', ar: 'مسار صفحة' },
  receipt: { icon: Receipt, en: 'Payment', ar: 'دفعة' },
  plan: { icon: Layers, en: 'Plan', ar: 'خطة' },
  override: { icon: SlidersHorizontal, en: 'Override', ar: 'استثناء' },
  key: { icon: KeyRound, en: 'API key', ar: 'مفتاح واجهة برمجية' },
  location: { icon: MapPin, en: 'Location', ar: 'موقع' },
  category: { icon: Shapes, en: 'Category', ar: 'تصنيف' },
  amenity: { icon: Sparkles, en: 'Amenity', ar: 'مرفق' },
  section: { icon: LayoutGrid, en: 'Section', ar: 'قسم' },
} as const;

export type RecordIcon = keyof typeof recordIcons;

export function RecordIconTile({ kind, badgeIcon }: { kind: RecordIcon; badgeIcon?: BadgeIconKey }) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const record = recordIcons[kind];
  const Icon = record.icon;
  return <span data-slot="record-icon" data-kind={kind} className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" role="img" aria-label={record[lang]}>
    {kind === 'badge' && badgeIcon ? <BadgeIcon icon={badgeIcon} /> : <Icon className="size-5" aria-hidden="true" />}
  </span>;
}

export function RecordThumbnail({ src, size = 40 }: { src?: string | null; size?: 40 | 48 }) {
  const [failed, setFailed] = React.useState<string | null>(null);
  return <Image src={src && failed !== src ? src : '/place-cover-placeholder.svg'} alt="" width={size} height={size}
    loading="lazy" decoding="async" unoptimized className={`${size === 40 ? 'size-10' : 'size-12'} shrink-0 rounded-lg object-cover`}
    onError={() => setFailed(src ?? null)} />;
}

export function RecordCell({ nameAr, nameEn, name, thumbnail = null, icon, badgeIcon, chips, context }: {
  nameAr?: string | null;
  nameEn?: string | null;
  name?: string;
  thumbnail?: string | null;
  icon?: RecordIcon;
  badgeIcon?: BadgeIconKey;
  chips?: React.ReactNode;
  context?: React.ReactNode;
}) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const primaryLang = name ? undefined : lang === 'ar' ? nameAr?.trim() ? 'ar' : 'en' : nameEn?.trim() ? 'en' : 'ar';
  const primary = (name ?? (primaryLang === 'ar' ? nameAr : nameEn))?.trim() || '—';
  const secondaryLang = primaryLang === 'ar' ? 'en' : 'ar';
  const other = !name ? (secondaryLang === 'ar' ? nameAr : nameEn)?.trim() : undefined;
  const secondary = other && other.toLocaleLowerCase() !== primary.toLocaleLowerCase() ? other : undefined;
  const alignment = { textAlign: lang === 'ar' ? 'right' as const : 'left' as const };
  return <div data-slot="record-cell" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={alignment} className="flex min-w-0 max-w-64 items-center gap-2 whitespace-normal leading-4">
    {icon ? <RecordIconTile kind={icon} badgeIcon={badgeIcon} /> : <RecordThumbnail src={thumbnail} />}
    <div data-slot="record-name-text" className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><span data-slot="record-name-primary" lang={primaryLang} dir="auto" style={alignment} className="min-w-0 max-w-full line-clamp-2 break-words font-medium" title={primary}>{primary}</span>{chips}</div>
      {secondary && <p data-slot="record-name-secondary" lang={secondaryLang} dir="auto" style={alignment} className="line-clamp-2 break-words text-sm leading-4 text-muted-foreground" title={secondary}>{secondary}</p>}
      {context && <p className="mt-1 break-words text-xs text-muted-foreground">{context}</p>}
    </div>
  </div>;
}
