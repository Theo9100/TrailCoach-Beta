/**
 * Bilan de fin de préparation : totaux réellement courus, temps forts,
 * suivi du plan et résultat de la course.
 */
import { addDays, toISODate } from './format';
import { planAdherence } from './score';

export function buildRecap(plan, completions, activities, profile, bonusLog = []) {
  if (!plan.length) return null;
  const from = plan[0].startDate;
  const raceDate = toISODate(profile.raceDate);
  const byId = Object.fromEntries(activities.map((a) => [a.id, a]));
  const course = plan.flatMap((w) => w.sessions).find((s) => s.type === 'COURSE') || null;
  const raceActivity = course ? byId[completions[course.id]?.activityId] || activities.find((a) => a.date === raceDate && a.distanceKm >= Number(profile.distance) * 0.6) || null : null;

  let km = 0; let dplus = 0; let minutes = 0; let outings = 0; let done = 0; let planned = 0; let strength = 0;
  let longest = null;
  let biggest = null;

  const weeks = plan.map((w) => {
    const end = toISODate(addDays(w.startDate, 6));
    // Sorties de la semaine (hors course objectif) + séances validées à la main
    const acts = activities.filter((a) => a.date >= w.startDate && a.date <= end && a !== raceActivity);
    const training = w.sessions.filter((s) => s.type !== 'COURSE');
    const manual = training.filter((s) => completions[s.id]?.done && !byId[completions[s.id]?.activityId]);
    const wKm = acts.reduce((t, a) => t + a.distanceKm, 0) + manual.reduce((t, s) => t + s.km, 0);
    const wDp = acts.reduce((t, a) => t + a.dplus, 0) + manual.reduce((t, s) => t + s.dplus, 0);
    const wMin = acts.reduce((t, a) => t + (a.movingMin || 0), 0) + manual.reduce((t, s) => t + s.durationMin, 0);

    km += wKm; dplus += wDp; minutes += wMin;
    outings += acts.length + manual.filter((s) => s.type !== 'RENFO').length;
    done += training.filter((s) => completions[s.id]?.done).length;
    planned += training.length;
    strength += training.filter((s) => s.type === 'RENFO' && completions[s.id]?.done).length;

    acts.forEach((a) => { if (!longest || a.distanceKm > longest.km) longest = { km: a.distanceKm, dplus: a.dplus, name: a.name, date: a.date }; });
    manual.forEach((s) => { if (s.km > 0 && (!longest || s.km > longest.km)) longest = { km: s.km, dplus: s.dplus, name: s.title, date: s.date }; });
    if (!biggest || wKm > biggest.km) biggest = { km: wKm, dplus: wDp, number: w.number };

    return { number: w.number, phase: w.phase, planned: w.targetKm, actual: Math.round(wKm) };
  });

  const adherence = planAdherence(plan, completions, activities, profile.createdAt || '').global;

  return {
    raceName: profile.raceName,
    raceDate,
    distance: Number(profile.distance),
    elevation: Number(profile.elevation),
    weeks,
    weekCount: plan.length,
    km: Math.round(km),
    dplus: Math.round(dplus),
    minutes: Math.round(minutes),
    outings,
    done,
    planned,
    strength,
    longest: longest && longest.km > 0 ? longest : null,
    biggest: biggest && biggest.km > 0 ? biggest : null,
    score: adherence?.score ?? null,
    raceActivityMinutes: raceActivity ? raceActivity.elapsedMin || raceActivity.movingMin || null : null,
    courseDone: !!(course && completions[course.id]?.done),
    bonus: (bonusLog || []).filter((e) => e.date >= from && e.date <= raceDate).length,
  };
}

/** Jours de récupération conseillés avant de reprendre l'entraînement structuré. */
export function recoveryDays(distanceKm) {
  return Math.min(28, Math.max(5, Math.round(distanceKm / 4)));
}

/** Équivalent parlant du dénivelé cumulé. */
export function climbEquivalent(dplus) {
  if (dplus >= 8849 * 0.5) return `${String(Math.round((dplus / 8849) * 10) / 10).replace('.', ',')} fois l’Everest depuis le niveau de la mer`;
  if (dplus >= 1500) return `${String(Math.round((dplus / 4806) * 10) / 10).replace('.', ',')} fois l’altitude du mont Blanc`;
  if (dplus > 0) return `${Math.round(dplus / 330)} tours Eiffel`;
  return null;
}

/** Résumé archivé quand un nouvel objectif démarre. */
export function archiveEntry(recap, finishMinutes, predictedMinutes) {
  return {
    id: `${recap.raceDate}-${Date.now()}`,
    raceName: recap.raceName,
    raceDate: recap.raceDate,
    distance: recap.distance,
    elevation: recap.elevation,
    weekCount: recap.weekCount,
    km: recap.km,
    dplus: recap.dplus,
    minutes: recap.minutes,
    done: recap.done,
    planned: recap.planned,
    score: recap.score,
    finishMinutes: finishMinutes || null,
    predictedMinutes: predictedMinutes ? Math.round(predictedMinutes) : null,
  };
}
