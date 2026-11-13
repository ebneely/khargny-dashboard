import { CollectionsPage } from '@/components/admin/collections-page';
import { getServerSession } from '@/lib/auth-server';

export default async function CollectionsRoute() {
  const session = await getServerSession();
  return <CollectionsPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
