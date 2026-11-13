import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Map as MapIcon, Settings, UserRound } from 'lucide-react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ActivitiesTab from './components/ActivitiesTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import GeneratingScreen from './components/GeneratingScreen';
import { Logo, cx } from './components/ui';
import { currentWeekNumber, generatePlan } from './lib/plan';
import { compareToSession } from './lib/gpx';
import { fetchActivities, fingerprint, pushSessions } from './lib/intervals';
import { toISODate } from './lib/format';
import { defaultProfile, migrateLegacyProfile, usePersistentState } from './lib/storage';

const TABS = [
  { id: 'dashboard', label: 'Mon Programme', short: 'Programme', icon: CalendarRange },
  { id: 'sessions', label: 'Mes Séances & GPX', short: 'Séances & GPX', icon: MapIcon },
  { id: 'profile', label: 'Profil', icon: UserRound },
  { id: 'settings', label: 'Réglages', icon: Settings, iconOnly: true },
];

function useTheme() {
  const [theme, setTheme] = usePersistentState('theme', 'system');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const fn = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1210' : '#f3efe6');
  }, [dark]);
  return { theme, setTheme, dark };
}

export default function App() {
  const { theme, setTheme, dark } = useTheme();
  const [profile, setProfile] = usePersistentState('profile', migrateLegacyProfile);
  const [tab, setTab] = usePersistentState('tab', 'dashboard');
  const [completions, setCompletions] = usePersistentState('completions', {});
  const [adjustments, setAdjustments] = usePersistentState('adjustments', {});
  const [activities, setActivities] = usePersistentState('activities', []);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [generating, setGenerating] = useState(null); // { profile, kind: 'create' | 'update' }
  const [intervals, setIntervals] = usePersistentState('intervals', null); // { apiKey, athleteName }
  const [intervalsSync, setIntervalsSync] = usePersistentState('intervalsSync', {}); // { [semaine]: { at, fp, count } }
  const [activitySync, setActivitySync] = usePersistentState('activitySync', null); // { at, added }
  const [icuIgnored, setIcuIgnored] = usePersistentState('icuIgnored', []); // sorties Intervals.icu supprimées par l'utilisateur
  const [syncState, setSyncState] = useState({ status: 'idle' });

  const plan = useMemo(() => (profile ? generatePlan(profile, adjustments) : []), [profile, adjustments]);
  const todayWeek = profile ? currentWeekNumber(profile) : 1;
  const [viewWeek, setViewWeek] = useState(todayWeek);
  useEffect(() => { if (viewWeek > plan.length && plan.length) setViewWeek(plan.length); }, [plan.length, viewWeek]);

  const activitiesById = useMemo(() => Object.fromEntries(activities.map((a) => [a.id, a])), [activities]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  /* ------------------------------ actions ------------------------------ */

  const startProgram = (p) => setGenerating({ profile: p, kind: 'create' });
  const updateProfile = (p) => setGenerating({ profile: p, kind: 'update' });

  const finishGenerating = () => {
    const { profile: p, kind } = generating;
    setGenerating(null);
    if (kind === 'update') { setProfile(p); return; }
    applyProgram(p);
  };

  const sendWeek = async (week, onProgress) => {
    const result = await pushSessions(intervals.apiKey, profile, week.sessions, onProgress);
    setIntervalsSync((prev) => ({ ...prev, [week.number]: { at: Date.now(), fp: fingerprint(profile, week.sessions), count: result.sent } }));
    return result;
  };

  const sendWholePlan = async (onProgress) => {
    let total = 0;
    const upcoming = plan.filter((w) => w.number >= todayWeek);
    for (const w of upcoming) {
      onProgress?.(`Semaine ${w.number} / ${plan.length}…`);
      const r = await sendWeek(w);
      total += r.sent;
    }
    return { sent: total };
  };

  const applyProgram = (p) => {
    const restarted = profile && p.planStart !== profile.planStart;
    setProfile(p);
    if (restarted) { setCompletions({}); setAdjustments({}); setIntervalsSync({}); }
    setViewWeek(currentWeekNumber(p));
    setWizardOpen(false);
    setTab('dashboard');
  };

  const toggleCompletion = (id) => {
    setCompletions((prev) => {
      const next = { ...prev };
      if (next[id]?.done) delete next[id];
      else next[id] = { done: true, at: Date.now() };
      return next;
    });
  };

  /** Même sortie déjà présente (import GPX et Intervals.icu de la même course, par exemple). */
  const isDuplicate = (a, list) => list.some((b) => b.id === a.id
    || (b.startTime && a.startTime && b.startTime === a.startTime && b.distanceKm === a.distanceKm)
    || (b.date === a.date && Math.abs(b.distanceKm - a.distanceKm) <= Math.max(0.3, a.distanceKm * 0.03)
      && (!a.startTime || !b.startTime || Math.abs(a.startTime - b.startTime) < 3 * 3600e3)));

  const addActivities = (parsed, sessions) => {
    const fresh = [];
    parsed.forEach((a) => { if (!isDuplicate(a, [...activities, ...fresh])) fresh.push(a); });
    if (!fresh.length) return [];
    setActivities((prev) => [...fresh, ...prev].sort((a, b) => (b.startTime || 0) - (a.startTime || 0)));
    setCompletions((prev) => {
      const next = { ...prev };
      fresh.forEach((a) => {
        const sameDay = sessions
          .filter((s) => s.date === a.date && !next[s.id]?.activityId)
          .sort((x, y) => Math.abs(x.km - a.distanceKm) - Math.abs(y.km - a.distanceKm));
        const s = sameDay[0];
        if (s) next[s.id] = { done: true, activityId: a.id, score: compareToSession(a, s, profile)?.score, at: Date.now() };
      });
      return next;
    });
    return fresh;
  };

  const allSessions = useMemo(() => plan.flatMap((w) => w.sessions), [plan]);

  const syncActivities = async () => {
    if (!intervals || !profile || syncState.status === 'loading') return;
    setSyncState({ status: 'loading', message: 'Connexion à Intervals.icu…' });
    try {
      const skipIds = new Set([...icuIgnored.map(String), ...activities.filter((a) => a.icuId != null).map((a) => String(a.icuId))]);
      const { activities: fetched, ignoredStrava } = await fetchActivities(intervals.apiKey, profile.planStart, toISODate(new Date()), {
        skipIds,
        onProgress: (message) => setSyncState({ status: 'loading', message }),
      });
      const addedList = addActivities(fetched, allSessions);
      const added = addedList.length;
      // Sorties déjà présentes (ex. importées en GPX) : on ne les retélécharge plus
      const addedIds = new Set(addedList.map((a) => a.id));
      const dupes = fetched.filter((a) => !addedIds.has(a.id)).map((a) => String(a.icuId));
      if (dupes.length) setIcuIgnored((prev) => [...new Set([...prev, ...dupes])]);
      setActivitySync({ at: Date.now(), added });
      setSyncState({
        status: 'success',
        message: (added ? `${added} nouvelle${added > 1 ? 's' : ''} sortie${added > 1 ? 's' : ''} récupérée${added > 1 ? 's' : ''}.` : 'Tout est à jour.')
          + (ignoredStrava ? ` ${ignoredStrava} sortie(s) venant de Strava ne sont pas accessibles par l'API d'Intervals.icu.` : ''),
      });
    } catch (e) {
      setSyncState({ status: 'error', message: e.message });
    }
  };

  // Synchronisation automatique à l'ouverture (au plus toutes les 15 minutes)
  useEffect(() => {
    if (intervals && profile && !generating && (!activitySync || Date.now() - activitySync.at > 15 * 60e3)) syncActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervals?.apiKey, profile?.planStart]);

  const linkActivity = (activity, session, previousId) => {
    setCompletions((prev) => {
      const next = { ...prev };
      if (previousId) delete next[previousId];
      if (session) next[session.id] = { done: true, activityId: activity.id, score: compareToSession(activity, session, profile)?.score, at: Date.now() };
      return next;
    });
  };

  const removeActivity = (id) => {
    const act = activities.find((a) => a.id === id);
    if (act?.icuId != null) setIcuIgnored((prev) => [...new Set([...prev, String(act.icuId)])]);
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setCompletions((prev) => Object.fromEntries(Object.entries(prev).filter(([, c]) => c.activityId !== id)));
  };

  /* ------------------------------- rendu ------------------------------- */

  if (generating) {
    return (
      <GeneratingScreen
        profile={generating.profile}
        title={generating.kind === 'update' ? 'Mise à jour du programme' : 'Création de votre programme'}
        onDone={finishGenerating}
      />
    );
  }

  if (!profile || wizardOpen) {
    return (
      <Onboarding
        initial={profile || defaultProfile()}
        onComplete={startProgram}
        onSkip={() => startProgram({ ...defaultProfile(), name: 'Coureur', createdAt: toISODate(new Date()) })}
        canCancel={!!profile}
        onCancel={() => setWizardOpen(false)}
        dark={dark}
        onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
      />
    );
  }

  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === tab));

  return (
    <div className="min-h-screen pb-32 md:pb-12">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl pl-3 pr-3 md:h-16 md:pl-4 md:pr-2.5">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">Beta</span>
          </div>
          <nav className="hidden items-center gap-1 rounded-xl bg-ink/[0.06] p-1 md:flex" aria-label="Navigation principale">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                aria-label={t.label}
                title={t.label}
                className={cx(
                  'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-bold transition-all duration-200',
                  tab === t.id ? 'glass-pill text-ink' : 'text-muted hover:bg-ink/[0.05] hover:text-ink',
                )}
              >
                <t.icon className={cx('h-4 w-4', tab === t.id && 'text-accent')} />
                {!t.iconOnly && t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main key={tab} className="rise mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {tab === 'dashboard' && (
          <Dashboard
            profile={profile}
            plan={plan}
            viewWeek={Math.min(viewWeek, plan.length)}
            setViewWeek={setViewWeek}
            todayWeek={todayWeek}
            completions={completions}
            toggleCompletion={toggleCompletion}
            adjustments={adjustments}
            setAdjustment={(w, v) => setAdjustments((prev) => ({ ...prev, [w]: v }))}
            activitiesById={activitiesById}
            intervals={intervals}
            syncInfo={intervalsSync}
            onSendWeek={sendWeek}
            activities={activities}
            onConnectWatch={() => setTab('settings')}
          />
        )}
        {tab === 'sessions' && (
          <ActivitiesTab
            profile={profile}
            plan={plan}
            activities={activities}
            onAddActivities={addActivities}
            intervals={intervals}
            syncState={syncState}
            lastSync={activitySync}
            onSync={syncActivities}
            onConnectWatch={() => setTab('settings')}
            onRemoveActivity={removeActivity}
            completions={completions}
            onLink={linkActivity}
          />
        )}
        {tab === 'profile' && <ProfileTab profile={profile} onSave={updateProfile} onRestartWizard={() => setWizardOpen(true)} />}
        {tab === 'settings' && (
          <SettingsTab
            theme={theme}
            setTheme={setTheme}
            intervals={intervals}
            setIntervals={setIntervals}
            onSendPlan={sendWholePlan}
            stats={{ activities: activities.length, completed: Object.values(completions).filter((c) => c.done).length }}
          />
        )}
      </main>

      {/* Barre d'onglets mobile, flottante, effet verre */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        aria-label="Navigation principale"
      >
        <div className="glass relative mx-auto grid max-w-md grid-cols-4 rounded-[1.75rem] p-1.5">
          <span
            aria-hidden="true"
            className="glass-pill pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[1.35rem] transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)]"
            style={{ width: 'calc((100% - 0.75rem) / 4)', transform: `translateX(${tabIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cx(
                'relative flex flex-col items-center gap-0.5 rounded-[1.35rem] py-2 text-[10px] font-bold transition-colors duration-200 active:scale-95',
                tab === t.id ? 'text-accent' : 'text-ink/60',
              )}
            >
              <t.icon className="h-[22px] w-[22px]" strokeWidth={tab === t.id ? 2.4 : 2} />
              {t.short || t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
