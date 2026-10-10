import { adminApi, toList } from './admin-client';

export const KEYWORD_GROUPS = ['cuisine', 'vibe', 'occasion', 'activity', 'audience', 'feature', 'price', 'other'] as const;
export type KeywordGroup = typeof KEYWORD_GROUPS[number];
export interface KeywordConcept { id: string; name: string; nameEn: string | null; slug: string; aliases: string[]; group: KeywordGroup; notes: string | null; }
export interface Keyword extends KeywordConcept { placeCount: number; }
export interface PageMeta { total: number; skip: number; limit: number; }
export interface ReportPage<T> { data: T[]; meta: PageMeta; }
export interface InsightQuery { from: string; to: string; platform?: 'app' | 'web' | 'unknown'; cityId?: string; }
export interface ReportScope { from: string; to: string; platform: 'all' | 'app' | 'web' | 'unknown'; cityId?: string | null; }
export interface TermRow {
  term: string; searches: number; zeroResults: number; clicks: number; previousSearches: number; zeroResultShare: number; clickShare: number;
  trend: { current: number; previous: number; change: number; share: number | null };
  keyword: { id: string; name: string } | null;
  topClickedPlaces: { term: string; placeId: string; name: string | null; nameEn: string | null; clicks: number }[];
}

export async function loadInsightOptions<T>(route: '/v1/admin/cities' | '/v1/admin/categories') {
  const rows: T[] = [];
  while (true) {
    const page = toList<T>(await adminApi.get(route, route === '/v1/admin/cities' ? { skip: rows.length, limit: 100 } : undefined));
    rows.push(...page.items);
    if (rows.length >= page.total) return rows;
    if (!page.items.length) throw new Error('Incomplete selector options');
  }
}
export interface GapRow extends TermRow { lostSearches: number; suggestedKeywords: { id: string; name: string }[]; }
export interface TermDay { day: string; searches: number; zeroResults: number; clicks: number; }
export interface Decision { term: string; action: 'alias' | 'ignore'; tagId: string | null; aliasText: string | null; aliasAdded: 'yes' | 'no'; adminId: string; createdAt: string; }
export interface TermDetail extends ReportScope { term: string; decision: Decision | null; keyword: KeywordConcept | null; series: TermDay[]; cities: ReportPage<Record<string, unknown>>; clickedPlaces: ReportPage<Record<string, unknown>>; placesThatWouldMatchNow: ReportPage<Record<string, unknown>>; }
export interface Funnel { sessions: number; searched: number; viewedPlace: number; acted: number; placeViews: number; actedPlaceViews: number; searchRate: number; placeViewRate: number; actionRate: number; placeActionRate: number; }
export interface Movement extends ReportScope { entries: ReportPage<{ path: string; count: number }>; exits: ReportPage<{ path: string; count: number }>; transitions: ReportPage<{ fromPath: string; toPath: string; count: number }>; funnel: { totals: Funnel; series: (Funnel & { day?: string; platform?: string })[] }; }
export interface KeywordPlace { cover?: string | null; id: string; name: string; nameEn: string | null; cityId: string; categoryId: string; status: string; }
export interface AssignmentSelector { cityId?: string; categoryId?: string; region?: string; search?: string; hasAmenityId?: string; placeIds?: string[]; }
export type AssignmentBody = { add: string[]; remove: string[]; dryRun: boolean; planDigest?: string } | { tagIds: string[]; where: AssignmentSelector; mode: 'add' | 'remove'; dryRun: boolean; planDigest?: string };
export interface AssignmentPreview { dryRun: boolean; planDigest: string; selectedPlaces: { cover?: string | null; id: string; name: string; cityId: string; categoryId: string; region: string | null }[]; changes: { placeId: string; tagId: string; mode: 'add' | 'remove' }[]; added: number; removed: number; }
export const termRoute = (term: string) => `/v1/admin/analytics/search/terms/${encodeURIComponent(term)}`;
export const resolveTerm = (term: string, tagId?: string) => adminApi.post<Decision>(`${termRoute(term)}/resolve`, tagId ? { action: 'alias', tagId } : { action: 'ignore' });
export const reverseTerm = (term: string) => adminApi.delete<{ reversed: boolean; term: string; aliasRemoved: boolean }>(`${termRoute(term)}/resolve`);
export const assignmentRoute = (id: string, body: AssignmentBody) => 'where' in body ? '/v1/admin/tags/bulk-assign' : `/v1/admin/tags/${id}/places`;
export const previewAssignment = (id: string, body: AssignmentBody) => adminApi.post<AssignmentPreview>(assignmentRoute(id, body), { ...body, dryRun: true });
export const applyAssignment = (id: string, body: AssignmentBody, preview: AssignmentPreview) => adminApi.post<AssignmentPreview>(assignmentRoute(id, body), { ...body, dryRun: false, planDigest: preview.planDigest });

export async function searchOverview(query: InsightQuery) {
  let skip = 0;
  const totals = { searches: 0, zeroResults: 0, clicks: 0, terms: [] as TermRow[] };
  while (true) {
    const page = await adminApi.get<ReportPage<TermRow>>('/v1/admin/analytics/search/terms', { ...query, skip, limit: 200 });
    totals.terms.push(...page.data);
    for (const row of page.data) { totals.searches += row.searches; totals.zeroResults += row.zeroResults; totals.clicks += row.clicks; }
    skip += page.data.length;
    if (skip >= page.meta.total) return totals;
    if (!page.data.length) throw new Error('Incomplete search report');
  }
}
