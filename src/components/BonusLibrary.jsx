import React, { useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Dumbbell, Info, Play, Sparkles, ThumbsUp, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Card, cx } from './ui';
import ExerciseFigure from './ExerciseFigure';
import StrengthPlayer from './StrengthPlayer';
import { BONUS_SESSIONS, CATEGORIES, INTENSITY, bonusById, bonusContext, bonusInWeek, bonusItems, bonusMinutes, rankBonus, toPlayerSession } from '../lib/bonus';
import { EXERCISES } from '../lib/exercises';
import { DAYS, formatDuration, formatShortDate, toISODate, weekdayIndex } from '../lib/format';

const TIERS = {
  top: { label: 'Recommandée', color: 'var(--type-ef)', icon: ThumbsUp },
  ok: { label: 'Possible', color: 'rgb(var(--muted))', icon: Info },
  low: { label: 'Peu utile maintenant', color: 'rgb(var(--muted))', icon: Info },
  avoid: { label: 'Déconseillée', color: 'var(--type-vma)', icon: AlertTriangle },
};

function Dots({ n }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i <= n ? 'rgb(var(--ink))' : 'rgb(var(--line))' }} />)}
    </span>
  );
}

function TierBadge({ tier }) {
  const t = TIERS[tier];
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ color: t.color, background: `color-mix(in srgb, ${t.color} 12%, transparent)` }}>
      <t.icon className="h-3 w-3" /> {t.label}
    </span>
  );
}

