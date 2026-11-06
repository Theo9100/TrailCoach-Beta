import React from 'react';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('bg-surface border border-line rounded-xl2', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action, className }) {
  return (
    <div className={cx('flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{eyebrow}</div>}
        <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-white hover:brightness-110 shadow-sm shadow-accent/30',
  ink: 'bg-ink text-bg hover:opacity-90',
  ghost: 'bg-transparent text-ink hover:bg-sunken border border-line',
  subtle: 'bg-sunken text-ink hover:bg-line/60',
  danger: 'bg-transparent text-[color:var(--type-vma)] border border-[color:var(--type-vma)]/40 hover:bg-[color:var(--type-vma)]/10',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  const sizes = { sm: 'h-9 px-3 text-xs', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-sm' };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        BUTTON_VARIANTS[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TypeChip({ type, info, className }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider', className)}
      style={{ color: info.color, background: `color-mix(in srgb, ${info.color} 14%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
      {info.short || type}
    </span>
  );
}

export function Stat({ label, value, unit, accent, className }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cx('font-display text-2xl font-extrabold tabular leading-tight', accent && 'text-accent')}>
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full h-11 rounded-xl border border-line bg-sunken/60 px-3.5 text-sm font-semibold text-ink placeholder:text-muted/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition';

export function RangeField({ label, value, unit, min, max, step, onChange, hint }) {
  return (
    <div className="rounded-xl border border-line bg-sunken/40 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className="font-display text-xl font-extrabold tabular">
          {value}
          {unit && <span className="ml-1 text-xs font-bold text-muted">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        aria-label={label}
      />
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('grid gap-1 rounded-xl bg-sunken p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-2 py-2 text-xs font-bold transition',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, className, color = 'var(--accent)' }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-sunken', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function Logo({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white shadow-sm shadow-accent/30">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path d="M3 25 L12 10 L17 18 L20.5 13 L29 25 Z" fill="currentColor" />
          <path d="M12 10 L14.5 14 L12.7 13.2 L10.6 14.6 Z" fill="rgb(var(--accent-rgb))" opacity="0.5" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-lg font-black tracking-tight">
            TRAIL<span className="text-accent">COACH</span>
          </div>
        </div>
      )}
    </div>
  );
}
