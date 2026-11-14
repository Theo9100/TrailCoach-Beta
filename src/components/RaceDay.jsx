import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Droplets, Flame, Gauge, Plus, Timer, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button, Card, Field, ProgressBar, Stat, cx, inputClass } from './ui';
import TrackMap from './TrackMap';
import { DEFAULT_GEAR, buildRacePlan, clockAt, trailCalibration } from '../lib/raceplan';
import { formatDuration, formatKm, formatShortDate, pace } from '../lib/format';

const KIND_COLOR = { Montée: 'var(--type-vma)', Descente: 'var(--type-long)', Roulant: 'var(--type-ef)' };

export default function RaceDay({ profile, settings, setSettings, gear, setGear, activities = [] }) {
  const s = { start: '08:00', factor: 1, cutoff: '', useRuns: true, ...settings };
  const calibration = useMemo(() => trailCalibration(activities, profile), [activities, profile]);
  const refined = !!calibration && s.useRuns;
  const plan = useMemo(() => buildRacePlan(profile, { factor: s.factor, speed: refined ? calibration.speed : undefined }), [profile, s.factor, refined, calibration]);
  const theory = useMemo(() => (calibration ? buildRacePlan(profile, { factor: s.factor }).totalMinutes : null), [profile, s.factor, calibration]);
  const [newItem, setNewItem] = useState('');
  const set = (patch) => setSettings({ ...s, ...patch });

  const cutoffMin = Number(s.cutoff) > 0 ? Number(s.cutoff) * 60 : null;
  const late = cutoffMin && plan.totalMinutes > cutoffMin;
  const items = [...DEFAULT_GEAR, ...(gear.custom || [])];
  const checked = items.filter((i) => gear.checked?.[i]).length;
  const toggle = (i) => setGear({ ...gear, checked: { ...gear.checked, [i]: !gear.checked?.[i] } });
  const pct = Math.round((s.factor - 1) * 100);

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Plan de course</div>
            <h2 className="font-display text-2xl font-extrabold">Temps de passage estimés</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {plan.fromTrack
                ? `Calculés section par section à partir du tracé GPX, ${refined ? 'de vos sorties longues' : 'de votre VMA'} et d’un ralentissement progressif.`
                : 'Estimation sur un parcours régulier. Importez le tracé GPX de la course dans Profil pour un découpage par montées et descentes.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Temps estimé" value={formatDuration(plan.totalMinutes)} accent />
          <Stat label="Arrivée" value={clockAt(s.start, plan.totalMinutes)} />
          <Stat label="Allure moyenne" value={pace(Number(profile.distance) / (plan.totalMinutes / 60))} unit="/km" />
          <Stat label="Sections" value={plan.sections.length} />
        </div>

        <Calibration calibration={calibration} refined={refined} theory={theory} total={plan.totalMinutes} onToggle={() => set({ useRuns: !s.useRuns })} />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Heure de départ">
            <input type="time" className={inputClass} value={s.start} onChange={(e) => set({ start: e.target.value || '08:00' })} />
          </Field>
          <Field label="Barrière horaire finale (heures)" hint="Facultatif : temps limite de la course.">
            <input type="number" min="1" max="60" step="0.5" className={inputClass} value={s.cutoff} placeholder="Ex. 10" onChange={(e) => set({ cutoff: e.target.value })} />
          </Field>
          <div className="rounded-xl border border-line bg-sunken/40 p-3">
            <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-muted">
              <span>Ambition</span>
              <span className="tabular text-ink">{pct === 0 ? 'Estimation' : pct < 0 ? `${-pct} % plus rapide` : `${pct} % plus prudent`}</span>
            </div>
            <input type="range" min="0.85" max="1.25" step="0.05" value={s.factor} onChange={(e) => set({ factor: Number(e.target.value) })} className="mt-2 w-full cursor-pointer" aria-label="Ambition" />
          </div>
        </div>

        {late && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold" style={{ borderColor: 'var(--type-vma)', color: 'var(--type-vma)' }}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Le temps estimé dépasse la barrière horaire de {formatDuration(plan.totalMinutes - cutoffMin)}. Visez un objectif plus rapide ou prévoyez moins d’arrêts.
          </div>
        )}
        {cutoffMin && !late && (
          <div className="mt-4 text-sm font-semibold" style={{ color: 'var(--type-ef)' }}>
            Marge de {formatDuration(cutoffMin - plan.totalMinutes)} sur la barrière horaire.
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">Section</th><th className="py-2 pr-3">Km</th><th className="py-2 pr-3">D+ / D−</th>
                <th className="py-2 pr-3">Durée</th><th className="py-2 pr-3">Passage</th><th className="py-2 pr-3">Glucides</th><th className="py-2">Eau</th>
              </tr>
            </thead>
            <tbody>
              {plan.sections.map((x) => (
                <tr key={x.index} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3 font-bold">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: KIND_COLOR[x.kind] }} />
                    {x.index}. {x.kind}
                  </td>
                  <td className="py-2.5 pr-3">{formatKm(x.toKm)} <span className="text-xs text-muted">(+{formatKm(x.km)})</span></td>
                  <td className="py-2.5 pr-3"><span className="text-accent">+{x.gain}</span> / −{x.loss} m</td>
                  <td className="py-2.5 pr-3">{formatDuration(x.minutes)}</td>
                  <td className="py-2.5 pr-3 font-bold">{clockAt(s.start, x.cumMinutes)}</td>
                  <td className="py-2.5 pr-3">{x.carbs} g</td>
                  <td className="py-2.5">{x.water} ml</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Plan de nutrition</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: Flame, label: 'Glucides', value: `${plan.nutrition.carbsPerHour} g/h`, total: `${plan.totalCarbs} g au total`, color: 'var(--type-cotes)' },
              { icon: Droplets, label: 'Eau', value: `${plan.nutrition.waterPerHour} ml/h`, total: `${String(plan.totalWater).replace('.', ',')} L au total`, color: 'var(--type-long)' },
              { icon: Timer, label: 'Sodium', value: `${plan.nutrition.sodiumPerHour} mg/h`, total: 'plus s’il fait chaud', color: 'var(--type-recup)' },
            ].map((n) => (
              <div key={n.label} className="rounded-xl bg-sunken p-3">
                <n.icon className="h-4 w-4" style={{ color: n.color }} />
                <div className="mt-2 text-[11px] font-bold uppercase text-muted">{n.label}</div>
                <div className="font-display text-xl font-black tabular">{n.value}</div>
                <div className="text-[11px] text-muted">{n.total}</div>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            <li>Repères : 1 gel ≈ 25 g de glucides, 1 barre ≈ 30 g, 500 ml de boisson d’effort ≈ 30 g.</li>
            <li>Commencer à manger dès la première demi-heure, puis toutes les 30 à 40 minutes.</li>
            <li>Tester ces quantités sur les sorties longues : ne rien essayer de nouveau le jour J.</li>
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Liste de matériel</div>
            <div className="text-xs font-bold tabular text-muted">{checked} / {items.length}</div>
          </div>
          <ProgressBar value={(checked / items.length) * 100} className="mt-2" color="var(--type-ef)" />
          <p className="mt-2 text-xs text-muted">Liste type : vérifiez le matériel obligatoire dans le règlement de votre course.</p>
          <ul className="mt-3 space-y-1">
            {items.map((i) => {
              const on = !!gear.checked?.[i];
              const custom = (gear.custom || []).includes(i);
              return (
                <li key={i} className="flex items-center gap-2">
                  <button onClick={() => toggle(i)} aria-pressed={on} className="flex flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sunken">
                    <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border-2', on ? 'border-transparent text-white' : 'border-line text-transparent')} style={on ? { background: 'var(--type-ef)' } : undefined}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className={cx(on && 'text-muted line-through')}>{i}</span>
                  </button>
                  {custom && (
                    <button onClick={() => setGear({ ...gear, custom: gear.custom.filter((c) => c !== i) })} className="p-1 text-muted hover:text-ink" aria-label={`Retirer ${i}`}><X className="h-4 w-4" /></button>
                  )}
                </li>
              );
            })}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newItem.trim();
              if (v && !items.includes(v)) setGear({ ...gear, custom: [...(gear.custom || []), v] });
              setNewItem('');
            }}
          >
            <input className={cx(inputClass, 'h-10')} value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Ajouter un élément" aria-label="Ajouter un élément" />
            <Button type="submit" variant="subtle" size="sm" className="h-10" disabled={!newItem.trim()}><Plus className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>

      {profile.raceTrack?.track?.length > 1 && (
        <Card className="p-5 sm:p-6">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Tracé du parcours</div>
          <TrackMap track={profile.raceTrack.track} height={280} />
        </Card>
      )}
    </div>
  );
}

/** Encart « estimation affinée » : compare la théorie (VMA) et la vitesse constatée sur les sorties longues. */
function Calibration({ calibration, refined, theory, total, onToggle }) {
  const [open, setOpen] = useState(false);
  if (!calibration) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-line p-3.5 text-sm text-muted">
        <Gauge className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Estimation basée sur votre VMA seule. Elle s’affinera automatiquement dès votre première sortie d’au moins 50 minutes avec du dénivelé (12 m de D+ par km ou plus), importée ou synchronisée.</span>
      </div>
    );
  }
  const faster = calibration.ratio > 1.005;
  const slower = calibration.ratio < 0.995;
  const Icon = slower ? TrendingDown : TrendingUp;
  const diff = Math.abs(theory - total);
  const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  return (
    <div className="mt-5 rounded-xl border p-3.5" style={{ borderColor: refined ? 'color-mix(in srgb, var(--type-ef) 45%, transparent)' : 'rgb(var(--line))', background: refined ? 'color-mix(in srgb, var(--type-ef) 7%, transparent)' : undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: refined ? 'var(--type-ef)' : 'rgb(var(--muted))' }}><Icon className="h-4 w-4" /></span>
          <div className="text-sm">
            <div className="font-extrabold">
              {refined ? `Estimation affinée d’après ${calibration.runs.length} sortie${calibration.runs.length > 1 ? 's' : ''} longue${calibration.runs.length > 1 ? 's' : ''}` : 'Estimation théorique (VMA seule)'}
            </div>
            <div className="text-muted tabular">
              {refined
                ? (faster || slower
                  ? `${formatDuration(diff)} ${faster ? 'de moins' : 'de plus'} que la théorie (${formatDuration(theory)}) : vous êtes ${faster ? 'plus rapide' : 'plus lent'} que prévu en terrain vallonné.`
                  : 'Vos sorties confirment l’estimation théorique.')
                : `Vos sorties donneraient ${formatDuration(buildDelta(theory, calibration.ratio))}.`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Masquer' : 'Détail'}</Button>
          <Button variant={refined ? 'ghost' : 'primary'} size="sm" onClick={onToggle}>{refined ? 'Revenir à la théorie' : 'Utiliser mes sorties'}</Button>
        </div>
      </div>
      {open && (
        <div className="rise mt-3 border-t border-line pt-3">
          <ul className="space-y-1.5 text-xs tabular">
            {calibration.runs.map((r) => (
              <li key={r.activity.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-bold">{r.activity.name} <span className="font-semibold text-muted">· {formatShortDate(r.activity.date)}</span></span>
                <span className="text-muted">{formatKm(r.activity.distanceKm)} km · {r.activity.dplus} m D+ · {formatDuration(r.activity.movingMin)} → <span className="font-bold text-ink">{fmt(r.speed)} km-effort/h</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Un km-effort vaut 1 km à plat, 100 m de montée ou 500 m de descente. Les {calibration.runs.length > 1 ? `${calibration.runs.length} sorties les plus rapides` : 'sorties'} des 10 dernières semaines sont majorées pour passer d’une allure d’entraînement à une allure de course, puis mélangées à la théorie ({fmt(calibration.model)} km-effort/h). Résultat retenu : {fmt(calibration.speed)} km-effort/h.
          </p>
        </div>
      )}
    </div>
  );
}

const buildDelta = (theoryMinutes, ratio) => theoryMinutes / ratio;
