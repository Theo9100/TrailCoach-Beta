export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date locale à minuit, à partir d'une chaîne AAAA-MM-JJ ou d'une Date. */
export function toDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const d = toDate(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(date, n) {
  const d = toDate(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Lundi de la semaine contenant `date`. */
export function mondayOf(date) {
  const d = toDate(date);
  const idx = (d.getDay() + 6) % 7; // 0 = lundi
  return addDays(d, -idx);
}

export function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / DAY_MS);
}

/** Index du jour de la semaine, 0 = lundi. */
export function weekdayIndex(date) {
  return (toDate(date).getDay() + 6) % 7;
}

export function formatShortDate(date) {
  return toDate(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatLongDate(date) {
  return toDate(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Allure (min/km) à partir d'une vitesse en km/h. */
export function pace(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return '–';
  const totalSec = Math.round(3600 / speedKmh);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}'${String(sec).padStart(2, '0')}`;
}

/** Durée lisible à partir de minutes. */
export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '–';
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

export function formatKm(km, digits = 1) {
  if (km == null || Number.isNaN(km)) return '–';
  const v = Number(km);
  return v >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(digits).replace('.', ',');
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function roundTo(v, step) {
  return Math.round(v / step) * step;
}
