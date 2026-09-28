import React, { useState, useEffect } from 'react';
import { 
  Mountain, 
  Activity, 
  Zap, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateTrailPlan } from './services/gemini';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fatigueStatus, setFatigueStatus] = useState('normal');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Profil coureur
  const [profile, setProfile] = useState(() => {
    const savedProfile = localStorage.getItem('trailfit_profile');
    if (savedProfile) {
      try { return JSON.parse(savedProfile); } catch (e) {}
    }
    return {
      name: 'Alexandre',
      targetRace: 'Maratrail du Ventoux',
      targetDistance: 42,
      targetElevation: 2100,
      weeksRemaining: 8,
      level: 'Intermédiaire',
      vma: 15.5,
      sessionsPerWeek: 4
    };
  });

  // Plan hebdomadaire
  const [currentWeek, setCurrentWeek] = useState(() => {
    const savedPlan = localStorage.getItem('trailfit_current_week');
    if (savedPlan) {
      try { return JSON.parse(savedPlan); } catch (e) {}
    }
    return {
      number: 1,
      totalWeeks: 8,
      phase: 'Foncier & Reprise',
      focus: 'Développement de l\'endurance fondamentale et renforcement musculaire',
      targetKm: 42,
      targetDPlus: 1200,
      sessions: [
        {
          id: 1,
          day: 'Mardi',
          type: 'Endurance',
          title: 'Footing de reprise & PPG',
          duration: '50 min',
          distance: '9 km',
          elevation: '120m D+',
          desc: 'Aisance respiratoire totale. Finir par 15 min de renforcement gainage.',
          completed: false
        },
        {
          id: 2,
          day: 'Jeudi',
          type: 'Qualité',
          title: 'Côtes courtes & VMA montée',
          duration: '1h05',
          distance: '11 km',
          elevation: '350m D+',
          desc: '10x 45" en côte raide (effort 90% VMA). Récupération en descente au pas.',
          completed: false
        },
        {
          id: 3,
          day: 'Samedi',
          type: 'Sortie Longue',
          title: 'Rando-Course en bloc D+',
          duration: '2h15',
          distance: '18 km',
          elevation: '650m D+',
          desc: 'Travail spécifique de marche en montée avec bâtons et relance sur le plat.',
          completed: false
        }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('trailfit_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('trailfit_current_week', JSON.stringify(currentWeek));
  }, [currentWeek]);

  const loadWeek = async (weekNum) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const generatedWeek = await generateTrailPlan(profile, weekNum);
      setCurrentWeek(generatedWeek);
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la préparation du plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = (e) => {
    e.preventDefault();
    loadWeek(1);
  };

  const toggleSession = (id) => {
    setCurrentWeek(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  const handleAdapt = (status) => {
    setFatigueStatus(status);
    let feedback = '';
    let updatedSessions = [...currentWeek.sessions];

    if (status === 'fatigued') {
      feedback = "Charge adaptée : Sortie longue réduite de 35% pour favoriser la récupération.";
      updatedSessions = updatedSessions.map(s => {
        if (s.type.toLowerCase().includes('longue') || s.type.toLowerCase().includes('qualité')) {
          return { ...s, duration: '1h15', elevation: '200m D+', desc: 'Séance raccourcie suite à ton signal de fatigue.' };
        }
        return s;
      });
    } else if (status === 'injured') {
      feedback = "Alerte gêne : Remplacement des impacts au sol par du Cross-Training.";
      updatedSessions = updatedSessions.map(s => {
        if (!s.completed) return { ...s, type: 'Cross-Training', title: 'Vélo / Home-Trainer', elevation: '0m D+', desc: 'Maintien du travail cardio sans choc sur les articulations.' };
        return s;
      });
    } else {
      feedback = "Forme confirmée : Programme maintenu à 100%.";
    }

    setFeedbackMsg(feedback);
    setCurrentWeek(prev => ({ ...prev, sessions: updatedSessions }));
  };

  const completedCount = currentWeek.sessions.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / currentWeek.sessions.length) * 100) || 0;

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

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mon Programme
            </button>
            <button 
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'generator' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Nouveau Plan
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            
            {/* Bannière Objectif principal */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      Objectif J-{(currentWeek.totalWeeks || profile.weeksRemaining) * 7}
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

                {/* Statut de progression de la semaine */}
                <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semaine</div>
                    <div className="text-xl font-black text-slate-900">{currentWeek.number} <span className="text-xs font-bold text-slate-400">/ {currentWeek.totalWeeks || profile.weeksRemaining}</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume</div>
                    <div className="text-xl font-black text-slate-900">{currentWeek.targetKm} <span className="text-xs font-bold text-slate-400">km</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-center px-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dénivelé</div>
                    <div className="text-xl font-black text-amber-600">+{currentWeek.targetDPlus}m</div>
                  </div>
                </div>
              </div>

              {/* Barre de progression globale */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>SÉANCE {completedCount} SUR {currentWeek.sessions.length} EFFECTUÉE(S)</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Navigation entre semaines */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentWeek.number <= 1 || isLoading}
                    onClick={() => loadWeek(currentWeek.number - 1)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl transition-all text-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-black uppercase text-slate-700 px-3">
                    {isLoading ? 'Chargement...' : `Semaine ${currentWeek.number}`}
                  </span>
                  <button
                    disabled={currentWeek.number >= (currentWeek.totalWeeks || profile.weeksRemaining) || isLoading}
                    onClick={() => loadWeek(currentWeek.number + 1)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl transition-all text-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid principale */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Colonne des Séances */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    Programme de la Semaine
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    Phase : <strong className="text-slate-800">{currentWeek.phase}</strong>
                  </span>
                </div>

                <div className="space-y-4">
                  {currentWeek.sessions.map((session) => (
                    <div 
                      key={session.id}
                      className={`bg-white border rounded-2xl p-6 transition-all duration-200 ${
                        session.completed 
                          ? 'border-slate-200 bg-slate-50/60 opacity-80' 
                          : 'border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                            {session.day}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                            {session.type}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleSession(session.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                            session.completed 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${session.completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {session.completed ? 'Validée' : 'Valider'}
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        {session.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                        {session.desc}
                      </p>

                      <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{session.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-slate-400" />
                          <span>{session.distance}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mountain className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-700">{session.elevation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colonne de droite : État de Forme */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Ajustement du Programme
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Signalez votre niveau de fatigue pour ajuster instantanément vos séances.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleAdapt('normal')}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        fatigueStatus === 'normal' 
                          ? 'bg-amber-50 border-amber-300 text-slate-900 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs">En forme maximale</span>
                      </div>
                      {fatigueStatus === 'normal' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                    </button>

                    <button
                      onClick={() => handleAdapt('fatigued')}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        fatigueStatus === 'fatigued' 
                          ? 'bg-amber-50 border-amber-300 text-slate-900 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs">Fatigue / Manque de temps</span>
                      </div>
                      {fatigueStatus === 'fatigued' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                    </button>

                    <button
                      onClick={() => handleAdapt('injured')}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        fatigueStatus === 'injured' 
                          ? 'bg-amber-50 border-amber-300 text-slate-900 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-rose-500" />
                        <span className="text-xs">Gêne musculaire / Douleur</span>
                      </div>
                      {fatigueStatus === 'injured' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                    </button>
                  </div>

                  {feedbackMsg && (
                    <div className="p-4 bg-slate-900 text-white rounded-xl text-xs font-medium leading-relaxed flex items-start gap-3 shadow-sm">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>{feedbackMsg}</div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* Formulaire de génération */
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600">
                <Mountain className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Générer un Plan Trail
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Configurez votre objectif. Nous calculerons vos séances adaptées.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold mb-6">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGeneratePlan} className="space-y-5 text-xs font-bold text-slate-700">
              <div>
                <label className="block uppercase tracking-wider mb-2">Nom de la course / Objectif</label>
                <input 
                  type="text" 
                  value={profile.targetRace} 
                  onChange={(e) => setProfile({...profile, targetRace: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider mb-2">Distance (km)</label>
                  <input 
                    type="number" 
                    value={profile.targetDistance} 
                    onChange={(e) => setProfile({...profile, targetDistance: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-2">Dénivelé (D+)</label>
                  <input 
                    type="number" 
                    value={profile.targetElevation} 
                    onChange={(e) => setProfile({...profile, targetElevation: Number(e.target.value)})}
                    className="w-full bg-slate-900 text-amber-400 border border-slate-800 rounded-xl p-3.5 font-bold focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider mb-2">Semaines de préparation</label>
                  <input 
                    type="number" 
                    value={profile.weeksRemaining} 
                    onChange={(e) => setProfile({...profile, weeksRemaining: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-2">Séances par semaine</label>
                  <input 
                    type="number" 
                    value={profile.sessionsPerWeek} 
                    onChange={(e) => setProfile({...profile, sessionsPerWeek: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 font-semibold focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black p-4 rounded-xl transition-all shadow-md shadow-amber-400/20 mt-6 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Calcul du plan d'entraînement...
                  </>
                ) : (
                  'Générer mon plan d\'entraînement'
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
