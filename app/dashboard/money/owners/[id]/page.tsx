import { getServerSession } from '@/lib/auth-server';
import { SubscriberPage } from '@/components/admin/subscriber-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const { id } = await params;
  return <SubscriberPage subscriberId={id} canWrite={canWrite} />;
}
