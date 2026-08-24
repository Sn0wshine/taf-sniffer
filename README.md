# Taf Sniffer

Prototype MVP pour analyser et classer des offres d'emploi selon un objectif de reconversion.

## Lancer la V1 locale

Lancer :

```text
npm run start:local
```

Si PowerShell bloque `npm.ps1`, utiliser :

```text
npm.cmd run start:local
```

Puis ouvrir :

```text
http://127.0.0.1:8787/
```

Taf Sniffer fonctionne alors en local avec recherche publique best-effort, import manuel, scoring, session de recherche et sauvegarde.
Le mode simple ajoute aussi des filtres decisionnels apres recherche : contrat souhaite, offres faibles masquees par defaut, bilan des ecarts et ligne `Criteres` dans le detail d'offre.
Le classement est IA-first : quand Gemini fournit un `aiRankScore` frais, il pilote l'ordre des offres. Le scoring local reste un fallback robuste et un diagnostic explicable, compose de cinq axes : Formation facilitee, Salaire / package, Trajectoire, Employeur et Risque maitrise.

L'historique detaille des versions (assistant IA, cascade Gemini, infobulles coach, compteurs de quota par modele...) est dans [CHANGELOG.md](CHANGELOG.md).

Par défaut, la recherche intelligente est volontairement large :

```text
orthographes proches
accents présents ou absents
abréviations comme immo / immobilier
intitulés voisins comme technicien DPE ou audit énergétique junior
variantes de zone comme région parisienne / Île-de-France / départements IDF
variantes d'expérience comme débutant, junior, reconversion ou confirmé
```

Si le champ `Zone` est vide, Taf Sniffer cherche sur toute la France.

Le bouton `Rechercher et sortir le Top 3` tente de lire les offres publiques visibles sans connexion sur :

```text
France Travail
Hellowork
Indeed
LinkedIn
Jooble
Apec
Meteojob
Welcome to the Jungle
Jobijoba
Talent.com
Optioncarriere
```

Certains sites peuvent bloquer ou changer leur HTML. Dans ce cas Taf Sniffer garde l'import manuel.

### API officielle France Travail optionnelle

L'API officielle France Travail peut nécessiter des identifiants d'application.
Ce ne sont pas tes identifiants personnels France Travail, mais des clés développeur.

Si tu veux tester cette source officielle, copier `.env.example` en `.env`, puis remplir :

```text
FRANCE_TRAVAIL_CLIENT_ID=...
FRANCE_TRAVAIL_CLIENT_SECRET=...
```

Sans `.env`, l'app reste utilisable avec les connecteurs publics et l'import manuel.

### Diagnostics et logs

Le serveur local ecrit des diagnostics dans `diagnostics/` :

```text
YYYY-MM-DD.server.jsonl   requetes, routes, statuts, durees
YYYY-MM-DD.search.jsonl   recherches publiques, sources bloquees, offres trouvees
YYYY-MM-DD.ai.jsonl       appels Gemini, modele utilise, fallback, quota/erreur
YYYY-MM-DD.error.jsonl    erreurs proxy courtes
```

Chaque ligne est un JSON compact. Les logs ne contiennent pas de cle API ni de texte brut d'annonce.
L'etat courant est consultable via :

```text
http://127.0.0.1:8787/api/diagnostics
```

Options `.env` :

```text
TAF_SNIFFER_LOGS=off
TAF_SNIFFER_LOG_RETENTION_DAYS=14
```

## Entree locale

Le serveur local sert maintenant le build React recent sur `/`.
`taf-sniffer.html` redirige vers cette entree pour eviter de revenir sur l'ancien prototype statique.

Fonctions disponibles :

```text
réglages de stratégie
roue d'options : IA Top 10, IA complete ou Local rapide
recherche intelligente
zone intelligente avec suggestions
salaire net mini en mode simple
comparaison salaire IA a parametres egaux quand Gemini est disponible
critère expérience en mode simple
critere contrat souhaite en mode simple
bilan decisionnel apres recherche
masquage des offres faibles dans le filtre A traiter
import d'une ou plusieurs annonces
analyse locale sans API
Top 3 argumenté
classement dans le panneau droit
détail de l'offre sélectionnée dans le panneau gauche
ligne Criteres dans le detail : Dans les criteres, A creuser ou Ecartee
bloc Infos extraites avec correction rapide
fiche entreprise semi-auto a la demande
extraction salaire : brut / net / non precise
presence de primes ou variable
temps de travail : 35H / 39H / temps partiel si detecte
statut extraction : OK, a verifier, corrigee manuellement
favoris / ignorées
statuts de tri : à traiter / à creuser / favori / ignorée
résumé de session après recherche
questions à poser
score expliqué
score local detaille par axes : formation facilitee, salaire / package, trajectoire, employeur, risque maitrise
score de confiance
types d'offre : tremplin, strategique, cashflow, piege
edition d'une annonce et corrections d'extraction
export Markdown dans le presse-papiers
banc de validation visible dans l'app
collecte semi-manuelle avec mots-clés et liens de recherche
export/import JSON complet
proxy local multi-sources
```

Les clés API du proxy local, si tu en utilises, restent dans `.env`. Une clé Gemini locale peut aussi être saisie manuellement dans les options pour le secours mobile : elle reste dans le stockage local de l'appareil, n'est pas exportée en JSON et n'est pas réaffichée en clair.

