# Audit projet Taf Sniffer — 24/08/2026

Audit statique du dépôt Taf Sniffer (v0.821) : architecture, sécurité, qualité de code, tests, hygiène Git et plan d'action priorisé.

> Archive historique : le mécanisme d’intégration de clés au build décrit ci-dessous a depuis été supprimé. Aucune clé, même de debug, ne doit être embarquée côté client. Cela ne révoque pas les clés contenues dans d’anciens artefacts.

---

## 1. Vue d'ensemble

| Élément | Détail |
|---|---|
| Produit | MVP d'analyse/classement d'offres d'emploi pour une reconversion (diagnostiqueur immobilier), IA-first avec fallbacks locaux |
| Frontend | React 19 + Vite 7 + TypeScript 5.9 (`strict: true`) + lucide-react, PWA (`sw.js` + manifest) |
| Backend | Serveur Node natif **sans framework** (`server.mjs`, 138 lignes) + modules `server/` (config, http, static, diagnostics, scrapers, services) |
| Mobile | Capacitor 8 (Android), scripts npm dédiés |
| Tests | Vitest — 3 fichiers, 16 tests, **tous passent** ✅ |
| Typage | `tsc -b` → **0 erreur** ✅ |
| Déploiement prévu | Render (`render.yaml` présent), proxy public pour l'APK Android |

Architecture frontend bien refactorée : `App.tsx` ne fait plus que 392 lignes, la logique est répartie dans `hooks/` (useJobs, useJobSearch, useAiReview, useBackup, useStrategy), `views/`, `components/panels/`, `components/ui/`.

---

## 2. Points forts 👍

1. **Zéro dépendance runtime côté serveur** (Node natif uniquement) : surface d'attaque et empreinte minimales.
2. **Défense en profondeur fonctionnelle** : API officielle France Travail → scraping best-effort → import manuel ; proxy Gemini → clé locale navigateur → scoring local par règles.
3. **Diagnostics soignés** : logs JSONL datés, rétention 14 j configurable, `safeLogText()` masque les clés `AIza…` et `Bearer …` avant écriture.
4. **Quotas Gemini gérés localement** : compteur jour/minute par modèle, cascade de modèles (3.5-flash → 3.1-flash-lite → 2.5-flash-lite).
5. **`.gitignore` correct** : `.env`, `diagnostics/`, SDK locaux, logs, `node_modules`.
6. **Timeouts partout** (5–9 s réseau, 120 s analyse IA) et limite de taille de body (1,5 Mo).
7. **Service worker prudent** : n'intercepte ni `/api/` ni le POST, network-first.
8. **Static serving défendu** : normalisation du chemin, refus de `..`, des dotfiles et de `node_modules`, vérification `startsWith(ROOT)`.

---

## 3. Risques critiques 🔴

### C1 — Clé API Gemini embarquée dans un build client (confirmée dans l'APK)

- `vite.config.ts:10` :
  ```ts
  __TAF_SNIFFER_DEBUG_GEMINI_KEY__: JSON.stringify(env.VITE_DEBUG_GEMINI_KEY || env.GEMINI_API_KEY || "")
  ```
  Le fallback sur `GEMINI_API_KEY` (**le secret serveur**) est injecté tel quel dans chaque bundle via `src/buildFlags.ts` (`embeddedDebugGeminiKey`).
- **Constat factuel** : la chaîne `AIza` (format de clé Google) est présente dans
  `android/app/src/main/assets/public/assets/index-pxmayBAt.js` → l'APK debug déjà buildé contient la clé.
- Le `dist/` actuel est propre uniquement parce que le refactoring a retiré l'import d'`embeddedDebugGeminiKey` (tree-shaking). **Il suffit d'un futur import pour re-fuir la clé** dans la PWA et l'APK suivants.

**Actions**
1. Supprimer toute intégration de clé au build client, y compris `GEMINI_API_KEY` et `VITE_DEBUG_GEMINI_KEY`.
2. Considérer la clé actuelle comme compromise → **la révoquer/rotater** dans Google AI Studio.
3. Rebuild + `npx cap sync android` avant toute redistribution d'APK.

### C2 — Backend non versionné + aucun remote Git

- `git status` : le dossier **`server/` entier est non tracké**, ainsi que `src/hooks/`, `src/views/`, `src/__tests__/`, plusieurs panels/composants UI, `src/server-scrapers.d.ts`. Beaucoup de fichiers modifiés/supprimés non commités.
- `git remote -v` : **aucun remote configuré** → tout l'historique vit sur ce seul disque.
- Conséquence : impossible de restaurer/déployer depuis GitHub (le flux Render documenté dans le README suppose un push GitHub), et risque de perte totale du backend.

**Actions**
1. Commiter immédiatement (inclure `server/`), créer un repo distant privé et pousser.
2. Ajouter `.claude/` au `.gitignore` (contient notamment `.claude/worktrees/` : une copie obsolète complète du projet qui pollue aussi les recherches de code).

### C3 — Proxy sans authentification avec CORS ouvert (`*`)

