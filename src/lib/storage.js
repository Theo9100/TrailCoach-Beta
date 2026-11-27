import { useEffect, useRef, useState } from 'react';
import { addDays, mondayOf, toISODate } from './format';

const PREFIX = 'trailcoach.v2.';

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (navigation privée…) : on continue sans persistance */
  }
}

/* ------------------------------------------------------------------ */
/* Sauvegarde en ligne : blocs synchronisés et modifications en attente */
/* ------------------------------------------------------------------ */

/**
 * Blocs envoyés vers le compte en ligne. Restent sur l'appareil : le thème, l'onglet ouvert,
 * la date de dernière récupération des sorties et surtout la clé API Intervals.icu.
 */
export const SYNCED_KEYS = [
  'profile', 'completions', 'adjustments', 'activities', 'moves', 'recalOff', 'raceSettings', 'gear',
  'vmaTests', 'raceResult', 'history', 'intervalsSync', 'icuIgnored', 'watchBrand', 'bonusLog',
];
const SYNCED = new Set(SYNCED_KEYS);
const SYNC_META = 'trailcoach.sync';

/** État de synchronisation : { user, dirty: { bloc: horodatage }, synced: { bloc: horodatage distant } }. */
export function readSyncMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(SYNC_META) || 'null');
    return { user: null, dirty: {}, synced: {}, ...m };
  } catch {
    return { user: null, dirty: {}, synced: {} };
  }
}
export function writeSyncMeta(meta) {
  try { localStorage.setItem(SYNC_META, JSON.stringify(meta)); } catch { /* ignore */ }
}

let onLocalChange = null;
/** Le module de synchronisation s'abonne ici pour être prévenu de chaque modification locale. */
export function setLocalChangeHandler(fn) { onLocalChange = fn; }

/** Note qu'un bloc a changé sur cet appareil et devra être envoyé en ligne. */
export function markDirty(key, at = Date.now()) {
  if (!SYNCED.has(key)) return;
  const meta = readSyncMeta();
  meta.dirty[key] = at;
  writeSyncMeta(meta);
  onLocalChange?.(key);
}

const listeners = new Map();
/** Écrit un bloc reçu du compte en ligne et met à jour l'écran, sans le renvoyer. */
export function applyRemote(key, value) {
  writeStore(key, value === null ? undefined : value);
  (listeners.get(key) || []).forEach((fn) => fn(value));
}

/** useState synchronisé avec localStorage (et avec le compte en ligne pour les blocs concernés). */
export function usePersistentState(key, initial) {
  const fallback = () => (typeof initial === 'function' ? initial() : initial);
  const [value, setValue] = useState(() => readStore(key, fallback()));
  const last = useRef(JSON.stringify(value ?? null));

  useEffect(() => {
    const fn = (v) => {
      const next = v === null || v === undefined ? fallback() : v;
      last.current = JSON.stringify(next ?? null);
      setValue(next);
    };
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    writeStore(key, value);
    const json = JSON.stringify(value ?? null);
    if (json === last.current) return; // premier rendu, ou valeur reçue du compte en ligne
    last.current = json;
    markDirty(key);
  }, [key, value]);

  return [value, setValue];
}

export function defaultProfile() {
  return {
    name: '',
    level: 'Intermédiaire',
    vma: 15,
    fcMax: 185,
    raceName: 'Mon objectif trail',
    raceDate: toISODate(addDays(mondayOf(new Date()), 7 * 11 + 6)), // dimanche dans 12 semaines
    distance: 42,
    elevation: 2100,
    sessionsPerWeek: 4,
    longRunDay: 6,
    planStart: toISODate(mondayOf(new Date())),
  };
}

/** Reprend le profil de l'ancienne version (clés trailfit_*) s'il existe. */
export function migrateLegacyProfile() {
  try {
    const raw = localStorage.getItem('trailfit_profile');
    if (!raw) return null;
    const old = JSON.parse(raw);
    const base = defaultProfile();
    const weeks = Number(old.weeksRemaining) || 12;
    return {
      ...base,
      name: old.name || '',
      level: ['Débutant', 'Intermédiaire', 'Avancé'].includes(old.level) ? old.level : 'Avancé',
      vma: Number(old.vma) || base.vma,
      fcMax: Number(old.fcMax) || base.fcMax,
      raceName: old.targetRace || base.raceName,
      distance: Number(old.targetDistance) || base.distance,
      elevation: Number(old.targetElevation) || base.elevation,
      sessionsPerWeek: Number(old.sessionsPerWeek) || base.sessionsPerWeek,
      raceDate: toISODate(addDays(mondayOf(new Date()), 7 * (weeks - 1) + 6)),
    };
  } catch {
    return null;
  }
}

export function exportAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
  }
  return { app: 'TrailCoach', version: 2, exportedAt: new Date().toISOString(), data };
}

export function importAll(payload) {
  if (!payload || payload.app !== 'TrailCoach' || typeof payload.data !== 'object') {
    throw new Error("Ce fichier n'est pas une sauvegarde TrailCoach.");
  }
  Object.entries(payload.data).forEach(([k, v]) => { writeStore(k, v); markDirty(k); });
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      // On efface aussi la session du compte en ligne (clés « sb-… ») : sinon les données reviendraient aussitôt
      .filter((k) => k.startsWith(PREFIX) || k.startsWith('trailfit_') || k === SYNC_META || /^sb-.*-auth-token/.test(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
