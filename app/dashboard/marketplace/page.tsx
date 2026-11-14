import { getServerSession } from '@/lib/auth-server';
import { TourismPage } from '@/components/admin/tourism/tourism-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  return <TourismPage canWrite={canWrite} />;
}
