'use client';

import { usePathname } from 'next/navigation';
import { PageActions, type PageAction } from './page-actions';
import { BarChart3, CalendarDays, ListChecks, Trophy, Home, Pin } from 'lucide-react';
import { SegmentedNavigation } from './segmented-control';
import { DashboardText } from '@/components/admin/dashboard-text';

const ADS_NAV = [
  { href: '/dashboard/ads', label: 'Today', icon: Home },
  { href: '/dashboard/ads/placements', label: 'Where ads appear', icon: CalendarDays },
  { href: '/dashboard/ads/campaigns', label: 'Campaigns', icon: ListChecks },
  { href: '/dashboard/ads/always-on', label: 'Always on', icon: Pin },
  { href: '/dashboard/ads/results', label: 'Results', icon: Trophy },
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

      <SegmentedNavigation label="Ads dashboard" value={pathname.startsWith('/dashboard/ads/placements') || pathname.startsWith('/dashboard/ads/top-10') ? '/dashboard/ads/placements' : pathname.startsWith('/dashboard/ads/always-on') ? '/dashboard/ads/always-on' : pathname.startsWith('/dashboard/ads/results') || pathname.startsWith('/dashboard/ads/shuffle') ? '/dashboard/ads/results' : pathname === '/dashboard/ads' ? '/dashboard/ads' : '/dashboard/ads/campaigns'} options={ADS_NAV.map(({ href, label, icon: Icon }) => ({ value: href, href, label, icon: <Icon aria-hidden="true" /> }))} />
    </div>
  );
}
