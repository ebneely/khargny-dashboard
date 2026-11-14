'use client';

// Search: what people searched, what the search learned from them (decision 0007), and the settings for both.
import { SearchTermsPage } from './search-terms-page';
import { LearnedKeywords } from './learned-keywords';
import { useDashboardCopy } from '../dashboard-text';
import { SearchSuggestionsSettings } from '../search-suggestions-settings';
import { SelfLearningSettings } from '../self-learning-settings';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlTabs, UrlTabsContent } from '@/components/ui/url-tabs';

export function SearchTabs() {
  const copy = useDashboardCopy();
  return <UrlTabs values={['terms', 'learned', 'settings']}>
    <TabsList aria-label={copy('Search sections')}>
      <TabsTrigger value="terms">{copy('Search terms')}</TabsTrigger>
      <TabsTrigger value="learned">{copy('Learned words')}</TabsTrigger>
      <TabsTrigger value="settings">{copy('Search settings')}</TabsTrigger>
    </TabsList>
    <UrlTabsContent value="terms" className="mt-6"><SearchTermsPage /></UrlTabsContent>
    <UrlTabsContent value="learned" lazy className="mt-6"><LearnedKeywords /></UrlTabsContent>
    <UrlTabsContent value="settings" lazy className="mt-6 space-y-6"><SearchSuggestionsSettings /><SelfLearningSettings /></UrlTabsContent>
  </UrlTabs>;
}
