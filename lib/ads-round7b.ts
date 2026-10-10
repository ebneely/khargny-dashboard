import type { AdSurface, AdTarget, Agreement, ShuffleRank } from '@/lib/api/ads-round-b';
import { matchesRecord } from '@/lib/record-list';
import { isCalendarDate, calendarStamp } from '@/lib/subscription-calendar';

export const surfaceLabels = { featured: 'Home Featured rail', top10: 'Top 10', city: 'City list', area: 'Area list', category: 'Category list', search: 'Search results', section: 'Home section' } as const;
export const sourceLabels = { campaign: 'Campaign', always_on: 'By hand', plan: 'Owner Plus plan', organic: 'Organic', shuffle: 'Shuffle test' } as const;
export const promotionReasonLabels: Record<string, string> = { promotions_disabled: 'Plan promotion is switched off; subscriptions do not serve promotions.', multiple_active_subscriptions: 'Several active subscriptions need review.', media_less: 'The place needs a picture or video.', no_media: 'The place needs a picture or video.', inactive: 'The place is not active.', draft: 'The place is still a draft.', expired: 'The subscription has expired.', scheduled: 'The subscription has not started.', grace: 'The subscription is in its grace period.', manual: 'Manual access does not include plan promotion.' };
export function groupSurfaces(surfaces: AdSurface[]) {
  const groups = new Map<string, { key: string; kind: AdSurface['surface']; cityId: string | null; surfaces: AdSurface[] }>();
  for (const surface of surfaces) {
    const key = `${surface.surface}:${surface.scope.cityId ?? 'all'}`;
    if (!groups.has(key)) groups.set(key, { key, kind: surface.surface, cityId: surface.scope.cityId, surfaces: [] });
    groups.get(key)!.surfaces.push(surface);
  }
  return [...groups.values()].sort((first, second) => first.key.localeCompare(second.key));
}
export function hasFreeSpace(surface: AdSurface) { return surface.enabled && surface.sellable && (surface.totals ? surface.totals.freeDays > 0 : (surface.days ?? []).some(day => day.free > 0)); }
export function nobodyPromoted(surface: AdSurface) { return !surface.occupants.some(row => row.sponsored); }
export function filterSurfaces(surfaces: AdSurface[], filters: { query?: string; free?: boolean; empty?: boolean; kind?: string; cityId?: string }) {
  return surfaces.filter(surface => matchesRecord(`${surface.name} ${surface.scope.areaKey ?? ''} ${surface.key}`, filters.query ?? '') && (!filters.free || hasFreeSpace(surface)) && (!filters.empty || nobodyPromoted(surface)) && (!filters.kind || surface.surface === filters.kind) && (!filters.cityId || surface.scope.cityId === filters.cityId));
}
export function targetPayload(target: AdTarget): AdTarget {
  const result: AdTarget = { placement: target.placement };
  if (['top10', 'city', 'area', 'category', 'search'].includes(target.placement) && target.cityId) result.cityId = target.cityId;
  if (target.placement === 'city' && !target.cityId || target.placement === 'area' && (!target.cityId || !target.areaKey) || target.placement === 'category' && !target.categoryId || target.placement === 'section' && !target.sectionId) throw new Error('Choose a complete surface and scope.');
  if (target.placement === 'area') result.areaKey = target.areaKey;
  if (target.placement === 'category') result.categoryId = target.categoryId;
  if (target.placement === 'section') result.sectionId = target.sectionId;
  return result;
}
export function surfaceTarget(surface: AdSurface): AdTarget { return targetPayload({ placement: surface.surface, ...surface.scope }); }
export function subscriberBatch(subscriberId: string, placeIds: string[], target: AdTarget, agreement: Agreement) {
  if (!subscriberId || !placeIds.length || placeIds.length > 100 || new Set(placeIds).size !== placeIds.length) throw new Error('Choose 1 to 100 different places belonging to this subscriber.');
  return { ...agreement, ...targetPayload(target), subscriberId, placeIds };
}
export function alwaysOnPayload(placeId: string, target: AdTarget, agreement: Agreement, reason: string) {
  if (!reason.trim()) throw new Error('A reason is required for always-on promotion.');
  return { ...agreement, ...targetPayload(target), placeId, kind: 'always_on' as const, endDate: null, reason: reason.trim() };
}
export function stopPath(id: string) { return `/v1/admin/ads/campaigns/${encodeURIComponent(id)}/stop`; }
export function shufflePayload(input: { name: string; mode: 'explicit' | 'all_eligible'; placeIds?: string[]; startDate: string; endDate: string; notes?: string }, target: AdTarget) {
  if (!input.name.trim()) throw new Error('Enter a test name.');
  if (!validAdsRange(input.startDate, input.endDate, 366)) throw new Error('Choose an ordered range of at most 366 days.');
  if (input.mode === 'explicit' && (!input.placeIds || input.placeIds.length < 2 || input.placeIds.length > 1000 || new Set(input.placeIds).size !== input.placeIds.length)) throw new Error('Choose 2 to 1000 different eligible places.');
  const { placeIds, ...rest } = input;
  return { ...rest, name: input.name.trim(), ...(input.mode === 'explicit' ? { placeIds } : {}), ...targetPayload(target) };
}
export function smallShuffleSample(row: Pick<ShuffleRank, 'shown' | 'share' | 'expectedShare' | 'note'>) { return Boolean(row.note) || row.shown < 100 || row.share === null || row.share < row.expectedShare / 2; }
export function reorderPayload(order: string[], source: string, target: string) {
  if (new Set(order).size !== order.length || !order.includes(source) || !order.includes(target)) throw new Error('Reload the section order.');
  const next = [...order]; next.splice(next.indexOf(source), 1); next.splice(order.indexOf(target), 0, source);
  return { sectionIds: next, expectedOrder: [...order] };
}
export function validAdsRange(from: string, to: string, max: number) { return isCalendarDate(from) && isCalendarDate(to) && from <= to && (calendarStamp(to) - calendarStamp(from)) / 86400000 < max; }
export function adsError(error: unknown, context?: string) {
  const problem = error as { status?: number; code?: string; message?: string };
  const message = `${problem.code ?? ''} ${problem.message ?? ''}`;
  if (context === 'reorder' && problem.status === 409) return 'The section order changed. Reload it before moving a section again.';
  if (/not.*public|active|media|image|video|eligible/i.test(message)) return 'This place is not public or has no picture or video. Make it eligible before promoting it.';
  if (/capacity|full|slot/i.test(message)) return 'This target is full for those dates. Choose another range or scope.';
  if (/overlap|conflict/i.test(message) || problem.status === 409) return 'These dates overlap another booking or test. Choose another range or scope.';
  if (/belong|subscriber|ownership/i.test(message)) return 'Every selected place must belong to this active subscriber. Reload the selection.';
  if (problem.status === 403) return 'Only an admin can make this change.';
  return 'Could not complete this action. Check the fields and try again.';
}
export function campaignHref(surface: AdSurface) { return `/dashboard/ads/new?surface=${encodeURIComponent(surface.key)}`; }
