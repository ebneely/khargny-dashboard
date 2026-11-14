import { AmenitiesList } from '@/components/admin/amenities-list';
import { KeywordsPage } from '@/components/admin/analytics/keywords-page';
import { FeaturesSwitch } from '@/components/admin/features-switch';

/** Library > Features: amenities and keywords, the two kinds of filter chip a customer sees on a place. */
export default async function FeaturesRoute({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const keywords = (await searchParams).kind === 'keywords';
  return <div className="space-y-5"><FeaturesSwitch keywords={keywords} />{keywords ? <KeywordsPage /> : <AmenitiesList />}</div>;
}
