# Développement

## Organisation

- `src/` : application React, scoring local, profils et composants UI.
- `server/` : proxy local, sources publiques et services externes.
- `scripts/` : synchronisation de version, Android et outils locaux.
- `src/__tests__/` et `server/__tests__/` : tests unitaires et serveur.

## Commandes

```bash
npm run dev
npm run start:local
npm test
npm run build
npm run sync:version
```

Le mode local doit rester fonctionnel sans clé API. Toute nouvelle intégration externe doit avoir un timeout, une erreur lisible et un fallback local.

## Contributions

Voir [CONTRIBUTING.md](../CONTRIBUTING.md). Les changements fonctionnels doivent inclure un test de non-régression lorsque cela est possible.
