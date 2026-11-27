/**
 * Animation des exercices : enchaînement des postures dans le temps, puis recalcul des
 * articulations pour que les membres gardent une longueur constante (cinématique inverse).
 * Sans dépendance au navigateur, pour pouvoir être testé seul.
 */

const JOINTS = ['head', 'neck', 'hip', 'knee', 'foot', 'knee2', 'foot2', 'elbow', 'hand'];
const EASE = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Complète une posture : la jambe arrière reprend la jambe avant si elle n'est pas décrite. */
function full(p) {
  return { ...p, knee2: p.knee2 || p.knee, foot2: p.foot2 || p.foot };
}

/** Postures utilisées par un exercice. */
export function posesOf(ex) {
  const keys = ex.frames ? [...new Set(ex.frames.map((f) => f[0]))] : ['a', 'b'];
  return keys.map((k) => full(ex[k]));
}

const CHAINS = { leg: ['hip', 'knee', 'foot'], leg2: ['hip', 'knee2', 'foot2'], arm: ['neck', 'elbow', 'hand'] };

/** Longueurs des deux segments d'un membre et côté de sa flexion (genou ou coude) dans une posture. */
function chainOf(p, [root, mid, tip]) {
  const d = dist(p[root], p[tip]) || 1e-6;
  const bend = ((p[tip][0] - p[root][0]) * (p[mid][1] - p[root][1]) - (p[tip][1] - p[root][1]) * (p[mid][0] - p[root][0])) / d;
  return { l1: dist(p[root], p[mid]), l2: dist(p[mid], p[tip]), bend };
}

/**
 * Suite de segments { from, to, ms, ease, chains } qui boucle.
 * Pour chaque membre, on garde ses longueurs au départ et à l'arrivée : entre les deux, le genou
 * ou le coude est recalculé, ce qui donne un mouvement en arc au lieu d'un membre qui raccourcit.
 */
export function timelineOf(ex) {
  let frames = ex.frames;
  if (!frames) {
    const [go, holdB, back, holdA] = ex.tempo || [1100, 200, 900, 300];
    frames = [['b', go, 'inOut'], ['b', holdB], ['a', back, 'inOut'], ['a', holdA]];
  }
  frames = frames.filter((f) => f[1] > 0);
  // Côté de flexion de référence de chaque membre : celui de la posture où il est le plus plié.
  // Sert quand le membre est presque tendu aux deux bouts d'un segment (sinon le coude pourrait « basculer »).
  const global = {};
  Object.entries(CHAINS).forEach(([name, joints]) => {
    const bends = posesOf(ex).map((p) => chainOf(p, joints).bend);
    const top = bends.reduce((m, b) => (Math.abs(b) > Math.abs(m) ? b : m), 0);
    global[name] = top >= 0 ? 1 : -1;
  });
  const segs = frames.map((f, i) => {
    const prev = frames[(i - 1 + frames.length) % frames.length];
    const from = full(ex[prev[0]]);
    const to = full(ex[f[0]]);
    const chains = {};
    Object.entries(CHAINS).forEach(([name, joints]) => {
      const a = chainOf(from, joints);
      const b = chainOf(to, joints);
      const strongest = Math.abs(a.bend) >= Math.abs(b.bend) ? a.bend : b.bend;
      chains[name] = { a, b, side: Math.abs(strongest) < 4 ? global[name] : strongest >= 0 ? 1 : -1 };
    });
    return { from, to, ms: f[1], ease: EASE[f[2]] || EASE.inOut, chains };
  });
  return { segs, total: segs.reduce((t, s) => t + s.ms, 0) };
}

/** Place l'articulation du milieu (genou, coude) pour des segments de longueur donnée. */
function twoBone(root, target, l1, l2, side) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / d;
  const uy = dy / d;
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-4), l1 + l2);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [root[0] + ux * a - uy * h * side, root[1] + uy * a + ux * h * side];
}

/** Posture à l'instant t : positions clés interpolées, genoux et coudes recalculés. */
export function poseAt(timeline, tMs) {
  let t = ((tMs % timeline.total) + timeline.total) % timeline.total;
  let seg = timeline.segs[0];
  for (const s of timeline.segs) {
    if (t < s.ms) { seg = s; break; }
    t -= s.ms;
  }
  const k = seg.from === seg.to ? 0 : seg.ease(Math.min(1, t / seg.ms));
  const p = {};
  JOINTS.forEach((j) => { p[j] = lerp(seg.from[j], seg.to[j], k); });
  Object.entries(CHAINS).forEach(([name, [root, mid, tip]]) => {
    const c = seg.chains[name];
    p[mid] = twoBone(p[root], p[tip], c.a.l1 + (c.b.l1 - c.a.l1) * k, c.a.l2 + (c.b.l2 - c.a.l2) * k, c.side);
  });
  return p;
}
