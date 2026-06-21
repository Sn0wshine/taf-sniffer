# Taf Sniffer - Roadmap

Derniere mise a jour : 2026-06-03

## Vision courte

Taf Sniffer aide une personne en reconversion a trier des annonces d'emploi, detecter les bonnes opportunites, reperer les pieges, puis sortir un Top 3 explicable.

Le produit reste volontairement local et semi-automatique au depart :

```text
Je renseigne quelques criteres.
Je clique Rechercher.
Taf Sniffer cherche les annonces publiques lisibles via le proxy local.
Je garde l'import manuel comme filet de securite.
Taf Sniffer analyse, score, explique et aide a valider.
```

---

## Etat actuel

### Prototype local

Statut : fait.

Livrable principal :

```text
taf-sniffer.html
```

Fonctions disponibles :

```text
mode simple "criteres + rechercher" par defaut
mode simple pilote par un seul bouton principal
mode simple sans navigation externe imposee
recherche intelligente activee par defaut
recherche zone intelligente activee par defaut
zone vide = toute la France
suggestions semi-auto de zone
champs compacts en mode simple
salaire net mini visible en mode simple
critere experience visible en mode simple
critere contrat souhaite visible en mode simple
masquage des offres faibles active par defaut
chips de criteres en tri-etat : ignore / souhaite / obligatoire
Formation facilitee et audit peuvent devenir obligatoires pour filtrer plus strictement
Formation facilitee obligatoire appliquee aux requetes, au filtre d'import, a l'onglet A traiter et au Top 3
Formation facilitee intelligente : POEI / POE / POEC / POEIC / AFPR / preparation operationnelle / formation prealable / formation prise en charge / OPCO / France Travail / CPF / certification financee, accents et pluriels
formation employeur claire + debutant accepte traitee comme signal fort a verifier
independant impose peut etre refuse en mode strict
mode avance pour collecte / validation / reglages
preparation automatique des recherches
proxy local multi-sources publiques
session de recherche avec résumé
bilan decisionnel apres recherche
strategie utilisateur
import manuel d'annonces
Gemini par defaut avec modes IA complete / IA Top 10 / Local rapide
fallback local si Gemini est absent, en erreur ou en quota
classement panneau droit
detail offre panneau gauche
ligne criteres : dans les criteres / a creuser / ecartee
bloc infos extraites visible et corrigeable
fiche entreprise semi-auto a la demande
type entreprise estime + site probable + signaux
comparateur employeur : salaire estime + avantages + note employeur publique best-effort
endpoint local /api/employer-rating sans cle ni login
brut / net detecte quand l'annonce le precise
primes / variable detectes quand mentionnes
primes nettoyees des avantages non salariaux
avantages detectes : vehicule, titres restaurant, mutuelle, outils, frais, teletravail
experience demandee detectee et corrigeable
temps de travail 35H / 39H / temps partiel detecte quand possible
Top 3 argumente
score global
scores secondaires
barres de scores colorees par niveau
animations de chargement sur boutons strategiques
connecteur France Travail prepare sans appel reseau
connecteurs publics France Travail / Hellowork / Indeed / LinkedIn / Jooble / Apec / Meteojob / Welcome to the Jungle / Jobijoba / Talent.com / Optioncarriere
qualite extraction : complete / partielle / a verifier
statut extraction : OK / a verifier / corrigee manuellement
corrections manuelles titre / entreprise / lieu / contrat / salaire
bilans de recherche par source
compteurs nouvelles offres / doublons / offres trop pauvres
variantes d'orthographe, accents et intitules metier
variantes region parisienne / departements IDF
variantes experience : debutant, junior, reconversion, confirme
source officielle France Travail optionnelle via .env
etat de recherche simple : idle / searching / needsConnector / readyWithLocalOffers / error
score de confiance
signaux positifs
red flags
incertitudes
questions a poser
angle candidature
favoris / ignorees
statut de tri : a traiter / a creuser / favori / ignoree
filtre a traiter qui masque le bruit sans supprimer les offres
edition du texte original
correction rapide des infos extraites sans ouvrir le texte brut
copie resume Markdown
copie synthese Markdown
copie rapport terrain Markdown
export JSON complet
import JSON complet
restauration de la derniere session de recherche
tableau Terrain V1 : objectif 20 annonces reelles annotees
assistant Terrain V1 : prochaine action, files a corriger / a annoter / pretes scoring
annotation terrain rapide dans la fiche offre avancee
scoring IA-first avec fallback local robuste
explication du score local groupee par axes metier
types d'offre ameliores : tremplin / strategique / cashflow / piege
Gemini optionnel via proxy local
avis intelligent par offre
score IA de classement dedie : aiRankScore + raisons de rang
comparaison salaire IA a parametres egaux : brut/net, mensuel/annuel, 35H/39H, fixe/variable, primes, avantages, statut et frais
score hybride borne conserve pour expliquer les ecarts avec les regles locales
cache IA par annonce et strategie
appels Gemini groupes en batch pour limiter le rate limit
analyse IA automatique desactivee par defaut, option limitee au Top 3
extraction controlee par champ : manuel > source structuree > IA utilisable > local
provenance par champ visible en debug : manuel / source / IA / local
alertes par champ : ok / a verifier / conflit
banc de validation extraction : titre, entreprise, lieu, contrat, salaire, temps de travail
jeu local de tests extraction : Apec, France Travail, Jobijoba, hors cible AMO
socle profils metier v0.2.0 : profil interne diagnostic_immobilier, recherche et signaux metier lus depuis le profil
profil metier automatique v0.3.0 : diagnostic immobilier si le metier correspond, profil generique sinon
polyvalence metier invisible : l'utilisateur saisit un metier, Taf Sniffer choisit la grille interne sans imposer de selecteur
recherche multi-sites fiable v0.3.1 : faux liens de recherche rejetes, sourceUrl reservee aux vraies annonces, bilan source enrichi
observatoire qualite sources v0.3.2 : stats locales par source, sources utiles / a surveiller / bloquees, panneau Sources avance
infobulles chips decisionnelles v0.3.3 : aide au survol/focus sur criteres, infos extraites, qualite, sources et confiance
diagnostic connexion proxy v0.3.4 : test reseau sortant, message Connexion a verifier, stats sources preservees quand le reseau local bloque
mode simple resultats d'abord v0.3.5 : criteres replies apres recherche, bandeau resume actionnable, resultats remontes
fiche offre decision rapide v0.3.6 : verdict court, raisons, vigilances, prochaine action, IA prioritaire avec fallback local
fiche offre plus lisible v0.3.7 : infos extraites avant decision, notes rapides, avis IA/questions/score replies
nettoyage UX fiche et classement v0.3.8 : fiche moins redondante, classement centre sur decision + salaire, blocs hauts compacts
fiabilite recherche et import v0.3.9 : offres pauvres rejetees, import fragile marque a verifier, bilan Qualite import
passe finition mode simple v0.4.0 : dashboard sobre, surfaces plus calmes, fiche et classement plus premium, sans changement moteur
validation terrain guidee v0.4.1 : statuts terrain, blocages calibration, prochaine annonce a traiter, rapport enrichi
formation employeur equivalent POEI v0.4.2 : debutant accepte + formation assuree devient offre tremplin a verifier
passe premium fiche/classement v0.4.3 : fiche offre et panneau Classement plus calmes, premium et scannables
passe premium autour resultats v0.4.4 : recherche, actions, IA, employeur et etats vides polis
passe premium micro-interactions v0.4.5 : hover, focus, loading, tooltips et panneaux replies harmonises
passe premium mode avance v0.4.6 : Terrain V1, Validation, Calibration, Sources, Collecte et Sauvegarde harmonises
responsive premium Android-ready v0.4.7 : mobile/tablette polis, classement contenu, PWA legerement durcie
socle Android Capacitor v0.5.0 : projet android genere, scripts ajoutes, APK signe reporte apres SDK Android
build APK Android debug v0.5.1 : scripts build/install debug, diagnostic SDK enrichi, echec propre si SDK absent
refonte IA par defaut v0.6.0 : moteur IA configurable, IA complete, IA Top 10, Local rapide, score de rang IA, comparaison salaire IA et menu Windows
cascade Gemini v0.6.1 : gemini-3.5-flash par defaut, puis gemini-3.1-flash-lite, puis gemini-2.5-flash-lite
anti-spam Gemini v0.6.2 : compteur local par modele, respect des limites minute/jour connues et relances automatiques limitees aux avis IA manquants ou perimes
mode IA complete par defaut v0.6.3 : Gemini analyse toutes les offres par lots controles, avec garde-fous quota et fallback local
assistant IA par defaut v0.7.0 : mode simple remplace par un pager guide, intention metier libre, resume editable et plan de recherche IA economique
infobulles coach v0.7.1 : aide hover/focus sur controles, badges, scores, sources et notions IA/scoring
correctif infobulles v0.7.2 : ouverture vers le bas dans la barre haute pour eviter le hors champ
accueil assistant epure v0.800 : bouton unique lancer l'assistant, anciennes offres en panneau droit, questions en fondu et resultats reveles apres recherche
```

