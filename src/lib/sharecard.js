/**
 * Carte de partage : image (PNG) d'une semaine, d'une séance ou du bilan,
 * dessinée sur un canvas pour être postée sur Strava, Instagram, WhatsApp…
 */
import { DAYS_SHORT, addDays, daysBetween, formatDuration, formatKm, formatShortDate, toISODate } from './format';
import { PHASES, SESSION_TYPES } from './plan';

export const FORMATS = {
  post: { label: 'Publication', w: 1080, h: 1350 },
  story: { label: 'Story', w: 1080, h: 1920 },
};

// La carte est toujours sombre : palette fixe, indépendante du thème de l'app
const C = { bg0: '#0f1210', bg1: '#1b211c', ink: '#ebe7dd', muted: '#969b91', line: 'rgba(235,231,221,0.14)', accent: '#f06e42', moss: '#80aa88' };
const TYPE_COLORS = { EF: '#6fb583', VMA: '#f0714e', COTES: '#e0a542', LONG: '#63a3d4', RECUP: '#8fb3ad', RENFO: '#b095d4', PREPA: '#f06e42', COURSE: '#f06e42' };
const PHASE_COLORS = { foncier: '#6fb583', developpement: '#e0a542', specifique: '#f0714e', affutage: '#63a3d4' };

const num = (v) => Math.round(v).toLocaleString('fr-FR').replace(/ /g, ' ');

/* ------------------------------------------------------------------ */
/* Données des trois cartes                                           */
/* ------------------------------------------------------------------ */

function goalFooter(profile) {
  const d = daysBetween(new Date(), profile.raceDate);
  return d > 0 ? `Objectif : ${profile.raceName} · J-${d}` : d === 0 ? `${profile.raceName} · c’est aujourd’hui` : profile.raceName;
}

export function weekCard(week, { profile, completions, activitiesById }) {
  const done = week.sessions.filter((s) => completions[s.id]?.done);
  const started = done.length > 0;
  const sum = (key) => done.reduce((t, s) => {
    const a = activitiesById[completions[s.id]?.activityId];
    if (key === 'km') return t + (a ? a.distanceKm : s.km);
    if (key === 'dplus') return t + (a ? a.dplus : s.dplus);
    return t + (a?.movingMin || s.durationMin);
  }, 0);
  const days = DAYS_SHORT.map((label, i) => {
    const list = week.sessions.filter((s) => s.dayIndex === i);
    const main = list.find((s) => s.type !== 'RENFO') || list[0];
    return {
      label,
      value: list.reduce((t, s) => t + s.durationMin, 0),
      color: main ? TYPE_COLORS[main.type] : null,
      done: list.length > 0 && list.every((s) => completions[s.id]?.done),
    };
  });
  const last = toISODate(addDays(week.startDate, 6));
  return {
    kicker: `${PHASES[week.phase].label}${week.isRecovery ? ' · assimilation' : ''}`,
    kickerColor: PHASE_COLORS[week.phase],
    title: `Semaine ${week.number}`,
    subtitle: `${formatShortDate(week.startDate)} – ${formatShortDate(last)}${started ? '' : ' · au programme'}`,
    stats: started
      ? [
        { value: formatKm(sum('km'), 0), unit: 'km' },
        { value: num(sum('dplus')), unit: 'm D+', accent: true },
        { value: formatDuration(sum('min')), unit: 'd’effort' },
        { value: `${done.length}/${week.sessions.length}`, unit: 'séances' },
      ]
      : [
        { value: String(week.targetKm), unit: 'km' },
        { value: num(week.targetDPlus), unit: 'm D+', accent: true },
        { value: formatDuration(week.targetMinutes), unit: 'd’effort' },
        { value: String(week.sessions.length), unit: 'séances' },
      ],
    chart: { type: 'days', items: days },
    footer: goalFooter(profile),
    fileName: `trailcoach-semaine-${week.number}`,
  };
}

