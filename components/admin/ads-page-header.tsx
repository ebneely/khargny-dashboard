'use client';

import { usePathname } from 'next/navigation';
import { PageActions, type PageAction } from './page-actions';
import { BarChart3, CalendarDays, ListChecks, Trophy, Home, Pin } from 'lucide-react';
import { SegmentedNavigation } from './segmented-control';
import { DashboardText } from '@/components/admin/dashboard-text';

const ADS_NAV = [
  { href: '/dashboard/money/ads', label: 'Today', icon: Home },
  { href: '/dashboard/money/ads/placements', label: 'Where ads appear', icon: CalendarDays },
  { href: '/dashboard/money/ads/campaigns', label: 'Campaigns', icon: ListChecks },
  { href: '/dashboard/money/ads/always-on', label: 'Always on', icon: Pin },
  { href: '/dashboard/money/ads/results', label: 'Results', icon: Trophy },
] as const;

export function AdsPageHeader({
  title,
  description,
  actions,
  form = false,
}: {
  title: string;
  description: string;
  actions?: PageAction[];
  form?: boolean;
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
        {actions && <PageActions actions={actions} form={form} />}
      </div>

      <SegmentedNavigation label="Ads dashboard" value={pathname.startsWith('/dashboard/money/ads/placements') || pathname.startsWith('/dashboard/money/ads/top-10') ? '/dashboard/money/ads/placements' : pathname.startsWith('/dashboard/money/ads/always-on') ? '/dashboard/money/ads/always-on' : pathname.startsWith('/dashboard/money/ads/results') || pathname.startsWith('/dashboard/money/ads/shuffle') ? '/dashboard/money/ads/results' : pathname === '/dashboard/money/ads' ? '/dashboard/money/ads' : '/dashboard/money/ads/campaigns'} options={ADS_NAV.map(({ href, label, icon: Icon }) => ({ value: href, href, label, icon: <Icon aria-hidden="true" /> }))} />
    </div>
  );
}
