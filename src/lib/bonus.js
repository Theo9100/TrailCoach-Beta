/**
 * Bibliothèque de séances bonus : du renforcement à piocher quand on a du temps,
 * en plus du programme. Chaque séance est plus ou moins recommandée selon la semaine
 * (phase, assimilation, forme signalée), la course visée et les séances du jour et du lendemain.
 */
import { buildStrengthSteps, estimateStepsMinutes, set } from './exercises';
import { addDays, toISODate } from './format';

export const CATEGORIES = {
  excentrique: { label: 'Excentrique', color: 'var(--type-vma)', hint: 'Freiner sous charge : des cuisses solides pour les descentes.' },
  plio: { label: 'Pliométrie', color: 'var(--type-cotes)', hint: 'Sauts et rebonds : une foulée plus réactive et économique.' },
  haut: { label: 'Haut du corps', color: 'var(--type-long)', hint: 'Bras, épaules, dos : pour les bâtons et la posture.' },
  gainage: { label: 'Gainage', color: 'var(--type-renfo)', hint: 'Un tronc stable pour garder sa foulée en fin de course.' },
  chevilles: { label: 'Chevilles & pieds', color: 'var(--type-ef)', hint: 'Équilibre et rebond : moins d’entorses sur les sentiers.' },
  force: { label: 'Force en côte', color: 'var(--accent)', hint: 'Des jambes puissantes pour les longues montées.' },
  mobilite: { label: 'Mobilité', color: 'var(--type-recup)', hint: 'Délier hanches et dos, récupérer en bougeant.' },
};

export const INTENSITY = {
  leger: { label: 'Léger', dots: 1 },
  modere: { label: 'Modéré', dots: 2 },
  intense: { label: 'Intense', dots: 3 },
};

const leg = { side: 'jambe' };
const sec = { timed: true };
const sideSec = { timed: true, side: 'côté' };

/**
 * phases : intérêt de la séance selon la phase du plan (0 à 3).
 * impact : sauts ou travail excentrique, qui fatiguent les jambes pendant 24 à 48 h.
 */
