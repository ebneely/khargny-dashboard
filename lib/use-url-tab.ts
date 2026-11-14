'use client';

import { useSearchParams } from 'next/navigation';

/** `renamed` maps tab values from older links to the tab that now holds them, so saved ?tab= links keep working. */
export function useUrlTab(values: readonly string[], defaultValue = values[0], parameter = 'tab', renamed: Record<string, string> = {}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get(parameter);
  const requested = raw === null ? null : renamed[raw] ?? raw;
  const value = requested === null ? defaultValue : values.includes(requested) ? requested : values[0];
  const onValueChange = (nextValue: unknown) => {
    if (typeof nextValue !== 'string' || !values.includes(nextValue)) return;
    const params = new URLSearchParams(window.location.search);
    params.set(parameter, nextValue);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
  };
  return { value, onValueChange };
}
