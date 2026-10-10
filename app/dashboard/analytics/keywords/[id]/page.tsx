import { redirect } from 'next/navigation';

export default async function LegacyKeywordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/tags/${id}`);
}
