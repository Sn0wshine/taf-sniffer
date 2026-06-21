# Changelog

Toutes les modifications notables de Taf Sniffer sont suivies ici.

Regle de versioning :

- Patch : correction, ajustement UI leger, fiabilisation sans nouveau flux.
- Minor : nouvelle fonctionnalite utilisateur ou nouveau bloc important.
- Major : changement incompatible ou V1 stabilisee avec rupture assumee.

## Unreleased

- Mode Android explicite : Gemini local direct sans attente du proxy PC, message clair quand l'import automatique d'offres demande un proxy distant, et build APK calé sur le JDK 21 local.
- Ajout d'une cle Gemini locale optionnelle pour mobile : proxy IA prioritaire, puis secours direct Gemini depuis l'app si le proxy est indisponible.
- Refonte du scoring local en fallback robuste par axes : Formation facilitee, Salaire / package, Trajectoire, Employeur et Risque maitrise.
- Le score IA Gemini reste le score principal quand il est disponible et frais ; le local sert de diagnostic, fallback et mode Local rapide.
- Detection formation facilitee enrichie : POEC, POEIC, POE collective, formation prise en charge, OPCO, France Travail, CPF et certifications financees.
- Correction salaire : `Mensuel de 2500 Euros sur 12 mois` n'est plus interprete comme une plage annuelle absurde.
- Ajout d'infobulles explicatives sur les axes du score de fiche : Formation facilitee, Salaire / package, Trajectoire, Employeur et Risque maitrise.

## 0.821 - 2026-06-03

- Passe de finition premium sur l'affichage des resultats : fiche offre plus claire, hierarchie visuelle plus calme et lecture plus rapide.
- Haut de fiche retravaille autour du titre, du score global et des axes locaux, avec moins d'effet "dashboard technique".
- Bloc `Salaire normalise` rendu plus decisionnel : fixe net mensuel prioritaire, details brut / horaire / package relegues en soutien.
- `Infos extraites` allegees pour mieux distinguer les donnees utiles des badges de provenance, de confiance et de verification.
- Rail `Classement` conserve comme point fort, avec une presentation plus nette des offres selectionnees et des signaux principaux.

## 0.820 - 2026-06-03

- Dictionnaire metiers elargi pour rendre l'assistant plus universel et accelerer la saisie.
- Infobulles repositionnees dynamiquement pour rester lisibles pres des bords et des coins de l'ecran.
- Fiche offre plus lisible sur ecran etroit : cartes compactes, chips moins tronquees et responsive corrige.
- Assistant post-recherche mieux replie avec resume compact et corrections de texte/mojibake.


## 0.810 - 2026-06-02

- Ajout d'un dictionnaire semi-auto mÃ©tier + zone avec suggestions cliquables, sans appel Gemini pendant la saisie.
- Suppression du preset mÃ©tier visible et des chips de rÃ©sumÃ© dans l'assistant.
- AmÃ©lioration de l'agencement Assistant IA : stage stable, champs empilÃ©s et boutons compacts.
- Correction du reset et de l'historique : remise Ã  l'Ã©tat initial sans redÃ©marrage, rail droit seul pour les anciennes offres.

## 0.800 - 2026-06-02