### Scoring metier

Statut : V1 durcie.

Detecte deja :

```text
POEI / POE / POEC / POEIC / AFPR
formation prealable au recrutement
formation interne
formation financee claire
OPCO / France Travail / prise en charge
CPF / certification financee
certifications prises en charge
debutant / junior / reconversion
audit energetique
renovation energetique
conseil travaux
statut independant
agent commercial / franchise / micro-entreprise / faux salariat
remuneration variable ou floue
commissions / primes a clarifier
brut / net non precise
formation potentiellement payante
pression volume
salaire absent
temps de travail 35H / 39H / temps partiel
vehicule / outils fournis
```

Le score IA pilote le classement quand Gemini est disponible et frais. Le score local reste explicable comme fallback et diagnostic : Formation facilitee, Salaire / package, Trajectoire, Employeur, Risque maitrise. Les garde-fous obligatoires plafonnent le local sans remplacer le classement IA.

Prochaine priorite scoring : tester sur 10 a 20 annonces reelles, puis ajuster les poids uniquement a partir des erreurs observees.

### Validation reelle

Statut : fait.

Fonctions disponibles :

```text
verdict attendu manuel
tags attendus
notes de validation
comparaison entre attendu et detecte
tags manques
faux positifs
champs attendus : titre, entreprise, lieu, contrat, salaire, temps de travail
champs faux / manques dans la synthese
sources fragiles pour l'extraction
compteur de faux titres generiques
scores fragiles
tableau de calibration scoring
offres surcotees / sous-cotees
regles a ajuster
```

