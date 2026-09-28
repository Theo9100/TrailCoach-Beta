const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateTrailPlan(profile, weekNumber = 1) {
  if (!GEMINI_API_KEY) {
    throw new Error("Clé API Gemini manquante dans Vercel (VITE_GEMINI_API_KEY).");
  }

  const prompt = `
Tu es un entraîneur expert en trail et ultra-trail.
Génère la SEMAINE ${weekNumber} sur un total de ${profile.weeksRemaining} semaines de préparation au format JSON strict (sans balises markdown).

Profil du coureur :
- Nom : ${profile.name}
- Objectif : ${profile.targetRace} (${profile.targetDistance} km, ${profile.targetElevation}m D+)
- Temps total de prépa : ${profile.weeksRemaining} semaines
- Semaine actuelle à générer : Semaine ${weekNumber}
- Niveau : ${profile.level} (VMA: ${profile.vma} km/h)
- Séances par semaine : ${profile.sessionsPerWeek}

Règles de progression :
- Semaines 1 à ${Math.floor(profile.weeksRemaining * 0.4)} : Phase Foncier (Endurance, PPG, volume progressif +10%/sem).
- Semaines ${Math.floor(profile.weeksRemaining * 0.4) + 1} à ${profile.weeksRemaining - 1} : Phase Spécifique (Rando-course, blocs d'allure cible, D+ max).
- Semaine ${profile.weeksRemaining} : Phase Affûtage (Baisse de volume de 50%, fraîcheur avant la course).
- Applique une semaine d'assimilation (charge réduite) toutes les 3 semaines.

Génère la semaine ${weekNumber} au format JSON exact suivant :
{
  "number": ${weekNumber},
  "totalWeeks": ${profile.weeksRemaining},
  "phase": "Nom de la phase",
  "focus": "Objectif principal de cette semaine",
  "targetKm": 42,
  "targetDPlus": 1100,
  "sessions": [
    {
      "id": 1,
      "day": "Mardi",
      "type": "Qualité / EF / Longue / PPG",
      "title": "Titre de la séance",
      "duration": "1h15",
      "distance": "12 km",
      "elevation": "300m D+",
      "desc": "Description concise des blocs et conseils.",
      "completed": false
    }
  ]
}
`;

  // Liste des modèles par ordre de préférence
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );

        if (response.status === 503) {
          // Si le serveur est saturé, on attend 1,5 seconde avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        if (!response.ok) {
          break; // Passer au modèle suivant si l'erreur n'est pas un 503
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText);
      } catch (err) {
        if (attempts >= maxAttempts) break;
      }
    }
  }

  throw new Error("Les serveurs sont actuellement surchargés. Veuillez réétenter dans quelques instants.");
}
