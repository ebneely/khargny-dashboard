'use client';

import { useSearchParams } from 'next/navigation';

export function useUrlTab(values: readonly string[], defaultValue = values[0], parameter = 'tab') {
  const searchParams = useSearchParams();
  const requested = searchParams.get(parameter);
  const value = requested === null ? defaultValue : values.includes(requested) ? requested : values[0];
  const onValueChange = (nextValue: unknown) => {
    if (typeof nextValue !== 'string' || !values.includes(nextValue)) return;
    const params = new URLSearchParams(window.location.search);
    params.set(parameter, nextValue);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
  };
  return { value, onValueChange };
}
