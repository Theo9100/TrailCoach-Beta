/**
 * Lecture réelle de fichiers GPX (traces Garmin, Suunto, Coros, Strava…).
 * Tout est calculé localement dans le navigateur.
 */
import { formatDuration, formatKm, toISODate } from './format';

const R = 6371000; // rayon terrestre en mètres
const rad = (d) => (d * Math.PI) / 180;

function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function childText(el, name) {
  const found = el.getElementsByTagName(name)[0];
  return found ? found.textContent : null;
}

/** Cherche une valeur de fréquence cardiaque dans les extensions (gpxtpx:hr, ns3:hr, hr…). */
function heartRate(el) {
  const all = el.getElementsByTagName('*');
  for (let i = 0; i < all.length; i += 1) {
    const n = all[i].localName.toLowerCase();
    if (n === 'hr' || n === 'heartrate') {
      const v = Number(all[i].textContent);
      if (v > 30 && v < 250) return v;
    }
  }
  return null;
}

export function parseGpx(text, fileName = 'activite.gpx') {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error("Ce fichier n'est pas un GPX valide.");
  }

  let nodes = Array.from(doc.getElementsByTagName('trkpt'));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('rtept'));
  if (nodes.length < 2) throw new Error('Aucun point de trace trouvé dans ce fichier.');

  const points = nodes
    .map((n) => ({
      lat: Number(n.getAttribute('lat')),
      lon: Number(n.getAttribute('lon')),
      ele: childText(n, 'ele') != null ? Number(childText(n, 'ele')) : null,
      time: childText(n, 'time') ? new Date(childText(n, 'time')).getTime() : null,
      hr: heartRate(n),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  // Distance cumulée et temps en mouvement
  let dist = 0;
  let moving = 0;
  points[0].dist = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = haversine(points[i - 1], points[i]);
    dist += d;
    points[i].dist = dist;
    const dt = points[i].time && points[i - 1].time ? (points[i].time - points[i - 1].time) / 1000 : 0;
    if (dt > 0 && dt < 120 && d / dt > 0.3) moving += dt;
  }

  // Dénivelé avec lissage (hystérésis de 3 m) pour éviter le bruit GPS
  let gain = 0;
  let loss = 0;
  let ref = null;
  let minEle = Infinity;
  let maxEle = -Infinity;
  points.forEach((p) => {
    if (p.ele == null || Number.isNaN(p.ele)) return;
    minEle = Math.min(minEle, p.ele);
    maxEle = Math.max(maxEle, p.ele);
    if (ref == null) { ref = p.ele; return; }
    const diff = p.ele - ref;
    if (diff >= 3) { gain += diff; ref = p.ele; } else if (diff <= -3) { loss -= diff; ref = p.ele; }
  });

  const times = points.map((p) => p.time).filter(Boolean);
  const start = times.length ? Math.min(...times) : null;
  const end = times.length ? Math.max(...times) : null;
  const elapsedMin = start && end ? (end - start) / 60000 : null;
  const movingMin = moving > 0 ? moving / 60 : elapsedMin;

  const hrs = points.map((p) => p.hr).filter(Boolean);
  const avgHr = hrs.length ? Math.round(hrs.reduce((s, v) => s + v, 0) / hrs.length) : null;
  const maxHr = hrs.length ? Math.max(...hrs) : null;

  // Profil échantillonné (≈ 160 points) pour le graphique, léger à stocker
  const samples = 160;
  const profile = [];
  let j = 0;
  for (let k = 0; k <= samples; k += 1) {
    const target = (dist * k) / samples;
    while (j < points.length - 1 && points[j].dist < target) j += 1;
    const p = points[j];
    profile.push([
      Math.round(target) / 1000,
      p.ele != null ? Math.round(p.ele) : null,
      p.hr ?? null,
    ]);
  }

  const name = childText(doc, 'name');

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName,
    name: name?.trim() || fileName.replace(/\.gpx$/i, ''),
    date: start ? toISODate(new Date(start)) : toISODate(new Date()),
    startTime: start,
    distanceKm: Math.round(dist / 10) / 100,
    dplus: Math.round(gain),
    dminus: Math.round(loss),
    minEle: Number.isFinite(minEle) ? Math.round(minEle) : null,
    maxEle: Number.isFinite(maxEle) ? Math.round(maxEle) : null,
    elapsedMin: elapsedMin ? Math.round(elapsedMin) : null,
    movingMin: movingMin ? Math.round(movingMin) : null,
    avgHr,
    maxHr,
    hasElevation: Number.isFinite(minEle),
    profile,
  };
}

