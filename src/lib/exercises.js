/**
 * Exercices de renforcement : consignes + postures clés (vue de profil) que le personnage animé enchaîne.
 * Coordonnées dans un repère 120 × 100, sol à y = 92.
 *
 * Rythme du mouvement, au choix :
 *  - tempo: [aller, pause, retour, pause] en ms, entre les postures a et b ;
 *  - frames: [[posture, durée en ms, accélération]], pour les mouvements à plus de deux temps (sauts…).
 * feet : 'flat' (pied à plat), 'point' (pointe tendue, au sol ou allongé) ou automatique.
 */
const STAND = {
  head: [60, 19], neck: [60, 30], hip: [60, 56],
  knee: [60, 74], foot: [58, 92], knee2: null, foot2: null,
  elbow: [63, 43], hand: [65, 55],
};
const pose = (o = {}) => ({ ...STAND, ...o });

export const EXERCISES = {
  squat: {
    name: 'Squat',
    tempo: [1200, 200, 900, 350],
    cue: 'Dos droit, genoux dans l’axe des pieds, descendre cuisses parallèles au sol.',
    a: pose({ elbow: [68, 40], hand: [76, 38] }),
    b: pose({ head: [62, 36], neck: [59, 46], hip: [49, 68], knee: [68, 72], elbow: [69, 50], hand: [80, 48] }),
  },
  fente: {
    name: 'Fentes',
    tempo: [1200, 200, 950, 350],
    cue: 'Grand pas, buste droit, le genou arrière frôle le sol sans le toucher.',
    a: pose({ hip: [58, 57], knee: [67, 74], foot: [70, 92], knee2: [51, 75], foot2: [42, 92], neck: [58, 31], head: [58, 20] }),
    b: pose({ head: [58, 32], neck: [58, 43], hip: [58, 69], knee: [74, 72], foot: [70, 92], knee2: [50, 87], foot2: [36, 89], elbow: [61, 56], hand: [63, 68] }),
  },
  stepup: {
    name: 'Montées de banc',
    tempo: [900, 350, 1400, 250],
    feet: 'flat',
    cue: 'Pousser sur la jambe posée sur le banc, monter le genou opposé, redescendre lentement.',
    prop: 'box',
    a: pose({ hip: [58, 57], neck: [60, 32], head: [61, 21], knee: [70, 66], foot: [70, 80], knee2: [56, 75], foot2: [52, 92] }),
    b: pose({ head: [72, 9], neck: [72, 20], hip: [72, 45], knee: [73, 63], foot: [70, 80], knee2: [84, 50], foot2: [80, 66], elbow: [70, 33], hand: [78, 26] }),
  },
  planche: {
    name: 'Planche',
    tempo: [2200, 0, 2200, 0],
    feet: 'point',
    cue: 'Corps aligné des épaules aux talons, ventre serré, ne pas creuser le dos.',
    hold: true,
    a: pose({ head: [95, 67], neck: [86, 71], hip: [58, 77], knee: [41, 83], foot: [24, 88], elbow: [86, 90], hand: [98, 90] }),
    b: pose({ head: [95, 66], neck: [86, 70], hip: [58, 75], knee: [41, 82], foot: [24, 88], elbow: [86, 90], hand: [98, 90] }),
  },
  pont: {
    name: 'Pont fessier',
    tempo: [900, 600, 1200, 250],
    feet: 'flat',
    cue: 'Allongé sur le dos, pousser dans les talons et monter le bassin, serrer les fessiers en haut.',
    a: pose({ head: [22, 87], neck: [31, 88], hip: [58, 88], knee: [74, 70], foot: [82, 92], elbow: [42, 90], hand: [54, 90] }),
    b: pose({ head: [22, 87], neck: [31, 87], hip: [58, 71], knee: [76, 66], foot: [82, 92], elbow: [42, 90], hand: [54, 90] }),
  },
  mollets: {
    name: 'Mollets',
    tempo: [700, 600, 1600, 250],
    cue: 'Monter sur la pointe des pieds, marquer un temps d’arrêt, redescendre en 3 secondes.',
    a: pose(),
    b: pose({ head: [60, 12], neck: [60, 23], hip: [60, 49], knee: [60, 67], foot: [58, 85], elbow: [63, 36], hand: [65, 48] }),
  },
  chaise: {
    name: 'Chaise',
    tempo: [2200, 0, 2200, 0],
    feet: 'flat',
    cue: 'Dos plaqué au mur, cuisses à l’horizontale, genoux à 90°. Tenir sans bouger.',
    hold: true,
    prop: 'wall',
    a: pose({ head: [47, 33], neck: [46, 44], hip: [46, 70], knee: [66, 70], foot: [66, 92], elbow: [52, 56], hand: [60, 62] }),
    b: pose({ head: [47, 34], neck: [46, 45], hip: [46, 71], knee: [66, 70], foot: [66, 92], elbow: [52, 57], hand: [60, 63] }),
  },
  superman: {
    name: 'Superman',
    tempo: [800, 700, 1000, 300],
    feet: 'point',
    cue: 'À plat ventre, décoller bras et jambes en même temps, regard vers le sol.',
    a: pose({ head: [91, 83], neck: [82, 85], hip: [56, 87], knee: [40, 88], foot: [24, 89], elbow: [94, 88], hand: [106, 88] }),
    b: pose({ head: [92, 74], neck: [82, 79], hip: [56, 86], knee: [40, 84], foot: [24, 79], elbow: [95, 76], hand: [107, 72] }),
  },
  hanches: {
    name: 'Mobilité des hanches',
    tempo: [2400, 0, 2400, 0],
    cue: 'En fente basse, avancer le bassin et lever les bras, sans forcer. Respirer lentement.',
    hold: true,
    a: pose({ head: [58, 32], neck: [58, 43], hip: [58, 69], knee: [74, 72], foot: [70, 92], knee2: [48, 88], foot2: [32, 90], elbow: [60, 30], hand: [61, 17] }),
    b: pose({ head: [61, 33], neck: [61, 44], hip: [62, 71], knee: [76, 72], foot: [70, 92], knee2: [50, 89], foot2: [32, 90], elbow: [64, 31], hand: [66, 18] }),
  },
  bulgare: {
    name: 'Fentes bulgares',
    tempo: [1300, 200, 950, 350],
    feet: 'flat',
    cue: 'Pied arrière posé sur un banc, descendre à la verticale jusqu’à ce que la cuisse avant soit horizontale. Le poids reste sur le talon avant.',
    prop: 'boxBack',
    a: pose({ head: [62, 18], neck: [61, 29], hip: [60, 54], knee: [69, 72], foot: [70, 92], knee2: [50, 70], foot2: [36, 74], elbow: [64, 42], hand: [67, 53] }),
    b: pose({ head: [63, 32], neck: [62, 43], hip: [60, 68], knee: [77, 72], foot: [70, 92], knee2: [50, 86], foot2: [36, 74], elbow: [66, 55], hand: [71, 64] }),
  },
  squatsaute: {
    name: 'Squats sautés',
    frames: [['a', 380, 'out'], ['a', 180], ['t', 200, 'in'], ['b', 250, 'out'], ['t', 230, 'in'], ['a', 330, 'out']],
    cue: 'Descendre en squat puis sauter le plus haut possible. Réception souple et silencieuse, genoux dans l’axe.',
    a: pose({ head: [62, 36], neck: [59, 46], hip: [49, 68], knee: [68, 72], elbow: [67, 55], hand: [74, 47] }),
    t: pose({ head: [61, 15], neck: [60, 26], hip: [60, 52], knee: [60, 70], foot: [58, 88], elbow: [66, 19], hand: [70, 9] }),
    b: pose({ head: [61, 10], neck: [60, 21], hip: [60, 47], knee: [61, 65], foot: [58, 83], elbow: [66, 13], hand: [69, 4] }),
  },
  sautuni: {
    name: 'Sauts sur une jambe',
    frames: [['a', 320, 'out'], ['a', 160], ['b', 300, 'out'], ['a', 320, 'in']],
    cue: 'Petits bonds sur une seule jambe, en restant gainé. Amortir chaque réception, le genou ne rentre pas vers l’intérieur.',
    a: pose({ head: [63, 25], neck: [62, 36], hip: [60, 61], knee: [67, 76], foot: [60, 92], knee2: [59, 76], foot2: [47, 80], elbow: [67, 48], hand: [73, 56] }),
    b: pose({ head: [64, 9], neck: [63, 20], hip: [62, 45], knee: [64, 62], foot: [61, 80], knee2: [66, 58], foot2: [54, 66], elbow: [68, 31], hand: [76, 25] }),
  },
  planchelat: {
    name: 'Planche latérale dynamique',
    tempo: [1100, 200, 1100, 200],
    feet: 'point',
    cue: 'En appui sur l’avant-bras, corps aligné. Descendre le bassin vers le sol puis le remonter. Changer de côté.',
    floor: true,
    a: pose({ head: [96, 52], neck: [87, 58], hip: [58, 73], knee: [41, 81], foot: [24, 90], elbow: [88, 90], hand: [100, 90] }),
    b: pose({ head: [96, 54], neck: [87, 60], hip: [58, 83], knee: [41, 87], foot: [24, 90], elbow: [88, 90], hand: [100, 90] }),
  },
  pontuni: {
    name: 'Pont fessier sur une jambe',
    tempo: [900, 600, 1200, 250],
    feet: 'flat',
    cue: 'Une jambe tendue dans le prolongement de la cuisse, pousser dans le talon de l’autre. Le bassin reste horizontal.',
    floor: true,
    a: pose({ head: [22, 87], neck: [31, 88], hip: [58, 88], knee: [74, 70], foot: [82, 92], knee2: [76, 80], foot2: [94, 74], elbow: [42, 90], hand: [54, 90] }),
    b: pose({ head: [22, 87], neck: [31, 87], hip: [58, 71], knee: [76, 66], foot: [82, 92], knee2: [78, 62], foot2: [98, 54], elbow: [42, 90], hand: [54, 90] }),
  },
  descente: {
    name: 'Descentes de banc freinées',
    tempo: [2800, 250, 900, 350],
    feet: 'flat',
    cue: 'Debout sur le banc, descendre le talon libre vers le sol en 4 secondes, l’effleurer, puis remonter. Idéal pour préparer les descentes.',
    prop: 'box',
    a: pose({ head: [72, 9], neck: [72, 20], hip: [72, 45], knee: [73, 63], foot: [70, 80], knee2: [67, 63], foot2: [57, 77], elbow: [74, 33], hand: [76, 45] }),
    b: pose({ head: [71, 20], neck: [70, 31], hip: [67, 55], knee: [79, 67], foot: [70, 80], knee2: [60, 73], foot2: [53, 91], elbow: [75, 42], hand: [82, 49] }),
  },
  molletsuni: {
    name: 'Mollets sur une jambe',
    tempo: [700, 600, 1600, 250],
    cue: 'Sur un seul pied, monter sur la pointe, marquer un temps d’arrêt, redescendre en 3 secondes. Se tenir à un mur si besoin.',
    a: pose({ knee2: [65, 72], foot2: [55, 81] }),
    b: pose({ head: [60, 12], neck: [60, 23], hip: [60, 49], knee: [60, 67], foot: [58, 85], knee2: [65, 65], foot2: [55, 74], elbow: [63, 36], hand: [65, 48] }),
  },
  grimpeur: {
    name: 'Grimpeur',
    frames: [['b', 300, 'inOut'], ['a', 300, 'inOut'], ['c', 300, 'inOut'], ['a', 300, 'inOut']],
    feet: 'point',
    c: pose({ head: [97, 59], neck: [88, 64], hip: [60, 69], knee: [76, 79], foot: [62, 87], knee2: [42, 80], foot2: [24, 90], elbow: [90, 78], hand: [91, 91] }),
    cue: 'En appui sur les mains, ramener un genou vers la poitrine puis l’autre, sans lever les fesses. Rythme soutenu.',
    floor: true,
    a: pose({ head: [97, 59], neck: [88, 64], hip: [60, 70], knee: [42, 80], foot: [24, 90], knee2: [42, 80], foot2: [24, 90], elbow: [90, 78], hand: [91, 91] }),
    b: pose({ head: [97, 59], neck: [88, 64], hip: [60, 69], knee: [42, 80], foot: [24, 90], knee2: [76, 79], foot2: [62, 87], elbow: [90, 78], hand: [91, 91] }),
  },
};

