'use client';

import { Input } from '@/components/ui/input';
import type { ManagedBadge } from '@/lib/api/badges';
import { badgeMetric, type RuleControls } from '@/lib/badge-rules';
import { useDashboardCopy } from './dashboard-text';
import { SubscriberSelect, useSubscriberText } from './subscriber-ui';

export function BadgeRuleFields({ badge, value, onChange, disabled, error }: { badge: ManagedBadge; value: RuleControls; onChange: (value: RuleControls) => void; disabled?: boolean; error?: string }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const update = (name: keyof RuleControls, next: string) => onChange({ ...value, [name]: next });
  return <fieldset disabled={disabled} className="min-w-0 space-y-3"><legend className="mb-2 font-medium">{copy('Rule')}</legend>
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-3 text-sm"><span>{copy('Give it to the top')}</span>
      <div className="w-24"><SubscriberSelect aria-label={copy('Winners per scope')} value={value.winners} disabled={disabled} onValueChange={(next) => update('winners', next)} options={Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: (index + 1).toLocaleString(lang) }))} /></div>
      <span>{copy('places in each')}</span><div className="w-48 max-w-full"><SubscriberSelect aria-label={copy('Award scope')} value={value.scope} disabled={disabled} onValueChange={(next) => update('scope', next)} options={[{ value: 'city', label: copy('City') }, { value: 'city_category', label: copy('City and category') }]} /></div>
      <span>{copy('by')} {badge.rule && copy(badgeMetric[badge.rule.measure])} {copy('over')}</span><div className="w-40 max-w-full"><SubscriberSelect aria-label={copy('Activity window')} value={value.windowDays} disabled={disabled} onValueChange={(next) => update('windowDays', next)} options={['7', '30', '90', 'all'].map((days) => ({ value: days, label: copy(days === 'all' ? 'All time' : `${days} days`) }))} /></div>
      <span>{copy('if they have at least')}</span><div className="w-36 max-w-full"><Input aria-label={copy('Minimum activity')} aria-invalid={Boolean(error)} inputMode="numeric" type="text" value={value.floor} onChange={(event) => update('floor', event.target.value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))))} /></div>
    </div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </fieldset>;
}
