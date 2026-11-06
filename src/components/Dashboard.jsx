import React, { useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Flag, Loader2, Mountain, MoveRight, Route, Send, Sparkles, Watch } from 'lucide-react';
import { Button, Card, ProgressBar, SectionTitle, Segmented, Stat, TypeChip, cx } from './ui';
import { ADJUSTMENTS, PHASES, SESSION_TYPES } from '../lib/plan';
import { fingerprint, sendableSessions } from '../lib/intervals';
import { workoutToIntervalsText } from '../lib/workout';
import { DAYS_SHORT, daysBetween, formatDuration, formatKm, formatLongDate, formatShortDate, toDate, toISODate } from '../lib/format';

export default function Dashboard({ profile, plan, viewWeek, setViewWeek, todayWeek, completions, toggleCompletion, adjustments, setAdjustment, activitiesById, intervals, syncInfo, onSendWeek, onConnectWatch }) {
  const week = plan[viewWeek - 1];
  const daysLeft = daysBetween(new Date(), profile.raceDate);
  const today = toISODate(new Date());

  const done = week.sessions.filter((s) => completions[s.id]?.done);
  const actual = done.reduce(
    (acc, s) => {
      const act = activitiesById[completions[s.id]?.activityId];
      acc.km += act ? act.distanceKm : s.km;
      acc.dplus += act ? act.dplus : s.dplus;
      return acc;
    },
    { km: 0, dplus: 0 },
  );
  const completion = week.sessions.length ? Math.round((done.length / week.sessions.length) * 100) : 0;
  const maxKm = Math.max(...plan.map((w) => w.targetKm), 1);
  const lastDay = toISODate(new Date(toDate(week.startDate).getTime() + 6 * 864e5));

  return (
    <div className="space-y-8">
      {/* En-tête objectif */}
      <Card className="relative overflow-hidden">
        <div className="topo topo-layer" />
        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              <Flag className="h-3.5 w-3.5 text-accent" />
              {profile.name ? `Objectif de ${profile.name}` : 'Objectif'} · {formatLongDate(profile.raceDate)}
            </div>
            <h1 className="font-display mt-2 text-4xl sm:text-5xl font-black leading-[0.95]">{profile.raceName}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
              <span className="inline-flex items-center gap-1.5"><Route className="h-4 w-4 text-muted" />{profile.distance} km</span>
              <span className="inline-flex items-center gap-1.5 text-accent"><Mountain className="h-4 w-4" />{profile.elevation} m D+</span>
              <span className="text-muted">{profile.level} · VMA {String(profile.vma).replace('.', ',')} km/h</span>
            </div>
          </div>
          <div className="flex items-end gap-6">
            <div className="md:text-right">
              <div className="font-display text-6xl sm:text-7xl font-black leading-none tabular text-accent">
                {daysLeft > 0 ? daysLeft : daysLeft === 0 ? 'J' : '✓'}
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {daysLeft > 0 ? (daysLeft > 1 ? 'jours restants' : 'jour restant') : daysLeft === 0 ? "C'est aujourd'hui !" : 'Course terminée'}
              </div>
            </div>
          </div>
        </div>

        {/* Vue d'ensemble de la saison */}
        <div className="relative border-t border-line px-6 pb-5 pt-4 sm:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Plan complet · {plan.length} semaines</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted">
              {Object.values(PHASES).map((ph) => (
                <span key={ph.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: ph.color }} />{ph.label}</span>
              ))}
            </div>
          </div>
          <div className="flex h-20 items-end gap-1" role="tablist" aria-label="Semaines du programme">
            {plan.map((w) => {
              const selected = w.number === viewWeek;
              return (
                <button
                  key={w.number}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setViewWeek(w.number)}
                  title={`Semaine ${w.number} · ${PHASES[w.phase].label} · ${w.targetKm} km · ${w.targetDPlus} m D+`}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                >
                  <span
                    className={cx('block w-full rounded-t-[3px] transition-all group-hover:opacity-100', selected ? 'opacity-100' : 'opacity-70')}
                    style={{
                      height: `${Math.max(10, (w.targetKm / maxKm) * 100)}%`,
                      background: w.isRaceWeek ? 'var(--accent)' : PHASES[w.phase].color,
                      opacity: w.isRecovery && !selected ? 0.4 : undefined,
                      outline: selected ? '2px solid rgb(var(--ink))' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                  {w.number === todayWeek && <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ink" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-bold text-muted tabular">
            <span>S1</span>
            <span>• Aujourd'hui : S{todayWeek}</span>
            <span>S{plan.length}</span>
          </div>
        </div>
      </Card>

      {/* Semaine sélectionnée */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow={`${formatShortDate(week.startDate)} – ${formatShortDate(lastDay)}${viewWeek === todayWeek ? ' · semaine en cours' : ''}`}
            title={
              <span className="flex flex-wrap items-center gap-3">
                Semaine {week.number}
                <span className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ color: week.phaseInfo.color, background: `color-mix(in srgb, ${week.phaseInfo.color} 14%, transparent)` }}>
                  {week.phaseInfo.label}
                </span>
                {week.isRecovery && <span className="rounded-md bg-sunken px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted">Assimilation</span>}
                {week.isRaceWeek && <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">Semaine de course</span>}
              </span>
            }
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={viewWeek <= 1} onClick={() => setViewWeek(viewWeek - 1)} aria-label="Semaine précédente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {viewWeek !== todayWeek && (
              <Button variant="subtle" size="sm" onClick={() => setViewWeek(todayWeek)}>Aujourd'hui</Button>
            )}
            <Button variant="ghost" size="sm" disabled={viewWeek >= plan.length} onClick={() => setViewWeek(viewWeek + 1)} aria-label="Semaine suivante">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <Stat label="Volume" value={formatKm(actual.km, 0)} unit={`/ ${week.targetKm} km`} />
          <Stat label="Dénivelé" value={Math.round(actual.dplus)} unit={`/ ${week.targetDPlus} m`} accent />
          <Stat label="Temps estimé" value={formatDuration(week.targetMinutes)} />
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Réalisé</span>
              <span className="font-display text-2xl font-extrabold tabular">{completion}<span className="text-sm text-muted"> %</span></span>
            </div>
            <ProgressBar value={completion} className="mt-2" />
            <div className="mt-1.5 text-xs text-muted">{done.length} / {week.sessions.length} séances</div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {week.sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isToday={s.date === today}
                isPast={s.date < today}
                completion={completions[s.id]}
                activity={activitiesById[completions[s.id]?.activityId]}
                onToggle={() => toggleCompletion(s.id)}
                vma={profile.vma}
              />
            ))}
          </div>

          <aside className="space-y-4">
            <WatchSync
              key={week.number}
              week={week}
              profile={profile}
              intervals={intervals}
              sync={syncInfo?.[week.number]}
              onSend={onSendWeek}
              onConnect={onConnectWatch}
            />

            <Card className="p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                <Sparkles className="h-3.5 w-3.5" style={{ color: week.phaseInfo.color }} /> Objectif de la phase
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed">{week.phaseInfo.goal}</p>
              {week.isRecovery && <p className="mt-2 text-sm text-muted">Semaine allégée pour assimiler la charge des semaines précédentes.</p>}
            </Card>

            <Card className="p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Ajustement de la charge</div>
              <p className="mt-1 text-sm text-muted">Comment vous sentez-vous cette semaine ?</p>
              <Segmented
                className="mt-3"
                options={Object.entries(ADJUSTMENTS).map(([value, a]) => ({ value, label: a.label }))}
                value={adjustments[week.number] || 'normal'}
                onChange={(v) => setAdjustment(week.number, v)}
              />
              <p className="mt-2 text-xs font-semibold text-muted">{ADJUSTMENTS[adjustments[week.number] || 'normal'].hint}</p>
            </Card>

            <Card className="p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Répartition</div>
              <div className="mt-3 space-y-2.5">
                {week.sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-xs font-bold">
                    <span className="w-8 text-muted">{DAYS_SHORT[s.dayIndex]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.km / Math.max(...week.sessions.map((x) => x.km))) * 100)}%`, background: SESSION_TYPES[s.type].color }} />
                    </div>
                    <span className="w-14 text-right tabular">{formatKm(s.km)} km</span>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}

function SessionCard({ session, isToday, isPast, completion, activity, onToggle, vma }) {
  const [open, setOpen] = useState(isToday);
  const info = SESSION_TYPES[session.type];
  const isDone = !!completion?.done;
  const d = toDate(session.date);

  return (
    <Card className={cx('relative overflow-hidden transition', isToday && 'ring-2 ring-accent/60', isDone && 'bg-sunken/40')}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: info.color }} />
      <div className="flex gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="w-11 shrink-0 text-center">
          <div className="text-[11px] font-bold uppercase text-muted">{DAYS_SHORT[session.dayIndex]}</div>
          <div className={cx('font-display text-2xl font-black leading-tight tabular', isPast && !isDone && 'text-muted')}>{d.getDate()}</div>
          {isToday && <div className="text-[9px] font-black uppercase tracking-wider text-accent">Auj.</div>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TypeChip type={session.type} info={info} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{session.zone}</span>
          </div>
          <h3 className={cx('mt-1.5 text-base font-extrabold leading-snug', isDone && 'line-through decoration-2 decoration-muted/50')}>{session.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted tabular">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(session.durationMin)}</span>
            <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5" />{formatKm(session.km)} km</span>
            {session.dplus > 0 && <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}><Mountain className="h-3.5 w-3.5" />{session.dplus} m</span>}
          </div>

          {activity && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-bold">
              <span className="text-muted">GPX</span>
              <span className="tabular">{formatKm(activity.distanceKm)} km · {activity.dplus} m</span>
              {completion?.score != null && <><MoveRight className="h-3 w-3 text-muted" /><span style={{ color: 'var(--type-ef)' }}>{completion.score} % conforme</span></>}
            </div>
          )}

          {open && (
            <ol className="rise mt-4 space-y-2 border-t border-line pt-3">
              {session.steps.map((st, i) => (
                <li key={i} className="grid grid-cols-[7rem_1fr] gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted pt-0.5">{st.label}</span>
                  <span className="leading-relaxed">{st.detail}</span>
                </li>
              ))}
              {session.workout?.length > 0 && <WatchText text={workoutToIntervalsText(session.workout, Number(vma) || 14)} />}
            </ol>
          )}

          <button onClick={() => setOpen(!open)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-ink" aria-expanded={open}>
            {open ? 'Masquer le détail' : 'Voir le détail'}
            <ChevronDown className={cx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
          </button>
        </div>

        {session.type !== 'COURSE' || isPast || isToday ? (
          <button
            onClick={onToggle}
            aria-pressed={isDone}
            aria-label={isDone ? 'Marquer comme non réalisée' : 'Marquer comme réalisée'}
            className={cx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition',
              isDone ? 'border-transparent text-white' : 'border-line text-transparent hover:border-muted hover:text-muted',
            )}
            style={isDone ? { background: 'var(--type-ef)' } : undefined}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function WatchText({ text }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setShow(true); }
  };
  return (
    <li className="pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShow(!show)} className="inline-flex items-center gap-1.5 rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-bold text-muted hover:text-ink">
          <Watch className="h-3.5 w-3.5" /> {show ? 'Masquer la version montre' : 'Version montre'}
        </button>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-bold text-muted hover:text-ink">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copié' : 'Copier (format Intervals.icu)'}
        </button>
      </div>
      {show && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-sunken p-3 font-mono text-[11px] leading-relaxed">{text}</pre>}
    </li>
  );
}

function WatchSync({ week, profile, intervals, sync, onSend, onConnect }) {
  const [state, setState] = useState({ status: 'idle' });
  const count = sendableSessions(week.sessions).length;
  const changed = sync && sync.fp !== fingerprint(profile, week.sessions);

  const send = async () => {
    setState({ status: 'loading', message: 'Connexion à Intervals.icu…' });
    try {
      const r = await onSend(week, (message) => setState({ status: 'loading', message }));
      setState({ status: 'success', message: `${r.sent} séance${r.sent > 1 ? 's' : ''} envoyée${r.sent > 1 ? 's' : ''}. Synchronisez votre montre pour les récupérer.` });
    } catch (e) {
      setState({ status: 'error', message: e.message });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        <Watch className="h-3.5 w-3.5 text-accent" /> Ma montre
      </div>
      {!intervals ? (
        <>
          <p className="mt-2 text-sm text-muted">Envoyez vos séances sur votre Suunto, Garmin ou Coros grâce à Intervals.icu.</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={onConnect}>Connecter ma montre</Button>
        </>
      ) : count === 0 ? (
        <p className="mt-2 text-sm text-muted">Aucune séance à venir à envoyer pour cette semaine.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            {sync && !changed
              ? `Semaine envoyée le ${new Date(sync.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
              : changed
                ? 'La semaine a changé depuis le dernier envoi (ajustement ou profil). Renvoyez-la pour mettre la montre à jour.'
                : `${count} séance${count > 1 ? 's' : ''} à venir prête${count > 1 ? 's' : ''} à envoyer.`}
          </p>
          <Button size="sm" className="mt-3 w-full" variant={sync && !changed ? 'ghost' : 'primary'} onClick={send} disabled={state.status === 'loading'}>
            {state.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sync ? 'Renvoyer la semaine' : 'Envoyer la semaine'}
          </Button>
          {state.status !== 'idle' && (
            <p className={cx('mt-2 text-xs font-semibold', state.status === 'loading' && 'text-muted')} style={state.status === 'error' ? { color: 'var(--type-vma)' } : state.status === 'success' ? { color: 'var(--type-ef)' } : undefined}>
              {state.message}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
