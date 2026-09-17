# Message pour le futur Codex

Date : 2026-06-03

## Contexte rapide

Le projet est `Taf Sniffer`, dans `G:\Logiciel\Taf sniffer`. Version actuelle : `0.820`.
L'utilisateur travaille en iteratif, en francais, et prefere qu'on pose beaucoup de questions en mode plan, mais en mode execution il attend qu'on avance concretement.

## Etat produit recent

- L'app est une React/Vite servie par `server.mjs` sur `http://127.0.0.1:8787/`.
- Mode par defaut : `Assistant IA`.
- Mode analyse par defaut : `IA complete`.
- Cascade Gemini actuelle : `gemini-3.5-flash`, puis `gemini-3.1-flash-lite`, puis `gemini-2.5-flash-lite`.
- Le classement est IA-first : `aiRankScore` pilote le tri quand il est disponible et frais.
- Le scoring local vient d'etre refondu en fallback robuste par axes :
  - Formation facilitee
  - Salaire / package
  - Trajectoire
  - Employeur
  - Risque maitrise
- Les anciens champs `training`, `cashflow`, `audit` restent en alias de compatibilite dans `JobAnalysis.scores`.
- La detection formation facilitee vient d'etre enrichie : POEI, POE, POEC, POEIC, AFPR, formation prealable, formation prise en charge, OPCO, France Travail, CPF, certification financee.
- Correction recente : `Mensuel de 2500 Euros sur 12 mois` ne doit plus produire une plage absurde `1 EUR - 163 EUR`.

## Dernieres modifications documentees

- `CHANGELOG.md` contient les changements recents en `Unreleased`.
- `README.md` a ete aligne sur scoring IA-first, axes locaux et formation facilitee large.
- `../ROADMAP.md` porte désormais la roadmap publique ; les notes historiques sont dans `../archive/ROADMAP-HISTORY.md`.

## Navigateur integre

Le plugin Browser a ete demande via `[@Navigateur]`, mais la connexion a echoue deux fois avec :

```text
privileged native pipe bridge is not available; browser-client is not trusted
```

Si l'utilisateur a reset le cache Codex ou reautorise le navigateur, retenter avec le skill Browser avant tout fallback.

## Prochaine demande probable

L'utilisateur voulait faire une passe pour rendre l'affichage des resultats plus joli, en commencant par un audit visuel.
Audit preliminaire deja donne :

1. Le detail d'offre a trop de cartes imbriquees.
2. Le score hero + les 5 metriques prennent trop de place.
3. Le bloc salaire normalise est utile mais trop dense.
4. Les infos extraites restent trop "tableau de debug".
5. Trop de badges/chips au meme niveau visuel.
6. Le rail/liste est globalement correct mais peut etre allege.

Patch recommande :

1. Refaire le hero detail : score mieux integre, metriques locales compactees.
2. Refaire le bloc salaire : fixe net/mois prioritaire, taux horaire et package en secondaire.
3. Refaire les infos extraites : lignes de fiche legeres au lieu de mini-cartes.

## Commandes utiles

```text
npm.cmd run build
node --check server.mjs
npm.cmd run start:local
```

Ne pas exposer `.env` ni `GEMINI_API_KEY`.