export const BONUS_SESSIONS = [
  {
    id: 'exc-init', cat: 'excentrique', intensity: 'modere', impact: true,
    title: 'Initiation excentrique',
    tagline: 'Apprendre à freiner en douceur, avant les vraies descentes.',
    phases: { foncier: 3, developpement: 2, specifique: 1, affutage: 0 },
    items: (n) => [set('squatlent', n, 8), set('descente', 2, 6, leg), set('pont', n, 12), set('molletsuni', n, 10, { side: 'jambe', note: 'descente en 3 s' })],
  },
  {
    id: 'exc', cat: 'excentrique', intensity: 'intense', impact: true, minLevel: 'Intermédiaire', easier: 'exc-init',
    title: 'Descentes freinées',
    tagline: 'La séance anti-courbatures des descentes : quadriceps et ischios sous tension.',
    phases: { foncier: 0, developpement: 2, specifique: 3, affutage: -1 },
    items: (n) => [set('descente', n, 10, leg), set('nordic', n, 5), set('squatlent', n, 10), set('bulgare', n, 8, { side: 'jambe', note: 'descente en 3 s' }), set('molletsuni', n, 15, leg)],
    rest: { restSet: 60, restExercise: 75 },
    note: 'Courbatures possibles pendant 1 à 2 jours : à placer au moins 48 h avant une sortie longue.',
  },
  {
    id: 'plio-pieds', cat: 'plio', intensity: 'modere', impact: true,
    title: 'Pieds réactifs',
    tagline: 'Rebonds courts et rapides pour une foulée plus économique.',
    phases: { foncier: 2, developpement: 3, specifique: 2, affutage: 0 },
    items: (n) => [set('pogo', n, 20, sec), set('skipping', n, 20, sec), set('sautuni', 2, 8, leg), set('equilibre', 2, 30, sideSec)],
    rest: { restSet: 45, restExercise: 60 },
  },
  {
    id: 'plio', cat: 'plio', intensity: 'intense', impact: true, minLevel: 'Intermédiaire', easier: 'plio-pieds',
    title: 'Explosivité',
    tagline: 'Sauts maximaux et bonds : la puissance pour relancer en côte.',
    phases: { foncier: 0, developpement: 3, specifique: 2, affutage: -1 },
    items: () => [set('squatsaute', 4, 6), set('boxjump', 4, 5), set('sautuni', 3, 8, leg), set('skipping', 3, 20, sec)],
    rest: { restSet: 75, restExercise: 90 },
    note: 'Qualité avant quantité : arrêtez dès que les sauts deviennent lourds.',
  },
  {
    id: 'haut-batons', cat: 'haut', intensity: 'modere',
    title: 'Bras et épaules pour les bâtons',
    tagline: 'Pousser sur les bâtons pendant des heures sans s’épuiser.',
    phases: { foncier: 2, developpement: 2, specifique: 2, affutage: 0 },
    items: (n, deb) => [set(deb ? 'pompesinc' : 'pompes', n, 10), set('dips', n, 10), set('superman', n, 12), set('planche', n, 40, sec)],
  },
  {
    id: 'haut-posture', cat: 'haut', intensity: 'leger',
    title: 'Posture et dos',
    tagline: 'Un buste droit et un dos solide, même avec un sac.',
    phases: { foncier: 2, developpement: 1, specifique: 1, affutage: 1 },
    items: (n) => [set('superman', n, 15), set('pompesinc', n, 10), set('deadbug', n, 10, { side: 'côté' }), set('planchelat', 2, 30, sideSec)],
    rest: { restSet: 30, restExercise: 45 },
  },
  {
    id: 'gainage-express', cat: 'gainage', intensity: 'modere',
    title: 'Gainage express',
    tagline: 'Un quart d’heure, n’importe où, pour un tronc plus stable.',
    phases: { foncier: 3, developpement: 2, specifique: 2, affutage: 1 },
    items: () => [set('planche', 3, 40, sec), set('planchelat', 2, 30, sideSec), set('deadbug', 3, 10, { side: 'côté' }), set('grimpeur', 3, 30, sec)],
    rest: { restSet: 30, restExercise: 45 },
  },
  {
    id: 'gainage-ultra', cat: 'gainage', intensity: 'modere',
    title: 'Tronc solide pour durer',
    tagline: 'Gainage long pour garder sa posture en fin d’ultra.',
    phases: { foncier: 1, developpement: 2, specifique: 2, affutage: 0 },
    items: (n) => [set('planche', n, 60, sec), set('planchelat', n, 45, sideSec), set('deadbug', n, 12, { side: 'côté' }), set('superman', n, 15), set('pontuni', n, 10, leg)],
  },
  {
    id: 'chevilles', cat: 'chevilles', intensity: 'leger',
    title: 'Chevilles en béton',
    tagline: 'Équilibre et rebond : la meilleure assurance contre les entorses.',
    phases: { foncier: 3, developpement: 2, specifique: 2, affutage: 2 },
    items: (n) => [set('equilibre', 3, 30, sideSec), set('molletsuni', n, 15, leg), set('pogo', 2, 20, sec), set('sautuni', 2, 6, leg)],
    rest: { restSet: 30, restExercise: 45 },
  },
  {
    id: 'mobilite', cat: 'mobilite', intensity: 'leger',
    title: 'Mobilité et récupération',
    tagline: 'Délier hanches et dos, idéal le lendemain d’une sortie longue.',
    phases: { foncier: 1, developpement: 1, specifique: 2, affutage: 3 },
    items: () => [set('hanches', 2, 45, sideSec), set('pont', 2, 12), set('superman', 2, 10), set('deadbug', 2, 8, { side: 'côté' })],
    rest: { restSet: 20, restExercise: 30 },
  },
  {
    id: 'force-cote', cat: 'force', intensity: 'intense',
    title: 'Force en côte',
    tagline: 'Montées de banc et fentes : la force pour les pentes raides.',
    phases: { foncier: 1, developpement: 3, specifique: 1, affutage: -1 },
    items: (n) => [set('stepup', 4, 10, leg), set('bulgare', n, 10, leg), set('chaise', n, 60, sec), set('molletsuni', n, 15, leg)],
    rest: { restSet: 60, restExercise: 75 },
  },
  {
    id: 'circuit', cat: 'force', intensity: 'modere',
    title: 'Circuit trail complet',
    tagline: 'Un peu de tout : jambes, bras, gainage et rebond.',
    hint: 'Une séance complète et équilibrée, quand on ne sait pas quoi choisir.',
    phases: { foncier: 3, developpement: 2, specifique: 1, affutage: 0 },
    items: (n, deb) => [set('squat', n, 15), set('fente', n, 10, leg), set(deb ? 'pompesinc' : 'pompes', n, 10), set('grimpeur', n, 30, sec), set('planchelat', 2, 30, sideSec), set('sautuni', 2, 8, leg)],
  },
];

