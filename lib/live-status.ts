export const liveWindows = ['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '24h'] as const;
export type LiveWindow = typeof liveWindows[number];
export type LiveMeasure = 'visitors' | 'visits' | 'pages' | 'actions';
export interface LiveTotals { visitors: number; visits: number; pages: number; placeViews: number; actions: number; actionCounts?: Record<string, number> }
export interface LivePoint { at: string; values: LiveTotals | null }
export interface LiveMeta { generatedAt: string; window: LiveWindow; from: string; to: string; timezone: string; dropped: Record<string, number>; coverage: { complete: boolean; gaps: string[]; dimensionContributionsOmitted: number }; rankedRowsOmitted?: number }
export interface LiveSnapshot { totals: LiveTotals | null; series: LivePoint[]; complete: boolean; gaps: string[] }
export interface LiveSummary extends LiveMeta, LiveSnapshot { now: LiveSnapshot; previous: LiveSnapshot | null; previousReason?: string; stepMinutes: number }
export interface LiveRank { cover?: string | null; id: string; group: string; name: string | null; nameEn: string | null; count: number; actions: number; visitors: number | null; complete: boolean }
export interface LiveStep { kind: string; target: string; at: string; name: string | null }
export interface LiveJourney { visit: string; startedAt: string; lastActivityAt: string; durationSeconds: number; platform: string; entry: LiveStep; steps: LiveStep[]; totalSteps: number; truncated: boolean; gap: boolean }
export interface LiveBundle { summary: LiveSummary; where: LiveMeta & { platforms: LiveRank[]; languages: LiveRank[]; cities: LiveRank[] }; top: LiveMeta & { pages: LiveRank[]; places: LiveRank[] }; journeys: LiveMeta & { visits: LiveJourney[]; nextBefore: string | null }; searches: LiveMeta & { terms: { term: string; searches: number; noResults: number; clicks: number }[] }; funnel: LiveMeta & { stages: { name: string; visits: number; rateFromPrevious: number | null }[] } }
export function refreshDelay(window: LiveWindow) { return ['1m', '5m', '15m', '30m'].includes(window) ? 5000 : 60000; }
export function liveState(error: unknown) { return (error as { code?: string })?.code === 'live_disabled' ? 'disabled' : 'error'; }
export function lineSegments(series: LivePoint[], metric: LiveMeasure) {
  const segments: { at: string; value: number }[][] = []; let current: { at: string; value: number }[] = [];
  for (const point of series) {
    if (typeof point.values?.[metric] !== 'number') { if (current.length) segments.push(current); current = []; }
    else current.push({ at: point.at, value: point.values![metric] });
  }
  if (current.length) segments.push(current);
  return segments;
}
export function createLivePoller<T>(options: { window: LiveWindow; hidden: () => boolean; load: (window: LiveWindow) => Promise<T>; onResult: (result: T) => void; onError: (error: unknown) => void; scheduler: { set: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>; clear: (token: ReturnType<typeof setTimeout>) => void } }) {
  let stopped = true; let inFlight = false; let timer: ReturnType<typeof setTimeout> | undefined; let window = options.window; let generation = 0;
  const clear = () => { if (timer !== undefined) options.scheduler.clear(timer); timer = undefined; };
  const tick = async () => {
    if (stopped || inFlight || options.hidden()) return;
    inFlight = true; const requested = generation;
    try { const result = await options.load(window); if (!stopped && requested === generation && !options.hidden()) options.onResult(result); }
    catch (error) { if (!stopped && requested === generation && !options.hidden()) options.onError(error); }
    finally { inFlight = false; if (!stopped && !options.hidden()) timer = options.scheduler.set(() => { void tick(); }, requested === generation ? refreshDelay(window) : 0); }
  };
  return { start: () => { stopped = false; void tick(); }, stop: () => { stopped = true; generation++; clear(); }, setWindow: (value: LiveWindow) => { if (value === window) return; window = value; generation++; clear(); if (!inFlight) void tick(); }, visibility: () => { clear(); if (!options.hidden()) void tick(); }, refresh: () => { clear(); void tick(); } };
}
export const liveStepLabels: Record<string, string> = { page_view: 'Page viewed', place_view: 'Place opened', city_view: 'City browsed', category_view: 'Category browsed', search: 'Searched', search_signal: 'Search in progress (not counted)', search_click: 'Search result opened', directions: 'Directions tap', save: 'Saved place', love: 'Loved place', share: 'Shared place', visits: 'Visits', searchedOrBrowsedCity: 'Searched or browsed a city', openedPlace: 'Opened a place', acted: 'Acted' };
