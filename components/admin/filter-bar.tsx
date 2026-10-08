'use client';

import type { CSSProperties, ReactNode, ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardCopy } from './dashboard-text';

export function FilterBar({ filters, children }: { filters: number; children: ReactNode }) {
  return <div data-slot="filter-bar" style={{ '--filter-count': filters } as CSSProperties}>{children}</div>;
}

export function FilterSearch({ label, ...props }: Omit<ComponentProps<typeof Input>, 'placeholder' | 'aria-label'> & { label: string }) {
  const copy = useDashboardCopy();
  return <div data-slot="filter-search" className="relative min-w-0"><Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input data-ro-allow="true" {...props} placeholder={copy(label)} aria-label={copy(label)} className="ps-9" /></div>;
}

export function FilterSelect({ label, value, options, onValueChange }: { label: string; value: string; options: { value: string; label: string }[]; onValueChange: (value: string) => void }) {
  const copy = useDashboardCopy();
  return <Select value={value} onValueChange={(next) => { if (next) onValueChange(next); }}><SelectTrigger data-ro-allow="true" className="w-full" aria-label={copy(label)}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{copy(option.label)}</SelectItem>)}</SelectContent></Select>;
}
