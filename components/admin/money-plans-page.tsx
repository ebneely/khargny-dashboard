'use client';

import * as React from 'react';
import { Receipt } from 'lucide-react';
import { SubscriberPlans } from './subscriber-plans';
import { SubscriberRenewalContact } from './subscriber-renewal-contact';
import { useDashboardCopy } from './dashboard-text';

/** Money > Plans and prices: the plans owners buy and the renewal contact (was Subscribers > Settings). */
export function MoneyPlansPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  // One save bar at a time: the form edited last owns it.
  const [form, setForm] = React.useState<'contact' | 'plans'>('plans');
  return <div className="space-y-6">
    <header><h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Receipt className="size-5 text-primary" aria-hidden="true" />{copy('Plans and prices')}</h1><p className="mt-1 text-sm text-muted-foreground">{copy('What owners can buy, and who they contact to renew.')}</p></header>
    <SubscriberPlans canWrite={canWrite} active={form === 'plans'} onEdit={() => setForm('plans')} />
    <SubscriberRenewalContact canWrite={canWrite} active={form === 'contact'} onEdit={() => setForm('contact')} />
  </div>;
}
