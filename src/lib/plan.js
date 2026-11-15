/**
 * Générateur de programme trail — 100 % déterministe, sans IA.
 *
 * Principes appliqués :
 *  - périodisation en 4 phases : Foncier → Développement → Spécifique → Affûtage ;
 *  - cycles de charge 3:1 (2:1 pour les débutants) avec semaines d'assimilation ;
 *  - volume et D+ de pointe calculés à partir de la course, du niveau et du nombre de séances ;
 *  - allures dérivées de la VMA, zones cardiaques dérivées de la FC max.
 */
import { addDays, clamp, daysBetween, mondayOf, pace, roundTo, toISODate, weekdayIndex } from './format';
import { buildWorkout } from './workout';
import { STRENGTH_STAGES, buildStrengthSteps, estimateStepsMinutes, strengthRoutine, strengthStage } from './exercises';

export const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];

export const PHASES = {
  foncier: { key: 'foncier', label: 'Foncier', color: 'var(--phase-foncier)', goal: "Construire l'endurance de base, la régularité et le renforcement." },
  developpement: { key: 'developpement', label: 'Développement', color: 'var(--phase-dev)', goal: 'Augmenter la charge et développer la puissance en montée.' },
  specifique: { key: 'specifique', label: 'Spécifique', color: 'var(--phase-spe)', goal: 'Reproduire les exigences de la course : D+, allure, matériel, nutrition.' },
  affutage: { key: 'affutage', label: 'Affûtage', color: 'var(--phase-taper)', goal: 'Réduire le volume, garder du rythme et arriver frais le jour J.' },
};

export const SESSION_TYPES = {
  EF: { label: 'Endurance', short: 'EF', color: 'var(--type-ef)' },
  VMA: { label: 'Fractionné', short: 'VMA', color: 'var(--type-vma)' },
  COTES: { label: 'Côtes', short: 'Côtes', color: 'var(--type-cotes)' },
  LONG: { label: 'Sortie longue', short: 'Longue', color: 'var(--type-long)' },
  RECUP: { label: 'Récupération', short: 'Récup', color: 'var(--type-recup)' },
  RENFO: { label: 'Renforcement', short: 'Renfo', color: 'var(--type-renfo)' },
  PREPA: { label: 'Course de préparation', short: 'Prépa', color: 'var(--accent)' },
  COURSE: { label: 'Jour J', short: 'Course', color: 'var(--accent)' },
};

const LEVEL_PARAMS = {
  Débutant: { mult: 0.75, kmCap: 60, dplusCap: 2500, longCap: 28, start: 0.55, cycle: 3 },
  Intermédiaire: { mult: 1, kmCap: 90, dplusCap: 4500, longCap: 40, start: 0.6, cycle: 4 },
  Avancé: { mult: 1.25, kmCap: 130, dplusCap: 7000, longCap: 55, start: 0.65, cycle: 4 },
};

function levelParams(level) {
  return LEVEL_PARAMS[level] || LEVEL_PARAMS.Intermédiaire;
}

/* Emplacement des séances dans la semaine (0 = lundi), selon le nombre de séances et le jour de sortie longue. */
const SLOTS = {
  6: {
    2: [[2, 'ALT'], [6, 'LONG']],
    3: [[1, 'Q1'], [3, 'Q2'], [6, 'LONG']],
    4: [[1, 'VMA'], [2, 'EF'], [4, 'COTES'], [6, 'LONG']],
    5: [[0, 'EF'], [1, 'VMA'], [3, 'RECUP'], [4, 'COTES'], [6, 'LONG']],
    6: [[0, 'EF'], [1, 'VMA'], [2, 'RECUP'], [3, 'COTES'], [4, 'EF'], [6, 'LONG']],
  },
  5: {
    2: [[2, 'ALT'], [5, 'LONG']],
    3: [[1, 'Q1'], [3, 'Q2'], [5, 'LONG']],
    4: [[1, 'VMA'], [2, 'EF'], [3, 'COTES'], [5, 'LONG']],
    5: [[0, 'EF'], [1, 'VMA'], [3, 'COTES'], [5, 'LONG'], [6, 'RECUP']],
    6: [[0, 'EF'], [1, 'VMA'], [2, 'RECUP'], [3, 'COTES'], [5, 'LONG'], [6, 'RECUP']],
  },
};

const KM_WEIGHTS = { LONG: 0.36, EF: 0.17, VMA: 0.15, COTES: 0.15, RECUP: 0.1 };
const DPLUS_WEIGHTS = { LONG: 0.45, COTES: 0.3, EF: 0.12, RECUP: 0.05, VMA: 0.03 };
const MIN_KM = { LONG: 8, EF: 5, VMA: 6, COTES: 6, RECUP: 4 };
const SPEED_FACTOR = { LONG: 0.62, EF: 0.68, VMA: 0.72, COTES: 0.6, RECUP: 0.6 };

