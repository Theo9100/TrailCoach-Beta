import React, { useState } from 'react';
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
  User,
  Radio
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fatigueStatus, setFatigueStatus] = useState('normal');
  const [aiFeedback, setAiFeedback] = useState('');
  
  // Profil utilisateur
  const [profile, setProfile] = useState({
    name: 'Alexandre',
    targetRace: 'Maratrail du Ventoux',
    targetDistance: 42,
    targetElevation: 2100,
    weeksRemaining: 8,
    level: 'Intermédiaire',
    vma: 15.5,
    sessionsPerWeek: 4
  });

  // Programme de la semaine en cours
  const [currentWeek, setCurrentWeek] = useState({
    number: 8,
    phase: 'Spécifique Trail',
    focus: 'Assimilation du D+ et travail d\'allure spécifique',
    targetKm: 48,
    targetDPlus: 1650,
    sessions: [
      {
        id: 1,
        day: 'Mercredi 15 Avril',
        type: 'Qualité : Côtes',
        title: '10x 1\' Côte Raide (200m D+)',
        duration: '1h20',
        distance: '12 km',
        elevation: '350m D+',
        desc: 'Echauffement 20 min. 10 accélérations en montée raide (effort 90% VMA). Récupération descente au pas.',
        completed: true,
        category: 'quality'
      },
      {
        id: 2,
        day: 'Jeudi 16 Avril',
        type: 'Relâchement',
        title: 'Footing Endurance Fondamentale',
        duration: '1h00',
        distance: '10 km',
        elevation: '100m D+',
        desc: 'Aisance respiratoire totale (Zone 1-2). Ne pas chercher la vitesse.',
        completed: true,
        category: 'ef'
      },
      {
        id: 3,
        day: 'Samedi 18 Avril',
        type: 'Spécifique',
        title: 'Rando-Course en Montagne',
        duration: '2h00',
        distance: '14 km',
        elevation: '700m D+',
        desc: 'Alternance marche active dans les pentes >10% et course fluide. Test du matériel et nutrition J-28.',
        completed: false,
        category: 'trail'
      },
      {
        id: 4,
        day: 'Dimanche 19 Avril',
        type: 'Sortie Longue',
        title: 'Sortie Vallonnée avec Blocs Allure',
        duration: '2h45',
        distance: '22 km',
        elevation: '500m D+',
        desc: 'Incluant 2 x 20 min à allure cible trail en terrain vallonné. Hydratation tous les 15 min.',
        completed: false,
        category: 'long'
      }
    ]
  });

  // Basculement de l'état d'une séance (réalisée / à faire)
  const toggleSession = (id) => {
    setCurrentWeek(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  // Ajustement IA dynamique
  const handleAdapt = (status) => {
    setFatigueStatus(status);
    let feedback = '';
    let updatedSessions = [...currentWeek.sessions];

    if (status === 'fatigued') {
      feedback = "IA Coach : Charge réajustée. La sortie longue du dimanche est réduite de 2h45 à 1h45 (-30% D+) pour privilégier la surcompensation et éviter le surentraînement.";
      updatedSessions = updatedSessions.map(s => {
        if (s.id === 3) return { ...s, type: 'Récupération', title: 'Repos Actif / Mobilité', duration: '40 min', distance: '0 km', elevation: '0m D+', desc: 'Mobilisation articulaire et rouleau de massage.' };
        if (s.id === 4) return { ...s, duration: '1h45', distance: '15 km', elevation: '300m D+', desc: 'Volume écourté. Reste en endurance fondamentale sans blocs d\'allure.' };
        return s;
      });
    } else if (status === 'injured') {
      feedback = "IA Coach : Alerte gêne/douleur. Suppression des séances à impact au sol. Remplacement par du Cross-Training (Vélo/Nage) sur 5 jours.";
      updatedSessions = updatedSessions.map(s => {
        if (!s.completed) return { ...s, type: 'Cross-Training', title: 'Vélo de route ou Home-Trainer', duration: '1h15', distance: '0 km', elevation: '0m D+', desc: 'Moulinage fluide, fréquence cardiaque maintenue en Zone 2.' };
        return s;
      });
    } else {
      feedback = "IA Coach : Forme optimale confirmée. Le programme reste inchangé. Poursuis ta préparation !";
    }

    setAiFeedback(feedback);
    setCurrentWeek(prev => ({ ...prev, sessions: updatedSessions }));
  };

  const completedCount = currentWeek.sessions.filter(s => s.completed).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Barre de navigation supérieure */}
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
              <span>Suunto : Synchronisé</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
              AL
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* Banner Objectif */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 relative z-10">
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Objectif Principal (J-{profile.weeksRemaining * 7})
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                    {profile.targetRace} — {profile.targetDistance} km / {profile.targetElevation}m D+
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Semaine {currentWeek.number} : <span className="text-slate-200 font-medium">{currentWeek.phase}</span> — {currentWeek.focus}
                  </p>
                </div>

                <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <div className="text-xs text-slate-500">Volume Vise</div>
                    <div className="text-lg font-bold text-white">{currentWeek.targetKm} km</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">D+ Prévu</div>
                    <div className="text-lg font-bold text-emerald-400">{currentWeek.targetDPlus}m</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Complété</div>
                    <div className="text-lg font-bold text-teal-300">{completedCount} / {currentWeek.sessions.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout 2 colonnes (Séances + Ajustement IA) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Colonne Gauche : Fil des séances */}
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
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
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
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                            session.completed 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
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

              {/* Colonne Droite : Module d'Ajustement IA */}
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-bold text-white">Ajustement IA en Direct</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Indique ton niveau de fatigue actuel pour recalculer instantanément le volume de fin de semaine.
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleAdapt('normal')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-3 ${
                        fatigueStatus === 'normal' 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold">En pleine forme</div>
                        <div className="text-[10px] text-slate-500">Conserver le plan initial</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAdapt('fatigued')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-3 ${
                        fatigueStatus === 'fatigued' 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">Fatigué / Manque de temps</div>
                        <div className="text-[10px] text-slate-500">Alléger la sortie longue (-30%)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAdapt('injured')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-3 ${
                        fatigueStatus === 'injured' 
                          ? 'bg-rose-500/10 border-rose-500 text-rose-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold">Gêne ou Douleur</div>
                        <div className="text-[10px] text-slate-500">Bascule automatique en Cross-Training</div>
                      </div>
                    </button>
                  </div>

                  {aiFeedback && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-300">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">{aiFeedback}</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Onglet Générateur de Plan */
          <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Générateur de Plan sur-Mesure
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Configure ton prochain objectif pour adapter le moteur de calcul.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); setActiveTab('dashboard'); }} className="space-y-4 text-xs">
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

              <button 
                type="submit"
                className="w-full bg-emerald-500 text-slate-950 font-bold p-3.5 rounded-xl hover:bg-emerald-400 transition-all mt-4"
              >
                Mettre à jour le plan
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
