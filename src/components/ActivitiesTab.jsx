import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Info, Trash2, UploadCloud } from 'lucide-react';
import { Button, Card, SectionTitle, Stat, TypeChip, cx, inputClass } from './ui';
import ElevationChart from './ElevationChart';
import { SESSION_TYPES } from '../lib/plan';
import { compareToSession, parseGpx } from '../lib/gpx';
import { daysBetween, formatDuration, formatKm, formatLongDate, formatShortDate, pace } from '../lib/format';

export default function ActivitiesTab({ profile, plan, activities, onAddActivities, onRemoveActivity, completions, onLink }) {
  const [selectedId, setSelectedId] = useState(activities[0]?.id ?? null);
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const sessions = useMemo(() => plan.flatMap((w) => w.sessions.map((s) => ({ ...s, week: w.number }))), [plan]);
  const sessionById = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions]);
  const linkOf = (activityId) => Object.entries(completions).find(([, c]) => c.activityId === activityId)?.[0] ?? null;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => /\.gpx$/i.test(f.name));
    if (!files.length) { setErrors(['Sélectionnez un ou plusieurs fichiers .gpx']); return; }
    const parsed = [];
    const errs = [];
    for (const f of files) {
      try {
        parsed.push(parseGpx(await f.text(), f.name));
      } catch (e) {
        errs.push(`${f.name} : ${e.message}`);
      }
    }
    setErrors(errs);
    if (parsed.length) {
      onAddActivities(parsed, sessions);
      setSelectedId(parsed[0].id);
    }
  };

  const selected = activities.find((a) => a.id === selectedId) || activities[0];
  const linkedSessionId = selected ? linkOf(selected.id) : null;
  const linkedSession = linkedSessionId ? sessionById[linkedSessionId] : null;
  const comparison = selected && linkedSession ? compareToSession(selected, linkedSession, profile) : null;
  const candidates = selected
    ? sessions.filter((s) => Math.abs(daysBetween(selected.date, s.date)) <= 7).sort((a, b) => Math.abs(daysBetween(selected.date, a.date)) - Math.abs(daysBetween(selected.date, b.date)))
    : [];

  const totals = activities.reduce((acc, a) => ({ km: acc.km + a.distanceKm, dplus: acc.dplus + a.dplus, min: acc.min + (a.movingMin || 0) }), { km: 0, dplus: 0, min: 0 });

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Analyse locale, aucune donnée envoyée" title="Mes séances & GPX" />

      {/* Zone d'import */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={cx('relative overflow-hidden rounded-xl2 border-2 border-dashed p-6 sm:p-8 transition', dragging ? 'border-accent bg-accent/5' : 'border-line bg-surface')}
      >
        <div className="topo topo-layer" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><UploadCloud className="h-6 w-6" /></div>
            <div>
              <div className="font-extrabold">Glissez vos fichiers GPX ici</div>
              <div className="text-sm text-muted">Exports Garmin, Suunto, Coros, Strava… Distance, D+, durée et FC sont lus directement dans le fichier.</div>
            </div>
          </div>
          <Button onClick={() => inputRef.current?.click()}><FileUp className="h-4 w-4" /> Importer</Button>
          <input ref={inputRef} type="file" accept=".gpx,application/gpx+xml" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        </div>
        {errors.length > 0 && (
          <ul className="relative mt-4 space-y-1 text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>
            {errors.map((er) => <li key={er}>{er}</li>)}
          </ul>
        )}
      </div>

      {activities.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="font-display text-xl font-extrabold">Aucune activité pour l'instant</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Importez une sortie : si elle correspond à une séance prévue le même jour, elle y est rattachée automatiquement et la séance est validée.
          </p>
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-3 gap-4 p-5">
            <Stat label="Activités" value={activities.length} />
            <Stat label="Distance" value={formatKm(totals.km, 0)} unit="km" />
            <Stat label="Dénivelé" value={totals.dplus} unit="m" accent />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="space-y-2">
              {activities.map((a) => {
                const linked = sessionById[linkOf(a.id)];
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cx('w-full rounded-xl border p-4 text-left transition', selected?.id === a.id ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-muted/50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-extrabold">{a.name}</span>
                      <span className="shrink-0 text-[11px] font-bold text-muted">{formatShortDate(a.date)}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs font-bold text-muted tabular">
                      <span>{formatKm(a.distanceKm)} km</span>
                      <span className="text-accent">+{a.dplus} m</span>
                      {a.movingMin && <span>{formatDuration(a.movingMin)}</span>}
                    </div>
                    {linked && <div className="mt-2"><TypeChip type={linked.type} info={SESSION_TYPES[linked.type]} /></div>}
                  </button>
                );
              })}
            </div>

            {selected && (
              <Card key={selected.id} className="rise min-w-0 space-y-6 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{formatLongDate(selected.date)}</div>
                    <h3 className="font-display truncate text-2xl font-black">{selected.name}</h3>
                    <div className="text-xs text-muted">{selected.fileName}</div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => { onRemoveActivity(selected.id); setSelectedId(null); }}>
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Stat label="Distance" value={formatKm(selected.distanceKm, 2)} unit="km" />
                  <Stat label="D+ / D−" value={`${selected.dplus}`} unit={`/ ${selected.dminus} m`} accent />
                  <Stat label="Temps en mvt" value={formatDuration(selected.movingMin)} />
                  <Stat label="Allure moy." value={selected.movingMin ? pace(selected.distanceKm / (selected.movingMin / 60)) : '–'} unit="/km" />
                  {selected.avgHr && <Stat label="FC moy. / max" value={selected.avgHr} unit={`/ ${selected.maxHr} bpm`} />}
                  {selected.hasElevation && <Stat label="Altitude" value={`${selected.minEle}–${selected.maxEle}`} unit="m" />}
                </div>

                <div className="rounded-xl border border-line bg-sunken/30 p-3">
                  <div className="mb-1 flex gap-4 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />Altitude (m)</span>
                    {selected.avgHr && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--type-long)' }} />FC (bpm)</span>}
                  </div>
                  <ElevationChart profile={selected.profile} />
                </div>

                <div className="space-y-3 border-t border-line pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Conformité au programme</div>
                    <select
                      className={cx(inputClass, 'h-10 w-auto max-w-full text-xs')}
                      value={linkedSessionId || ''}
                      onChange={(e) => onLink(selected, e.target.value ? sessionById[e.target.value] : null, linkedSessionId)}
                      aria-label="Séance associée"
                    >
                      <option value="">Aucune séance associée</option>
                      {candidates.map((s) => (
                        <option key={s.id} value={s.id}>
                          S{s.week} · {formatShortDate(s.date)} · {s.title} ({formatKm(s.km)} km)
                        </option>
                      ))}
                    </select>
                  </div>

                  {comparison ? (
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                      <ScoreRing score={comparison.score} />
                      <div>
                        <div className="font-extrabold">{comparison.verdict}</div>
                        <div className="text-xs text-muted">Comparée à : {linkedSession.title} · {formatKm(linkedSession.km)} km · {linkedSession.dplus} m D+ · {formatDuration(linkedSession.durationMin)}</div>
                        <ul className="mt-3 space-y-2">
                          {comparison.notes.map((n, i) => (
                            <li key={i} className="flex gap-2 text-sm leading-relaxed">
                              {n.tone === 'good' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--type-ef)' }} />
                                : n.tone === 'warn' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--type-cotes)' }} />
                                  : <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                              <span>{n.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Associez cette activité à une séance pour obtenir un score de conformité et la valider dans le programme.</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? 'var(--type-ef)' : score >= 65 ? 'var(--type-cotes)' : 'var(--type-vma)';
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 76 76" className="h-20 w-20 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(var(--sunken))" strokeWidth="8" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-xl font-black tabular">{score}</div>
    </div>
  );
}