/**
 * Compare une activité à la séance prévue : distance, D+, durée et intensité cardiaque.
 * Retourne un score sur 100 et des remarques concrètes.
 */
export function compareToSession(activity, session, profile) {
  if (!session) return null;
  const rel = (actual, planned) => (planned > 0 ? (actual - planned) / planned : 0);
  const fit = (r, tolerance) => Math.max(0, 1 - Math.max(0, Math.abs(r) - tolerance) * 1.6);

  const rDist = rel(activity.distanceKm, session.km);
  const rDplus = session.dplus >= 50 ? rel(activity.dplus, session.dplus) : 0;
  const rTime = activity.movingMin ? rel(activity.movingMin, session.durationMin) : 0;

  const parts = [
    { w: 0.45, v: fit(rDist, 0.1) },
    { w: session.dplus >= 50 ? 0.3 : 0, v: fit(rDplus, 0.15) },
    { w: activity.movingMin ? 0.25 : 0, v: fit(rTime, 0.15) },
  ];

  const notes = [];
  const fc = Number(profile.fcMax) || 185;
  let hrPenalty = 0;
  if (activity.avgHr) {
    const pct = activity.avgHr / fc;
    const easy = ['EF', 'RECUP', 'LONG'].includes(session.type);
    if (easy && pct > 0.82) {
      hrPenalty = 0.1;
      notes.push({ tone: 'warn', text: `FC moyenne de ${activity.avgHr} bpm (${Math.round(pct * 100)} % FCmax) : trop intense pour une séance d'endurance. Ralentissez pour rester sous ${Math.round(fc * 0.8)} bpm.` });
    } else if (easy) {
      notes.push({ tone: 'good', text: `FC moyenne de ${activity.avgHr} bpm : intensité bien maîtrisée.` });
    } else if (pct < 0.72) {
      notes.push({ tone: 'info', text: `FC moyenne de ${activity.avgHr} bpm : séance peut-être un peu trop facile pour du ${session.type === 'VMA' ? 'fractionné' : 'travail en côte'}.` });
    }
  }

  const totalW = parts.reduce((s, p) => s + p.w, 0) || 1;
  const score = Math.round(Math.max(0, (parts.reduce((s, p) => s + p.w * p.v, 0) / totalW) - hrPenalty) * 100);

  const pctText = (r) => `${r > 0 ? '+' : ''}${Math.round(r * 100)} %`;
  if (Math.abs(rDist) <= 0.1) notes.unshift({ tone: 'good', text: `Distance respectée (${formatKm(activity.distanceKm)} km pour ${formatKm(session.km)} km prévus).` });
  else notes.unshift({ tone: rDist > 0 ? 'warn' : 'info', text: `Distance ${rDist > 0 ? 'supérieure' : 'inférieure'} au plan : ${formatKm(activity.distanceKm)} km pour ${formatKm(session.km)} km prévus (${pctText(rDist)}).` });

  if (session.dplus >= 50) {
    if (Math.abs(rDplus) <= 0.15) notes.push({ tone: 'good', text: `D+ conforme : ${activity.dplus} m pour ${session.dplus} m prévus.` });
    else notes.push({ tone: rDplus > 0 ? 'warn' : 'info', text: `D+ ${rDplus > 0 ? 'plus important' : 'plus faible'} que prévu : ${activity.dplus} m pour ${session.dplus} m (${pctText(rDplus)}).` });
  }

  if (activity.movingMin && Math.abs(rTime) > 0.2) {
    notes.push({ tone: 'info', text: `Durée en mouvement de ${formatDuration(activity.movingMin)} pour ${formatDuration(session.durationMin)} estimées.` });
  }

  let verdict;
  if (score >= 85) verdict = 'Séance réalisée conformément au plan.';
  else if (score >= 65) verdict = 'Séance globalement respectée, avec quelques écarts.';
  else verdict = 'Écart important avec la séance prévue.';

  return { score, verdict, notes };
}