Tags de validation :

```text
POEI
formation facilitee
formation
audit
independant
salaire flou
debutant accepte
volume
```

### Collecte semi-manuelle

Statut : fait.

Fonctions disponibles :

```text
mots-cles generes depuis la strategie
liens France Travail
liens Indeed
liens Hellowork
liens LinkedIn
liens Jooble
liens Apec
liens Meteojob
liens Welcome to the Jungle
liens Jobijoba
liens Talent.com
liens Optioncarriere
liens Google
copie mots-cles
copie checklist de collecte
compteur objectif 20 annonces
source par annonce
URL source par annonce
affichage : Recherche / Exemple
```

### PWA / Android

Statut : base posee.

Fichiers presents :

```text
manifest.webmanifest
icon.svg
sw.js
```

Note :

```text
Le service worker ne s'active pas en file://.
Il faudra servir l'app via un serveur local ou hebergement statique pour tester l'installation Android.
```

### Base React future

Statut : maintenue en miroir.

Fichiers principaux :

```text
src/App.tsx
src/analysis.ts
src/validation.ts
src/searchQueries.ts
src/aiProvider.ts
src/types.ts
```

Note technique :

```text
tsc -b passe.
npm run build est bloque dans cette session par esbuild / spawn EPERM.
```

---

## Prochaine priorite recommandee

### Phase 1 - V1 utilisable avec proxy local multi-sources

Statut : fait.

Objectif :

```text
garder le flux simple criteres -> Rechercher -> offres publiques classees -> Top 3
```

Workflow :

```text
1. Rester en mode simple.
2. Entrer metier, zone, objectif.
3. Ajouter si besoin salaire net mini et experience.
4. Garder la recherche intelligente et la zone intelligente activees par defaut.
5. Cliquer Rechercher.
6. Le proxy local tente les sites publics sans connexion avec plusieurs variantes.
7. Taf Sniffer importe, dedoublonne, analyse et classe les offres.
8. Lire le Top 3.
9. Trier les offres : a traiter, a creuser, favori, ignoree.
10. Passer en mode avance seulement si besoin de collecte, validation ou sauvegarde.
```

Criteres de succes :