export function sessionCard(session, { profile, activity, completion }) {
  const a = activity;
  const stats = [];
  if (session.type === 'RENFO') {
    stats.push({ value: formatDuration(session.durationMin), unit: 'de renfo' }, { value: String(session.exercises?.length || 0), unit: 'exercices', accent: true });
  } else {
    stats.push({ value: formatKm(a ? a.distanceKm : session.km), unit: 'km' });
    stats.push({ value: num(a ? a.dplus : session.dplus), unit: 'm D+', accent: true });
    stats.push({ value: formatDuration(a?.movingMin || session.durationMin), unit: 'd’effort' });
    if (a?.avgHr) stats.push({ value: String(a.avgHr), unit: 'bpm moy.' });
    else if (completion?.rpe) stats.push({ value: `${completion.rpe}/10`, unit: 'effort' });
  }
  const pts = a?.hasElevation ? a.profile.filter((p) => p[1] != null).map((p) => [p[0], p[1]]) : [];
  return {
    kicker: SESSION_TYPES[session.type].label,
    kickerColor: TYPE_COLORS[session.type],
    title: session.title,
    subtitle: `${formatShortDate(session.date)}${completion?.score != null ? ` · ${completion.score} % conforme au plan` : ''}`,
    stats,
    chart: pts.length > 8 ? { type: 'profile', points: pts } : null,
    footer: goalFooter(profile),
    fileName: `trailcoach-seance-${session.date}`,
  };
}

export function recapCard(recap, finishMinutes) {
  return {
    kicker: finishMinutes ? `Arrivée en ${formatDuration(finishMinutes)}` : 'Préparation terminée',
    kickerColor: C.accent,
    title: recap.raceName,
    subtitle: `${formatKm(recap.distance)} km · ${num(recap.elevation)} m D+ · ${recap.weekCount} semaines de préparation`,
    stats: [
      { value: num(recap.km), unit: 'km courus' },
      { value: num(recap.dplus), unit: 'm D+', accent: true },
      { value: formatDuration(recap.minutes), unit: 'd’effort' },
      { value: `${recap.done}/${recap.planned}`, unit: 'séances' },
    ],
    chart: { type: 'weeks', items: recap.weeks.map((w) => ({ planned: w.planned, actual: w.actual, color: PHASE_COLORS[w.phase] })) },
    footer: 'Ma préparation avec TrailCoach',
    fileName: 'trailcoach-bilan',
  };
}

/* ------------------------------------------------------------------ */
/* Dessin                                                             */
/* ------------------------------------------------------------------ */

