import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Flag, Play, RotateCcw, Square, Timer, X } from 'lucide-react';
import { Button, Overlay, cx, inputClass } from './ui';
import { pace } from '../lib/format';

/**
 * Test de VMA guidé (demi-Cooper) : courir la plus grande distance possible en 6 minutes.
 * VMA (km/h) = distance parcourue (m) / 100.
 */
const TEST_MS = 6 * 60 * 1000;
const WARMUP = [
  '15 minutes de footing très lent',
  '3 accélérations progressives de 80 m, retour en marchant',
  '2 minutes de récupération, montre prête à mesurer la distance',
];
const COACHING = [
  [0, 'Partez vite, mais gardez-en sous le pied : l’allure doit pouvoir être tenue 6 minutes.'],
  [90, 'Installez-vous dans le rythme. Respiration ample, épaules relâchées.'],
  [180, 'Mi-parcours. Ne ralentissez pas : c’est maintenant que le test se joue.'],
  [270, 'Plus qu’une minute et demie. Accrochez-vous à l’allure.'],
  [330, 'Dernières secondes : donnez tout ce qu’il reste !'],
];

export const vmaFromHalfCooper = (meters) => Math.round((meters / 100) * 2) / 2;

function useBeeper() {
  const ctxRef = useRef(null);
  const init = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ctxRef.current) ctxRef.current = new AC();
      ctxRef.current?.resume?.();
    } catch { /* son indisponible : le test reste utilisable */ }
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

