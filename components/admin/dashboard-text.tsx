'use client';

import type { ReactNode } from 'react';
import { translateDashboardCopy } from '@/lib/dashboard-copy';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';

export function DashboardText({ children }: { children: ReactNode }) {
  const language = useOptionalDashboardLang();
  return typeof children === 'string' ? translateDashboardCopy(children, language?.lang ?? 'en') : children;
}
