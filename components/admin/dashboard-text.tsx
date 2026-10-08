'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { translateDashboardCopy } from '@/lib/dashboard-copy';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';

export function useDashboardCopy() {
  const language = useOptionalDashboardLang()?.lang ?? 'en';
  return (value: string) => translateDashboardCopy(value, language);
}

export function DashboardHomeLink({ children }: { children: ReactNode }) {
  const copy = useDashboardCopy();
  return <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5" aria-label={copy('Khargny — dashboard home')}>{children}</Link>;
}

export function DashboardText({ children }: { children: ReactNode }) {
  const language = useOptionalDashboardLang();
  return typeof children === 'string' ? translateDashboardCopy(children, language?.lang ?? 'en') : children;
}
