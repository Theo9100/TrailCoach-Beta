import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Award, CalendarCheck, Dumbbell, Flag, Mountain, Route, Share2, Timer, TrendingUp, Trophy } from 'lucide-react';
import { Button, Card, Field, cx, inputClass } from './ui';
import { PHASES } from '../lib/plan';
import { buildRecap, climbEquivalent, recoveryDays } from '../lib/recap';
import { buildRacePlan, trailCalibration } from '../lib/raceplan';
import { scoreColor, scoreLabel } from '../lib/score';
import { formatDuration, formatKm, formatLongDate, formatShortDate } from '../lib/format';

/** Nombre qui défile de 0 à sa valeur à l'apparition. */
function CountUp({ value, format = (v) => Math.round(v).toLocaleString('fr-FR') }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(value); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 1100);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

export default function Recap({ profile, plan, completions, activities, raceSettings, raceResult, setRaceResult, history = [], onNewGoal, onShare }) {
  const recap = useMemo(() => buildRecap(plan, completions, activities, profile), [plan, completions, activities, profile]);
  const predicted = useMemo(() => {
    const cal = raceSettings?.useRuns === false ? null : trailCalibration(activities, profile, new Date(`${profile.raceDate}T12:00:00`));
    return buildRacePlan(profile, { factor: raceSettings?.factor || 1, speed: cal?.speed }).totalMinutes;
  }, [profile, activities, raceSettings]);

  if (!recap) return null;
  const finish = raceResult?.minutes ?? recap.raceActivityMinutes ?? null;
  const hours = finish != null ? Math.floor(finish / 60) : '';
  const mins = finish != null ? Math.round(finish % 60) : '';
  const setTime = (h, m) => {
    const total = (Number(h) || 0) * 60 + (Number(m) || 0);
    setRaceResult(total > 0 ? { minutes: total } : null);
  };
  const delta = finish != null ? finish - predicted : null;
  const equivalent = climbEquivalent(recap.dplus);
  const max = Math.max(...recap.weeks.map((w) => Math.max(w.planned, w.actual)), 1);
  const rest = recoveryDays(recap.distance);
  const empty = recap.km === 0 && recap.done === 0;

  const highlights = [
    recap.longest && { icon: Route, label: 'Plus longue sortie', value: `${formatKm(recap.longest.km)} km`, hint: `${recap.longest.dplus} m D+ · ${formatShortDate(recap.longest.date)}` },
    recap.biggest && { icon: TrendingUp, label: 'Plus grosse semaine', value: `${Math.round(recap.biggest.km)} km`, hint: `Semaine ${recap.biggest.number} · ${Math.round(recap.biggest.dplus)} m D+` },
    { icon: Award, label: 'Suivi du plan', value: recap.score != null ? `${recap.score} / 100` : '–', hint: scoreLabel(recap.score), color: scoreColor(recap.score) },
    { icon: Dumbbell, label: 'Renforcement', value: `${recap.strength} séance${recap.strength > 1 ? 's' : ''}`, hint: recap.strength ? 'Un atout pour les descentes' : 'À intégrer la prochaine fois' },
  ].filter(Boolean);

  return (
    <div className="rise space-y-6">
      <Card className="relative overflow-hidden">
        <div className="recap-glow" aria-hidden="true" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
              <Trophy className="h-3.5 w-3.5" /> Préparation terminée
            </div>
            <h2 className="font-display mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">{recap.raceName}</h2>
            <p className="mt-2 text-sm font-semibold text-muted">
              {formatLongDate(recap.raceDate)} · {formatKm(recap.distance)} km · {recap.elevation} m D+ · {recap.weekCount} semaines de préparation
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Votre temps à l’arrivée</div>
            <div className="mt-2 flex items-end gap-2">
              <Field label="Heures">
                <input type="number" inputMode="numeric" min="0" max="60" className={cx(inputClass, 'w-20 text-center font-display font-black tabular')} style={{ fontSize: '1.25rem' }} value={hours} placeholder="0" onChange={(e) => setTime(e.target.value, mins)} aria-label="Heures" />
              </Field>
              <Field label="Minutes">
                <input type="number" inputMode="numeric" min="0" max="59" className={cx(inputClass, 'w-20 text-center font-display font-black tabular')} style={{ fontSize: '1.25rem' }} value={mins} placeholder="00" onChange={(e) => setTime(hours, e.target.value)} aria-label="Minutes" />
              </Field>
            </div>
            <div className="mt-2 text-xs font-semibold text-muted tabular">
              Estimation de l’app : {formatDuration(predicted)}
              {delta != null && Math.abs(delta) >= 1 && (
                <span className="ml-1.5 font-bold" style={{ color: delta <= 0 ? 'var(--type-ef)' : 'var(--type-cotes)' }}>
                  · {formatDuration(Math.abs(delta))} {delta <= 0 ? 'de mieux' : 'de plus'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
          {[
            { icon: Route, label: 'Kilomètres courus', value: recap.km, unit: 'km' },
            { icon: Mountain, label: 'Dénivelé grimpé', value: recap.dplus, unit: 'm', accent: true },
            { icon: Timer, label: 'Temps passé à courir', value: recap.minutes, format: (v) => formatDuration(Math.round(v)) },
            { icon: CalendarCheck, label: 'Séances réalisées', value: recap.done, unit: `/ ${recap.planned}` },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <s.icon className={cx('h-4 w-4', s.accent ? 'text-accent' : 'text-muted')} />
              <div className={cx('font-display mt-2 text-4xl font-black leading-none tabular', s.accent && 'text-accent')}>
                <CountUp value={s.value} format={s.format} />
                {s.unit && <span className="ml-1 text-sm font-bold text-muted">{s.unit}</span>}
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        {equivalent && <div className="relative border-t border-line px-6 py-3 text-sm font-semibold text-muted sm:px-8">Votre dénivelé cumulé représente <span className="text-ink">{equivalent}</span>.</div>}
      </Card>

      {empty && (
        <Card className="p-5 text-sm text-muted">
          Aucune séance n’a été validée pendant cette préparation : le bilan est vide. Validez vos séances ou synchronisez vos sorties pour le remplir.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Votre préparation, semaine par semaine</div>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {recap.weeks.map((w, i) => (
              <div key={w.number} className="relative flex h-full flex-1 flex-col justify-end" title={`Semaine ${w.number} : ${w.actual} / ${w.planned} km`}>
                <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] border border-b-0 border-dashed" style={{ height: `${(w.planned / max) * 100}%`, borderColor: PHASES[w.phase].color, opacity: 0.6 }} />
                <div className="recap-bar relative rounded-t-[3px]" style={{ height: `${(w.actual / max) * 100}%`, background: PHASES[w.phase].color, animationDelay: `${i * 45}ms` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 text-center text-[10px] font-bold text-muted tabular">
            {recap.weeks.map((w) => <span key={w.number} className="flex-1">{recap.weeks.length > 14 && w.number % 2 === 0 ? '' : `S${w.number}`}</span>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-muted">
            {Object.values(PHASES).map((ph) => <span key={ph.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: ph.color }} />{ph.label}</span>)}
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-muted" />Prévu</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {highlights.map((h) => (
            <Card key={h.label} className="p-4">
              <h.icon className="h-4 w-4 text-muted" />
              <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{h.label}</div>
              <div className="font-display text-2xl font-black leading-tight tabular" style={h.color ? { color: h.color } : undefined}>{h.value}</div>
              <div className="text-xs text-muted">{h.hint}</div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Et maintenant ?</div>
          <h3 className="font-display mt-1 text-2xl font-extrabold">Récupérez, puis repartez</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Après {formatKm(recap.distance)} km de course, comptez environ {rest} jours sans intensité : marche, vélo doux, footings très courts si l’envie est là. Ensuite, un nouveau programme reprend en douceur. Votre profil, vos sorties et ce bilan sont conservés.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button size="lg" onClick={() => onNewGoal(recap, finish, predicted)}><Flag className="h-4 w-4" /> Préparer un nouvel objectif <ArrowRight className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => onShare(recap, finish)}><Share2 className="h-4 w-4" /> Partager mon bilan</Button>
        </div>
      </Card>

      <PastPreparations history={history} />
    </div>
  );
}

export function PastPreparations({ history }) {
  if (!history?.length) return null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Préparations précédentes</div>
      <ul className="mt-3 divide-y divide-line">
        {history.map((h) => (
          <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 text-sm">
            <span className="font-extrabold">{h.raceName} <span className="font-semibold text-muted">· {formatShortDate(h.raceDate)}</span></span>
            <span className="text-xs font-bold text-muted tabular">
              {formatKm(h.distance)} km · {h.elevation} m D+ · {h.km} km et {h.dplus} m D+ en {h.weekCount} sem.
              {h.finishMinutes ? <span className="ml-1.5 text-ink">· arrivée en {formatDuration(h.finishMinutes)}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
