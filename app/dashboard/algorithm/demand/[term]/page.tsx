import { SearchTermDetailPage } from '@/components/admin/analytics/search-term-detail-page';

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  // The route param arrives percent-encoded; termRoute() encodes it again for the API, so decode exactly once here.
  let decoded = term;
  try { decoded = decodeURIComponent(term); } catch { /* malformed escape: keep the raw text */ }
  return <SearchTermDetailPage term={decoded} />;
}
