import React, { useEffect, useMemo, useRef } from 'react';
import { EXERCISES } from '../lib/exercises';
import { poseAt, timelineOf } from '../lib/pose';
import { cx } from './ui';

const GROUND = 94.5;
const f = (v) => v.toFixed(2);
const path = (...pts) => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}`;

/** Pointe du pied : à plat, tendue dans l'axe du tibia, ou qui tombe quand le pied décolle. */
function toeOf(ex, knee, foot) {
  if (ex.feet === 'flat') return [foot[0] + 7.5, foot[1]];
  if (ex.feet === 'point') {
    const d = Math.hypot(foot[0] - knee[0], foot[1] - knee[1]) || 1;
    return [foot[0] + ((foot[0] - knee[0]) / d) * 4.5, foot[1] + ((foot[1] - knee[1]) / d) * 4.5];
  }
  const lift = Math.max(0, 92 - foot[1]);
  return [foot[0] + 7.5 - Math.min(2.5, lift * 0.2), foot[1] + Math.min(4.5, lift * 0.45)];
}

/**
 * Personnage animé (vue de profil) qui montre le mouvement d'un exercice.
 * Les membres gardent une longueur constante et chaque exercice a son propre rythme.
 * L'animation écrit directement dans le SVG, sans rendu React à chaque image.
 */
export default function ExerciseFigure({ id, size = 112, fluid = false, paused = false, className }) {
  const ex = EXERCISES[id];
  const timeline = useMemo(() => (ex ? timelineOf(ex) : null), [ex]);
  const refs = useRef({});
  const set = (name) => (el) => { refs.current[name] = el; };

  useEffect(() => {
    if (!ex || !timeline) return undefined;
    const r = refs.current;
    const lying = !!ex.floor || Math.abs(ex.a.neck[1] - ex.a.hip[1]) < 14;

    const draw = (tMs) => {
      const p = poseAt(timeline, tMs);
      const far = (pt) => [pt[0] - 1.8, pt[1] + 0.6];
      r.legFar?.setAttribute('d', path(far(p.hip), p.knee2, p.foot2));
      r.shoeFar?.setAttribute('d', path(p.foot2, toeOf(ex, p.knee2, p.foot2)));
      r.armFar?.setAttribute('d', path(far(p.neck), far(p.elbow), far(p.hand)));
      r.torso?.setAttribute('d', path(p.hip, p.neck));
      r.legNear?.setAttribute('d', path(p.hip, p.knee, p.foot));
      r.shoeNear?.setAttribute('d', path(p.foot, toeOf(ex, p.knee, p.foot)));
      r.armNear?.setAttribute('d', path(p.neck, p.elbow, p.hand));
      r.head?.setAttribute('cx', f(p.head[0]));
      r.head?.setAttribute('cy', f(p.head[1]));
      // Ombre au sol : elle rétrécit et s'éclaircit quand le corps décolle
      const lowest = Math.max(p.foot[1], p.foot2[1], p.hand[1], p.hip[1]);
      const air = Math.max(0, 90 - lowest);
      const cxs = lying ? (p.head[0] + Math.min(p.foot[0], p.foot2[0])) / 2 : (p.hip[0] + Math.max(p.foot[0], p.foot2[0]) + Math.min(p.foot[0], p.foot2[0])) / 3;
      const rx = (lying ? 40 : 19) - air * 0.55;
      r.shadow?.setAttribute('cx', f(cxs));
      r.shadow?.setAttribute('rx', f(Math.max(6, rx)));
      r.shadow?.setAttribute('opacity', f(Math.max(0.05, 0.2 - air * 0.012)));
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || paused) { draw(reduced ? timeline.segs[0].ms : 0); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => { draw(now - t0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ex, timeline, paused]);

  if (!ex) return null;
  const body = 'var(--type-renfo)';
  const back = 'color-mix(in srgb, var(--type-renfo) 58%, rgb(var(--sunken)))';
  const shoe = 'rgb(var(--accent-rgb))';
  const shoeBack = 'color-mix(in srgb, rgb(var(--accent-rgb)) 62%, rgb(var(--sunken)))';
  const prop = 'rgb(var(--muted) / 0.38)';
  const onFloor = !!ex.floor || Math.abs(ex.a.neck[1] - ex.a.hip[1]) < 14;
  const bench = (x, top) => (
    <g>
      <rect x={x} y={top} width="30" height="4.4" rx="1.6" fill={prop} />
      <path d={`M${x + 4} ${top + 4.2}V${GROUND}M${x + 26} ${top + 4.2}V${GROUND}`} stroke={prop} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 100"
      width={fluid ? undefined : size}
      height={fluid ? undefined : (size * 100) / 120}
      className={cx('shrink-0', !fluid && 'figure-stage rounded-xl', className)}
      role="img"
      aria-label={`Animation : ${ex.name}`}
    >
      {onFloor
        ? <rect x="10" y={GROUND - 1.4} width="100" height="3.4" rx="1.7" fill={prop} />
        : <line x1="6" x2="114" y1={GROUND} y2={GROUND} stroke="rgb(var(--line))" strokeWidth="1.5" strokeLinecap="round" />}
      <ellipse ref={set('shadow')} cx="60" cy={GROUND + (onFloor ? 2.6 : 1.2)} rx="18" ry="1.9" fill="rgb(var(--ink))" opacity="0.18" />
      {ex.prop === 'box' && bench(60, 80.2)}
      {ex.prop === 'boxBack' && bench(22, 76.4)}
      {ex.prop === 'wall' && <rect x="35" y="8" width="5.5" height={GROUND - 8} rx="1.5" fill={prop} />}

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path ref={set('armFar')} stroke={back} strokeWidth="4.4" />
        <path ref={set('legFar')} stroke={back} strokeWidth="6" />
        <path ref={set('shoeFar')} stroke={shoeBack} strokeWidth="4.8" />
        <path ref={set('torso')} stroke={body} strokeWidth="9" />
        <circle ref={set('head')} r="6.9" fill={body} stroke="none" />
        <path ref={set('legNear')} stroke={body} strokeWidth="6.4" />
        <path ref={set('shoeNear')} stroke={shoe} strokeWidth="5" />
        <path ref={set('armNear')} stroke={body} strokeWidth="4.8" />
      </g>
    </svg>
  );
}
