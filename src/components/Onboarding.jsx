import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Calculator, Check, Moon, Sun } from 'lucide-react';
import { Button, Card, Field, Logo, RangeField, Segmented, cx, inputClass } from './ui';
import { LEVELS, PHASES, buildMacroCycle, peakTargets, totalWeeksFor, vmaFrom10k } from '../lib/plan';
import { addDays, daysBetween, formatLongDate, mondayOf, toISODate } from '../lib/format';
import RaceGpxField, { trackToProfilePatch } from './RaceGpxField';

const STEPS = ['Vous', 'Objectif', 'Disponibilités'];

export default function Onboarding({ initial, onComplete, onSkip, dark, onToggleTheme, canCancel, onCancel }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => ({ ...initial, planStart: toISODate(mondayOf(new Date())) }));
  const [tenK, setTenK] = useState('');
  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const minDate = toISODate(addDays(new Date(), 14));
  const maxDate = toISODate(addDays(new Date(), 7 * 30));
  const weeks = totalWeeksFor(data);
  const dateDays = daysBetween(new Date(), data.raceDate);
  const dateError = !data.raceDate || dateDays < 14 ? 'La course doit avoir lieu dans au moins 2 semaines.' : dateDays > 7 * 30 ? 'Choisissez une course dans les 30 prochaines semaines.' : null;

  const macro = useMemo(() => (dateError ? [] : buildMacroCycle(data)), [data, dateError]);
  const peaks = peakTargets(data);
  const estimatedVma = vmaFrom10k(Number(tenK));

  const canNext = step === 0 ? data.name.trim().length > 0 : step === 1 ? !dateError && data.raceName.trim() : true;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Panneau visuel */}
      <aside className="relative overflow-hidden bg-night text-paper px-6 py-8 sm:px-10 lg:min-h-screen lg:py-12 flex flex-col">
        <div className="topo topo-layer" style={{ filter: 'invert(1)', opacity: 0.09 }} />
        <div className="relative flex items-center justify-between">
          <div className="[&_.text-accent]:text-accent"><Logo /></div>
          <button onClick={onToggleTheme} className="rounded-lg border border-paper/20 p-2 text-paper/80 hover:text-paper" aria-label="Changer de thème">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative mt-10 lg:mt-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Plan d'entraînement trail</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl font-black leading-[0.95]">
            Du canapé
            <br />
            à la ligne d'arrivée.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-paper/70">
            Trois questions, et TrailCoach construit votre préparation semaine par semaine : phases, volume, dénivelé et allures calculés à partir de votre VMA.
          </p>
        </div>
        <ol className="relative mt-8 hidden lg:flex gap-6 text-xs font-bold uppercase tracking-wider">
          {STEPS.map((s, i) => (
            <li key={s} className={cx('flex items-center gap-2', i === step ? 'text-paper' : 'text-paper/40')}>
              <span className={cx('grid h-6 w-6 place-items-center rounded-full border', i < step ? 'bg-accent border-accent text-white' : i === step ? 'border-paper' : 'border-paper/30')}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </aside>

      {/* Formulaire */}
      <main className="px-4 py-8 sm:px-10 lg:py-12 flex flex-col">
        <div className="mx-auto w-full max-w-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              Étape {step + 1} / 3
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <span key={s} className={cx('h-1.5 w-8 rounded-full', i <= step ? 'bg-accent' : 'bg-line')} />
                ))}
              </div>
            </div>
            {canCancel ? (
              <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSkip}>Passer</Button>
            )}
          </div>

          <div key={step} className="rise mt-8 flex-1 space-y-6">
            {step === 0 && (
              <>
                <header>
                  <h2 className="font-display text-3xl font-black">Faisons connaissance</h2>
                  <p className="mt-1 text-sm text-muted">Votre niveau et votre VMA déterminent l'intensité des séances.</p>
                </header>
                <Field label="Prénom ou pseudo">
                  <input className={inputClass} value={data.name} placeholder="Ex. Camille" onChange={(e) => set({ name: e.target.value })} autoFocus />
                </Field>
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Niveau d'expérience</span>
                  <Segmented options={LEVELS.map((l) => ({ value: l, label: l }))} value={data.level} onChange={(level) => set({ level })} />
                  <p className="mt-1.5 text-xs text-muted">
                    {data.level === 'Débutant' && 'Moins d’un an de course régulière ou premier trail.'}
                    {data.level === 'Intermédiaire' && 'Vous courez régulièrement et avez déjà fini quelques trails.'}
                    {data.level === 'Avancé' && 'Plusieurs années de pratique, habitué(e) aux gros volumes.'}
                  </p>
                </div>
                <RangeField label="VMA" unit="km/h" min={9} max={22} step={0.5} value={data.vma} onChange={(vma) => set({ vma })} />
                <Card className="p-4 bg-sunken/40">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <Calculator className="h-4 w-4" /> Vous ne connaissez pas votre VMA ?
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input className={cx(inputClass, 'w-32')} type="number" min="25" max="120" placeholder="Temps 10 km" value={tenK} onChange={(e) => setTenK(e.target.value)} aria-label="Temps sur 10 km en minutes" />
                    <span className="text-sm text-muted">minutes sur 10 km</span>
                    {estimatedVma && (
                      <Button size="sm" variant="subtle" onClick={() => set({ vma: Math.min(22, Math.max(9, estimatedVma)) })}>
                        Utiliser {String(estimatedVma).replace('.', ',')} km/h
                      </Button>
                    )}
                  </div>
                </Card>
                <RangeField label="FC maximale" unit="bpm" min={150} max={215} step={1} value={data.fcMax} onChange={(fcMax) => set({ fcMax })} hint="À défaut de test, comptez environ 220 − votre âge." />
              </>
            )}

            {step === 1 && (
              <>
                <header>
                  <h2 className="font-display text-3xl font-black">Votre défi</h2>
                  <p className="mt-1 text-sm text-muted">La course cible et sa date fixent la durée de la préparation.</p>
                </header>
                <RaceGpxField
                  track={data.raceTrack}
                  onLoad={(track) => set(trackToProfilePatch(track, data.raceName))}
                  onClear={() => set({ raceTrack: null })}
                />
                <Field label="Nom de la course">
                  <input className={inputClass} value={data.raceName} placeholder="Ex. Trail des Aiguilles" onChange={(e) => set({ raceName: e.target.value })} />
                </Field>
                <Field label="Date de la course" hint={dateError || `${formatLongDate(data.raceDate)} · ${weeks} semaines de préparation`}>
                  <input type="date" className={cx(inputClass, dateError && 'border-[color:var(--type-vma)]')} min={minDate} max={maxDate} value={data.raceDate} onChange={(e) => set({ raceDate: e.target.value })} />
                </Field>
                <RangeField label="Distance" unit="km" min={10} max={170} step={1} value={data.distance} onChange={(distance) => set({ distance })} hint={data.raceTrack ? 'Valeur lue dans le tracé GPX, modifiable.' : undefined} />
                <RangeField label="Dénivelé positif" unit="m D+" min={100} max={10000} step={50} value={data.elevation} onChange={(elevation) => set({ elevation })} hint={`${Math.round(data.elevation / Math.max(1, data.distance))} m de D+ par km`} />
              </>
            )}

            {step === 2 && (
              <>
                <header>
                  <h2 className="font-display text-3xl font-black">Votre semaine type</h2>
                  <p className="mt-1 text-sm text-muted">Le programme s'adapte au temps dont vous disposez.</p>
                </header>
                <RangeField label="Séances par semaine" unit="séances" min={2} max={6} step={1} value={data.sessionsPerWeek} onChange={(sessionsPerWeek) => set({ sessionsPerWeek })} />
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Jour de la sortie longue</span>
                  <Segmented options={[{ value: 5, label: 'Samedi' }, { value: 6, label: 'Dimanche' }]} value={Number(data.longRunDay)} onChange={(longRunDay) => set({ longRunDay })} />
                </div>

                <Card className="p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Aperçu de votre préparation</div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div><div className="font-display text-2xl font-black tabular">{weeks}</div><div className="text-xs text-muted">semaines</div></div>
                    <div><div className="font-display text-2xl font-black tabular">{peaks.peakKm}</div><div className="text-xs text-muted">km au pic</div></div>
                    <div><div className="font-display text-2xl font-black tabular text-accent">{peaks.peakDPlus}</div><div className="text-xs text-muted">m D+ au pic</div></div>
                  </div>
                  <div className="mt-4 flex h-14 items-end gap-[3px]" aria-hidden="true">
                    {macro.map((w) => (
                      <div key={w.number} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(8, w.load * 100)}%`, background: PHASES[w.phase].color, opacity: w.isRecovery ? 0.45 : 1 }} />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-muted">
                    {Object.values(PHASES).map((ph) => (
                      <span key={ph.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: ph.color }} />{ph.label}</span>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>

          <div className="mt-8 flex gap-3 pb-safe">
            {step > 0 && (
              <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < 2 ? (
              <Button size="lg" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={() => onComplete({ ...data, name: data.name.trim(), raceName: data.raceName.trim(), createdAt: toISODate(new Date()) })}>
                Créer mon programme <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
