import { getServerSession } from '@/lib/auth-server';
import { BadgesPage } from '@/components/admin/badges-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  return <BadgesPage canWrite={canWrite} />;
}