/* ---------------------------------------------------------------- */
/* Calendrier & macro-cycle                                         */
/* ---------------------------------------------------------------- */

export function totalWeeksFor(profile) {
  const start = profile.planStart || toISODate(mondayOf(new Date()));
  return Math.max(1, Math.floor(daysBetween(start, mondayOf(profile.raceDate)) / 7) + 1);
}

/** Numéro de la semaine du programme correspondant à aujourd'hui (borné). */
export function currentWeekNumber(profile, today = new Date()) {
  const n = Math.floor(daysBetween(profile.planStart, today) / 7) + 1;
  return clamp(n, 1, totalWeeksFor(profile));
}

/**
 * Réglages propres au coureur : volume actuel, âge, blessure récente.
 * Ils fixent le point de départ du plan, la hausse maximale d'une semaine à l'autre
 * et la fréquence des semaines allégées.
 */
export function personalSettings(profile) {
  const filled = (v) => v != null && v !== '';
  const age = filled(profile.age) ? Number(profile.age) : null;
  const injury = !!profile.recentInjury;
  const senior = age >= 60 ? 2 : age >= 50 ? 1 : 0;
  return {
    hasVolume: filled(profile.currentKm),
    currentKm: Math.max(0, Number(profile.currentKm) || 0),
    currentRuns: filled(profile.currentRuns) ? Math.max(0, Number(profile.currentRuns)) : null,
    age,
    injury,
    maxIncrease: injury || senior === 2 ? 0.07 : senior === 1 ? 0.08 : 0.1,
    peakFactor: senior === 2 ? 0.85 : senior === 1 ? 0.92 : 1,
    shortCycle: senior > 0 || injury,
  };
}

/** Volume et dénivelé hebdomadaires idéaux au pic, pour cette course et ce coureur. */
export function peakTargets(profile) {
  const p = levelParams(profile.level);
  const sessions = clamp(Number(profile.sessionsPerWeek) || 4, 2, 6);
  const sessionMult = 0.7 + 0.075 * sessions;
  const peakKm = Math.min(p.kmCap, 20 + profile.distance * 0.9) * p.mult * sessionMult * personalSettings(profile).peakFactor;
  const ratio = profile.elevation / Math.max(profile.distance, 1); // m de D+ par km de course
  const peakDPlus = clamp(peakKm * ratio * 0.9, peakKm * 12, p.dplusCap);
  return { peakKm: Math.round(peakKm), peakDPlus: roundTo(peakDPlus, 50) };
}

export function buildMacroCycle(profile) {
  const total = totalWeeksFor(profile);
  const p = levelParams(profile.level);
  const pp = personalSettings(profile);
  const cycle = pp.shortCycle ? Math.min(3, p.cycle) : p.cycle;
  const taper = total >= 8 ? 2 : 1;
  const build = Math.max(0, total - taper);
  const foncier = Math.max(build > 0 ? 1 : 0, Math.round(build * 0.4));
  const spec = build >= 3 ? Math.max(1, Math.round(build * 0.3)) : 0;
  const dev = Math.max(0, build - foncier - spec);
  const { peakKm, peakDPlus } = peakTargets(profile);

  // Point de départ : le volume réellement couru ces dernières semaines, s'il est connu
  const base = Math.max(pp.currentKm, 8);
  const startShare = pp.hasVolume ? clamp((base * (pp.injury ? 1 : 1.05)) / peakKm, 0.2, 0.9) : p.start;
  let ref = base; // dernier volume d'une semaine normale, référence de la hausse autorisée
  let reached = 0;

  const weeks = [];
  for (let n = 1; n <= total; n += 1) {
    let phase;
    if (n > build) phase = 'affutage';
    else if (n <= foncier) phase = 'foncier';
    else if (n <= foncier + dev) phase = 'developpement';
    else phase = 'specifique';

    let load;
    let isRecovery = false;
    let capped = false;
    if (phase === 'affutage') {
      load = (n === total ? 0.35 : 0.65) * (pp.hasVolume && reached > 0 ? reached / peakKm : 1);
    } else {
      const t = build > 1 ? (n - 1) / (build - 1) : 1;
      load = startShare + (1 - startShare) * Math.pow(t, 0.9);
      isRecovery = n % cycle === 0 && n < build;
      if (pp.hasVolume) {
        // Hausse plafonnée d'une semaine normale à la suivante (au moins 3 km, pour les petits volumes)
        const allowed = n === 1 && pp.injury ? base : Math.max(ref * (1 + pp.maxIncrease), ref + 3);
        const km = Math.min(peakKm * load, allowed);
        capped = km < peakKm * load - 0.5;
        load = km / peakKm;
        if (!isRecovery) ref = km;
        reached = Math.max(reached, km);
      }
      if (isRecovery) load *= 0.72;
    }

    weeks.push({
      number: n,
      totalWeeks: total,
      phase,
      isRecovery,
      isRaceWeek: n === total,
      capped,
      load,
      plannedKm: Math.round(peakKm * load),
      plannedDPlus: roundTo(peakDPlus * load, 10),
      startDate: toISODate(addDays(profile.planStart, (n - 1) * 7)),
    });
  }

  // Position de chaque semaine au sein de sa phase (0 → 1), pour faire progresser les séances.
  const byPhase = {};
  weeks.forEach((w) => { (byPhase[w.phase] ||= []).push(w); });
  Object.values(byPhase).forEach((list) => {
    list.forEach((w, i) => { w.phaseProgress = list.length > 1 ? i / (list.length - 1) : 1; });
  });

  return weeks;
}