const font = (weight, size, condensed) => `${weight} ${condensed ? 'condensed ' : ''}${size}px Archivo, system-ui, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Écrit un texte en réduisant la taille jusqu'à tenir dans la largeur ; renvoie la taille utilisée. */
function fitText(ctx, text, x, y, maxWidth, weight, size, condensed, minSize = 28) {
  let s = size;
  ctx.font = font(weight, s, condensed);
  while (ctx.measureText(text).width > maxWidth && s > minSize) { s -= 4; ctx.font = font(weight, s, condensed); }
  ctx.fillText(text, x, y);
  return s;
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 3) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

function background(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = (x, y, r, color) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  };
  glow(w * 1.02, h * 0.02, w * 0.85, 'rgba(240,110,66,0.34)');
  glow(-w * 0.05, h * 0.98, w * 0.8, 'rgba(128,170,136,0.2)');

  // Lignes de niveau
  ctx.save();
  ctx.strokeStyle = 'rgba(235,231,221,0.055)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i += 1) {
    const y0 = h * 0.5 + i * 62;
    ctx.beginPath();
    ctx.moveTo(-40, y0 + 90);
    ctx.bezierCurveTo(w * 0.22, y0 - 60 - i * 6, w * 0.42, y0 + 130, w * 0.62, y0 - 20 - i * 10);
    ctx.bezierCurveTo(w * 0.78, y0 - 140 - i * 4, w * 0.9, y0 + 40, w + 40, y0 - 60);
    ctx.stroke();
  }
  ctx.restore();
}

function logo(ctx, x, y) {
  const s = 84;
  ctx.fillStyle = C.accent;
  roundRect(ctx, x, y, s, s, 20);
  ctx.fill();
  ctx.save();
  ctx.translate(x + 14, y + 14);
  ctx.scale(56 / 32, 56 / 32);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(3, 25); ctx.lineTo(12, 10); ctx.lineTo(17, 18); ctx.lineTo(20.5, 13); ctx.lineTo(29, 25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = font(900, 50, true);
  ctx.fillStyle = C.ink;
  ctx.fillText('TRAIL', x + s + 22, y + s / 2 + 3);
  const tw = ctx.measureText('TRAIL').width;
  ctx.fillStyle = C.accent;
  ctx.fillText('COACH', x + s + 22 + tw, y + s / 2 + 3);
}

function drawDays(ctx, items, x, y, w, h) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const gap = 22;
  const bw = (w - gap * (items.length - 1)) / items.length;
  const labelH = 54;
  items.forEach((it, i) => {
    const bx = x + i * (bw + gap);
    const bh = it.value > 0 ? Math.max(26, (it.value / max) * (h - labelH)) : 0;
    const by = y + h - labelH - bh;
    if (bh > 0) {
      roundRect(ctx, bx, by, bw, bh, 16);
      if (it.done) { ctx.fillStyle = it.color; ctx.fill(); } else {
        ctx.fillStyle = `${it.color}26`; ctx.fill();
        ctx.strokeStyle = it.color; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.stroke(); ctx.setLineDash([]);
      }
    } else {
      ctx.fillStyle = C.line;
      roundRect(ctx, bx + bw / 2 - 5, y + h - labelH - 10, 10, 10, 5);
      ctx.fill();
    }
    ctx.fillStyle = it.value > 0 ? C.ink : C.muted;
    ctx.font = font(700, 30);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(it.label, bx + bw / 2, y + h - 6);
  });
  ctx.textAlign = 'left';
}

function drawWeeks(ctx, items, x, y, w, h) {
  const max = Math.max(...items.map((i) => Math.max(i.planned, i.actual)), 1);
  const gap = Math.max(6, Math.min(18, 220 / items.length));
  const bw = (w - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const bx = x + i * (bw + gap);
    const ph = Math.max(6, (it.planned / max) * h);
    ctx.strokeStyle = `${it.color}99`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 7]);
    roundRect(ctx, bx, y + h - ph, bw, ph, 8);
    ctx.stroke();
    ctx.setLineDash([]);
    if (it.actual > 0) {
      const ah = Math.max(6, (it.actual / max) * h);
      ctx.fillStyle = it.color;
      roundRect(ctx, bx, y + h - ah, bw, ah, 8);
      ctx.fill();
    }
  });
}

function drawProfile(ctx, points, x, y, w, h) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs);
  const lo = Math.min(...ys); const hi = Math.max(...ys);
  const span = Math.max(hi - lo, 40);
  const px = (v) => x + ((v - x0) / (x1 - x0 || 1)) * w;
  const py = (v) => y + h - 8 - ((v - lo) / span) * (h - 30);
  ctx.beginPath();
  points.forEach((p, i) => { if (i === 0) ctx.moveTo(px(p[0]), py(p[1])); else ctx.lineTo(px(p[0]), py(p[1])); });
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(240,110,66,0.42)');
  g.addColorStop(1, 'rgba(240,110,66,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = C.muted;
  ctx.font = font(700, 28);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${Math.round(lo)} m`, x, y + h + 40);
  ctx.textAlign = 'right';
  ctx.fillText(`point haut ${Math.round(hi)} m`, x + w, y + h + 40);
  ctx.textAlign = 'left';
}

