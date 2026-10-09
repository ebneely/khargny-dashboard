import { AdsTodayPage } from '@/components/admin/ads-today-page';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';

export default async function AdsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (['state', 'placement', 'cityId', 'placeId', 'campaignIds'].some((key) => query[key])) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (typeof value === 'string') params.set(key, value);
    redirect(`/dashboard/ads/campaigns?${params}`);
  }
  const session = await getServerSession();
  return <AdsTodayPage canWrite={session?.user?.role === 'admin' || session?.user?.role === 'super_admin'} />;
}
