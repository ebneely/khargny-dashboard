import { getServerSession } from '@/lib/auth-server';
import { PlaceMenuPage } from '@/components/admin/place-menu-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const { id } = await params;
  return <PlaceMenuPage placeId={id} canWrite={canWrite} />;
}
