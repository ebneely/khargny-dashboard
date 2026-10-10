'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export function PageActions({ actions, form = false, mobileMirrorWhenHidden = false, scope = 'page' }: { actions: PageAction[]; form?: boolean; mobileMirrorWhenHidden?: boolean; scope?: 'page' | 'record' }) {
  const viewer = useDashboardReadOnly();
  const header = useRef<HTMLDivElement>(null);
  const [mirror, setMirror] = useState(false);
  useEffect(() => {
    if (scope === 'record' || !mobileMirrorWhenHidden || !header.current) return;
    const phone = window.matchMedia('(max-width: 639px)');
    let headerVisible = true;
    const update = () => setMirror(phone.matches && !headerVisible);
    const observer = new IntersectionObserver(([entry]) => { headerVisible = entry.isIntersecting; update(); });
    observer.observe(header.current); phone.addEventListener('change', update);
    return () => { observer.disconnect(); phone.removeEventListener('change', update); };
  }, [mobileMirrorWhenHidden, scope]);
  const visible = actions.filter((action) => action.allowed !== false && (!viewer || action.readOnly || action.viewerAllowed));
  if (!visible.length) return null;
  const buttons = (bottom: boolean) => visible.slice(0, 2).map((action, index) => <Button
    key={action.label} type="button" variant={bottom && index === 0 ? 'default' : 'outline'}
    nativeButton={!action.href} render={action.href ? <Link href={action.href} /> : undefined}
    onClick={action.onClick} disabled={action.disabled} title={action.disabled ? action.disabledReason : undefined} data-ro-allow={action.readOnly || action.viewerAllowed ? 'true' : undefined}
    data-trace-id={action.traceId}>
    {action.icon}<DashboardText>{action.label}</DashboardText>
  </Button>);
  return <div ref={header} data-slot="page-actions" data-action-scope={scope} data-mirror={scope === 'record' ? "none" : mobileMirrorWhenHidden ? "mobile-when-hidden" : "always"} className="print-hide flex flex-wrap items-center gap-2">
    {buttons(false)}
    {scope !== 'record' && !form && (!mobileMirrorWhenHidden || mirror) && <FormActionBar dirty={false} saving={false}>{buttons(true)}</FormActionBar>}
  </div>;
}
