'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import type { InboxCounts } from '@/lib/api/inbox';

/** Every Inbox queue's waiting count (GET /v1/admin/inbox), refreshed when `key` changes (the page). */
export function useInboxCounts(key?: string) {
  const [counts, setCounts] = React.useState<InboxCounts | null>(null);
  React.useEffect(() => {
    let live = true;
    // §13: the two publish queues live on the places endpoints, not the inbox counts,
    // so their badges are read beside them (limit 1: only meta.total is wanted).
    Promise.all([
      adminApi.get<{ counts?: InboxCounts }>('/v1/admin/inbox', { type: 'corrections', limit: 1 }),
      adminApi.get<{ meta?: { total?: number } }>('/v1/admin/places/complete-to-publish', { limit: 1 }).catch(() => null),
      adminApi.get<{ meta?: { total?: number } }>('/v1/admin/places/missing-check', { check: 'price', limit: 1 }).catch(() => null),
    ]).then(([res, queue, missingPrice]) => {
      if (!live) return;
      setCounts({
        ...(res.counts ?? {}),
        complete_to_publish: queue?.meta?.total ?? 0,
        missing_price: missingPrice?.meta?.total ?? 0,
      });
    }).catch(() => undefined);
    return () => { live = false; };
  }, [key]);
  return counts;
}

/**
 * People waiting: every queue except the backlogs that are not people — places without
 * hours, and the two publish queues (297 + 115 places would drown the Inbox badge).
 */
const BACKLOG_QUEUES = new Set(['no_hours', 'complete_to_publish', 'missing_price']);
export const waitingTotal = (counts: InboxCounts | null) =>
  Object.entries(counts ?? {}).reduce((sum, [queue, count]) => (BACKLOG_QUEUES.has(queue) ? sum : sum + (Number(count) || 0)), 0);
