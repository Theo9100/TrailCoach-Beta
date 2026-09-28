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
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateTrailPlan } from './services/gemini';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fatigueStatus, setFatigueStatus] = useState('normal');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Profil de l'utilisateur
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

  // Plan de la semaine (avec lecture dans localStorage)
  const [currentWeek, setCurrentWeek] = useState(() => {
    const savedPlan = localStorage.getItem('trailfit_current_week');
    if (savedPlan) {
      try { return JSON.parse(savedPlan); } catch (e) {}
    }
    return {
      number: 1,
      totalWeeks: 8,
      phase: 'Foncier & Reprise',
      focus: 'Base d\'endurance et dénivelé progressif',
      targetKm: 40,
      targetDPlus: 1200,
      sessions: [
        {
          id: 1,
          day: 'Mardi',
          type: 'Relâchement',
          title: 'Footing EF',
          duration: '50 min',
          distance: '8 km',
          elevation: '100m D+',
          desc: 'Aisance respiratoire totale.',
          completed: false
        }
      ]
    };
  });

  // Sauvegarde automatique du profil et du plan
  useEffect(() => {
    localStorage.setItem('trailfit_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('trailfit_current_week', JSON.stringify(currentWeek));
  }, [currentWeek]);

  // Génération ou chargement d'une semaine spécifique
  const loadWeek = async (weekNum) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const generatedWeek = await generateTrailPlan(profile, weekNum);
      setCurrentWeek(generatedWeek);
      setActiveTab('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la génération du plan');
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
      feedback = "IA Coach : Charge réajustée. La sortie longue est réduite (-30% D+) pour favoriser la récupération.";
      updatedSessions = updatedSessions.map(s => {
        if (s.type.toLowerCase().includes('longue') || s.type.toLowerCase().includes('spécifique') || s.type.toLowerCase().includes('qualité')) {
          return { ...s, duration: '1h15', elevation: '150m D+', desc: 'Séance raccourcie pour éviter le surentraînement.' };
        }
        return s;
      });
    } else if (status === 'injured') {
      feedback = "IA Coach : Alerte gêne/douleur. Les séances à impact au sol sont remplacées par du Cross-Training.";
      updatedSessions = updatedSessions.map(s => {
        if (!s.completed) return { ...s, type: 'Cross-Training', title: 'Vélo / Home-Trainer', elevation: '0m D+', desc: 'Effort fluide sans impact au sol.' };
        return s;
      });
    } else {
      feedback = "IA Coach : Forme optimale confirmée. Le programme reste inchangé.";
    }

    setAiFeedback(feedback);
    setCurrentWeek(prev => ({ ...prev, sessions: updatedSessions }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                TrailFit AI
              </span>
              <span className="text-xs text-slate-500 block">Coaching intelligent & D+</span>
            </div>
          </div>

          <nav className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Tableau de bord
            </button>
            <button 
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'generator' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Générer un Plan
            </button>
          </nav>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Gemini AI : Connecté</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Objectif (J-{profile.weeksRemaining * 7})
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                    {profile.targetRace} — {profile.targetDistance} km / {profile.targetElevation}m D+
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Semaine {currentWeek.number} sur {currentWeek.totalWeeks || profile.weeksRemaining} : <span className="text-slate-200 font-medium">{currentWeek.phase}</span> — {currentWeek.focus}
                  </p>
                </div>

                <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <div className="text-xs text-slate-500">Volume</div>
                    <div className="text-lg font-bold text-white">{currentWeek.targetKm} km</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">D+ Prévu</div>
                    <div className="text-lg font-bold text-emerald-400">{currentWeek.targetDPlus}m</div>
                  </div>
                </div>
              </div>

              {/* Navigation entre Semaines */}
              <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between items-center text-xs">
                <button
                  disabled={currentWeek.number <= 1 || isLoading}
                  onClick={() => loadWeek(currentWeek.number - 1)}
                  className="flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 px-3 py-1.5 rounded-xl font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Semaine précédente
                </button>

                <span className="font-bold text-slate-300">
                  {isLoading ? 'Génération en cours...' : `Semaine ${currentWeek.number}`}
                </span>

                <button
                  disabled={currentWeek.number >= (currentWeek.totalWeeks || profile.weeksRemaining) || isLoading}
                  onClick={() => loadWeek(currentWeek.number + 1)}
                  className="flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 px-3 py-1.5 rounded-xl font-medium text-emerald-400"
                >
                  Semaine suivante <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Programme de la Semaine
                </h2>

                <div className="space-y-3">
                  {currentWeek.sessions.map((session) => (
                    <div 
                      key={session.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        session.completed 
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-75' 
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 mr-2">
                            {session.day}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {session.type}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => toggleSession(session.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                            session.completed 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {session.completed ? 'Terminée' : 'Marquer faite'}
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{session.title}</h3>
                      <p className="text-xs text-slate-400 mb-4">{session.desc}</p>

                      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-300 border-t border-slate-900 pt-3">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> {session.duration}</span>
                        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-slate-500" /> {session.distance}</span>
                        <span className="flex items-center gap-1.5"><Mountain className="w-3.5 h-3.5 text-slate-500" /> {session.elevation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-bold text-white">Ajustement IA</h2>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleAdapt('normal')}
                      className={`w-full p-3 rounded-xl border text-left text-xs ${fatigueStatus === 'normal' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      <Heart className="w-4 h-4 text-emerald-400 mb-1" />
                      <div className="font-bold">En forme</div>
                    </button>

                    <button
                      onClick={() => handleAdapt('fatigued')}
                      className={`w-full p-3 rounded-xl border text-left text-xs ${fatigueStatus === 'fatigued' ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400 mb-1" />
                      <div className="font-bold">Fatigué</div>
                    </button>

                    <button
                      onClick={() => handleAdapt('injured')}
                      className={`w-full p-3 rounded-xl border text-left text-xs ${fatigueStatus === 'injured' ? 'bg-rose-500/10 border-rose-500 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      <Activity className="w-4 h-4 text-rose-400 mb-1" />
                      <div className="font-bold">Gêne / Blessure</div>
                    </button>
                  </div>

                  {aiFeedback && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-300">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>{aiFeedback}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Générer un Plan IA
            </h2>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGeneratePlan} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nom de l'épreuve</label>
                <input 
                  type="text" 
                  value={profile.targetRace} 
                  onChange={(e) => setProfile({...profile, targetRace: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Distance (km)</label>
                  <input 
                    type="number" 
                    value={profile.targetDistance} 
                    onChange={(e) => setProfile({...profile, targetDistance: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Dénivelé Positif (D+)</label>
                  <input 
                    type="number" 
                    value={profile.targetElevation} 
                    onChange={(e) => setProfile({...profile, targetElevation: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Semaines de prépa</label>
                  <input 
                    type="number" 
                    value={profile.weeksRemaining} 
                    onChange={(e) => setProfile({...profile, weeksRemaining: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Séances / semaine</label>
                  <input 
                    type="number" 
                    value={profile.sessionsPerWeek} 
                    onChange={(e) => setProfile({...profile, sessionsPerWeek: Number(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 text-slate-950 font-bold p-3.5 rounded-xl hover:bg-emerald-400 transition-all mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Création du plan par l'IA...
                  </>
                ) : (
                  'Générer mon plan avec Gemini'
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
