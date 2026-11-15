import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Field, RangeField, Segmented, cx, inputClass } from './ui';
import { healthAdvice } from '../lib/plan';

/** Estimation de la FC max d'après l'âge (formule de Tanaka : 208 − 0,7 × âge). */
export const fcMaxFromAge = (age) => Math.round(208 - 0.7 * age);

/** Volume couru actuellement, nombre de sorties et blessure récente. */
export function CurrentVolumeFields({ data, set, before = false }) {
  const km = data.currentKm ?? 20;
  const runs = data.currentRuns ?? 3;
  return (
    <>
      <RangeField
        label={before ? 'Km par semaine avant le programme' : 'Km courus par semaine en ce moment'}
        unit="km"
        min={0}
        max={120}
        step={1}
        value={km}
        onChange={(currentKm) => set({ currentKm })}
        hint="Moyenne des 4 dernières semaines, même approximative. Le plan démarre de là."
      />
      <RangeField
        label={before ? 'Sorties par semaine avant le programme' : 'Sorties par semaine en ce moment'}
        unit={runs > 1 ? 'sorties' : 'sortie'}
        min={0}
        max={7}
        step={1}
        value={runs}
        onChange={(currentRuns) => set({ currentRuns })}
      />
      <div>
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Blessure ou arrêt de plus de 3 semaines ces 3 derniers mois ?</span>
        <Segmented options={[{ value: false, label: 'Non' }, { value: true, label: 'Oui' }]} value={!!data.recentInjury} onChange={(recentInjury) => set({ recentInjury })} />
      </div>
    </>
  );
}

export function AgeField({ data, set }) {
  const age = Number(data.age);
  const suggestion = age >= 12 && age <= 90 ? fcMaxFromAge(age) : null;
  return (
    <Field label="Âge" hint={suggestion ? null : 'Facultatif : il sert à adapter la récupération et à estimer la FC max.'}>
      <div className="flex flex-wrap items-center gap-3">
        <input type="number" inputMode="numeric" min="12" max="90" className={cx(inputClass, 'w-28')} value={data.age ?? ''} placeholder="Ex. 34" onChange={(e) => set({ age: e.target.value === '' ? '' : Number(e.target.value) })} />
        {suggestion && suggestion !== Number(data.fcMax) && (
          <button type="button" onClick={() => set({ fcMax: Math.min(215, Math.max(150, suggestion)) })} className="rounded-lg bg-sunken px-3 py-2 text-xs font-bold text-ink hover:bg-line/60">
            FC max estimée : {suggestion} bpm · utiliser
          </button>
        )}
      </div>
    </Field>
  );
}

/** Mises en garde liées au profil, plus le rappel médical général. */
export function HealthAdvice({ profile, className }) {
  const advice = healthAdvice(profile);
  return (
    <div className={cx('space-y-2', className)}>
      {advice.map((a) => {
        const warn = a.tone === 'warn';
        const Icon = warn ? AlertTriangle : Info;
        return (
          <div key={a.text} className="flex items-start gap-2.5 rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: warn ? 'color-mix(in srgb, var(--type-cotes) 55%, transparent)' : 'rgb(var(--line))', background: warn ? 'color-mix(in srgb, var(--type-cotes) 8%, transparent)' : undefined }}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: warn ? 'var(--type-cotes)' : 'rgb(var(--muted))' }} />
            <span>{a.text}</span>
          </div>
        );
      })}
      <p className="text-xs leading-relaxed text-muted">Programme indicatif, calculé par des règles générales : il ne remplace ni un entraîneur ni un avis médical. En cas de douleur inhabituelle, de malaise ou d’essoufflement anormal, arrêtez-vous et consultez.</p>
    </div>
  );
}
