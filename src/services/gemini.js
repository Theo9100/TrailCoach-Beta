const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateTrailPlan(profile) {
  if (!GEMINI_API_KEY) {
    throw new Error("Clé API Gemini manquante dans Vercel (VITE_GEMINI_API_KEY).");
  }

  const prompt = `
Tu es un entraîneur expert en trail et ultra-trail.
Génère un plan d'entraînement sur-mesure au format JSON strict, sans texte autour et sans balises markdown (pas de \`\`\`json).

Profil du coureur :
- Nom : ${profile.name}
- Objectif : ${profile.targetRace} (${profile.targetDistance} km, ${profile.targetElevation}m D+)
- Temps restant : ${profile.weeksRemaining} semaines
- Niveau : ${profile.level} (VMA: ${profile.vma} km/h)
- Séances par semaine : ${profile.sessionsPerWeek}

Génère la première semaine de préparation avec la structure JSON exacte suivante :
{
  "number": 1,
  "phase": "Foncier & Reprise",
  "focus": "Développement de l'endurance de base et PPG",
  "targetKm": 38,
  "targetDPlus": 850,
  "sessions": [
    {
      "id": 1,
      "day": "Mardi",
      "type": "Relâchement",
      "title": "Footing Endurance Fondamentale",
      "duration": "50 min",
      "distance": "8 km",
      "elevation": "100m D+",
      "desc": "Aisance respiratoire totale.",
      "completed": false
    }
  ]
}
`;

  // Utilisation de gemini-2.5-flash
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Erreur API Gemini (${response.status}) : ${errorData.error?.message || 'URL ou clé invalide'}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText);
}
