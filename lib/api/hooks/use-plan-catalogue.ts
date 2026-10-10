'use client';

import * as React from 'react';
import { plansApi } from '../plans';
import { useSubscriberResource } from './use-subscriber-resource';

export function usePlanCatalogue() {
  const load = React.useCallback(async () => {
    const [plans, report] = await Promise.all([plansApi.catalogue(), plansApi.promotions().catch(() => null)]);
    return { plans, promotionsEnabled: report?.planPromotionsEnabled ?? false };
  }, []);
  return useSubscriberResource(load);
}
