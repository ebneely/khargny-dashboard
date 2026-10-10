'use client';

import { Badge } from '@/components/ui/badge';
import { trialPreset } from '@/lib/subscription-presets';
import { useDashboardCopy } from './dashboard-text';
import type { PlanKind } from '@/lib/api/plans';

export function TrialBadge({ planName = '', planKind }: { planName?: string; planKind?: PlanKind }) {
  const copy = useDashboardCopy();
  return trialPreset(planName, planKind) ? <Badge variant="secondary">{copy('Trial')}</Badge> : null;
}
