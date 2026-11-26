import { getServerSession } from '@/lib/auth-server';
import { MoodsPage } from '@/components/admin/moods/moods-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  return <MoodsPage canWrite={canWrite} />;
}
