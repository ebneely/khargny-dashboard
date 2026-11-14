import { dashRedirect } from '@/lib/dash-lang-server';
import { getServerSession } from '@/lib/auth-server';
import { SubscriberPage } from '@/components/admin/subscriber-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  if (!canWrite) await dashRedirect('/dashboard/money/owners');
  return <SubscriberPage canWrite={canWrite} />;
}
