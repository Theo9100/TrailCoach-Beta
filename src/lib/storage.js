import { useEffect, useState } from 'react';
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

/** useState synchronisé avec localStorage. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => readStore(key, typeof initial === 'function' ? initial() : initial));
  useEffect(() => { writeStore(key, value); }, [key, value]);
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
  Object.entries(payload.data).forEach(([k, v]) => writeStore(k, v));
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) || k.startsWith('trailfit_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
