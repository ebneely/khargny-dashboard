import { Badge } from '@/components/ui/badge';
import type { AdCampaignState } from '@/lib/api/ads';
import { cn } from '@/lib/utils';

const LABELS: Record<AdCampaignState, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  paused: 'Paused',
  ended: 'Ended',
  expired: 'Expired',
};

const STYLES: Record<AdCampaignState, string> = {
  live: 'bg-success-bg text-success',
  scheduled: 'bg-info-bg text-info',
  paused: 'bg-warning-bg text-warning',
  ended: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

export function AdStateBadge({ state }: { state: AdCampaignState }) {
  return (
    <Badge variant="secondary" className={cn('border-0', STYLES[state])}>
      {LABELS[state]}
    </Badge>
  );
}
