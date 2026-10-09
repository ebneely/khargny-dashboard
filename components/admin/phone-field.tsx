'use client';

import * as React from 'react';
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { phoneCountries, phoneCountry } from '@/lib/subscriber-phone';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from './dashboard-text';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PhoneField({ id, value, onChange, onBlur, disabled, required, error, showError = true }: {
  id: string; value: string; onChange: (value: string) => void; onBlur?: () => void;
  disabled?: boolean; required?: boolean; error?: string; showError?: boolean;
}) {
  const { lang } = useDashboardLang();
  const copy = useDashboardCopy();
  const options = React.useMemo(() => phoneCountries(lang), [lang]);
  const [country, setCountry] = React.useState<CountryCode>(() => phoneCountry(value));
  const [draft, setDraft] = React.useState(() => parsePhoneNumberFromString(value, 'EG')?.formatNational() ?? value);
  const emitted = React.useRef(value);
  React.useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const number = parsePhoneNumberFromString(value, 'EG');
    setCountry(number?.country ?? 'EG');
    setDraft(number?.formatNational() ?? value);
  }, [value]);
  const format = (raw: string, selected: CountryCode) => {
    const formatter = new AsYouType(selected);
    const formatted = formatter.input(raw);
    setDraft(formatted);
    const actualCountry = formatter.getCountry();
    if (actualCountry) setCountry(actualCountry);
    emitted.current = formatter.getNumberValue() ?? '';
    onChange(emitted.current);
  };
  return <div className="min-w-0 space-y-1">
    <div className="flex min-w-0 flex-wrap gap-2">
      <Select value={country} onValueChange={(next) => { if (!next) return; setCountry(next as CountryCode); setDraft(''); emitted.current = ''; onChange(''); }}>
        <SelectTrigger disabled={disabled} className="w-full min-w-0 sm:w-44" aria-label={copy('Country code')}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}><span aria-hidden="true">{String.fromCodePoint(...[...option.value].map((letter) => 127397 + letter.charCodeAt(0)))}</span> {option.name} <span dir="ltr">{option.dialCode}</span></SelectItem>)}</SelectContent>
      </Select>
      <Input id={id} className="min-w-0 flex-1 basis-40" type="tel" inputMode="tel" autoComplete={id.includes('whatsapp') ? 'off' : 'tel-national'} dir="ltr" value={draft} disabled={disabled} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? id + '-error' : undefined} onBlur={onBlur} onChange={(event) => format(event.target.value, country)} />
    </div>
    {showError && error && <p id={id + '-error'} role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
