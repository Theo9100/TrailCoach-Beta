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
};

const set = (id, dose) => ({ id, dose });

/** Routine de la séance de renforcement selon la phase et le niveau. */
export function strengthRoutine(phase, level, light = false) {
  const deb = level === 'Débutant';
  const sets = light ? 2 : deb ? 2 : 3;
  const routines = {
    foncier: {
      title: 'Renforcement général',
      items: [set('squat', `${sets} × 12`), set('fente', `${sets} × 10 par jambe`), set('planche', `${sets} × ${deb ? 30 : 45} s`), set('pont', `${sets} × 15`), set('mollets', `${sets} × 15`)],
    },
    developpement: {
      title: 'Renforcement spécifique montée',
      items: [set('stepup', `${sets} × 10 par jambe`), set('squat', `${sets} × 15`), set('fente', `${sets} × 12 par jambe`), set('chaise', `${sets} × 45 s`), set('planche', `${sets} × 45 s`), set('superman', `${sets} × 12`)],
    },
    specifique: {
      title: 'Renforcement descente & gainage',
      items: [set('stepup', `${sets} × 12 par jambe, descente en 4 s`), set('fente', `${sets} × 12 par jambe`), set('chaise', `${sets} × 60 s`), set('mollets', `${sets} × 20`), set('planche', `${sets} × 60 s`)],
    },
    affutage: {
      title: 'Mobilité & activation',
      items: [set('hanches', '2 × 45 s par côté'), set('pont', '2 × 12'), set('planche', '2 × 30 s'), set('mollets', '2 × 12')],
    },
  };
  return routines[phase] || routines.foncier;
}
