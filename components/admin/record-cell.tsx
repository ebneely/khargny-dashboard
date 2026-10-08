'use client';

import * as React from 'react';
import Image from 'next/image';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';

export function RecordThumbnail({ src, size = 40 }: { src?: string | null; size?: 40 | 48 }) {
  const [failed, setFailed] = React.useState<string | null>(null);
  return <Image src={src && failed !== src ? src : '/place-cover-placeholder.svg'} alt="" width={size} height={size}
    loading="lazy" decoding="async" unoptimized className={`${size === 40 ? 'size-10' : 'size-12'} shrink-0 rounded-lg object-cover`}
    onError={() => setFailed(src ?? null)} />;
}

export function RecordCell({ nameAr, nameEn, name, thumbnail, chips }: {
  nameAr?: string | null;
  nameEn?: string | null;
  name?: string;
  thumbnail?: string | null;
  chips?: React.ReactNode;
}) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const primaryLang = name ? undefined : lang === 'ar' ? nameAr?.trim() ? 'ar' : 'en' : nameEn?.trim() ? 'en' : 'ar';
  const primary = (name ?? (primaryLang === 'ar' ? nameAr : nameEn))?.trim() || '—';
  const secondaryLang = primaryLang === 'ar' ? 'en' : 'ar';
  const other = !name ? (secondaryLang === 'ar' ? nameAr : nameEn)?.trim() : undefined;
  const secondary = other && other.toLocaleLowerCase() !== primary.toLocaleLowerCase() ? other : undefined;
  const alignment = { textAlign: lang === 'ar' ? 'right' as const : 'left' as const };
  return <div data-slot="record-cell" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={alignment} className="flex min-w-0 max-w-64 items-center gap-2 whitespace-normal leading-4">
    {thumbnail !== undefined && <RecordThumbnail src={thumbnail} />}
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><span lang={primaryLang} dir="auto" style={alignment} className="min-w-0 max-w-full line-clamp-2 break-words font-medium" title={primary}>{primary}</span>{chips}</div>
      {secondary && <p lang={secondaryLang} dir="auto" style={alignment} className="line-clamp-2 break-words text-sm leading-4 text-muted-foreground" title={secondary}>{secondary}</p>}
    </div>
  </div>;
}
