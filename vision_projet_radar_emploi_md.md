# Taf Sniffer - Specification MVP

## 1. Idee centrale

**Taf Sniffer** est une application qui aide une personne en reconversion a trouver les offres d'emploi qui valent vraiment son attention.

Le probleme n'est pas de trouver plus d'annonces.

Le probleme est de trouver les bonnes annonces, celles qui correspondent a un vrai plan professionnel : entrer dans un metier, obtenir une formation financee, securiser un revenu, eviter les offres pieges, et preparer une trajectoire long terme.

Les job boards classiques fonctionnent encore trop souvent comme des moteurs de recherche textuels faibles. Ils comprennent mal les synonymes, les abreviations, les metiers proches et l'intention reelle du candidat.

Exemple :

```text
diagnostiqueur immo
diagnostiqueur immobilier
technicien diagnostic immobilier
technicien DPE
audit energetique junior
```

Pour un humain, ces recherches appartiennent au meme univers metier. Pour un job board, ce sont souvent des recherches differentes.

**Taf Sniffer ne doit donc pas etre un job board de plus.**

Il doit etre un outil de tri, d'analyse et de decision.

Formule simple :

```text
J'entre mon plan.
Je colle des annonces.
Taf Sniffer me dit lesquelles sentent bon, lesquelles sentent mauvais, et pourquoi.
```

---

## 2. Positionnement

Taf Sniffer doit etre :

```text
un filtre anti-annonces pourries
un comparateur intelligent d'offres
un assistant de decision pour candidats en reconversion
un outil de scoring explicable
un detecteur de signaux positifs et de red flags
```

Taf Sniffer ne doit pas etre :

```text
un Indeed bis
un site d'offres generaliste
un simple tableau de liens
un outil RH corporate
un moteur qui affiche 200 resultats sans priorite
```

La promesse produit :

```text
Moins d'annonces. Meilleures decisions.
```

Ou, version plus directe :

```text
Taf Sniffer trouve les offres qui sentent bon.
```

---

## 3. Utilisateur cible prioritaire

Le premier utilisateur cible est une personne en reconversion vers un metier technique en tension.

Profil prioritaire :

```text
adulte en reconversion
besoin d'entrer vite dans un metier
besoin de formation courte ou financee
besoin de comparer plusieurs offres rapidement
risque de tomber sur des annonces floues ou trompeuses
objectif long terme plus important que le simple intitulé de poste
```

Niche de depart recommandee :

```text
diagnostic immobilier
audit energetique
renovation energetique
metiers techniques batiment / energie
```

Cas pilote :

```text
diagnostiqueur immobilier junior
technicien diagnostic immobilier
technicien DPE
auditeur energetique junior
technicien renovation energetique
```

---

## 4. Probleme utilisateur

### 4.1 Les intitules sont mal normalises

Un meme metier peut apparaitre sous plusieurs formes :

```text
diagnostiqueur immobilier
diagnostiqueur immo
technicien diagnostic immobilier
technicien DPE
operateur diagnostic immobilier
consultant diagnostic immobilier
technicien batiment diagnostic
auditeur energetique junior
```

Un candidat qui cherche avec un seul mot-cle rate une partie du marche.

### 4.2 Les annonces sont difficiles a lire

Les annonces melangent souvent :

```text
missions reelles
promesses RH vagues
competences obligatoires
competences souhaitees
formation interne floue
salaire incomplet
statut ambigu
pression commerciale
contraintes terrain cachees
```

Le candidat doit lire entre les lignes, ce qui prend du temps et fatigue vite.

### 4.3 Les job boards privilegient le volume

Les plateformes affichent beaucoup de resultats, mais pas forcement les plus utiles.

Problemes frequents :

```text
doublons
annonces hors sujet
annonces obsoletes
cabinets qui republient la meme offre
statuts independants deguises
salaire flou
formation non precisee
missions trop volumetriques
```

### 4.4 Les vrais criteres de decision ne sont pas filtrables

Pour une reconversion, les criteres importants peuvent etre :

