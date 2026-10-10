'use client';

import { Badge } from '@/components/ui/badge';
import type { PlanCatalogueRow, PlanKey } from '@/lib/api/plans';
import { PLUS_PROMOTION_NOTE } from '@/lib/subscription-plans';
import { useDashboardCopy } from './dashboard-text';
import { SegmentedControl } from './segmented-control';

export function PlanChip({ plan }: { plan?: PlanKey }) {
  const copy = useDashboardCopy();
  return plan ? <Badge variant="outline">{copy(plan === 'owner_plus' ? 'Owner Plus' : 'Owner')}</Badge> : null;
}
export function PromotionNote({ plan, enabled }: { plan: PlanKey; enabled: boolean }) {
  const copy = useDashboardCopy();
  return plan === 'owner_plus' && !enabled ? <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{copy(PLUS_PROMOTION_NOTE)}</p> : null;
}
export function PlanChoices({ value, onValueChange, catalogue, disabled }: { value: PlanKey; onValueChange: (plan: PlanKey) => void; catalogue: PlanCatalogueRow[]; disabled?: boolean }) {
  const copy = useDashboardCopy();
  return <div className="space-y-2"><SegmentedControl label={copy('Plan')} value={value} onValueChange={(next) => onValueChange(next as PlanKey)} options={(['owner', 'owner_plus'] as const).map((plan) => ({ value: plan, label: copy(plan === 'owner' ? 'Owner' : 'Owner Plus'), disabled: disabled || !catalogue.length }))} />{catalogue.length > 0 && !catalogue.some((row) => row.plan === value && row.active) && <p role="status" className="text-sm text-muted-foreground">{copy('This plan is unavailable. Choose an active plan.')}</p>}</div>;
}