export async function drawShareCard(canvas, data, formatKey = 'post') {
  const { w, h } = FORMATS[formatKey] || FORMATS.post;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all([document.fonts.load(font(900, 100, true)), document.fonts.load(font(700, 40)), document.fonts.load(font(900, 60))]);
  } catch { /* polices de secours */ }

  const pad = 84;
  const inner = w - pad * 2;
  const story = formatKey === 'story';
  background(ctx, w, h);
  logo(ctx, pad, story ? 150 : pad);

  let y = story ? 420 : 300;

  // Étiquette
  ctx.font = font(800, 32);
  ctx.textBaseline = 'middle';
  const kick = data.kicker.toUpperCase();
  const kw = ctx.measureText(kick).width + 34 + 52;
  ctx.fillStyle = `${data.kickerColor}2e`;
  roundRect(ctx, pad, y, kw, 62, 31);
  ctx.fill();
  ctx.fillStyle = data.kickerColor;
  ctx.beginPath(); ctx.arc(pad + 30, y + 31, 9, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.fillText(kick, pad + 52, y + 33);
  ctx.restore();
  y += 62 + 44;

  // Titre (une grande ligne, ou deux lignes pour un intitulé long)
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(900, 190, true);
  if (ctx.measureText(data.title).width <= inner) {
    y += 160;
    ctx.fillText(data.title, pad - 4, y);
  } else {
    const size = story ? 128 : 108;
    ctx.font = font(900, size, true);
    const lines = wrapLines(ctx, data.title, inner, 2);
    if (lines.length === 1) { fitText(ctx, data.title, pad - 2, y + 118, inner, 900, 170, true, 96); y += 118; } else {
      lines.forEach((l, i) => ctx.fillText(l, pad - 2, y + size * 0.86 + i * size));
      y += size * 0.86 + (lines.length - 1) * size;
    }
  }
  y += 58;
  ctx.fillStyle = C.muted;
  fitText(ctx, data.subtitle, pad, y, inner, 600, 38, false);
  y += story ? 110 : 56;

  // Chiffres clés
  const cols = Math.min(4, data.stats.length);
  const two = cols > 2 && story;
  const perRow = two ? 2 : cols;
  const colW = inner / perRow;
  const rowH = two ? 250 : 196;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  data.stats.slice(0, 4).forEach((s, i) => {
    const cx = pad + (i % perRow) * colW;
    const cy = y + Math.floor(i / perRow) * rowH;
    ctx.fillStyle = s.accent ? C.accent : C.ink;
    fitText(ctx, s.value, cx, cy + (two ? 150 : 114), colW - 26, 900, two ? 132 : 96, true, 48);
    ctx.fillStyle = C.muted;
    ctx.font = font(700, two ? 34 : 30);
    ctx.fillText(s.unit, cx + 2, cy + (two ? 200 : 158));
  });
  y += Math.ceil(Math.min(4, data.stats.length) / perRow) * rowH;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();

  // Graphique : occupe la place restante au-dessus du pied de carte
  const footerY = h - (story ? 190 : pad + 10);
  const profileChart = data.chart?.type === 'profile';
  const chartTop = y + 50;
  const chartH = footerY - 76 - chartTop - (profileChart ? 46 : 0);
  if (data.chart && chartH > 100) {
    const ch = Math.min(chartH, story ? 520 : 400);
    const cy = chartTop + (chartH - ch) / 2;
    if (data.chart.type === 'days') drawDays(ctx, data.chart.items, pad, cy, inner, ch);
    if (data.chart.type === 'weeks') drawWeeks(ctx, data.chart.items, pad, cy, inner, ch);
    if (profileChart) drawProfile(ctx, data.chart.points, pad, cy, inner, ch);
  }

  // Pied de carte
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, data.footer, pad, footerY, inner, 700, 36, false);
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
