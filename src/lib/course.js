/**
 * Tracé GPX de la course préparée : résumé du parcours et repérage des montées.
 */
import { parseGpx } from './gpx';

/** Montées notables (≥ 100 m D+) à partir du profil [km, altitude]. */
export function findClimbs(profile) {
  const pts = profile.filter((p) => p[1] != null);
  const climbs = [];
  if (pts.length < 3) return climbs;
  let start = pts[0];
  let peak = pts[0];
  const close = () => {
    const gain = peak[1] - start[1];
    const km = peak[0] - start[0];
    if (gain >= 100 && km > 0) climbs.push({ startKm: start[0], endKm: peak[0], gain: Math.round(gain), km: Math.round(km * 10) / 10, grade: Math.round((gain / (km * 1000)) * 100) });
  };
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i];
    if (p[1] > peak[1]) peak = p;
    const drop = peak[1] - p[1];
    if (drop >= Math.max(30, (peak[1] - start[1]) * 0.15)) {
      close();
      start = p;
      peak = p;
    } else if (p[1] < start[1] && peak === start) {
      start = p;
      peak = p;
    }
  }
  close();
  return climbs;
}

/** Lit un fichier GPX de parcours et renvoie un résumé léger à stocker dans le profil. */
export function readRaceTrack(text, fileName) {
  const a = parseGpx(text, fileName);
  if (!a.hasElevation) throw new Error("Ce GPX ne contient pas d'altitude : le dénivelé ne peut pas être calculé.");
  const profile = a.profile.map((p) => [p[0], p[1]]);
  const climbs = findClimbs(profile);
  const longest = climbs.reduce((best, c) => (!best || c.gain > best.gain ? c : best), null);
  return {
    name: a.name,
    fileName,
    distanceKm: a.distanceKm,
    dplus: a.dplus,
    dminus: a.dminus,
    minEle: a.minEle,
    maxEle: a.maxEle,
    profile,
    track: a.track,
    climbs,
    longestClimb: longest,
  };
}
