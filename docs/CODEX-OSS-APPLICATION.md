# Candidature Codex for Open Source

Brouillon des réponses du formulaire : <https://openai.com/fr-FR/form/codex-for-oss/>

Les champs libres sont limités à **500 caractères**. Les versions anglaises sont fournies car l'équipe OpenAI examine en anglais ; adapter les indicateurs chiffrés au moment de l'envoi (étoiles, téléchargements, utilisateurs).

## Champs du formulaire

| Champ | Réponse |
| --- | --- |
| Nom / Prénom | — |
| E-mail | Adresse associée au compte ChatGPT |
| Nom d'utilisateur GitHub | `Sn0wshine` (profil **public**) |
| URL du dépôt | `https://github.com/Sn0wshine/taf-sniffer` (dépôt **public**) |
| Rôle | Mainteneur principal (seul mainteneur avec droits d'écriture) |
| Intérêts | ChatGPT Pro + Codex, Codex Security, Crédits API |
| ID d'organisation OpenAI | <https://platform.openai.com/settings/organization/general> |

## « Pourquoi ce dépôt est-il admissible ? »

> Taf Sniffer is an open-source job-search assistant for French-speaking job seekers: explainable local scoring, salary benchmarks and risk signals, fully usable without an API key (import, extraction, ranking remain local). It integrates with public job-board sources (France Travail, etc.) through resilient best-effort connectors with documented fallbacks. The maintainer is the sole maintainer and applies as a young but active project playing a niche ecosystem role; adoption metrics: [à compléter : étoiles, téléchargements, utilisateurs].

## « Comment utiliserez-vous les crédits d'API pour votre projet ? »

> Codex would run on pull request review, issue triage and release workflows (changelog, tagging, regression checks), plus security review of the scraped-source connectors — the highest-risk surface of the project. API credits would power maintainer automations: CI failure analysis, dependency and compatibility checks for the React/Vite and Android/Capacitor stacks.

## « Avez-vous d'autres informations à nous communiquer ? » (facultatif)

> The project ships an AGENTS.md so any coding agent (Codex included) can contribute safely: local-first constraints, test requirements and guardrails are documented at the repository root. CI runs tests and build on every push and pull request.

## Avant de soumettre — condition bloquante

- [ ] Le dépôt GitHub est **public** et accessible sans authentification : <https://github.com/Sn0wshine/taf-sniffer>
- [ ] La visibilité du profil GitHub est **publique**
- [ ] Release `v0.1.0` taguée et publiée (voir [RELEASE.md](RELEASE.md))
- [ ] Indicateurs chiffrés à jour dans la justification (étoiles, clones, utilisateurs)

## Pour renforcer le dossier (adoption, indépendant du programme)

- Mettre en avant le projet : description + topics GitHub (`job-search`, `react`, `vite`, `france-travail`, `explainable-ai`), démo en ligne (le dépôt contient déjà `render.yaml`).
- Publier un GIF de démo (`docs/demo.gif`, prévu dans la checklist de publication).
- Activer les Discussions GitHub et étiqueter des `good first issue`.
