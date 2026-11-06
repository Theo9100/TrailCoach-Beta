/**
 * Séances structurées (échauffement, répétitions, cibles) pour les montres.
 * Format rendu : syntaxe texte d'Intervals.icu, qui la convertit pour Suunto, Garmin, Coros…
 *
 * Règle : une séance utilise un seul type de cible (allure OU fréquence cardiaque).
 *  - Fractionné sur le plat (VMA, seuil, tempo) → allure absolue en min/km
 *  - Endurance, côtes, sortie longue → % de la FC max (plus fiable en trail)
 */
import { pace } from './format';

const hr = (lo, hi) => ({ kind: 'hr', lo, hi });
const sp = (lo, hi) => ({ kind: 'pace', lo, hi }); // fractions de VMA
const step = (dur, target, label) => ({ dur, target, label });

function minutes(m) {
  const v = Math.max(1, Math.round(m));
  return `${v}m`;
}

/** Structure d'une séance : liste de sections { title, repeat?, steps[] }. */
export function buildWorkout(type, phase, n, durationMin, { level, ultra }) {
  const deb = level === 'Débutant';
  const easyPace = sp(0.62, 0.7);
  const recPace = sp(0.5, 0.6);

  if (type === 'EF') {
    return [
      { title: 'Échauffement', steps: [step('10m', hr(0.65, 0.72))] },
      { title: 'Endurance', steps: [step(minutes(Math.max(15, durationMin - 15)), hr(0.7, 0.78))] },
      { title: 'Retour au calme', steps: [step('5m', hr(0.6, 0.7))] },
    ];
  }

  if (type === 'RECUP') {
    return [{ title: 'Récupération', steps: [step(minutes(durationMin), hr(0.6, 0.7))] }];
  }

  if (type === 'LONG') {
    const hi = phase === 'specifique' ? 0.84 : 0.8;
    return [{ title: 'Sortie longue', steps: [step(minutes(durationMin), hr(0.68, hi))] }];
  }

  const warmPace = { title: 'Échauffement', steps: [step('15m', easyPace)] };
  const coolPace = { title: 'Retour au calme', steps: [step('10m', sp(0.58, 0.66))] };
  const warmHr = { title: 'Échauffement', steps: [step('15m', hr(0.65, 0.75))] };
  const coolHr = { title: 'Retour au calme', steps: [step('10m', hr(0.6, 0.7))] };

  if (type === 'VMA') {
    if (phase === 'foncier') {
      const fast = deb ? sp(0.93, 0.97) : sp(0.98, 1.03);
      return [
        warmPace,
        { title: 'Série 1', repeat: n, steps: [step('30s', fast, 'Vite'), step('30s', recPace, 'Trot')] },
        { title: 'Récupération', steps: [step('3m', recPace)] },
        { title: 'Série 2', repeat: n, steps: [step('30s', fast, 'Vite'), step('30s', recPace, 'Trot')] },
        coolPace,
      ];
    }
    if (phase === 'developpement') {
      return [warmPace, { title: 'VMA longue', repeat: n, steps: [step('3m', sp(0.91, 0.95), 'Effort'), step('90s', recPace, 'Récup')] }, coolPace];
    }
    if (phase === 'specifique') {
      if (ultra) {
        return [warmPace, { title: 'Tempo', repeat: n, steps: [step('15m', sp(0.76, 0.8), 'Tempo'), step('3m', recPace, 'Récup')] }, coolPace];
      }
      return [warmPace, { title: 'Seuil', repeat: n, steps: [step('8m', sp(0.84, 0.88), 'Seuil'), step('2m', recPace, 'Récup')] }, coolPace];
    }
    return [warmPace, { title: "Rappel d'allure", repeat: 4, steps: [step('2m', sp(0.86, 0.9), 'Effort'), step('1m', recPace, 'Récup')] }, coolPace];
  }

  if (type === 'COTES') {
    if (phase === 'foncier') {
      return [warmHr, { title: 'Côtes courtes', repeat: n, steps: [step('45s', hr(0.88, 0.95), 'Montée'), step('90s', hr(0.6, 0.75), 'Descente')] }, coolHr];
    }
    if (phase === 'developpement') {
      return [warmHr, { title: 'Côtes longues', repeat: n, steps: [step('3m', hr(0.86, 0.92), 'Montée'), step('150s', hr(0.6, 0.75), 'Descente')] }, coolHr];
    }
    if (phase === 'specifique') {
      return [warmHr, { title: 'Montées allure course', repeat: n, steps: [step('11m', hr(0.78, 0.85), 'Montée'), step('5m', hr(0.6, 0.75), 'Descente')] }, coolHr];
    }
    return [warmHr, { title: 'Côtes légères', repeat: 6, steps: [step('1m', hr(0.8, 0.88), 'Montée'), step('90s', hr(0.6, 0.75), 'Descente')] }, coolHr];
  }

  return [];
}

/* ------------------------------------------------------------------ */
/* Rendu texte                                                        */
/* ------------------------------------------------------------------ */

function formatTarget(t, vma) {
  if (t.kind === 'hr') return `${Math.round(t.lo * 100)}-${Math.round(t.hi * 100)}% HR`;
  // allure : la plus rapide d'abord (vitesse haute = allure basse)
  return `${pace(vma * t.hi).replace("'", ':')}-${pace(vma * t.lo).replace("'", ':')}/km Pace`;
}

function formatDur(d) {
  // "90s" → "1m30s" ; "150s" → "2m30s"
  const m = /^(\d+)s$/.exec(d);
  if (m) {
    const s = Number(m[1]);
    if (s >= 60) return `${Math.floor(s / 60)}m${s % 60 ? `${s % 60}s` : ''}`;
  }
  return d;
}

/** Texte au format Intervals.icu (collable aussi dans son éditeur de séances). */
export function workoutToIntervalsText(sections, vma) {
  return sections
    .map((sec) => {
      const header = sec.repeat ? `${sec.title} ${sec.repeat}x` : sec.title;
      const lines = sec.steps.map((s) => `- ${s.label ? `${s.label} ` : ''}${formatDur(s.dur)} ${formatTarget(s.target, vma)}`);
      return [header, ...lines].join('\n');
    })
    .join('\n\n');
}
