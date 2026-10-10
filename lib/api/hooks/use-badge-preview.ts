'use client';

import * as React from 'react';
import { badgesApi, type BadgeKey, type BadgePreview, type BadgeRule } from '../badges';

export function useBadgePreview(key: BadgeKey, rule: BadgeRule | null, cityId: string, enabled: boolean) {
  const [state, setState] = React.useState<{ fingerprint: string; data: BadgePreview | null; loading: boolean; error: boolean }>({ fingerprint: '', data: null, loading: false, error: false });
  const generation = React.useRef(0);
  const serialized = rule ? JSON.stringify(rule) : '';
  const fingerprint = JSON.stringify([key, serialized, cityId, enabled]);
  React.useEffect(() => {
    const requestId = ++generation.current;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!enabled || !serialized) { setState({ fingerprint, data: null, loading: false, error: false }); return; }
      setState({ fingerprint, data: null, loading: true, error: false });
      try {
        const data = await badgesApi.preview(key, JSON.parse(serialized) as BadgeRule, cityId || undefined);
        if (active && requestId === generation.current) setState({ fingerprint, data, loading: false, error: false });
      } catch { if (active && requestId === generation.current) setState({ fingerprint, data: null, loading: false, error: true }); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key, serialized, cityId, enabled, fingerprint]);
  return state.fingerprint === fingerprint ? state : { data: null, loading: !!serialized && enabled, error: false };
}
