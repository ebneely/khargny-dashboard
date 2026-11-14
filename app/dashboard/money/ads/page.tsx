import { AdsCampaignsPage } from '@/components/admin/ads-campaigns-page';
import { getServerSession } from '@/lib/auth-server';

/** Money > Ads: every ad that runs, ran or will run, in one list (no seats, DIRECTION section 2). */
export default async function AdsPage() {
  const session = await getServerSession();
  return <AdsCampaignsPage initialFilters={{}} canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