function BonusCard({ b, advice, level, doneCount, onPlay, onDone }) {
  const cat = CATEGORIES[b.cat];
  const items = bonusItems(b, level);
  const dim = advice.tier === 'avoid' || advice.tier === 'low';
  return (
    <Card className={cx('relative flex flex-col overflow-hidden', dim && 'opacity-75')}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: cat.color }} />
      <div className="flex flex-1 flex-col p-4 pl-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ color: cat.color, background: `color-mix(in srgb, ${cat.color} 13%, transparent)` }}>{cat.label}</span>
          <TierBadge tier={advice.tier} />
          {doneCount > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-muted"><Check className="h-3 w-3" /> Faite</span>}
        </div>
        <h3 className="mt-2 text-base font-extrabold leading-snug">{b.title}</h3>
        <p className="mt-0.5 text-sm leading-snug text-muted">{b.tagline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(bonusMinutes(b, level))}</span>
          <span className="inline-flex items-center gap-1.5"><Dots n={INTENSITY[b.intensity].dots} />{INTENSITY[b.intensity].label}</span>
          <span>{items.length} exercices</span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`Exercices : ${items.map((i) => EXERCISES[i.id].name).join(', ')}`}>
          {items.slice(0, 4).map((it) => (
            <div key={it.id} className="min-w-0 flex-1" title={`${EXERCISES[it.id].name} · ${it.dose}`}>
              <ExerciseFigure id={it.id} fluid paused className="figure-stage w-full rounded-lg" />
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold leading-snug" style={{ color: advice.tier === 'avoid' ? 'var(--type-vma)' : advice.tier === 'top' ? 'var(--type-ef)' : 'rgb(var(--muted))' }}>
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {advice.why}
        </p>
        {advice.today && (
          <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold leading-snug" style={{ color: advice.today.ok ? 'rgb(var(--ink))' : 'var(--type-cotes)' }}>
            <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {advice.today.text}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button size="sm" className="flex-1" style={{ background: cat.color, color: 'rgb(var(--bg))', boxShadow: 'none' }} onClick={onPlay}>
            <Play className="h-4 w-4" /> Lancer
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone} title="Je l’ai faite sans la séance guidée"><Check className="h-4 w-4" /> Déjà faite</Button>
        </div>
      </div>
    </Card>
  );
}

export default function BonusLibrary({ profile, plan, week, todayWeek, setViewWeek, adjustment, bonusLog, onDone, onRemove }) {
  const [filter, setFilter] = useState('reco');
  const [playing, setPlaying] = useState(null);
  const allSessions = useMemo(() => plan.flatMap((w) => w.sessions), [plan]);
  const ctx = useMemo(() => bonusContext({ week, profile, adjustment, log: bonusLog, allSessions }), [week, profile, adjustment, bonusLog, allSessions]);
  const ranked = useMemo(() => rankBonus(ctx), [ctx]);
  const shown = ranked.filter(({ b, advice }) => (filter === 'reco' ? advice.tier === 'top' || advice.tier === 'ok' : filter === 'all' ? true : b.cat === filter));
  const done = bonusInWeek(bonusLog, week);
  const doneCount = (id) => done.filter((e) => e.bonusId === id).length;
  const level = profile.level;
  const today = toISODate(new Date());

  let todayText = null;
  if (ctx.today) {
    const day = DAYS[weekdayIndex(today)].toLowerCase();
    if (ctx.today.hard) todayText = `Aujourd’hui (${day}), vous avez déjà une séance clé : si vous avez du temps, choisissez une séance légère.`;
    else if (ctx.today.tomorrowHard) todayText = `Aujourd’hui (${day}) : séance clé demain. Évitez les sauts et l’excentrique, le reste est possible.`;
    else todayText = `Aujourd’hui (${day}) : pas de séance clé ni aujourd’hui ni demain, c’est le bon moment pour une séance bonus.`;
  }

  const filters = [['reco', 'Pour cette semaine'], ['all', 'Toutes'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label])];

  return (
    <div className="rise space-y-5">
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="topo topo-layer" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted"><Dumbbell className="h-3.5 w-3.5" style={{ color: 'var(--type-renfo)' }} /> Séances bonus</div>
            <h2 className="font-display mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">Du temps libre ? Piochez une séance</h2>
            <p className="mt-1 text-sm text-muted">
              Facultatives, en plus du programme. Les recommandations suivent votre semaine, votre course et votre forme. {profile.level === 'Débutant' ? 'Une par semaine suffit.' : 'Une ou deux par semaine au maximum.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" disabled={week.number <= 1} onClick={() => setViewWeek(week.number - 1)} aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="min-w-[7.5rem] text-center">
              <div className="text-sm font-extrabold">Semaine {week.number}</div>
              <div className="text-[11px] font-bold" style={{ color: week.phaseInfo.color }}>{week.phaseInfo.label}{week.isRecovery ? ' · assimilation' : ''}{week.isRaceWeek ? ' · course' : ''}</div>
            </div>
            <Button variant="ghost" size="sm" disabled={week.number >= plan.length} onClick={() => setViewWeek(week.number + 1)} aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {week.number !== todayWeek && <div className="relative mt-3"><Button variant="subtle" size="sm" onClick={() => setViewWeek(todayWeek)}>Revenir à cette semaine</Button></div>}
        {todayText && (
          <p className="relative mt-4 flex items-start gap-2 rounded-xl bg-sunken/70 px-3.5 py-2.5 text-sm font-semibold">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {todayText}
          </p>
        )}
        {done.length > 0 && (
          <div className="relative mt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Faites cette semaine · {done.length}</div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {done.map((e) => (
                <li key={e.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-xs font-bold">
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--type-ef)' }} />
                  {bonusById[e.bonusId]?.title || 'Séance bonus'} · {formatShortDate(e.date)}
                  <button onClick={() => onRemove(e.id)} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Retirer"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrer les séances">
        {filters.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', filter === k ? 'bg-ink text-bg' : 'bg-sunken text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>
      {filter !== 'reco' && filter !== 'all' && <p className="-mt-2 text-sm text-muted">{CATEGORIES[filter].hint}</p>}

      {shown.length === 0 ? (
        <Card className="p-5 text-sm text-muted">Aucune séance recommandée cette semaine : c’est le moment de récupérer. Toutes les séances restent accessibles avec le filtre « Toutes ».</Card>
      ) : (
        (filter === 'reco'
          ? [['Recommandées cette semaine', shown.filter(({ advice }) => advice.tier === 'top')], ['Possibles aussi', shown.filter(({ advice }) => advice.tier === 'ok')]]
          : [[null, shown]]
        ).filter(([, list]) => list.length).map(([heading, list]) => (
          <section key={heading || 'all'} className="space-y-3">
            {heading && <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{heading} · {list.length}</h3>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ b, advice }) => (
                <BonusCard key={b.id} b={b} advice={advice} level={level} doneCount={doneCount(b.id)} onPlay={() => setPlaying(b)} onDone={() => onDone(b.id, bonusMinutes(b, level))} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs leading-relaxed text-muted">
        Les séances bonus ne comptent pas dans le score de suivi du plan. En cas de douleur articulaire pendant les sauts ou l’excentrique, arrêtez-vous et revenez à une séance plus légère.
      </p>

      {playing && (
        <StrengthPlayer session={toPlayerSession(playing, level)} onComplete={() => onDone(playing.id, bonusMinutes(playing, level))} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}

/** Encart dans la vue Entraînement : les séances bonus faites et les meilleures suggestions de la semaine. */
export function BonusStrip({ profile, plan, week, adjustment, bonusLog, onOpen }) {
  const allSessions = useMemo(() => plan.flatMap((w) => w.sessions), [plan]);
  const ctx = useMemo(() => bonusContext({ week, profile, adjustment, log: bonusLog, allSessions }), [week, profile, adjustment, bonusLog, allSessions]);
  const ranked = useMemo(() => rankBonus(ctx), [ctx]);
  // D'abord les séances recommandées et faisables aujourd'hui, puis les possibles faisables aujourd'hui
  const good = ranked.filter(({ advice }) => (advice.tier === 'top' || advice.tier === 'ok') && advice.today?.ok !== false);
  const fallback = (good.length ? good : ranked.filter(({ advice }) => advice.tier === 'top')).slice(0, 2);
  const done = bonusInWeek(bonusLog, week);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--type-renfo) 14%, transparent)', color: 'var(--type-renfo)' }}><Dumbbell className="h-4 w-4" /></span>
          <div>
            <div className="text-sm font-extrabold">Séances bonus</div>
            <div className="text-xs text-muted">{done.length ? `${done.length} faite${done.length > 1 ? 's' : ''} cette semaine` : 'Facultatives, quand vous avez du temps'}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpen}>Voir la bibliothèque <ChevronRight className="h-4 w-4" /></Button>
      </div>
      {fallback.length > 0 && (
        <ul className="divide-y divide-line">
          {fallback.map(({ b, advice }) => (
            <li key={b.id}>
              <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sunken/50 sm:px-5">
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: CATEGORIES[b.cat].color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-extrabold">{b.title}</span>
                    <span className="text-xs font-bold text-muted">{CATEGORIES[b.cat].label} · {formatDuration(bonusMinutes(b, profile.level))}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{advice.today && !advice.today.ok ? advice.today.text : advice.why}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { BONUS_SESSIONS };
