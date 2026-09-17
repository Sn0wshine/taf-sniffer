# AGENTS.md

Ce fichier fournit aux agents de code (Codex, Cline, Claude, etc.) le contexte nécessaire pour travailler efficacement dans ce dépôt.

## Aperçu du projet

Taf Sniffer est une application open source de recherche d'emploi : trouver, comparer et comprendre les offres qui correspondent à un profil. Application React/Vite servie par un serveur Node local. Le **mode local sans clé API est la base** : import manuel, extraction déterministe, filtres, classement explicable et sauvegarde locale. Un fournisseur IA peut enrichir la recherche et l'analyse, mais aucune fonctionnalité essentielle ne doit en dépendre.

## Commandes

```bash
npm install          # installation
npm run start:local  # serveur sur http://127.0.0.1:8787/
npm test             # tests (vitest)
npm run build        # tsc -b && vite build
npm run sync:version # synchronisation de la version affichée
```

Vérifier `npm test` et `npm run build` avant de considérer un travail terminé.

## Organisation du code

- `src/` : application React (React 19, TypeScript strict), scoring local, composants UI (`components/`, `views/`, `hooks/`, `utils/`).
- `server/` : proxy local, connecteurs de sources (`scrapers/`), services externes.
- `scripts/` : synchronisation de version, Android/Capacitor, outils locaux.
- `src/__tests__/` et `server/__tests__/` : tests unitaires.
- `docs/` : documentation (GETTING_STARTED, DEVELOPMENT, DEPLOYMENT, ANDROID, PRODUCT, ROADMAP, RELEASE).

## Conventions

- Langue : français pour la documentation, les messages d'interface et les commits.
- Commits : préfixe conventionnel quand c'est pertinent (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Tout changement fonctionnel doit être accompagné d'un test de non-régression (vitest).
- Changements ciblés préférés aux refontes larges.
- Pour une modification d'interface : vérifier le mode responsive et le mode sombre.
- Les styles utilisent des design tokens partagés (espacements, rayons, transitions) ; respecter l'existant.

## Garde-fous stricts

- **Ne jamais** committer une clé API, un fichier `.env`, une donnée personnelle ou le contenu privé d'une annonce.
- Le mode local doit rester fonctionnel **sans clé API** : toute nouvelle intégration externe doit avoir un timeout, une erreur lisible et un fallback local.
- Les connecteurs de sites d'emploi sont *best-effort* : respecter les conditions d'utilisation des sources et conserver une solution d'import manuel en cas d'échec de la collecte automatique.
- Les diagnostics locaux (`diagnostics/`) sont ignorés par Git et ne doivent pas être publiés.

## Ressources

- [CONTRIBUTING.md](CONTRIBUTING.md) — règles de contribution.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — architecture et commandes.
- [docs/RELEASE.md](docs/RELEASE.md) — procédure de release.
- [SECURITY.md](SECURITY.md) — signalement de vulnérabilités (jamais en issue publique).
