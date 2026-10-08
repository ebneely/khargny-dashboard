import { redirect } from 'next/navigation';

export default async function CategoryRedirect({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.append(key, value);
  }
  redirect(`/dashboard/categories/${encodeURIComponent(id)}/edit${query.size ? '?' + query : ''}`);
}
