import { SearchTermDetailPage } from '@/components/admin/analytics/search-term-detail-page';

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  return <SearchTermDetailPage term={term} />;
}
