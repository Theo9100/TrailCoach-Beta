/**
 * Recalage automatique : si la ou les semaines précédentes ont été peu suivies,
 * la charge de la semaine en cours (et de la suivante) est réduite pour reprendre en douceur.
 */
import { toISODate } from './format';

function regularity(week, completions, since, today) {
  const counted = week.sessions.filter((s) => !['COURSE', 'PREPA'].includes(s.type) && s.date < today && s.date >= since);
  if (counted.length < 2) return null;
  return counted.filter((s) => completions[s.id]?.done).length / counted.length;
}

export function computeLoadMods(plan, completions, todayWeek, since = '', disabled = {}) {
  const today = toISODate(new Date());
  const mods = {};
  const prev = plan[todayWeek - 2];
  if (!prev || disabled[todayWeek]) return mods;
  const r1 = regularity(prev, completions, since, today);
  if (r1 == null || r1 >= 0.5) return mods;
  const before = plan[todayWeek - 3];
  const r2 = before ? regularity(before, completions, since, today) : null;
  if (r2 != null && r2 < 0.5) {
    mods[todayWeek] = { factor: 0.7, reason: 'deux semaines peu suivies' };
    if (plan[todayWeek]) mods[todayWeek + 1] = { factor: 0.85, reason: 'deux semaines peu suivies' };
  } else {
    mods[todayWeek] = { factor: 0.85, reason: 'une semaine peu suivie' };
  }
  return mods;
}

/** Fatigue ressentie : moyenne des dernières notes d'effort et sensations. */
export function fatigueSignal(plan, completions) {
  const rated = plan
    .flatMap((w) => w.sessions)
    .filter((s) => completions[s.id]?.done && (completions[s.id].rpe || completions[s.id].feel))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3)
    .map((s) => completions[s.id]);
  if (rated.length < 2) return null;
  const rpes = rated.map((c) => c.rpe).filter(Boolean);
  const avg = rpes.length ? rpes.reduce((t, v) => t + v, 0) / rpes.length : 0;
  const tired = rated.filter((c) => c.feel === 'tired').length;
  if (tired >= 2 || avg >= 8) return { avg: Math.round(avg * 10) / 10, tired };
  return null;
}

/* ------------------------------------------------------------------ */
/* Estimation de VMA à partir des sorties                             */
/* ------------------------------------------------------------------ */

const PCT = [[6, 1], [12, 0.95], [20, 0.9], [30, 0.87], [45, 0.84], [60, 0.82], [75, 0.8]];
function sustainable(minutes) {
  for (let i = 1; i < PCT.length; i += 1) {
    if (minutes <= PCT[i][0]) {
      const [m0, p0] = PCT[i - 1];
      const [m1, p1] = PCT[i];
      return p0 + ((p1 - p0) * (minutes - m0)) / (m1 - m0);
    }
  }
  return 0.8;
}

/** VMA minimale démontrée par les sorties plates de 12 à 75 min. */
export function estimateVma(activities) {
  let best = null;
  activities.forEach((a) => {
    if (!a.movingMin || a.movingMin < 12 || a.movingMin > 75 || a.distanceKm < 3) return;
    if (a.dplus / a.distanceKm > 12) return;
    const speed = a.distanceKm / (a.movingMin / 60);
    const vma = speed / sustainable(a.movingMin);
    if (!best || vma > best.vma) best = { vma, activity: a };
  });
  if (!best) return null;
  return { vma: Math.floor(best.vma * 2) / 2, activity: best.activity };
}