```text
aucune page externe ouverte depuis le bouton simple
aucun panneau avance obligatoire
Top 3 lisible sans explication technique
0 cle API / client secret / token stocke en localStorage
pas de login utilisateur
cles France Travail optionnelles dans .env uniquement pour API officielle
details utiles pour prendre une decision
resume de session lisible apres chaque recherche
bilan decisionnel lisible apres chaque recherche
contrat souhaite et offres faibles masquables depuis le mode simple
dedoublonnage visible quand on relance la meme recherche
```

Sortie attendue :

```text
proxy local Node
route /api/search-jobs
route /api/company-profile
connecteurs publics France Travail / Hellowork / Indeed / LinkedIn / Jooble / Apec / Meteojob / Welcome to the Jungle / Jobijoba / Talent.com / Optioncarriere
mapping multi-sources vers JobRecord
fallback import manuel si lecture automatique bloquee
session de recherche locale
actions de tri operationnel
filtres decisionnels apres recherche
```

---

## Ensuite

### Phase 2 - Test terrain V1

Statut : assistant de session fait, collecte terrain a mener.

Objectif :

```text
utiliser Taf Sniffer comme outil quotidien sur 10 a 20 annonces reelles
```

Travail prevu :

```text
lancer plusieurs recherches depuis le mode simple
noter les sources qui donnent vraiment des offres utiles
marquer les offres a creuser / favoris / ignorees
tester contrat souhaite et masquer les offres faibles
verifier et corriger les infos extraites avant decision
utiliser la file Terrain V1 pour ouvrir les offres a corriger ou a annoter
pre-remplir les champs attendus depuis la fiche offre avancee
observer les doublons et les annonces trop pauvres
exporter une sauvegarde JSON apres session
copier un rapport terrain Markdown
```

Critere de passage a la phase scoring :

```text
20 annonces reelles annotees dans Terrain V1
corrections d'extraction faites sur les offres importantes
rapport terrain exporte
```

### Phase 3 - Constituer un vrai jeu de test en mode avance

Objectif :

```text
collecter 10 a 20 vraies annonces diagnostiqueur immobilier / audit energetique
```

Travail prevu :

```text
utiliser Collecte reelle
coller les annonces
annoter dans Validation reelle
observer tags manques, faux positifs et scores fragiles
```

### Phase 4 - Durcir le scoring apres cas reels

Statut : tableau de calibration fait, ajustements de poids geles jusqu'a 20 annonces terrain annotees.

Objectif :

```text
ajuster les regles a partir des erreurs observees
```

Travail prevu :

```text
affiner les synonymes metier
ameliorer detection POEI implicite
distinguer formation claire vs formation vague
mieux detecter faux salariat / independant force
ajuster poids offre strategique vs offre tremplin
ameliorer score de confiance
```

### Phase 5 - Donnees locales solides

Statut : export / import JSON complet fait.

Objectif :

```text
eviter de perdre le travail de collecte et validation
```

Fonctions possibles :

```text
jeux de tests nommes
reset selectif
historique de validation
```

### Phase 6 - Test mobile / PWA

Objectif :

```text
tester l'app sur Android sans refaire l'interface
```

Travail prevu :

```text
servir l'app en local
tester installation PWA Android
verifier layout mobile
corriger ergonomie tactile
verifier persistance localStorage
```

### Phase 7 - IA via provider

Statut : V1 Gemini optionnelle faite.

Objectif :

```text
brancher une API IA seulement pour lire et structurer les annonces
```

Principe :

```text
IA = extraction, resume, questions
Taf Sniffer = regles obligatoires, score local, decision expliquee
Score final = score local + ajustement IA borne entre -12 et +12
```

Provider V1 :