```text
debutant accepte
formation financee
POEI / POE / AFPR possible
certifications prises en charge
vehicule fourni
accompagnement terrain
salaire minimum viable
mission formatrice
passerelle vers audit energetique
structure serieuse
risque faible d'independance forcee
```

Ces criteres sont rarement disponibles sous forme de filtres propres.

---

## 5. MVP

Le MVP doit rester tres simple.

Objectif :

```text
Analyser 5 a 50 annonces collees par l'utilisateur et sortir un classement clair.
```

Le MVP ne cherche pas encore a aspirer tout Internet.

Il doit d'abord prouver que l'analyse est utile.

### 5.1 Entree utilisateur

L'utilisateur renseigne son plan :

```text
metier cible
localisation
rayon geographique
contrat souhaite
niveau actuel
formation recherchee
salaire minimum
contraintes personnelles
objectif strategique
criteres eliminatoires
```

Exemple :

```text
Metier cible : diagnostiqueur immobilier
Zone : Ile-de-France
Objectif : entrer vite dans le metier avec formation interne ou POEI
Preference : structure qui fait aussi audit energetique ou renovation
Salaire minimum : 1800 euros net apres formation
Malus : statut independant impose, formation a payer, pur volume low-cost
```

### 5.2 Import d'annonces

Modes d'import MVP :

```text
coller une annonce complete
coller plusieurs annonces
coller des liens avec texte recupere manuellement
import CSV simple
```

Les connecteurs automatiques viendront plus tard.

### 5.3 Analyse d'une annonce

Pour chaque annonce, Taf Sniffer produit :

```text
resume court
intitule normalise
entreprise
localisation
contrat
salaire detecte
formation detectee
debutant accepte : oui / non / incertain
certifications exigees
certifications financees
vehicule fourni : oui / non / incertain
signal audit energetique
signal renovation energetique
red flags
signaux positifs
questions a poser
verdict
score global
scores secondaires
```

### 5.4 Comparaison

Vue tableau :

```text
score
verdict
entreprise
poste
lieu
contrat
salaire
formation
debutant accepte
audit energetique
risque
principaux red flags
```

### 5.5 Top 3

Sortie principale :

```text
Top 1 - meilleure opportunite strategique
Top 2 - meilleure opportunite securisante
Top 3 - meilleure offre a creuser
```

Chaque choix doit expliquer :

```text
pourquoi l'offre est interessante
ce qui manque ou reste flou
le risque principal
la question cle a poser au recruteur
l'angle de candidature recommande
```

---

## 6. Expansion intelligente des mots-cles

Taf Sniffer doit transformer une intention simple en grappe de recherche.

Exemple :

```text
Intention utilisateur :
Je cherche un premier poste ou une POEI de diagnostiqueur immobilier, avec une passerelle possible vers l'audit energetique.
```

Expansion :

```text
diagnostiqueur immobilier
diagnostiqueur immo
technicien diagnostic immobilier
technicien DPE
diagnostic immobilier debutant
formation diagnostiqueur immobilier
POEI diagnostiqueur immobilier
alternance diagnostic immobilier
audit energetique junior
technicien audit energetique
renovation energetique junior
```

Cette fonctionnalite peut d'abord etre manuelle ou semi-automatique. Elle servira ensuite aux connecteurs.

---

## 7. Scoring MVP

Le scoring doit etre hybride :

```text
regles ponderees + analyse IA explicative
```

Le score ne doit jamais etre magique ou opaque. L'utilisateur doit comprendre pourquoi une offre gagne ou perd des points.

### 7.1 Scores a produire

```text
score_global
score_formation
score_cashflow
score_trajectoire
score_audit_energetique
score_risque
```

Interpretation :

```text
85-100 : priorite haute
70-84  : bonne offre a creuser
55-69  : moyenne, utile selon contexte
40-54  : faible interet
0-39   : probablement a eviter
```

### 7.2 Criteres positifs Phase 1 - entree metier

Objectif : entrer vite dans le metier avec formation, revenu et experience terrain.

```text
+20 debutant accepte
+20 formation interne ou financee
+15 certifications prises en charge
+15 CDI ou promesse claire apres formation
+10 salaire clair et correct
+10 vehicule fourni
+10 missions variees
+10 accompagnement terrain
+10 structure reconnue ou formatrice
```