/** Une ligne de routine : nombre de séries, répétitions (ou secondes si timed), éventuellement par jambe / côté. */
function set(id, sets, amount, { timed = false, side = null, note = null } = {}) {
  const dose = `${sets} × ${amount}${timed ? ' s' : ''}${side ? ` par ${side}` : ''}${note ? `, ${note}` : ''}`;
  return { id, sets, amount, timed, side, note, dose };
}
const sec = { timed: true };
const leg = { side: 'jambe' };
const sideSec = { timed: true, side: 'côté' };

export const STRENGTH_STAGES = [
  { label: 'Niveau 1', hint: 'les bases' },
  { label: 'Niveau 2', hint: 'travail sur une jambe' },
  { label: 'Niveau 3', hint: 'explosivité et freinage' },
];

/**
 * Palier de difficulté du renforcement (0 à 2).
 * En mode automatique, il monte au fil du programme, plus ou moins vite selon le niveau du coureur.
 */
export function strengthStage(profile, weekNumber, totalWeeks) {
  const pref = profile.strengthLevel || 'auto';
  if (pref === 'base') return 0;
  if (pref === 'avance') return 2;
  const t = totalWeeks > 1 ? (weekNumber - 1) / (totalWeeks - 1) : 0;
  if (profile.level === 'Débutant') return t < 0.5 ? 0 : 1;
  if (profile.level === 'Avancé') return t < 0.25 ? 1 : 2;
  return t < 0.3 ? 0 : t < 0.62 ? 1 : 2;
}

