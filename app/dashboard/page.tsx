import { InsightsDashboard } from '@/components/admin/insights/insights-dashboard';

/**
 * Dashboard home — engagement insights.
 *
 * Replaces the Phase-0d placeholder. Every number here is aggregated in the database from
 * the per-place counters (GET /v1/admin/analytics/overview); nothing is sampled, estimated,
 * or hardcoded. The whole page is read-only, so the viewer role sees it in full.
 */
export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What visitors are doing across the catalogue.
        </p>
      </div>
      {/* Arabic is the product's primary language, so names lead in Arabic here too. */}
      <InsightsDashboard lang="ar" />
    </div>
  );
}
