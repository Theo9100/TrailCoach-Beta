/**
 * Score de suivi du plan (0–100), calculé sur les séances déjà passées.
 *
 *  - Régularité (50 %) : part des séances prévues effectivement réalisées
 *  - Conformité (30 %) : moyenne des scores séance ↔ sortie (distance, D+, durée, FC)
 *  - Volume     (20 %) : écart entre les km réellement courus et les km prévus
 *
 * Sans sortie rattachée, la conformité est ignorée et son poids est réparti sur les deux autres.
 */
import { addDays, toISODate } from './format';

const WEIGHTS = { regularity: 0.5, conformity: 0.3, volume: 0.2 };

function combine({ regularity, conformity, volume }) {
  const parts = [
    [WEIGHTS.regularity, regularity],
    [WEIGHTS.conformity, conformity],
    [WEIGHTS.volume, volume],
  ].filter(([, v]) => v != null);
  const w = parts.reduce((s, [k]) => s + k, 0);
  return w ? Math.round((parts.reduce((s, [k, v]) => s + k * v, 0) / w) * 100) : null;
}

function evaluate(sessions, completions, activities, activitiesById, today, from, to, since) {
  // Les séances antérieures à la création du programme ne comptent pas (sauf si validées)
  const past = sessions.filter((s) => s.type !== 'COURSE' && (completions[s.id]?.done || (s.date < today && s.date >= since)));
  if (!past.length) return null;

  const done = past.filter((s) => completions[s.id]?.done);
  const scores = done.map((s) => completions[s.id]?.score).filter((v) => typeof v === 'number');

  // Volume réel : toutes les sorties de la période (même non prévues) + séances validées à la main
  const last = to < today ? to : today;
  const linkedIds = new Set(done.map((s) => completions[s.id]?.activityId).filter(Boolean));
  const periodActivities = activities.filter((a) => a.date >= from && a.date <= last);
  const manualKm = done.filter((s) => !activitiesById[completions[s.id]?.activityId]).reduce((t, s) => t + s.km, 0);
  const actualKm = periodActivities.reduce((t, a) => t + a.distanceKm, 0) + manualKm;
  const plannedKm = past.reduce((t, s) => t + s.km, 0);
  const extra = periodActivities.filter((a) => !linkedIds.has(a.id)).length;

  const parts = {
    regularity: done.length / past.length,
    conformity: scores.length ? scores.reduce((t, v) => t + v, 0) / scores.length / 100 : null,
    volume: plannedKm > 0 ? Math.max(0, 1 - Math.abs(actualKm / plannedKm - 1)) : null,
  };

  return {
    score: combine(parts),
    ...parts,
    done: done.length,
    past: past.length,
    actualKm,
    plannedKm,
    extra,
  };
}

export function planAdherence(plan, completions, activities, since = '', today = toISODate(new Date())) {
  const activitiesById = Object.fromEntries(activities.map((a) => [a.id, a]));
  const weeks = plan.map((w) => ({
    number: w.number,
    ...(evaluate(w.sessions, completions, activities, activitiesById, today, w.startDate, toISODate(addDays(w.startDate, 6)), since) || { score: null }),
  }));
  const end = plan.length ? toISODate(addDays(plan[plan.length - 1].startDate, 6)) : today;
  const global = plan.length ? evaluate(plan.flatMap((w) => w.sessions), completions, activities, activitiesById, today, plan[0].startDate, end, since) : null;
  return { global, weeks };
}

export function scoreLabel(score) {
  if (score == null) return 'Pas encore de données';
  if (score >= 90) return 'Excellent suivi';
  if (score >= 75) return 'Bon suivi';
  if (score >= 55) return 'Suivi partiel';
  return 'Plan peu suivi';
}

export function scoreColor(score) {
  if (score == null) return 'rgb(var(--muted))';
  if (score >= 75) return 'var(--type-ef)';
  if (score >= 55) return 'var(--type-cotes)';
  return 'var(--type-vma)';
}