export const bonusById = Object.fromEntries(BONUS_SESSIONS.map((b) => [b.id, b]));

/** Exercices adaptés au niveau du coureur. */
export function bonusItems(b, level) {
  const deb = level === 'Débutant';
  return b.items(deb ? 2 : 3, deb);
}

export function bonusMinutes(b, level) {
  return estimateStepsMinutes(buildStrengthSteps(bonusItems(b, level), b.rest || {}));
}

/** Objet « séance » compatible avec la séance guidée en plein écran. */
export function toPlayerSession(b, level) {
  const items = bonusItems(b, level);
  return {
    id: `bonus-${b.id}`,
    title: b.title,
    exercises: items,
    rest: b.rest,
    durationMin: bonusMinutes(b, level),
    zone: CATEGORIES[b.cat].label,
    kicker: 'Séance bonus',
    note: b.note,
  };
}

/* ------------------------------------------------------------------ */
/* Recommandations                                                     */
/* ------------------------------------------------------------------ */

const HARD = { VMA: 'fractionné', COTES: 'séance de côtes', LONG: 'sortie longue', PREPA: 'course de préparation', COURSE: 'course' };

/** Bonus faits dans une semaine du programme. */
export function bonusInWeek(log, week) {
  const end = toISODate(addDays(week.startDate, 6));
  return (log || []).filter((e) => e.date >= week.startDate && e.date <= end);
}

/** Contexte d'une semaine pour les recommandations. */
export function bonusContext({ week, profile, adjustment = 'normal', log, allSessions, today = toISODate(new Date()) }) {
  const done = bonusInWeek(log, week);
  const end = toISODate(addDays(week.startDate, 6));
  const isCurrent = today >= week.startDate && today <= end;
  const tomorrow = toISODate(addDays(today, 1));
  const hardOn = (date) => (allSessions || []).find((s) => s.date === date && HARD[s.type]);
  const dPerKm = Number(profile.elevation) / Math.max(1, Number(profile.distance));
  return {
    phase: week.phase,
    isRecovery: week.isRecovery,
    isRaceWeek: week.isRaceWeek,
    adjustment,
    level: profile.level,
    ultra: Number(profile.distance) >= 60,
    dPerKm,
    hilly: dPerKm >= 35,
    done,
    cap: profile.level === 'Débutant' ? 1 : 2,
    today: isCurrent ? { date: today, hard: hardOn(today), tomorrowHard: hardOn(tomorrow), bonusToday: done.some((e) => e.date === today) } : null,
  };
}

/**
 * Avis sur une séance bonus pour la semaine : tier « top » (recommandée), « ok » (possible),
 * « low » (peu utile maintenant) ou « avoid » (déconseillée), avec la raison principale,
 * et un avis pour aujourd'hui si la semaine est la semaine en cours.
 */
