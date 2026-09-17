# Taf Sniffer

> Rassemble les offres de plusieurs sources, compare leurs conditions et choisis où candidater.

[![CI](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml/badge.svg)](https://github.com/Sn0wshine/taf-sniffer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Taf Sniffer est un agrégateur open source d’offres d’emploi en français. Il rassemble dans une même liste les annonces collectées sur plusieurs sources et les imports manuels, puis aide à les comparer selon ton métier, ta zone et tes priorités. La provenance reste visible pour retrouver la source et vérifier les informations avant de candidater.

**L’analyse locale fonctionne sans clé API.** Importe une annonce, extrais ses informations, ajuste les filtres et conserve les offres utiles. L’IA est facultative : elle peut enrichir la recherche et l’analyse lorsqu’un fournisseur est configuré.

## Ce que tu peux faire

- **Chercher selon tes critères** : métier, mots-clés, zone et conditions recherchées.
- **Comparer et comprendre** : classement explicable, informations extraites modifiables et signaux de vigilance.
- **Mettre les salaires en perspective** : repères calculés à partir des offres déjà analysées, et non d’un baromètre exhaustif du marché.
- **Continuer sans collecte automatique** : import manuel lorsqu’une source externe est indisponible.
- **Garder une base locale** : extraction, classement et sauvegarde sans clé API. La recherche sur les sources externes et les fournisseurs IA nécessitent une connexion.

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

La clé API est facultative. Elle est configurée dans **Options** avec le fournisseur et, si nécessaire, l’URL d’un endpoint compatible. L’IA peut enrichir les requêtes et l’analyse, mais aucune fonctionnalité essentielle ne dépend d’un fournisseur particulier : sans clé, la recherche, l’import et le classement local restent disponibles.

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
