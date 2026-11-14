import { KeywordDetailPage } from '@/components/admin/analytics/keyword-detail-page';

export default async function KeywordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KeywordDetailPage id={id} />;
}
