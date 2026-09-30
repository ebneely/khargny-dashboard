'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3, CalendarDays, ListChecks, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADS_NAV = [
  { href: '/dashboard/ads', label: 'Campaigns', icon: ListChecks },
  { href: '/dashboard/ads/inventory', label: 'Inventory', icon: CalendarDays },
  { href: '/dashboard/ads/top-10', label: 'Top 10 preview', icon: Trophy },
] as const;

export function AdsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="print-hide flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <nav className="print-hide flex max-w-full gap-1 overflow-x-auto border-b" aria-label="Ads dashboard">
        {ADS_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard/ads'
            ? !pathname.startsWith('/dashboard/ads/inventory') && !pathname.startsWith('/dashboard/ads/top-10')
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
