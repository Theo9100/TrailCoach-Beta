import React, { startTransition, useEffect, useLayoutEffect, useRef } from 'react';
import { cx } from './ui';

/**
 * Barre d'onglets mobile façon « Liquid Glass ».
 *
 * Deux couches superposées :
 *  - la rangée d'onglets normale, percée d'un trou à l'emplacement de la lentille ;
 *  - la lentille, qui affiche une copie des onglets en couleur d'accent, agrandie au centre
 *    et comprimée sur les bords, comme à travers une goutte de verre.
 *
 * La déformation est obtenue sans filtre : la lentille est découpée en fines bandes verticales,
 * chacune montrant la copie avec son propre décalage et sa propre échelle. Le mouvement est
 * piloté par des ressorts (position, soulèvement, étirement) calculés à chaque image.
 */

const STRIP = 1.5; // largeur d'une bande de bord, en px
const BEZEL_STRIPS = 16; // bandes par bord : 24 px de verre courbe de chaque côté
const BEZEL = STRIP * BEZEL_STRIPS;
const OVERLAP = 0.5; // recouvrement entre bandes pour éviter les liserés
const GROW_W = 24; // élargissement de la lentille soulevée, en px
const GROW_H = 14; // dépassement vertical de la lentille soulevée, en px
const MAGNIFY = 0.2; // grossissement au centre de la lentille soulevée
const RIM_SQUASH = 0.24; // écrasement vertical sur le bord

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const cellClass = 'flex min-w-0 rounded-[1.4rem] outline-none focus-visible:ring-2 focus-visible:ring-accent flex-col items-center justify-center gap-0.5 whitespace-nowrap py-2 text-[10px] font-bold leading-[15px]';

function Cells({ tabs, copy, active, onPick }) {
  return tabs.map((t) => (copy ? (
    <div key={t.id} className={cellClass}>
      <t.icon className="h-[22px] w-[22px]" strokeWidth={2.4} />
      {t.short || t.label}
    </div>
  ) : (
    <button
      key={t.id}
      type="button"
      // Les appuis tactiles et souris sont gérés par la barre ; ce clic ne sert qu'au clavier
      onClick={(e) => { if (e.detail === 0) onPick(t.id); }}
      aria-current={t.id === active ? 'page' : undefined}
      className={cellClass}
    >
      <t.icon className="h-[22px] w-[22px]" strokeWidth={2} />
      {t.short || t.label}
    </button>
  )));
}

