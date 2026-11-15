import { useEffect, useRef } from 'react';

/** Petits bips sonores (minuteurs). `init` doit être appelé depuis un clic pour débloquer le son. */
export function useBeeper() {
  const ctxRef = useRef(null);
  const init = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ctxRef.current) ctxRef.current = new AC();
      ctxRef.current?.resume?.();
    } catch { /* son indisponible : le minuteur reste utilisable */ }
  };
  const beep = (freq = 880, ms = 160) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.02);
    } catch { /* ignoré */ }
  };
  useEffect(() => () => { ctxRef.current?.close?.(); }, []);
  return { init, beep };
}
