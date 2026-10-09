import { AdsTop10Page } from '@/components/admin/ads-top-10-page';

export default async function AdsTop10Route({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <AdsTop10Page initialCity={typeof query.city === 'string' ? query.city : 'all'} />;
}
