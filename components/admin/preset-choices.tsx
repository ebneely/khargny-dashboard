'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PresetChoices({ label, value, options, disabled, onValueChange }: { label: string; value: string | null; disabled?: boolean; options: { value: string; label: string; disabled?: boolean; reason?: string }[]; onValueChange: (value: string) => void }) {
  return <div role="group" aria-label={label} className="flex flex-wrap items-start gap-2" data-slot="preset-choices">{options.map((option) => <div key={option.value} className="max-w-full space-y-1">
    <Button type="button" variant="outline" size="sm" aria-pressed={value === option.value} disabled={disabled || option.disabled} title={option.reason} className={cn('max-w-full rounded-full', value === option.value && 'border-primary bg-primary/10 text-foreground font-medium')} onClick={() => onValueChange(option.value)}>{option.label}</Button>
    {option.reason && <p className="max-w-44 text-xs text-muted-foreground">{option.reason}</p>}
  </div>)}</div>;
}