```text
Gemini
cle serveur locale GEMINI_API_KEY dans .env
mode local-only si cle absente ou erreur API
analyse automatique des offres apres recherche
reanalyse manuelle en mode avance
appel manuel par offre depuis le bloc Avis intelligent
mode auto limite au Top 3 pour eviter de spammer le quota
mode simple avec bouton separe "Analyser le Top 3 avec IA", grise tant que la recherche n'a pas tourne
clics manuels IA regroupes pendant une courte fenetre pour limiter les RPM bas
interface dense V1 : recherche compacte, details par source masques en debug, fiche offre remontee plus haut
stabilisation terrain v0.1.1 : recherche interne enrichie, debug mieux masque, bloc employeur plus actionnable
terrain reel v0.1.2 : tableau de bord 20 annonces, synthese par source, rapport terrain Markdown
assistant terrain v0.1.3 : prochaine action, files de travail, annotation rapide et rapport enrichi
normalisation salaire ajoutee : brut/net, annuel/mensuel/horaire vers equivalent net mensuel et brut annuel
primes estimees ajoutees : montant explicite, 13e mois ou variable a confirmer, avec aide IA si disponible
controle qualite IA ajoute : champs douteux, incoherences, avertissements et corrections proposees sans auto-application
extraction controlee ajoutee : les infos extraites et le scoring utilisent la fiche IA si elle n'est pas en conflit, avec fallback local
avis IA clair ajoute : verdict lisible, 3 raisons maximum, questions recruteur personnalisees et preparation candidature
comparaison IA Top 3 ajoutee : pourquoi #1, offre plus risquee, offre a appeler en premier
memoire locale de preferences ajoutee : favoris, ignorees et a creuser envoyes au prompt sans profil editable
zone par defaut vide : recherche nationale tant que l'utilisateur ne renseigne pas de zone
objectif par defaut vide : champ optionnel transmis a l'IA seulement si l'utilisateur le renseigne
fallback configurable via GEMINI_FALLBACK_MODELS, par defaut gemini-3.1-flash-lite puis gemini-2.5-flash-lite si gemini-3.5-flash est limite
les modeles a quota 0 dans Google AI Studio ne doivent pas etre mis en fallback par defaut
un modele plus recent peut etre ajoute dans GEMINI_FALLBACK_MODELS des que son identifiant API exact est confirme
```

Providers envisageables plus tard :

```text
OpenAI
Mistral
Claude
local
```

### Phase 8 - Recherche semi-automatique avancee

Objectif :

```text
reduire le copier-coller sans scraping massif
```

Pistes :

```text
alertes email collees/importees
CSV depuis job boards
bookmarks d'offres
pages carrieres ciblees
connecteurs officiels si disponibles
```

### Phase 8b - Recherche multi-sites fiable

Statut : fait en v0.3.1, a valider sur terrain.

Objectif :

```text
importer moins de bruit depuis les sites publics et expliquer clairement quelles sources sont utiles ou bloquees
```

Fait :

```text
sourceUrl reservee aux vraies pages d'annonces
pages de recherche rejetees avant import
cartes inline sans lien detail gardees seulement si suffisamment exploitables, avec sourceUrl vide
bilan par source enrichi : offres trouvees, liens detail, resultats sans lien, offres trop pauvres, filtres obligatoires
resume compact en mode simple, details fins uniquement en debug
dedoublonnage renforce par URL, id source, puis titre + entreprise + lieu
```

Prochaine validation :

```text
tester diagnostic immobilier France entiere
tester chef de projet AMO France entiere
identifier les 2 ou 3 sources qui donnent le meilleur ratio annonces utiles / bruit
```

### Phase 8c - Qualite des sources de recherche

Statut : fait en v0.3.2, a observer sur plusieurs recherches.

Objectif :

```text
savoir quelles plateformes donnent de vraies offres utiles sans desactiver automatiquement les sources fragiles
```

Fait :

```text
stats locales sourceHealthStats
historique limite par source
cumul recherches / importees / ecartees / blocages / liens detail / resultats sans lien
bloc compact Qualite des sources en mode simple
panneau avance Sources avec taux utile, bruit, blocages et derniere recherche
reinitialisation manuelle des stats sources
export/import JSON des stats sources, sans changement BACKUP_VERSION
```

Prochaine validation :

```text
lancer plusieurs recherches sur metiers differents
confirmer quelles sources restent utiles selon le metier
decider plus tard si Taf Sniffer doit proposer un ordre de confiance par source
```

### Phase 8d - Lisibilite des chips decisionnelles

Statut : fait en v0.3.3.

Objectif :

```text
expliquer les chips importantes sans alourdir l'interface dense
```

Fait :

```text
infobulles custom au survol et au focus clavier
chips criteres : POEI, audit, independant impose
chips infos extraites : brut/net, type entreprise, experience, provenance, qualite IA
chips recherche : sources utiles, a surveiller, bloquees
chips confiance : score, avis IA, employeur, terrain
```

### Phase 8e - Diagnostic connexion proxy