export default function GlassTabBar({ tabs, active, onChange }) {
  const barRef = useRef(null);
  const innerRef = useRef(null);
  const baseRef = useRef(null);
  const lensRef = useRef(null);
  const stripRefs = useRef([]);
  const geo = useRef({ bw: 0, bh: 0, cell: 0 });
  const sim = useRef({ x: 0, vx: 0, tx: 0, L: 0, vL: 0, tL: 0, st: 0, drag: false, releasing: false, downAt: 0, left: 0, raf: 0, last: 0, ready: false });
  const latest = useRef({ tabs, active, onChange });
  latest.current = { tabs, active, onChange };

  const count = tabs.length;
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));
  const gridStyle = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  /** Dessine une image : géométrie de la lentille, trou dans la rangée, bandes déformées. */
  const draw = () => {
    const s = sim.current;
    const { bw, bh, cell } = geo.current;
    const lens = lensRef.current;
    if (!lens || !bw) return;

    const dpr = window.devicePixelRatio || 1;
    const snap = (v) => Math.round(v * dpr) / dpr;
    const lift = clamp(s.L, 0, 1);
    const bezel = Math.min(BEZEL, cell * 0.3);
    const W = snap(Math.max(bezel * 2 + 8, (cell + GROW_W * s.L) * (1 + s.st)));
    const H = snap(Math.max(24, (bh + GROW_H * s.L) * (1 - 0.3 * s.st)));
    const a = W / 2;
    const x0 = snap(s.x - a);
    const y0 = snap((bh - H) / 2);
    const cxLens = x0 + a;

    lens.style.width = `${W}px`;
    lens.style.height = `${H}px`;
    lens.style.transform = `translate3d(${x0}px, ${y0}px, 0)`;
    lens.style.setProperty('--lift', lift.toFixed(3));
    barRef.current.style.transform = `scale(${(1 + 0.022 * lift).toFixed(4)})`;

    // Trou en forme de gélule dans la rangée de base (contour extérieur horaire, trou anti-horaire)
    const r = Math.min(H, W) / 2;
    const i = 0.5;
    const xl = x0 + i; const xr = x0 + W - i; const yt = y0 + i; const yb = y0 + H - i; const rr = r - i;
    baseRef.current.style.clipPath = `path("M-60 -60H${bw + 60}V${bh + 60}H-60Z M${xl + rr} ${yt}A${rr} ${rr} 0 0 0 ${xl + rr} ${yb}H${xr - rr}A${rr} ${rr} 0 0 0 ${xr - rr} ${yt}Z")`;
    baseRef.current.style.webkitClipPath = baseRef.current.style.clipPath;

    // Loi optique : agrandi au centre (pente 1/m), comprimé vers le bord, continu avec l'extérieur
    const m = 1 + MAGNIFY * lift;
    const my = 1 + MAGNIFY * 0.9 * lift;
    const rimY = 1 - RIM_SQUASH * lift;
    const flat = a - bezel;
    const g0 = 1 / m;
    const g1 = g0 + 3 * ((a - flat / m) / bezel - g0);
    const G = (u) => {
      if (u <= flat) return u / m;
      const t = (u - flat) / bezel;
      return flat / m + bezel * (g0 * t + ((g1 - g0) * t * t * t) / 3);
    };
    const g = (x) => (x < 0 ? -G(-x) : G(x));
    const cy = bh / 2;
    const sw = bezel / BEZEL_STRIPS;

    const place = (el, left, right, shift) => {
      if (!el) return;
      const gA = g(left);
      const kx = (right - left) / (g(right) - gA);
      const t = clamp((Math.abs((left + right) / 2) - flat) / bezel, 0, 1);
      const ky = my + (rimY - my) * t * t;
      el.style.transform = `translate(${(shift - (cxLens + gA) * kx).toFixed(2)}px, ${(H / 2 - cy * ky).toFixed(2)}px) scale(${kx.toFixed(4)}, ${ky.toFixed(4)})`;
    };

    const strips = stripRefs.current;
    for (let j = 0; j < BEZEL_STRIPS; j += 1) {
      const outer = strips[j]?.parentNode;
      const outerR = strips[BEZEL_STRIPS + 1 + j]?.parentNode;
      if (outer) { outer.style.left = `${j * sw}px`; outer.style.width = `${sw + OVERLAP}px`; }
      if (outerR) { outerR.style.right = `${j * sw}px`; outerR.style.width = `${sw + OVERLAP}px`; }
      place(strips[j], -a + j * sw, -a + (j + 1) * sw, 0);
      place(strips[BEZEL_STRIPS + 1 + j], a - (j + 1) * sw, a - j * sw, OVERLAP);
    }
    const mid = strips[BEZEL_STRIPS];
    if (mid) {
      mid.parentNode.style.left = `${bezel}px`;
      mid.parentNode.style.right = `${bezel}px`;
      place(mid, -flat, flat, 0);
    }
  };

  /** Fait avancer les ressorts d'un pas de temps. */
  const step = (dt) => {
    const s = sim.current;
    const { cell } = geo.current;
    const kx = s.drag ? 620 : 250;
    const dx = s.drag ? 42 : 21;
    s.vx += (kx * (s.tx - s.x) - dx * s.vx) * dt;
    s.x += s.vx * dt;

    // Après le relâchement, la lentille reste soulevée le temps du trajet, puis se pose
    if (s.releasing && performance.now() - s.downAt > 170 && Math.abs(s.tx - s.x) < cell * 0.3) {
      s.releasing = false;
      s.tL = 0;
    }
    s.vL += (360 * (s.tL - s.L) - 25 * s.vL) * dt;
    s.L += s.vL * dt;

    const target = clamp(Math.abs(s.vx) / 2600, 0, 0.32) * (0.45 + 0.55 * clamp(s.L, 0, 1));
    s.st += (target - s.st) * Math.min(1, dt * 16);
  };

  const tick = (now) => {
    const s = sim.current;
    const dt = Math.min(0.034, (now - s.last) / 1000 || 0.016);
    s.last = now;
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    for (let k = 0; k < n; k += 1) step(dt / n);

    const still = !s.drag && !s.releasing
      && Math.abs(s.tx - s.x) < 0.05 && Math.abs(s.vx) < 1
      && Math.abs(s.tL - s.L) < 0.002 && Math.abs(s.vL) < 0.02 && s.st < 0.002;
    if (still) {
      s.x = s.tx; s.vx = 0; s.L = s.tL; s.vL = 0; s.st = 0; s.raf = 0;
      draw();
      return;
    }
    draw();
    s.raf = requestAnimationFrame(tick);
  };

  const run = () => {
    const s = sim.current;
    if (s.raf) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame(tick);
  };

  const centerOf = (index) => (index + 0.5) * geo.current.cell;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const jumpTo = (index) => {
    const s = sim.current;
    cancelAnimationFrame(s.raf);
    Object.assign(s, { x: centerOf(index), tx: centerOf(index), vx: 0, L: 0, vL: 0, tL: 0, st: 0, raf: 0, drag: false, releasing: false });
    draw();
  };

  // Mesure de la rangée, puis recalage à chaque changement de taille
  useLayoutEffect(() => {
    const inner = innerRef.current;
    const measure = () => {
      const bw = inner.clientWidth;
      const bh = inner.clientHeight;
      if (!bw || !bh) return;
      geo.current = { bw, bh, cell: bw / latest.current.tabs.length };
      lensRef.current.style.setProperty('--bw', `${bw}px`);
      lensRef.current.style.setProperty('--bh', `${bh}px`);
      lensRef.current.style.visibility = 'visible';
      sim.current.ready = true;
      jumpTo(Math.max(0, latest.current.tabs.findIndex((t) => t.id === latest.current.active)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(inner);
    return () => { ro?.disconnect(); cancelAnimationFrame(sim.current.raf); sim.current.raf = 0; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Changement d'onglet venu d'ailleurs (clavier, autre navigation) : la pastille glisse
  useEffect(() => {
    const s = sim.current;
    if (!s.ready || s.drag || s.releasing) return;
    if (reducedMotion()) { jumpTo(activeIndex); return; }
    s.tx = centerOf(activeIndex);
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const pick = (id) => {
    if (id !== latest.current.active) startTransition(() => latest.current.onChange(id));
  };

  const pointerX = (e) => {
    const { bw, cell } = geo.current;
    const x = e.clientX - sim.current.left;
    const lo = cell / 2;
    const hi = bw - cell / 2;
    // Légère résistance élastique au-delà des extrémités
    if (x < lo) return lo - Math.min(10, (lo - x) * 0.25);
    if (x > hi) return hi + Math.min(10, (x - hi) * 0.25);
    return x;
  };
  const indexAt = (e) => clamp(Math.floor((e.clientX - sim.current.left) / geo.current.cell), 0, count - 1);

  const onDown = (e) => {
    if (e.button != null && e.button > 0) return;
    const s = sim.current;
    if (!s.ready) return;
    s.left = innerRef.current.getBoundingClientRect().left;
    if (reducedMotion()) { s.drag = true; return; }
    barRef.current.setPointerCapture?.(e.pointerId);
    s.drag = true;
    s.releasing = false;
    s.downAt = performance.now();
    s.tL = 1;
    s.tx = pointerX(e);
    run();
  };
  const onMove = (e) => {
    const s = sim.current;
    if (!s.drag || reducedMotion()) return;
    s.tx = pointerX(e);
    run();
  };
  const finish = (e, cancelled) => {
    const s = sim.current;
    if (!s.drag) return;
    s.drag = false;
    const current = Math.max(0, latest.current.tabs.findIndex((t) => t.id === latest.current.active));
    const index = cancelled ? current : indexAt(e);
    if (reducedMotion()) {
      jumpTo(index);
    } else {
      s.releasing = true;
      s.tx = centerOf(index);
      run();
    }
    pick(latest.current.tabs[index].id);
  };

  const stripCount = BEZEL_STRIPS * 2 + 1;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      aria-label="Navigation principale"
    >
      <div
        ref={barRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        className="glass relative mx-auto max-w-md touch-none select-none rounded-[2rem] p-1.5"
        style={{ WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', willChange: 'transform' }}
      >
        <div ref={innerRef} className="relative">
          <div ref={baseRef} className="grid text-ink/70" style={gridStyle}>
            <Cells tabs={tabs} active={active} onPick={pick} />
          </div>

          <div ref={lensRef} aria-hidden="true" className="lens-shell" style={{ visibility: 'hidden' }}>
            <div className="lens-clip">
              <span className="lens-fill" />
              {Array.from({ length: stripCount }, (_, k) => (
                <div key={k} className="lens-strip">
                  <div ref={(el) => { stripRefs.current[k] = el; }} className="lens-copy grid text-accent" style={gridStyle}>
                    <Cells tabs={tabs} copy />
                  </div>
                </div>
              ))}
              <span className="lens-rim" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
