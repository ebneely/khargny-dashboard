import { adminApi } from './admin-client';
import type { LiveBundle, LiveWindow } from '@/lib/live-status';

let pending: Promise<unknown> | null = null;
export async function loadLiveBundle(window: LiveWindow): Promise<LiveBundle> {
  // One request per refresh: six separate report calls every 5 s used most of the
  // backend's 100-a-minute limit per IP (#34).
  const load = () => adminApi.get<LiveBundle>('/v1/admin/analytics/live/bundle', { window, limit: 20 });
  const request = (pending ?? Promise.resolve()).catch(() => undefined).then(load); pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
