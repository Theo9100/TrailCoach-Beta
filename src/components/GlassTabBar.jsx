import React, { useEffect, useRef, useState } from 'react';
import { cx } from './ui';

/**
 * Barre d'onglets mobile façon « Liquid Glass » : une lentille de verre repose sur l'onglet actif.
 * Au toucher, elle se soulève, grossit et suit le doigt en se déformant ; au relâchement,
 * elle se pose sur l'onglet le plus proche avec un rebond.
 */
export default function GlassTabBar({ tabs, active, onChange }) {
  const barRef = useRef(null);
  const drag = useRef({ on: false, lastX: 0, lastT: 0, moved: false });
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));
  const [pos, setPos] = useState(activeIndex); // position de la lentille, en « onglets » (décimale pendant le glissement)
  const [lifted, setLifted] = useState(false);
  const [stretch, setStretch] = useState(0);

  useEffect(() => { if (!drag.current.on) setPos(activeIndex); }, [activeIndex]);

  const posFromEvent = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const pad = 6;
    const cell = (rect.width - pad * 2) / tabs.length;
    return Math.min(tabs.length - 1, Math.max(0, (e.clientX - rect.left - pad) / cell - 0.5));
  };

  const onDown = (e) => {
    drag.current = { on: true, lastX: e.clientX, lastT: performance.now(), moved: false };
    barRef.current.setPointerCapture?.(e.pointerId);
    setLifted(true);
    setPos(posFromEvent(e));
  };
  const onMove = (e) => {
    if (!drag.current.on) return;
    const now = performance.now();
    const v = (e.clientX - drag.current.lastX) / Math.max(1, now - drag.current.lastT); // px/ms
    if (Math.abs(e.clientX - drag.current.lastX) > 2) drag.current.moved = true;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
    setStretch(Math.max(-1, Math.min(1, v / 1.2)));
    setPos(posFromEvent(e));
  };
  const onUp = (e) => {
    if (!drag.current.on) return;
    drag.current.on = false;
    const index = Math.round(posFromEvent(e));
    setLifted(false);
    setStretch(0);
    setPos(index);
    if (tabs[index].id !== active) onChange(tabs[index].id);
  };

  const near = Math.round(pos);
  const sx = 1 + Math.abs(stretch) * 0.22;
  const sy = 1 - Math.abs(stretch) * 0.1;

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
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="glass relative mx-auto grid max-w-md touch-none select-none rounded-[2rem] p-1.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`, WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Lentille */}
        <span
          aria-hidden="true"
          className={cx('lens pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[1.6rem]', lifted && 'lens-lifted')}
          style={{
            width: `calc((100% - 0.75rem) / ${tabs.length})`,
            transform: `translateX(${pos * 100}%) scale(${lifted ? 1.16 * sx : 1}, ${lifted ? 1.22 * sy : 1})`,
            transition: drag.current.on
              ? 'transform 90ms linear, box-shadow 200ms, background 200ms'
              : 'transform 520ms cubic-bezier(0.22, 1.45, 0.4, 1), box-shadow 300ms, background 300ms',
          }}
        />
        {tabs.map((t, i) => {
          const isActive = lifted ? i === near : t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { if (!drag.current.moved && t.id !== active) onChange(t.id); }}
              aria-current={t.id === active ? 'page' : undefined}
              className={cx('relative flex flex-col items-center gap-0.5 rounded-[1.6rem] py-2 text-[10px] font-bold transition-colors duration-200', isActive ? 'text-accent' : 'text-ink/65')}
              style={{ transform: lifted && i === near ? 'scale(1.14)' : 'scale(1)', transition: 'transform 220ms cubic-bezier(0.3, 1.4, 0.5, 1), color 200ms' }}
            >
              <t.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
              {t.short || t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