### 7.3 Malus Phase 1

```text
-30 statut independant impose
-25 remuneration uniquement variable
-20 formation a payer soi-meme
-20 pression volume excessive
-15 zone de deplacement enorme
-15 aucun encadrement clair
-10 salaire absent
-10 annonce tres vague
```

### 7.4 Criteres positifs pivot audit energetique

Objectif : sortir du diagnostic pur et preparer une trajectoire plus technique.

```text
+25 mention audit energetique
+20 DPE + conseil travaux
+20 renovation energetique
+15 scenarios de travaux
+15 relation client approfondie
+10 coproprietes / syndics
+10 tertiaire
+10 BET interne ou competence thermique
+10 formation audit possible
```

### 7.5 Malus pivot audit

```text
-30 pur diagnostic reglementaire
-20 aucune mission de conseil
-20 tournees tres volumetriques
-15 aucun lien avec renovation
-15 aucune montee en competence prevue
```

---

## 8. Red flags a detecter

### 8.1 Statut flou

Expressions suspectes :

```text
statut independant
agent commercial
a votre compte
revenu non plafonne
fort potentiel de revenu
liberte totale
remuneration attractive selon performance
```

Risque :

```text
faux salariat
revenu instable
frais caches
formation ou materiel a la charge du candidat
```

### 8.2 Pression volume

Expressions suspectes :

```text
rythme soutenu
planning dense
forte autonomie
nombreuses interventions quotidiennes
secteur elargi
objectifs ambitieux
```

Risque :

```text
peu de formation
fatigue terrain
qualite faible
montee technique limitee
```

### 8.3 Formation ambigue

Expressions a verifier :

```text
formation possible
accompagnement prevu
profil debutant etudie
idealement certifie
formation assuree
```

Questions :

```text
Qui paie la formation ?
Combien de temps dure-t-elle ?
Quelles certifications sont financees ?
Y a-t-il un engagement apres formation ?
Le salaire commence quand ?
```

### 8.4 Salaire flou

Expressions suspectes :

```text
selon profil
package attractif
remuneration motivante
fixe + variable
primes interessantes
```

Questions :

```text
Quel est le fixe exact ?
Quel est le variable moyen reel ?
Les frais sont-ils rembourses ?
Le vehicule est-il fourni ?
```

---

## 9. Signaux positifs a detecter

### 9.1 Offre formatrice

```text
debutant accepte
formation prise en charge
certifications financees
tutorat terrain
parcours d'integration
accompagnement technique
```

### 9.2 Offre strategique

```text
audit energetique
renovation energetique
preconisations travaux
scenarios d'amelioration
coproprietes
syndics
tertiaire
BET
```

### 9.3 Offre confortable / securisante

```text
salaire clair
CDI
vehicule fourni
zone geographique raisonnable
outils fournis
planning cadre
avantages explicites
```

---

## 10. Typologie des offres

Taf Sniffer classe chaque annonce dans une famille.

### 10.1 Offre tremplin

Bonne pour commencer vite.

```text
formation interne
poste junior
structure formatrice
missions terrain classiques
```

Verdict :

```text
utile pour entrer dans le metier
```

### 10.2 Offre cashflow

Bonne pour securiser un revenu.

```text
salaire clair
CDI
avantages
peu d'ambiguite
risque faible
```

Verdict :

```text
bonne si la priorite est de stabiliser la situation
```

### 10.3 Offre strategique

Bonne pour la trajectoire long terme.

```text
diagnostic + audit
renovation energetique
relation client qualitative
structure technique
montee en competence
```

Verdict :

```text
priorite haute si le plan est de monter vers audit / conseil / independance
```

### 10.4 Offre piege

Semble attractive mais presente trop de risques.

```text
salaire flou
statut ambigu
independant impose
formation non financee
pression commerciale
secteur immense
objectifs volume agressifs
```

Verdict :

```text
prudence forte ou rejet
```

### 10.5 Offre hors trajectoire

Pas forcement mauvaise, mais mal alignee.

```text
poste trop administratif
pas de terrain
pas de montee technique
pas de lien audit / renovation
pas de valeur future claire
```