export function bonusAdvice(b, ctx) {
  let score = b.phases[ctx.phase] ?? 1;
  let avoid = null;
  const plus = [];
  const PHASE_WHY = {
    foncier: { top: 'Phase foncière : le bon moment pour construire les bases.', low: 'Plutôt pour plus tard dans la préparation.' },
    developpement: { top: 'Phase de développement : on gagne en force et en puissance.', low: 'Moins prioritaire en développement.' },
    specifique: { top: 'Phase spécifique : on prépare exactement le terrain de la course.', low: 'Moins prioritaire à l’approche de la course.' },
    affutage: { top: 'Affûtage : bouger sans se fatiguer.', low: 'En affûtage, on limite la fatigue.' },
  };

  let first = null; // raison prioritaire
  if (ctx.level === 'Débutant' && b.minLevel === 'Intermédiaire') {
    score -= 3;
    first = `Exigeante pour un débutant : commencez par « ${bonusById[b.easier]?.title} ».`;
  }
  if (ctx.hilly && b.cat === 'excentrique') { score += 1; plus.push(`Course très vallonnée (${Math.round(ctx.dPerKm)} m D+ par km) : les descentes vont marquer les cuisses.`); }
  if (ctx.ultra && (b.cat === 'haut' || b.id === 'gainage-ultra')) { score += 1; plus.push('Ultra : le buste et les bras travaillent des heures avec les bâtons.'); }
  if (ctx.isRecovery) {
    if (b.intensity === 'intense') { score -= 2; plus.unshift('Semaine d’assimilation : préférez une séance légère.'); }
    if (b.intensity === 'leger') { score += 1; plus.unshift('Semaine d’assimilation : idéal pour bouger sans fatiguer.'); }
  }
  if (ctx.isRaceWeek) {
    if (b.intensity !== 'leger') avoid = 'Semaine de course : on n’ajoute pas de fatigue.';
    else plus.unshift('Semaine de course : seulement pour rester mobile, au plus tard 3 jours avant.');
  } else if (ctx.phase === 'affutage' && b.intensity === 'intense') {
    avoid = 'Affûtage : pas de séance intense, le corps doit assimiler.';
  }
  if (ctx.adjustment === 'exhausted' && b.intensity !== 'leger') avoid = 'Vous avez signalé être épuisé cette semaine : seulement du léger.';
  else if (ctx.adjustment === 'fatigued' && b.intensity === 'intense') avoid = 'Vous avez signalé de la fatigue cette semaine.';
  if (ctx.done.length >= ctx.cap && b.intensity !== 'leger') {
    score -= 2;
    plus.unshift(`Déjà ${ctx.done.length} séance${ctx.done.length > 1 ? 's' : ''} bonus cette semaine : place à la récupération.`);
  }

  const tier = avoid ? 'avoid' : score >= 3 ? 'top' : score >= 1 ? 'ok' : 'low';
  const why = avoid || first || plus[0] || (tier === 'top' ? PHASE_WHY[ctx.phase]?.top : tier === 'low' ? PHASE_WHY[ctx.phase]?.low : b.hint || CATEGORIES[b.cat].hint);

  let today = null;
  if (ctx.today && tier !== 'avoid') {
    const heavy = b.impact || b.intensity === 'intense';
    if (heavy && ctx.today.tomorrowHard) today = { ok: false, text: `Pas aujourd’hui : ${HARD[ctx.today.tomorrowHard.type]} demain, gardez des jambes fraîches.` };
    else if (heavy && ctx.today.hard) today = { ok: false, text: `Pas aujourd’hui : vous avez déjà une ${HARD[ctx.today.hard.type]}.` };
    else if (ctx.today.bonusToday && b.intensity !== 'leger') today = { ok: false, text: 'Vous avez déjà fait une séance bonus aujourd’hui.' };
    else today = { ok: true, text: 'Bon moment pour la faire aujourd’hui.' };
  }
  return { tier, score, why, today };
}

/** Séances triées : recommandées d'abord, déconseillées à la fin. */
export function rankBonus(ctx) {
  const order = { top: 0, ok: 1, low: 2, avoid: 3 };
  return BONUS_SESSIONS
    .map((b) => ({ b, advice: bonusAdvice(b, ctx) }))
    .sort((x, y) => order[x.advice.tier] - order[y.advice.tier] || (y.advice.today?.ok ? 1 : 0) - (x.advice.today?.ok ? 1 : 0) || y.advice.score - x.advice.score);
}
