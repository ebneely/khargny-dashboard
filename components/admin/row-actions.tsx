'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { translateDashboardCopy } from '@/lib/dashboard-copy';

export interface RowAction {
  label: string;
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  title?: string;
  traceId?: string;
}

export function RowActions({ actions, recordName }: { actions: RowAction[]; recordName: string }) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const text = (value: string) => translateDashboardCopy(value, lang);
  const [primary, ...remaining] = actions;
  const normal = remaining.filter((action) => !action.destructive);
  const destructive = remaining.filter((action) => action.destructive);
  const more = text('More actions') + ': ' + recordName;
  const item = (action: RowAction) => <DropdownMenuItem key={action.label} nativeButton={false} render={action.href ? action.external ? <a href={action.href} target="_blank" rel="noopener noreferrer" /> : <Link href={action.href} /> : undefined}
    variant={action.destructive ? 'destructive' : 'default'} className="min-h-10" onClick={action.onClick} disabled={action.disabled} title={action.title ? text(action.title) : undefined} data-trace-id={action.traceId}>{action.icon}{text(action.label)}</DropdownMenuItem>;
  return <div data-slot="row-actions" className="flex items-center justify-end gap-1">
    {primary && <Button type="button" variant="ghost" size="icon-sm" nativeButton={!primary.href} render={primary.href ? primary.external ? <a href={primary.href} target="_blank" rel="noopener noreferrer" /> : <Link href={primary.href} /> : undefined}
      onClick={primary.onClick} disabled={primary.disabled} title={primary.title ?? text(primary.label)} aria-label={text(primary.label) + ': ' + recordName} data-trace-id={primary.traceId}>{primary.icon}</Button>}
    {remaining.length > 0 && <DirectionProvider direction={lang === 'ar' ? 'rtl' : 'ltr'}><DropdownMenu><TooltipProvider><Tooltip><TooltipTrigger render={<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={more} title={more} />} />}><MoreHorizontal aria-hidden="true" /></TooltipTrigger><TooltipContent>{more}</TooltipContent></Tooltip></TooltipProvider>
      <DropdownMenuContent align="end" className="min-w-48">{normal.map(item)}{destructive.length > 0 && <DropdownMenuSeparator />}{destructive.map(item)}</DropdownMenuContent>
    </DropdownMenu></DirectionProvider>}
  </div>;
}
