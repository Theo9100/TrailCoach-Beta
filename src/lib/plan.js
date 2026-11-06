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

export function peakTargets(profile) {
  const p = levelParams(profile.level);
  const sessions = clamp(Number(profile.sessionsPerWeek) || 4, 2, 6);
  const sessionMult = 0.7 + 0.075 * sessions;
  const peakKm = Math.min(p.kmCap, 20 + profile.distance * 0.9) * p.mult * sessionMult;
  const ratio = profile.elevation / Math.max(profile.distance, 1); // m de D+ par km de course
  const peakDPlus = clamp(peakKm * ratio * 0.9, peakKm * 12, p.dplusCap);
  return { peakKm: Math.round(peakKm), peakDPlus: roundTo(peakDPlus, 50) };
}

export function buildMacroCycle(profile) {
  const total = totalWeeksFor(profile);
  const p = levelParams(profile.level);
  const taper = total >= 8 ? 2 : 1;
  const build = Math.max(0, total - taper);
  const foncier = Math.max(build > 0 ? 1 : 0, Math.round(build * 0.4));
  const spec = build >= 3 ? Math.max(1, Math.round(build * 0.3)) : 0;
  const dev = Math.max(0, build - foncier - spec);
  const { peakKm, peakDPlus } = peakTargets(profile);

  const weeks = [];
  for (let n = 1; n <= total; n += 1) {
    let phase;
    if (n > build) phase = 'affutage';
    else if (n <= foncier) phase = 'foncier';
    else if (n <= foncier + dev) phase = 'developpement';
    else phase = 'specifique';

    let load;
    let isRecovery = false;
    if (phase === 'affutage') {
      load = n === total ? 0.35 : 0.65;
    } else {
      const t = build > 1 ? (n - 1) / (build - 1) : 1;
      load = p.start + (1 - p.start) * Math.pow(t, 0.9);
      isRecovery = n % p.cycle === 0 && n < build;
      if (isRecovery) load *= 0.72;
    }

    weeks.push({
      number: n,
      totalWeeks: total,
      phase,
      isRecovery,
      isRaceWeek: n === total,
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

export function generateWeek(profile, weekNumber, adjustmentKey = 'normal') {
  const macro = buildMacroCycle(profile);
  const meta = macro[clamp(weekNumber, 1, macro.length) - 1];
  const adj = ADJUSTMENTS[adjustmentKey] || ADJUSTMENTS.normal;
  const p = levelParams(profile.level);
  const vma = Number(profile.vma) || 14;
  const fc = Number(profile.fcMax) || 185;
  const longDay = Number(profile.longRunDay) === 5 ? 5 : 6;
  const count = clamp(Number(profile.sessionsPerWeek) || 4, 2, 6);
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

  // Ajustement « épuisé » : plus aucune intensité.
  if (adj.intensity === 0) {
    slots = slots.map((s) => ({ ...s, type: s.type === 'LONG' ? 'EF' : s.type === 'EF' ? 'EF' : 'RECUP' }));
  }

  const weeklyKm = meta.plannedKm * adj.km;
  const weeklyDPlus = meta.plannedDPlus * adj.dplus;
  const kmWeightSum = slots.reduce((s, x) => s + KM_WEIGHTS[x.type], 0) || 1;
  const dpWeightSum = slots.reduce((s, x) => s + DPLUS_WEIGHTS[x.type], 0) || 1;
  const longCap = clamp(profile.distance * 0.65, 14, p.longCap);

  const sessions = slots.map((slot) => {
    const type = slot.type;
    let km = (weeklyKm * KM_WEIGHTS[type]) / kmWeightSum;
    if (type === 'LONG') km = Math.min(km, longCap);
    km = Math.max(MIN_KM[type] * (meta.isRaceWeek ? 0.7 : 1), roundTo(km, 0.5));
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

  const training = sessions.filter((s) => s.type !== 'COURSE');
  return {
    ...meta,
    phaseInfo: PHASES[meta.phase],
    adjustment: adjustmentKey,
    targetKm: Math.round(training.reduce((s, x) => s + x.km, 0)),
    targetDPlus: roundTo(training.reduce((s, x) => s + x.dplus, 0), 10),
    targetMinutes: training.reduce((s, x) => s + x.durationMin, 0),
    sessions,
  };
}

/** Toutes les semaines (pour la vue d'ensemble). */
export function generatePlan(profile, adjustments = {}) {
  return buildMacroCycle(profile).map((w) => generateWeek(profile, w.number, adjustments[w.number]));
}

/** Estimation de VMA à partir d'un temps sur 10 km (≈ 90 % de VMA). */
export function vmaFrom10k(minutes) {
  if (!minutes || minutes <= 0) return null;
  return Math.round(((10 / (minutes / 60)) / 0.9) * 2) / 2;
}