Verdict :

```text
faible priorite
```

---

## 11. Ecrans MVP

### 11.1 Page Strategie

But :

```text
definir le plan utilisateur
```

Champs :

```text
metier cible
zone
rayon
salaire minimum
contrats acceptes
niveau actuel
objectif principal
priorite POEI / POE / AFPR
criteres positifs
criteres negatifs
```

### 11.2 Page Import

But :

```text
coller ou importer les annonces
```

Fonctions :

```text
ajout d'une annonce
ajout en lot
import CSV simple
suppression d'une annonce
lancement analyse
```

### 11.3 Page Resultats

But :

```text
comparer les offres analysees
```

Contenu :

```text
tableau trie par score
filtres par verdict
filtres par risque
filtres par formation / POEI / audit / salaire
```

### 11.4 Page Detail Offre

But :

```text
comprendre le verdict d'une annonce
```

Sections :

```text
resume
score explique
criteres extraits
signaux positifs
red flags
incertitudes
questions a poser
angle de candidature
texte original
```

### 11.5 Page Top 3

But :

```text
donner une decision rapide
```

Contenu :

```text
meilleure offre strategique
meilleure offre securisante
meilleure offre a creuser
offres a eviter
raisons principales
```

---

## 12. UX et experience produit

L'UX de Taf Sniffer doit etre traitee comme une fonctionnalite centrale.

Le produit ne doit pas donner l'impression d'un tableur complique ou d'un job board de plus. Il doit donner l'impression d'un assistant clair, calme et utile, qui aide a prendre une decision sans noyer l'utilisateur.

Principe general :

```text
moins de bruit
plus de clarte
moins de resultats
plus de raisons
```

### 12.1 Experience cible

L'utilisateur doit comprendre en quelques secondes :

```text
quelles offres sont prioritaires
quelles offres sont risquées
pourquoi une offre est bien classee
ce qui reste a verifier
quelle action faire ensuite
```

Le parcours ideal :

```text
1. Je decris mon objectif.
2. Je colle mes annonces.
3. Je lance l'analyse.
4. Je vois un Top 3 clair.
5. Je peux creuser chaque offre si besoin.
6. Je repars avec les questions a poser et l'angle de candidature.
```

### 12.2 Ton de l'interface

Le ton doit etre :

```text
direct
humain
concret
legerement familier
jamais infantilisant
jamais corporate
```

Exemples de libelles :

```text
Ca sent bon
A creuser
Trop flou
Attention piege
Bon tremplin
Pas aligne avec ton plan
Question a poser
Pourquoi ce score ?
```

Le produit peut avoir du caractere, mais il doit rester credible.

### 12.3 Hierarchie visuelle

L'interface doit prioriser la decision.

Ordre d'affichage recommande :

```text
verdict
score
raison principale
risque principal
action recommandee
details
texte original
```

Le texte original de l'annonce doit rester disponible, mais il ne doit pas dominer l'ecran.

### 12.4 Layout principal

Le layout cible du MVP doit utiliser deux panneaux.

```text
grand panneau gauche : reglage, analyse et detail de l'offre selectionnee
panneau droit : classement permanent des offres trouvees
```

Objectif :

```text
garder la liste des opportunites visible
permettre de comparer vite
eviter de perdre le contexte quand on lit une offre
donner une sensation de poste de pilotage simple
```

Structure desktop recommandee :

```text
------------------------------------------------------------
| Grand panneau gauche                         | Panneau droit |
|                                              |               |
| Strategie / filtres / detail offre           | Classement    |
| Offre selectionnee                           | Top offres    |
| Score explique                               | Favoris       |
| Questions a poser                            | Rejetees      |
| Texte original                               |               |
------------------------------------------------------------
```

Le panneau droit doit rester visible pendant que l'utilisateur consulte une offre.

Contenu du panneau droit :

```text
tri par score global
badges de verdict
score court
entreprise
intitule normalise
risque principal
etat favori / ignore
```

Le panneau gauche change selon le contexte :

```text
mode strategie : reglages du plan utilisateur
mode import : ajout d'annonces
mode detail : offre selectionnee
mode comparaison : explication des ecarts entre offres
```

