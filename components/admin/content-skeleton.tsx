'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';

export function ContentSkeleton() {
  const language = useOptionalDashboardLang()?.lang ?? 'en';
  return <div role="status" aria-busy="true" className="min-h-72 w-full max-w-3xl space-y-4 p-4 sm:min-h-90">
    <span className="sr-only">{language === 'ar' ? 'جارٍ تحميل المحتوى…' : 'Loading content…'}</span>
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
  </div>;
}
