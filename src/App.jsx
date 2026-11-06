import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Map as MapIcon, Settings, UserRound } from 'lucide-react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ActivitiesTab from './components/ActivitiesTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import { Logo, cx } from './components/ui';
import { currentWeekNumber, generatePlan } from './lib/plan';
import { compareToSession } from './lib/gpx';
import { defaultProfile, migrateLegacyProfile, usePersistentState } from './lib/storage';

const TABS = [
  { id: 'dashboard', label: 'Mon Programme', icon: CalendarRange },
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

  const plan = useMemo(() => (profile ? generatePlan(profile, adjustments) : []), [profile, adjustments]);
  const todayWeek = profile ? currentWeekNumber(profile) : 1;
  const [viewWeek, setViewWeek] = useState(todayWeek);
  useEffect(() => { if (viewWeek > plan.length && plan.length) setViewWeek(plan.length); }, [plan.length, viewWeek]);

  const activitiesById = useMemo(() => Object.fromEntries(activities.map((a) => [a.id, a])), [activities]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  /* ------------------------------ actions ------------------------------ */

  const startProgram = (p) => {
    const restarted = profile && p.planStart !== profile.planStart;
    setProfile(p);
    if (restarted) { setCompletions({}); setAdjustments({}); }
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

  const addActivities = (parsed, sessions) => {
    const known = new Set(activities.map((a) => `${a.startTime}-${a.distanceKm}`));
    const fresh = parsed.filter((a) => !known.has(`${a.startTime}-${a.distanceKm}`));
    if (!fresh.length) return;
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
  };

  const linkActivity = (activity, session, previousId) => {
    setCompletions((prev) => {
      const next = { ...prev };
      if (previousId) delete next[previousId];
      if (session) next[session.id] = { done: true, activityId: activity.id, score: compareToSession(activity, session, profile)?.score, at: Date.now() };
      return next;
    });
  };

  const removeActivity = (id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setCompletions((prev) => Object.fromEntries(Object.entries(prev).filter(([, c]) => c.activityId !== id)));
  };

  /* ------------------------------- rendu ------------------------------- */

  if (!profile || wizardOpen) {
    return (
      <Onboarding
        initial={profile || defaultProfile()}
        onComplete={startProgram}
        onSkip={() => startProgram({ ...defaultProfile(), name: 'Coureur' })}
        canCancel={!!profile}
        onCancel={() => setWizardOpen(false)}
        dark={dark}
        onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">Beta</span>
          </div>
          <nav className="hidden items-center gap-1 rounded-xl bg-sunken p-1 md:flex" aria-label="Navigation principale">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                aria-label={t.label}
                title={t.label}
                className={cx(
                  'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition',
                  tab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
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
          />
        )}
        {tab === 'sessions' && (
          <ActivitiesTab
            profile={profile}
            plan={plan}
            activities={activities}
            onAddActivities={addActivities}
            onRemoveActivity={removeActivity}
            completions={completions}
            onLink={linkActivity}
          />
        )}
        {tab === 'profile' && <ProfileTab profile={profile} onSave={setProfile} onRestartWizard={() => setWizardOpen(true)} />}
        {tab === 'settings' && (
          <SettingsTab
            theme={theme}
            setTheme={setTheme}
            stats={{ activities: activities.length, completed: Object.values(completions).filter((c) => c.done).length }}
          />
        )}
      </main>

      {/* Barre d'onglets mobile */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Navigation principale">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cx('flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold', tab === t.id ? 'text-accent' : 'text-muted')}
            >
              <t.icon className="h-5 w-5" />
              {t.short || t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