Statut : fait en v0.3.4.

Objectif :

```text
distinguer un vrai probleme reseau local/proxy d'une source simplement pauvre ou bloquee
```

Fait :

```text
route /api/network-diagnostics
tests sortants France Travail / Hellowork / Apec / Jobijoba
statut global ok / partial / blocked / error
bloc Connexion a verifier en mode simple quand toutes les sources echouent cote reseau
bouton Tester la connexion
panneau Diagnostic connexion dans Sources en mode avance
sourceHealthStats non alimente quand l'echec vient du reseau local global
```

### Phase 8f - Mode simple resultats d'abord

Statut : fait en v0.3.5.

Objectif :

```text
montrer plus vite les offres, le Top 3 et la fiche selectionnee apres une recherche
```

Fait :

```text
panneau Recherche automatique ouvert avant recherche
panneau criteres replie automatiquement apres recherche
bandeau resume : metier, zone, salaire, experience, contrat, filtres stricts
bouton Modifier pour rouvrir les criteres
bouton principal renomme Relancer la recherche quand une session existe
etat ouvert/ferme non persiste dans localStorage
```

### Phase 8g - Fiche offre decision rapide

Statut : fait en v0.3.6.

Objectif :

```text
decider plus vite depuis la fiche de l'offre selectionnee en mode simple
```

Fait :

```text
bloc Decision rapide juste sous le titre de l'offre
verdict court : Bonne piste / A creuser / Risque / Hors cible
priorite a l'avis IA quand il existe, fallback local sinon
3 raisons maximum et 3 points de vigilance maximum
chips origine IA / local et a verifier
action directe : analyser avec IA, corriger les infos, preparer l'approche ou ignorer
```

### Phase 8h - Fiche offre plus lisible

Statut : fait en v0.3.7.

Objectif :

```text
reduire le bruit dans la fiche selectionnee et remettre les notes utilisateur avant les questions IA
```

Fait :

```text
ordre simple : titre / infos extraites / decision rapide / actions / notes rapides
notes rapides synchronisees avec les notes terrain existantes
avis IA complet replie par defaut en mode simple
questions recruteur repliees apres les notes
score detaille et texte brut replies par defaut
annotation terrain placee avant l'avis IA en mode avance
```

### Phase 8i - Nettoyage UX fiche et classement

Statut : fait en v0.3.8.

Objectif :

```text
reduire les doublons visibles et rendre la lecture decisionnelle plus calme sans ajouter de suivi de candidatures
```

Fait :

```text
fiche offre simple moins redondante : criteres/verdict detailles deplaces dans les panneaux replies
infos extraites densifiees : grille plus reguliere, labels discrets, valeurs renforcees
cartes de classement recentrees sur score, decision, salaire, contrat, entreprise, lieu et statut
source et qualite extraction gardees au second plan, avec details en debug si necessaire
Top 3, Meilleur employeur et Comparaison IA rendus plus compacts
```

### Phase 8j - Fiabilite recherche et import propre

Statut : fait en v0.3.9.

Objectif :

```text
proteger le Top 3 contre les annonces trop pauvres, les faux liens et les resultats importes sans contexte suffisant
```

Fait :

```text
rejet des offres sans titre exploitable, source claire ou contenu suffisant
offres importees mais fragiles marquees a verifier
bilan Qualite import dans Details de recherche
compteurs importees / doublons / ecartees / trop pauvres / sans lien annonce / hors criteres obligatoires
signal discret fiable / a verifier dans les cartes du classement
```

### Phase 8k - Passe finition mode simple

Statut : fait en v0.4.0.

Objectif :

```text
donner au mode simple un rendu plus calme, plus premium et plus lisible sans toucher au moteur
```

Fait :

```text
dashboard sobre : surfaces plus propres, bordures adoucies, ombres legeres
bandeau criteres et recherche terminee polis sans rallonger le flux
fiche offre : haut de fiche, scores, infos extraites, decision rapide et notes harmonises
classement : cartes plus lisibles, selection plus elegante, source et qualite secondaires
micro-interactions boutons / hover / focus plus nettes
```

### Phase 8l - Validation terrain guidee

Statut : fait en v0.4.1.

Objectif :

```text
rendre le lot de 20 annonces reelles plus facile a corriger, annoter et preparer pour la calibration scoring
```

Fait :

