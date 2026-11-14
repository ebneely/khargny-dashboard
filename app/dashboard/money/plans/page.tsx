import { MoneyPlansPage } from '@/components/admin/money-plans-page';
import { getServerSession } from '@/lib/auth-server';

export default async function PlansRoute() {
  const session = await getServerSession();
  return <MoneyPlansPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
