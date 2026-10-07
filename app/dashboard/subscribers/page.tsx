import { getServerSession } from '@/lib/auth-server';
import { SubscribersPage } from '@/components/admin/subscribers-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  return <SubscribersPage canWrite={canWrite} />;
}
