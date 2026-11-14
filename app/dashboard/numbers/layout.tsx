import { AnalyticsShell } from '@/components/admin/analytics/analytics-shell';

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsShell>{children}</AnalyticsShell>;
}
