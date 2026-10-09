'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DashboardText } from './dashboard-text';

export function SubscriberBrand({ isBrand }: { isBrand?: boolean }) {
  return isBrand === true ? <Badge variant="secondary"><Check className="size-3" aria-hidden="true" /><DashboardText>Brand</DashboardText></Badge> : null;
}
