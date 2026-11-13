import { InboxPage } from '@/components/admin/inbox-page';
import { getServerSession } from '@/lib/auth-server';

export default async function InboxRoute() {
  const session = await getServerSession();
  return <InboxPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
