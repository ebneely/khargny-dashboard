'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3, CalendarDays, ListChecks, Trophy } from 'lucide-react';
import { SegmentedNavigation } from './segmented-control';
import { DashboardText } from '@/components/admin/dashboard-text';

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
            <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>{title}</DashboardText></h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground"><DashboardText>{description}</DashboardText></p>
        </div>
        {actions && <div className="print-hide flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <SegmentedNavigation label="Ads dashboard" value={pathname.startsWith('/dashboard/ads/inventory') ? '/dashboard/ads/inventory' : pathname.startsWith('/dashboard/ads/top-10') ? '/dashboard/ads/top-10' : '/dashboard/ads'} options={ADS_NAV.map(({ href, label, icon: Icon }) => ({ value: href, href, label, icon: <Icon aria-hidden="true" /> }))} />
    </div>
  );
}
