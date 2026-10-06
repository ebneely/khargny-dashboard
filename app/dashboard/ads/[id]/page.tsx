import { AdCampaignForm } from '@/components/admin/ad-campaign-form';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';

export default async function EditAdCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  if (!canWrite) redirect('/dashboard/ads');
  const { id } = await params;
  return <AdCampaignForm campaignId={id} canWrite={canWrite} />;
}
