'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { cn } from '@/lib/utils';
import { useDashboardCopy } from './dashboard-text';

type SegmentSize = 'default' | 'compact';
export type SegmentOption = { value: string; label: string; icon?: React.ReactNode; count?: number; disabled?: boolean };
const trackClass = 'inline-flex w-fit max-w-full items-center gap-0 rounded-full bg-muted p-0.5 text-muted-foreground';
const thumbClass = 'inline-flex min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-normal whitespace-nowrap text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none data-active:bg-background data-active:text-foreground data-active:font-medium data-active:shadow-sm [&_svg]:size-4 [&_svg]:shrink-0';
const sizeClass = (size: SegmentSize) => size === 'compact' ? 'h-6 min-w-8 px-2 text-xs' : 'h-8';

export function SegmentedNavigation({ label, options, value }: { label: string; value: string; options: (SegmentOption & { href: string })[] }) {
  const copy = useDashboardCopy();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const [focused, setFocused] = React.useState(value);
  const links = React.useRef(new Map<string, HTMLAnchorElement>());
  const onKeyDown = (event: React.KeyboardEvent, option: SegmentOption) => {
    const index = options.findIndex((entry) => entry.value === option.value);
    const delta = event.key === 'ArrowRight' ? (lang === 'ar' ? -1 : 1) : event.key === 'ArrowLeft' ? (lang === 'ar' ? 1 : -1) : event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    const next = event.key === 'Home' ? options[0] : event.key === 'End' ? options.at(-1) : delta ? options[(index + delta + options.length) % options.length] : undefined;
    if (next) { event.preventDefault(); setFocused(next.value); links.current.get(next.value)?.focus(); }
  };
  return <nav aria-label={copy(label)} data-slot="segmented-control" className={cn(trackClass, 'min-h-9 flex-wrap print-hide')}>
    {options.map((option) => <Link key={option.value} href={option.href} ref={(link) => { if (link) links.current.set(option.value, link); else links.current.delete(option.value); }} tabIndex={focused === option.value ? 0 : -1} onFocus={() => setFocused(option.value)} onKeyDown={(event) => onKeyDown(event, option)} aria-current={option.value === value ? 'page' : undefined} data-active={option.value === value ? '' : undefined} className={cn(thumbClass, sizeClass('default'))}>{option.icon}{copy(option.label)}</Link>)}
  </nav>;
}

export function SegmentedTabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const copy = useDashboardCopy();
  return <TabsPrimitive.List aria-label={copy('Page sections')} {...props} data-slot="segmented-control" className={cn(trackClass, 'min-h-9 flex-wrap', className)} />;
}

export function SegmentedTabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return <TabsPrimitive.Tab {...props} data-slot="segmented-option" data-ro-allow="true" className={cn(thumbClass, sizeClass('default'), className)} />;
}

export function SegmentedControl({ label, value, options, onValueChange, size = 'default', className }: { label: string; value: string; options: SegmentOption[]; onValueChange: (value: string) => void; size?: SegmentSize; className?: string }) {
  const copy = useDashboardCopy();
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const enabled = options.filter((option) => !option.disabled);
  const current = enabled.some((option) => option.value === value) ? value : enabled[0]?.value;
  const buttons = React.useRef(new Map<string, HTMLButtonElement>());
  const onKeyDown = (event: React.KeyboardEvent, option: SegmentOption) => {
    const index = enabled.findIndex((entry) => entry.value === option.value);
    const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' ? (lang === 'ar' ? -1 : 1) : event.key === 'ArrowLeft' ? (lang === 'ar' ? 1 : -1) : 0;
    const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : delta ? enabled[(index + delta + enabled.length) % enabled.length] : undefined;
    if (!next) return;
    event.preventDefault();
    onValueChange(next.value);
    buttons.current.get(next.value)?.focus();
  };
  return <div data-slot="segmented-control" data-size={size} role="radiogroup" aria-label={copy(label)} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={cn(trackClass, size === 'compact' ? 'h-7 shrink-0' : 'min-h-9 flex-wrap', className)}>
    {options.map((option) => <Button variant="ghost" key={option.value} ref={(button) => { if (button) buttons.current.set(option.value, button); else buttons.current.delete(option.value); }} type="button" role="radio" aria-checked={option.value === value} tabIndex={option.value === current ? 0 : -1} disabled={option.disabled} data-active={option.value === value ? '' : undefined} data-ro-allow="true" className={cn(thumbClass, sizeClass(size))} onClick={() => onValueChange(option.value)} onKeyDown={(event) => onKeyDown(event, option)}>
      {option.icon}{copy(option.label)}{option.count !== undefined && <span className="tabular-nums text-muted-foreground">{option.count.toLocaleString(lang)}</span>}
    </Button>)}
  </div>;
}