```text
rappel discret en mode simple : annonces annotees, a corriger, a annoter, pretes scoring
statut terrain par offre : a corriger / a trier / a annoter / prete scoring
panneau Terrain V1 enrichi avec blocages calibration et bouton prochaine annonce terrain
annotation terrain rapide reordonnee : verdict, tags, notes, champs attendus replies
rapport terrain Markdown enrichi : offres non pretes, blocages, erreurs extraction, divergences scoring
```

### Phase 8m - Formation employeur equivalent POEI

Statut : fait en v0.4.2.

Objectif :

```text
ne plus ecarter les offres tremplin ou il manque le mot POEI mais ou l'employeur accepte les debutants et assure la formation
```

Fait :

```text
signal distinct formation employeur + debutant accepte
POEI stricte conservee pour POEI / POE / AFPR / formation prealable au recrutement
POEI obligatoire accepte l'equivalent formation employeur comme a verifier
recherche POEI stricte enrichie avec variantes formation assuree / formation interne / nous vous formons
question recruteur prioritaire : demander si la formation peut etre formalisee en POEI, AFPR ou financement France Travail
```

### Phase 8n - Passe premium fiche et classement

Statut : fait en v0.4.3.

Objectif :

```text
rendre le coeur quotidien plus premium sans changer le moteur : fiche offre selectionnee et classement
```

Fait :

```text
haut de fiche plus calme : titre, source, chips et score global mieux integres
scores secondaires sous le titre polis : cartes moins lourdes, barres plus fines
infos extraites plus regulieres : labels calmes, valeurs plus lisibles, alertes moins agressives
classement plus scannable : selection plus nette, hover doux, source et qualite secondaires
notes rapides, decision rapide et panneaux replies harmonises visuellement
```

### Phase 8o - Passe premium autour des resultats

Statut : fait en v0.4.4.

Objectif :

```text
reduire l'effet prototype autour de la fiche et du classement : recherche, actions, blocs IA/employeur et etats vides
```

Fait :

```text
bandeau criteres plus calme : chips adoucies, bouton Modifier mieux integre
recherche terminee polie : metriques lisibles, details replies plus propres, diagnostic reseau conserve
actions principales harmonisees : rechercher / analyser IA / meilleur employeur
comparaison IA et meilleur employeur alignes avec le style premium de la fiche
etats vides, recherche sans resultat et Analyse express rendus plus propres sans nouveau flux
```

### Phase 8p - Passe premium micro-interactions

Statut : fait en v0.4.5.

Objectif :

```text
rendre Taf Sniffer plus fluide au toucher sans changer le moteur : hover, focus, loading, chips, infobulles et panneaux replies
```

Fait :

```text
focus clavier harmonise sur boutons, cartes, champs, chips et panneaux
etats hover / actif / disabled / loading adoucis sur les actions principales
chips decisionnelles et infobulles rendues plus stables avec delai anti-flicker
panneaux repliables polis : summary plus clair, etat ouvert plus lisible
animations limitees via prefers-reduced-motion quand le systeme le demande
```

### Phase 8q - Passe premium mode avance

Statut : fait en v0.4.6.

Objectif :

```text
rendre l'atelier avance aussi propre que le mode simple sans changer le moteur ni les donnees
```

Fait :

```text
panneaux Sources, Sauvegarde locale, Terrain V1, Collecte reelle, Validation reelle et Calibration harmonises
Terrain V1 plus lisible : progression, prochaine action, blocages, files a corriger / a annoter / pretes scoring
Validation et Calibration plus scannables : cartes, tags, champs attendus, erreurs et offres a revoir
Sources et Sauvegarde polies : tableaux plus calmes, actions mieux integrees
mode simple conserve, hors styles partages
```

### Phase 8r - Responsive premium / Android-ready

Statut : fait en v0.4.7.

Objectif :

```text
rendre Taf Sniffer confortable sur mobile/tablette et preparer l'installation Android sans refaire le moteur
```

Fait :

```text
mode simple mobile poli : criteres, boutons, recherche terminee, fiche offre, infos extraites et notes
classement mobile contenu en hauteur pour ne pas ecraser la fiche selectionnee
mode avance mobile rendu utilisable : Terrain V1, Validation, Sources, Calibration et Sauvegarde en colonnes lisibles
PWA legerement durcie : cache service worker versionne, app-version.js cache, manifest avec id et scope
aucun changement scoring, IA, connecteurs, donnees ou format de sauvegarde
```

