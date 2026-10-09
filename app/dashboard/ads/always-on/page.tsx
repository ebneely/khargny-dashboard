import { AdsAlwaysOnPage } from '@/components/admin/ads-always-on-page';
import { getServerSession } from '@/lib/auth-server';

export default async function AlwaysOnRoute() {
  const session = await getServerSession();
  return <AdsAlwaysOnPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
