'use client';

import * as React from 'react';

/** Animate UI's Counting Number idea at the subtle level: settle 80% → 100% in 520 ms; reduced motion shows it at once. */
const REDUCE = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useCountUp(value: number | null | undefined) {
  const target = value ?? 0;
  const [shown, setShown] = React.useState(target);
  const from = React.useRef(target);
  React.useEffect(() => {
    if (REDUCE() || from.current === target) { from.current = target; setShown(target); return; }
    const start = from.current;
    const began = performance.now();
    const duration = 520;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - began) / duration);
      setShown(Math.round(start + (target - start) * ease(k)));
      if (k < 1) frame = requestAnimationFrame(tick);
      else { from.current = target; setShown(target); }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

export function CountUp({ value, className }: { value: number | null | undefined; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{shown.toLocaleString('en-US')}</span>;
}
