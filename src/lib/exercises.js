/**
 * Exercices de renforcement : consignes + deux postures clés (vue de profil)
 * entre lesquelles le bonhomme animé fait l'aller-retour.
 * Coordonnées dans un repère 120 × 100, sol à y = 92.
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
    cue: 'Dos droit, genoux dans l’axe des pieds, descendre cuisses parallèles au sol.',
    a: pose({ elbow: [68, 40], hand: [76, 38] }),
    b: pose({ head: [62, 36], neck: [59, 46], hip: [49, 68], knee: [68, 72], elbow: [69, 50], hand: [80, 48] }),
  },
  fente: {
    name: 'Fentes',
    cue: 'Grand pas, buste droit, le genou arrière frôle le sol sans le toucher.',
    a: pose({ hip: [58, 57], knee: [67, 74], foot: [70, 92], knee2: [51, 75], foot2: [42, 92], neck: [58, 31], head: [58, 20] }),
    b: pose({ head: [58, 32], neck: [58, 43], hip: [58, 69], knee: [74, 72], foot: [70, 92], knee2: [50, 87], foot2: [36, 89], elbow: [61, 56], hand: [63, 68] }),
  },
  stepup: {
    name: 'Montées de banc',
    cue: 'Pousser sur la jambe posée sur le banc, monter le genou opposé, redescendre lentement.',
    prop: 'box',
    toes: 'flat',
    a: pose({ hip: [58, 57], neck: [60, 32], head: [61, 21], knee: [70, 66], foot: [70, 80], knee2: [56, 75], foot2: [52, 92] }),
    b: pose({ head: [72, 9], neck: [72, 20], hip: [72, 45], knee: [73, 63], foot: [70, 80], knee2: [84, 50], foot2: [80, 66], elbow: [70, 33], hand: [78, 26] }),
  },
  planche: {
    name: 'Planche',
    cue: 'Corps aligné des épaules aux talons, ventre serré, ne pas creuser le dos.',
    hold: true,
    a: pose({ head: [95, 67], neck: [86, 71], hip: [58, 77], knee: [41, 83], foot: [24, 88], elbow: [86, 90], hand: [98, 90] }),
    b: pose({ head: [95, 66], neck: [86, 70], hip: [58, 75], knee: [41, 82], foot: [24, 88], elbow: [86, 90], hand: [98, 90] }),
  },
  pont: {
    name: 'Pont fessier',
    cue: 'Allongé sur le dos, pousser dans les talons et monter le bassin, serrer les fessiers en haut.',
    a: pose({ head: [22, 87], neck: [31, 88], hip: [58, 88], knee: [74, 70], foot: [82, 92], elbow: [42, 90], hand: [54, 90] }),
    b: pose({ head: [22, 87], neck: [31, 87], hip: [58, 71], knee: [76, 66], foot: [82, 92], elbow: [42, 90], hand: [54, 90] }),
  },
  mollets: {
    name: 'Mollets',
    cue: 'Monter sur la pointe des pieds, marquer un temps d’arrêt, redescendre en 3 secondes.',
    a: pose(),
    b: pose({ head: [60, 12], neck: [60, 23], hip: [60, 49], knee: [60, 67], foot: [58, 85], elbow: [63, 36], hand: [65, 48] }),
  },
  chaise: {
    name: 'Chaise',
    cue: 'Dos plaqué au mur, cuisses à l’horizontale, genoux à 90°. Tenir sans bouger.',
    hold: true,
    prop: 'wall',
    a: pose({ head: [47, 33], neck: [46, 44], hip: [46, 70], knee: [66, 70], foot: [66, 92], elbow: [52, 56], hand: [60, 62] }),
    b: pose({ head: [47, 34], neck: [46, 45], hip: [46, 71], knee: [66, 70], foot: [66, 92], elbow: [52, 57], hand: [60, 63] }),
  },
  superman: {
    name: 'Superman',
    cue: 'À plat ventre, décoller bras et jambes en même temps, regard vers le sol.',
    a: pose({ head: [91, 83], neck: [82, 85], hip: [56, 87], knee: [40, 88], foot: [24, 89], elbow: [94, 88], hand: [106, 88] }),
    b: pose({ head: [92, 74], neck: [82, 79], hip: [56, 86], knee: [40, 84], foot: [24, 79], elbow: [95, 76], hand: [107, 72] }),
  },
  hanches: {
    name: 'Mobilité des hanches',
    cue: 'En fente basse, avancer le bassin et lever les bras, sans forcer. Respirer lentement.',
    hold: true,
    a: pose({ head: [58, 32], neck: [58, 43], hip: [58, 69], knee: [74, 72], foot: [70, 92], knee2: [48, 88], foot2: [32, 90], elbow: [60, 30], hand: [61, 17] }),
    b: pose({ head: [61, 33], neck: [61, 44], hip: [62, 71], knee: [76, 72], foot: [70, 92], knee2: [50, 89], foot2: [32, 90], elbow: [64, 31], hand: [66, 18] }),
  },
  bulgare: {
    name: 'Fentes bulgares',
    cue: 'Pied arrière posé sur un banc, descendre à la verticale jusqu’à ce que la cuisse avant soit horizontale. Le poids reste sur le talon avant.',
    prop: 'boxBack',
    toes: 'flat',
    a: pose({ head: [62, 18], neck: [61, 29], hip: [60, 54], knee: [69, 72], foot: [70, 92], knee2: [50, 70], foot2: [36, 74], elbow: [64, 42], hand: [67, 53] }),
    b: pose({ head: [63, 32], neck: [62, 43], hip: [60, 68], knee: [77, 72], foot: [70, 92], knee2: [50, 86], foot2: [36, 74], elbow: [66, 55], hand: [71, 64] }),
  },
  squatsaute: {
    name: 'Squats sautés',
    cue: 'Descendre en squat puis sauter le plus haut possible. Réception souple et silencieuse, genoux dans l’axe.',
    a: pose({ head: [62, 36], neck: [59, 46], hip: [49, 68], knee: [68, 72], elbow: [62, 58], hand: [54, 68] }),
    b: pose({ head: [61, 5], neck: [60, 16], hip: [60, 42], knee: [61, 60], foot: [58, 79], elbow: [65, 8], hand: [69, -2] }),
  },
  sautuni: {
    name: 'Sauts sur une jambe',
    cue: 'Petits bonds sur une seule jambe, en restant gainé. Amortir chaque réception, le genou ne rentre pas vers l’intérieur.',
    a: pose({ head: [63, 25], neck: [62, 36], hip: [60, 61], knee: [67, 76], foot: [60, 92], knee2: [59, 76], foot2: [47, 80], elbow: [67, 48], hand: [73, 56] }),
    b: pose({ head: [64, 9], neck: [63, 20], hip: [62, 45], knee: [64, 62], foot: [61, 80], knee2: [66, 58], foot2: [54, 66], elbow: [68, 31], hand: [76, 25] }),
  },
  planchelat: {
    name: 'Planche latérale dynamique',
    cue: 'En appui sur l’avant-bras, corps aligné. Descendre le bassin vers le sol puis le remonter. Changer de côté.',
    floor: true,
    a: pose({ head: [96, 52], neck: [87, 58], hip: [58, 73], knee: [41, 81], foot: [24, 90], elbow: [88, 90], hand: [100, 90] }),
    b: pose({ head: [96, 54], neck: [87, 60], hip: [58, 83], knee: [41, 87], foot: [24, 90], elbow: [88, 90], hand: [100, 90] }),
  },
  pontuni: {
    name: 'Pont fessier sur une jambe',
    cue: 'Une jambe tendue dans le prolongement de la cuisse, pousser dans le talon de l’autre. Le bassin reste horizontal.',
    floor: true,
    a: pose({ head: [22, 87], neck: [31, 88], hip: [58, 88], knee: [74, 70], foot: [82, 92], knee2: [76, 80], foot2: [94, 74], elbow: [42, 90], hand: [54, 90] }),
    b: pose({ head: [22, 87], neck: [31, 87], hip: [58, 71], knee: [76, 66], foot: [82, 92], knee2: [78, 62], foot2: [98, 54], elbow: [42, 90], hand: [54, 90] }),
  },
  descente: {
    name: 'Descentes de banc freinées',
    cue: 'Debout sur le banc, descendre le talon libre vers le sol en 4 secondes, l’effleurer, puis remonter. Idéal pour préparer les descentes.',
    prop: 'box',
    toes: 'flat',
    a: pose({ head: [72, 9], neck: [72, 20], hip: [72, 45], knee: [73, 63], foot: [70, 80], knee2: [67, 63], foot2: [57, 77], elbow: [74, 33], hand: [76, 45] }),
    b: pose({ head: [71, 20], neck: [70, 31], hip: [67, 55], knee: [79, 67], foot: [70, 80], knee2: [60, 73], foot2: [53, 91], elbow: [75, 42], hand: [82, 49] }),
  },
  molletsuni: {
    name: 'Mollets sur une jambe',
    cue: 'Sur un seul pied, monter sur la pointe, marquer un temps d’arrêt, redescendre en 3 secondes. Se tenir à un mur si besoin.',
    a: pose({ knee2: [65, 72], foot2: [55, 81] }),
    b: pose({ head: [60, 12], neck: [60, 23], hip: [60, 49], knee: [60, 67], foot: [58, 85], knee2: [65, 65], foot2: [55, 74], elbow: [63, 36], hand: [65, 48] }),
  },
  grimpeur: {
    name: 'Grimpeur',
    cue: 'En appui sur les mains, ramener un genou vers la poitrine puis l’autre, sans lever les fesses. Rythme soutenu.',
    floor: true,
    a: pose({ head: [97, 59], neck: [88, 64], hip: [60, 70], knee: [42, 80], foot: [24, 90], knee2: [42, 80], foot2: [24, 90], elbow: [90, 78], hand: [91, 91] }),
    b: pose({ head: [97, 59], neck: [88, 64], hip: [60, 69], knee: [42, 80], foot: [24, 90], knee2: [76, 79], foot2: [62, 87], elbow: [90, 78], hand: [91, 91] }),
  },
};

const set = (id, dose) => ({ id, dose });

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
        [set('squat', `${sets} × 12`), set('fente', `${sets} × 10 par jambe`), set('planche', `${sets} × ${deb ? 30 : 45} s`), set('pont', `${sets} × 15`), set('mollets', `${sets} × 15`)],
        [set('squat', `${sets} × 15`), set('bulgare', `${sets} × 8 par jambe`), set('planchelat', `${sets} × 30 s par côté`), set('pontuni', `${sets} × 10 par jambe`), set('molletsuni', `${sets} × 12 par jambe`)],
        [set('squatsaute', `${sets} × 10`), set('bulgare', `${sets} × 10 par jambe`), set('grimpeur', `${sets} × 30 s`), set('pontuni', `${sets} × 12 par jambe`), set('molletsuni', `${sets} × 15 par jambe`)],
      ],
    },
    developpement: {
      title: 'Renforcement spécifique montée',
      stages: [
        [set('stepup', `${sets} × 10 par jambe`), set('squat', `${sets} × 15`), set('fente', `${sets} × 12 par jambe`), set('chaise', `${sets} × 45 s`), set('planche', `${sets} × 45 s`), set('superman', `${sets} × 12`)],
        [set('stepup', `${sets} × 12 par jambe`), set('bulgare', `${sets} × 10 par jambe`), set('squatsaute', `${sets} × 8`), set('chaise', `${sets} × 60 s`), set('planchelat', `${sets} × 40 s par côté`), set('superman', `${sets} × 15`)],
        [set('descente', `${sets} × 8 par jambe`), set('bulgare', `${sets} × 12 par jambe`), set('squatsaute', `${sets} × 12`), set('sautuni', `${sets} × 8 par jambe`), set('grimpeur', `${sets} × 40 s`), set('planchelat', `${sets} × 45 s par côté`)],
      ],
    },
    specifique: {
      title: 'Renforcement descente & gainage',
      stages: [
        [set('stepup', `${sets} × 12 par jambe, descente en 4 s`), set('fente', `${sets} × 12 par jambe`), set('chaise', `${sets} × 60 s`), set('mollets', `${sets} × 20`), set('planche', `${sets} × 60 s`)],
        [set('descente', `${sets} × 10 par jambe`), set('bulgare', `${sets} × 10 par jambe`), set('chaise', `${sets} × 75 s`), set('molletsuni', `${sets} × 15 par jambe`), set('planchelat', `${sets} × 45 s par côté`)],
        [set('descente', `${sets} × 12 par jambe`), set('sautuni', `${sets} × 10 par jambe`), set('squatsaute', `${sets} × 12`), set('chaise', `${sets} × 90 s`), set('molletsuni', `${sets} × 20 par jambe`), set('grimpeur', `${sets} × 45 s`)],
      ],
    },
    affutage: {
      title: 'Mobilité & activation',
      stages: [[set('hanches', '2 × 45 s par côté'), set('pont', '2 × 12'), set('planche', '2 × 30 s'), set('mollets', '2 × 12')]],
    },
  };
  const r = routines[phase] || routines.foncier;
  const s = Math.min(Math.max(0, stage), r.stages.length - 1);
  return { title: r.title, items: r.stages[s], stage: r.stages.length > 1 ? s : null };
}