Le proxy lit aussi l'en-tête `x-gemini-api-key` envoyé par l'app sur `/api/ai/*` : si une clé Gemini locale est configurée dans l'app, le proxy l'utilise en priorité pour les appels Gemini et préserve ainsi le quota de la clé `.env` du serveur.

## Collecte semi-manuelle

Le panneau `Collecte réelle` aide à constituer un jeu de 10 à 20 annonces sans scraping.

Flux recommandé :

```text
1. Copier les mots-clés générés ou ouvrir un lien de recherche.
2. Chercher sur France Travail, Indeed, Hellowork, LinkedIn, Jooble, Apec, Meteojob, Welcome to the Jungle, Jobijoba, Talent.com, Optioncarriere ou Google.
3. Copier le texte complet d'une annonce.
4. Coller dans Import rapide.
5. Renseigner la source et l'URL si besoin.
6. Analyser puis annoter dans Validation réelle.
```

Les annonces issues d’une recherche sont affichées `Recherche`. Les exemples sont affichés `Exemple`.

## Banc de validation

Le panneau `Validation réelle` sert à comparer le jugement humain avec Taf Sniffer.

Flux recommandé :

```text
1. Coller 10 à 20 vraies annonces.
2. Pour chaque annonce, choisir un verdict attendu.
3. Cocher les tags attendus : POEI, formation facilitee, formation, audit, indépendant, salaire flou, débutant accepté, volume.
4. Lire la synthèse : tags manqués, faux positifs, scores fragiles, règles à ajuster.
5. Ajuster les règles de scoring seulement après plusieurs annonces.
```

## Version React

Une base React + Vite + TypeScript est aussi présente pour la suite.

Commandes prevues :

```text
npm install
npm run dev
npm run build
```

Dans cette session, `npm run build` est bloqué par l'exécution du binaire natif `esbuild` via Node (`spawn EPERM`). Le contrôle TypeScript passe avec :

```text
node node_modules\typescript\bin\tsc -b --pretty false
```

Note v0.5.0 : `npm.cmd run build` fonctionne maintenant et produit le dossier `dist`, utilise par Capacitor.

## Chemin Android plus tard

Le chemin recommandé :

```text
1. Stabiliser le MVP web responsive.
2. Utiliser le manifest PWA déjà présent.
3. Servir l'app via un petit serveur local ou un hébergement statique pour activer le service worker.
4. Tester l'installation Android depuis le navigateur.
5. Emballer avec Capacitor si besoin d'une vraie app installée.
```

Cette approche évite de refaire l'interface trop tôt en React Native.

## Android Capacitor actuel

Le socle Capacitor est present :

```text
capacitor.config.ts
android/
```

Commandes utiles :

```text
npm.cmd run android:check
npm.cmd run android:init
npm.cmd run android:sync
npm.cmd run android:open
npm.cmd run android:build:debug
npm.cmd run android:install:debug
```

Etat local observe :

```text
Java 17 : OK
Gradle : OK
Capacitor CLI : OK
Projet android : OK
adb : manquant
ANDROID_HOME / ANDROID_SDK_ROOT : manquants
```

Donc Taf Sniffer a maintenant une base Android ouvrable plus tard. Produire `android/app/build/outputs/apk/debug/app-debug.apk` demandera Android Studio ou le SDK Android configure.
Le script `android:build:debug` refuse proprement de lancer Gradle si le SDK est absent.
L'APK debug est seulement fait pour un test local ; ce n'est pas une version Play Store ni une release signee.

Important : l'app Android emballe le web. La recherche automatique via proxy local ne sera fiable sur telephone que si un backend/proxy joignable depuis le telephone existe. Pour Gemini, le menu Options permet de saisir une cle locale utilisee seulement quand le proxy IA n'est pas disponible. L'import manuel, l'analyse locale et les donnees locales restent le filet de securite.

## Proxy Android autonome rapide

Le plus simple pour tester une recherche automatique Android autonome est de deployer `server.mjs` comme petit service web Node, puis de rebuilder l'APK avec son URL HTTPS.

Flux Render recommande :

```text
1. Pousser le projet sur GitHub.
2. Creer un nouveau service Render depuis le repo.
3. Laisser Render lire `render.yaml`.
4. Renseigner au minimum GEMINI_API_KEY.
5. Renseigner FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET si tu veux l'API officielle.
6. Attendre l'URL publique, par exemple https://taf-sniffer-proxy.onrender.com.
7. Mettre VITE_ANDROID_PROXY_BASE=https://taf-sniffer-proxy.onrender.com dans .env.
8. Rebuilder l'APK avec npm.cmd run android:build:debug.
```

Sans `VITE_ANDROID_PROXY_BASE`, Android passe en mode manuel guide : Gemini prepare les recherches, mais l'import automatique d'offres est remplace par des liens a ouvrir et un collage dans Analyse express.

## IA plus tard

Le MVP utilise un scoring local par règles.

Plus tard, une API IA peut être branchée derrière une couche provider. Une première interface existe dans `src/aiProvider.ts`.

```text
Gemini
OpenAI
Mistral
Claude
mode local
```

L'IA doit aider à lire et structurer les annonces. Taf Sniffer doit garder le contrôle du scoring final.
