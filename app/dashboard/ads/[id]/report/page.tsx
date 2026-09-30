import { AdReportPage } from '@/components/admin/ad-report-page';

export default async function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdReportPage campaignId={id} />;
}