- Refonte de l'accueil Assistant IA : Ã©cran initial Ã©purÃ© avec un seul bouton `Lancer l'assistant`.
- Les anciennes offres restent accessibles via un panneau historique compact, sans dÃ©tail sÃ©lectionnÃ© automatiquement.
- Ajout d'Ã©tats runtime non persistÃ©s pour l'assistant : intro, questions, recherche en cours et rÃ©sumÃ© repliÃ©.
- Ajout d'un fondu d'entrÃ©e, d'un loader circulaire de recherche et d'un rÃ©sumÃ© compact aprÃ¨s succÃ¨s.

## 0.7.2 - 2026-06-02

- Correction du placement des infobulles de la barre haute : elles s'ouvrent maintenant vers le bas pour rester dans le champ visible.

## 0.7.1 - 2026-06-02

- Extension des infobulles coach sur les contrÃ´les principaux : Assistant IA, options, recherche, classement, sources et critÃ¨res avancÃ©s.
- Ajout d'un helper rÃ©utilisable pour appliquer les tooltips hover/focus aux boutons, labels et mÃ©triques non-chip.
- Remplacement de plusieurs `title` natifs par des infobulles accessibles avec `aria-describedby`.

## 0.7.0 - 2026-06-02

- Le mode simple devient `Assistant IA` par defaut, avec pager libre Objectif, Zone, Conditions, Contraintes et Resume.
- Ajout d'une intention metier libre et d'un resume assistant editable, sauvegardes avec les criteres.
- Ajout d'un endpoint `/api/ai/search-plan` qui genere des requetes de recherche via Gemini 3.1 Flash Lite, avec fallback 2.5 Flash Lite.
- La recherche automatique utilise les requetes IA sauvegardees en priorite, puis retombe sur les variantes locales.
- Le formulaire complet reste disponible dans le mode `Avance`.

## 0.6.3 - 2026-06-02

- Le mode d'analyse par defaut devient `IA complete` pour analyser toutes les offres par lots controles.

## 0.6.2 - 2026-06-02

- Ajout d'un garde-fou local par modele pour eviter de spammer Gemini : limites minute et jour pour la cascade 3.5 Flash / 3.1 Flash Lite / 2.5 Flash Lite.
- Les lots IA sautent directement au fallback disponible quand un modele a atteint sa limite locale estimee.
- Les relances automatiques ne renvoient plus les offres dont l'avis IA est deja frais, meme si la comparaison Top 3 est perimee.

## 0.6.1 - 2026-06-02

- Cascade Gemini 3.x par defaut : `gemini-3.5-flash`, puis `gemini-3.1-flash-lite`, puis `gemini-2.5-flash-lite`.
- Le serveur conserve le modele reellement utilise dans les reponses d'analyse quand un fallback Gemini prend le relais.
- `.env.example` et `.env` local alignes sur la nouvelle cascade, sans changement de cle API.

## 0.6.0 - 2026-06-02

- Refonte IA par defaut : roue d'options avec moteurs `IA Top 10`, `IA complete` et `Local rapide`.
- Gemini peut maintenant piloter le classement avec `aiRankScore` et raisons dediees, tout en gardant les garde-fous locaux obligatoires.
- Ajout d'une comparaison salaire IA a parametres egaux : brut/net, annuel/mensuel, 35h/39h, variable, primes, avantages, statut et frais.
- Les champs extraits privilegient maintenant les corrections manuelles puis l'IA non conflictuelle, avec badges de provenance.
- Le serveur local sert le build React recent par defaut sur `/`; l'ancien `taf-sniffer.html` redirige vers l'app.
- Ajout d'un vrai menu Windows dans `lancer-taf-sniffer.bat`.

## 0.5.1 - 2026-05-18

- Preparation du build APK Android debug avec scripts `android:build:debug` et `android:install:debug`.
- Diagnostic Android enrichi : SDK, `android/local.properties`, Gradle wrapper et chemin APK attendu.
- Le build debug echoue maintenant proprement si le SDK Android manque, avec instructions de configuration.
- Documentation mise a jour : APK debug local uniquement, signature release et Play Store hors perimetre.

## 0.5.0 - 2026-05-18

- Socle Android Capacitor ajoute : configuration `fr.tafsniffer.app`, projet natif Android genere et synchronise.
- Scripts Android ajoutes : `android:init`, `android:sync`, `android:open`, `android:check`.
- Diagnostic Android local documente : Java 17 et Gradle disponibles, Android SDK / adb / Android Studio encore a configurer pour produire un APK/AAB.
- Documentation mise a jour pour distinguer PWA, shell Capacitor et build Android signe.

## 0.4.7 - 2026-05-18

- Passe responsive premium / Android-ready : mode simple, classement, fiche et atelier avances mieux adaptes aux petits ecrans.
- Classement mobile limite en hauteur pour garder la fiche accessible, avec cartes et filtres plus tactiles.
- Infos extraites, scores, notes, panneaux replies et files terrain optimises pour mobile/tablette.
- Audit PWA leger : cache service worker versionne, `app-version.js` mis en cache, manifest enrichi avec `id` et `scope`.

## 0.4.6 - 2026-05-18

- Passe premium du mode avance : Terrain V1, Validation, Calibration, Sources, Collecte et Sauvegarde rendus plus calmes.
- Files terrain, blocages calibration et tableaux sources plus lisibles sans changer les donnees.
- Cartes de validation et listes de calibration harmonisees avec la finition du mode simple.
- Export/import JSON et actions avancees mieux integres visuellement, sans nouveau flux.

## 0.4.5 - 2026-05-18

- Passe premium micro-interactions : hover, focus clavier, etats actifs, disabled et loading harmonises.
- Boutons principaux polis avec feedback plus doux et spinner stable.
- Chips, infobulles et panneaux replies rendus plus fluides sans ajouter de nouveau flux.
- Respect de `prefers-reduced-motion` pour limiter les animations si demande par le systeme.

## 0.4.4 - 2026-05-18

- Passe premium autour des resultats : recherche, actions principales, comparaison IA, meilleur employeur et etats vides.
- Bandeau criteres et recherche terminee rendus plus calmes, avec metriques et details replies mieux hierarchises.
- Blocs `Comparaison IA` et `Meilleur employeur` alignes visuellement avec la fiche premium.
- Analyse express et etats sans resultats polis sans ajouter de nouveau flux.

## 0.4.3 - 2026-05-18

- Passe premium sobre ciblee sur la fiche offre et le panneau Classement.
- Haut de fiche, score global, scores secondaires et infos extraites rendus plus calmes et mieux hierarchises.
- Cartes de classement polies : selection plus nette, hover plus doux, source et qualite plus secondaires.
- Harmonisation visuelle des notes rapides, decision rapide et panneaux replies sans changer le moteur.

## 0.4.2 - 2026-05-18

- Detection distincte des offres tremplin avec `debutant accepte` et formation employeur assuree.
- En mode POEI obligatoire, une formation employeur claire peut passer comme equivalent a verifier, sans etre marquee comme vraie POEI.
- Recherche stricte POEI enrichie avec variantes formation employeur pour ne pas manquer les annonces formatrices.
- Questions recruteur ajustees pour demander si la formation peut etre formalisee en POEI, AFPR ou financement France Travail.

## 0.4.1 - 2026-05-18

- Validation terrain guidee : rappel discret en mode simple, statut terrain par offre et panneau Terrain V1 plus actionnable.
- Ajout d'un resume des blocages calibration : corrections, annotations, tri, verdicts, tags, notes et sources fragiles.
- Annotation terrain rapide reordonnee : verdict, tags, notes, puis champs attendus replies.
- Rapport terrain Markdown enrichi avec offres non pretes, blocages, erreurs d'extraction et divergences scoring.

## 0.4.0 - 2026-05-18

- Passe finition sobre du mode simple : surfaces plus calmes, bordures adoucies, ombres legeres et hierarchie visuelle plus nette.
- Bandeau recherche, fiche offre, infos extraites, decision rapide et panneaux replies harmonises sans changer le moteur.
- Classement rendu plus confortable a scanner : cartes plus propres, selection plus visible, source et qualite plus secondaires.
- Boutons, hover, focus, chips et etats vides polis pour un rendu plus proche dashboard produit.

## 0.3.9 - 2026-05-18

- Fiabilisation de l'import recherche : rejet des offres sans titre exploitable, sans source claire ou au contenu trop pauvre.
- Offres importÃ©es mais fragiles marquÃ©es `Ã  vÃ©rifier` avec notes d'extraction.
- Ajout d'un bilan `QualitÃ© import` dans les dÃ©tails de recherche.
- Cartes de classement enrichies d'un signal discret `fiable` ou `Ã  vÃ©rifier`.

## 0.3.8 - 2026-05-18

- Nettoyage UX de la fiche offre en mode simple : moins de redondances visibles entre decision, criteres, verdict et score.
- `Infos extraites` densifiees avec grille plus reguliere, libelles plus discrets et valeurs plus lisibles.
- Cartes du panneau `Classement` recentrees sur score, decision, salaire, contrat, entreprise, lieu et statut.
- Top 3, comparaison IA et meilleur employeur rendus plus compacts sans changer les donnees ni le scoring.

## 0.3.7 - 2026-05-16

- Reorganisation de la fiche offre en mode simple : infos extraites avant decision rapide.
- Ajout de `Notes rapides` basees sur les notes terrain existantes.
- Questions recruteur et avis IA complet replies sous les notes.
- Score detaille et texte brut replies par defaut pour alleger la lecture.

## 0.3.6 - 2026-05-16

- Ajout d'un bloc `Decision rapide` en tete de fiche offre en mode simple.
- Verdict court priorisant l'avis IA quand disponible, avec fallback local fiable.
- 3 raisons, 3 vigilances maximum, origine `IA` ou `local`, et chip `a verifier` si necessaire.
- Action directe selon le cas : analyser avec IA, corriger les infos, preparer l'approche ou ignorer.

## 0.3.5 - 2026-05-16

- Mode simple recentre sur les resultats apres recherche.
- Panneau `Recherche automatique` ouvert avant recherche puis replie en bandeau resume.
- Bouton principal transforme en `Relancer la recherche` apres une premiere recherche.
- Resume compact des criteres : metier, zone, salaire, experience, contrat et filtres stricts.

## 0.3.4 - 2026-05-16

- Ajout d'un diagnostic de connexion du proxy local vers France Travail, Hellowork, Apec et Jobijoba.
- Message `Connexion a verifier` quand le serveur local ne peut pas joindre les sites d'emploi.
- Les stats de qualite des sources ne sont plus alimentees quand l'echec vient du reseau local.
- Bouton `Tester la connexion` en mode simple et panneau `Diagnostic connexion` en mode avance.

## 0.3.3 - 2026-05-16

- Ajout d'infobulles custom sur les chips decisionnelles au survol et au focus clavier.
- Couverture des criteres POEI/audit/independant, infos extraites, provenance, qualite IA, sources et confiance.
- Aide courte integree sans ajouter de blocs permanents dans l'interface dense.

## 0.3.2 - 2026-05-16

- Ajout d'un observatoire local de qualite des sources.
- Suivi par source : recherches, offres importees, bruit ecarte, blocages, liens detail et qualite moyenne.
- Bloc compact `Qualite des sources` en mode simple apres recherche.
- Panneau avance `Sources` avec tableau des cumuls et reinitialisation des stats.
- Export/import JSON et localStorage etendus avec `sourceHealthStats` sans changer le format de sauvegarde.

## 0.3.1 - 2026-05-16

- Recherche multi-sites durcie pour ne plus importer de faux liens pointant vers des pages de recherche.
- `sourceUrl` reserve aux vraies pages d'annonces, avec `searchUrl` interne optionnel pour les cartes sans lien detail.
- Bilan par source enrichi : liens detail, resultats sans lien, offres trop pauvres et filtres obligatoires.
- Resume source compact ajoute en mode simple, details fins gardes en debug.
- Dedoublonnage renforce par URL, id source, puis titre + entreprise + lieu.

## 0.3.0 - 2026-05-16

- Ajout d'un profil metier generique interne pour les recherches hors diagnostic immobilier.
- Passage en profil automatique invisible : l'utilisateur saisit un metier, Taf Sniffer choisit la grille interne.
- Les anciennes strategies `diagnostic_immobilier` sont normalisees en mode auto pour eviter un verrou invisible.
- Le terme AMO seul ne declenche plus la grille diagnostic immobilier.
- Libelles de decision rendus plus neutres en profil generique : signal strategique, evolution, strategie.

## 0.2.0 - 2026-05-12

- Ajout du socle interne de profils metier avec le profil pilote `diagnostic_immobilier`.
- Recherche intelligente et signaux metier lus depuis le profil actif.
- `Strategy.profileId` ajoute avec fallback compatible pour les anciennes sauvegardes.
- Aucun editeur de profil visible et scoring diagnostiqueur conserve.

## 0.1.3 - 2026-05-12

- Assistant Terrain V1 : prochaine action, files a corriger / a annoter / pretes scoring.
- Annotation terrain rapide dans la fiche offre avancee, avec pre-remplissage des champs attendus.
- Rapport terrain Markdown enrichi avec actions restantes, offres a annoter et sources fragiles.
- Scoring conserve inchange en attendant 20 annonces reelles annotees.

## 0.1.2 - 2026-05-12

- Ajout du tableau de bord Terrain V1 pour suivre les 20 annonces reelles annotees.
- Synthese par source : volumes, annotations, tri, qualite extraction et alertes simples.
- Export du rapport terrain en Markdown.
- Validation reelle priorisee sur les annonces reelles non annotees.
- Scoring conserve inchange en attendant un jeu terrain suffisant.

## 0.1.1 - 2026-05-12

- Stabilisation terrain du mode simple et du panneau de classement.
- Recherche interne enrichie dans les annonces deja trouvees.
- Infos debug mieux reservees aux vues avancees et aux details explicites.
- Bloc Meilleur employeur rendu plus actionnable : salaire, avantages et note a verifier.
- Roadmap nettoyee avec la polyvalence metier preparee comme direction future.

## 0.1.0 - 2026-05-12

- Prototype local utilisable avec mode simple et mode avance.
- Recherche multi-sources via proxy local best-effort.
- Classement, Top 3, filtres decisionnels et fiche offre corrigeable.
- Analyse IA optionnelle sur le Top 3, avec controle qualite et avis decisionnel.
- Interface dense V1 et version visible dans le header.
