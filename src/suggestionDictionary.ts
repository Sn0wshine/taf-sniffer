export type DictionarySuggestion = {
  id: string;
  label: string;
  aliases: string[];
  family: string;
};

export const normalizeSuggestionText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniq = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const makeSuggestion = (id: string, label: string, family: string, aliases: string[] = []): DictionarySuggestion => ({
  id,
  label,
  family,
  aliases: uniq(aliases),
});

const universalJobSuggestions: DictionarySuggestion[] = [
  makeSuggestion("chef-projet", "Chef de projet", "Gestion de projet", ["charge de projet", "coordinateur projet", "project manager", "responsable projet"]),
  makeSuggestion("product-owner", "Product owner", "Numérique", ["PO", "chef de produit digital", "proxy product owner", "scrum"]),
  makeSuggestion("ux-ui-designer", "UX UI designer", "Numérique", ["designer produit", "webdesigner", "ergonome web", "figma"]),
  makeSuggestion("administrateur-systemes", "Administrateur systèmes et réseaux", "Numérique", ["admin systeme", "administrateur reseau", "infrastructure", "technicien reseau"]),
  makeSuggestion("analyste-cybersecurite", "Analyste cybersécurité", "Numérique", ["soc", "securite informatique", "pentest", "gouvernance cyber"]),
  makeSuggestion("ingenieur-devops", "Ingénieur DevOps", "Numérique", ["cloud", "sre", "docker", "kubernetes", "ci cd"]),
  makeSuggestion("administrateur-bdd", "Administrateur bases de données", "Numérique", ["DBA", "sql", "oracle", "postgresql"]),
  makeSuggestion("charge-marketing", "Chargé de marketing", "Marketing", ["assistant marketing", "marketing digital", "growth marketing", "chef de produit junior"]),
  makeSuggestion("community-manager", "Community manager", "Communication", ["reseaux sociaux", "social media", "animation communaute", "content manager"]),
  makeSuggestion("redacteur-web", "Rédacteur web", "Communication", ["copywriter", "contenu web", "seo", "journaliste web"]),
  makeSuggestion("graphiste", "Graphiste", "Création", ["designer graphique", "maquettiste", "PAO", "illustrator"]),
  makeSuggestion("vendeur", "Vendeur", "Commerce", ["conseiller vente", "employe commercial", "vente magasin", "retail"]),
  makeSuggestion("responsable-magasin", "Responsable magasin", "Commerce", ["manager retail", "chef de rayon", "adjoint magasin", "responsable boutique"]),
  makeSuggestion("charge-affaires", "Chargé d'affaires", "Commerce", ["business developer", "ingenieur commercial", "account manager", "developpement commercial"]),
  makeSuggestion("acheteur", "Acheteur", "Achats", ["assistant achats", "approvisionneur", "sourcing", "gestion fournisseurs"]),
  makeSuggestion("gestionnaire-adv", "Gestionnaire ADV", "Administration des ventes", ["assistant adv", "administration des ventes", "assistant commercial", "suivi commandes"]),
  makeSuggestion("juriste", "Juriste", "Juridique", ["assistant juridique", "droit social", "droit des affaires", "conformite"]),
  makeSuggestion("assistant-juridique", "Assistant juridique", "Juridique", ["secretaire juridique", "paralegal", "formalites juridiques", "cabinet avocat"]),
  makeSuggestion("controleur-gestion", "Contrôleur de gestion", "Finance", ["assistant controle de gestion", "finance analyst", "reporting", "budget"]),
  makeSuggestion("auditeur-financier", "Auditeur financier", "Finance", ["audit comptable", "commissariat aux comptes", "cabinet audit", "junior audit"]),
  makeSuggestion("gestionnaire-assurance", "Gestionnaire assurance", "Assurance", ["conseiller assurance", "sinistres", "back office assurance", "mutuelle"]),
  makeSuggestion("conseiller-bancaire", "Conseiller bancaire", "Banque", ["charge clientele banque", "conseiller financier", "back office bancaire", "agence bancaire"]),
  makeSuggestion("infirmier", "Infirmier", "Santé", ["ide", "soins infirmiers", "clinique", "hopital"]),
  makeSuggestion("aide-soignant", "Aide-soignant", "Santé", ["AS", "ehpad", "soins", "auxiliaire soins"]),
  makeSuggestion("auxiliaire-vie", "Auxiliaire de vie", "Services à la personne", ["aide a domicile", "assistant de vie", "accompagnement personnes agees", "sap"]),
  makeSuggestion("educateur-specialise", "Éducateur spécialisé", "Social", ["moniteur educateur", "travail social", "protection enfance", "accompagnement social"]),
  makeSuggestion("assistant-social", "Assistant de service social", "Social", ["assistant social", "conseiller social", "intervention sociale", "CESF"]),
  makeSuggestion("animateur-socioculturel", "Animateur socioculturel", "Animation", ["animateur periscolaire", "animation jeunesse", "centre loisirs", "mediation culturelle"]),
  makeSuggestion("enseignant", "Enseignant", "Éducation", ["professeur", "formateur scolaire", "professeur des ecoles", "enseignement"]),
  makeSuggestion("assistant-education", "Assistant d'éducation", "Éducation", ["AED", "surveillant scolaire", "vie scolaire", "college lycee"]),
  makeSuggestion("agent-entretien", "Agent d'entretien", "Propreté", ["agent de nettoyage", "proprete", "agent de service", "nettoyage industriel"]),
  makeSuggestion("agent-securite", "Agent de sécurité", "Sécurité", ["securite privee", "surveillance", "SSIAP", "gardiennage"]),
  makeSuggestion("agent-securite-incendie", "Agent de sécurité incendie", "Sécurité", ["SSIAP 1", "prevention incendie", "securite incendie", "rondes securite"]),
  makeSuggestion("cuisinier", "Cuisinier", "Hôtellerie-restauration", ["commis cuisine", "chef de partie", "restauration collective", "cuisine"]),
  makeSuggestion("serveur", "Serveur", "Hôtellerie-restauration", ["service en salle", "barman", "employe restauration", "runner"]),
  makeSuggestion("receptionniste-hotel", "Réceptionniste hôtel", "Hôtellerie-restauration", ["front office", "accueil hotel", "night auditor", "reservation hotel"]),
  makeSuggestion("gouvernant-hotel", "Gouvernant hôtelier", "Hôtellerie-restauration", ["femme de chambre", "valet de chambre", "housekeeping", "etages hotel"]),
  makeSuggestion("chauffeur-livreur", "Chauffeur livreur", "Transport", ["livreur", "conducteur livreur", "permis b", "messagerie"]),
  makeSuggestion("conducteur-poids-lourd", "Conducteur poids lourd", "Transport", ["chauffeur PL", "chauffeur SPL", "permis c", "transport routier"]),
  makeSuggestion("agent-exploitation-transport", "Agent d'exploitation transport", "Transport", ["exploitant transport", "affreteur", "planning transport", "dispatch"]),
  makeSuggestion("cariste", "Cariste", "Logistique", ["caces", "magasinier cariste", "chariot elevateur", "entrepot"]),
  makeSuggestion("gestionnaire-stocks", "Gestionnaire de stocks", "Logistique", ["inventaire", "approvisionnement", "stock", "magasinier gestionnaire"]),
  makeSuggestion("operateur-production", "Opérateur de production", "Industrie", ["agent de production", "ligne production", "industrie", "conditionnement"]),
  makeSuggestion("conducteur-ligne", "Conducteur de ligne", "Industrie", ["pilote ligne", "ligne automatisee", "production industrielle", "regleur"]),
  makeSuggestion("technicien-methodes", "Technicien méthodes", "Industrie", ["methodes industrialisation", "amelioration continue", "process", "lean"]),
  makeSuggestion("dessinateur-projeteur", "Dessinateur projeteur", "BTP / industrie", ["cao", "dao", "autocad", "revit", "bureau d'etudes"]),
  makeSuggestion("electricien", "Électricien", "Bâtiment", ["electricien batiment", "electricien industriel", "courant faible", "habilitation electrique"]),
  makeSuggestion("plombier-chauffagiste", "Plombier chauffagiste", "Bâtiment", ["chauffagiste", "installateur sanitaire", "maintenance chaudiere", "cvc"]),
  makeSuggestion("technicien-cvc", "Technicien CVC", "Bâtiment / énergie", ["climatisation", "chauffage ventilation", "frigoriste", "maintenance cvc"]),
  makeSuggestion("menuisier", "Menuisier", "Bâtiment / artisanat", ["poseur menuiserie", "agencement", "bois", "atelier menuiserie"]),
  makeSuggestion("macon", "Maçon", "Bâtiment", ["ouvrier macon", "gros oeuvre", "coffreur", "batiment"]),
  makeSuggestion("peintre-batiment", "Peintre en bâtiment", "Bâtiment", ["peintre", "revetements", "finition", "second oeuvre"]),
  makeSuggestion("architecte", "Architecte", "BTP / conception", ["architecte dplg", "maitre d'oeuvre", "conception batiment", "permis construire"]),
  makeSuggestion("urbaniste", "Urbaniste", "Aménagement", ["amenagement territoire", "charge etudes urbaines", "planification urbaine", "collectivite"]),
  makeSuggestion("paysagiste", "Paysagiste", "Environnement", ["jardinier paysagiste", "espaces verts", "amenagement paysager", "entretien espaces verts"]),
  makeSuggestion("technicien-environnement", "Technicien environnement", "Environnement", ["charge environnement", "biodiversite", "eau dechets", "rse environnement"]),
  makeSuggestion("ouvrier-agricole", "Ouvrier agricole", "Agriculture", ["agent agricole", "maraichage", "viticulture", "elevage"]),
  makeSuggestion("auxiliaire-veterinaire", "Auxiliaire vétérinaire", "Animalier", ["ASV", "assistant veterinaire", "clinique veterinaire", "soins animaux"]),
  makeSuggestion("coiffeur", "Coiffeur", "Beauté", ["coiffure", "barbier", "coloriste", "salon coiffure"]),
  makeSuggestion("estheticien", "Esthéticien", "Beauté", ["esthetique", "spa praticien", "conseiller beaute", "institut beaute"]),
  makeSuggestion("coach-sportif", "Coach sportif", "Sport", ["educateur sportif", "preparateur physique", "fitness", "animation sportive"]),
  makeSuggestion("bibliothecaire", "Bibliothécaire", "Culture", ["mediatheque", "documentaliste", "agent bibliotheque", "archives"]),
  makeSuggestion("charge-evenementiel", "Chargé d'événementiel", "Événementiel", ["assistant evenementiel", "coordination evenement", "production evenement", "salon congres"]),
  makeSuggestion("conseiller-funeraire", "Conseiller funéraire", "Services", ["assistant funeraire", "pompes funebres", "maitre de ceremonie", "conseil familles"]),
  makeSuggestion("teleconseiller", "Téléconseiller", "Relation client", ["centre appels", "call center", "conseiller a distance", "hotline"]),
  makeSuggestion("charge-recouvrement", "Chargé de recouvrement", "Finance / relation client", ["recouvrement amiable", "gestion impayes", "contentieux", "conseiller recouvrement"]),
  makeSuggestion("gestionnaire-dossiers", "Gestionnaire de dossiers", "Support", ["back office", "instructeur dossier", "gestion administrative", "agent administratif"]),
  makeSuggestion("secretaire", "Secrétaire", "Support", ["assistant secretariat", "secretaire polyvalent", "accueil secretariat", "assistant direction"]),
  makeSuggestion("assistant-direction", "Assistant de direction", "Support", ["office manager", "assistant manager", "secretariat direction", "coordination administrative"]),
  makeSuggestion("office-manager", "Office manager", "Support", ["gestion bureau", "services generaux", "assistant direction", "administratif polyvalent"]),
];

