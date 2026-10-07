'use client';

import { useState } from 'react';

export function useFormChanges(values: unknown, original: unknown) {
  const current = JSON.stringify(values);
  const initial = JSON.stringify(original);
  const [saved, setSaved] = useState<{ initial: string; current: string } | null>(null);
  const baseline = saved?.initial === initial ? saved.current : initial;
  return {
    dirty: current !== baseline,
    saved: saved?.current === current,
    markSaved: (canonical?: unknown) => setSaved({ initial, current: canonical === undefined ? current : JSON.stringify(canonical) }),
  };
}
