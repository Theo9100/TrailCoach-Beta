# TrailCoach (bêta)

Application web de préparation trail : un programme d'entraînement sur mesure, calculé localement **sans IA ni serveur**.

## Fonctionnalités

- **Mon Programme** : plan complet jusqu'au jour J, découpé en 4 phases (Foncier → Développement → Spécifique → Affûtage) avec semaines d'assimilation. Chaque séance donne la distance, le D+, la durée estimée et les allures/FC cibles calculées depuis votre VMA et votre FC max. Ajustement de charge selon la forme (en forme / fatigué / épuisé).
- **Mes Séances & GPX** : récupération automatique des sorties depuis Intervals.icu, ou import de fichiers GPX (distance, D+/D−, temps en mouvement, allure, FC, profil d'altitude). L'activité est rattachée automatiquement à la séance du même jour, avec un score de conformité.
- **Plan personnalisé** : le questionnaire demande le volume couru actuellement, le nombre de sorties, l'âge et une éventuelle blessure récente. Le plan part de ce volume, monte d'environ 10 % par semaine au maximum (moins après 50 ans ou après une blessure), ajoute les séances progressivement et affiche des mises en garde adaptées.
- **Adaptation** : recalage automatique après une semaine peu suivie, séances déplaçables, courses de préparation, week-ends choc (ultras), ressenti après séance.
- **Renforcement** : une séance hebdomadaire avec exercices animés, sur 3 paliers de difficulté qui montent au fil du programme (bases, travail sur une jambe, sauts et descentes freinées). Une séance guidée en plein écran enchaîne les exercices, les récupérations et les chronos.
- **Séances bonus** : bibliothèque de 12 séances de renforcement facultatives (excentrique, pliométrie, haut du corps, gainage, chevilles, force en côte, mobilité), à piocher les jours où l'on a du temps. Chacune est recommandée, possible ou déconseillée selon la phase, la semaine d'assimilation, la forme signalée, le profil de la course et les séances clés du jour et du lendemain.
- **Jour J** : temps de passage par section, plan de nutrition, liste de matériel, tracé du parcours. L'estimation s'affine d'après les vraies sorties longues en dénivelé.
- **Suivi** : score de suivi, courbe de charge réalisé / prévu, estimation de VMA et test de VMA guidé (6 minutes, avec chrono).
- **Bilan** : après la course, récapitulatif de la préparation (volume, dénivelé, régularité, temps réalisé face au temps estimé), puis enchaînement vers un nouvel objectif.
- **Carte de partage** : image d'une semaine, d'une séance ou du bilan, à publier sur Strava ou Instagram.
- **Tracé de la course** : import facultatif du GPX du parcours dans le questionnaire ou le profil (distance et D+ remplis automatiquement, profil et montées analysés).
- **Profil** : modification du profil (le programme se recalcule) et zones d'entraînement personnalisées.
- **Compte** : connexion par e-mail et mot de passe, et sauvegarde automatique en ligne, pour retrouver son programme sur tous ses appareils. Facultatif : l'app reste utilisable sans compte.
- **Réglages** : guide animé pour relier la montre via Intervals.icu, thème clair/sombre/système, export et restauration des données, réinitialisation.

## Envoi des séances sur la montre

Les séances sont envoyées dans le calendrier [Intervals.icu](https://intervals.icu), qui les synchronise avec la montre (Suunto, Garmin, Coros…).

1. Créer un compte Intervals.icu et y relier sa montre (Settings → Connections, activer l'envoi des séances planifiées).
2. Copier sa clé API (Settings → Developer Settings).
3. La coller dans TrailCoach → Réglages → Montre connectée.

Une fois connecté, TrailCoach récupère aussi les sorties course/trail/rando (au lancement et via « Synchroniser »), les rattache aux séances prévues et calcule un **score de suivi du plan** : régularité (50 %), conformité séance ↔ sortie (30 %) et volume (20 %). Les sorties importées dans Intervals.icu depuis Strava ne sont pas accessibles par son API.

Les appels passent par la fonction Vercel `api/intervals.js`, un simple relais qui évite les blocages CORS du navigateur. La clé reste dans le navigateur de l'utilisateur et n'est jamais stockée côté serveur.

Les données sont stockées dans le navigateur (`localStorage`).

## Sauvegarde en ligne (Supabase)

Facultative : sans configuration, l'app fonctionne comme avant, tout reste dans le navigateur.

1. Créer un projet sur [supabase.com](https://supabase.com) (région Europe).
2. SQL Editor → coller le contenu de `supabase/schema.sql` → Run. Le script crée la table `user_data`, les règles « chacun ne voit que ses données » et la fonction de suppression de compte.
3. Authentication → URL Configuration : mettre l'adresse de l'app (ex. `https://trailcoach.vercel.app`) dans « Site URL » et l'ajouter aux « Redirect URLs ». Les liens de confirmation d'adresse et de mot de passe oublié y renvoient.
4. Les modèles d'e-mails par défaut suffisent : l'e-mail ne sert qu'à confirmer l'adresse à la création du compte et à réinitialiser le mot de passe. La connexion se fait ensuite par mot de passe, y compris dans l'app installée sur iPhone.
5. Vercel → Settings → Environment Variables : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `.env.example`), puis redéployer.

Fonctionnement : chaque modification est enregistrée sur l'appareil puis envoyée 1,5 s plus tard. À l'ouverture, au retour du réseau et quand l'app revient au premier plan, les blocs modifiés ailleurs sont récupérés ; en cas de modification des deux côtés, la plus récente l'emporte. La clé API Intervals.icu, le thème et l'onglet ouvert ne quittent jamais l'appareil.

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
  lib/intervals.js   envoi des séances et récupération des sorties (Intervals.icu)
  lib/score.js       score de suivi du plan
  lib/exercises.js   exercices de renforcement, paliers de difficulté, déroulé de la séance guidée
  lib/bonus.js       bibliothèque de séances bonus et recommandations
  lib/pose.js        animation des exercices (enchaînement des postures, membres de longueur constante)
  lib/raceplan.js    plan de course, nutrition, estimation affinée par les sorties
  lib/recap.js       bilan de fin de préparation
  lib/sharecard.js   dessin des cartes de partage (canvas)
  lib/storage.js     persistance localStorage, export/import, suivi des modifications à envoyer
  lib/cloud.js       compte et synchronisation en ligne (Supabase)
supabase/schema.sql  table, règles d'accès et suppression de compte, à exécuter dans Supabase
  lib/format.js      dates, allures, durées
  components/        onglets et composants d'interface
```
