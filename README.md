# Taf Sniffer

[![CI](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml/badge.svg)](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Taf Sniffer est une application open source de recherche d’emploi. Elle aide à trouver, importer, comparer et comprendre des offres selon un métier, une zone et des critères choisis par l’utilisateur.

L’application fonctionne en **mode local sans clé API** : import manuel, extraction déterministe, filtres, classement explicable et sauvegarde locale. Un fournisseur IA peut enrichir la recherche et l’analyse lorsqu’une clé API est configurée.

## Démarrage rapide

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run start:local
```

Ouvrir <http://127.0.0.1:8787/>.

Vérifier l’installation :

```bash
npm test
npm run build
```

## Utiliser Taf Sniffer

1. Depuis le tableau de bord, lancer une recherche guidée.
2. Renseigner un métier ou des mots-clés, une zone et les conditions utiles.
3. Consulter les offres classées en mode local ou enrichies par IA.
4. Importer manuellement une annonce si une source externe est bloquée.
5. Corriger les informations extraites et conserver les offres intéressantes.

La clé API est facultative. Elle est configurée dans **Options** avec le fournisseur et, si nécessaire, l’URL d’un endpoint compatible OpenAI. Gemini reste le fournisseur serveur actuellement intégré ; l’interface prépare l’ajout d’autres adaptateurs sans imposer Gemini au produit. Sans clé, les fonctions essentielles restent disponibles.

## Sources et limites

Les connecteurs de sites d’emploi sont best-effort : leur HTML, leurs quotas, leurs robots et leurs conditions d’utilisation peuvent changer. Taf Sniffer ne garantit pas l’exhaustivité des offres. Respecter les conditions de chaque source et vérifier toute information avant de candidater.

Les annonces et réglages sont conservés localement par défaut. Ne jamais versionner une clé API, un fichier `.env`, une donnée personnelle ou le contenu privé d’une annonce.

## Développement et documentation

- [Démarrage et premier parcours](docs/GETTING_STARTED.md)
- [Développement, architecture et tests](docs/DEVELOPMENT.md)
- [Android / Capacitor](docs/ANDROID.md)
- [Déploiement serveur](docs/DEPLOYMENT.md)
- [Produit et principes](docs/PRODUCT.md)
- [Roadmap publique](docs/ROADMAP.md)
- [Contribuer](CONTRIBUTING.md)
- [Sécurité](SECURITY.md)
- [Historique détaillé](docs/archive/CHANGELOG-HISTORY.md)

## Licence

[MIT](LICENSE).
