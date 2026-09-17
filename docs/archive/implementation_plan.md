# Implementation Plan — Refonte UI/UX homogène Taf Sniffer

## Overview

Refonte visuelle homogène de Taf Sniffer : socle de design tokens (espacements, rayons, typographie, transitions), correction de la parité dark mode des composants récents, allègement de la fiche offre (irritants documentés dans FUTURE_CODEX.md), unification des bandeaux et cohérence globale boutons/focus. **Aucun changement de logique métier** : CSS-first avec retouches JSX minimales.

Contexte : styles.css fait ~9 300 lignes et empile des « passes premium » (v0.4.x → v0.824) qui se surchargent. Le toggle dark mode existe (App.tsx lignes 58/145-148/245-252 ; `.dark` en styles.css ~9006) mais les composants récents ont des couleurs codées en dur cassées en sombre.

## Phases

### Phase 1 — Design tokens (socle)
- `:root` : ajouter échelle d'espacement (`--space-1..6` : 4/8/12/16/20/24px), rayons (`--radius-sm 8px`, `--radius-md 12px`, `--radius-lg 16px`, `--radius-pill 999px`), tailles texte (`--text-xs 11px`, `--text-sm 12px`, `--text-md 13px`, `--text-lg 15px`), transitions (`--transition-fast 120ms`, `--transition-base 200ms`)
- `.dark` : compléter les ombres manquantes (`--shadow-premium`, `--shadow-premium-soft`) et surfaces dérivées

### Phase 2 — Parité dark mode (couleurs codées en dur → tokens)
Remplacements ciblés dans styles.css :
- `.employer-ranking` (#f8fafc) / `.employer-winner-metrics span` / `.employer-ranking-row` (#ffffff ×2) / `.comparison-badges span, .comparison-axis-list span` (#ffffff) → var(--surface)/var(--panel)
- `.offer-dashboard` gradient (#ffffff final) → var(--panel)
- `.formation-signals-card` + `.market-banner` (gradients clairs + #ffffff) → versions token-based lisibles en sombre
- `.dashboard-action-row` rgba blanc → surface token
- `.terrain-progress` border #bde1dc → teal translucide

### Phase 3 — Fiche offre (irritants FUTURE_CODEX)
- Hero compacté : paddings/marges via tokens, hiérarchie titre > salaire > méta
- Salaire normalisé : réduire densité (paddings, labels uppercase discrets)
- Infos extraites : items en lignes légères (fond transparent, séparateur) au lieu de mini-cartes blanches
- Chips : hiérarchie visuelle (source/statut en discret, décision/score en saillant)

### Phase 4 — Cohérence globale
- Boutons primary/ghost/icon : hauteurs/paddings/rayons via tokens
- Focus-visible uniforme (--shadow-focus)
- Bandeaux unifiés sous une classe commune .app-banner

### Validation après chaque phase
`tsc -b` (0 erreur) • `npm test` (51 tests verts) • checklist manuelle par vue × clair/sombre • build final.

## Ordre
P1 → P2 → P3 → P4 → build + commit/push par phase.