/** Résumé du plan : pic réellement atteint, pic idéal, et s'il est limité par le volume de départ. */
export function planSummary(profile) {
  const ideal = peakTargets(profile);
  const pp = personalSettings(profile);
  const weeks = buildMacroCycle(profile);
  const peakKm = Math.max(...weeks.map((w) => w.plannedKm));
  const peakDPlus = Math.max(...weeks.map((w) => w.plannedDPlus));
  return {
    peakKm,
    peakDPlus,
    idealKm: ideal.peakKm,
    startKm: weeks[0].plannedKm,
    personalised: pp.hasVolume,
    limited: pp.hasVolume && peakKm < ideal.peakKm * 0.9,
    maxIncrease: pp.maxIncrease,
  };
}

/** Mises en garde et conseils liés au profil (âge, blessure, écart entre volume actuel et objectif). */
export function healthAdvice(profile) {
  const pp = personalSettings(profile);
  const out = [];
  const sum = planSummary(profile);
  if (sum.limited) {
    out.push({ tone: 'warn', text: `Avec ${pp.currentKm} km par semaine aujourd’hui et ${totalWeeksFor(profile)} semaines devant vous, le plan plafonne à ${sum.peakKm} km par semaine au lieu des ${sum.idealKm} km conseillés pour cette course. L’objectif raisonnable est de finir, sans viser un temps. Une course plus courte ou plus tardive serait plus sûre.` });
  }
  if (pp.currentRuns != null && Number(profile.sessionsPerWeek) > pp.currentRuns + 1) {
    out.push({ tone: 'info', text: `Vous passez de ${pp.currentRuns} à ${profile.sessionsPerWeek} séances par semaine : le plan en ajoute une toutes les 2 semaines plutôt que tout d’un coup.` });
  }
  if (pp.injury) {
    out.push({ tone: 'warn', text: 'Blessure ou arrêt récent : les 2 premières semaines se font sans fractionné ni côtes, et le volume monte plus lentement. Reprenez avec l’accord de votre médecin ou kiné, et arrêtez-vous si la douleur revient.' });
  }
  if (pp.age != null && pp.age < 18) {
    out.push({ tone: 'warn', text: 'Ce programme est conçu pour des adultes. Avant 18 ans, l’entraînement doit être encadré par un entraîneur de club.' });
  } else if (pp.age >= 60) {
    out.push({ tone: 'info', text: 'Après 60 ans, la récupération est plus lente : le plan allège une semaine sur trois, monte de 7 % par semaine au maximum et vise un pic un peu plus bas. Un bilan médical avec test d’effort est vivement conseillé.' });
  } else if (pp.age >= 50) {
    out.push({ tone: 'info', text: 'Après 50 ans, la récupération est plus lente : le plan allège une semaine sur trois et monte de 8 % par semaine au maximum. Un bilan médical avant de commencer est conseillé.' });
  } else if (pp.age >= 40 && (profile.level === 'Débutant' || (pp.hasVolume && pp.currentKm < 10))) {
    out.push({ tone: 'info', text: 'Après 40 ans, en débutant ou en reprenant la course, un bilan médical avant de commencer est conseillé.' });
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* Zones                                                            */
/* ---------------------------------------------------------------- */

export function trainingZones(profile) {
  const v = Number(profile.vma) || 14;
  const fc = Number(profile.fcMax) || 185;
  const bpm = (a, b) => `${Math.round(fc * a)}–${Math.round(fc * b)} bpm`;
  const speedRange = (a, b) => `${pace(v * b)}–${pace(v * a)} /km`;
  return [
    { id: 'Z1', name: 'Récupération', hr: bpm(0.6, 0.7), pace: speedRange(0.55, 0.62), feel: 'Très facile, conversation aisée' },
    { id: 'Z2', name: 'Endurance fondamentale', hr: bpm(0.7, 0.8), pace: speedRange(0.63, 0.72), feel: 'Facile, respiration fluide' },
    { id: 'Z3', name: 'Allure active / tempo', hr: bpm(0.8, 0.87), pace: speedRange(0.75, 0.82), feel: 'Soutenu, phrases courtes' },
    { id: 'Z4', name: 'Seuil', hr: bpm(0.87, 0.93), pace: speedRange(0.85, 0.9), feel: 'Difficile, quelques mots' },
    { id: 'Z5', name: 'VMA', hr: bpm(0.93, 1), pace: speedRange(0.95, 1.05), feel: 'Très intense, effort court' },
  ];
}

/* ---------------------------------------------------------------- */
/* Contenu des séances                                              */
/* ---------------------------------------------------------------- */

function lerpInt(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function buildContent(type, ctx) {
  const { phase, t, vma, fc, level, intensity, isRecovery, ultra } = ctx;
  const deb = level === 'Débutant';
  const p = (pct) => pace(vma * pct);
  const hr = (a, b) => `${Math.round(fc * a)}–${Math.round(fc * b)} bpm`;
  const reps = (a, b) => Math.max(2, Math.round(lerpInt(a, b, t) * (isRecovery ? 0.75 : 1) * intensity));
  const warmup = { label: 'Échauffement', detail: `15–20 min en endurance (${p(0.68)} /km), gammes et 3 accélérations progressives` };
  const cooldown = { label: 'Retour au calme', detail: '10 min très souple + étirements légers' };

  if (type === 'EF') {
    const ppg = phase === 'foncier' || phase === 'developpement';
    return {
      title: ppg ? 'Footing EF & renforcement' : 'Footing endurance fondamentale',
      zone: 'Z2',
      steps: [
        { label: 'Corps de séance', detail: `Course continue en aisance respiratoire, ${p(0.66)}–${p(0.7)} /km, FC ${hr(0.7, 0.78)}` },
        ppg
          ? { label: 'Renforcement', detail: deb ? '15 min : gainage 3×30 s, squats 3×12, fentes 3×10' : '20 min : gainage 4×45 s, squats sautés, fentes, montées sur banc, mollets' }
          : { label: 'Fin de séance', detail: '5 lignes droites relâchées de 80 m' },
      ],
    };
  }

  if (type === 'RECUP') {
    return {
      title: 'Footing de récupération',
      zone: 'Z1',
      steps: [{ label: 'Corps de séance', detail: `Très lent, terrain plat et souple, ${p(0.6)} /km ou plus lent, FC < ${Math.round(fc * 0.7)} bpm` }],
    };
  }

  if (type === 'VMA') {
    if (phase === 'foncier') {
      const n = reps(deb ? 8 : 10, deb ? 12 : 15);
      return {
        n,
        title: 'VMA courte 30/30',
        zone: 'Z5',
        steps: [warmup, { label: 'Corps de séance', detail: `2 × ${n} × (30 s à ${p(deb ? 0.95 : 1)} /km – 30 s trot), 3 min de récupération entre les séries` }, cooldown],
      };
    }
    if (phase === 'developpement') {
      const n = reps(deb ? 4 : 5, deb ? 6 : 8);
      return {
        n,
        title: 'VMA longue',
        zone: 'Z5',
        steps: [warmup, { label: 'Corps de séance', detail: `${n} × 3 min à ${p(0.93)} /km, récupération 1 min 30 en trottinant` }, cooldown],
      };
    }
    if (phase === 'specifique') {
      if (ultra) {
        const n = reps(2, 3);
        return {
          n,
        title: 'Tempo allure course',
          zone: 'Z3',
          steps: [warmup, { label: 'Corps de séance', detail: `${n} × 15 min en allure active (${p(0.78)} /km), 3 min de récupération` }, cooldown],
        };
      }
      const n = reps(3, 5);
      return {
        n,
        title: 'Travail au seuil',
        zone: 'Z4',
        steps: [warmup, { label: 'Corps de séance', detail: `${n} × 8 min au seuil (${p(0.86)} /km, FC ${hr(0.87, 0.92)}), récupération 2 min` }, cooldown],
      };
    }
    return {
      title: "Rappel d'allure",
      zone: 'Z4',
      steps: [warmup, { label: 'Corps de séance', detail: `${reps(4, 4)} × 2 min à ${p(0.88)} /km, récupération 1 min. Rester frais.` }, cooldown],
    };
  }

  if (type === 'COTES') {
    if (phase === 'foncier') {
      const n = reps(deb ? 6 : 8, deb ? 10 : 12);
      return {
        n,
        title: 'Côtes courtes',
        zone: 'Z5',
        steps: [warmup, { label: 'Corps de séance', detail: `${n} × 45 s en côte (8–12 %) à effort vif, retour en descente au trot` }, { label: 'Renforcement', detail: '10 min : gainage et mollets' }],
      };
    }
    if (phase === 'developpement') {
      const n = reps(deb ? 4 : 5, deb ? 6 : 8);
      return {
        n,
        title: 'Côtes longues',
        zone: 'Z4',
        steps: [warmup, { label: 'Corps de séance', detail: `${n} × 3 min de montée soutenue (FC ${hr(0.86, 0.92)}), redescente en trottinant` }, cooldown],
      };
    }
    if (phase === 'specifique') {
      const n = reps(3, 5);
      return {
        n,
        title: 'D+ spécifique & descente',
        zone: 'Z3',
        steps: [
          warmup,
          { label: 'Montées', detail: `${n} × 10–12 min de montée à allure course (marche active si > 15 %, bâtons si utilisés le jour J)` },
          { label: 'Descentes', detail: 'Redescentes techniques à allure contrôlée : appuis courts, regard loin' },
          ...(ctx.track?.longestClimb
            ? [{ label: 'Repère course', detail: `La plus longue montée du parcours fait ${ctx.track.longestClimb.gain} m D+ sur ${String(ctx.track.longestClimb.km).replace('.', ',')} km (${ctx.track.longestClimb.grade} % de moyenne) : choisissez une pente proche.` }]
            : []),
        ],
      };
    }
    return {
      title: 'Côtes légères',
      zone: 'Z3',
      steps: [warmup, { label: 'Corps de séance', detail: '6 × 1 min en côte, souple et relâché. Aucune fatigue recherchée.' }, cooldown],
    };
  }

  if (type === 'LONG') {
    const byPhase = {
      foncier: { title: 'Sortie longue vallonnée', detail: `Allure endurance (${p(0.63)}–${p(0.68)} /km sur le plat), marcher dans les fortes pentes` },
      developpement: { title: 'Sortie longue avec blocs en montée', detail: 'Endurance + 3 montées de 8–10 min en allure course' },
      specifique: { title: 'Simulation course', detail: 'Matériel, nutrition et rythme du jour J. Tester ravitaillement toutes les 45 min' },
      affutage: { title: 'Sortie longue réduite', detail: 'Facile, garder des sensations, aucune fatigue' },
    };
    const c = byPhase[phase];
    return {
      title: c.title,
      zone: phase === 'specifique' ? 'Z2–Z3' : 'Z2',
      steps: [
        { label: 'Corps de séance', detail: c.detail },
        { label: 'Hydratation', detail: 'Boire 400–600 ml/h, 30–60 g de glucides/h au-delà de 1 h 30' },
      ],
    };
  }

  return { title: 'Séance', zone: 'Z2', steps: [] };
}

/* ---------------------------------------------------------------- */
/* Génération d'une semaine                                         */
/* ---------------------------------------------------------------- */

export const ADJUSTMENTS = {
  normal: { label: 'En forme', hint: 'Programme standard', km: 1, dplus: 1, intensity: 1 },
  fatigued: { label: 'Fatigué', hint: '−20 % volume, −30 % D+, intensité réduite', km: 0.8, dplus: 0.7, intensity: 0.7 },
  exhausted: { label: 'Épuisé / malade', hint: 'Semaine de récupération : séances faciles uniquement', km: 0.5, dplus: 0.4, intensity: 0 },
};

function resolveSlotType(code, weekNumber, level) {
  if (code === 'ALT') return weekNumber % 2 ? 'VMA' : 'COTES';
  if (code === 'Q1') return level === 'Débutant' ? (weekNumber % 2 ? 'VMA' : 'COTES') : 'VMA';
  if (code === 'Q2') return level === 'Débutant' ? 'EF' : 'COTES';
  return code;
}

export function generateWeek(profile, weekNumber, adjustmentKey = 'normal', opts = {}) {
  const macro = buildMacroCycle(profile);
  const meta = macro[clamp(weekNumber, 1, macro.length) - 1];
  const adj = ADJUSTMENTS[adjustmentKey] || ADJUSTMENTS.normal;
  const p = levelParams(profile.level);
  const vma = Number(profile.vma) || 14;
  const fc = Number(profile.fcMax) || 185;
  const longDay = Number(profile.longRunDay) === 5 ? 5 : 6;
  const pp = personalSettings(profile);
  const wanted = clamp(Number(profile.sessionsPerWeek) || 4, 2, 6);
  // Si le coureur sort moins souvent aujourd'hui, on ajoute une séance toutes les 2 semaines
  const count = pp.currentRuns != null ? Math.min(wanted, Math.max(2, pp.currentRuns + 1 + Math.floor((meta.number - 1) / 2))) : wanted;
  const ultra = profile.distance >= 60;

  let slots = SLOTS[longDay][count].map(([day, code]) => ({ day, type: resolveSlotType(code, meta.number, profile.level) }));

  // Semaine de course : séances légères avant le jour J (veille au repos), puis la course.
  const raceDay = weekdayIndex(profile.raceDate);
  if (meta.isRaceWeek) {
    slots = slots
      .filter((s) => s.type !== 'LONG' && s.day < raceDay - 1)
      .slice(0, 3)
      .map((s) => ({ ...s, type: s.type === 'COTES' ? 'EF' : s.type }));
  }

  // Reprise après blessure : deux semaines sans fractionné ni côtes
  const lowStart = pp.hasVolume && pp.currentKm < 15 && meta.number <= 2 && !meta.isRaceWeek; // petit volume : on commence en endurance
  const easyReturn = (pp.injury || lowStart) && meta.number <= 2 && !meta.isRaceWeek;
  if (easyReturn) slots = slots.map((s) => ({ ...s, type: s.type === 'VMA' || s.type === 'COTES' ? 'EF' : s.type }));

  // Ajustement « épuisé » : plus aucune intensité.
  if (adj.intensity === 0) {
    slots = slots.map((s) => ({ ...s, type: s.type === 'LONG' ? 'EF' : s.type === 'EF' ? 'EF' : 'RECUP' }));
  }

  // Courses de préparation : mini-affûtage la semaine de la course, récupération la suivante
  const weekEnd = toISODate(addDays(meta.startDate, 6));
  const prevStart = toISODate(addDays(meta.startDate, -7));
  const prepRaces = (profile.prepRaces || []).filter((r) => r.date && r.date < toISODate(profile.raceDate));
  const prep = meta.isRaceWeek ? null : prepRaces.find((r) => r.date >= meta.startDate && r.date <= weekEnd) || null;
  const afterPrep = meta.isRaceWeek ? null : prepRaces.find((r) => r.date >= prevStart && r.date < meta.startDate) || null;
  const notes = [];
  if (meta.number === 1 && pp.hasVolume) {
    notes.push({ kind: 'start', text: `${pp.currentKm > 0 ? `Plan calé sur vos ${pp.currentKm} km par semaine actuels` : 'Vous partez de zéro, le plan démarre tout doucement'} : le volume monte d’environ ${Math.round(pp.maxIncrease * 100)} % par semaine au maximum${count < wanted ? `, et les séances passent progressivement de ${count} à ${wanted} par semaine` : ''}${lowStart && !pp.injury ? '. Les 2 premières semaines se font uniquement en endurance' : ''}.` });
  }
  if (easyReturn && pp.injury) notes.push({ kind: 'start', text: 'Reprise après blessure : semaine sans fractionné ni côtes. Arrêtez la séance si la douleur revient.' });
  let extra = 1;
  if (prep) { extra *= 0.8; notes.push({ kind: 'prep', text: `Course de préparation « ${prep.name} » cette semaine : charge réduite de 20 % et veille au repos.` }); }
  if (afterPrep) { extra *= 0.85; notes.push({ kind: 'prep', text: `Récupération après « ${afterPrep.name} » : charge réduite de 15 %.` }); }
  if (opts.loadFactor && opts.loadFactor < 1 && !meta.isRaceWeek) {
    extra *= opts.loadFactor;
    notes.push({ kind: 'recal', text: `Plan recalé : charge réduite de ${Math.round((1 - opts.loadFactor) * 100)} % pour reprendre progressivement après ${opts.loadReason || 'une semaine peu suivie'}.` });
  }

  const weeklyKm = meta.plannedKm * adj.km * extra;
  const weeklyDPlus = meta.plannedDPlus * adj.dplus * extra;
  const kmWeightSum = slots.reduce((s, x) => s + KM_WEIGHTS[x.type], 0) || 1;
  const dpWeightSum = slots.reduce((s, x) => s + DPLUS_WEIGHTS[x.type], 0) || 1;
  const longCap = clamp(profile.distance * 0.65, 14, p.longCap);
  // Pour les petits volumes, les distances minimales par séance sont réduites (jusqu'à moitié)
  const minScale = clamp(weeklyKm / (slots.reduce((t, x) => t + MIN_KM[x.type], 0) || 1), 0.5, 1) * (meta.isRaceWeek ? 0.7 : 1);

  const sessions = slots.map((slot) => {
    const type = slot.type;
    let km = (weeklyKm * KM_WEIGHTS[type]) / kmWeightSum;
    if (type === 'LONG') km = Math.min(km, longCap);
    km = Math.max(roundTo(MIN_KM[type] * minScale, 0.5), roundTo(km, 0.5));
    const dplus = roundTo((weeklyDPlus * DPLUS_WEIGHTS[type]) / dpWeightSum, 10);
    const effortKm = km + dplus / 100;
    const durationMin = roundTo((effortKm / (vma * SPEED_FACTOR[type])) * 60, 5);
    const content = buildContent(type, {
      phase: meta.phase,
      t: meta.phaseProgress,
      vma,
      fc,
      level: profile.level,
      intensity: adj.intensity || 1,
      isRecovery: meta.isRecovery,
      ultra,
      track: profile.raceTrack,
    });
    if (adj.intensity > 0 && adj.intensity < 1 && (type === 'VMA' || type === 'COTES')) {
      content.steps = [...content.steps, { label: 'Ajustement', detail: 'Fatigue signalée : nombre de répétitions réduit, stoppez si les sensations sont mauvaises.' }];
    }
    const workout = buildWorkout(type, meta.phase, content.n, durationMin, { level: profile.level, ultra });
    delete content.n;
    return {
      workout,
      id: `${meta.number}-${slot.day}`,
      dayIndex: slot.day,
      date: toISODate(addDays(meta.startDate, slot.day)),
      type,
      km,
      dplus,
      durationMin,
      ...content,
    };
  });

  // Week-end choc (ultras, phase spécifique) : deux sorties longues enchaînées
  const long = sessions.find((x) => x.type === 'LONG');
  if (ultra && long && meta.phase === 'specifique' && !meta.isRecovery && !prep && !afterPrep && adj.intensity === 1 && count >= 4) {
    const first = sessions.filter((x) => x.dayIndex < long.dayIndex && x.type !== 'LONG').sort((a, b) => b.dayIndex - a.dayIndex)[0];
    if (first && !sessions.some((x) => x !== first && x.dayIndex === long.dayIndex - 1)) {
      first.dayIndex = long.dayIndex - 1;
      first.date = toISODate(addDays(meta.startDate, first.dayIndex));
      first.type = 'LONG';
      first.km = roundTo(long.km * 0.6, 0.5);
      first.dplus = roundTo(long.dplus * 0.6, 10);
      first.durationMin = roundTo(((first.km + first.dplus / 100) / (vma * SPEED_FACTOR.LONG)) * 60, 5);
      first.title = 'Week-end choc · jour 1';
      first.zone = 'Z2';
      first.steps = [
        { label: 'Corps de séance', detail: 'Sortie vallonnée en endurance, sans chercher la vitesse : garder des forces pour demain' },
        { label: 'Récupération', detail: 'Bien manger et s’hydrater dans l’heure qui suit, se coucher tôt' },
      ];
      first.workout = buildWorkout('LONG', meta.phase, null, first.durationMin, { level: profile.level, ultra });
      long.title = 'Week-end choc · jour 2';
      long.steps = [{ label: 'Objectif', detail: 'Courir sur la fatigue de la veille, comme en fin d’ultra : rythme régulier, alimentation de course' }, ...long.steps];
      notes.push({ kind: 'choc', text: 'Week-end choc : deux sorties longues enchaînées pour habituer le corps à courir fatigué.' });
    }
  }

  // Course de préparation : remplace la sortie longue
  if (prep) {
    const prepDay = weekdayIndex(prep.date);
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      const x = sessions[i];
      if (x.type === 'LONG' || x.dayIndex === prepDay || x.dayIndex === prepDay - 1) sessions.splice(i, 1);
    }
    const km = Number(prep.distance) || 20;
    const dplus = Number(prep.elevation) || 0;
    sessions.push({
      id: `${meta.number}-prep`,
      dayIndex: prepDay,
      date: prep.date,
      type: 'PREPA',
      km,
      dplus,
      durationMin: roundTo(((km + dplus / 100) / (vma * 0.62)) * 60, 5),
      title: prep.name || 'Course de préparation',
      zone: 'Course',
      steps: [
        { label: 'Objectif', detail: 'Tester le matériel, l’alimentation et le rythme de course. Ce n’est pas l’objectif principal : rester en contrôle.' },
        { label: 'Après', detail: 'Deux jours très faciles, puis reprise progressive' },
      ],
    });
  }

  // Séance de renforcement dédiée
  if (profile.strength !== false && !meta.isRaceWeek && adj.intensity !== 0) {
    const used = new Set(sessions.map((x) => x.dayIndex));
    const hard = new Set(sessions.filter((x) => ['LONG', 'PREPA'].includes(x.type)).map((x) => x.dayIndex - 1));
    let day = [0, 1, 2, 3, 4, 5, 6].find((d) => !used.has(d) && !hard.has(d));
    if (day == null) day = (sessions.find((x) => x.type === 'EF' || x.type === 'RECUP') || sessions[0]).dayIndex;
    const stage = strengthStage(profile, meta.number, totalWeeksFor(profile));
    const routine = strengthRoutine(meta.phase, profile.level, meta.isRecovery || adj.intensity < 1, stage);
    sessions.push({
      id: `${meta.number}-renfo`,
      dayIndex: day,
      date: toISODate(addDays(meta.startDate, day)),
      type: 'RENFO',
      km: 0,
      dplus: 0,
      durationMin: Math.max(10, roundTo(estimateStepsMinutes(buildStrengthSteps(routine.items, { light: meta.phase === 'affutage' })), 5)),
      light: meta.phase === 'affutage',
      title: routine.title,
      zone: routine.stage != null ? `${STRENGTH_STAGES[routine.stage].label} · ${STRENGTH_STAGES[routine.stage].hint}` : 'Sans impact',
      stage: routine.stage,
      exercises: routine.items,
      steps: [
        { label: 'Déroulé', detail: 'Enchaîner les exercices avec 45 s de récupération entre les séries (30 s en affûtage). Privilégier la qualité du geste à la vitesse. La séance guidée gère les enchaînements et les chronos pour vous.' },
        ...(routine.stage > 0 ? [{ label: 'Progression', detail: 'Exercices exigeants : si un mouvement n’est pas encore maîtrisé, revenez à sa version simple (squat, fente, planche) le temps de progresser.' }] : []),
      ],
    });
  }

  // Séances déplacées par l'utilisateur
  const moves = opts.moves || {};
  sessions.forEach((x) => {
    const d = moves[x.id];
    if (Number.isInteger(d) && d >= 0 && d <= 6 && !['COURSE', 'PREPA'].includes(x.type) && d !== x.dayIndex) {
      x.plannedDay = x.dayIndex;
      x.dayIndex = d;
      x.date = toISODate(addDays(meta.startDate, d));
      x.moved = true;
    }
  });

  if (meta.isRaceWeek) {
    const raceSpeed = vma * (ultra ? 0.5 : 0.6);
    sessions.push({
      id: `${meta.number}-race`,
      dayIndex: raceDay,
      date: toISODate(profile.raceDate),
      type: 'COURSE',
      km: Number(profile.distance),
      dplus: Number(profile.elevation),
      durationMin: roundTo(((Number(profile.distance) + profile.elevation / 100) / raceSpeed) * 60, 5),
      title: profile.raceName || 'Jour de course',
      zone: 'Course',
      steps: [
        { label: 'Départ', detail: 'Partir prudemment : les 30 premières minutes doivent sembler faciles' },
        { label: 'Gestion', detail: 'Marcher les pentes raides, manger tôt et régulièrement, boire avant d’avoir soif' },
        { label: 'Mental', detail: 'Découper la course en sections entre ravitaillements' },
      ],
    });
  }

  sessions.sort((a, b) => a.dayIndex - b.dayIndex);

  const training = sessions.filter((s) => s.type !== 'COURSE' && s.type !== 'PREPA');
  return {
    ...meta,
    phaseInfo: PHASES[meta.phase],
    adjustment: adjustmentKey,
    notes,
    targetKm: Math.round(training.reduce((s, x) => s + x.km, 0)),
    targetDPlus: roundTo(training.reduce((s, x) => s + x.dplus, 0), 10),
    targetMinutes: training.reduce((s, x) => s + x.durationMin, 0),
    sessions,
  };
}

/** Toutes les semaines (pour la vue d'ensemble). */
export function generatePlan(profile, adjustments = {}, opts = {}) {
  return buildMacroCycle(profile).map((w) => generateWeek(profile, w.number, adjustments[w.number], {
    moves: opts.moves,
    loadFactor: opts.loadMods?.[w.number]?.factor,
    loadReason: opts.loadMods?.[w.number]?.reason,
  }));
}

/** Estimation de VMA à partir d'un temps sur 10 km (≈ 90 % de VMA). */
export function vmaFrom10k(minutes) {
  if (!minutes || minutes <= 0) return null;
  return Math.round(((10 / (minutes / 60)) / 0.9) * 2) / 2;
}
