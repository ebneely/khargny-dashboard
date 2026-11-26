'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One toolbar rule for every dashboard page: the controls sit on one row, the same
 * gap between them, and any caption goes below the whole row — never under one
 * control, where it makes that control taller and knocks the row off its baseline.
 */
export function Toolbar({ children, caption, className }: { children: ReactNode; caption?: ReactNode; className?: string }) {
  return <div data-slot="toolbar" className={cn('min-w-0 space-y-2', className)}>
    <div data-slot="toolbar-row" className="flex min-h-8 flex-wrap items-center gap-3">{children}</div>
    {caption ? <div data-slot="toolbar-caption" className="text-xs text-muted-foreground">{caption}</div> : null}
  </div>;
}