### Phase 8s - Socle Android Capacitor

Statut : fait en v0.5.0.

Objectif :

```text
preparer une vraie base Android ouvrable dans Android Studio plus tard, sans viser tout de suite un APK signe
```

Fait :

```text
Capacitor ajoute : core, cli, android
capacitor.config.ts cree avec appId fr.tafsniffer.app, appName Taf Sniffer et webDir dist
projet natif android genere et synchronise avec le build web
scripts npm ajoutes : android:init, android:sync, android:open, android:check
diagnostic Android local : Java 17 et Gradle OK, adb et Android SDK absents
APK/AAB signe reporte apres installation/configuration Android Studio SDK
```

### Phase 8t - Build APK Android debug

Statut : prepare en v0.5.1, build APK bloque tant que le SDK Android est absent.

Objectif :

```text
passer du socle Capacitor a un APK debug local installable, sans signature release ni Play Store
```

Fait :

```text
script android:build:debug ajoute : build web, sync Capacitor, assembleDebug si SDK disponible
script android:install:debug ajoute : installation via adb si APK et appareil disponibles
android:check enrichi : local.properties, Gradle wrapper, SDK et chemin APK attendu
echec propre quand ANDROID_HOME / ANDROID_SDK_ROOT / sdk.dir manquent
chemin APK attendu : android/app/build/outputs/apk/debug/app-debug.apk
```

### Phase 9 - Polyvalence metier

Statut : socle automatique fait, UI custom reportee.

Objectif :

```text
rendre Taf Sniffer adaptable a n'importe quel metier sans casser le pilote diagnostiqueur immobilier
```

Principe :

```text
ne pas exposer les profils comme un detour utilisateur en mode simple
separer le moteur generique et la grille metier interne
moteur generique : salaire, contrat, lieu, experience, risques, avantages, questions, Top 3
profil metier : synonymes, competences, signaux positifs, red flags, questions et poids specifiques
diagnostiqueur immobilier reste le profil pilote jusqu'a validation terrain
si le metier saisi ne ressemble pas au diagnostic immobilier, Taf Sniffer utilise une grille generique
```

Fait en v0.2.0 :

```text
type JobProfile ajoute
Strategy.profileId optionnel avec fallback diagnostic_immobilier
profil diagnostic_immobilier extrait en source de verite interne
variantes de recherche metier lues depuis le profil
signaux strategiques audit / renovation lus depuis le profil
questions et angle candidature metier lus depuis le profil
pas encore de selecteur visible ni de profil custom utilisateur
```

Fait en v0.3.0 :

```text
profil interne generique ajoute
profil actif deduit automatiquement du metier saisi
les anciennes sauvegardes diagnostic_immobilier reviennent en mode auto pour eviter un verrou invisible
AMO seul ne declenche plus la grille diagnostic immobilier
les libelles audit deviennent neutres avec le profil generique : signal strategique, evolution, strategie
le scoring diagnostic immobilier reste equivalent quand le metier correspond au pilote
aucun selecteur de profil impose en mode simple
```

Prochaine etape possible :

```text
renforcer d'abord la recherche multi-sites et la qualite d'extraction
tester des recherches hors diagnostic immobilier avec la grille generique
preparer un profil custom local editable seulement si le besoin terrain est confirme
```

---

## Decisions produit

Actees :

```text
nom : Taf Sniffer
MVP local d'abord
proxy local Node pour recherche publique, IA optionnelle et enrichissements best-effort
pas de backend distant ni compte utilisateur pour l'instant
pas de scraping massif : connecteurs publics best-effort + import manuel de secours
IA Gemini optionnelle, avec fallback local-only
Android : PWA preparee puis socle Capacitor ajoute
scoring hybride a terme
polyvalence metier interne automatique : diagnostic immobilier si pertinent, generique sinon
```

A redecider plus tard :

```text
quand passer de HTML statique a React/Vite comme cible principale
quand ajouter un backend distant
quand produire un APK/AAB signe avec Android Studio SDK
quand autoriser les profils custom, sans alourdir le mode simple
```

---

## Commandes de verification

```text
npm.cmd run sync:version
node --check static-app.js
node --check server.mjs
node --check sw.js
node node_modules\typescript\bin\tsc -b --pretty false
```
