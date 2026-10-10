import { redirect } from 'next/navigation';

export default async function LegacyTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/analytics/keywords/${id}`);
}
