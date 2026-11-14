import { SearchTermsPage } from '@/components/admin/analytics/search-terms-page';
import { SearchSuggestionsSettings } from '@/components/admin/search-suggestions-settings';

export default function TermsPage() { return <div className="space-y-6"><SearchSuggestionsSettings /><SearchTermsPage /></div>; }
