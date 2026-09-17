# Candidature Codex for Open Source

- **Formulaire de dépôt** : <https://openai.com/fr-FR/form/codex-for-oss/>
- **Présentation officielle** : <https://developers.openai.com/codex/codex-for-oss>

---

## Informations générales à renseigner

- **Prénom, nom et e-mail** : saisir les identifiants associés à ton compte ChatGPT / OpenAI.
- **Profil GitHub public** : `Sn0wshine` (<https://github.com/Sn0wshine>)
- **Dépôt public** : <https://github.com/Sn0wshine/taf-sniffer>
- **Rôle dans le projet** : sélectionner « Mainteneur principal » (*Primary maintainer*).
- **Intérêts sélectionnés** :
  - [x] Crédits d'API pour la maintenance
  - [x] Accès conditionnel à Codex Security
- **Identifiant d’organisation OpenAI** : à copier depuis <https://platform.openai.com/settings/organization/general> (ne jamais le consigner dans le code ou les commits).

---

## Réponses au formulaire (Version Française)

*Chaque bloc ci-dessous fait moins de 500 caractères (limite du formulaire). Copier-coller directement les citations.*

### 1. Pourquoi ce dépôt est-il admissible ? *(484 caractères)*

> Taf Sniffer est une initiative civic-tech open source (MIT) dédiée à la transparence du marché de l’emploi en France (France Travail, Apec, etc.). Face à l'opacité et au tracking des plateformes fermées, son architecture « Local-First / Privacy-First » garantit un traitement local sans clé API obligatoire, avec scoring explicable et zéro fuite de données personnelles. Ce projet pose les bases d'un standard libre d'agrégation d'offres d'emploi, conçu pour et par la communauté.

### 2. Comment utiliserez-vous les crédits d’API pour votre projet ? *(498 caractères)*

> Les crédits serviront à automatiser la maintenance critique des connecteurs de données : génération automatique de suites de tests synthétiques pour détecter le drift et les ruptures de structure HTML des sites d'emploi, triage intelligent des échecs de CI et génération des notes de version. Cela fiabilise l'agrégation continue et le moteur de scoring local. Toutes les suggestions générées restent soumises à validation humaine stricte, sur données exclusivement synthétiques et anonymisées.

### 3. Avez-vous d’autres informations à nous communiquer ? *(487 caractères)*

> Le dépôt applique les standards OSS les plus stricts : CI verte (Vitest/TS strict), gabarits d'issues/PR et gouvernance transparente. Un fichier AGENTS.md guide spécifiquement les assistants comme OpenAI Codex avec des garde-fous stricts (zéro secret, respect de la vie privée). Nous sommes également très intéressés par l'accès à Codex Security pour auditer en continu notre proxy local et nos dépendances afin de garantir une sécurité irréprochable aux utilisateurs.

---

## Mirror Answers (English Version)

*For international reviewers at OpenAI. Each field is strictly under 500 characters.*

### Field 1: Why is this repository eligible? *(485 characters)*

> Taf Sniffer is an open-source (MIT) civic-tech initiative dedicated to job market transparency in France (France Travail, Apec). Unlike closed platforms that monetize tracking, its Local-First / Privacy-First architecture ensures 100% offline data processing with explainable deterministic scoring and zero telemetry. It establishes an open, privacy-respecting aggregation and parsing layer for employment data, providing high public-interest value to job seekers and developers.

### Field 2: How will you use the API credits for your project? *(449 characters)*

> Credits will directly automate critical connector maintenance: generating synthetic regression test suites to detect HTML drift across target job boards, automating CI failure triaging, and drafting changelogs. This ensures long-term resilience for multi-source parsing while preserving deterministic local scoring. All AI suggestions will run strictly on synthetic test fixtures and require human maintainer review, maintaining zero data exposure.

### Field 3: Do you have any other information to share? *(433 characters)*

> The repo follows strict OSS hygiene: automated CI (Vitest / strict TypeScript), issue/PR templates, and public roadmap. A dedicated AGENTS.md file configures coding assistants like OpenAI Codex with strict privacy guardrails (never commit secrets or personal data). We also look forward to Codex Security access to continuously audit our local proxy and dependencies, ensuring bank-grade privacy for users handling job listings.

---

## Description courte du projet (pour métadonnées ou champ court)

Agrégateur open source d’offres d’emploi (France Travail, Apec...) : architecture Local-First respectueuse de la vie privée, scoring déterministe explicable sans clé API obligatoire, IA éthique et connecteurs résilients.

---

## Checklist avant soumission

- [x] Dépôt public et accessible sans authentification (<https://github.com/Sn0wshine/taf-sniffer>).
- [x] Release officielle `v0.1.0` publiée.
- [x] CI active et verte sur la branche principale.
- [x] README en français et présentation en anglais (`README.en.md`).
- [x] `AGENTS.md` présent et documenté pour Codex.
- [x] Topics GitHub configurés (`civic-tech`, `privacy-first`, `local-first`...).
- [x] Issues modèles créées (`good first issue`).
- [ ] Récupérer son Organization ID sur OpenAI Platform.
- [ ] Remplir le formulaire en ligne et soumettre.
