import { DashboardText } from '@/components/admin/dashboard-text';
import { InsightsDashboard } from '@/components/admin/insights/insights-dashboard';
import { WindowSwitch } from '@/components/admin/analytics/window-switch';

/**
 * Numbers > Places engagement: views, saves, likes and 5argny taps per city, region and place,
 * for the window chosen in the switch (aggregated in the database, never sampled).
 * The whole page is read-only, so the viewer role sees it in full.
 */
export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Places engagement</DashboardText></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <DashboardText>What visitors are doing across the catalogue.</DashboardText>
        </p>
      </div>
      <WindowSwitch />
      <InsightsDashboard />
    </div>
  );
}
