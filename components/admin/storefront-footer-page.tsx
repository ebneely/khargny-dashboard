'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardText } from './dashboard-text';
import { FooterSettingsCard } from './footer-settings-card';
import { storefrontSectionsRedirect } from '@/lib/storefront-redirect';

export function StorefrontFooterPage() {
  const router = useRouter();
  React.useEffect(() => {
    const redirect = () => {
      const target = storefrontSectionsRedirect(window.location.search, window.location.hash);
      if (target) router.replace(target);
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
  }, [router]);
  return <div className="space-y-6"><header><h1 className="font-display text-2xl font-semibold"><DashboardText>Storefront</DashboardText></h1><p className="mt-1 text-sm text-muted-foreground"><DashboardText>Manage the footer and social links shown to visitors.</DashboardText></p></header><FooterSettingsCard /></div>;
}
