const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateTrailPlan(profile, weekNumber = 1) {
  if (!GEMINI_API_KEY) {
    throw new Error("Clé API manquante dans Vercel (VITE_GEMINI_API_KEY).");
  }

  const prompt = `
Tu es un entraîneur expert en trail et ultra-trail.
Génère la SEMAINE ${weekNumber} sur un total de ${profile.weeksRemaining} semaines de préparation au format JSON strict (sans texte explicatif, sans balises markdown).

Profil du coureur :
- Nom : ${profile.name}
- Objectif : ${profile.targetRace} (${profile.targetDistance} km, ${profile.targetElevation}m D+)
- Temps total de prépa : ${profile.weeksRemaining} semaines
- Semaine actuelle à générer : Semaine ${weekNumber}
- Niveau : ${profile.level} (VMA: ${profile.vma} km/h)
- Séances par semaine : ${profile.sessionsPerWeek}

Génère la semaine ${weekNumber} au format JSON exact suivant :
{
  "number": ${weekNumber},
  "totalWeeks": ${profile.weeksRemaining},
  "phase": "Foncier & Reprise",
  "focus": "Développement de l'endurance de base et PPG",
  "targetKm": 38,
  "targetDPlus": 850,
  "sessions": [
    {
      "id": 1,
      "day": "Mardi",
      "type": "Endurance",
      "title": "Footing EF & Gainage",
      "duration": "50 min",
      "distance": "8 km",
      "elevation": "120m D+",
      "desc": "Aisance respiratoire totale.",
      "completed": false
    }
  ]
}
`;

  const MODEL_NAME = "gemini-3.8-flash";
  let attempts = 0;
  const maxAttempts = 3;
  let lastError = "Erreur inconnue";

  while (attempts < maxAttempts) {
    try {
      attempts++;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json" 
            }
          })
        }
      );

      if (response.status === 503 || response.status === 429) {
        lastError = `Serveur temporairement indisponible (${response.status})`;
        await delay(2000 * attempts);
        continue;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData.error?.message || `Erreur HTTP ${response.status}`;
        await delay(1500);
        continue;
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        lastError = "Structure de réponse Gemini invalide.";
        await delay(1500);
        continue;
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);

    } catch (err) {
      lastError = err?.message || "Erreur réseau ou d'analyse JSON";
      if (attempts < maxAttempts) {
        await delay(1500);
      }
    }
  }

  throw new Error(`Erreur API (${lastError}). Veuillez réessayer.`);
}
