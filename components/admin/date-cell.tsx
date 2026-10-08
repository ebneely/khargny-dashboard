'use client';

import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { dashboardDate, dashboardDateRange } from '@/lib/dashboard-date';

export function DateCell({ value }: { value?: string | null }) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  return <time dateTime={value || undefined} title={dashboardDate(value, lang, true)} className="tabular-nums text-start">{dashboardDate(value, lang)}</time>;
}


export function DateRange({ start, end }: { start?: string | null; end?: string | null }) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  return <span data-slot="date-range" className="tabular-nums" title={dashboardDate(start, lang, true) + ' — ' + dashboardDate(end, lang, true)}>{dashboardDateRange(start, end, lang)}</span>;
}
