import React, { useRef, useState } from 'react';
import { FileUp, Map as MapIcon, X } from 'lucide-react';
import { Button, cx } from './ui';
import { readRaceTrack } from '../lib/course';
import { formatKm } from '../lib/format';

/** Silhouette du parcours : aire d'altitude, montées notables surlignées. */
export function CourseProfile({ track, height = 96, className }) {
  const pts = track.profile.filter((p) => p[1] != null);
  if (pts.length < 2) return null;
  const maxD = pts[pts.length - 1][0] || 1;
  const lo = track.minEle;
  const span = Math.max(40, track.maxEle - track.minEle);
  const x = (d) => (d / maxD) * 1000;
  const y = (e) => 100 - ((e - lo) / span) * 88 - 4;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const id = `course-${Math.round(track.distanceKm * 100)}-${track.dplus}`;
  return (
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className={cx('block w-full', className)} style={{ height }} role="img" aria-label="Profil d'altitude du parcours">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {(track.climbs || []).map((c) => (
        <rect key={c.startKm} x={x(c.startKm)} width={Math.max(2, x(c.endKm) - x(c.startKm))} y="0" height="100" fill="rgb(var(--accent-rgb))" opacity="0.07" />
      ))}
      <path d={`${line}L1000,100L0,100Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function courseSummary(track) {
  const n = track.climbs?.length || 0;
  const parts = [];
  if (n) parts.push(`${n} montée${n > 1 ? 's' : ''} de plus de 100 m`);
  if (track.longestClimb) parts.push(`la plus longue : ${track.longestClimb.gain} m D+ sur ${formatKm(track.longestClimb.km)} km (${track.longestClimb.grade} %)`);
  parts.push(`altitude ${track.minEle}–${track.maxEle} m`);
  return parts.join(' · ');
}

/** Import du tracé GPX de la course (glisser-déposer ou bouton). */
export default function RaceGpxField({ track, onLoad, onClear }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handle = async (file) => {
    if (!file) return;
    if (!/\.gpx$/i.test(file.name)) { setError('Sélectionnez un fichier .gpx'); return; }
    try {
      onLoad(readRaceTrack(await file.text(), file.name));
      setError(null);
    } catch (e) {
      setError(e.message || 'Fichier illisible.');
    }
  };

  const input = <input ref={inputRef} type="file" accept=".gpx,application/gpx+xml" className="hidden" data-testid="race-gpx" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ''; }} />;

  if (track) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-sunken/40">
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Tracé de la course</div>
            <div className="truncate text-sm font-extrabold">{track.name}</div>
            <div className="mt-0.5 text-xs font-bold tabular text-muted">
              {formatKm(track.distanceKm)} km · <span className="text-accent">{track.dplus} m D+</span> · {track.dminus} m D−
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>Remplacer</Button>
            <Button variant="ghost" size="sm" onClick={onClear} aria-label="Retirer le tracé"><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <CourseProfile track={track} height={84} />
        <div className="border-t border-line px-4 py-2.5 text-xs text-muted">{courseSummary(track)}</div>
        {input}
        {error && <div className="px-4 pb-3 text-xs font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</div>}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files?.[0]); }}
      className={cx('rounded-xl border-2 border-dashed p-4 transition', dragging ? 'border-accent bg-accent/5' : 'border-line')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><MapIcon className="h-5 w-5" /></div>
          <div>
            <div className="text-sm font-extrabold">Vous avez le tracé GPX de la course ?</div>
            <div className="text-xs text-muted">Facultatif. La distance et le dénivelé sont remplis automatiquement, et le parcours est analysé.</div>
          </div>
        </div>
        <Button variant="subtle" size="sm" onClick={() => inputRef.current?.click()}><FileUp className="h-4 w-4" /> Importer le GPX</Button>
      </div>
      {input}
      {error && <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</div>}
    </div>
  );
}

/** Valeurs de profil déduites d'un tracé. */
export function trackToProfilePatch(track, currentName) {
  const patch = {
    raceTrack: track,
    distance: Math.min(170, Math.max(10, Math.round(track.distanceKm * 10) / 10)),
    elevation: Math.min(10000, Math.max(100, track.dplus)),
  };
  if (track.name && (!currentName?.trim() || currentName === 'Mon objectif trail')) patch.raceName = track.name;
  return patch;
}
