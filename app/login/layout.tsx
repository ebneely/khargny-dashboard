import { DashboardLangProvider } from '@/lib/dashboard-lang';
import { serverLang } from '@/lib/dash-lang-server';

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLangProvider lang={await serverLang()}>{children}</DashboardLangProvider>;
}
