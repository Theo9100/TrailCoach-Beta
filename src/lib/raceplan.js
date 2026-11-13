/**
 * Plan de course : découpage du parcours en sections, temps de passage estimés
 * et besoins en glucides / eau.
 */

/** D+ et D− entre deux distances, sur le profil [km, altitude]. */
function gainLoss(profile, from, to) {
  let gain = 0;
  let loss = 0;
  let prev = null;
  profile.forEach(([km, ele]) => {
    if (ele == null || km < from || km > to) return;
    if (prev != null) { const d = ele - prev; if (d > 0) gain += d; else loss -= d; }
    prev = ele;
  });
  return { gain, loss };
}

function sectionsFromTrack(track) {
  const total = track.profile[track.profile.length - 1][0];
  const cuts = new Set([0, total]);
  (track.climbs || []).forEach((c) => { cuts.add(c.startKm); cuts.add(c.endKm); });
  let points = [...cuts].sort((a, b) => a - b);
  // Fusionne les sections trop courtes
  const minLen = Math.max(1.5, total / 16);
  points = points.filter((p, i) => i === 0 || i === points.length - 1 || (p - points[i - 1] >= minLen * 0.5));
  const merged = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (points[i] - merged[merged.length - 1] >= minLen || i === points.length - 1) merged.push(points[i]);
  }
  if (merged.length > 2 && merged[merged.length - 1] - merged[merged.length - 2] < minLen * 0.6) merged.splice(merged.length - 2, 1);

  const raw = [];
  for (let i = 1; i < merged.length; i += 1) {
    const { gain, loss } = gainLoss(track.profile, merged[i - 1], merged[i]);
    raw.push({ from: merged[i - 1], to: merged[i], gain, loss });
  }
  // Le profil échantillonné sous-estime le dénivelé : on recale sur les totaux du tracé
  const sumG = raw.reduce((t, s) => t + s.gain, 0) || 1;
  const sumL = raw.reduce((t, s) => t + s.loss, 0) || 1;
  return raw.map((s) => ({ ...s, gain: (s.gain * track.dplus) / sumG, loss: (s.loss * (track.dminus || track.dplus)) / sumL }));
}

function sectionsFallback(distance, elevation) {
  const n = distance > 60 ? 8 : distance > 25 ? 6 : 4;
  return Array.from({ length: n }, (_, i) => ({ from: (distance * i) / n, to: (distance * (i + 1)) / n, gain: elevation / n, loss: elevation / n }));
}

export function nutritionFor(totalMin) {
  const h = totalMin / 60;
  const carbs = h < 1.5 ? 30 : h < 3 ? 50 : h < 6 ? 60 : 70;
  return { carbsPerHour: carbs, waterPerHour: 500, sodiumPerHour: h > 3 ? 500 : 300 };
}

export function buildRacePlan(profile, { factor = 1 } = {}) {
  const track = profile.raceTrack?.profile?.length > 2 ? profile.raceTrack : null;
  const base = track ? sectionsFromTrack(track) : sectionsFallback(Number(profile.distance), Number(profile.elevation));
  const total = base[base.length - 1].to;
  const vma = Number(profile.vma) || 14;
  const ultra = total >= 60;
  const speed = vma * (ultra ? 0.5 : 0.6);

  let cum = 0;
  const sections = base.map((s, i) => {
    const km = s.to - s.from;
    const mid = (s.from + s.to) / 2 / total;
    const fatigue = 1 + (ultra ? 0.22 : 0.12) * mid; // ralentissement progressif
    const effort = km + s.gain / 100 + s.loss / 500;
    const minutes = ((effort / speed) * 60 * fatigue) * factor;
    cum += minutes;
    const grade = (s.gain - s.loss) / (km * 1000);
    const kind = grade > 0.04 ? 'Montée' : grade < -0.04 ? 'Descente' : 'Roulant';
    return { index: i + 1, kind, km, toKm: s.to, gain: Math.round(s.gain), loss: Math.round(s.loss), minutes, cumMinutes: cum };
  });

  const nutrition = nutritionFor(cum);
  sections.forEach((s) => {
    s.carbs = Math.round(((s.minutes / 60) * nutrition.carbsPerHour) / 5) * 5;
    s.water = Math.round(((s.minutes / 60) * nutrition.waterPerHour) / 50) * 50;
  });

  return {
    fromTrack: !!track,
    sections,
    totalMinutes: cum,
    nutrition,
    totalCarbs: Math.round((cum / 60) * nutrition.carbsPerHour),
    totalWater: Math.round(((cum / 60) * nutrition.waterPerHour) / 100) / 10,
  };
}

export function clockAt(start, minutes) {
  const [h, m] = String(start || '08:00').split(':').map(Number);
  const t = Math.round(h * 60 + m + minutes);
  const day = Math.floor(t / 1440);
  return `${String(Math.floor((t % 1440) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}${day ? ` (J+${day})` : ''}`;
}

export const DEFAULT_GEAR = [
  'Chaussures de trail (déjà rodées)',
  'Sac ou ceinture d’hydratation',
  'Réserve d’eau (1 L minimum)',
  'Réserve alimentaire',
  'Veste imperméable à capuche',
  'Couverture de survie',
  'Sifflet',
  'Téléphone chargé',
  'Gobelet personnel',
  'Lampe frontale + piles de rechange',
  'Bande élastique adhésive',
  'Casquette ou bonnet',
  'Bâtons (si utilisés à l’entraînement)',
  'Dossard, épingles ou porte-dossard',
  'Pièce d’identité',
];
