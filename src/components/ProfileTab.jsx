import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button, Card, Field, RangeField, SectionTitle, Segmented, cx, inputClass } from './ui';
import { LEVELS, peakTargets, totalWeeksFor, trainingZones } from '../lib/plan';
import { addDays, daysBetween, pace, toISODate } from '../lib/format';

export default function ProfileTab({ profile, onSave, onRestartWizard }) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(profile); }, [profile]);

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setSaved(false); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const dateDays = daysBetween(new Date(), draft.raceDate);
  const dateError = !draft.raceDate || daysBetween(draft.planStart, draft.raceDate) < 7 ? 'La course doit être après le début du programme.' : dateDays > 7 * 40 ? 'Date trop lointaine.' : null;
  const zones = trainingZones(draft);
  const peaks = peakTargets(draft);
  const vma = Number(draft.vma);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Le programme se recalcule à chaque modification"
        title="Profil du coureur"
        action={<Button variant="ghost" size="sm" onClick={onRestartWizard}><RotateCcw className="h-4 w-4" /> Questionnaire</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form
          onSubmit={(e) => { e.preventDefault(); if (!dateError) { onSave(draft); setSaved(true); } }}
          className="space-y-6"
        >
          <Card className="space-y-5 p-5 sm:p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Coureur</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom ou pseudo">
                <input className={inputClass} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Niveau</span>
                <Segmented options={LEVELS.map((l) => ({ value: l, label: l }))} value={draft.level} onChange={(level) => set({ level })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField label="VMA" unit="km/h" min={9} max={22} step={0.5} value={draft.vma} onChange={(v) => set({ vma: v })} />
              <RangeField label="FC max" unit="bpm" min={150} max={215} step={1} value={draft.fcMax} onChange={(v) => set({ fcMax: v })} />
            </div>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Objectif</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course">
                <input className={inputClass} value={draft.raceName} onChange={(e) => set({ raceName: e.target.value })} />
              </Field>
              <Field label="Date" hint={dateError}>
                <input type="date" className={cx(inputClass, dateError && 'border-[color:var(--type-vma)]')} min={toISODate(addDays(draft.planStart, 7))} value={draft.raceDate} onChange={(e) => set({ raceDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField label="Distance" unit="km" min={10} max={170} step={1} value={draft.distance} onChange={(v) => set({ distance: v })} />
              <RangeField label="D+" unit="m" min={100} max={10000} step={50} value={draft.elevation} onChange={(v) => set({ elevation: v })} />
            </div>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Disponibilités</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField label="Séances / semaine" min={2} max={6} step={1} value={draft.sessionsPerWeek} onChange={(v) => set({ sessionsPerWeek: v })} />
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Sortie longue</span>
                <Segmented options={[{ value: 5, label: 'Samedi' }, { value: 6, label: 'Dimanche' }]} value={Number(draft.longRunDay)} onChange={(v) => set({ longRunDay: v })} />
              </div>
            </div>
          </Card>

          <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl2 border border-line bg-surface/95 p-3 backdrop-blur md:bottom-4">
            <div className="flex-1 text-xs font-semibold text-muted">
              {saved && !dirty ? 'Profil enregistré, programme mis à jour.' : dirty ? `Nouveau plan : ${dateError ? '–' : totalWeeksFor(draft)} semaines, pic à ${peaks.peakKm} km / ${peaks.peakDPlus} m D+` : 'Aucune modification'}
            </div>
            {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(profile)}>Annuler</Button>}
            <Button type="submit" size="sm" disabled={!dirty || !!dateError}><Save className="h-4 w-4" /> Enregistrer</Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Vos zones d'entraînement</h3>
              <p className="mt-1 text-sm text-muted">Calculées depuis votre VMA ({String(draft.vma).replace('.', ',')} km/h) et votre FC max ({draft.fcMax} bpm).</p>
            </div>
            <ul>
              {zones.map((z, i) => (
                <li key={z.id} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-line p-4 last:border-0">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg font-display text-sm font-black text-white"
                    style={{ background: ['var(--type-recup)', 'var(--type-ef)', 'var(--type-cotes)', 'var(--phase-spe)', 'var(--type-vma)'][i] }}
                  >
                    {z.id}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold">{z.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold text-muted tabular">
                      <span>{z.pace}</span>
                      <span>{z.hr}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{z.feel}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Allures de référence</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[['10 km', 0.9], ['Semi', 0.85], ['Marathon', 0.8]].map(([label, pct]) => (
                <div key={label} className="rounded-lg bg-sunken p-3">
                  <div className="text-[11px] font-bold uppercase text-muted">{label}</div>
                  <div className="font-display text-lg font-black tabular">{pace(vma * pct)}</div>
                  <div className="text-[10px] font-bold text-muted">/km</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Allures sur route plate, à titre indicatif. En trail, fiez-vous plutôt à la FC et aux sensations.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
