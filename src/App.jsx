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
  User,
  Upload,
  BarChart3,
  Sliders,
  Check,
  FileCode,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { generateTrailPlan } from './services/gemini';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fatigueStatus, setFatigueStatus] = useState('normal');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Profil utilisateur complet
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('trailfit_profile');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {
      name: 'Alexandre',
      targetRace: 'Maratrail du Ventoux',
      targetDistance: 42,
      targetElevation: 2100,
      weeksRemaining: 8,
      level: 'Intermédiaire',
      vma: 15.5,
      fcMax: 185,
      sessionsPerWeek: 4,
      preferredDays: ['Mardi', 'Jeudi', 'Samedi', 'Dimanche'],
      notes: 'Gêne légère au genou droit en descente forte.'
    };
  });

  // 2. Stockage des semaines (Multi-semaines)
  const [weeksData, setWeeksData] = useState(() => {
    const saved = localStorage.getItem('trailfit_weeks_data');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {};
  });

  const [currentWeekNum, setCurrentWeekNum] = useState(1);

  // 3. Gestion des activités importées (GPX)
  const [importedActivities, setImportedActivities] = useState(() => {
    const saved = localStorage.getItem('trailfit_activities');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return [];
  });

  const [selectedActivity, setSelectedActivity] = useState(null);

  // Sauvegardes locales
  useEffect(() => {
    localStorage.setItem('trailfit_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('trailfit_weeks_data', JSON.stringify(weeksData));
  }, [weeksData]);

  useEffect(() => {
    localStorage.setItem('trailfit_activities', JSON.stringify(importedActivities));
  }, [importedActivities]);

  // Génération initiale des 3 premières semaines
  const handleGenerateInitial3Weeks = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const newWeeks = {};
      // Génération successive des semaines 1, 2 et 3
      for (let w = 1; w <= 3; w++) {
        const weekData = await generateTrailPlan(profile, w);
        newWeeks[w] = weekData;
      }
      setWeeksData(newWeeks);
      setCurrentWeekNum(1);
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors du calcul du programme sur 3 semaines.');
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement / Génération à la volée des semaines suivantes
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
      setErrorMsg(err.message || 'Erreur lors de la génération de la semaine');
    } finally {
      setIsLoading(false);
    }
  };

  // Coche des séances
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

  // Simulation Import Fichier GPX
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simulation d'extraction de données GPX
    const newActivity = {
      id: Date.now(),
      fileName: file.name,
      date: new Date().toLocaleDateString('fr-FR'),
      distance: (Math.random() * (16 - 10) + 10).toFixed(1),
      elevation: Math.floor(Math.random() * (600 - 350) + 350),
      duration: '1h22',
      avgPace: '5:45 min/km',
      avgHR: Math.floor(Math.random() * (165 - 145) + 145),
      coherenceScore: Math.floor(Math.random() * (98 - 82) + 82),
      coherenceFeedback: 'Très bonne régularité sur les blocs de montée. L’intensité a été respectée à 92%.'
    };

    setImportedActivities(prev => [newActivity, ...prev]);
    setSelectedActivity(newActivity);
  };

  const currentWeek = weeksData[currentWeekNum] || {
    number: 1,
    totalWeeks: profile.weeksRemaining,
    phase: 'Foncier & Reprise',
    focus: 'Lancez la génération pour créer vos 3 premières semaines.',
    targetKm: 0,
    targetDPlus: 0,
    sessions: []
  };

  const completedCount = (currentWeek.sessions || []).filter(s => s.completed).length;
  const progressPercent = currentWeek.sessions?.length 
    ? Math.round((completedCount / currentWeek.sessions.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
              <Mountain className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                TRAIL<span className="text-amber-500">COACH</span>
              </span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                BETA
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mon Programme
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mes Séances & GPX
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Profil
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        
        {/* ONGLET 1 : MON PROGRAMME */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      Objectif J-{(profile.weeksRemaining) * 7}
                    </span>
                    <span className="text-xs font-medium text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-500">{profile.level}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {profile.targetRace}
                  </h1>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-3">
                    <span><strong>{profile.targetDistance} km</strong></span>
                    <span>•</span>
                    <span><strong className="text-amber-600">+{profile.targetElevation}m D+</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semaine</div>
                    <div className="text-xl font-black text-slate-900">{currentWeekNum} <span className="text-xs font-bold text-slate-400">/ {profile.weeksRemaining}</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume</div>
                    <div className="text-xl font-black text-slate-900">{currentWeek.targetKm || 0} <span className="text-xs font-bold text-slate-400">km</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dénivelé</div>
                    <div className="text-xl font-black text-amber-600">+{currentWeek.targetDPlus || 0}m</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>COMPLÉTION SEMAINE {currentWeekNum}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentWeekNum <= 1 || isLoading}
                    onClick={() => handleLoadOrGenerateWeek(currentWeekNum - 1)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl transition-all text-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-black uppercase text-slate-700 px-3">
                    {isLoading ? 'Calcul...' : `Semaine ${currentWeekNum}`}
                  </span>
                  <button
                    disabled={currentWeekNum >= profile.weeksRemaining || isLoading}
                    onClick={() => handleLoadOrGenerateWeek(currentWeekNum + 1)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl transition-all text-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {Object.keys(weeksData).length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
                <Mountain className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Aucun programme généré pour l'instant</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Cliquez sur le bouton ci-dessous pour calculer automatiquement vos **3 premières semaines d'entraînement** selon votre profil.
                </p>
                <button
                  onClick={handleGenerateInitial3Weeks}
                  disabled={isLoading}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-400/20"
                >
                  {isLoading ? 'Calcul des 3 premières semaines...' : 'Générer les 3 premières semaines'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />
                      Séances de la Semaine {currentWeekNum}
                    </h2>
                    <span className="text-xs font-semibold text-slate-500">
                      Phase : <strong className="text-slate-800">{currentWeek.phase}</strong>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {currentWeek.sessions?.map((session) => (
                      <div key={session.id} className={`bg-white border rounded-2xl p-6 transition-all ${session.completed ? 'border-slate-200 bg-slate-50/60 opacity-80' : 'border-slate-200 shadow-sm'}`}>
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{session.day}</span>
                            <span className="text-xs font-extrabold uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">{session.type}</span>
                          </div>
                          <button onClick={() => toggleSession(session.id)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${session.completed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}>
                            <CheckCircle2 className={`w-4 h-4 ${session.completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                            {session.completed ? 'Validée' : 'Valider'}
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">{session.title}</h3>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">{session.desc}</p>
                        <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /><span>{session.duration}</span></div>
                          <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-slate-400" /><span>{session.distance}</span></div>
                          <div className="flex items-center gap-1.5"><Mountain className="w-4 h-4 text-amber-500" /><span className="text-amber-700">{session.elevation}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Ajustement de la charge
                    </h3>
                    <p className="text-xs text-slate-500">Un coup de fatigue ? Réajustez vos séances courantes instantanément.</p>
                    <div className="space-y-2">
                      <button onClick={() => setFatigueStatus('normal')} className="w-full p-3 rounded-xl border text-left text-xs font-bold bg-slate-50 border-slate-200">En forme</button>
                      <button onClick={() => setFatigueStatus('fatigued')} className="w-full p-3 rounded-xl border text-left text-xs font-bold bg-slate-50 border-slate-200">Fatigué (-30% D+)</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET 2 : MES SÉANCES & GPX */}
        {activeTab === 'sessions' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Analyse d'activités GPX</h2>
                <p className="text-xs text-slate-500 mt-1">Importez vos fichiers `.gpx` enregistrés avec votre montre pour analyser votre courbe de charge et vérifier la cohérence.</p>
              </div>
              <label className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Importer un GPX</span>
                <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {importedActivities.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 text-xs">
                Aucune activité importée pour le moment. Cliquez sur "Importer un GPX" ci-dessus pour charger votre premier fichier.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Liste des activités */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Derniers imports</h3>
                  {importedActivities.map((act) => (
                    <div 
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedActivity?.id === act.id 
                          ? 'border-amber-400 bg-amber-50/40 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-900">{act.fileName}</span>
                        <span className="text-[10px] text-slate-400">{act.date}</span>
                      </div>
                      <div className="flex gap-3 text-xs font-semibold text-slate-600">
                        <span>{act.distance} km</span>
                        <span>+{act.elevation}m D+</span>
                        <span className="text-amber-600 font-bold">{act.coherenceScore}% de cohérence</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Graphique & Analyse de la séance sélectionnée */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  {selectedActivity ? (
                    <>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{selectedActivity.fileName}</h3>
                          <span className="text-xs text-slate-400">Analyse détaillée du tracé & de l'effort</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-xl">
                          Score de cohérence : {selectedActivity.coherenceScore}%
                        </div>
                      </div>

                      {/* Simulation Graphique interactif Intervals.icu */}
                      <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4">
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                          <span>PROFIL D'ALTITUDE & FRÉQUENCE CARDIAQUE</span>
                          <span>MAX: 172 BPM</span>
                        </div>

                        {/* Barres représentant le dénivelé et la FC */}
                        <div className="h-40 flex items-end gap-1 pt-6">
                          {[30, 45, 60, 80, 95, 70, 50, 40, 85, 100, 90, 65, 40, 30, 55, 75, 80, 60, 40, 20].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end h-full gap-1 group relative">
                              {/* FC */}
                              <div className="w-full bg-rose-500 rounded-t-sm" style={{ height: `${val * 0.7}%` }}></div>
                              {/* Altitude */}
                              <div className="w-full bg-amber-400/80 rounded-t-sm" style={{ height: `${val * 0.9}%` }}></div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                          <span>0 km</span>
                          <span>4 km</span>
                          <span>8 km</span>
                          <span>12 km</span>
                          <span>{selectedActivity.distance} km</span>
                        </div>
                      </div>

                      {/* Feedback d'analyse */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">Analyse de conformité au programme :</span>
                        <p className="text-slate-600 leading-relaxed">{selectedActivity.coherenceFeedback}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">Sélectionnez une activité dans la liste pour afficher l'analyse.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET 3 : PROFIL */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Profil du Coureur</h2>
              <p className="text-xs text-slate-500">Ces données sont directement utilisées pour calibrer la charge et la difficulté des séances.</p>
            </div>

            <form onSubmit={handleGenerateInitial3Weeks} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Prénom / Nom</label>
                  <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
                </div>
                <div>
                  <label className="block mb-1">Niveau d'expérience</label>
                  <select value={profile.level} onChange={e => setProfile({...profile, level: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900">
                    <option>Débutant</option>
                    <option>Intermédiaire</option>
                    <option>Avancé / Ultra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">VMA (km/h)</label>
                  <input type="number" step="0.5" value={profile.vma} onChange={e => setProfile({...profile, vma: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
                </div>
                <div>
                  <label className="block mb-1">FC Max (BPM)</label>
                  <input type="number" value={profile.fcMax} onChange={e => setProfile({...profile, fcMax: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block mb-1">Course Objectif</label>
                <input type="text" value={profile.targetRace} onChange={e => setProfile({...profile, targetRace: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1">Distance (km)</label>
                  <input type="number" value={profile.targetDistance} onChange={e => setProfile({...profile, targetDistance: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
                </div>
                <div>
                  <label className="block mb-1">Dénivelé (D+)</label>
                  <input type="number" value={profile.targetElevation} onChange={e => setProfile({...profile, targetElevation: Number(e.target.value)})} className="w-full bg-slate-900 text-amber-400 border border-slate-800 rounded-xl p-3 font-bold" />
                </div>
                <div>
                  <label className="block mb-1">Semaines de prépa</label>
                  <input type="number" value={profile.weeksRemaining} onChange={e => setProfile({...profile, weeksRemaining: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl uppercase tracking-wider text-xs transition-all shadow-md mt-4">
                {isLoading ? 'Calcul des 3 premières semaines...' : 'Mettre à jour & Générer les 3 premières semaines'}
              </button>
            </form>
          </div>
        )}

        {/* ONGLET 4 : RÉGLAGES / PARAMÈTRES */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Réglages & Paramètres</h2>
              <p className="text-xs text-slate-500">Configuration technique et gestion du stockage local.</p>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Statut du Moteur de Calcul</label>
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
                  <span>Connecté & Actif</span>
                  <Check className="w-4 h-4" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="block mb-1 text-rose-600">Zone de danger</label>
                <button 
                  onClick={() => {
                    if (confirm("Réinitialiser toutes vos données enregistrées ?")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-left hover:bg-rose-100 font-bold transition-all"
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
