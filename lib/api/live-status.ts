import { adminApi } from './admin-client';
import type { LiveBundle, LiveWindow } from '@/lib/live-status';

let pending: Promise<unknown> | null = null;
export async function loadLiveBundle(window: LiveWindow): Promise<LiveBundle> {
  const load = async () => {
    const summary = await adminApi.get<LiveBundle['summary']>('/v1/admin/analytics/live/summary', { window });
    const reports = await Promise.allSettled([
      adminApi.get<LiveBundle['where']>('/v1/admin/analytics/live/where', { window }),
      adminApi.get<LiveBundle['top']>('/v1/admin/analytics/live/top', { window }),
      adminApi.get<LiveBundle['journeys']>('/v1/admin/analytics/live/journeys', { window, limit: 20 }),
      adminApi.get<LiveBundle['searches']>('/v1/admin/analytics/live/searches', { window }),
      adminApi.get<LiveBundle['funnel']>('/v1/admin/analytics/live/funnel', { window }),
    ] as const);
    for (const report of reports) if (report.status === 'rejected') throw report.reason;
    const [where, top, journeys, searches, funnel] = reports;
    if (where.status !== 'fulfilled' || top.status !== 'fulfilled' || journeys.status !== 'fulfilled' || searches.status !== 'fulfilled' || funnel.status !== 'fulfilled') throw new Error('Live report unavailable');
    return { summary, where: where.value, top: top.value, journeys: journeys.value, searches: searches.value, funnel: funnel.value };
  };
  const request = (pending ?? Promise.resolve()).catch(() => undefined).then(load); pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
