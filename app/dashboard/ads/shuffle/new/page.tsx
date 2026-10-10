import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { AdsShuffleForm } from '@/components/admin/ads-shuffle-form';
export default async function NewShufflePage() {
  const session = await getServerSession(); const canWrite = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  if (!canWrite) redirect('/dashboard/ads/results?tab=shuffle');
  return <AdsShuffleForm canWrite={canWrite} />;
}
