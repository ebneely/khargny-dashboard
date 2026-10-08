import { StatusBadge } from './subscriber-ui';
import type { AdCampaignState } from '@/lib/api/ads';

export function AdStateBadge({ state }: { state: AdCampaignState }) {
  return <StatusBadge status={state} />;
}
