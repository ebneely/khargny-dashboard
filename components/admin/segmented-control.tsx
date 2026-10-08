'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from './dashboard-text';

export function SegmentedControl({ label, value, options, onValueChange }: { label: string; value: string; options: { value: string; label: string; count?: number; disabled?: boolean }[]; onValueChange: (value: string) => void }) {
  const copy = useDashboardCopy();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  return <Tabs data-slot="segmented-control" className="w-fit max-w-full" value={value} onValueChange={onValueChange}><TabsList aria-label={copy(label)} className="justify-start">{options.map((option) => <TabsTrigger className="min-h-10 flex-none" data-ro-allow="true" key={option.value} value={option.value} disabled={option.disabled}>{copy(option.label)}{option.count !== undefined && <span className="tabular-nums text-muted-foreground">{option.count.toLocaleString(lang)}</span>}</TabsTrigger>)}</TabsList></Tabs>;
}