/** Piste ovale : l'anneau orange se remplit avec le temps, le point fait des tours. */
function Track({ progress, running, children }) {
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  useEffect(() => {
    if (!running) return undefined;
    const path = pathRef.current;
    const len = path.getTotalLength();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf;
    const tick = (now) => {
      const p = path.getPointAtLength(((now / (reduced ? 60000 : 9000)) % 1) * len);
      dotRef.current?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  const d = 'M100 24 H220 A76 76 0 0 1 220 176 H100 A76 76 0 0 1 100 24 Z';
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <svg viewBox="0 0 320 200" className="w-full" aria-hidden="true">
        <path d={d} fill="none" stroke="rgb(var(--sunken))" strokeWidth="26" />
        <path d={d} fill="none" stroke="rgb(var(--line))" strokeWidth="1.5" strokeDasharray="5 7" />
        <path d={d} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="26" strokeLinecap="butt" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} opacity="0.9" />
        <path ref={pathRef} d={d} fill="none" stroke="none" />
        <g ref={dotRef} transform="translate(100 24)">
          <circle r="11" fill="rgb(var(--surface))" />
          <circle r="7" fill="rgb(var(--ink))" />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export default function VmaTest({ currentVma, onApply, onRecord, onClose }) {
  const [step, setStep] = useState('intro'); // intro | warmup | countdown | run | result
  const [checks, setChecks] = useState({});
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(TEST_MS);
  const [distance, setDistance] = useState('');
  const endAt = useRef(0);
  const lastBeep = useRef(-1);
  const wake = useRef(null);
  const { init, beep } = useBeeper();

  // L'écran peut de nouveau se mettre en veille à la fermeture
  useEffect(() => () => { wake.current?.release?.(); }, []);

  // Compte à rebours 3-2-1
  useEffect(() => {
    if (step !== 'countdown') return undefined;
    if (count === 0) {
      beep(1320, 500);
      navigator.vibrate?.(300);
      endAt.current = Date.now() + TEST_MS;
      lastBeep.current = -1;
      setLeft(TEST_MS);
      setStep('run');
      return undefined;
    }
    beep(660, 140);
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, count]);

  // Chrono de 6 minutes, calé sur l'horloge pour rester juste même écran éteint
  useEffect(() => {
    if (step !== 'run') return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, endAt.current - Date.now());
      setLeft(remaining);
      const sec = Math.ceil(remaining / 1000);
      if (sec !== lastBeep.current) {
        lastBeep.current = sec;
        if (sec > 0 && sec < 360 && sec % 60 === 0) { beep(880, 180); navigator.vibrate?.(120); }
        if (sec > 0 && sec <= 3) beep(660, 140);
      }
      if (remaining <= 0) {
        clearInterval(id);
        beep(1320, 900);
        navigator.vibrate?.([400, 150, 400]);
        wake.current?.release?.();
        setStep('result');
      }
    }, 200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const start = async () => {
    init();
    try { wake.current = await navigator.wakeLock?.request('screen'); } catch { /* facultatif */ }
    setCount(3);
    setStep('countdown');
  };

  const elapsedSec = Math.floor((TEST_MS - left) / 1000);
  const mm = Math.floor(Math.ceil(left / 1000) / 60);
  const ss = Math.ceil(left / 1000) % 60;
  const coaching = [...COACHING].reverse().find(([t]) => elapsedSec >= t)?.[1];

  const meters = Number(distance);
  const valid = meters >= 800 && meters <= 2400;
  const vma = valid ? vmaFromHalfCooper(meters) : null;
  const applied = vma ? Math.min(22, Math.max(9, vma)) : null;
  const fmt = (v) => String(v).replace('.', ',');
  const current = Number(currentVma);

  const finish = (apply) => {
    onRecord?.({ at: Date.now(), distance: meters, vma });
    if (apply) onApply(applied);
    onClose();
  };

  const stepIndex = { intro: 0, warmup: 1, countdown: 2, run: 2, result: 3 }[step];

  return (
    <Overlay label="Test de VMA guidé" onClose={onClose} closeOnBackdrop={step === 'intro'}>
      <div className="rise flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent"><Timer className="h-4.5 w-4.5" /></span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Test de VMA · demi-Cooper</div>
              <div className="flex gap-1.5 pt-1.5">
                {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-1 w-8 rounded-full transition-colors', i <= stepIndex ? 'bg-accent' : 'bg-sunken')} />)}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {step === 'intro' && (
            <div key="intro" className="rise space-y-4">
              <h2 className="font-display text-3xl font-black leading-none">6 minutes à fond</h2>
              <p className="text-sm leading-relaxed text-muted">
                Le principe : courir la plus grande distance possible en 6 minutes, à allure régulière. La distance donne directement votre VMA : <span className="font-bold text-ink">1 500 m = 15 km/h</span>.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  ['Où', 'Une piste d’athlétisme (un tour = 400 m) ou une route plate, sans carrefour.'],
                  ['Quand', 'Reposé, à la place d’une séance de fractionné. Pas dans les 10 jours avant une course.'],
                  ['Avec quoi', 'Votre montre GPS, pour relever la distance exacte à la fin.'],
                  ['Sécurité', 'Effort maximal : en cas de doute sur votre santé, demandez l’avis d’un médecin avant.'],
                ].map(([k, v]) => (
                  <li key={k} className="grid grid-cols-[5.5rem_1fr] gap-3 rounded-xl bg-sunken/60 px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">{k}</span>
                    <span className="leading-snug">{v}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button className="sm:flex-1" onClick={() => setStep('warmup')}>Préparer le test <ChevronRight className="h-4 w-4" /></Button>
                <Button variant="ghost" onClick={() => setStep('result')}>J’ai déjà ma distance</Button>
              </div>
            </div>
          )}

          {step === 'warmup' && (
            <div key="warmup" className="rise space-y-4">
              <h2 className="font-display text-3xl font-black leading-none">Échauffement</h2>
              <p className="text-sm text-muted">Un test à froid donne un mauvais résultat et expose à la blessure. Cochez chaque étape.</p>
              <ul className="space-y-2">
                {WARMUP.map((w, i) => {
                  const on = !!checks[i];
                  return (
                    <li key={w}>
                      <button onClick={() => setChecks({ ...checks, [i]: !on })} aria-pressed={on} className={cx('flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition', on ? 'border-transparent bg-sunken text-muted' : 'border-line hover:bg-sunken/50')}>
                        <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-transparent text-white' : 'border-line text-transparent')} style={on ? { background: 'var(--type-ef)' } : undefined}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                        <span className={cx(on && 'line-through')}>{w}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="rounded-xl bg-accent/5 px-3.5 py-3 text-sm leading-relaxed">
                Au signal, lancez l’enregistrement sur votre montre en même temps. Un bip retentit à chaque minute, et le téléphone vibre à la fin.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('intro')}>Retour</Button>
                <Button className="flex-1" onClick={start}><Play className="h-4 w-4" /> Lancer le chrono</Button>
              </div>
            </div>
          )}

          {step === 'countdown' && (
            <div key="countdown" className="grid place-items-center py-10 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Préparez-vous</div>
              <div key={count} className="vma-pop font-display text-[9rem] font-black leading-none text-accent tabular">{count || 'GO'}</div>
            </div>
          )}

          {step === 'run' && (
            <div key="run" className="space-y-4 text-center">
              <Track progress={1 - left / TEST_MS} running>
                <div>
                  <div className="font-display text-6xl font-black leading-none tabular">{mm}:{String(ss).padStart(2, '0')}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">restantes</div>
                </div>
              </Track>
              <p key={coaching} className="rise mx-auto max-w-xs text-sm font-semibold leading-relaxed" aria-live="polite">{coaching}</p>
              <Button variant="ghost" size="sm" onClick={() => { wake.current?.release?.(); setStep('warmup'); }}><Square className="h-3.5 w-3.5" /> Arrêter le test</Button>
            </div>
          )}

          {step === 'result' && (
            <div key="result" className="rise space-y-4">
              <h2 className="font-display text-3xl font-black leading-none">Votre résultat</h2>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Distance parcourue en 6 minutes (mètres)</span>
                <input type="number" inputMode="numeric" min="800" max="2400" step="10" autoFocus className={cx(inputClass, 'text-center font-display font-black tabular')} style={{ height: '3.5rem', fontSize: '1.6rem' }} placeholder="Ex. 1540" value={distance} onChange={(e) => setDistance(e.target.value)} />
                {distance !== '' && !valid && <span className="mt-1.5 block text-xs font-semibold" style={{ color: 'var(--type-vma)' }}>Indiquez une distance entre 800 et 2 400 m.</span>}
              </label>

              {vma && (
                <div className="rise space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-accent p-4 text-white">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">VMA mesurée</div>
                      <div className="font-display text-5xl font-black leading-none tabular">{fmt(vma)}</div>
                      <div className="text-xs font-bold opacity-80">km/h</div>
                    </div>
                    <div className="rounded-2xl bg-sunken p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Dans votre profil</div>
                      <div className="font-display text-5xl font-black leading-none tabular">{fmt(current)}</div>
                      <div className="text-xs font-bold text-muted">km/h</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">
                    {applied > current && `Bonne nouvelle : ${fmt(Math.round((applied - current) * 10) / 10)} km/h de mieux que votre profil. Vos allures d’entraînement vont être un peu plus rapides.`}
                    {applied < current && `Votre profil était surestimé de ${fmt(Math.round((current - applied) * 10) / 10)} km/h. Des allures plus justes rendront les séances plus efficaces et moins risquées.`}
                    {applied === current && 'Votre profil est déjà juste : les allures du programme sont bien calibrées.'}
                    {applied !== vma && ` (La VMA du profil est limitée entre 9 et 22 km/h.)`}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Endurance', 0.68], ['Seuil', 0.85], ['Fractionné', 1]].map(([label, pct]) => (
                      <div key={label} className="rounded-xl border border-line p-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
                        <div className="font-display text-lg font-black tabular">{pace(applied * pct)}</div>
                        <div className="text-[10px] font-bold text-muted">/km</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" onClick={() => { setDistance(''); setStep('warmup'); }}><RotateCcw className="h-4 w-4" /> Refaire</Button>
                {vma && applied !== current
                  ? <Button className="sm:flex-1" onClick={() => finish(true)}><Flag className="h-4 w-4" /> Mettre ma VMA à {fmt(applied)} km/h</Button>
                  : <Button className="sm:flex-1" disabled={!vma} onClick={() => finish(false)}>Enregistrer le test</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
