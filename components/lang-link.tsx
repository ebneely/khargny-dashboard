'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { langHref, useOptionalDashboardLang } from '@/lib/dashboard-lang';

/** next/link that keeps the page's language: on an Arabic page every internal link gets the `/ar` prefix. */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const to = typeof href === 'string' ? langHref(href, lang) : href.pathname ? { ...href, pathname: langHref(href.pathname, lang) } : href;
  return <NextLink href={to} {...props} />;
}