/** Routine de la séance de renforcement selon la phase, le niveau et le palier de difficulté. */
export function strengthRoutine(phase, level, light = false, stage = 0) {
  const deb = level === 'Débutant';
  const sets = light ? 2 : deb ? 2 : 3;
  const routines = {
    foncier: {
      title: 'Renforcement général',
      stages: [
        [set('squat', sets, 12), set('fente', sets, 10, leg), set('planche', sets, deb ? 30 : 45, sec), set('pont', sets, 15), set('mollets', sets, 15)],
        [set('squat', sets, 15), set('bulgare', sets, 8, leg), set('planchelat', sets, 30, sideSec), set('pontuni', sets, 10, leg), set('molletsuni', sets, 12, leg)],
        [set('squatsaute', sets, 10), set('bulgare', sets, 10, leg), set('grimpeur', sets, 30, sec), set('pontuni', sets, 12, leg), set('molletsuni', sets, 15, leg)],
      ],
    },
    developpement: {
      title: 'Renforcement spécifique montée',
      stages: [
        [set('stepup', sets, 10, leg), set('squat', sets, 15), set('fente', sets, 12, leg), set('chaise', sets, 45, sec), set('planche', sets, 45, sec), set('superman', sets, 12)],
        [set('stepup', sets, 12, leg), set('bulgare', sets, 10, leg), set('squatsaute', sets, 8), set('chaise', sets, 60, sec), set('planchelat', sets, 40, sideSec), set('superman', sets, 15)],
        [set('descente', sets, 8, leg), set('bulgare', sets, 12, leg), set('squatsaute', sets, 12), set('sautuni', sets, 8, leg), set('grimpeur', sets, 40, sec), set('planchelat', sets, 45, sideSec)],
      ],
    },
    specifique: {
      title: 'Renforcement descente & gainage',
      stages: [
        [set('stepup', sets, 12, { side: 'jambe', note: 'descente en 4 s' }), set('fente', sets, 12, leg), set('chaise', sets, 60, sec), set('mollets', sets, 20), set('planche', sets, 60, sec)],
        [set('descente', sets, 10, leg), set('bulgare', sets, 10, leg), set('chaise', sets, 75, sec), set('molletsuni', sets, 15, leg), set('planchelat', sets, 45, sideSec)],
        [set('descente', sets, 12, leg), set('sautuni', sets, 10, leg), set('squatsaute', sets, 12), set('chaise', sets, 90, sec), set('molletsuni', sets, 20, leg), set('grimpeur', sets, 45, sec)],
      ],
    },
    affutage: {
      title: 'Mobilité & activation',
      stages: [[set('hanches', 2, 45, sideSec), set('pont', 2, 12), set('planche', 2, 30, sec), set('mollets', 2, 12)]],
    },
  };
  const r = routines[phase] || routines.foncier;
  const s = Math.min(Math.max(0, stage), r.stages.length - 1);
  return { title: r.title, items: r.stages[s], stage: r.stages.length > 1 ? s : null };
}

