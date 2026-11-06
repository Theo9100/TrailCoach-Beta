import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatKm } from '../lib/format';

/** Profil d'altitude (aire) avec courbe de fréquence cardiaque optionnelle et survol. */
export default function ElevationChart({ profile, height = 220 }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 16, right: 44, bottom: 26, left: 44 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const model = useMemo(() => {
    const pts = profile.filter((p) => p[1] != null);
    if (pts.length < 2) return null;
    const maxD = profile[profile.length - 1][0] || 1;
    const eles = pts.map((p) => p[1]);
    let lo = Math.min(...eles);
    let hi = Math.max(...eles);
    const span = Math.max(50, hi - lo);
    lo -= span * 0.08;
    hi += span * 0.12;
    const hrs = profile.map((p) => p[2]).filter(Boolean);
    const hrLo = hrs.length ? Math.min(...hrs) - 5 : 0;
    const hrHi = hrs.length ? Math.max(...hrs) + 5 : 1;
    return { pts, maxD, lo, hi, hrs: hrs.length > 5, hrLo, hrHi };
  }, [profile]);

  if (!model) {
    return <div className="grid h-40 place-items-center rounded-xl bg-sunken text-sm text-muted">Pas de données d'altitude dans ce fichier.</div>;
  }

  const x = (d) => pad.left + (d / model.maxD) * w;
  const y = (e) => pad.top + h - ((e - model.lo) / (model.hi - model.lo)) * h;
  const yHr = (v) => pad.top + h - ((v - model.hrLo) / (model.hrHi - model.hrLo)) * h;

  const line = model.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const area = `${line}L${x(model.pts[model.pts.length - 1][0]).toFixed(1)},${pad.top + h}L${x(model.pts[0][0]).toFixed(1)},${pad.top + h}Z`;
  const hrLine = model.hrs
    ? profile.filter((p) => p[2]).map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${yHr(p[2]).toFixed(1)}`).join('')
    : null;

  const ticksY = 4;
  const yTicks = Array.from({ length: ticksY + 1 }, (_, i) => model.lo + ((model.hi - model.lo) * i) / ticksY);
  const xStep = model.maxD > 40 ? 10 : model.maxD > 15 ? 5 : model.maxD > 6 ? 2 : 1;
  const xTicks = [];
  for (let d = 0; d <= model.maxD + 1e-6; d += xStep) xTicks.push(d);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const d = ((px - pad.left) / w) * model.maxD;
    if (d < 0 || d > model.maxD) { setHover(null); return; }
    let best = profile[0];
    profile.forEach((p) => { if (Math.abs(p[0] - d) < Math.abs(best[0] - d)) best = p; });
    setHover(best);
  };

  return (
    <div ref={ref} className="relative w-full min-w-0 select-none overflow-hidden">
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block" role="img" aria-label="Profil d'altitude de l'activité">
        <defs>
          <linearGradient id="eleFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeDasharray="2 4" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[10px] font-bold tabular">{Math.round(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={height - 8} textAnchor="middle" className="fill-muted text-[10px] font-bold tabular">{t} km</text>
        ))}
        <path d={area} fill="url(#eleFill)" />
        <path d={line} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2" strokeLinejoin="round" />
        {hrLine && <path d={hrLine} fill="none" stroke="var(--type-long)" strokeWidth="1.5" strokeOpacity="0.85" />}
        {model.hrs && (
          <>
            <text x={pad.left + w + 8} y={yHr(model.hrHi - 5) + 4} className="text-[10px] font-bold tabular" fill="var(--type-long)">{Math.round(model.hrHi - 5)}</text>
            <text x={pad.left + w + 8} y={yHr(model.hrLo + 5) + 4} className="text-[10px] font-bold tabular" fill="var(--type-long)">{Math.round(model.hrLo + 5)}</text>
          </>
        )}
        {hover && hover[1] != null && (
          <g>
            <line x1={x(hover[0])} x2={x(hover[0])} y1={pad.top} y2={pad.top + h} stroke="rgb(var(--ink))" strokeOpacity="0.4" />
            <circle cx={x(hover[0])} cy={y(hover[1])} r="4" fill="rgb(var(--surface))" stroke="rgb(var(--accent-rgb))" strokeWidth="2" />
            {hover[2] && model.hrs && <circle cx={x(hover[0])} cy={yHr(hover[2])} r="3.5" fill="var(--type-long)" />}
          </g>
        )}
      </svg>
      {hover && hover[1] != null && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold shadow-sm tabular"
          style={{ left: Math.min(width - 130, Math.max(0, x(hover[0]) - 60)) }}
        >
          <div>{formatKm(hover[0], 2)} km · <span className="text-accent">{hover[1]} m</span></div>
          {hover[2] && <div style={{ color: 'var(--type-long)' }}>{hover[2]} bpm</div>}
        </div>
      )}
    </div>
  );
}
