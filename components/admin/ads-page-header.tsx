'use client';

import { PageActions, type PageAction } from './page-actions';
import { BarChart3 } from 'lucide-react';
import { DashboardText } from '@/components/admin/dashboard-text';

export function AdsPageHeader({
  title,
  description,
  actions,
  form = false,
}: {
  title: string;
  description: string;
  actions?: PageAction[];
  form?: boolean;
}) {

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>{title}</DashboardText></h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground"><DashboardText>{description}</DashboardText></p>
        </div>
        {actions && <PageActions actions={actions} form={form} />}
      </div>

    </div>
  );
}
