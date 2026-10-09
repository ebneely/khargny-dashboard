import { redirect } from 'next/navigation';
import { StorefrontFooterPage } from '@/components/admin/storefront-footer-page';
import { storefrontSectionsRedirect } from '@/lib/storefront-redirect';

export default async function StorefrontPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === 'string') params.set(key, value);
  const target = storefrontSectionsRedirect(params.toString());
  if (target) redirect(target);
  return <StorefrontFooterPage />;
}
