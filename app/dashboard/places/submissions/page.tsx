import { SubmissionsPage } from '@/components/admin/submissions-page';
import { getServerSession } from '@/lib/auth-server';

export default async function SubmissionsRoute() {
  const session = await getServerSession();
  return <SubmissionsPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
