'use client';

import { useDashboardLang } from '@/lib/dashboard-lang';
import { SegmentedControl } from './segmented-control';

export function DashboardLangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useDashboardLang();
  return <SegmentedControl label="View language" size="compact" className={className} value={lang} onValueChange={(value) => setLang(value === 'ar' ? 'ar' : 'en')} options={[{ value: 'en', label: 'EN' }, { value: 'ar', label: 'ع' }]} />;
}
