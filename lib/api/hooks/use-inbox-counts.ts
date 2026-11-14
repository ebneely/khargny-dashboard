'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import type { InboxCounts } from '@/lib/api/inbox';

/** Every Inbox queue's waiting count (GET /v1/admin/inbox), refreshed when `key` changes (the page). */
export function useInboxCounts(key?: string) {
  const [counts, setCounts] = React.useState<InboxCounts | null>(null);
  React.useEffect(() => {
    let live = true;
    adminApi.get<{ counts?: InboxCounts }>('/v1/admin/inbox', { type: 'corrections', limit: 1 })
      .then((res) => { if (live) setCounts(res.counts ?? {}); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [key]);
  return counts;
}

/** People waiting: every queue except the places-without-hours backlog. */
export const waitingTotal = (counts: InboxCounts | null) =>
  Object.entries(counts ?? {}).reduce((sum, [queue, count]) => (queue === 'no_hours' ? sum : sum + (Number(count) || 0)), 0);