Comportement attendu :

```text
cliquer une offre dans le panneau droit charge son detail a gauche
modifier la strategie recalcule ou signale que les scores doivent etre recalcules
les offres prioritaires restent toujours visibles
les offres ignorees peuvent etre masquees mais restent recuperables
```

Sur mobile, le layout devient :

```text
onglet Liste
onglet Detail
onglet Strategie
```

Le panneau droit desktop devient la vue Liste mobile.

### 12.5 Cartes d'offres

Chaque offre doit etre resumee dans une carte compacte.

Contenu minimum :

```text
intitule normalise
entreprise
lieu
score global
type d'offre
verdict court
3 signaux positifs maximum
3 red flags maximum
bouton details
```

Exemple :

```text
Technicien diagnostic immobilier
Bureau X - Ile-de-France
Score : 81
Type : Offre tremplin
Verdict : bon point d'entree, audit a verifier

+ formation probable
+ salaire clair
+ structure credible

- audit non confirme
- certifications a verifier
```

### 12.6 Couleurs et signaux

Les couleurs doivent aider a lire vite, sans transformer l'app en sapin de Noel.

Codes possibles :

```text
vert : bon signal
orange : incertain / a verifier
rouge : red flag
bleu : information neutre
gris : donnees manquantes
```

Les scores ne doivent pas etre seulement des chiffres. Ils doivent etre accompagnes d'un verdict.

Exemple :

```text
82 - Priorite haute
67 - Correct, mais incomplet
38 - Risque eleve
```

### 12.7 Gestion de l'incertitude

Taf Sniffer doit assumer ce qu'il ne sait pas.

Au lieu d'inventer :

```text
formation financee : oui
```

si l'annonce est floue, afficher :

```text
formation financee : incertain
a verifier : qui paie la formation et quelles certifications sont incluses
```

Les incertitudes doivent etre visibles et actionnables.

### 12.8 Progressive disclosure

L'utilisateur ne doit pas tout voir d'un coup.

Niveaux de detail :

```text
niveau 1 : Top 3 et verdicts
niveau 2 : comparaison tableau
niveau 3 : detail d'une offre
niveau 4 : texte original et explication complete du score
```

But :

```text
permettre une decision rapide
sans cacher les raisons
```

### 12.9 Etats vides

Les ecrans vides doivent guider l'utilisateur.

Exemples :

```text
Aucune annonce analysee pour l'instant.
Colle 3 a 5 annonces pour obtenir un premier classement.
```

```text
Pas assez d'informations pour scorer cette offre proprement.
Ajoute le texte complet de l'annonce si tu l'as.
```

### 12.10 Etats d'analyse

Pendant l'analyse, l'interface doit expliquer ce qui se passe.

Etapes possibles :

```text
lecture de l'annonce
extraction des criteres
verification des red flags
calcul du score
generation du verdict
```

Il faut eviter un simple spinner sans contexte.

### 12.11 Actions utiles

Chaque offre analysee doit proposer des actions simples :

```text
marquer comme interessante
ignorer
ajouter aux favoris
copier les questions a poser
preparer une candidature
ouvrir la source
comparer avec une autre offre
```

Pour le MVP, les actions prioritaires sont :

```text
favori
ignorer
copier les questions
voir details
```

### 12.12 Accessibilite et confort

L'interface doit rester lisible et confortable.

Regles :

```text
contraste suffisant
police lisible
pas de texte minuscule pour les informations importantes
boutons explicites
navigation clavier possible a terme
pas de dependance exclusive a la couleur
```

Un red flag doit etre identifie par couleur + texte, pas seulement par couleur.

### 12.13 Mobile et desktop

Le MVP peut etre pense desktop en priorite, car la comparaison d'offres est plus confortable sur grand ecran.

Mais l'interface doit rester utilisable sur mobile pour :

```text
relire le Top 3
consulter une offre
copier une question
marquer une offre
```

Sur mobile, eviter les tableaux larges. Preferer des cartes empilees.

### 12.14 Anti-patterns UX

A eviter :

