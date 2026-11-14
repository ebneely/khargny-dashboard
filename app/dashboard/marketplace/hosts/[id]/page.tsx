import { getServerSession } from '@/lib/auth-server';
import { ListerPage } from '@/components/admin/tourism/lister-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  // KYC photos are admin-only on the API, so viewers get a line instead of broken images.
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const { id } = await params;
  return <ListerPage listerId={id} canWrite={canWrite} canSeeDocuments={canWrite} />;
}
