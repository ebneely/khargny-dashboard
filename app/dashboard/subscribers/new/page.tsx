import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { SubscriberPage } from '@/components/admin/subscriber-page';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  if (!canWrite) redirect('/dashboard/subscribers');
  return <SubscriberPage canWrite={canWrite} />;
}
