'use client';

import { Badge } from '@/components/ui/badge';
import { trialPreset } from '@/lib/subscription-presets';
import { useDashboardCopy } from './dashboard-text';

export function TrialBadge({ planName }: { planName?: string }) {
  const copy = useDashboardCopy();
  return planName && trialPreset(planName) ? <Badge variant="secondary">{copy('Trial')}</Badge> : null;
}
