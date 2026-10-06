import { AdCampaignForm } from '@/components/admin/ad-campaign-form';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';

export default async function NewAdCampaignPage() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  if (!canWrite) redirect('/dashboard/ads');
  return <AdCampaignForm canWrite={canWrite} />;
}