- `server.mjs:23` et `server/http.mjs` posent `Access-Control-Allow-Origin: *` sur toutes les routes, y compris `/api/ai/*` qui consomme votre quota Gemini.
- Déployé sur Render (`0.0.0.0`), **n'importe quel site web ou script pourra appeler votre proxy** et épuiser les quotas (les limites locales existent mais sont globales au process, pas par client).

**Actions** (avant mise en ligne publique)
- Restreindre l'origine (liste blanche de votre domaine APK/PWA), ou exiger un token partagé simple, ou rate-limit par IP. En local pur (`127.0.0.1`), CORS `*` reste acceptable.


---

## 4. Risques modérés 🟠 / mineurs 🟡

| # | Constat | Recommandation |
|---|---|---|
| M1 | Le client envoie l'en-tête `x-gemini-api-key` (`useAiReview.ts:138`, `useJobSearch.ts:90`) mais **le serveur ne le lit jamais** — feature morte ou contrat cassé | Implémenter la lecture côté `analyzeJobsWithGemini`/`buildAiSearchPlan` (clé client > clé env) ou retirer l'en-tête côté client |
| M2 | Scraping de sites tiers (Apec, Hellowork, Meteojob…) avec rotation de User-Agents pour contourner 403/429 | Fragilité juridique (ToS des sites) et technique (sélecteurs cassent souvent). Assumé « best-effort » mais à garder documenté ; privilégier l'API officielle |
| M3 | `MIME_TYPES` limité (html/js/css/svg/json/webmanifest) : pas d'images → tout futur asset image renverra 404 silencieux | Ajouter `.png/.jpg/.ico/.woff2` si besoin |
| M4 | `decodeURIComponent(requestUrl.pathname)` peut lever `URIError` (URL malformée) → attrapé par le catch global → 502 au lieu de 404 | Try/catch local ou validation |
| M5 | Aucun header de sécurité sur le static (`X-Content-Type-Options`, CSP de base) | Ajouter 2–3 headers, surtout si hébergement public |
| M6 | `serveStatic` lit en synchrone (`readFileSync`) → blocage event loop sur gros fichiers | Acceptable aujourd'hui (dist petit) ; passer en streaming si ça grossit |
| M7 | Quota « jour » Gemini calé sur le timezone du process (`geminiDayKey`), Render = UTC | Mineur, à connaître |
| Q1 | Fichiers XXL restants : `styles.css` **7 826 lignes**, `OfferDetail.tsx` 1 594, `analysis.ts` 1 555, `jobHelpers.ts` 1 489, `SimpleSearchPanel.tsx` 1 115 | Continuer le découpage entamé (styles par vue en priorité) |
| Q2 | Duplication logique métier client/serveur (variants mots-clés, signaux POEI dans `scrapers/utils.mjs` vs `src/utils`) | Mutualiser si ça grossit (module partagé) |
| Q3 | Couverture de tests : uniquement `analysis`, `normalizers`, `search`. Rien sur le serveur (quotas Gemini, static, moteur de recherche) | Vitest peut tester les `.mjs` Node directement ; commencer par `checkGeminiQuota` et `serveStatic` |
| Q4 | `strategy as any` dans `App.tsx:389` | Corriger le typage de `OfferComparisonView` |
| Q5 | `tsconfig.app.json` : `strict` OK mais pas de `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` | Les activer (gain de robustesse gratuit) |
| H1 | Racine polluée : 6 fichiers `server-*.log`, `.claude/worktrees/` (vieille copie complète ~3 400 lignes d'App.tsx) | Nettoyer + gitigner ; déplacer l'historique « depuis la vX.Y » du README vers `CHANGELOG.md` |

---

## 5. Performance

- Recherche : toutes les sources interrogées en parallèle (`Promise.allSettled`) + cooldown 5 min par source + timeout 5 s → bon design résilient.
- Bundle unique (React 19 + lucide) : suffisant à cette échelle ; code-splitting des vues possible plus tard.
- Cache PWA network-first avec fallback offline sur `/`, manifest et icône : correct.

---

## 6. Plan d'action priorisé

| Priorité | Action | Effort |
|---|---|---|
| 🔴 1 | Retirer le fallback `GEMINI_API_KEY` de `vite.config.ts` + **rotater la clé** chez Google | ~30 min |
| 🔴 2 | Commiter tout (dont `server/`), créer un remote privé, pousser ; gitigner `.claude/` | ~30 min |
| 🟠 3 | Choisir et implémenter la protection du proxy public (token / origine / rate-limit IP) avant Render | ~1–2 h |
| 🟠 4 | Implémenter ou supprimer `x-gemini-api-key` côté serveur | ~30 min |
| 🟡 5 | Nettoyage racine (logs, worktrees) + transfert historique README → CHANGELOG | ~1 h |
| 🟡 6 | Split `styles.css` par vue ; activer flags tsconfig stricts supplémentaires | ~2 h |
| ⚪ 7 | Tests serveur (quotas, static, engine), MIME types supplémentaires, headers sécurité | ~½ j |

---

*Audit réalisé par analyse statique du code + exécution des tests (`vitest run` : 16/16 ✅) et du contrôle de types (`tsc -b` : 0 erreur ✅). La clé API n'a volontairement pas été imprimée dans ce rapport ; seule sa présence dans l'APK a été vérifiée.*
