'use client';

import { MapPin, Building2, Shapes, FileEdit } from 'lucide-react';
import { DashboardText } from '@/components/admin/dashboard-text';
import { engagementMetrics } from '@/lib/engagement';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { AnalyticsOverview } from '@/lib/api/hooks/use-analytics';
import { StatTile } from './stat-tile';

/** Engagement and catalogue tiles: the dashboard home and the Analytics overview show the same block. */
export function InsightsSummary({ data, loading: isLoading, lang: requestedLanguage }: { data: AnalyticsOverview | null; loading: boolean; lang?: 'ar' | 'en' }) {
  const { lang: currentLanguage } = useDashboardLang();
  const lang = requestedLanguage ?? currentLanguage;
  const t = data?.totals;
  return (
    <>
      <section aria-labelledby="insights-engagement">
        <h2 id="insights-engagement" className="sr-only">
          <DashboardText>Engagement</DashboardText>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Views" value={t?.views} icon={engagementMetrics[0].icon} loading={isLoading} />
          <StatTile label="Saves" value={t?.saves} icon={engagementMetrics[1].icon} loading={isLoading} />
          <StatTile
            label="5argny taps"
            value={t?.directions ?? 0}
            icon={engagementMetrics[3].icon}
            loading={isLoading}
          />
          <StatTile label="Likes" value={t?.likes} icon={engagementMetrics[2].icon} loading={isLoading} />
          <StatTile
            label="Live places"
            value={t?.places ?? 0}
            hint={t?.draftPlaces ? `${t.draftPlaces} ${lang === 'ar' ? 'في المسودة' : 'in draft'}` : undefined}
            icon={MapPin}
            loading={isLoading}
          />
        </div>
      </section>

      {/* Catalogue size — context, deliberately quieter than engagement. */}
      <section aria-labelledby="insights-catalogue">
        <h2 id="insights-catalogue" className="sr-only">
          <DashboardText>Catalogue</DashboardText>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile label="Cities" value={t?.cities ?? 0} icon={Building2} loading={isLoading} />
          {/* Areas = distinct regions that have at least one live place, since a city can hold
              many. Counted from the byRegion breakdown the endpoint already returns. */}
          <StatTile
            label="Areas"
            value={data?.byRegion?.length ?? 0}
            hint="Across all cities"
            icon={engagementMetrics[3].icon}
            loading={isLoading}
          />
          <StatTile
            label="Categories"
            value={t?.categories ?? 0}
            icon={Shapes}
            loading={isLoading}
          />
          <StatTile
            label="Drafts"
            value={t?.draftPlaces ?? 0}
            hint="Not visible to visitors"
            icon={FileEdit}
            loading={isLoading}
          />
        </div>
      </section>
    </>
  );
}