```text
afficher trop de scores partout
mettre le texte complet de l'annonce en premier
forcer l'utilisateur a configurer trop de choses avant de tester
melanger offres bonnes, moyennes et mauvaises sans priorite
masquer les raisons du score
utiliser un ton trop RH ou trop institutionnel
faire croire que l'IA sait quand elle n'a pas assez d'informations
```

---

## 13. Modele de donnees simplifie

### 13.1 Table jobs

```text
id
source
url
title_raw
title_normalized
company
location
salary_min
salary_max
contract_type
description_raw
date_found
date_posted
```

### 13.2 Table job_analysis

```text
id
job_id
summary
verdict
offer_type
beginner_friendly
training_detected
training_funded
certifications_required
certifications_funded
vehicle_provided
audit_energy_signal
renovation_signal
positive_signals
red_flags
uncertainties
questions_to_ask
application_angle
overall_score
training_score
cashflow_score
trajectory_score
audit_score
risk_score
score_explanation
```

### 13.3 Table user_strategy

```text
id
target_job
target_location
radius_km
salary_min
preferred_contracts
priority_training
priority_poei
priority_salary
priority_long_term
malus_independent_status
malus_low_cost
positive_keywords
negative_keywords
created_at
updated_at
```

---

## 14. Exemple de sortie attendue

```text
Poste : Technicien diagnostic immobilier
Entreprise : Bureau X
Lieu : Ile-de-France
Contrat : CDI
Salaire : 33-38 k euros brut/an

Verdict :
Bonne offre tremplin, avec potentiel moyen vers audit energetique.

Scores :
Global : 81/100
Formation : 75/100
Cashflow : 85/100
Trajectoire : 68/100
Audit energetique : 60/100
Risque : faible a modere

Pourquoi c'est interessant :
- salaire clair
- structure credible
- missions terrain
- environnement probablement formateur
- bon socle pour entrer dans le metier

Limites :
- audit energetique pas clairement central
- certifications a verifier
- risque de rester sur du diagnostic reglementaire classique

Question cle :
Est-ce que vos diagnostiqueurs participent aussi a des missions d'audit energetique ou de conseil travaux ?

Angle de candidature :
Mettre en avant la motivation de reconversion, la fiabilite terrain, l'interet pour le batiment et l'objectif de monter en competence vers l'audit energetique.
```

---

## 15. Perimetre IA et API

Taf Sniffer pourra utiliser une API IA plus tard, par exemple Gemini, OpenAI, Mistral ou Claude.

Mais l'application ne doit pas dependre d'un fournisseur unique.

Principe d'architecture :

```text
Taf Sniffer garde la logique produit.
L'IA aide a lire, extraire, resumer et expliquer.
Les regles internes gardent le controle du scoring final.
```

### 15.1 Ce que l'IA peut faire

L'IA est utile pour les taches de comprehension et de reformulation.

Perimetre autorise :

```text
extraire les informations importantes d'une annonce
normaliser un intitule de poste
detecter les synonymes metier
resumer une annonce longue
identifier les signaux positifs
identifier les red flags probables
repérer les incertitudes
generer les questions a poser au recruteur
generer un verdict en langage humain
proposer un angle de candidature
comparer plusieurs offres deja structurees
```

Exemple de fonction interne :

```text
analyze_job_offer(job_text, user_strategy) -> structured_analysis
```

Sortie attendue :

```text
JSON structure
champs obligatoires
incertitudes explicites
aucune decision finale opaque
```

### 15.2 Ce que l'IA ne doit pas controler seule

L'IA ne doit pas etre le juge absolu.

Hors perimetre IA seule :

```text
calcul du score final
application des gros malus
decision de rejet automatique
ponderation des criteres
classement final sans justification
modification des regles metier
```

Exemple :

```text
Si l'annonce contient "statut independant impose",
le malus doit venir d'une regle Taf Sniffer,
pas seulement d'une interpretation IA.
```

### 15.3 Scoring hybride

Le scoring doit combiner :

```text
analyse IA
regles deterministes
poids configurables
explication lisible
```

Flux recommande :

