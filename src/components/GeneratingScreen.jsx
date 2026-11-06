import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Logo, cx } from './ui';
import { peakTargets, totalWeeksFor } from '../lib/plan';

const STEPS = [
  'Analyse de votre profil',
  'Découpage en phases',
  'Calcul du volume et du dénivelé',
  'Allures et zones cardiaques',
  'Construction des séances',
];

/* Profil de montagne dessiné progressivement, parcouru par un coureur. */
const TRAIL = 'M10 150 L60 120 L95 132 L140 70 L170 92 L205 40 L240 82 L270 66 L310 118 L350 100 L390 150';

export default function GeneratingScreen({ profile, title = 'Création de votre programme', onDone }) {
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const total = reduced ? 700 : 2600;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const e = t - start;
      setElapsed(e);
      if (e < total) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, reduced ? 0 : 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.min(1, elapsed / total);
  const current = Math.min(STEPS.length, Math.floor(progress * STEPS.length));
  const weeks = totalWeeksFor(profile);
  const { peakKm, peakDPlus } = peakTargets(profile);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night px-6 text-paper" role="status" aria-live="polite">
      <div className="topo topo-layer" style={{ filter: 'invert(1)', opacity: 0.08 }} />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>

        <svg viewBox="0 0 400 170" className="w-full" aria-hidden="true">
          <defs>
            <linearGradient id="genFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E2552B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E2552B" stopOpacity="0" />
            </linearGradient>
            <clipPath id="genClip">
              <rect x="0" y="0" height="170" width={400 * progress} />
            </clipPath>
          </defs>
          <line x1="0" x2="400" y1="150" y2="150" stroke="#f3efe6" strokeOpacity="0.15" />
          <path d={TRAIL} fill="none" stroke="#f3efe6" strokeOpacity="0.12" strokeWidth="3" strokeLinejoin="round" />
          <g clipPath="url(#genClip)">
            <path d={`${TRAIL} Z`} fill="url(#genFill)" />
            <path d={TRAIL} fill="none" stroke="#E2552B" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {/* Drapeau d'arrivée */}
          <g transform="translate(386 112)" opacity={progress > 0.95 ? 1 : 0.35}>
            <line x1="0" x2="0" y1="0" y2="38" stroke="#f3efe6" strokeWidth="2" />
            <path d="M0 0 L16 5 L0 11 Z" fill="#E2552B" />
          </g>
          {!reduced && (
            <circle r="7" fill="#f3efe6" stroke="#E2552B" strokeWidth="3">
              <animateMotion dur={`${total / 1000}s`} fill="freeze" path={TRAIL} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
            </circle>
          )}
        </svg>

        <h2 className="font-display mt-6 text-center text-3xl font-black">{title}</h2>
        <p className="mt-1 text-center text-sm text-paper/60">
          {profile.raceName} · {weeks} semaines · pic à {peakKm} km / {peakDPlus} m D+
        </p>

        <div className="mx-auto mt-6 h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>

        <ul className="mx-auto mt-6 w-fit space-y-2.5 text-sm font-semibold">
          {STEPS.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s} className={cx('flex items-center gap-3 transition-opacity', done ? 'opacity-100' : active ? 'opacity-90' : 'opacity-30')}>
                <span className={cx('grid h-5 w-5 place-items-center rounded-full border', done ? 'border-accent bg-accent' : 'border-paper/40')}>
                  {done ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper" /> : null}
                </span>
                {s}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
