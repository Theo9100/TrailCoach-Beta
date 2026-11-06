# TrailCoach (bêta)

Application web de préparation trail : un programme d'entraînement sur mesure, calculé localement **sans IA ni serveur**.

## Fonctionnalités

- **Mon Programme** : plan complet jusqu'au jour J, découpé en 4 phases (Foncier → Développement → Spécifique → Affûtage) avec semaines d'assimilation. Chaque séance donne la distance, le D+, la durée estimée et les allures/FC cibles calculées depuis votre VMA et votre FC max. Ajustement de charge selon la forme (en forme / fatigué / épuisé).
- **Mes Séances & GPX** : import de vrais fichiers GPX (distance, D+/D−, temps en mouvement, allure, FC, profil d'altitude). L'activité est rattachée automatiquement à la séance du même jour, avec un score de conformité.
- **Profil** : modification du profil (le programme se recalcule) et zones d'entraînement personnalisées.
- **Réglages** : connexion de la montre, thème clair/sombre/système, export et restauration des données, réinitialisation.

## Envoi des séances sur la montre

Les séances sont envoyées dans le calendrier [Intervals.icu](https://intervals.icu), qui les synchronise avec la montre (Suunto, Garmin, Coros…).

1. Créer un compte Intervals.icu et y relier sa montre (Settings → Connections, activer l'envoi des séances planifiées).
2. Copier sa clé API (Settings → Developer Settings).
3. La coller dans TrailCoach → Réglages → Montre connectée.

Les appels passent par la fonction Vercel `api/intervals.js`, un simple relais qui évite les blocages CORS du navigateur. La clé reste dans le navigateur de l'utilisateur et n'est jamais stockée côté serveur.

Les données sont stockées dans le navigateur (`localStorage`).

## Développement

```bash
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

## Structure

```
api/intervals.js     relais Vercel vers l'API Intervals.icu
src/
  lib/plan.js        génération du programme (périodisation, séances, zones)
  lib/gpx.js         lecture GPX et comparaison avec la séance prévue
  lib/workout.js     séances structurées (format Intervals.icu)
  lib/intervals.js   envoi des séances vers Intervals.icu
  lib/storage.js     persistance localStorage, export/import
  lib/format.js      dates, allures, durées
  components/        onglets et composants d'interface
```