export const jobSuggestions: DictionarySuggestion[] = [
  makeSuggestion("diagnostiqueur-immobilier", "Diagnostiqueur immobilier", "Bâtiment / énergie", [
    "diag",
    "dpe",
    "diagnostic immobilier",
    "technicien DPE",
    "technicien diagnostic immobilier",
    "audit énergétique",
    "diagnostiqueur DPE",
  ]),
  makeSuggestion("auditeur-energetique", "Auditeur énergétique", "Bâtiment / énergie", [
    "audit énergétique",
    "rénovation énergétique",
    "conseiller rénovation",
    "thermicien",
  ]),
  makeSuggestion("technicien-maintenance", "Technicien de maintenance", "Maintenance", [
    "maintenance",
    "sav",
    "maintenance industrielle",
    "maintenance bâtiment",
    "technicien SAV",
    "électromécanicien",
  ]),
  makeSuggestion("technicien-qualite", "Technicien qualité", "Qualité / contrôle", [
    "contrôleur qualité",
    "assistant qualité",
    "qualité sécurité environnement",
    "QSE",
  ]),
  makeSuggestion("technicien-hse", "Technicien HSE", "Sécurité / environnement", [
    "préventeur sécurité",
    "QHSE",
    "hygiène sécurité environnement",
    "animateur sécurité",
  ]),
  makeSuggestion("assistant-administratif", "Assistant administratif", "Support", [
    "secrétaire administratif",
    "gestion administrative",
    "assistant polyvalent",
  ]),
  makeSuggestion("assistant-rh", "Assistant RH", "Ressources humaines", [
    "chargé RH junior",
    "gestionnaire RH",
    "assistant recrutement",
  ]),
  makeSuggestion("gestionnaire-paie", "Gestionnaire paie", "Ressources humaines", [
    "paie",
    "assistant paie",
    "paie débutant",
    "administration du personnel",
  ]),
  makeSuggestion("comptable", "Comptable", "Finance", [
    "assistant comptable",
    "comptable fournisseur",
    "comptable client",
    "aide comptable",
  ]),
  makeSuggestion("conseiller-clientele", "Conseiller clientèle", "Relation client", [
    "chargé de clientèle",
    "conseiller commercial",
    "support client",
  ]),
  makeSuggestion("commercial-sedentaire", "Commercial sédentaire", "Commerce", [
    "business developer",
    "télécommercial",
    "chargé d'affaires junior",
  ]),
  makeSuggestion("charge-communication", "Chargé de communication", "Communication", [
    "assistant communication",
    "community manager",
    "communication digitale",
  ]),
  makeSuggestion("developpeur-web", "Développeur web", "Numérique", [
    "développeur front-end",
    "développeur full stack",
    "intégrateur web",
    "développeur junior",
  ]),
  makeSuggestion("technicien-support", "Technicien support informatique", "Numérique", [
    "it",
    "support",
    "support IT",
    "helpdesk",
    "technicien informatique",
    "support applicatif",
  ]),
  makeSuggestion("data-analyst", "Data analyst", "Numérique", [
    "analyste données",
    "business intelligence",
    "BI junior",
  ]),
  makeSuggestion("chef-projet-junior", "Chef de projet junior", "Gestion de projet", [
    "assistant chef de projet",
    "coordinateur projet",
    "PMO junior",
  ]),
  makeSuggestion("logisticien", "Assistant logistique", "Logistique", [
    "agent logistique",
    "coordinateur logistique",
    "gestionnaire transport",
  ]),
  makeSuggestion("preparateur-commandes", "Préparateur de commandes", "Logistique", [
    "magasinier",
    "agent d'entrepôt",
    "cariste débutant",
  ]),
  makeSuggestion("conducteur-travaux", "Assistant conducteur de travaux", "Bâtiment", [
    "conducteur de travaux junior",
    "coordinateur travaux",
    "chargé d'opérations travaux",
  ]),
  makeSuggestion("agent-immobilier", "Assistant immobilier", "Immobilier", [
    "gestion locative",
    "assistant syndic",
    "conseiller immobilier",
  ]),
  makeSuggestion("formateur", "Formateur", "Formation", [
    "animateur formation",
    "concepteur pédagogique",
    "formation professionnelle",
  ]),
  makeSuggestion("technicien-laboratoire", "Technicien laboratoire", "Santé / industrie", [
    "assistant laboratoire",
    "contrôle laboratoire",
    "technicien analyses",
  ]),
  makeSuggestion("secretaire-medical", "Secrétaire médical", "Santé", [
    "assistant médical",
    "accueil médical",
    "secrétariat médical",
  ]),
  makeSuggestion("agent-accueil", "Agent d'accueil", "Service", [
    "hôte d'accueil",
    "chargé d'accueil",
    "réceptionniste",
  ]),
  ...universalJobSuggestions,
];

