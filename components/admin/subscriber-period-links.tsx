'use client';

import type { Subscription } from '@/lib/api/subscribers';
import { DateRange } from './date-cell';
import { PlanChip } from './plan-choices';
import { useDashboardCopy } from './dashboard-text';

export function SubscriberPeriodLinks({ subscription, history, onNavigate }: { subscription: Subscription; history: Subscription[]; onNavigate?: (id: string) => void }) {
  const copy = useDashboardCopy();
  const previous = history.find((row) => row.id === subscription.changedFromId);
  const next = history.find((row) => row.changedFromId === subscription.id);
  return <div className="space-y-2 text-sm text-muted-foreground">{[{ label: 'Changed from period', row: previous, id: subscription.changedFromId }, { label: 'Replaced by period', row: next, id: next?.id }].filter((entry) => entry.id).map((entry) => <p key={entry.label} className="flex flex-wrap items-center gap-2">{copy(entry.label)}: <a className="underline" href={`#subscription-${entry.id}`} onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(entry.id!); } : undefined}>{entry.row ? <DateRange start={entry.row.startDate} end={entry.row.endDate} /> : entry.id}</a><PlanChip plan={entry.row?.plan} /></p>)}</div>;
}