```text
1. L'utilisateur colle une annonce.
2. L'IA extrait les criteres dans un JSON.
3. Taf Sniffer valide et complete les champs.
4. Les regles internes calculent les scores.
5. L'IA peut reformuler l'explication finale.
6. Taf Sniffer affiche le score, le verdict et les raisons.
```

### 15.4 Fournisseurs possibles

Le code doit prevoir une couche provider.

Exemple :

```text
ai_provider = gemini
ai_provider = openai
ai_provider = mistral
ai_provider = local
```

Interface cible :

```text
AIProvider.analyzeJobOffer()
AIProvider.expandKeywords()
AIProvider.generateQuestions()
AIProvider.summarizeComparison()
```

Le MVP peut commencer avec un seul provider ou meme un mode mock.

Mais le code doit eviter les appels directs partout dans l'application.

Mauvais schema :

```text
composant UI -> appel Gemini direct
```

Bon schema :

```text
composant UI -> service analyse -> provider IA -> retour structure -> scoring interne
```

### 15.5 Donnees envoyees a l'API

Il faut limiter les donnees envoyees.

Autorise :

```text
texte de l'annonce
strategie utilisateur simplifiee
criteres de scoring utiles
contexte metier non sensible
```

A eviter :

```text
nom complet utilisateur
adresse personnelle
telephone
email
CV complet si non necessaire
historique personnel detaille
donnees de candidature privees
```

Le profil utilisateur envoye a l'API doit etre resume.

Exemple :

```text
Candidat en reconversion vers diagnostic immobilier,
cherche formation interne ou POEI,
priorite entree metier + trajectoire audit energetique,
refuse statut independant impose.
```

### 15.6 Hors MVP

Pour le MVP, il ne faut pas encore construire :

```text
multi-provider complet
optimisation de cout avancee
fine-tuning
modele local
analyse automatique de CV complet
generation automatique de candidatures en masse
scraping massif connecte a l'IA
```

Le MVP doit seulement prouver :

```text
Une annonce collee devient une analyse fiable, explicable et utile.
Plusieurs annonces collees deviennent un classement clair.
```

---

## 16. Roadmap

### Phase 0 - Prototype personnel

Objectif :

```text
analyser une annonce collee manuellement
```

Fonctions :

```text
champ texte annonce
analyse IA
score
verdict
questions a poser
```

Livrable :

```text
mini-app locale
```

### Phase 1 - MVP multi-annonces

Objectif :

```text
analyser et comparer 5 a 50 annonces
```

Fonctions :

```text
import lot
tableau de comparaison
detail annonce
top 3
export markdown ou PDF
```

### Phase 2 - Recherche semi-automatique

Objectif :

```text
reduire le copier-coller
```

Fonctions :

```text
generation de mots-cles
liens de recherche pre-remplis
import CSV
lecture d'emails d'alerte
dedoublonnage
historique
```

### Phase 3 - Connecteurs prudents

Objectif :

```text
connecter progressivement des sources
```

Sources possibles :

```text
API officielle si disponible
flux RSS si disponible
exports utilisateur
alertes email
scraping leger uniquement si legal et stable
```

### Phase 4 - Produit niche

Objectif :

```text
outil public pour reconversions batiment / energie
```

Fonctions :

```text
comptes utilisateurs
profils de strategie
alertes intelligentes
suivi candidatures
suggestions de messages
scoring par metier
```

---

## 17. Regle produit fondamentale

Taf Sniffer doit toujours preferer :

```text
peu de resultats, mais tres bien expliques
```

a :

```text
beaucoup de resultats vaguement pertinents
```

Un bon ecran final ne doit pas ressembler a :

```text
137 annonces trouvees
```

Il doit ressembler a :

```text
3 offres prioritaires
7 offres correctes
12 offres secondaires
18 offres rejetees avec raison
```

---

## 18. Decision de depart

Le premier objectif n'est pas l'agregation automatique.

Le premier objectif est la qualite de decision.

Donc le MVP parfait est :

```text
J'entre mon plan.
Je colle mes annonces.
Taf Sniffer trie, score, explique et sort le Top 3.
```

Ensuite seulement :

```text
Taf Sniffer cherche automatiquement pour moi.
```
