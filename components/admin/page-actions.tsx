'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { DashboardText } from './dashboard-text';
import { FormActionBar } from './form-action-bar';

export interface PageAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  allowed?: boolean;
  readOnly?: boolean;
  viewerAllowed?: boolean;
  disabledReason?: string;
  disabled?: boolean;
  traceId?: string;
}

export function PageActions({ actions, form = false }: { actions: PageAction[]; form?: boolean }) {
  const viewer = useDashboardReadOnly();
  const visible = actions.filter((action) => action.allowed !== false && (!viewer || action.readOnly || action.viewerAllowed));
  if (!visible.length) return null;
  const buttons = (bottom: boolean) => visible.slice(0, 2).map((action, index) => <Button
    key={action.label} type="button" variant={bottom && index === 0 ? 'default' : 'outline'}
    nativeButton={!action.href} render={action.href ? <Link href={action.href} /> : undefined}
    onClick={action.onClick} disabled={action.disabled} title={action.disabled ? action.disabledReason : undefined} data-ro-allow={action.readOnly || action.viewerAllowed ? 'true' : undefined}
    data-trace-id={action.traceId}>
    {action.icon}<DashboardText>{action.label}</DashboardText>
  </Button>);
  return <div data-slot="page-actions" className="print-hide flex flex-wrap items-center gap-2">
    {buttons(false)}
    {!form && <FormActionBar dirty={false} saving={false}>{buttons(true)}</FormActionBar>}
  </div>;
}
