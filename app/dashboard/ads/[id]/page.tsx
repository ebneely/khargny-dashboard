import { AdCampaignForm } from '@/components/admin/ad-campaign-form';

export default async function EditAdCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdCampaignForm campaignId={id} />;
}
