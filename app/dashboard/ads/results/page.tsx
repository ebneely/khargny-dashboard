import { AdsResultsPage } from '@/components/admin/ads-results-page';
import { getServerSession } from '@/lib/auth-server';

export default async function ResultsRoute() {
  const session = await getServerSession();
  return <AdsResultsPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
