import React, { useEffect, useMemo, useState } from 'react';
import { EXERCISES } from '../lib/exercises';

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Bonhomme animé (vue de profil) qui montre le mouvement d'un exercice. */
export default function ExerciseFigure({ id, size = 112 }) {
  const ex = EXERCISES[id];
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const [t, setT] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !ex) return undefined;
    const period = ex.hold ? 3600 : 2400;
    let raf;
    let last = 0;
    const tick = (now) => {
      if (now - last > 33) { // ~30 images/s suffisent
        last = now;
        setT(0.5 - 0.5 * Math.cos((2 * Math.PI * now) / period));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ex, reduced]);

  if (!ex) return null;
  const j = (k) => {
    const a = ex.a[k] || ex.a[k.replace('2', '')];
    const b = ex.b[k] || ex.b[k.replace('2', '')];
    return lerp(a, b, t);
  };
  const head = j('head'); const neck = j('neck'); const hip = j('hip');
  const knee = j('knee'); const foot = j('foot'); const knee2 = j('knee2'); const foot2 = j('foot2');
  const elbow = j('elbow'); const hand = j('hand');
  const hasSecondLeg = !!(ex.a.knee2 || ex.b.knee2);
  const lying = Math.abs(neck[1] - hip[1]) < 14; // au sol : pas de pied dessiné
  const seg = (a, b, extra = {}) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...extra} />;
  const toe = (f) => [f[0] + 8, Math.max(f[1], 92 - (92 - f[1]) * 0.15)];

  return (
    <svg viewBox="0 0 120 100" width={size} height={(size * 100) / 120} className="shrink-0 rounded-xl bg-sunken" role="img" aria-label={`Animation : ${ex.name}`}>
      <line x1="6" x2="114" y1="94.5" y2="94.5" stroke="rgb(var(--line))" strokeWidth="1.5" strokeLinecap="round" />
      {ex.prop === 'box' && <rect x="62" y="80.5" width="26" height="14" rx="2" fill="rgb(var(--line))" />}
      {ex.prop === 'wall' && <rect x="36" y="14" width="5" height="80" rx="1.5" fill="rgb(var(--line))" />}
      <g stroke="var(--type-renfo)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {hasSecondLeg && (
          <g opacity="0.45">
            {seg(hip, knee2)}{seg(knee2, foot2)}{!lying && seg(foot2, toe(foot2), { strokeWidth: 4.5 })}
          </g>
        )}
        {seg(neck, hip, { strokeWidth: 7 })}
        {seg(hip, knee)}{seg(knee, foot)}{!lying && seg(foot, toe(foot), { strokeWidth: 4.5 })}
        {seg(neck, elbow, { strokeWidth: 4.5 })}{seg(elbow, hand, { strokeWidth: 4.5 })}
      </g>
      <circle cx={head[0]} cy={head[1]} r="6.5" fill="var(--type-renfo)" />
    </svg>
  );
}
