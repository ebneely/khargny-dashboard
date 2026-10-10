'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { adminApi } from '@/lib/api/admin-client';
import type { PlaceDetailResponse } from '@/lib/api/subscribers';

export function AdsSubscriptionAction({ placeId, subscriptionId, name }: { placeId: string; subscriptionId: string; name: string }) {
  const copy = useDashboardCopy(); const router = useRouter(); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState(''); const writing = React.useRef(false);
  const open = async () => {
    if (writing.current) return; writing.current = true; setBusy(true); setError('');
    try { const response = await adminApi.get<PlaceDetailResponse>(`/v1/admin/places/${encodeURIComponent(placeId)}`); const place = 'place' in response ? response.place : response;
      if (!place.subscriber?.id) { setError(copy('The owner changed. Open this place to review its current subscriber.')); return; }
      router.push(`/dashboard/subscribers/${encodeURIComponent(place.subscriber.id)}?tab=subscriptions#subscription-${encodeURIComponent(subscriptionId)}`);
    } catch { setError(copy('Could not open this subscription. Try again.')); } finally { writing.current = false; setBusy(false); }
  };
  return <div><RowActions recordName={name} actions={[{ label: 'View subscription', icon: <Eye />, disabled: busy, onClick: () => { void open(); } }]} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
