import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { isEgyptianMobile } from '@/lib/api/subscribers';

export function phoneCountries(lang: 'en' | 'ar') {
  const names = new Intl.DisplayNames([lang], { type: 'region' });
  const collator = new Intl.Collator(lang);
  return getCountries().map((country) => ({ value: country, name: names.of(country) ?? country, dialCode: '+' + getCountryCallingCode(country) }))
    .sort((left, right) => left.value === 'EG' ? -1 : right.value === 'EG' ? 1 : collator.compare(left.name, right.name));
}

export function subscriberPhonePayload(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, '');
  const egyptian = isEgyptianMobile(compact);
  const number = parsePhoneNumberFromString(egyptian ? compact.replace(/^(?:\+20|0020|20)/, '0') : compact, egyptian ? 'EG' : undefined);
  if (!number?.isValid() || !egyptian && !compact.startsWith('+')) throw new Error('Enter a valid international number including its country code.');
  return number.number;
}

export function subscriberContactErrors(values: { name: string; phone: string; whatsapp: string; email: string }) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  for (const field of ['phone', 'whatsapp'] as const) {
    const value = values[field].trim();
    if (!value) { if (field === 'phone') errors.phone = 'Phone is required.'; continue; }
    try { subscriberPhonePayload(value); } catch { errors[field] = 'Enter a valid international number including its country code.'; }
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

export function phoneCountry(value: string): CountryCode {
  return parsePhoneNumberFromString(value, 'EG')?.country ?? 'EG';
}