/* ------------------------------------------------------------------ */
/* Séance guidée : déroulé pas à pas                                   */
/* ------------------------------------------------------------------ */

const MATERIAL = { box: 'Un banc, une chaise stable ou une marche', boxBack: 'Un banc, une chaise stable ou une marche', wall: 'Un mur' };

/** Matériel à prévoir pour une liste d'exercices. */
export function materialFor(items) {
  const list = new Set();
  items.forEach((it) => {
    const ex = EXERCISES[it.id];
    if (MATERIAL[ex?.prop]) list.add(MATERIAL[ex.prop]);
    if (ex?.floor || ['planche', 'pont', 'superman'].includes(it.id)) list.add('Un tapis de sol');
  });
  return [...list];
}

/**
 * Transforme la routine en étapes : effort, récupération, changement de côté.
 * Les exercices s'enchaînent série après série ; la récupération est plus longue entre deux exercices.
 */
export function buildStrengthSteps(items, { restSet = 45, restExercise = 60, light = false } = {}) {
  const rs = light ? 30 : restSet;
  const re = light ? 40 : restExercise;
  const steps = [];
  items.forEach((it, exIndex) => {
    for (let s = 1; s <= it.sets; s += 1) {
      const base = { exIndex, id: it.id, set: s, sets: it.sets };
      if (it.timed && it.side) {
        steps.push({ ...base, kind: 'work', seconds: it.amount, sideLabel: 'Côté gauche' });
        steps.push({ ...base, kind: 'switch', seconds: 6, label: 'Changez de côté' });
        steps.push({ ...base, kind: 'work', seconds: it.amount, sideLabel: 'Côté droit' });
      } else if (it.timed) {
        steps.push({ ...base, kind: 'work', seconds: it.amount });
      } else {
        steps.push({ ...base, kind: 'work', reps: it.amount, side: it.side, note: it.note });
      }
      const lastSet = s === it.sets;
      if (!(lastSet && exIndex === items.length - 1)) {
        steps.push({ ...base, kind: 'rest', seconds: lastSet ? re : rs, nextExercise: lastSet });
      }
    }
  });
  // Un compte à rebours avant un premier exercice chronométré
  if (steps[0]?.seconds) steps.unshift({ ...steps[0], kind: 'switch', seconds: 6, label: 'Préparez-vous', sideLabel: undefined });
  return steps;
}

/** Durée estimée d'un déroulé, en minutes (3 secondes par répétition). */
export function estimateStepsMinutes(steps) {
  const seconds = steps.reduce((t, st) => t + (st.seconds ?? (st.reps * 3 * (st.side ? 2 : 1) + 6)), 0);
  return Math.max(1, Math.round(seconds / 60));
}
