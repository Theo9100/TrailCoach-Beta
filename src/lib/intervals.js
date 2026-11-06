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
