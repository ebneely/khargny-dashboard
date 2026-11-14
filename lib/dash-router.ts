'use client';

import { useMemo } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import { langHref, useOptionalDashboardLang } from '@/lib/dashboard-lang';

/** next/navigation's router that keeps the page's language on push, replace and prefetch. */
export function useRouter() {
  const router = useNextRouter();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(langHref(href, lang), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(langHref(href, lang), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(langHref(href, lang), options),
  }), [router, lang]);
}
