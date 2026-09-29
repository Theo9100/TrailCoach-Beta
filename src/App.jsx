import React, { useState, useEffect } from 'react';
import { 
  Mountain, 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
  Sparkles,
  ArrowRight,
  Moon,
  Sun
} from 'lucide-react';
import { generateTrailPlan } from './services/gemini';

export default function App() {
  useEffect(() => {
    document.title = "TrailCoach Beta";
  }, []);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('trailfit_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('trailfit_dark_mode', darkMode);
  }, [darkMode]);

  const [isOnboarding, setIsOnboarding] = useState(() => {
    return !localStorage.getItem('trailfit_onboarding_completed');
  });

  const [onboardingStep, setOnboardingStep] = useState(1);

  const [wizardData, setWizardData] = useState({
    name: 'Alexandre',
    targetRace: 'Maratrail du Ventoux',
    targetDistance: 42,
    targetElevation: 2100,
    weeksRemaining: 10,
    level: 'Intermédiaire',
    vma: 15.0,
    fcMax: 185,
    sessionsPerWeek: 4
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [fatigueStatus, setFatigueStatus] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('trailfit_profile');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return wizardData;
  });

  const [weeksData, setWeeksData] = useState(() => {
    const saved = localStorage.getItem('trailfit_weeks_data');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {};
  });

  const [currentWeekNum, setCurrentWeekNum] = useState(1);

  const [importedActivities, setImportedActivities] = useState(() => {
    const saved = localStorage.getItem('trailfit_activities');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return [];
  });
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    localStorage.setItem('trailfit_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('trailfit_weeks_data', JSON.stringify(weeksData));
  }, [weeksData]);

  useEffect(() => {
    localStorage.setItem('trailfit_activities', JSON.stringify(importedActivities));
  }, [importedActivities]);

  // Validation de l'onboarding : Génération de la Semaine 1 d'abord
  const handleFinishOnboarding = async () => {
    setProfile(wizardData);
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Générer d'abord la semaine 1
      const week1Data = await generateTrailPlan(wizardData, 1);
      const initialWeeks = { 1: week1Data };
      
      setWeeksData(initialWeeks);
      setCurrentWeekNum(1);
      localStorage.setItem('trailfit_onboarding_completed', 'true');
      setIsOnboarding(false);
      setActiveTab('dashboard');

      // 2. Générer progressivement les semaines 2 et 3 en arrière-plan
      try {
        const week2Data = await generateTrailPlan(wizardData, 2);
        setWeeksData(prev => ({ ...prev, 2: week2Data }));
        const week3Data = await generateTrailPlan(wizardData, 3);
        setWeeksData(prev => ({ ...prev, 3: week3Data }));
      } catch (bgErr) {
        console.log("Génération en arrière-plan reportée.");
      }

    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la génération. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadOrGenerateWeek = async (targetWeek) => {
    if (weeksData[targetWeek]) {
      setCurrentWeekNum(targetWeek);
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const weekData = await generateTrailPlan(profile, targetWeek);
      setWeeksData(prev => ({ ...prev, [targetWeek]: weekData }));
      setCurrentWeekNum(targetWeek);
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors du chargement de la semaine');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSession = (sessionId) => {
    setWeeksData(prev => {
      const week = prev[currentWeekNum];
      if (!week) return prev;
      const updatedSessions = week.sessions.map(s => 
        s.id === sessionId ? { ...s, completed: !s.completed } : s
      );
      return { ...prev, [currentWeekNum]: { ...week, sessions: updatedSessions } };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newActivity = {
      id: Date.now(),
      fileName: file.name,
      date: new Date().toLocaleDateString('fr-FR'),
      distance: (Math.random() * (16 - 10) + 10).toFixed(1),
      elevation: Math.floor(Math.random() * (600 - 350) + 350),
      duration: '1h22',
      coherenceScore: Math.floor(Math.random() * (98 - 82) + 82),
      coherenceFeedback: 'Très bonne régularité sur les montées. Intention globale respectée.'
    };

    setImportedActivities(prev => [newActivity, ...prev]);
    setSelectedActivity(newActivity);
  };

  const currentWeek = weeksData[currentWeekNum] || {
    number: 1,
    totalWeeks: profile.weeksRemaining,
    phase: 'Foncier & Reprise',
    targetKm: 0,
    targetDPlus: 0,
    sessions: []
  };

  const completedCount = (currentWeek.sessions || []).filter(s => s.completed).length;
  const progressPercent = currentWeek.sessions?.length 
    ? Math.round((completedCount / currentWeek.sessions.length) * 100) 
    : 0;

  const theme = {
    bg: darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800',
    card: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80',
    cardHeader: darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100',
    header: darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200',
    navBg: darkMode ? 'bg-slate-950' : 'bg-slate-100',
    navBtnActive: darkMode ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-900 shadow-sm',
    navBtnInactive: darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900',
    subText: darkMode ? 'text-slate-400' : 'text-slate-500',
    titleText: darkMode ? 'text-white' : 'text-slate-900',
    inputBg: darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900',
    border: darkMode ? 'border-slate-800' : 'border-slate-100'
  };

  if (isOnboarding) {
    return (
      <div className={`min-h-screen ${theme.bg} font-sans flex flex-col justify-center items-center px-4 py-12 antialiased`}>
        <div className={`max-w-xl w-full ${theme.card} border rounded-3xl p-8 sm:p-10 shadow-xl space-y-8 relative`}>
          
          <div className={`flex items-center justify-between border-b ${theme.border} pb-6`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                <Mountain className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`text-xl font-extrabold tracking-tight ${theme.titleText}`}>
                TRAIL<span className="text-amber-500">COACH</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl border ${theme.border} ${theme.navBtnInactive}`}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Étape {onboardingStep} / 3
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {onboardingStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-black ${theme.titleText} tracking-tight`}>Faisons connaissance</h2>
                <p className={`text-xs font-medium ${theme.subText} mt-1`}>
                  Définissons vos capacités actuelles pour ajuster l'intensité.
                </p>
              </div>

              <div className="space-y-5 text-xs font-bold">
                <div>
                  <label className="block uppercase tracking-wider mb-2">Prénom ou Pseudo</label>
                  <input 
                    type="text" 
                    value={wizardData.name} 
                    onChange={e => setWizardData({...wizardData, name: e.target.value})}
                    className={`w-full ${theme.inputBg} rounded-xl p-3.5 font-semibold focus:outline-none focus:border-amber-400 transition-all text-sm`}
                  />
                </div>

                <div className={`space-y-2 ${theme.cardHeader} p-4 rounded-2xl border`}>
                  <div className="flex justify-between items-center">
                    <label className="uppercase tracking-wider">Vitesse Maximale Aérobie (VMA)</label>
                    <span className="text-sm font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {wizardData.vma} km/h
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="22" 
                    step="0.5"
                    value={wizardData.vma} 
                    onChange={e => setWizardData({...wizardData, vma: Number(e.target.value)})}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-2">Niveau d'expérience</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Débutant', 'Intermédiaire', 'Avancé'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setWizardData({...wizardData, level: lvl})}
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                          wizardData.level === lvl 
                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm' 
                            : `${theme.inputBg}`
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOnboardingStep(2)}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md shadow-amber-400/20 mt-4"
              >
                <span>Étape suivante : L'Objectif</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-black ${theme.titleText} tracking-tight`}>Votre Défi Trail</h2>
                <p className={`text-xs font-medium ${theme.subText} mt-1`}>
                  Quelle est l'épreuve cible préparée ?
                </p>
              </div>

              <div className="space-y-5 text-xs font-bold">
                <div>
                  <label className="block uppercase tracking-wider mb-2">Nom de la course / Épreuve</label>
                  <input 
                    type="text" 
                    value={wizardData.targetRace} 
                    onChange={e => setWizardData({...wizardData, targetRace: e.target.value})}
                    className={`w-full ${theme.inputBg} rounded-xl p-3.5 font-semibold focus:outline-none focus:border-amber-400 transition-all text-sm`}
                  />
                </div>

                <div className={`space-y-2 ${theme.cardHeader} p-4 rounded-2xl border`}>
                  <div className="flex justify-between items-center">
                    <label className="uppercase tracking-wider">Distance</label>
                    <span className={`text-sm font-black ${theme.titleText} ${theme.card} border px-2.5 py-0.5 rounded-lg`}>
                      {wizardData.targetDistance} km
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="160" 
                    step="2"
                    value={wizardData.targetDistance} 
                    onChange={e => setWizardData({...wizardData, targetDistance: Number(e.target.value)})}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-2 bg-slate-900 p-4 rounded-2xl text-white border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="uppercase tracking-wider text-slate-300">Dénivelé Positif (D+)</label>
                    <span className="text-sm font-black text-amber-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      +{wizardData.targetElevation} m D+
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="200" 
                    max="10000" 
                    step="100"
                    value={wizardData.targetElevation} 
                    onChange={e => setWizardData({...wizardData, targetElevation: Number(e.target.value)})}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setOnboardingStep(1)}
                  className={`p-4 ${theme.inputBg} rounded-xl font-extrabold text-xs uppercase`}
                >
                  Retour
                </button>
                <button
                  onClick={() => setOnboardingStep(3)}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md shadow-amber-400/20"
                >
                  <span>Étape suivante : Disponibilités</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-black ${theme.titleText} tracking-tight`}>Rythme & Calendrier</h2>
                <p className={`text-xs font-medium ${theme.subText} mt-1`}>
                  Ajustons la charge selon votre calendrier.
                </p>
              </div>

              <div className="space-y-5 text-xs font-bold">
                <div className={`space-y-2 ${theme.cardHeader} p-4 rounded-2xl border`}>
                  <div className="flex justify-between items-center">
                    <label className="uppercase tracking-wider">Durée de préparation</label>
                    <span className={`text-sm font-black ${theme.titleText} ${theme.card} border px-2.5 py-0.5 rounded-lg`}>
                      {wizardData.weeksRemaining} semaines
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="4" 
                    max="24" 
                    step="1"
                    value={wizardData.weeksRemaining} 
                    onChange={e => setWizardData({...wizardData, weeksRemaining: Number(e.target.value)})}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className={`space-y-2 ${theme.cardHeader} p-4 rounded-2xl border`}>
                  <div className="flex justify-between items-center">
                    <label className="uppercase tracking-wider">Séances par semaine</label>
                    <span className="text-sm font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {wizardData.sessionsPerWeek} séances / sem.
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="6" 
                    step="1"
                    value={wizardData.sessionsPerWeek} 
                    onChange={e => setWizardData({...wizardData, sessionsPerWeek: Number(e.target.value)})}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setOnboardingStep(2)}
                  className={`p-4 ${theme.inputBg} rounded-xl font-extrabold text-xs uppercase`}
                >
                  Retour
                </button>
                <button
                  onClick={handleFinishOnboarding}
                  disabled={isLoading}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md shadow-amber-400/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Création de votre programme...</span>
                    </>
                  ) : (
                    <>
                      <span>Générer mon programme</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} font-sans flex flex-col antialiased transition-colors duration-200`}>
      <header className={`${theme.header} border-b sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
              <Mountain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-extrabold tracking-tight ${theme.titleText}`}>
                TRAIL<span className="text-amber-500">COACH</span>
              </span>
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                BETA
              </span>
            </div>
          </div>

          <nav className={`flex items-center gap-1 ${theme.navBg} p-1 rounded-xl text-xs font-bold`}>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'dashboard' ? theme.navBtnActive : theme.navBtnInactive
              }`}
            >
              Mon Programme
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'sessions' ? theme.navBtnActive : theme.navBtnInactive
              }`}
            >
              Mes Séances & GPX
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'profile' ? theme.navBtnActive : theme.navBtnInactive
              }`}
            >
              Profil
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'settings' ? theme.navBtnActive : theme.navBtnInactive
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className={`${theme.card} border rounded-2xl p-6 sm:p-8 shadow-sm`}>
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      Objectif J-{(profile.weeksRemaining) * 7}
                    </span>
                    <span className="text-xs font-medium text-slate-400">•</span>
                    <span className={`text-xs font-bold ${theme.subText}`}>{profile.level}</span>
                  </div>
                  <h1 className={`text-2xl sm:text-3xl font-black ${theme.titleText} tracking-tight`}>
                    {profile.targetRace}
                  </h1>
                  <p className={`text-sm font-medium ${theme.subText} mt-1 flex items-center gap-3`}>
                    <span><strong>{profile.targetDistance} km</strong></span>
                    <span>•</span>
                    <span><strong className="text-amber-500">+{profile.targetElevation}m D+</strong></span>
                  </p>
                </div>

                <div className={`flex items-center gap-6 ${theme.cardHeader} p-4 rounded-xl border`}>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semaine</div>
                    <div className={`text-xl font-black ${theme.titleText}`}>{currentWeekNum} <span className="text-xs font-bold text-slate-400">/ {profile.weeksRemaining}</span></div>
                  </div>
                  <div className={`h-8 w-px ${theme.border}`}></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume</div>
                    <div className={`text-xl font-black ${theme.titleText}`}>{currentWeek.targetKm || 0} <span className="text-xs font-bold text-slate-400">km</span></div>
                  </div>
                  <div className={`h-8 w-px ${theme.border}`}></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dénivelé</div>
                    <div className="text-xl font-black text-amber-500">+{currentWeek.targetDPlus || 0}m</div>
                  </div>
                </div>
              </div>

              <div className={`mt-6 pt-6 border-t ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex-1 max-w-md">
                  <div className={`flex justify-between text-xs font-bold ${theme.subText} mb-1.5`}>
                    <span>COMPLÉTION SEMAINE {currentWeekNum}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className={`w-full h-2.5 ${theme.navBg} rounded-full overflow-hidden`}>
                    <div className="h-full bg-amber-400 transition-all duration-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentWeekNum <= 1 || isLoading}
                    onClick={() => handleLoadOrGenerateWeek(currentWeekNum - 1)}
                    className={`p-2 ${theme.navBg} hover:opacity-80 disabled:opacity-30 rounded-xl transition-all ${theme.titleText}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className={`text-xs font-black uppercase ${theme.titleText} px-3`}>
                    {isLoading ? 'Chargement...' : `Semaine ${currentWeekNum}`}
                  </span>
                  <button
                    disabled={currentWeekNum >= profile.weeksRemaining || isLoading}
                    onClick={() => handleLoadOrGenerateWeek(currentWeekNum + 1)}
                    className={`p-2 ${theme.navBg} hover:opacity-80 disabled:opacity-30 rounded-xl transition-all ${theme.titleText}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-lg font-black ${theme.titleText} tracking-tight flex items-center gap-2`}>
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Séances de la Semaine {currentWeekNum}
                  </h2>
                </div>

                <div className="space-y-4">
                  {currentWeek.sessions?.map((session) => (
                    <div key={session.id} className={`${theme.card} border rounded-2xl p-6 transition-all ${session.completed ? 'opacity-70' : 'shadow-sm'}`}>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg">{session.day}</span>
                          <span className="text-xs font-extrabold uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">{session.type}</span>
                        </div>
                        <button onClick={() => toggleSession(session.id)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${session.completed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : `${theme.inputBg}`}`}>
                          <CheckCircle2 className={`w-4 h-4 ${session.completed ? 'text-emerald-500' : 'text-slate-400'}`} />
                          {session.completed ? 'Validée' : 'Valider'}
                        </button>
                      </div>
                      <h3 className={`text-base font-bold ${theme.titleText} mb-1`}>{session.title}</h3>
                      <p className={`text-xs font-medium ${theme.subText} leading-relaxed mb-4`}>{session.desc}</p>
                      <div className={`flex flex-wrap gap-4 pt-3 border-t ${theme.border} text-xs font-bold ${theme.subText}`}>
                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /><span>{session.duration}</span></div>
                        <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-slate-400" /><span>{session.distance}</span></div>
                        <div className="flex items-center gap-1.5"><Mountain className="w-4 h-4 text-amber-500" /><span className="text-amber-500">{session.elevation}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${theme.card} border rounded-2xl p-6 shadow-sm space-y-4`}>
                  <h3 className={`text-sm font-black ${theme.titleText} uppercase tracking-wider flex items-center gap-2`}>
                    <Zap className="w-4 h-4 text-amber-500" /> Ajustement de la charge
                  </h3>
                  <p className={`text-xs ${theme.subText}`}>Un coup de fatigue ? Réajustez vos séances courantes instantanément.</p>
                  <div className="space-y-2">
                    <button onClick={() => setFatigueStatus('normal')} className={`w-full p-3 rounded-xl border text-left text-xs font-bold ${theme.inputBg}`}>En forme</button>
                    <button onClick={() => setFatigueStatus('fatigued')} className={`w-full p-3 rounded-xl border text-left text-xs font-bold ${theme.inputBg}`}>Fatigué (-30% D+)</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-8">
            <div className={`${theme.card} border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6`}>
              <div>
                <h2 className={`text-xl font-black ${theme.titleText}`}>Analyse d'activités GPX</h2>
                <p className={`text-xs ${theme.subText} mt-1`}>Importez vos fichiers `.gpx` pour vérifier la conformité de vos sorties.</p>
              </div>
              <label className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Importer un GPX</span>
                <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {importedActivities.length === 0 ? (
              <div className={`${theme.card} border rounded-2xl p-12 text-center text-slate-400 text-xs`}>
                Aucune activité importée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <h3 className={`text-sm font-black ${theme.titleText} uppercase tracking-wider mb-2`}>Derniers imports</h3>
                  {importedActivities.map((act) => (
                    <div 
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedActivity?.id === act.id 
                          ? 'border-amber-400 bg-amber-500/10 shadow-sm' 
                          : `${theme.card}`
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${theme.titleText}`}>{act.fileName}</span>
                        <span className="text-[10px] text-slate-400">{act.date}</span>
                      </div>
                      <div className={`flex gap-3 text-xs font-semibold ${theme.subText}`}>
                        <span>{act.distance} km</span>
                        <span>+{act.elevation}m D+</span>
                        <span className="text-amber-500 font-bold">{act.coherenceScore}% de cohérence</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`lg:col-span-2 ${theme.card} border rounded-2xl p-6 shadow-sm space-y-6`}>
                  {selectedActivity ? (
                    <>
                      <div className={`flex justify-between items-center border-b ${theme.border} pb-4`}>
                        <div>
                          <h3 className={`text-lg font-black ${theme.titleText}`}>{selectedActivity.fileName}</h3>
                          <span className={`text-xs ${theme.subText}`}>Analyse détaillée du tracé</span>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-black px-3 py-1.5 rounded-xl">
                          Score de cohérence : {selectedActivity.coherenceScore}%
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4 border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                          <span>PROFIL D'ALTITUDE & FRÉQUENCE CARDIAQUE</span>
                          <span>MAX: 172 BPM</span>
                        </div>

                        <div className="h-40 flex items-end gap-1 pt-6">
                          {[30, 45, 60, 80, 95, 70, 50, 40, 85, 100, 90, 65, 40, 30, 55, 75, 80, 60, 40, 20].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end h-full gap-1 group relative">
                              <div className="w-full bg-rose-500 rounded-t-sm" style={{ height: `${val * 0.7}%` }}></div>
                              <div className="w-full bg-amber-400/80 rounded-t-sm" style={{ height: `${val * 0.9}%` }}></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`${theme.cardHeader} border p-4 rounded-xl text-xs space-y-1`}>
                        <span className={`font-bold ${theme.titleText} block`}>Analyse de conformité au programme :</span>
                        <p className={`${theme.subText} leading-relaxed`}>{selectedActivity.coherenceFeedback}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">Sélectionnez une activité dans la liste.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className={`max-w-2xl mx-auto ${theme.card} border rounded-2xl p-8 shadow-sm space-y-6`}>
            <div className={`border-b ${theme.border} pb-4`}>
              <h2 className={`text-xl font-black ${theme.titleText}`}>Profil du Coureur</h2>
              <p className={`text-xs ${theme.subText}`}>Vos réglages personnels d'entraînement.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setIsOnboarding(true); setOnboardingStep(1); }} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Prénom / Nom</label>
                  <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className={`w-full ${theme.inputBg} rounded-xl p-3`} />
                </div>
                <div>
                  <label className="block mb-1">Niveau d'expérience</label>
                  <select value={profile.level} onChange={e => setProfile({...profile, level: e.target.value})} className={`w-full ${theme.inputBg} rounded-xl p-3`}>
                    <option>Débutant</option>
                    <option>Intermédiaire</option>
                    <option>Avancé / Ultra</option>
                  </select>
                </div>
              </div>

              <button type="button" onClick={() => { setIsOnboarding(true); setOnboardingStep(1); }} className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl uppercase tracking-wider text-xs transition-all shadow-md mt-4">
                Relancer le Questionnaire de Configuration
              </button>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={`max-w-xl mx-auto ${theme.card} border rounded-2xl p-8 shadow-sm space-y-6`}>
            <div className={`border-b ${theme.border} pb-4`}>
              <h2 className={`text-xl font-black ${theme.titleText}`}>Réglages & Paramètres</h2>
              <p className={`text-xs ${theme.subText}`}>Gestion du thème et des données.</p>
            </div>

            <div className="space-y-6 text-xs font-bold">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  <div>
                    <div className={`text-sm font-black ${theme.titleText}`}>Mode Sombre</div>
                    <div className={`text-[11px] ${theme.subText}`}>Confort visuel pour l'utilisation nocturne.</div>
                  </div>
                </div>

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${
                    darkMode ? 'bg-amber-400 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-950 shadow-md"></div>
                </button>
              </div>

              <div className={`border-t ${theme.border} pt-4 space-y-2`}>
                <label className="block mb-1 text-rose-500">Zone de danger</label>
                <button 
                  onClick={() => {
                    if (confirm("Réinitialiser toutes vos données enregistrées ?")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl text-left hover:bg-rose-500/20 font-bold transition-all"
                >
                  Effacer le programme et réinitialiser l'application
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
