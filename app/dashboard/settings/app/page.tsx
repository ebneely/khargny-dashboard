import { AppSettingsPage } from '@/components/admin/app-settings-page';
import { getServerSession } from '@/lib/auth-server';

export default async function Page() {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  return <AppSettingsPage canWrite={canWrite} />;
}
