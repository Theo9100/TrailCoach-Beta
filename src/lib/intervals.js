/**
 * Envoi des séances vers Intervals.icu, qui les synchronise ensuite avec la montre
 * (Suunto, Garmin, Coros…) selon les connexions activées dans Intervals.icu.
 */
import { workoutToIntervalsText } from './workout';
import { addDays, toISODate } from './format';

const BASE = 'https://intervals.icu';

export class IntervalsError extends Error {}

function authHeader(apiKey) {
  return `Basic ${btoa(`API_KEY:${apiKey.trim()}`)}`;
}

/** Appel via le relais Vercel (/api/intervals), sinon directement (développement local). */
async function call(apiKey, path, { method = 'GET', body } = {}) {
  const init = {
    method,
    headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = null;
  try {
    const viaProxy = await fetch(`/api/intervals?p=${encodeURIComponent(path)}`, init);
    if (viaProxy.headers.get('X-TrailCoach-Proxy') === '1') res = viaProxy;
  } catch {
    /* pas de relais : on tente en direct */
  }
  if (!res) {
    try {
      res = await fetch(`${BASE}${path}`, init);
    } catch {
      throw new IntervalsError("Impossible de joindre Intervals.icu. Vérifiez votre connexion et réessayez.");
    }
  }

  if (res.status === 401 || res.status === 403) throw new IntervalsError('Clé API refusée par Intervals.icu. Vérifiez-la dans Réglages.');
  if (res.status === 429) throw new IntervalsError('Trop de requêtes vers Intervals.icu. Patientez une minute.');
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new IntervalsError(`Intervals.icu a répondu ${res.status}${detail ? ` : ${detail.slice(0, 160)}` : ''}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Vérifie la clé et renvoie le nom de l'athlète. */
export async function testConnection(apiKey) {
  const athlete = await call(apiKey, '/api/v1/athlete/0');
  return { name: athlete?.name || athlete?.firstname || 'Athlète', id: athlete?.id };
}

export function externalId(profile, session) {
  return `trailcoach-${profile.planStart}-${session.id}`;
}

export function sessionToEvent(profile, session) {
  return {
    category: 'WORKOUT',
    type: 'Run',
    start_date_local: `${session.date}T00:00:00`,
    name: session.title,
    description: workoutToIntervalsText(session.workout, Number(profile.vma) || 14),
    moving_time: session.durationMin * 60,
    external_id: externalId(profile, session),
  };
}

/** Séances envoyables : à venir, hors jour de course, et avec une structure. */
export function sendableSessions(sessions, today = toISODate(new Date())) {
  return sessions.filter((s) => s.type !== 'COURSE' && s.date >= today && s.workout?.length);
}

/**
 * Envoie (ou remplace) des séances dans le calendrier Intervals.icu.
 * Les séances TrailCoach déjà présentes sur la période sont d'abord supprimées,
 * ce qui évite les doublons quel que soit le comportement de l'upsert.
 */
export async function pushSessions(apiKey, profile, sessions, onProgress) {
  const list = sendableSessions(sessions);
  if (!list.length) return { sent: 0 };

  const dates = list.map((s) => s.date).sort();
  const oldest = dates[0];
  const newest = toISODate(addDays(dates[dates.length - 1], 1));

  onProgress?.('Recherche des séances déjà envoyées…');
  const existing = (await call(apiKey, `/api/v1/athlete/0/events?oldest=${oldest}&newest=${newest}`)) || [];
  const ids = new Set(list.map((s) => externalId(profile, s)));
  const stale = existing.filter((e) => typeof e.external_id === 'string' && (ids.has(e.external_id) || e.external_id.startsWith('trailcoach-')));

  for (let i = 0; i < stale.length; i += 1) {
    onProgress?.(`Mise à jour (${i + 1}/${stale.length})…`);
    await call(apiKey, `/api/v1/athlete/0/events/${stale[i].id}`, { method: 'DELETE' });
  }

  onProgress?.(`Envoi de ${list.length} séance${list.length > 1 ? 's' : ''}…`);
  await call(apiKey, '/api/v1/athlete/0/events/bulk?upsert=true', { method: 'POST', body: list.map((s) => sessionToEvent(profile, s)) });
  return { sent: list.length };
}

/** Empreinte d'une liste de séances, pour savoir si la semaine a changé depuis l'envoi. */
export function fingerprint(profile, sessions) {
  return sendableSessions(sessions, '0000-00-00')
    .map((s) => `${s.id}|${s.date}|${s.title}|${workoutToIntervalsText(s.workout, profile.vma)}`)
    .join('#')
    .split('')
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
    .toString(36);
}

/* ------------------------------------------------------------------ */
/* Récupération des sorties                                           */
/* ------------------------------------------------------------------ */

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun', 'Hike', 'Walk']);

const num = (...vals) => {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
};

/** Normalise la réponse « streams » (tableau [{type,data}] ou objet {type: data}). */
function readStreams(raw) {
  const out = {};
  if (Array.isArray(raw)) raw.forEach((s) => { if (s?.type && Array.isArray(s.data)) out[s.type] = s.data; });
  else if (raw && typeof raw === 'object') Object.entries(raw).forEach(([k, v]) => { if (Array.isArray(v)) out[k] = v; else if (Array.isArray(v?.data)) out[k] = v.data; });
  return {
    distance: out.distance || null,
    altitude: out.altitude || out.fixed_altitude || out.enhanced_altitude || null,
    heartrate: out.heartrate || out.heart_rate || null,
  };
}

/** Profil échantillonné (≈160 points) [km, altitude, fc] pour le graphique. */
function sampleProfile(streams, totalKm) {
  const { distance, altitude, heartrate } = streams;
  if (!altitude?.length) return [];
  const n = altitude.length;
  const distAt = (i) => (distance?.length === n ? distance[i] / 1000 : (totalKm * i) / (n - 1));
  const samples = 160;
  const profile = [];
  let j = 0;
  const maxD = distAt(n - 1) || totalKm;
  for (let k = 0; k <= samples; k += 1) {
    const target = (maxD * k) / samples;
    while (j < n - 1 && distAt(j) < target) j += 1;
    const ele = altitude[j];
    const hr = heartrate?.[j];
    profile.push([Math.round(target * 1000) / 1000, Number.isFinite(ele) ? Math.round(ele) : null, Number.isFinite(hr) && hr > 30 ? hr : null]);
  }
  return profile;
}

function toActivity(a, streams) {
  const distanceKm = Math.round((num(a.distance, a.icu_distance) || 0) / 10) / 100;
  const profile = streams ? sampleProfile(streams, distanceKm) : [];
  const eles = profile.map((p) => p[1]).filter((v) => v != null);
  const start = String(a.start_date_local || a.start_date || '');
  const moving = num(a.moving_time, a.icu_moving_time);
  const elapsed = num(a.elapsed_time, a.icu_elapsed_time);
  return {
    id: `icu-${a.id}`,
    source: 'intervals',
    icuId: a.id,
    fileName: null,
    name: a.name || 'Sortie',
    date: start.slice(0, 10),
    startTime: Date.parse(start) || null,
    distanceKm,
    dplus: Math.round(num(a.total_elevation_gain, a.icu_elevation_gain) || 0),
    dminus: num(a.total_elevation_loss, a.icu_elevation_loss) != null ? Math.round(num(a.total_elevation_loss, a.icu_elevation_loss)) : null,
    minEle: eles.length ? Math.min(...eles) : null,
    maxEle: eles.length ? Math.max(...eles) : null,
    elapsedMin: elapsed ? Math.round(elapsed / 60) : null,
    movingMin: moving ? Math.round(moving / 60) : elapsed ? Math.round(elapsed / 60) : null,
    avgHr: num(a.average_heartrate, a.icu_average_hr) ? Math.round(num(a.average_heartrate, a.icu_average_hr)) : null,
    maxHr: num(a.max_heartrate, a.icu_hr_max) ? Math.round(num(a.max_heartrate, a.icu_hr_max)) : null,
    hasElevation: eles.length > 0,
    profile,
  };
}

/**
 * Récupère les sorties course/trail/rando entre deux dates, avec leur profil.
 * `skipIds` : identifiants Intervals.icu déjà connus (on ne retélécharge pas leurs données).
 */
export async function fetchActivities(apiKey, oldest, newest, { skipIds = new Set(), onProgress } = {}) {
  onProgress?.('Récupération de vos sorties…');
  const list = (await call(apiKey, `/api/v1/athlete/0/activities?oldest=${oldest}&newest=${newest}`)) || [];
  const runs = list.filter((a) => a && a.id != null && RUN_TYPES.has(a.type) && num(a.distance, a.icu_distance) > 0 && !skipIds.has(String(a.id)));
  const ignoredStrava = list.filter((a) => a && !num(a.distance, a.icu_distance) && /strava/i.test(String(a.source || a._note || ''))).length;

  const result = [];
  for (let i = 0; i < runs.length; i += 1) {
    onProgress?.(`Analyse des sorties (${i + 1}/${runs.length})…`);
    let streams = null;
    try {
      streams = readStreams(await call(apiKey, `/api/v1/activity/${runs[i].id}/streams.json?types=distance,altitude,heartrate`));
    } catch {
      streams = null; // la sortie est gardée, sans profil
    }
    result.push(toActivity(runs[i], streams));
  }
  return { activities: result, ignoredStrava };
}
