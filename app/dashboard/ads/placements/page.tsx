import { AdsPlacementsPage } from '@/components/admin/ads-placements-page';
import { getServerSession } from '@/lib/auth-server';

export default async function PlacementsRoute() {
  const session = await getServerSession();
  return <AdsPlacementsPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