export const zoneDictionarySuggestions: DictionarySuggestion[] = [
  makeSuggestion("france", "France entière", "National", ["toute la france", "remote france"]),
  makeSuggestion("ile-de-france", "Île-de-France", "Région", ["idf", "région parisienne", "paris et banlieue"]),
  makeSuggestion("paris", "Paris", "Ville", ["75", "paris intra-muros"]),
  makeSuggestion("hauts-de-seine", "Hauts-de-Seine", "Département IDF", ["92", "la défense", "nanterre", "boulogne-billancourt"]),
  makeSuggestion("seine-saint-denis", "Seine-Saint-Denis", "Département IDF", ["93", "saint-denis", "montreuil", "noisy-le-grand"]),
  makeSuggestion("val-de-marne", "Val-de-Marne", "Département IDF", ["94", "créteil", "vincennes", "ivry-sur-seine"]),
  makeSuggestion("yvelines", "Yvelines", "Département IDF", ["78", "versailles", "saint-quentin-en-yvelines"]),
  makeSuggestion("essonne", "Essonne", "Département IDF", ["91", "évry", "massy", "saclay"]),
  makeSuggestion("val-oise", "Val-d'Oise", "Département IDF", ["95", "cergy", "argenteuil"]),
  makeSuggestion("seine-et-marne", "Seine-et-Marne", "Département IDF", ["77", "melun", "meaux"]),
  makeSuggestion("auvergne-rhone-alpes", "Auvergne-Rhône-Alpes", "Région", ["lyon", "grenoble", "saint-étienne", "clermont-ferrand"]),
  makeSuggestion("nouvelle-aquitaine", "Nouvelle-Aquitaine", "Région", ["bordeaux", "limoges", "poitiers", "bayonne"]),
  makeSuggestion("occitanie", "Occitanie", "Région", ["toulouse", "montpellier", "nîmes", "perpignan"]),
  makeSuggestion("hauts-de-france", "Hauts-de-France", "Région", ["lille", "amiens", "roubaix", "tourcoing"]),
  makeSuggestion("pays-loire", "Pays de la Loire", "Région", ["nantes", "angers", "le mans", "saint-nazaire"]),
  makeSuggestion("bretagne", "Bretagne", "Région", ["rennes", "brest", "vannes", "quimper"]),
  makeSuggestion("grand-est", "Grand Est", "Région", ["strasbourg", "nancy", "metz", "reims"]),
  makeSuggestion("paca", "Provence-Alpes-Côte d'Azur", "Région", ["paca", "marseille", "nice", "toulon", "aix-en-provence"]),
  makeSuggestion("normandie", "Normandie", "Région", ["rouen", "caen", "le havre"]),
  makeSuggestion("centre-val-loire", "Centre-Val de Loire", "Région", ["orléans", "tours", "chartres"]),
  makeSuggestion("bourgogne-franche-comte", "Bourgogne-Franche-Comté", "Région", ["dijon", "besançon", "belfort"]),
  makeSuggestion("corse", "Corse", "Région", ["ajaccio", "bastia"]),
];

export const filterDictionarySuggestions = (
  suggestions: DictionarySuggestion[],
  query: string,
  limit = 6,
) => {
  const cleanQuery = normalizeSuggestionText(query);
  const scored = suggestions.map((suggestion, index) => {
    const haystack = normalizeSuggestionText([suggestion.label, suggestion.family, ...suggestion.aliases].join(" "));
    const label = normalizeSuggestionText(suggestion.label);
    const score =
      !cleanQuery ? 1 :
      label.startsWith(cleanQuery) ? 4 :
      haystack.split(" ").some((word) => word.startsWith(cleanQuery)) ? 3 :
      haystack.includes(cleanQuery) ? 2 :
      0;
    return { suggestion, score, index };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
};
