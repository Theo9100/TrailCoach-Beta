import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, Dumbbell, Pause, Play, Plus, SkipForward, Timer, X } from 'lucide-react';
import { Button, cx } from './ui';
import ExerciseFigure from './ExerciseFigure';
import { EXERCISES, buildStrengthSteps, estimateStepsMinutes, materialFor } from '../lib/exercises';
import { formatDuration } from '../lib/format';
import { useBeeper } from '../lib/useBeeper';

/**
 * Séance de renforcement guidée, en plein écran : un exercice à la fois, puis la récupération,
 * puis le suivant. Les exercices chronométrés et les récupérations s'enchaînent tout seuls.
 */

const clock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
};

/** Anneau de compte à rebours. */
function Ring({ left, total, size = 220, color = 'rgb(var(--accent-rgb))', children }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--sunken))" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 120ms linear' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export default function StrengthPlayer({ session, startAt = 0, alreadyDone = false, onComplete, onClose }) {
  const items = session.exercises;
  const light = !!session.light;
  const steps = useMemo(() => buildStrengthSteps(items, { light }), [items, light]);
  const totalMinutes = useMemo(() => estimateStepsMinutes(steps), [steps]);
  const material = useMemo(() => materialFor(items), [items]);

  const [phase, setPhase] = useState('intro'); // intro | run | done
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(null); // ms restants de l'étape chronométrée
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const endAt = useRef(0);
  const total = useRef(0);
  const startedAt = useRef(0);
  const elapsed = useRef(0);
  const lastBeep = useRef(-1);
  const wake = useRef(null);
  const { init, beep } = useBeeper();

  const step = steps[index];
  const item = step ? items[step.exIndex] : null;
  const ex = step ? EXERCISES[step.id] : null;

  const go = (i) => {
    if (i >= steps.length) {
      elapsed.current = Date.now() - startedAt.current;
      wake.current?.release?.();
      beep(1320, 700);
      navigator.vibrate?.([200, 100, 200]);
      setPhase('done');
      return;
    }
    const st = steps[i];
    setIndex(i);
    setPaused(false);
    lastBeep.current = -1;
    if (st.seconds) {
      total.current = st.seconds * 1000;
      endAt.current = Date.now() + total.current;
      setLeft(total.current);
    } else {
      setLeft(null);
    }
    if (st.kind === 'work') { beep(988, 220); navigator.vibrate?.(150); }
  };

  const start = async (from = 0) => {
    init();
    try { wake.current = await navigator.wakeLock?.request('screen'); } catch { /* facultatif */ }
    startedAt.current = Date.now();
    setPhase('run');
    go(from);
  };

  // Minuteur des étapes chronométrées (effort tenu, récupération, changement de côté)
  useEffect(() => {
    if (phase !== 'run' || paused || !step?.seconds) return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, endAt.current - Date.now());
      setLeft(remaining);
      const s = Math.ceil(remaining / 1000);
      if (s !== lastBeep.current && s > 0 && s <= 3) { lastBeep.current = s; beep(660, 120); }
      if (remaining <= 0) { clearInterval(id); go(index + 1); }
    }, 100);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, index]);

  const togglePause = () => {
    if (!step?.seconds) return;
    if (paused) { endAt.current = Date.now() + (left ?? 0); setPaused(false); } else setPaused(true);
  };
  const addTime = (ms) => { endAt.current += ms; total.current += ms; setLeft((v) => (v ?? 0) + ms); };
  const previous = () => {
    for (let i = index - 1; i >= 0; i -= 1) if (steps[i].kind === 'work') { go(i); return; }
    go(0);
  };
  const requestClose = () => { if (phase === 'run') setConfirm(true); else onClose(); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (phase === 'run') setConfirm((v) => !v); else onClose(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [phase, onClose]);
  useEffect(() => () => { wake.current?.release?.(); }, []);

  // Prochaine étape d'effort (affichée pendant la récupération)
  const next = phase === 'run' ? steps.slice(index + 1).find((s) => s.kind === 'work') : null;
  const nextItem = next ? items[next.exIndex] : null;
  const doneSets = (exIndex) => {
    if (phase === 'done') return items[exIndex].sets;
    if (phase !== 'run') return 0;
    if (exIndex < step.exIndex) return items[exIndex].sets;
    if (exIndex > step.exIndex) return 0;
    return step.set - (step.kind === 'rest' ? 0 : 1);
  };
  const amountText = (st) => (st.seconds ? `${st.seconds} secondes${st.sideLabel ? ` · ${st.sideLabel.toLowerCase()}` : ''}` : `${st.reps} répétitions${st.side ? ` par ${st.side}` : ''}`);
  const startIndexOf = (exIndex) => Math.max(0, steps.findIndex((s) => s.exIndex === exIndex));

  const header = (
    <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] sm:px-6">
      <button onClick={requestClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken text-muted hover:text-ink" aria-label="Fermer la séance"><X className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{session.title}</div>
          {phase === 'run' && <div className="shrink-0 text-[11px] font-bold tabular text-muted">Exercice {step.exIndex + 1} / {items.length}</div>}
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {items.map((it, i) => (
            <span key={it.id + i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
              <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${(doneSets(i) / it.sets) * 100}%`, background: 'var(--type-renfo)' }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  let body;
  if (phase === 'intro') {
    body = (
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="rise">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--type-renfo)', background: 'color-mix(in srgb, var(--type-renfo) 14%, transparent)' }}>
            <Dumbbell className="h-3.5 w-3.5" /> Séance guidée
          </div>
          <h1 className="font-display mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">{session.title}</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            {items.length} exercices · environ {formatDuration(totalMinutes)}{session.stage != null ? ` · ${session.zone}` : ''}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Les exercices s’enchaînent tout seuls : touchez « Série terminée » après vos répétitions, les récupérations et les exercices chronométrés défilent automatiquement, avec un bip avant chaque reprise.
          </p>
          {material.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="py-1 text-muted">À prévoir :</span>
              {material.map((m) => <span key={m} className="rounded-full bg-sunken px-3 py-1">{m}</span>)}
            </div>
          )}
        </div>
        <ol className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={it.id + i}>
              <button onClick={() => start(startIndexOf(i))} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 text-left transition hover:border-[color:var(--type-renfo)]">
                <ExerciseFigure id={it.id} size={92} />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">Exercice {i + 1}</span>
                  <span className="block text-sm font-extrabold leading-snug">{EXERCISES[it.id].name}</span>
                  <span className="block text-sm font-bold tabular" style={{ color: 'var(--type-renfo)' }}>{it.dose}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  } else if (phase === 'done') {
    const sets = items.reduce((t, it) => t + it.sets, 0);
    body = (
      <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-6 pb-6 text-center">
        <div className="rise">
          <div className="player-check mx-auto grid h-24 w-24 place-items-center rounded-full text-white" style={{ background: 'var(--type-ef)' }}><Check className="h-12 w-12" strokeWidth={3} /></div>
          <h1 className="font-display mt-5 text-4xl font-black leading-none">Séance terminée</h1>
          <p className="mt-2 text-sm text-muted">Bien joué. Pensez à boire et à vous étirer en douceur.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[[Math.max(1, Math.round(elapsed.current / 60000)), 'minutes'], [items.length, 'exercices'], [sets, 'séries']].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-sunken p-3">
                <div className="font-display text-3xl font-black tabular leading-none">{v}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (step.kind === 'rest') {
    body = (
      <div key={`rest-${index}`} className="rise mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 pb-4 text-center sm:px-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--type-recup)' }}>Récupération</div>
          <div className="font-display text-2xl font-extrabold">{step.nextExercise ? 'Exercice suivant dans' : 'Série suivante dans'}</div>
        </div>
        <Ring left={left ?? 0} total={total.current} size={210} color="var(--type-recup)">
          <div>
            <div className="font-display text-7xl font-black leading-none tabular">{clock(left ?? 0)}</div>
            {paused && <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">En pause</div>}
          </div>
        </Ring>
        {next && (
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 text-left">
            <ExerciseFigure id={next.id} size={84} />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Ensuite · série {next.set} / {next.sets}</div>
              <div className="text-sm font-extrabold leading-snug">{EXERCISES[next.id].name}</div>
              <div className="text-sm font-bold tabular" style={{ color: 'var(--type-renfo)' }}>{amountText(next)}</div>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    const timed = !!step.seconds;
    const prep = step.kind === 'switch';
    body = (
      <div key={`work-${index}`} className="rise mx-auto grid w-full max-w-5xl flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden px-4 pb-3 sm:px-6 md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-8">
        <div className="player-stage relative grid min-h-0 place-items-center overflow-hidden rounded-3xl md:h-[min(64vh,36rem)]">
          <ExerciseFigure id={step.id} fluid paused={paused} className="h-full max-h-full w-full" />
          {step.sideLabel && !prep && <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-black text-bg">{step.sideLabel}</span>}
          <span className="absolute right-3 top-3 rounded-full bg-surface/80 px-3 py-1 text-xs font-black tabular backdrop-blur">Série {step.set} / {step.sets}</span>
        </div>
        <div className="min-h-0 text-center md:text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: prep ? 'var(--type-recup)' : 'var(--type-renfo)' }}>{prep ? step.label : `Exercice ${step.exIndex + 1} · série ${step.set} / ${step.sets}`}</div>
          <h1 className="font-display mt-1 text-3xl font-black leading-[0.95] sm:text-5xl">{ex.name}</h1>
          <div className="mt-3 flex items-center justify-center gap-4 md:justify-start">
            {timed ? (
              <Ring left={left ?? 0} total={total.current} size={104} color={prep ? 'var(--type-recup)' : 'rgb(var(--accent-rgb))'}>
                <div className="font-display text-4xl font-black leading-none tabular">{clock(left ?? 0)}</div>
              </Ring>
            ) : (
              <div className="font-display text-7xl font-black leading-none tabular text-accent">{step.reps}</div>
            )}
            <div className="text-left">
              <div className="text-lg font-extrabold leading-tight">{timed ? (prep ? 'Mettez-vous en place' : paused ? 'En pause' : 'Tenez la position') : 'répétitions'}</div>
              <div className="text-sm font-bold text-muted">{timed ? (prep ? (steps[index + 1]?.sideLabel || `${steps[index + 1]?.seconds} secondes`) : (step.sideLabel || `${step.seconds} secondes`)) : (step.side ? `par ${step.side}` : 'à votre rythme')}{step.note ? ` · ${step.note}` : ''}</div>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted md:mx-0">{ex.cue}</p>
        </div>
      </div>
    );
  }

  let footer;
  if (phase === 'intro') {
    footer = <Button size="lg" className="w-full sm:w-auto sm:px-10" onClick={() => start(startIndexOf(startAt))}><Play className="h-4 w-4" /> Commencer la séance</Button>;
  } else if (phase === 'done') {
    footer = alreadyDone
      ? <Button size="lg" className="w-full sm:w-auto sm:px-10" onClick={onClose}>Fermer</Button>
      : <Button size="lg" className="w-full sm:w-auto sm:px-10" onClick={() => { onComplete(); onClose(); }}><Check className="h-4 w-4" /> Valider la séance</Button>;
  } else {
    const timed = !!step.seconds;
    footer = (
      <div className="flex w-full max-w-xl items-center gap-2">
        <Button variant="ghost" className="h-14 w-14 shrink-0 px-0" onClick={previous} disabled={index === 0} aria-label="Exercice précédent"><ChevronLeft className="h-5 w-5" /></Button>
        {step.kind === 'rest' ? (
          <>
            <Button variant="subtle" className="h-14 flex-1" onClick={() => addTime(15000)}><Plus className="h-4 w-4" /> 15 s</Button>
            <Button className="h-14 flex-[1.4]" onClick={() => go(index + 1)}><SkipForward className="h-4 w-4" /> Passer</Button>
          </>
        ) : timed ? (
          <>
            <Button variant="subtle" className="h-14 flex-1" onClick={togglePause}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {paused ? 'Reprendre' : 'Pause'}</Button>
            <Button variant="ghost" className="h-14 flex-1" onClick={() => go(index + 1)}><SkipForward className="h-4 w-4" /> Passer</Button>
          </>
        ) : (
          <Button className="h-14 flex-1 text-base" onClick={() => go(index + 1)}><Check className="h-5 w-5" strokeWidth={3} /> Série terminée</Button>
        )}
        {step.kind === 'rest' && <Button variant="ghost" className="h-14 w-14 shrink-0 px-0" onClick={togglePause} aria-label={paused ? 'Reprendre' : 'Mettre en pause'}>{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</Button>}
        {step.kind === 'work' && !timed && <Button variant="ghost" className="h-14 w-14 shrink-0 px-0" onClick={() => go(index + 1)} aria-label="Passer cet exercice"><ChevronRight className="h-5 w-5" /></Button>}
      </div>
    );
  }

  return createPortal(
    <div className="player-bg fixed inset-0 z-[60] flex flex-col" role="dialog" aria-modal="true" aria-label={`Séance guidée : ${session.title}`}>
      {header}
      {body}
      <div className="flex justify-center border-t border-line bg-surface/70 px-4 pt-3 backdrop-blur sm:px-6" style={{ paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom))' }}>
        {footer}
      </div>

      {confirm && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-night/60 p-6 backdrop-blur-sm">
          <div className="rise w-full max-w-sm rounded-3xl border border-line bg-surface p-5 text-center shadow-2xl">
            <Timer className="mx-auto h-6 w-6 text-muted" />
            <h2 className="font-display mt-2 text-2xl font-extrabold">Arrêter la séance ?</h2>
            <p className="mt-1 text-sm text-muted">Votre progression dans cette séance ne sera pas conservée.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Arrêter</Button>
              <Button className="flex-1" onClick={() => setConfirm(false)}>Continuer</Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
