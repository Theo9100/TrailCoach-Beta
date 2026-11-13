import React, { useMemo } from 'react';

/** Tracé GPS dessiné en vectoriel (sans fond de carte, fonctionne hors connexion). */
export default function TrackMap({ track, height = 220, className = '' }) {
  const model = useMemo(() => {
    const pts = (track || []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
    if (pts.length < 2) return null;
    const lat0 = pts.reduce((t, p) => t + p[0], 0) / pts.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xy = pts.map(([lat, lon]) => [lon * k, -lat]);
    const xs = xy.map((p) => p[0]); const ys = xy.map((p) => p[1]);
    const minX = Math.min(...xs); const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX || 1e-6; const h = Math.max(...ys) - minY || 1e-6;
    const W = 600; const H = 300; const pad = 26;
    const scale = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const ox = (W - w * scale) / 2; const oy = (H - h * scale) / 2;
    const proj = xy.map(([x, y]) => [ox + (x - minX) * scale, oy + (y - minY) * scale]);
    return { d: proj.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''), start: proj[0], end: proj[proj.length - 1] };
  }, [track]);

  if (!model) return null;
  const loop = Math.hypot(model.start[0] - model.end[0], model.start[1] - model.end[1]) < 14;
  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-sunken/50 ${className}`}>
      <div className="topo topo-layer" />
      <svg viewBox="0 0 600 300" className="relative block w-full" style={{ height }} role="img" aria-label="Tracé GPS">
        <path d={model.d} fill="none" stroke="rgb(var(--surface))" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
        <path d={model.d} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
        {!loop && <circle cx={model.end[0]} cy={model.end[1]} r="7" fill="rgb(var(--ink))" stroke="rgb(var(--surface))" strokeWidth="3" />}
        <circle cx={model.start[0]} cy={model.start[1]} r="7" fill="var(--type-ef)" stroke="rgb(var(--surface))" strokeWidth="3" />
      </svg>
      <div className="absolute bottom-2 left-3 flex gap-3 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--type-ef)' }} />Départ{loop ? ' / arrivée' : ''}</span>
        {!loop && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink" />Arrivée</span>}
      </div>
    </div>
  );
}
