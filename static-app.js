(function () {
  const STORAGE_KEY = "taf-sniffer.static.jobs.v1";
  const STRATEGY_KEY = "taf-sniffer.static.strategy.v1";
  const UI_KEY = "taf-sniffer.static.ui.v1";
  const SESSION_KEY = "taf-sniffer.static.lastSearchSession.v1";
  const TOP3_AI_KEY = "taf-sniffer.static.top3-ai-comparison.v1";
  const SOURCE_HEALTH_KEY = "taf-sniffer.static.sourceHealthStats.v1";
  const BACKUP_VERSION = 1;
  const SOURCE_HEALTH_HISTORY_LIMIT = 12;
  const APP_VERSION_LABEL = window.TAF_SNIFFER_VERSION_LABEL || "v0.4.1";
  const AUTO_PROFILE_ID = "auto";
  const DIAGNOSTIC_PROFILE_ID = "diagnostic_immobilier";
  const GENERIC_PROFILE_ID = "generique_metier";
  const DEFAULT_PROFILE_ID = AUTO_PROFILE_ID;

  const defaultStrategy = {
    profileId: DEFAULT_PROFILE_ID,
    targetJob: "Diagnostiqueur immobilier",
    location: "",
    salaryMin: 1800,
    experienceLevel: "debutant_reconversion",
    contractPreference: "any",
    hideWeakOffers: true,
    poeiRequirement: "prefer",
    auditRequirement: "prefer",
    independentRequirement: "prefer",
    objective: "",
    priorityTraining: true,
    priorityPoei: true,
    prioritySalary: true,
    priorityAudit: true,
    rejectIndependent: true,
    smartSearch: true,
    smartLocation: true,
  };

  const diagnosticImmobilierProfile = {
    id: DIAGNOSTIC_PROFILE_ID,
    label: "Diagnostic immobilier",
    defaultTargetJob: "Diagnostiqueur immobilier",
    ui: {
      strategicRequirementLabel: "Audit énergie",
      strategicScoreLabel: "Audit",
      trajectoryScoreLabel: "Trajectoire",
      strategicMissingLabel: "Audit non confirmé",
      strategicRequiredMissingLabel: "Audit obligatoire absent",
      strategicDetectedLabel: "Audit énergétique détecté",
    },
    search: {
      triggerTerms: ["diagnost", "dpe", "immo"],
      smartVariants: [
        "diagnostiqueur immobilier",
        "diagnostiqueur imobilier",
        "diagnostiqueur immobiliers",
        "diagnostiqueur immo",
        "diagnostic immobilier",
        "technicien diagnostic immobilier",
        "technicien diagnostiqueur immobilier",
        "technicien DPE",
        "DPE",
        "operateur diagnostic immobilier",
        "diagnostiqueur immobilier DPE",
        "technicien audit energetique",
        "conseiller renovation energetique",
      ],
      beginnerVariants: [
        "diagnostiqueur immobilier debutant",
        "diagnostiqueur immobilier junior",
        "formation diagnostiqueur immobilier",
        "POEI diagnostiqueur immobilier",
        "POE diagnostiqueur immobilier",
        "AFPR diagnostiqueur immobilier",
        "audit energetique junior",
        "auditeur energetique junior",
        "renovation energetique junior",
      ],
      juniorVariants: [
        "diagnostiqueur immobilier junior",
        "technicien DPE junior",
        "audit energetique junior",
        "auditeur energetique junior",
      ],
      confirmedVariants: ["diagnostiqueur immobilier confirme", "auditeur energetique confirme"],
      requiredStrategicTerms: ["audit energetique", "renovation energetique", "DPE mention"],
      requiredStrategicFallback: "audit energetique",
      shortReplacements: [
        { from: /\bimmobilier\b/i, to: "immo" },
        { from: /\bimmo\b/i, to: "immobilier" },
      ],
    },
    analysis: {
      titleFallbacks: [
        { terms: ["audit energetique", "auditeur energetique"], title: "Auditeur énergétique junior" },
        { terms: ["dpe"], title: "Technicien DPE" },
        { terms: ["diagnostiqueur", "diagnostic immobilier", "technicien dpe"], title: "Technicien diagnostic immobilier" },
        { terms: ["renovation energetique", "conseiller renovation"], title: "Technicien rénovation énergétique" },
      ],
      genericTitles: [
        "technicien diagnostic immobilier",
        "auditeur energetique junior",
        "technicien dpe",
        "technicien renovation energetique",
        "poste a qualifier",
        "offre importee",
        "offre apec",
      ],
      companySearchContext: "entreprise avis activite diagnostic immobilier",
      knownStructureTerms: ["bureau veritas", "dekra", "socotec", "qualiconsult", "diagnostic", "cabinet", "bureau d'etudes", "bet"],
      strategicTerms: ["audit energetique", "auditeur energetique", "dpe avec mention"],
      trajectoryTerms: ["renovation energetique", "conseil travaux", "preconisations", "scenarios de travaux", "amo"],
      questions: {
        poeiKnown: "Quel est le cadre exact de la POEI / POE / AFPR et quelle embauche est prévue ensuite ?",
        trainingKnown: "Qui finance la formation et une POEI est-elle envisageable ?",
        trainingMissing: "Une formation interne ou une POEI est-elle envisageable ?",
        strategicKnown: "Quelle part du poste concerne l'audit énergétique ou le conseil travaux ?",
        strategicMissing: "Les diagnostiqueurs participent-ils aussi à des missions d'audit énergétique ?",
      },
      applicationAngles: {
        strategic: "Mettre en avant la reconversion, l'intérêt pour le bâtiment, la rigueur terrain et l'objectif de monter vers audit / conseil travaux.",
        default: "Mettre en avant la fiabilité, l'envie d'apprendre vite, la disponibilité terrain et demander clairement le cadre de formation.",
      },
    },
  };

  const genericJobProfile = {
    id: GENERIC_PROFILE_ID,
    label: "Métier générique",
    defaultTargetJob: "Métier cible",
    ui: {
      strategicRequirementLabel: "Signal stratégique",
      strategicScoreLabel: "Stratégie",
      trajectoryScoreLabel: "Évolution",
      strategicMissingLabel: "Signal stratégique non confirmé",
      strategicRequiredMissingLabel: "Signal stratégique obligatoire absent",
      strategicDetectedLabel: "Signal stratégique détecté",
    },
    search: {
      triggerTerms: [],
      smartVariants: [],
      beginnerVariants: [],
      juniorVariants: [],
      confirmedVariants: [],
      requiredStrategicTerms: ["formation qualifiante", "certification", "expertise métier", "évolution"],
      requiredStrategicFallback: "formation qualifiante",
      shortReplacements: [],
    },
    analysis: {
      titleFallbacks: [],
      genericTitles: ["poste a qualifier", "offre importee", "offre apec"],
      companySearchContext: "entreprise avis employeur",
      knownStructureTerms: [
        "groupe",
        "pme",
        "cabinet",
        "bureau d'etudes",
        "bureau d'études",
        "collectivite",
        "collectivité",
        "sas",
        "sarl",
        "recrutement",
        "interim",
        "intérim",
      ],
      strategicTerms: ["formation qualifiante", "certification", "specialisation", "spécialisation", "expertise", "chef de projet", "conseil"],
      trajectoryTerms: ["evolution", "évolution", "montee en competence", "montée en compétence", "progression", "responsabilites", "responsabilités"],
      questions: {
        poeiKnown: "Quel est le cadre exact de la POEI / POE / AFPR et quelle embauche est prévue ensuite ?",
        trainingKnown: "Quelle formation est prévue, qui la finance et quel niveau est attendu à l'arrivée ?",
        trainingMissing: "Une formation interne ou un parcours d'intégration est-il prévu pour ce poste ?",
        strategicKnown: "Quelles missions permettent de progresser vers un poste plus qualifié ou plus stable ?",
        strategicMissing: "Quelles perspectives d'évolution ou de spécialisation sont réalistes sur ce poste ?",
      },
      applicationAngles: {
        strategic: "Mettre en avant la motivation pour le métier, la capacité à apprendre vite et l'objectif de progresser vers des missions plus qualifiées.",
        default: "Mettre en avant la fiabilité, l'envie d'apprendre, les expériences transférables et demander clairement le cadre de formation.",
      },
    },
  };

  const jobProfiles = [diagnosticImmobilierProfile, genericJobProfile];

  function getActiveProfile(currentStrategy = strategy) {
    const explicit = currentStrategy && currentStrategy.profileId && currentStrategy.profileId !== AUTO_PROFILE_ID
      ? jobProfiles.find((profile) => profile.id === currentStrategy.profileId)
      : null;
    if (explicit) return explicit;
    const target = normalize(`${(currentStrategy && currentStrategy.targetJob) || diagnosticImmobilierProfile.defaultTargetJob}`);
    const diagnosticTerms = [
      ...diagnosticImmobilierProfile.search.triggerTerms,
      ...diagnosticImmobilierProfile.search.smartVariants,
      ...diagnosticImmobilierProfile.analysis.strategicTerms,
    ].map(normalize);
    return diagnosticTerms.some((term) => term && target.includes(term)) ? diagnosticImmobilierProfile : genericJobProfile;
  }

  const demoOffers = [
    `Poste : Technicien diagnostic immobilier junior
Entreprise : Bureau Veritas
Lieu : Paris / Île-de-France
Contrat : CDI
Salaire : 32-36 k brut/an

Nous recrutons un profil junior ou en reconversion pour intervenir sur des diagnostics immobiliers : DPE, amiante, plomb, gaz et électricité. Un parcours d'intégration est prévu avec accompagnement terrain. Les outils et un véhicule de service sont fournis.

Une montée en compétence vers l'audit énergétique pourra être étudiée selon profil. Certifications prises en charge après validation du parcours. Une POEI peut être étudiée pour un candidat en reconversion avant embauche définitive.`,
    `Poste : Diagnostiqueur immobilier indépendant
Entreprise : Réseau national en fort développement
Lieu : Île-de-France
Contrat : Agent commercial / indépendant
Salaire : rémunération attractive non plafonnée

Vous souhaitez être libre et développer votre activité ? Rejoignez notre réseau. Formation possible, pack de démarrage et accompagnement prévu. Fort potentiel de revenu selon performance commerciale.

Secteur large, forte autonomie, objectifs ambitieux.`,
    `Poste : Auditeur énergétique junior
Entreprise : Cabinet Renov Habitat
Lieu : Nanterre
Contrat : CDI
Salaire : 34-40 k brut/an

Cabinet spécialisé en rénovation énergétique, nous recherchons un technicien DPE ou diagnostiqueur immobilier souhaitant évoluer vers l'audit énergétique. Missions : visites terrain, scénarios de travaux, préconisations, relation client, copropriétés et petit tertiaire.

Formation audit possible. Une première expérience bâtiment est appréciée. Véhicule fourni.`,
  ];

  const extractionTestOffers = [
    {
      source: "Apec",
      sourceUrl: "https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178652649W",
      rawText: `Poste : Chef de Projet AMO - Investisseurs F/H
Entreprise : Kardham
Lieu : Paris 17 - 75
Contrat : CDI
Salaire : 45-60 k brut/an
Source : Apec
URL : https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178652649W

Vous accompagnez des investisseurs sur des missions AMO, programmation, coordination et conseil. La description mentionne des diagnostiqueurs dans les interlocuteurs du projet, mais le poste ouvert n'est pas un poste de diagnostiqueur immobilier.`,
      expectedExtraction: {
        title: "Chef de Projet AMO - Investisseurs F/H",
        company: "Kardham",
        location: "Paris 17 - 75",
        contract: "CDI",
        salary: "45-60 k brut/an",
        workTime: "",
      },
    },
    {
      source: "France Travail",
      sourceUrl: "https://candidat.francetravail.fr/offres/recherche/detail/207SVJM",
      rawText: `Poste : DIAGNOSTIQUEUR IMMOBILIER (F/H) (H/F)
Entreprise : DIMO DIAGNOSTIC
Lieu : 69 - Lyon 4e Arrondissement
Contrat : CDI
Temps de travail : Temps partiel - 7H/semaine Travail en journee
Salaire : Mensuel de 2100 Euros a 2500 Euros sur 12 mois
Brut / net : brut
Source : France Travail

Au sein d'une equipe composee d'une assistante commerciale, vous intervenez principalement pour des agences immobilieres et notaires du departement du Rhone.`,
      expectedExtraction: {
        title: "DIAGNOSTIQUEUR IMMOBILIER (F/H) (H/F)",
        company: "DIMO DIAGNOSTIC",
        location: "69 - Lyon 4e Arrondissement",
        contract: "CDI",
        salary: "Mensuel de 2100 Euros a 2500 Euros sur 12 mois",
        workTime: "Temps partiel - 7H/semaine Travail en journee",
      },
    },
    {
      source: "Jobijoba",
      sourceUrl: "https://www.jobijoba.com/fr/emploi/Technicien+diagnostiqueur+immobilier+junior",
      rawText: `Poste : Technicien diagnostiqueur immobilier junior h/f
Entreprise : Sodiatec
Lieu : Fresnes
Contrat : CDI
Source : Jobijoba

Un accompagnement complet vers le metier de diagnostiqueur immobilier. La possibilite d'evoluer dans une entreprise structuree, reconnue pour son expertise et la qualite de sa formation continue.`,
      expectedExtraction: {
        title: "Technicien diagnostiqueur immobilier junior h/f",
        company: "Sodiatec",
        location: "Fresnes",
        contract: "CDI",
        salary: "",
        workTime: "",
      },
    },
    {
      source: "Test hors cible",
      sourceUrl: "",
      rawText: `Poste : Chef de projet AMO batiment
Entreprise : Cabinet Urbain Conseil
Lieu : Nantes
Contrat : CDI
Salaire : 38-44 k brut/an

Le poste coordonne des audits documentaires et des prestataires, dont des diagnostiqueurs immobiliers. La mission principale reste l'assistance a maitrise d'ouvrage et le pilotage de projet.`,
      expectedExtraction: {
        title: "Chef de projet AMO batiment",
        company: "Cabinet Urbain Conseil",
        location: "Nantes",
        contract: "CDI",
        salary: "38-44 k brut/an",
        workTime: "",
      },
    },
  ];

  const validationTags = ["POEI", "formation", "audit", "indépendant", "salaire flou", "débutant accepté", "volume"];
  const collectionTarget = 20;
  const zoneSuggestions = [
    "Toute la France",
    "Île-de-France",
    "Région parisienne",
    "Paris",
    "Hauts-de-Seine",
    "Seine-Saint-Denis",
    "Val-de-Marne",
    "Yvelines",
    "Essonne",
    "Val-d'Oise",
    "Seine-et-Marne",
    "Lyon",
    "Marseille",
    "Lille",
    "Bordeaux",
    "Nantes",
    "Toulouse",
    "Rennes",
  ];

  const app = document.getElementById("app");
  let strategy = normalizeStrategyBackup(Object.assign({}, defaultStrategy, loadJson(STRATEGY_KEY, defaultStrategy)));
  if (strategy.location === "Ile-de-France" || strategy.location === "Île-de-France") strategy.location = "";
  if (strategy.objective === "Entrer vite dans le metier avec formation interne, puis evoluer vers audit energetique.") {
    strategy.objective = "";
  }
  if (strategy.objective === "Entrer vite dans le métier avec formation interne, puis évoluer vers audit énergétique.") strategy.objective = "";
  let jobs = loadJson(STORAGE_KEY, []).map((job) => ({
    ...job,
    favorite: Boolean(job.favorite),
    ignored: Boolean(job.ignored),
    reviewStatus: normalizeReviewStatus(job),
    companyProfile: normalizeCompanyProfile(job.companyProfile),
    aiReview: normalizeAiReview(job.aiReview),
  }));
  let selectedId = jobs[0] ? jobs[0].id : null;
  let filter = "to_review";
  let rankingSearch = "";
  let statusMessage = "";
  let editingExtractionId = null;
  let uiState = Object.assign({ mode: "simple", searchReady: false, showDebugInfo: false, aiAutoAnalyze: false }, normalizeUiStateBackup(loadJson(UI_KEY, { mode: "simple", searchReady: false, showDebugInfo: false, aiAutoAnalyze: false })));
  let simpleCriteriaOpen = !uiState.searchReady;
  let lastSearchSession = normalizeSearchSessionBackup(loadJson(SESSION_KEY, null));
  let lastTop3AiComparison = normalizeTop3AiComparison(loadJson(TOP3_AI_KEY, null));
  let sourceHealthStats = normalizeSourceHealthStats(loadJson(SOURCE_HEALTH_KEY, {}));
  let networkDiagnostics = null;
  let employerRanking = null;
  let loadingAction = "";
  let tooltipCounter = 0;
  const aiManualQueue = new Map();
  let aiManualQueueTimer = null;
  let searchResult = {
    source: "Taf Sniffer local",
    sourceQuery: "",
    status: "idle",
    offers: [],
    message: "Prêt.",
  };

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function normalizeStrategyBackup(value) {
    if (!isObject(value)) throw new Error("Stratégie absente ou invalide.");
    const candidate = Object.assign({}, defaultStrategy, value);
    const poeiRequirement = normalizeRequirementMode(candidate.poeiRequirement, Boolean(candidate.priorityPoei));
    const auditRequirement = normalizeRequirementMode(candidate.auditRequirement, Boolean(candidate.priorityAudit));
    const independentRequirement = normalizeRequirementMode(candidate.independentRequirement, Boolean(candidate.rejectIndependent));

    return {
      profileId:
        typeof candidate.profileId === "string" && candidate.profileId !== DIAGNOSTIC_PROFILE_ID
          ? candidate.profileId
          : defaultStrategy.profileId,
      targetJob: typeof candidate.targetJob === "string" ? candidate.targetJob : defaultStrategy.targetJob,
      location: typeof candidate.location === "string" ? candidate.location : defaultStrategy.location,
      salaryMin: Number.isFinite(Number(candidate.salaryMin)) ? Number(candidate.salaryMin) : defaultStrategy.salaryMin,
      experienceLevel: ["debutant_reconversion", "junior", "confirme", "indifferent"].includes(candidate.experienceLevel)
        ? candidate.experienceLevel
        : defaultStrategy.experienceLevel,
      contractPreference: ["any", "cdi", "cdd", "alternance"].includes(candidate.contractPreference)
        ? candidate.contractPreference
        : defaultStrategy.contractPreference,
      hideWeakOffers: candidate.hideWeakOffers !== false,
      poeiRequirement,
      auditRequirement,
      independentRequirement,
      objective: typeof candidate.objective === "string" ? candidate.objective : defaultStrategy.objective,
      priorityTraining: Boolean(candidate.priorityTraining),
      priorityPoei: poeiRequirement !== "off",
      prioritySalary: Boolean(candidate.prioritySalary),
      priorityAudit: auditRequirement !== "off",
      rejectIndependent: independentRequirement !== "off",
      smartSearch: candidate.smartSearch !== false,
      smartLocation: candidate.smartLocation !== false,
    };
  }

  function normalizeUiStateBackup(value) {
    if (!isObject(value)) return { mode: "advanced", searchReady: false, showDebugInfo: false, aiAutoAnalyze: false };
    return {
      mode: value.mode === "advanced" ? "advanced" : "simple",
      searchReady: Boolean(value.searchReady),
      showDebugInfo: Boolean(value.showDebugInfo),
      aiAutoAnalyze: value.aiAutoAnalyze === true,
    };
  }

  function normalizeReviewStatus(job) {
    if (job.reviewStatus === "a_creuser" || job.reviewStatus === "favori" || job.reviewStatus === "ignoree") return job.reviewStatus;
    if (job.ignored) return "ignoree";
    if (job.favorite) return "favori";
    return "a_traiter";
  }

  function normalizeSearchSessionBackup(value) {
    if (!isObject(value) || typeof value.id !== "string") return null;
    return {
      id: value.id,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
      keywords: typeof value.keywords === "string" ? value.keywords : "",
      location: typeof value.location === "string" ? value.location : "",
      sourceReports: Array.isArray(value.sourceReports) ? value.sourceReports : [],
      importedCount: Number.isFinite(Number(value.importedCount)) ? Number(value.importedCount) : 0,
      duplicateCount: Number.isFinite(Number(value.duplicateCount)) ? Number(value.duplicateCount) : 0,
      skippedCount: Number.isFinite(Number(value.skippedCount)) ? Number(value.skippedCount) : 0,
    };
  }

  function normalizeSourceHealthStats(value) {
    if (!isObject(value)) return {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([source, raw]) => {
        if (!isObject(raw)) return [];
        const history = Array.isArray(raw.history)
          ? raw.history
              .filter(isObject)
              .slice(-SOURCE_HEALTH_HISTORY_LIMIT)
              .map((item) => ({
                checkedAt: typeof item.checkedAt === "string" ? item.checkedAt : "",
                count: Number(item.count || 0),
                skippedCount: Number(item.skippedCount || 0),
                blocked: Boolean(item.blocked),
                foundCount: Number(item.foundCount || 0),
                detailLinkCount: Number(item.detailLinkCount || 0),
                missingDetailCount: Number(item.missingDetailCount || 0),
                poorQualityCount: Number(item.poorQualityCount || 0),
                requiredFilterCount: Number(item.requiredFilterCount || 0),
              }))
          : [];
        return [[source, {
          source,
          searches: Number(raw.searches || 0),
          importedCount: Number(raw.importedCount || 0),
          skippedCount: Number(raw.skippedCount || 0),
          blockedCount: Number(raw.blockedCount || 0),
          foundCount: Number(raw.foundCount || 0),
          detailLinkCount: Number(raw.detailLinkCount || 0),
          missingDetailCount: Number(raw.missingDetailCount || 0),
          poorQualityCount: Number(raw.poorQualityCount || 0),
          requiredFilterCount: Number(raw.requiredFilterCount || 0),
          qualityScoreTotal: Number(raw.qualityScoreTotal || 0),
          qualityScoreCount: Number(raw.qualityScoreCount || 0),
          lastStatus: typeof raw.lastStatus === "string" ? raw.lastStatus : "",
          lastMessage: typeof raw.lastMessage === "string" ? raw.lastMessage : "",
          lastSearchedAt: typeof raw.lastSearchedAt === "string" ? raw.lastSearchedAt : "",
          history,
        }]];
      }),
    );
  }

  function normalizeRequirementMode(value, legacyEnabled) {
    if (value === "off" || value === "prefer" || value === "required") return value;
    return legacyEnabled ? "prefer" : "off";
  }

  function nextRequirementMode(value) {
    if (value === "off") return "prefer";
    if (value === "prefer") return "required";
    return "off";
  }

  function requirementPatch(key, mode) {
    const patch = { [key]: mode };
    if (key === "poeiRequirement") patch.priorityPoei = mode !== "off";
    if (key === "auditRequirement") patch.priorityAudit = mode !== "off";
    if (key === "independentRequirement") patch.rejectIndependent = mode !== "off";
    return patch;
  }

  function normalizeCompanyProfile(value, fallbackCompany = "", fallbackType = "à vérifier") {
    if (!isObject(value)) return undefined;
    const statuses = ["idle", "loading", "found", "partial", "not_found", "error"];
    const confidences = ["faible", "moyenne", "bonne"];
    const rawStatus = statuses.includes(value.status) ? value.status : "partial";
    return {
      status: rawStatus === "loading" ? "idle" : rawStatus,
      companyName: typeof value.companyName === "string" ? value.companyName : fallbackCompany,
      estimatedType: typeof value.estimatedType === "string" ? value.estimatedType : fallbackType,
      website: typeof value.website === "string" ? value.website : "",
      signals: Array.isArray(value.signals) ? value.signals.filter((item) => typeof item === "string").slice(0, 8) : [],
      confidence: confidences.includes(value.confidence) ? value.confidence : "faible",
      summary: typeof value.summary === "string" ? value.summary : "Fiche entreprise à vérifier.",
      checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString(),
      sources: Array.isArray(value.sources) ? value.sources.filter((item) => typeof item === "string").slice(0, 6) : [],
      employerRating: normalizeEmployerRating(value.employerRating),
    };
  }

  function normalizeEmployerRating(value) {
    if (!isObject(value)) return undefined;
    const score = Number(value.score);
    const confidences = ["faible", "moyenne", "bonne"];
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(5, score)) : null,
      label: typeof value.label === "string" ? value.label : "Note employeur à vérifier",
      source: typeof value.source === "string" ? value.source : "",
      sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : "",
      confidence: confidences.includes(value.confidence) ? value.confidence : "faible",
      summary: typeof value.summary === "string" ? value.summary : "Notation employeur non confirmée.",
      checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString(),
    };
  }

  function normalizeAiQualityStatus(value) {
    const text = normalize(String(value || ""));
    if (text === "conflict" || text.includes("incoherent") || text.includes("contradiction")) return "conflict";
    if (text === "verify" || text.includes("verifier") || text.includes("doute")) return "verify";
    return "ok";
  }

  function normalizeAiQualityField(value) {
    const item = isObject(value) ? value : {};
    return {
      field: cleanManualField(item.field),
      status: normalizeAiQualityStatus(item.status),
      currentValue: cleanManualField(item.currentValue),
      suggestedValue: cleanManualField(item.suggestedValue),
      reason: cleanManualField(item.reason),
    };
  }

  function normalizeAiQualityCheck(value) {
    if (!isObject(value)) return undefined;
    const quality = isObject(value) ? value : {};
    const fieldChecks = Array.isArray(quality.fieldChecks)
      ? quality.fieldChecks.map(normalizeAiQualityField).filter((item) => item.field).slice(0, 12)
      : [];
    const suggestedCorrections = Array.isArray(quality.suggestedCorrections)
      ? quality.suggestedCorrections.map(normalizeAiQualityField).filter((item) => item.field && item.suggestedValue).slice(0, 8)
      : fieldChecks.filter((item) => item.status !== "ok" && item.suggestedValue).slice(0, 8);
    const fallbackStatus = fieldChecks.some((item) => item.status === "conflict")
      ? "conflict"
      : fieldChecks.some((item) => item.status === "verify")
        ? "verify"
        : "ok";
    return {
      status: normalizeAiQualityStatus(quality.status || fallbackStatus),
      confidence: ["faible", "moyenne", "bonne"].includes(quality.confidence) ? quality.confidence : "faible",
      fieldChecks,
      warnings: Array.isArray(quality.warnings) ? quality.warnings.filter((item) => typeof item === "string").slice(0, 6) : [],
      suggestedCorrections,
    };
  }

  function normalizeAiDecisionVerdict(value) {
    if (["bonne_piste", "a_creuser", "risque", "hors_cible"].includes(value)) return value;
    return "";
  }

  function normalizeAiApplicationPrep(value) {
    const prep = isObject(value) ? value : {};
    return {
      callAngle: cleanManualField(prep.callAngle),
      message: cleanManualField(prep.message),
      checkpoints: Array.isArray(prep.checkpoints) ? prep.checkpoints.filter((item) => typeof item === "string").slice(0, 5) : [],
    };
  }

  function normalizeTop3AiComparison(value) {
    if (!isObject(value)) return null;
    return {
      jobIds: Array.isArray(value.jobIds) ? value.jobIds.filter((item) => typeof item === "string").slice(0, 3) : [],
      strategyHash: typeof value.strategyHash === "string" ? value.strategyHash : "",
      checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
      whyFirst: cleanManualField(value.whyFirst),
      riskierOffer: cleanManualField(value.riskierOffer),
      callFirst: cleanManualField(value.callFirst),
      actionSummary: cleanManualField(value.actionSummary),
    };
  }

  function normalizeAiReview(value) {
    if (!isObject(value)) return undefined;
    const statuses = ["idle", "loading", "done", "error", "skipped"];
    const confidences = ["faible", "moyenne", "bonne"];
    const rawStatus = statuses.includes(value.status) ? value.status : "skipped";
    const extraction = isObject(value.extraction) ? value.extraction : {};
    const adjustment = Math.round(Number(value.scoreAdjustment || 0));
    return {
      status: rawStatus === "loading" ? "idle" : rawStatus,
      provider: typeof value.provider === "string" ? value.provider : "Gemini",
      model: typeof value.model === "string" ? value.model : "",
      checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
      rawTextHash: typeof value.rawTextHash === "string" ? value.rawTextHash : "",
      strategyHash: typeof value.strategyHash === "string" ? value.strategyHash : "",
      extraction: {
        title: cleanManualField(extraction.title),
        company: cleanManualField(extraction.company),
        location: cleanManualField(extraction.location),
        contract: cleanManualField(extraction.contract),
        workTime: cleanManualField(extraction.workTime),
        salary: cleanManualField(extraction.salary),
        salaryKind: ["brut", "net", "non précisé"].includes(extraction.salaryKind) ? extraction.salaryKind : "",
        bonus: cleanManualField(extraction.bonus),
        bonusEstimate: cleanManualField(extraction.bonusEstimate),
        requiredExperience: cleanManualField(extraction.requiredExperience),
        benefits: cleanManualField(extraction.benefits),
        poeiSignal: Boolean(extraction.poeiSignal),
        auditSignal: Boolean(extraction.auditSignal),
        independentSignal: Boolean(extraction.independentSignal),
      },
      summary: typeof value.summary === "string" ? value.summary : "",
      strengths: Array.isArray(value.strengths) ? value.strengths.filter((item) => typeof item === "string").slice(0, 5) : [],
      blockers: Array.isArray(value.blockers) ? value.blockers.filter((item) => typeof item === "string").slice(0, 5) : [],
      uncertainties: Array.isArray(value.uncertainties) ? value.uncertainties.filter((item) => typeof item === "string").slice(0, 5) : [],
      questions: Array.isArray(value.questions) ? value.questions.filter((item) => typeof item === "string").slice(0, 5) : [],
      decisionVerdict: normalizeAiDecisionVerdict(value.decisionVerdict),
      decisionReasons: Array.isArray(value.decisionReasons) ? value.decisionReasons.filter((item) => typeof item === "string").slice(0, 3) : [],
      recruiterQuestions: Array.isArray(value.recruiterQuestions) ? value.recruiterQuestions.filter((item) => typeof item === "string").slice(0, 5) : [],
      applicationPrep: normalizeAiApplicationPrep(value.applicationPrep),
      scoreAdjustment: Number.isFinite(adjustment) ? Math.max(-12, Math.min(12, adjustment)) : 0,
      scoreReasons: Array.isArray(value.scoreReasons) ? value.scoreReasons.filter((item) => typeof item === "string").slice(0, 4) : [],
      confidence: confidences.includes(value.confidence) ? value.confidence : "faible",
      qualityCheck: normalizeAiQualityCheck(value.qualityCheck),
      errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : "",
    };
  }

  function normalizeBackup(payload) {
    if (!isObject(payload)) throw new Error("Le fichier n'est pas une sauvegarde Taf Sniffer valide.");
    if (payload.version !== BACKUP_VERSION) throw new Error("Version de sauvegarde non prise en charge.");
    if (!Array.isArray(payload.jobs)) throw new Error("La liste des annonces est absente ou invalide.");

    const importedJobs = payload.jobs.map((job, index) => {
      if (!isObject(job) || typeof job.id !== "string" || typeof job.rawText !== "string") {
        throw new Error(`Annonce invalide à la position ${index + 1}.`);
      }

      return Object.assign({}, job, {
        favorite: Boolean(job.favorite),
        ignored: Boolean(job.ignored),
        reviewStatus: normalizeReviewStatus(job),
        companyProfile: normalizeCompanyProfile(job.companyProfile),
        aiReview: normalizeAiReview(job.aiReview),
      });
    });

    return {
      version: BACKUP_VERSION,
      exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : new Date().toISOString(),
      strategy: normalizeStrategyBackup(payload.strategy),
      uiState: normalizeUiStateBackup(payload.uiState),
      lastSearchSession: normalizeSearchSessionBackup(payload.lastSearchSession),
      lastTop3AiComparison: normalizeTop3AiComparison(payload.lastTop3AiComparison),
      sourceHealthStats: normalizeSourceHealthStats(payload.sourceHealthStats),
      jobs: importedJobs,
    };
  }

  function exportBackupPayload() {
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      strategy,
      uiState,
      lastSearchSession,
      lastTop3AiComparison,
      sourceHealthStats,
      jobs,
    };
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    localStorage.setItem(STRATEGY_KEY, JSON.stringify(strategy));
    localStorage.setItem(UI_KEY, JSON.stringify(uiState));
    if (lastSearchSession) localStorage.setItem(SESSION_KEY, JSON.stringify(lastSearchSession));
    else localStorage.removeItem(SESSION_KEY);
    if (lastTop3AiComparison) localStorage.setItem(TOP3_AI_KEY, JSON.stringify(lastTop3AiComparison));
    else localStorage.removeItem(TOP3_AI_KEY);
    if (Object.keys(sourceHealthStats).length) localStorage.setItem(SOURCE_HEALTH_KEY, JSON.stringify(sourceHealthStats));
    else localStorage.removeItem(SOURCE_HEALTH_KEY);
  }

  function startLoading(action) {
    loadingAction = action;
    render();
  }

  function stopLoading(delay = 450) {
    window.setTimeout(() => {
      loadingAction = "";
      render();
    }, delay);
  }

  function buttonLoadingClass(action) {
    return loadingAction === action ? "is-loading" : "";
  }

  function buttonSpinner(action) {
    return loadingAction === action ? '<span class="button-spinner" aria-hidden="true"></span>' : "";
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function hashString(value) {
    let hash = 5381;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 33) ^ text.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
  }

  function aiJobHash(job) {
    return hashString(`${job.rawText || ""}\n${JSON.stringify(job.manualExtraction || {})}`);
  }

  function aiStrategyHash() {
    return hashString(JSON.stringify({
      targetJob: strategy.targetJob,
      location: strategy.location,
      salaryMin: strategy.salaryMin,
      experienceLevel: strategy.experienceLevel,
      contractPreference: strategy.contractPreference,
      poeiRequirement: strategy.poeiRequirement,
      auditRequirement: strategy.auditRequirement,
      independentRequirement: strategy.independentRequirement,
      objective: strategy.objective,
    }));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasAny(text, terms) {
    return terms.some((term) => text.includes(normalize(term)));
  }

  function firstMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1].trim().replace(/[.;,]$/, "");
    }
    return "";
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function compactText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function cleanExtractedValue(value) {
    return compactText(
      String(value || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\\u002F/g, "/")
        .replace(/\\"/g, '"')
        .replace(/\s+["']?\s*(?:name|content|class|id|property|data-[\w-]+)=["'][^"']*["'].*$/i, " ")
        .replace(/["']\s*>?\s*$/g, "")
        .replace(/\b(\d+)\.0\b/g, "$1"),
    );
  }

  function looksLikeJobBoardDomain(value) {
    const text = normalize(value);
    return (
      /\b(?:www\.)?[\w-]+\.(?:com|fr|net|org)\b/i.test(value) ||
      ["hellowork", "indeed", "linkedin", "france travail", "pole emploi", "pôle emploi", "apec"].some((term) => text.includes(normalize(term)))
    );
  }

  function cleanCompanyValue(value) {
    const clean = cleanExtractedValue(value)
      .replace(/^chez\s+/i, "")
      .replace(/\s*[-|]\s*(?:recrutement|emploi|jobs?).*$/i, "")
      .replace(/\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?.*$/i, "")
      .slice(0, 90);
    const text = normalize(clean);
    if (!clean || looksLikeJobBoardDomain(clean) || text.includes("entreprise non precise") || /^employeur$/.test(text) || /^(?:\d+\s*(?:a|-|\?)\s*\d+|\d+)\s+salar/.test(text)) return "";
    return clean;
  }

  function companyFromEmployerBlock(value) {
    const lines = String(value || "")
      .split(/\r?\n/)
      .map((line) => cleanExtractedValue(line))
      .filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
      if (normalize(lines[index]) === "employeur") {
        const candidate = cleanCompanyValue(lines[index + 1] || "");
        if (candidate) return candidate;
      }
    }

    const compact = cleanExtractedValue(value);
    const match = compact.match(
      /(?:^|\b)Employeur\s+(.+?)(?=\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?\b|\s+Postuler\b|\s+Contacter\b|\s+Informations?\b|\s+Actualis[ée]\b|$)/i,
    );
    return match ? cleanCompanyValue(match[1]) : "";
  }

  function companyFromNarrative(value) {
    const clean = cleanExtractedValue(value);
    const match = clean.match(
      /(?:Pourquoi rejoindre|rejoindre)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s*\?|Depuis\s+plus\s+de\s+\d+\s+ans,\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s+s['’]impose/i,
    );
    return match ? cleanCompanyValue(match[1] || match[2]) : "";
  }

  function departmentCityFrom(value) {
    const clean = cleanExtractedValue(value);
    const match = clean.match(/\b(\d{2,3})\s*-\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*(?:Localiser|[A-Z0-9]{5,})|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
    return match ? `${match[1]} - ${compactText(match[2])}` : "";
  }

  function postalCityFrom(value) {
    const clean = cleanExtractedValue(value);
    const match = clean.match(/\b(\d{5})\s+([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
    return match ? `${match[1]} ${compactText(match[2])}` : "";
  }

  function cleanLocationCandidate(value) {
    return cleanExtractedValue(value)
      .replace(/\s*-\s*Localiser\b.*$/i, "")
      .replace(/\s+Localiser\s+avec\s+Mappy\b.*$/i, "")
      .replace(/\s*-\s+[A-Z0-9]{5,}\b.*$/i, "")
      .replace(/\s+\|\s+.*$/i, "")
      .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
      .replace(/\s+(?:Contrat|Temps de travail|Salaire)\b.*$/i, "")
      .slice(0, 120);
  }

  function looksLikeSalaryNoise(value) {
    return hasAny(normalize(value), ["salaire", "remuneration", "rémunération", "euros", "brut", "net"]);
  }

  function hasSalaryWords(text) {
    return ["selon profil", "a negocier", "à négocier", "brut", "net", "annuel", "mensuel", "horaire", "euros", "eur", "€", "k"].some((term) =>
      text.includes(normalize(term)),
    );
  }

  function cleanSalaryValue(value) {
    const cleaned = cleanExtractedValue(value)
      .replace(/\s+-\s+\d{2,3}\s+-\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}(?:\s+-\s+[\w-]+)?$/i, "")
      .replace(/\s+-\s+\d{2,3}\s+-\s+.+$/i, "");
    const compacted = compactText(cleaned).slice(0, 160);
    const text = normalize(compacted);
    const technicalNoise = [
      '","',
      '":',
      "{",
      "}",
      "permis-et-certifications",
      "profil recherche",
      "infos entreprise",
      "infos complementaires",
      "étape",
      "etape",
      "renseigne",
    ];
    if (!compacted || text.includes("non indique")) return "";
    if (technicalNoise.some((term) => text.includes(normalize(term)))) return "";
    if (!/\d/.test(compacted) && !["selon profil", "a negocier", "à négocier", "smic", "non plafonne", "non plafonnée"].some((term) => text.includes(normalize(term)))) {
      return "";
    }
    if (!/\d/.test(compacted) && !hasSalaryWords(text)) return "";
    return compacted;
  }

  const technicalExtractionNoise = [
    '","',
    '":',
    "{",
    "}",
    "permis-et-certifications",
    "profil recherche",
    "infos entreprise",
    "infos complementaires",
    "étape",
    "etape",
    "renseigne",
  ];

  function cleanInfoValue(value, maxLength = 180) {
    const clean = cleanExtractedValue(value)
      .replace(/^(?:primes?|variable|commissions?|avantages?|expérience demandée|experience demandee|expérience|experience)\s*:?\s*/i, "")
      .replace(/^[\s:;,+-]+/, "")
      .replace(/\s+(?:Source|URL|Qualité extraction|À vérifier|A verifier)\s*:.*$/i, "")
      .slice(0, maxLength);
    const text = normalize(clean);
    if (!clean || technicalExtractionNoise.some((term) => text.includes(normalize(term)))) return "";
    return compactText(clean);
  }

  function splitInfoSegments(rawText) {
    return String(rawText || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\\u002F/g, "/")
      .replace(/\r/g, "\n")
      .split(/\n+|[•*]\s*|\s+\+\s+|;|\.\s+/)
      .map((segment) => cleanInfoValue(segment, 220))
      .filter(Boolean);
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  const GROSS_TO_NET_RATE = 0.78;
  const MONTHLY_HOURS = 151.67;

  function createJob(rawText, meta = {}) {
    return {
      id: uid(),
      rawText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
      ignored: false,
      reviewStatus: meta.reviewStatus || "a_traiter",
      searchBatchId: meta.searchBatchId || "",
      source: meta.source || inferSource(rawText),
      sourceUrl: meta.sourceUrl || "",
      datasetLabel: meta.datasetLabel || "jeu réel",
      expectedReview: meta.expectedReview || {
        expectedVerdict: "",
        expectedTags: [],
        expectedExtraction: {
          title: "",
          company: "",
          location: "",
          contract: "",
          salary: "",
          workTime: "",
        },
        notes: "",
      },
    };
  }

  function inferSource(rawText) {
    const text = normalize(rawText);
    if (text.includes("france travail") || text.includes("pole emploi") || text.includes("pôle emploi")) return "France Travail";
    if (text.includes("indeed")) return "Indeed";
    if (text.includes("hellowork")) return "Hellowork";
    if (text.includes("linkedin")) return "LinkedIn";
    if (text.includes("jooble")) return "Jooble";
    if (text.includes("apec")) return "Apec";
    if (text.includes("meteojob")) return "Meteojob";
    if (text.includes("welcometothejungle")) return "Welcome to the Jungle";
    if (text.includes("jobijoba")) return "Jobijoba";
    if (text.includes("talent.com")) return "Talent.com";
    if (text.includes("optioncarriere")) return "Optioncarriere";
    return "";
  }

  function findSalary(rawText) {
    const salary = cleanSalaryValue(
      firstMatch(rawText, [
        /(\d{2,3}\s?[-–]\s?\d{2,3}\s?k\s?(?:€|euros)?(?:\s?brut)?(?:\/an)?)/i,
        /(\d{1,2}\s?\d{3}\s?[-–]\s?\d{1,2}\s?\d{3}\s?(?:€|euros)?)/i,
        /(\d{1,2}\s?\d{3}\s?(?:€|euros)\s?(?:net|brut)?)/i,
        /(?:salaire|remuneration|rémunération)\s*:\s*(.+)/i,
      ]),
    );
    return salary || "Non indiqué";
  }

  function salaryKindFor(rawText, salary) {
    const salaryLine = firstMatch(rawText, [/^Salaire\s*:\s*(.+)$/im, /^Rémunération\s*:\s*(.+)$/im]);
    const explicitKindLine = firstMatch(rawText, [/^Brut\s*\/\s*net\s*:\s*(.+)$/im]);
    const scopedText = normalize(`${explicitKindLine} ${salaryLine} ${salary}`);
    const fullText = normalize(`${scopedText} ${rawText}`);

    const detect = (text) => {
      if (!text || text.includes("brut/net non precise")) return "";
      if (/(?:^|\b)brut(?:\b|$)/.test(text) && /^(?:brut|salaire brut|remuneration brut)|(?:salaire|remuneration)\s+brut\b|\bbrut\s*:\s*(?:mensuel|annuel|horaire|\d)|\bbrut\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*brut\b|\bk\s*(?:€|eur|euros?)?\s*brut\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bbrut\b/.test(text)) {
        return "brut";
      }
      if (/(?:^|\b)net(?:\b|$)/.test(text) && /^(?:net|salaire net|remuneration net)|(?:salaire|remuneration)\s+net\b|\bnet\s*:\s*(?:mensuel|annuel|horaire|\d)|\bnet\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*net\b|\bk\s*(?:€|eur|euros?)?\s*net\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bnet\b/.test(text)) {
        return "net";
      }
      return "";
    };

    return detect(scopedText) || detect(fullText) || "non précisé";
  }

  function findBonus(rawText) {
    const text = normalize(rawText);
    const bonusTerms = [
      "prime",
      "primes",
      "variable",
      "commission",
      "commissions",
      "13eme mois",
      "13e mois",
      "treizieme mois",
      "prime annuelle",
      "prime de partage",
      "sur objectifs",
      "non plafonne",
      "non plafonnée",
    ];
    if (hasAny(text, bonusTerms)) {
      const explicit = cleanInfoValue(firstMatch(rawText, [
        /^(?:primes?|variable|commissions?|rémunération variable|remuneration variable)\s*:\s*(.+)$/im,
      ]));
      const segments = splitInfoSegments(rawText)
        .filter((segment) => hasAny(normalize(segment), bonusTerms))
        .filter((segment) => !hasAny(normalize(segment), ["tickets restaurant", "titres restaurant", "panier repas", "paniers repas", "mutuelle", "chèques vacances", "cheques vacances"]));
      const values = Array.from(new Set([explicit, ...segments].filter(Boolean))).slice(0, 3);
      return values.length ? values.join(" ; ") : "Primes / variable mentionnés";
    }
    return "Non mentionnées";
  }

  const moneyFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  function formatMoney(value) {
    if (!Number.isFinite(value)) return "";
    return `${moneyFormatter.format(Math.round(Number(value)))} €`;
  }

  function moneyRange(min, max) {
    if (!Number.isFinite(min)) return "";
    if (!Number.isFinite(max) || Math.abs(Number(max) - Number(min)) < 1) return formatMoney(min);
    return `${formatMoney(min)} - ${formatMoney(max)}`;
  }

  function salaryNumbers(value) {
    return [...String(value || "").matchAll(/(\d{1,3}(?:[\s.]\d{3})+|\d+(?:[,.]\d+)?)\s*(k)?/gi)]
      .map((match) => {
        const numeric = Number(match[1].replace(/\s/g, "").replace(",", "."));
        if (!Number.isFinite(numeric)) return null;
        return match[2] ? numeric * 1000 : numeric;
      })
      .filter((value) => Number.isFinite(value) && value >= 8);
  }

  function detectSalaryPeriod(text, values) {
    const normalizedText = normalize(text);
    if (hasAny(normalizedText, ["horaire", "/h", "heure"])) return "horaire";
    if (hasAny(normalizedText, ["annuel", "annuelle", "/an", " par an", "sur 12 mois", "k brut/an", "k/an"])) return "annuel";
    if (hasAny(normalizedText, ["mensuel", "mensuelle", "/mois", " par mois", "mois"])) return "mensuel";
    const largest = Math.max(...values, 0);
    if (largest >= 10000) return "annuel";
    if (largest >= 900) return "mensuel";
    if (largest > 0 && largest <= 100) return "horaire";
    return "inconnu";
  }

  function normalizeSalaryValue(salary, salaryKind, rawText) {
    const source = cleanManualField(salary);
    const values = salaryNumbers(source).filter((value) => value >= 8 && value <= 250000);
    if (!source || source === "Non indiqué" || values.length === 0) {
      return {
        source: source || "Non indiqué",
        period: "inconnu",
        salaryKind,
        label: "Salaire comparable non disponible",
        confidence: "faible",
        notes: ["Montant fixe non détecté"],
      };
    }
    const scopedText = `${salary} ${firstMatch(rawText, [/^Salaire\s*:\s*(.+)$/im, /^Rémunération\s*:\s*(.+)$/im])}`;
    const period = detectSalaryPeriod(scopedText, values);
    const filtered = values.filter((value) => {
      if (period === "annuel") return value >= 10000;
      if (period === "mensuel") return value >= 700 && value <= 12000;
      if (period === "horaire") return value >= 8 && value <= 100;
      return value >= 700;
    });
    const usable = filtered.length ? filtered : values;
    const fixedMin = Math.min(...usable);
    const fixedMax = Math.max(...usable);
    const toMonthlyNet = (value) => {
      if (period === "annuel") return (salaryKind === "brut" ? value * GROSS_TO_NET_RATE : value) / 12;
      if (period === "mensuel") return salaryKind === "brut" ? value * GROSS_TO_NET_RATE : value;
      if (period === "horaire") return (salaryKind === "brut" ? value * GROSS_TO_NET_RATE : value) * MONTHLY_HOURS;
      return salaryKind === "brut" ? value * GROSS_TO_NET_RATE : value;
    };
    const toAnnualGross = (value) => {
      if (period === "annuel") return salaryKind === "net" ? value / GROSS_TO_NET_RATE : value;
      if (period === "mensuel") return (salaryKind === "net" ? value / GROSS_TO_NET_RATE : value) * 12;
      if (period === "horaire") return (salaryKind === "net" ? value / GROSS_TO_NET_RATE : value) * MONTHLY_HOURS * 12;
      return undefined;
    };
    const notes = [];
    if (salaryKind === "brut") notes.push("Conversion brut vers net estimée à 78 %");
    if (salaryKind === "non précisé") notes.push("Brut/net non précisé : estimation prudente");
    if (period === "inconnu") notes.push("Période salaire non détectée");
    const monthlyNetMin = toMonthlyNet(fixedMin);
    const monthlyNetMax = toMonthlyNet(fixedMax);
    const annualGrossMin = toAnnualGross(fixedMin);
    const annualGrossMax = toAnnualGross(fixedMax);
    return {
      source,
      period,
      salaryKind,
      fixedMin,
      fixedMax,
      monthlyNetMin,
      monthlyNetMax,
      annualGrossMin,
      annualGrossMax,
      label: period === "inconnu"
        ? `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois estimé`
        : `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois estimé · ${moneyRange(annualGrossMin, annualGrossMax)} brut/an`,
      confidence: salaryKind !== "non précisé" && period !== "inconnu" ? "bonne" : "moyenne",
      notes,
    };
  }

  function estimateBonusValue(bonus, normalizedSalary, aiEstimate) {
    const source = cleanManualField(bonus);
    const ai = cleanManualField(aiEstimate);
    if (ai) return ai;
    if (!source || source === "Non mentionnées") return "Non estimées";
    const text = normalize(source);
    const values = salaryNumbers(source).filter((value) => value >= 50 && value <= 50000);
    if (values.length) return `${moneyRange(Math.min(...values), Math.max(...values))} mentionnés`;
    const month = normalizedSalary.monthlyNetMin && normalizedSalary.monthlyNetMax
      ? (normalizedSalary.monthlyNetMin + normalizedSalary.monthlyNetMax) / 2
      : undefined;
    if (month && hasAny(text, ["13e mois", "13eme mois", "treizieme mois"])) return `environ ${formatMoney(month)} net/an estimé (13e mois)`;
    if (hasAny(text, ["commission", "commissions", "variable", "sur objectifs", "non plafonne"])) return "Variable mentionné, montant à confirmer";
    return "Primes mentionnées, montant à confirmer";
  }

  function findBenefits(rawText, normalizedText) {
    const sourceText = `${normalizedText} ${normalize(rawText)}`;
    const benefits = [];
    const add = (condition, label) => {
      if (condition && !benefits.includes(label)) benefits.push(label);
    };

    add(hasAny(sourceText, ["vehicule de service", "vehicule fourni", "voiture de service", "véhicule de service", "véhicule fourni"]), "Véhicule");
    add(hasAny(sourceText, ["telephone", "téléphone", "smartphone"]), "Téléphone");
    add(hasAny(sourceText, ["ordinateur", "pc portable", "tablette"]), "Ordinateur / tablette");
    add(hasAny(sourceText, ["tickets restaurant", "ticket restaurant", "titres restaurant", "titre restaurant", "restaurant"]), "Titres restaurant");
    add(hasAny(sourceText, ["panier repas", "paniers repas"]), "Paniers repas");
    add(hasAny(sourceText, ["mutuelle", "prevoyance", "prévoyance"]), "Mutuelle / prévoyance");
    add(hasAny(sourceText, ["cheques vacances", "chèques vacances"]), "Chèques vacances");
    add(hasAny(sourceText, ["cse", "ce ", "comite d'entreprise", "comité d'entreprise"]), "CSE / CE");
    add(hasAny(sourceText, ["frais pris en charge", "frais rembourses", "frais remboursés", "indemnites kilometriques", "indemnités kilométriques"]), "Frais pris en charge");
    add(hasAny(sourceText, ["outils fournis", "outillage", "equipements fournis", "équipements fournis", "pack vetements", "pack vêtements"]), "Outils / équipements");
    add(hasAny(sourceText, ["teletravail", "télétravail"]), "Télétravail");
    add(hasAny(sourceText, ["formation interne", "formation assuree", "formation assurée", "parcours d'integration", "parcours d'intégration", "accompagnement terrain", "tutorat"]), "Formation / accompagnement");

    return benefits.length ? benefits.slice(0, 8).join(", ") : "Non mentionnés";
  }

  function findRequiredExperience(rawText, normalizedText) {
    const explicit = cleanInfoValue(firstMatch(rawText, [
      /^(?:expérience demandée|experience demandee|expérience|experience|profil souhaité|profil souhaite)\s*:\s*(.+)$/im,
    ]), 120);
    const text = normalize(`${explicit} ${rawText} ${normalizedText}`);

    if (hasAny(text, ["debutant accepte", "débutant accepté", "debutant bienvenu", "sans experience", "sans expérience", "sans experience exigee", "premiere experience acceptee", "première expérience acceptée", "reconversion"])) {
      return "Débutant accepté - 0 à 1 an";
    }
    if (hasAny(text, ["junior", "profil debutant", "profil débutant"])) return "Junior - 0 à 2 ans estimés";
    if (hasAny(text, ["premiere experience", "première expérience"])) return "Première expérience - 0 à 2 ans estimés";

    const yearMatch = text.match(/\b(\d{1,2})\s*(?:an|ans)\b.{0,40}(?:experience|expérience)|(?:experience|expérience).{0,40}\b(\d{1,2})\s*(?:an|ans)\b/);
    if (yearMatch) {
      const years = Number(yearMatch[1] || yearMatch[2]);
      if (years >= 3) return `${years} ans+`;
      if (years === 1) return "1 an";
      if (years === 2) return "2 ans";
    }

    if (hasAny(text, ["profil confirme", "profil confirmé", "senior", "experience exigee", "expérience exigée", "experimente", "expérimenté"])) return "Profil confirmé - 3 ans+ estimés";
    return explicit || "Non précisée";
  }

  function experienceFitFor(requiredExperience) {
    const text = normalize(requiredExperience);
    if (hasAny(text, ["debutant", "sans experience", "reconversion"])) return "reconversion_ok";
    if (hasAny(text, ["junior", "premiere experience", "1 an"])) return "junior";
    if (hasAny(text, ["2 ans", "3 ans", "4 ans", "5 ans", "confirme", "senior", "exigee", "experimente"])) return "confirme";
    return "unknown";
  }

  function cleanWorkTimeValue(value) {
    const clean = cleanExtractedValue(value)
      .replace(/\s+Salaire\b.*$/i, "")
      .replace(/\s+Profil souhait\S*\b.*$/i, "")
      .replace(/\s+Type de contrat\b.*$/i, "")
      .replace(/\s+Contrat travail\b.*$/i, "")
      .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
      .slice(0, 140);
    const text = normalize(clean);
    if (!clean || text.includes("salaire") || text.includes("remuneration") || text.includes("euros")) return "";

    const precise = clean.match(
      /\b(?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^.;\n-]{2,50})?/i,
    );
    if (precise) return compactText(precise[0]);

    const broad = clean.match(/\bTemps\s+(?:plein|partiel)\b(?:\s*-\s*[^.;\n]{2,80})?/i);
    return broad ? compactText(broad[0]) : "";
  }

  function findWorkTime(rawText, text) {
    const explicit = cleanWorkTimeValue(firstMatch(rawText, [
      /(?:temps de travail|durÃ©e du travail|horaire|horaires)\s*:\s*(.+)/i,
      /((?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^.;\n-]{2,50})?)/i,
      /(Temps\s+(?:plein|partiel)(?:\s*-\s*[^.;\n]{2,80})?)/i,
    ]));
    if (explicit) return explicit.slice(0, 80);
    if (hasAny(text, ["temps partiel", "part-time"])) return "Temps partiel";
    if (hasAny(text, ["temps plein", "full time"])) return "Temps plein";
    return "Non précisé";
  }

  function normalizeTitle(text, profile = getActiveProfile()) {
    const fallback = profile.analysis.titleFallbacks.find((item) => item.terms.some((term) => text.includes(normalize(term))));
    return fallback ? fallback.title : "Poste à qualifier";
  }

  function findTitle(rawText, text, profile = getActiveProfile()) {
    const explicit = firstMatch(rawText, [
      /(?:poste|intitul[eé]|titre)\s*:\s*(.+)/i,
      /(?:recrute|recherche)\s+(?:un|une)?\s*(.+)/i,
    ]);
    if (explicit) return explicit.slice(0, 90);

    const firstLine = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 8);

    if (firstLine) return firstLine.slice(0, 90);
    const fallback = profile.analysis.titleFallbacks.find((item) => item.terms.some((term) => text.includes(normalize(term))));
    if (fallback) return fallback.title;
    return "Offre importée";
  }

  function findCompany(rawText) {
    return (
      companyFromEmployerBlock(rawText) ||
      companyFromNarrative(rawText) ||
      cleanCompanyValue(firstMatch(rawText, [
        /(?:entreprise|societe|société|employeur)\s*:\s*(.+)/i,
        /chez\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ0-9&' -]{2,45})/,
      ])) || "Entreprise non précisée"
    );
  }

  function hasKnownCompany(company) {
    return Boolean(cleanCompanyValue(company));
  }

  function companyTypeFor(company, text) {
    if (!hasKnownCompany(company)) return "à identifier";
    const combined = `${normalize(company)} ${text}`;
    if (hasAny(combined, ["adecco", "randstad", "manpower", "temporis", "partnaire", "supplay", "hays", "expectra", "recrutement", "interim", "intérim"])) {
      return "recruteur / intérim";
    }
    if (hasAny(combined, ["bureau veritas", "socotec", "apave", "dekra", "qualiconsult", "ginger", "artelia", "setec"])) {
      return "grand groupe technique";
    }
    if (hasAny(combined, ["franchise", "reseau", "réseau", "agent commercial", "diagamter", "agenda diagnostics", "arliane", "activexpertise", "activ'expertise"])) {
      return "réseau / franchise";
    }
    if (hasAny(combined, ["mairie", "commune", "departement", "département", "region", "région", "collectivite", "collectivité", "habitat", "hlm", "office public", "centre hospitalier", "universite", "université"])) {
      return "public / bailleur";
    }
    if (hasAny(combined, ["cabinet", "bureau d'etudes", "bureau d'études", "bet", "sas", "sarl", "diagnostic", "diag", "ingenierie", "ingénierie"])) {
      return "cabinet / PME métier";
    }
    return "à vérifier";
  }

  function companySearchUrlFor(company, profile = getActiveProfile()) {
    return hasKnownCompany(company)
      ? `https://www.google.com/search?q=${encodeURIComponent(`${company} ${profile.analysis.companySearchContext}`)}`
      : "";
  }

  function findLocation(rawText, text) {
    const explicit = firstMatch(rawText, [
      /(?:lieu|localisation|ville|secteur|poste base|poste basé|adresse|département|departement)\s*:\s*(.+)/i,
      /\b(\d{2,3}\s*-\s*[A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\s+Localiser|\s+-\s+[A-Z0-9]{5,}\b|\s+\|))/i,
      /\b(?:poste|emploi|mission)\s+(?:a|à|sur)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ -]{2,45})/i,
    ]);
    if (explicit) {
      const clean = cleanLocationCandidate(explicit);
      const normalizedExplicit = normalize(clean);
      const recovered = departmentCityFrom(clean) || postalCityFrom(clean);
      if (recovered) return recovered.slice(0, 60);
      if (clean && !normalizedExplicit.includes("lieu non precise") && !looksLikeSalaryNoise(clean)) {
        return clean.slice(0, 60);
      }
    }

    const recoveredDepartmentCity = departmentCityFrom(rawText);
    if (recoveredDepartmentCity) return recoveredDepartmentCity.slice(0, 60);

    const addressLine = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => postalCityFrom(line) && !looksLikeSalaryNoise(line));
    if (addressLine) return postalCityFrom(addressLine).slice(0, 80);

    const known = [
      "paris",
      "ile-de-france",
      "ile de france",
      "lyon",
      "marseille",
      "lille",
      "bordeaux",
      "nantes",
      "toulouse",
      "rennes",
      "versailles",
      "nanterre",
      "creteil",
    ];
    const found = known.find((location) => text.includes(location));
    return found ? found.replace("ile de france", "Île-de-France") : "Lieu non précisé";
  }

  function findContract(text) {
    if (hasAny(text, ["alternance", "apprentissage", "contrat pro"])) return "Alternance";
    if (hasAny(text, ["cdi"])) return "CDI";
    if (hasAny(text, ["cdd"])) return "CDD";
    if (hasAny(text, ["interim", "intérim"])) return "Interim";
    if (hasAny(text, ["independant", "auto-entrepreneur", "agent commercial"])) return "Indépendant";
    return "Contrat non précisé";
  }

  function addSignal(list, condition, label) {
    if (condition && !list.includes(label)) list.push(label);
  }

  function confidenceFor(rawText, salaryClear, company, location, contract, uncertainties) {
    let confidence = 50;
    const reasons = [];

    if (rawText.length >= 700) {
      confidence += 18;
      reasons.push("annonce assez détaillée");
    } else if (rawText.length < 320) {
      confidence -= 18;
      reasons.push("annonce courte");
    }

    if (salaryClear) confidence += 10;
    else reasons.push("salaire absent");

    if (!company.includes("non précisée")) confidence += 7;
    else reasons.push("entreprise non précisée");

    if (!location.includes("non précisé")) confidence += 5;
    if (!contract.includes("non précisé")) confidence += 5;

    confidence -= uncertainties.length * 6;

    if (confidence >= 72) return { level: "bonne", reasons };
    if (confidence >= 48) return { level: "moyenne", reasons };
    return { level: "faible", reasons };
  }

  function unique(items) {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  }

  function stripAccents(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function experienceVariants(target, experienceLevel = "debutant_reconversion") {
    const profile = getActiveProfile(Object.assign({}, strategy, { targetJob: target }));
    if (experienceLevel === "indifferent") return [];
    if (experienceLevel === "confirme") {
      return [`${target} confirmé`, `${target} senior`, ...profile.search.confirmedVariants];
    }
    if (experienceLevel === "junior") {
      return [
        `${target} junior`,
        `${target} première expérience`,
        ...profile.search.juniorVariants,
      ];
    }
    return [
      `${target} débutant`,
      `${target} junior`,
      `${target} sans expérience`,
      `${target} reconversion`,
      `${target} formation`,
      `${target} POEI`,
      ...profile.search.beginnerVariants,
    ];
  }

  function buildKeywordVariants(targetJob, smartSearch = true, experienceLevel = "debutant_reconversion") {
    const profile = getActiveProfile(Object.assign({}, strategy, { targetJob }));
    const target = String(targetJob || "").trim() || profile.defaultTargetJob;
    const text = normalize(target);
    const base = [target, stripAccents(target)];
    if (!smartSearch) return unique(base);

    const genericVariants = profile.search.shortReplacements.map((replacement) => target.replace(replacement.from, replacement.to));
    const diagnosticVariants =
      profile.search.triggerTerms.some((term) => text.includes(normalize(term)))
        ? profile.search.smartVariants
        : [];

    const xpVariants = experienceVariants(target, experienceLevel);
    return unique([...base, ...xpVariants, ...genericVariants, ...diagnosticVariants, ...xpVariants.map(stripAccents), ...diagnosticVariants.map(stripAccents)]).slice(0, 28);
  }

  function buildLocationVariants(location, smartLocation = true) {
    const value = String(location || "").trim();
    const text = normalize(value);
    if (!value || text === "toute la france" || text === "france entiere") return [""];
    if (!smartLocation) return unique([value]);

    const idfAliases = ["ile-de-france", "ile de france", "idf", "region parisienne", "paris", "75"];
    if (idfAliases.some((alias) => text.includes(normalize(alias)))) {
      return unique([
        value,
        "Île-de-France",
        "Région parisienne",
        "Paris",
        "75",
        "Hauts-de-Seine",
        "92",
        "Seine-Saint-Denis",
        "93",
        "Val-de-Marne",
        "94",
        "Yvelines",
        "78",
        "Essonne",
        "91",
        "Val-d'Oise",
        "95",
        "Seine-et-Marne",
        "77",
      ]);
    }

    return unique([value, stripAccents(value)]);
  }

  function hasPoeiSignal(value) {
    const text = normalize(value);
    return (
      /\bpoei\b/.test(text) ||
      /\bpoe\b/.test(text) ||
      /\bafpr\b/.test(text) ||
      /\bpoei\s+individuelle\b/.test(text) ||
      /\bpreparations?\s+operationnelles?\s+(?:(?:a|pour)\s+l(?:'|’|\s)?)?emploi\b/.test(text) ||
      /\bpreparations?\s+operationnelles?\s+(?:a\s+)?l(?:'|’|\s)?emploi\s+individuelles?\b/.test(text) ||
      /\bactions?\s+de\s+formations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
      /\bformations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
      /\bformations?\s+de\s+preparations?\b/.test(text)
    );
  }

  function hasPoeiEquivalentSignal(value) {
    const text = normalize(value);
    return (
      text.includes("formation assuree par nos soins") ||
      text.includes("formation assuree") ||
      text.includes("formation interne") ||
      text.includes("nous vous formons") ||
      text.includes("nous formons") ||
      text.includes("debutant accepte formation") ||
      text.includes("formation debutant") ||
      text.includes("formation employeur")
    );
  }

  function hasPoeiOrEquivalentSignal(value) {
    return hasPoeiSignal(value) || hasPoeiEquivalentSignal(value);
  }

  function hasAuditSignal(value) {
    const profile = getActiveProfile();
    const text = normalize(value);
    return [...profile.analysis.strategicTerms, ...profile.analysis.trajectoryTerms].some((term) => text.includes(normalize(term)));
  }

  function applyRequiredTerms(keyword) {
    const profile = getActiveProfile();
    const terms = [];
    if (strategy.poeiRequirement === "required" && !hasPoeiOrEquivalentSignal(keyword)) terms.push("POEI");
    if (strategy.auditRequirement === "required" && !hasAuditSignal(keyword)) terms.push(profile.search.requiredStrategicFallback);
    return [keyword, ...terms].join(" ").trim();
  }

  function expandRequiredTerms(keyword) {
    const profile = getActiveProfile();
    let variants = [keyword.trim()];
    const smartSearch = strategy.smartSearch !== false;
    if (strategy.poeiRequirement === "required" && !hasPoeiOrEquivalentSignal(keyword)) {
      const poeiTerms = smartSearch
        ? [
            "POEI",
            "POEI individuelle",
            "POE",
            "AFPR",
            "preparation operationnelle emploi",
            "formation prealable recrutement",
            "formation de preparation",
            "formation assurée",
            "formation assuree",
            "formation assurée par nos soins",
            "formation interne",
            "débutant accepté formation",
            "nous vous formons",
          ]
        : ["POEI"];
      variants = variants.flatMap((variant) => poeiTerms.map((term) => `${variant} ${term}`.trim()));
    }
    if (strategy.auditRequirement === "required" && !hasAuditSignal(keyword)) {
      const auditTerms = smartSearch ? profile.search.requiredStrategicTerms : [profile.search.requiredStrategicFallback];
      variants = variants.flatMap((variant) => auditTerms.map((term) => `${variant} ${term}`.trim()));
    }
    return variants.map(applyRequiredTerms);
  }

  function generateSearchQueries() {
    const profile = getActiveProfile();
    const target = strategy.targetJob || profile.defaultTargetJob;
    const location = strategy.location || "";
    const keywords = unique(buildKeywordVariants(target, strategy.smartSearch !== false, strategy.experienceLevel).flatMap(expandRequiredTerms));
    const locationVariants = buildLocationVariants(location, strategy.smartLocation !== false);
    const primaryLocation = locationVariants[0] || "";

    const primary = keywords.slice(0, 8);
    const links = primary.flatMap((keyword) => {
      const q = primaryLocation ? `${keyword} ${primaryLocation}` : keyword;
      const encodedLocation = encodeURIComponent(primaryLocation);
      return [
        {
          label: `${keyword} · France Travail`,
          source: "France Travail",
          url: `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(keyword)}${primaryLocation ? `&lieux=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Indeed`,
          source: "Indeed",
          url: `https://fr.indeed.com/jobs?q=${encodeURIComponent(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Hellowork`,
          source: "Hellowork",
          url: `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${encodeURIComponent(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · LinkedIn`,
          source: "LinkedIn",
          url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}${primaryLocation ? `&location=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Jooble`,
          source: "Jooble",
          url: `https://fr.jooble.org/SearchResult?ukw=${encodeURIComponent(keyword)}${primaryLocation ? `&rgns=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Apec`,
          source: "Apec",
          url: `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${encodeURIComponent(keyword)}${primaryLocation ? `&lieux=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Meteojob`,
          source: "Meteojob",
          url: `https://www.meteojob.com/jobs?what=${encodeURIComponent(keyword)}${primaryLocation ? `&where=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Welcome to the Jungle`,
          source: "Welcome to the Jungle",
          url: `https://www.welcometothejungle.com/fr/jobs?query=${encodeURIComponent(keyword)}${primaryLocation ? `&aroundQuery=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Jobijoba`,
          source: "Jobijoba",
          url: `https://www.jobijoba.com/fr/query/?what=${encodeURIComponent(keyword)}${primaryLocation ? `&where=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Talent.com`,
          source: "Talent.com",
          url: `https://fr.talent.com/jobs?k=${encodeURIComponent(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Optioncarriere`,
          source: "Optioncarriere",
          url: `https://www.optioncarriere.com/recherche/emplois?s=${encodeURIComponent(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
        },
        {
          label: `${keyword} · Google`,
          source: "Google",
          url: `https://www.google.com/search?q=${encodeURIComponent(`${q} offre emploi`)}`,
        },
      ];
    });

    return { keywords, locationVariants, links };
  }

  function splitDraftOffers(text) {
    return String(text)
      .split(/\n\s*(?:---|###)\s*\n/g)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 40);
  }

  function normalizeDedupe(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rawFieldValue(rawText, label) {
    const match = String(rawText || "").match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "im"));
    return match && match[1] ? match[1].trim() : "";
  }

  function jobDedupeKey(job) {
    if (job.sourceUrl) return `url:${normalizeDedupe(job.sourceUrl)}`;
    if (job.sourceId) return `source:${normalizeDedupe(job.sourceId)}`;
    if (job.id && String(job.id).startsWith("france-travail-")) return `id:${job.id}`;
    const title = rawFieldValue(job.rawText, "Poste");
    const company = rawFieldValue(job.rawText, "Entreprise");
    const location = rawFieldValue(job.rawText, "Lieu");
    if (title && company && location) return `fields:${normalizeDedupe(`${job.source || ""} ${title} ${company} ${location}`)}`;
    return `text:${normalizeDedupe(job.rawText).slice(0, 180)}`;
  }

  function isSearchResultUrl(url) {
    const value = String(url || "");
    return [
      /candidat\.francetravail\.fr\/offres\/recherche(?:\?|$)/i,
      /hellowork\.com\/fr-fr\/emploi\/recherche/i,
      /indeed\.com\/jobs\?/i,
      /linkedin\.com\/jobs(?:\/search|\?)/i,
      /jooble\.org\/SearchResult/i,
      /apec\.fr\/candidat\/recherche-emploi\.html\/emploi(?:\?|$)/i,
      /meteojob\.com\/jobs\?/i,
      /welcometothejungle\.com\/fr\/jobs\?/i,
      /jobijoba\.com\/fr\/query/i,
      /jobijoba\.com\/fr\/emploi(?:\/|$)/i,
      /talent\.com\/jobs\?/i,
      /optioncarriere\.com\/recherche\/emplois/i,
    ].some((pattern) => pattern.test(value));
  }

  function importTitle(job) {
    return rawFieldValue(job.rawText, "Poste") || rawFieldValue(job.rawText, "Titre") || rawFieldValue(job.rawText, "Intitulé");
  }

  function isWeakImportTitle(title) {
    const text = normalizeDedupe(title);
    return !text || text.length < 4 || ["offre importee", "recherche", "emploi", "annonce"].some((term) => text === term || text.includes(`${term} sans titre`));
  }

  function importRejectReason(job) {
    const title = importTitle(job);
    if (isSearchResultUrl(job.sourceUrl)) return "lien de recherche";
    if (isWeakImportTitle(title)) return "titre inexploitable";
    if (!String(job.source || "").trim()) return "source absente";
    if (!String(job.rawText || "").trim() || job.rawText.length < 260) return "contenu trop court";
    if (!job.sourceUrl && !job.searchUrl && job.rawText.length < 700) return "lien détail absent";
    if (job.extractionQuality === "à vérifier" && !job.sourceUrl && job.rawText.length < 900) return "extraction trop fragile";
    return "";
  }

  function prepareImportedRecord(record, meta = {}) {
    const needsReview =
      record.extractionReview === "needs_review" ||
      record.extractionQuality === "à vérifier" ||
      !record.sourceUrl ||
      !record.extractionQuality;
    const notes = Array.from(new Set([]
      .concat(record.extractionNotes || [])
      .concat(needsReview && !record.sourceUrl ? ["Lien annonce absent"] : [])
      .concat(needsReview && record.extractionQuality === "à vérifier" ? ["Extraction fragile"] : [])));
    return {
      ...record,
      favorite: false,
      ignored: false,
      reviewStatus: "a_traiter",
      searchBatchId: meta.searchBatchId || record.searchBatchId || "",
      source: record.source || "",
      datasetLabel: record.datasetLabel || "jeu réel",
      extractionReview: needsReview ? "needs_review" : record.extractionReview || "ok",
      extractionNotes: notes.length ? notes : record.extractionNotes,
      updatedAt: new Date().toISOString(),
    };
  }

  function extractionLabel(quality) {
    return quality || "manuelle";
  }

  function hasManualExtraction(job) {
    const manual = job.manualExtraction || {};
    return ["title", "company", "location", "contract", "workTime", "salary", "bonus", "requiredExperience", "benefits"].some((key) => cleanManualField(manual[key]));
  }

  function extractionReviewValue(job) {
    if (job.extractionReview === "ok" || job.extractionReview === "needs_review" || job.extractionReview === "manual") return job.extractionReview;
    if (hasManualExtraction(job)) return "manual";
    if (job.extractionQuality === "à vérifier") return "needs_review";
    return "ok";
  }

  function extractionReviewLabel(value) {
    if (value === "manual") return "Corrigée manuellement";
    if (value === "needs_review") return "À vérifier";
    return "Extraction OK";
  }

  function datasetDisplayLabel(label) {
    if (!label || label === "jeu réel") return "Recherche";
    if (label === "exemple") return "Exemple";
    return label;
  }

  function reviewStatusLabel(status) {
    if (status === "a_creuser") return "À creuser";
    if (status === "favori") return "Favori";
    if (status === "ignoree") return "Ignorée";
    return "À traiter";
  }

  function reviewStatusClass(status) {
    if (status === "a_creuser") return "status-explore";
    if (status === "favori") return "status-favorite";
    if (status === "ignoree") return "status-ignored";
    return "status-review";
  }

  function experienceLabel(value) {
    if (value === "junior") return "Junior";
    if (value === "confirme") return "Confirmé";
    if (value === "indifferent") return "Indifférent";
    return "Débutant / reconversion";
  }

  function contractPreferenceLabel(value) {
    if (value === "cdi") return "CDI";
    if (value === "cdd") return "CDD";
    if (value === "alternance") return "Alternance";
    return "Peu importe";
  }

  function contractMatchesPreference(contractText, preference) {
    if (preference === "any") return true;
    if (preference === "cdi") return hasAny(contractText, ["cdi", "duree indeterminee"]);
    if (preference === "cdd") return hasAny(contractText, ["cdd", "duree determinee"]);
    if (preference === "alternance") return hasAny(contractText, ["alternance", "apprentissage", "professionnalisation"]);
    return true;
  }

  function evaluateDecisionFit(analysis, currentStrategy = strategy) {
    const reasons = [];
    const activeProfile = getActiveProfile(currentStrategy);
    const contractText = normalize(analysis.contract);
    const redFlagsText = normalize(analysis.redFlags.join(" "));
    const uncertaintiesText = normalize(analysis.uncertainties.join(" "));
    const positivesText = normalize(analysis.positiveSignals.join(" "));
    const scoreLabelsText = normalize(analysis.scoreLines.map((line) => line.label).join(" "));
    const allSignals = `${redFlagsText} ${uncertaintiesText} ${scoreLabelsText}`;
    const positiveAndScore = `${positivesText} ${scoreLabelsText}`;
    const poeiEquivalent = positiveAndScore.includes("formation employeur") || allSignals.includes("formation employeur");
    const strategicPositive = [
      ...activeProfile.analysis.strategicTerms,
      ...activeProfile.analysis.trajectoryTerms,
      activeProfile.ui.strategicDetectedLabel,
      "audit",
      "renovation",
    ].some((term) => positiveAndScore.includes(normalize(term)));
    const strategicMissing = allSignals.includes(normalize(activeProfile.ui.strategicMissingLabel)) || allSignals.includes("audit energetique non confirme");
    const contractPreference = currentStrategy.contractPreference || "any";
    const poeiRequirement = currentStrategy.poeiRequirement || (currentStrategy.priorityPoei ? "prefer" : "off");
    const auditRequirement = currentStrategy.auditRequirement || (currentStrategy.priorityAudit ? "prefer" : "off");
    const independentRequirement = currentStrategy.independentRequirement || (currentStrategy.rejectIndependent ? "prefer" : "off");

    if (!contractMatchesPreference(contractText, contractPreference)) {
      reasons.push(`Contrat souhaité : ${contractPreferenceLabel(contractPreference)}`);
    }
    if (independentRequirement !== "off" && (contractText.includes("independant") || redFlagsText.includes("independant"))) {
      reasons.push("Statut indépendant");
    }
    if (poeiRequirement === "required" && !positiveAndScore.includes("poei") && !positiveAndScore.includes("afpr")) {
      reasons.push(poeiEquivalent ? "POEI non mentionnée, formation employeur à vérifier" : "POEI obligatoire absente");
    }
    if (auditRequirement === "required" && !strategicPositive) {
      reasons.push(activeProfile.ui.strategicRequiredMissingLabel);
    }
    if (analysis.scores.global < 45 || analysis.riskLevel === "élevé") reasons.push("Score faible ou risque élevé");
    if (allSignals.includes("salaire absent") || analysis.salary === "Non indiqué") reasons.push("Salaire absent");
    if (currentStrategy.priorityTraining && allSignals.includes("formation non confirmee")) reasons.push("Formation non confirmée");
    if (poeiRequirement === "prefer" && allSignals.includes("poei non mentionnee")) {
      reasons.push(poeiEquivalent ? "POEI non mentionnée, formation employeur à vérifier" : "POEI non mentionnée");
    }
    if (auditRequirement === "prefer" && strategicMissing) reasons.push(activeProfile.ui.strategicMissingLabel);

    const hasContractMismatch = reasons.some((reason) => reason.includes("Contrat souhaité"));
    const hasRequiredMissing = reasons.some((reason) => reason.includes("obligatoire"));
    const hasStrictIndependentMismatch = independentRequirement === "required" && reasons.includes("Statut indépendant");
    const hardMismatch =
      hasContractMismatch ||
      hasRequiredMissing ||
      hasStrictIndependentMismatch ||
      analysis.scores.global < 35 ||
      (analysis.riskLevel === "élevé" && analysis.scores.global < 52);
    const fit = hardMismatch ? "weak" : reasons.length ? "review" : "match";
    return { fit, reasons: reasons.slice(0, 3) };
  }

  function hasRequiredMismatch(analysis, currentStrategy = strategy) {
    const reasons = evaluateDecisionFit(analysis, currentStrategy).reasons.join(" ");
    return (
      reasons.includes("obligatoire") ||
      (currentStrategy.independentRequirement === "required" && reasons.includes("Statut indépendant"))
    );
  }

  function decisionFitLabel(fit) {
    if (fit === "match") return "Dans les critères";
    if (fit === "weak") return "Écartée";
    return "À creuser";
  }

  function decisionFitClass(fit) {
    if (fit === "match") return "fit-match";
    if (fit === "weak") return "fit-weak";
    return "fit-review";
  }

  function looksMissing(value, fragments) {
    const text = normalizeDedupe(value || "");
    return !text || fragments.some((fragment) => text.includes(fragment));
  }

  function compactSalaryLabel(analysis) {
    const salary = (analysis.normalizedSalary && analysis.normalizedSalary.label) || analysis.salary;
    return looksMissing(salary, ["non indique", "non detecte", "non precise", "salaire non"])
      ? "salaire à vérifier"
      : salary;
  }

  function compactContractLabel(analysis) {
    return looksMissing(analysis.contract, ["non precise", "non detecte"]) ? "contrat à vérifier" : analysis.contract;
  }

  function compactLocationLabel(analysis) {
    return looksMissing(analysis.location, ["non detecte", "lieu non"]) ? "lieu à vérifier" : analysis.location;
  }

  function companyTypeDisplay(value) {
    return value === "à identifier" ? "type inconnu" : value;
  }

  function infoChip(tag, className, bodyHtml, tooltip, attributes = "") {
    const id = `chip-tip-${++tooltipCounter}`;
    return `
      <span class="info-chip-wrap">
        <${tag} class="info-chip-trigger ${className}" tabindex="${tag === "button" ? "" : "0"}" aria-describedby="${id}" ${attributes}>
          ${bodyHtml}
        </${tag}>
        <span class="info-tooltip" id="${id}" role="tooltip">${escapeHtml(tooltip)}</span>
      </span>
    `.replace('tabindex=""', "");
  }

  function requirementTooltip(label, mode) {
    const normalized = normalize(label);
    if (normalized.includes("independant")) {
      if (mode === "required") return "Filtre strict : les offres avec indépendant imposé sont écartées du tri prioritaire.";
      if (mode === "prefer") return "Signal surveillé : les offres indépendantes sont pénalisées mais restent visibles.";
      return "Ce risque n'est pas utilisé pour filtrer ou pénaliser les offres.";
    }
    if (mode === "required") return "Obligatoire : Taf Sniffer cherche ce signal et écarte les offres qui ne le montrent pas clairement.";
    if (mode === "prefer") return "Souhaité : ce signal aide le classement, sans exclure automatiquement les autres offres.";
    return "Ignoré : ce critère ne pèse pas dans le tri actuel.";
  }

  function extractionSourceTooltip(source) {
    if (source === "manual") return "Correction manuelle : elle prime sur l'IA, la source et la détection locale.";
    if (source === "structured") return "Champ fourni directement par la source de l'annonce quand elle expose une donnée fiable.";
    if (source === "ai") return "Champ réécrit par l'IA après lecture de l'annonce. À vérifier si une alerte apparaît.";
    return "Champ détecté localement par Taf Sniffer à partir du texte de l'annonce.";
  }

  function fieldQualityTooltip(quality, reason = "") {
    const base = quality === "conflict"
      ? "Conflit détecté : Taf Sniffer garde la valeur la plus sûre et te propose de corriger si besoin."
      : "À vérifier : le champ est exploitable, mais un détail peut être ambigu.";
    return reason ? `${base} ${reason}` : base;
  }

  function salaryKindTooltip(kind) {
    if (kind === "brut") return "Salaire annoncé en brut : Taf Sniffer l'utilise avec prudence pour comparer le cashflow.";
    if (kind === "net") return "Salaire annoncé en net : comparaison cashflow plus directe.";
    return "Brut ou net non précisé : le salaire reste à clarifier avant décision.";
  }

  function companyTypeTooltip(type) {
    return type === "à identifier" || type === "type inconnu"
      ? "Type d'employeur non confirmé. Utilise Identifier ou vérifie le site employeur."
      : `Type estimé : ${type}. Cette info aide à repérer cabinet métier, groupe, franchise ou intérim.`;
  }

  function experienceFitTooltip(fit) {
    if (fit === "reconversion_ok") return "Signal favorable : l'annonce semble accepter 0 à 1 an d'expérience ou une reconversion.";
    if (fit === "junior") return "Profil junior accepté ou probable : estimation 0 à 2 ans, à confirmer avec le recruteur.";
    if (fit === "confirme") return "Profil confirmé attendu : estimation 3 ans ou plus, risque d'être moins adapté à une entrée métier.";
    return "Expérience demandée peu claire : à vérifier dans l'annonce ou par téléphone.";
  }

  function sourceHealthTooltip(kind) {
    if (kind === "useful") return "Sources qui ont récemment donné des annonces exploitables dans Taf Sniffer.";
    if (kind === "watch") return "Sources encore en observation : il faut plus de recherches avant de juger leur fiabilité.";
    return "Sources en échec répété sur plusieurs recherches, sans annonce exploitable importée.";
  }

  function confidenceTooltip(confidence) {
    if (confidence === "bonne") return "Confiance bonne : les champs clés sont assez présents pour trier l'offre.";
    if (confidence === "moyenne") return "Confiance moyenne : l'offre est exploitable, mais quelques points restent à vérifier.";
    if (confidence === "faible") return "Confiance faible : lis l'annonce ou corrige les infos avant de décider.";
    return "Indicateur de confiance : il signale si l'information est assez solide pour décider.";
  }

  function requirementChip(key, label, mode) {
    const title = mode === "required" ? "Obligatoire" : mode === "prefer" ? "Souhaité" : "Ignoré";
    return infoChip(
      "button",
      `requirement-chip ${escapeHtml(mode)}`,
      `<span class="chip-check">${mode === "off" ? "" : "✓"}</span>${escapeHtml(label)}${mode === "required" ? "<em>obligatoire</em>" : ""}`,
      `${title}. ${requirementTooltip(label, mode)}`,
      `type="button" data-requirement="${escapeHtml(key)}"`,
    );
  }

  function experienceFitLabel(value) {
    if (value === "reconversion_ok") return "0-1 an ok";
    if (value === "junior") return "0-2 ans";
    if (value === "confirme") return "3 ans+";
    return "à vérifier";
  }

  function buildDecisionSummary(analyses) {
    const summary = {
      match: 0,
      review: 0,
      weak: 0,
      hiddenWeak: 0,
      topReasons: [],
    };
    const reasonCounts = {};
    analyses
      .filter(({ job }) => !job.ignored)
      .forEach(({ analysis }) => {
        const decision = evaluateDecisionFit(analysis);
        summary[decision.fit] += 1;
        if (decision.fit === "weak" && strategy.hideWeakOffers) summary.hiddenWeak += 1;
        decision.reasons.forEach((reason) => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      });
    summary.topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    return summary;
  }

  function emptyEmployerRating(company) {
    return {
      score: null,
      label: "Note à vérifier",
      source: "",
      sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${company} avis employeur salaire avantages`)}`,
      confidence: "faible",
      summary: "Notation employeur non trouvée automatiquement.",
      checkedAt: new Date().toISOString(),
    };
  }

  function benefitsListFor(analysis) {
    return String(analysis.benefits || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !/non mentionn/i.test(item));
  }

  function employerRankingScore(salaryMonthlyNet, benefitsCount, rating, bestOfferScore) {
    const salaryScore = salaryMonthlyNet ? Math.min(100, Math.max(0, (salaryMonthlyNet / 2800) * 100)) : 35;
    const benefitScore = Math.min(100, benefitsCount * 14);
    const ratingScore = rating.score !== null ? (rating.score / 5) * 100 : 45;
    return Math.round(salaryScore * 0.35 + benefitScore * 0.25 + ratingScore * 0.25 + bestOfferScore * 0.15);
  }

  function buildEmployerRanking(analyses, ratings = new Map()) {
    const groups = new Map();
    analyses
      .filter(({ job, analysis }) => !job.ignored && !analysis.company.toLowerCase().includes("non précisée"))
      .forEach((item) => {
        const company = item.analysis.company.trim();
        groups.set(company, (groups.get(company) || []).concat(item));
      });

    const items = Array.from(groups.entries())
      .map(([company, companyItems]) => {
        const ranked = companyItems.slice().sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
        const best = ranked[0];
        const salaries = companyItems
          .map(({ analysis }) => analysis.normalizedSalary.monthlyNetMax || analysis.normalizedSalary.monthlyNetMin || 0)
          .filter((value) => value > 0);
        const salaryMonthlyNet = salaries.length ? Math.max(...salaries) : 0;
        const benefits = [...new Set(companyItems.flatMap(({ analysis }) => benefitsListFor(analysis)))].slice(0, 8);
        const rating = ratings.get(company) || (best.job.companyProfile && best.job.companyProfile.employerRating) || emptyEmployerRating(company);
        const score = employerRankingScore(salaryMonthlyNet, benefits.length, rating, best.analysis.scores.global);
        return {
          company,
          companyType: best.analysis.companyType,
          score,
          salaryLabel: salaryMonthlyNet ? `${Math.round(salaryMonthlyNet)} € net/mois estimé` : "Salaire à vérifier",
          salaryMonthlyNet,
          benefits,
          benefitsCount: benefits.length,
          rating,
          offerCount: companyItems.length,
          bestJobId: best.job.id,
          bestTitle: best.analysis.normalizedTitle,
          reasons: [
            salaryMonthlyNet ? `Salaire comparable jusqu'à ${Math.round(salaryMonthlyNet)} € net/mois estimé` : "Salaire à clarifier",
            benefits.length ? `${benefits.length} avantage${benefits.length > 1 ? "s" : ""} détecté${benefits.length > 1 ? "s" : ""}` : "Avantages peu visibles",
            rating.score !== null ? `Note employeur ${rating.label}` : "Note employeur non confirmée",
          ],
          warnings: [].concat(rating.score === null ? ["Notation en ligne à vérifier"] : [], salaries.length ? [] : ["Salaire non comparable"]),
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      status: items.some((item) => item.rating.score !== null) ? "done" : "partial",
      checkedAt: new Date().toISOString(),
      message: items.length ? "Classement employeurs calculé depuis salaires, avantages et notation publique disponible." : "Aucun employeur exploitable à comparer pour l'instant.",
      items,
    };
  }

  function reviewPatch(status) {
    if (status === "favori") return { favorite: true, ignored: false, reviewStatus: "favori" };
    if (status === "ignoree") return { favorite: false, ignored: true, reviewStatus: "ignoree" };
    if (status === "a_creuser") return { favorite: false, ignored: false, reviewStatus: "a_creuser" };
    return { favorite: false, ignored: false, reviewStatus: "a_traiter" };
  }

  function bestSelectableId(jobList) {
    const ranked = jobList
      .map((job) => ({ job, analysis: analyzeJob(job) }))
      .filter(({ job }) => !job.ignored)
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
    const bestVisible = ranked.find(({ analysis }) => evaluateDecisionFit(analysis).fit !== "weak");
    return (bestVisible || ranked[0]) ? (bestVisible || ranked[0]).job.id : null;
  }

  function createSearchSession(result, batchId, importedCount, duplicateCount) {
    const sourceReports = Array.isArray(result.sourceReports) ? result.sourceReports : [];
    return {
      id: batchId,
      createdAt: new Date().toISOString(),
      keywords: strategy.targetJob || "diagnostiqueur immobilier",
      location: strategy.location || "",
      sourceReports,
      importedCount,
      duplicateCount,
      skippedCount:
        Number(result.skippedCount || 0) ||
        sourceReports.reduce((total, report) => total + Number(report.skippedCount || 0), 0),
    };
  }

  function extractionQualityScore(quality) {
    if (quality === "complète") return 100;
    if (quality === "partielle") return 65;
    if (quality === "à vérifier") return 35;
    return 50;
  }

  function qualityBySource(jobList = []) {
    const map = new Map();
    jobList.forEach((job) => {
      const source = job.source || "Source inconnue";
      const current = map.get(source) || { total: 0, count: 0 };
      map.set(source, {
        total: current.total + extractionQualityScore(job.extractionQuality),
        count: current.count + 1,
      });
    });
    return map;
  }

  function updateSourceHealthStats(current, result) {
    const reports = Array.isArray(result.sourceReports) ? result.sourceReports : [];
    if (!reports.length) return current;
    const checkedAt = new Date().toISOString();
    const qualityMap = qualityBySource(result.jobs || []);
    const next = Object.assign({}, current);

    reports.forEach((report) => {
      const source = report.source || "Source inconnue";
      const previous = next[source] || {
        source,
        searches: 0,
        importedCount: 0,
        skippedCount: 0,
        blockedCount: 0,
        foundCount: 0,
        detailLinkCount: 0,
        missingDetailCount: 0,
        poorQualityCount: 0,
        requiredFilterCount: 0,
        qualityScoreTotal: 0,
        qualityScoreCount: 0,
        lastStatus: "",
        lastMessage: "",
        lastSearchedAt: "",
        history: [],
      };
      const quality = qualityMap.get(source);
      const snapshot = {
        checkedAt,
        count: Number(report.count || 0),
        skippedCount: Number(report.skippedCount || 0),
        blocked: report.status === "blocked",
        foundCount: Number(report.foundCount || 0),
        detailLinkCount: Number(report.detailLinkCount || 0),
        missingDetailCount: Number(report.missingDetailCount || 0),
        poorQualityCount: Number(report.poorQualityCount || 0),
        requiredFilterCount: Number(report.requiredFilterCount || 0),
      };
      next[source] = {
        ...previous,
        searches: previous.searches + 1,
        importedCount: previous.importedCount + snapshot.count,
        skippedCount: previous.skippedCount + snapshot.skippedCount,
        blockedCount: previous.blockedCount + (snapshot.blocked ? 1 : 0),
        foundCount: previous.foundCount + snapshot.foundCount,
        detailLinkCount: previous.detailLinkCount + snapshot.detailLinkCount,
        missingDetailCount: previous.missingDetailCount + snapshot.missingDetailCount,
        poorQualityCount: previous.poorQualityCount + snapshot.poorQualityCount,
        requiredFilterCount: previous.requiredFilterCount + snapshot.requiredFilterCount,
        qualityScoreTotal: previous.qualityScoreTotal + (quality ? quality.total : 0),
        qualityScoreCount: previous.qualityScoreCount + (quality ? quality.count : 0),
        lastStatus: report.status || "",
        lastMessage: report.message || "",
        lastSearchedAt: checkedAt,
        history: [...previous.history, snapshot].slice(-SOURCE_HEALTH_HISTORY_LIMIT),
      };
    });

    return next;
  }

  function sourceHealthRecords(stats) {
    return Object.values(stats || {}).sort((left, right) => {
      const leftUseful = left.searches ? left.importedCount / left.searches : 0;
      const rightUseful = right.searches ? right.importedCount / right.searches : 0;
      return rightUseful - leftUseful || right.importedCount - left.importedCount || left.source.localeCompare(right.source);
    });
  }

  function sourceHealthKind(record) {
    const searches = Math.max(1, record.searches);
    const blockedRate = record.blockedCount / searches;
    const usefulRate = record.importedCount / searches;
    const noiseRate = record.skippedCount / Math.max(1, record.importedCount + record.skippedCount);
    if (record.importedCount >= 2 && usefulRate >= 0.35 && noiseRate < 0.75) return "useful";
    if (record.searches >= 3 && record.blockedCount >= 2 && blockedRate >= 0.6 && record.importedCount === 0) return "blocked";
    return "watch";
  }

  function sourceHealthSummary(stats) {
    const grouped = { useful: [], watch: [], blocked: [] };
    sourceHealthRecords(stats).forEach((record) => {
      grouped[sourceHealthKind(record)].push(record);
    });
    return grouped;
  }

  function sourceNames(records) {
    return records.length ? records.slice(0, 4).map((record) => record.source).join(", ") : "aucune";
  }

  function sourceUsefulRate(record) {
    return Math.round((record.importedCount / Math.max(1, record.searches)) * 10) / 10;
  }

  function sourceQualityAverage(record) {
    return record.qualityScoreCount ? Math.round(record.qualityScoreTotal / record.qualityScoreCount) : 0;
  }

  function sourceHealthHasEnoughHistory(records) {
    return records.some((record) => record.importedCount > 0 || record.searches >= 2 || sourceHealthKind(record) === "blocked");
  }

  function sourceHealthAdvice(stats) {
    const records = sourceHealthRecords(stats);
    if (!records.length) return "";
    const summary = sourceHealthSummary(stats);
    const imported = records.reduce((total, record) => total + record.importedCount, 0);
    const skipped = records.reduce((total, record) => total + record.skippedCount, 0);
    const searches = records.reduce((total, record) => total + record.searches, 0);
    if (!sourceHealthHasEnoughHistory(records)) {
      return `${records.length} sources testées. Pas assez de recul pour les classer, les détails restent en debug.`;
    }
    if (summary.blocked.length >= 2 && imported <= 2) {
      return "Peu d'offres exploitables : plusieurs sources échouent de façon répétée ou ne donnent pas de lien fiable.";
    }
    if (skipped > imported * 2 && skipped >= 5) {
      return "Beaucoup de résultats ont été écartés : Taf Sniffer privilégie les annonces propres plutôt que le bruit.";
    }
    if (summary.useful.length) {
      return `Sources utiles pour l'instant : ${sourceNames(summary.useful)}.`;
    }
    if (searches <= records.length) return "Premier relevé seulement : les sources restent à surveiller avant de conclure qu'elles bloquent.";
    return "Encore peu de recul : lance quelques recherches pour repérer les sources fiables.";
  }

  function networkStatusLabel(status) {
    if (status === "ok") return "Connexion OK";
    if (status === "partial") return "Connexion partielle";
    if (status === "blocked") return "Connexion à vérifier";
    if (status === "error") return "Diagnostic indisponible";
    return "Diagnostic connexion";
  }

  function networkDiagnosticsCard(diagnostics, options = {}) {
    const compact = Boolean(options.compact);
    const showDetails = Boolean(options.showDetails);
    const status = diagnostics && diagnostics.status ? diagnostics.status : "error";
    const message = diagnostics && diagnostics.message
      ? diagnostics.message
      : "Teste la connexion sortante du serveur local vers quelques sites d’emploi.";
    const sources = diagnostics && Array.isArray(diagnostics.sources) ? diagnostics.sources : [];
    const sourceRows = showDetails && sources.length
      ? `<div class="network-source-list">
          ${sources.map((source) => `
            <div class="network-source-row ${source.ok ? "ok" : "blocked"}">
              <span>
                <strong>${escapeHtml(source.source)}</strong>
                <small>${escapeHtml(source.message || "")}</small>
              </span>
              <span>${escapeHtml(source.status ? `HTTP ${source.status}` : source.error || "sans réponse")}</span>
              <span>${Math.round(Number(source.durationMs || 0))} ms</span>
            </div>
          `).join("")}
        </div>`
      : "";
    return `
      <section class="network-diagnostic-card ${compact ? "compact" : ""} network-${escapeHtml(status)}">
        <div class="network-diagnostic-header">
          <div>
            <strong>${escapeHtml(networkStatusLabel(diagnostics && diagnostics.status))}</strong>
            <small>${escapeHtml(message)}</small>
          </div>
          <button class="ghost-button compact ${buttonLoadingClass("network-diagnostics")}" data-action="test-network">
            ${buttonSpinner("network-diagnostics")}
            ${diagnostics ? "Relancer diagnostic" : "Tester la connexion"}
          </button>
        </div>
        ${sourceRows}
      </section>
    `;
  }

  function sessionIgnoredCount() {
    if (!lastSearchSession) return 0;
    return jobs.filter((job) => job.searchBatchId === lastSearchSession.id && job.ignored).length;
  }

  function formatSessionDate(value) {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function scrollDetailPanelIntoView() {
    window.requestAnimationFrame(() => {
      const target = document.querySelector(".detail-panel");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function runPreparedSearch(existingJobs, draftText) {
    const plan = generateSearchQueries();
    const sourceQuery = plan.keywords.slice(0, 5).join(" · ");
    const offers = splitDraftOffers(draftText);

    if (offers.length) {
      return {
        source: "Taf Sniffer local",
        sourceQuery,
        status: "readyWithLocalOffers",
        offers,
        message: `${offers.length} offre${offers.length > 1 ? "s" : ""} prête${offers.length > 1 ? "s" : ""} pour analyse locale.`,
      };
    }

    if (existingJobs.length) {
      return {
        source: "Taf Sniffer local",
        sourceQuery,
        status: "readyWithLocalOffers",
        offers: [],
        message: "Recherche relancée dans l’app : classement et Top 3 recalculés.",
      };
    }

    return {
      source: "Recherche prête",
      sourceQuery,
      status: "needsConnector",
      offers: [],
      message: "Taf Sniffer ne charge pas encore les offres automatiquement.",
    };
  }

  function proxyBase() {
    const currentHost = window.location.host;
    if (window.location.protocol === "file:" || !/^(127\.0\.0\.1|localhost):8787$/.test(currentHost)) {
      return "http://127.0.0.1:8787";
    }
    return "";
  }

  async function runFranceTravailProxySearch(existingJobs, draftText) {
    const localResult = runPreparedSearch(existingJobs, draftText);
    if (localResult.offers.length) return localResult;

    try {
      const params = new URLSearchParams({
        keywords: strategy.targetJob || "diagnostiqueur immobilier",
        location: strategy.location || "",
        limit: "25",
        smartSearch: strategy.smartSearch === false ? "0" : "1",
        smartLocation: strategy.smartLocation === false ? "0" : "1",
        experienceLevel: strategy.experienceLevel || "debutant_reconversion",
        requiredPoei: strategy.poeiRequirement === "required" ? "1" : "0",
        requiredAudit: strategy.auditRequirement === "required" ? "1" : "0",
      });
      const response = await fetch(`${proxyBase()}/api/search-jobs?${params}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (existingJobs.length) {
          return {
            ...localResult,
            status: "readyWithLocalOffers",
            message: "Recherche automatique indisponible pour l’instant. Les offres déjà présentes ont été reclassées.",
          };
        }

        return {
          ...localResult,
          status: "needsConnector",
          message: (payload && payload.error && payload.error.message) || "Recherche officielle indisponible pour l’instant. Tu peux coller une annonce dans Analyse express.",
        };
      }

      const providerMessage = payload.networkStatus === "blocked"
        ? (payload.networkMessage || "Le serveur local n'arrive pas à joindre les sites d'emploi.")
        : payload.networkStatus === "partial" && payload.networkMessage
          ? payload.networkMessage
        : payload.message || "Offres publiques chargées.";

      return {
        source: payload.source || "France Travail",
        sourceQuery: payload.sourceQuery || localResult.sourceQuery,
        status: payload.status || "readyWithLocalOffers",
        offers: Array.isArray(payload.offers) ? payload.offers : [],
        jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
        sourceReports: Array.isArray(payload.sourceReports) ? payload.sourceReports : [],
        skippedCount: Number(payload.skippedCount || 0),
        networkStatus: payload.networkStatus,
        networkMessage: payload.networkMessage,
        message: providerMessage,
      };
    } catch (error) {
      if (existingJobs.length) {
        return {
          ...localResult,
          status: "readyWithLocalOffers",
          message: "Recherche automatique indisponible pour l’instant. Les offres déjà présentes ont été reclassées.",
        };
      }

      return {
        ...localResult,
        status: "needsConnector",
      message: "Recherche officielle indisponible pour l’instant. Tu peux coller une annonce dans Analyse express.",
      };
    }
  }

  async function runNetworkDiagnostics() {
    startLoading("network-diagnostics");
    try {
      const response = await fetch(`${proxyBase()}/api/network-diagnostics`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !isObject(payload)) throw new Error("Diagnostic indisponible");
      networkDiagnostics = payload;
      statusMessage = payload.message || "Diagnostic connexion terminé.";
    } catch (error) {
      networkDiagnostics = {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: "Diagnostic connexion indisponible : le serveur local ne répond pas.",
        sources: [],
      };
      statusMessage = networkDiagnostics.message;
    }
    stopLoading();
  }

  async function identifyCompanyProfile(job, analysis) {
    if (!analysis.companySearchUrl) return;
    const action = `identify-company-${job.id}`;
    const baseProfile = {
      status: "loading",
      companyName: analysis.company,
      estimatedType: analysis.companyType,
      website: "",
      signals: [],
      confidence: "faible",
      summary: "Identification en cours.",
      checkedAt: new Date().toISOString(),
      sources: [analysis.companySearchUrl],
    };

    startLoading(action);
    updateJob(job.id, { companyProfile: baseProfile });

    try {
      const response = await fetch(`${proxyBase()}/api/company-profile?company=${encodeURIComponent(analysis.company)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload && payload.error && payload.error.message) || "Identification indisponible, vérifie manuellement.");
      const profile = normalizeCompanyProfile(payload, analysis.company, analysis.companyType) || Object.assign({}, baseProfile, {
        status: "partial",
        summary: "Fiche entreprise à vérifier.",
      });
      updateJob(job.id, { companyProfile: profile });
      statusMessage = profile.status === "not_found" ? "Entreprise à vérifier manuellement." : "Fiche entreprise mise à jour.";
    } catch {
      updateJob(job.id, {
        companyProfile: Object.assign({}, baseProfile, {
          status: "error",
          summary: "Identification indisponible, vérifie manuellement.",
          checkedAt: new Date().toISOString(),
        }),
      });
      statusMessage = "Identification indisponible, vérifie manuellement.";
    }
    stopLoading();
  }

  async function rankEmployers() {
    const analyses = getAnalyses();
    const companyNames = [...new Set(
      analyses
        .filter(({ job, analysis }) => !job.ignored && !analysis.company.toLowerCase().includes("non précisée"))
        .map(({ analysis }) => analysis.company.trim())
        .filter(Boolean),
    )].slice(0, 6);

    if (!companyNames.length) {
      employerRanking = buildEmployerRanking(analyses, new Map());
      statusMessage = "Aucun employeur identifiable à comparer.";
      render();
      return;
    }

    startLoading("rank-employers");
    const ratings = new Map();
    for (const company of companyNames) {
      try {
        const response = await fetch(`${proxyBase()}/api/employer-rating?company=${encodeURIComponent(company)}`);
        const payload = await response.json().catch(() => null);
        ratings.set(company, response.ok ? normalizeEmployerRating(payload) || emptyEmployerRating(company) : emptyEmployerRating(company));
      } catch {
        ratings.set(company, emptyEmployerRating(company));
      }
    }
    employerRanking = buildEmployerRanking(analyses, ratings);
    statusMessage = employerRanking.items.length ? "Classement employeurs mis à jour." : "Aucun employeur exploitable à comparer.";
    stopLoading();
  }

  function aiReviewFresh(job, strategyHash) {
    return (
      job.aiReview &&
      job.aiReview.status === "done" &&
      job.aiReview.rawTextHash === aiJobHash(job) &&
      job.aiReview.strategyHash === strategyHash &&
      Boolean(job.aiReview.decisionVerdict)
    );
  }

  function aiLocalAnalysisPayload(job) {
    const analysis = analyzeJob(Object.assign({}, job, { aiReview: undefined }));
    return {
      title: analysis.normalizedTitle,
      company: analysis.company,
      location: analysis.location,
      contract: analysis.contract,
      workTime: analysis.workTime,
      salary: analysis.salary,
      salaryKind: analysis.salaryKind,
      salaryComparable: analysis.normalizedSalary && analysis.normalizedSalary.label,
      bonus: analysis.bonus,
      bonusEstimate: analysis.bonusEstimate,
      requiredExperience: analysis.requiredExperience,
      benefits: analysis.benefits,
      positiveSignals: analysis.positiveSignals.slice(0, 8),
      redFlags: analysis.redFlags.slice(0, 8),
      uncertainties: analysis.uncertainties.slice(0, 8),
    };
  }

  function buildPreferenceMemory() {
    const analyzed = jobs.map((job) => ({ job, analysis: analyzeJob(job) }));
    const compactOffer = ({ job, analysis }) => ({
      title: analysis.normalizedTitle,
      company: analysis.company,
      score: analysis.scores.global,
      status: normalizeReviewStatus(job),
      reasons: analysis.verdictReasons.slice(0, 2),
    });
    const favorites = analyzed.filter(({ job }) => job.favorite).slice(0, 5).map(compactOffer);
    const ignored = analyzed.filter(({ job }) => job.ignored).slice(0, 5).map(compactOffer);
    const toExplore = analyzed.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser").slice(0, 5).map(compactOffer);
    const weakHiddenCount = analyzed.filter(({ analysis }) => evaluateDecisionFit(analysis).fit === "weak").length;
    return {
      summary: "Préférences déduites localement des favoris, offres ignorées et offres à creuser. Ne pas inventer de préférence absente.",
      favorites,
      ignored,
      toExplore,
      weakHiddenCount: strategy.hideWeakOffers ? weakHiddenCount : 0,
      defaultBias: "Favoriser les offres formatrices, stables, compatibles reconversion, avec salaire clair et peu de risque indépendant.",
    };
  }

  function automaticAiCandidates(jobList = jobs) {
    return getTopPicks(jobList
      .map((job) => ({ job, analysis: analyzeJob(job) }))
      .filter(({ job, analysis }) => !job.ignored && !hasRequiredMismatch(analysis)))
      .map(({ item }) => item.job);
  }

  async function analyzeJobsWithAi(jobList = jobs, force = false, allowWhenAutoDisabled = false, captureTop3Comparison = false) {
    if (!force && !allowWhenAutoDisabled && uiState.aiAutoAnalyze === false) return;
    const strategyHash = aiStrategyHash();
    const targetIds = jobList.slice(0, 3).map((job) => job.id);
    const comparisonFresh = Boolean(
      captureTop3Comparison &&
      lastTop3AiComparison &&
      lastTop3AiComparison.strategyHash === strategyHash &&
      targetIds.length &&
      targetIds.every((id, index) => lastTop3AiComparison.jobIds[index] === id)
    );
    const needsTop3Refresh = Boolean(
      captureTop3Comparison &&
      (!comparisonFresh || jobList.some((job) => !aiReviewFresh(job, strategyHash)))
    );
    const candidates = jobList
      .filter((job) => !job.ignored)
      .filter((job) => force || needsTop3Refresh || !aiReviewFresh(job, strategyHash))
      .slice(0, 25);
    const targetOrder = new Map(jobList.map((job, index) => [job.id, index + 1]));

    if (!candidates.length) {
      if (force || allowWhenAutoDisabled) {
        statusMessage = "Avis intelligents déjà à jour.";
        render();
      }
      return;
    }

    startLoading("ai-analyze");
    statusMessage = `Analyse intelligente de ${candidates.length} offre${candidates.length > 1 ? "s" : ""}...`;
    render();

    try {
      const response = await fetch(`${proxyBase()}/api/ai/analyze-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          strategyHash,
          preferenceMemory: buildPreferenceMemory(),
          jobs: candidates.map((job) => ({
            id: job.id,
            rawText: job.rawText,
            source: job.source || "",
            sourceUrl: job.sourceUrl || "",
            manualExtraction: job.manualExtraction || null,
            localAnalysis: aiLocalAnalysisPayload(job),
            topContext: {
              rank: targetOrder.get(job.id) || null,
              reviewStatus: normalizeReviewStatus(job),
              favorite: job.favorite,
              ignored: job.ignored,
              score: analyzeJob(job).scores.global,
              verdict: analyzeJob(job).verdict,
            },
            rawTextHash: aiJobHash(job),
          })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error((payload && payload.error && payload.error.message) || "Analyse intelligente indisponible.");

      const reviewsById = new Map((Array.isArray(payload.reviews) ? payload.reviews : []).map((review) => [review.id, normalizeAiReview(review)]));
      jobs = jobs.map((job) => {
        const review = reviewsById.get(job.id);
        return review ? { ...job, aiReview: review, updatedAt: new Date().toISOString() } : job;
      });
      if (captureTop3Comparison) {
        const comparison = normalizeTop3AiComparison(Object.assign({}, payload.top3Comparison || {}, {
          jobIds: jobList.slice(0, 3).map((job) => job.id),
          strategyHash,
          checkedAt: new Date().toISOString(),
        }));
        if (comparison && (comparison.whyFirst || comparison.riskierOffer || comparison.callFirst || comparison.actionSummary)) {
          lastTop3AiComparison = comparison;
        }
      }
      const doneCount = [...reviewsById.values()].filter((review) => review && review.status === "done").length;
      statusMessage = doneCount
        ? `Avis intelligent ajouté sur ${doneCount} offre${doneCount > 1 ? "s" : ""}.`
        : (payload.message || "Analyse intelligente non configurée.");
      selectedId = bestSelectableId(jobs) || selectedId;
      save();
      render();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse intelligente indisponible.";
      statusMessage = message;
      const failedIds = new Set(candidates.map((job) => job.id));
      jobs = jobs.map((job) => failedIds.has(job.id)
        ? {
            ...job,
            aiReview: {
              status: "error",
              provider: "Gemini",
              checkedAt: new Date().toISOString(),
              rawTextHash: aiJobHash(job),
              strategyHash,
              errorMessage: message,
            },
            updatedAt: new Date().toISOString(),
          }
        : job);
      save();
      render();
    }
    stopLoading();
  }

  function queueManualAiAnalysis(job) {
    if (!job || job.ignored) return;
    aiManualQueue.set(job.id, job);
    const strategyHash = aiStrategyHash();
    jobs = jobs.map((item) => item.id === job.id
      ? {
          ...item,
          aiReview: {
            status: "loading",
            provider: "Gemini",
            checkedAt: new Date().toISOString(),
            rawTextHash: aiJobHash(item),
            strategyHash,
          },
        }
      : item);
    const count = aiManualQueue.size;
    statusMessage = count > 1
      ? `${count} offres ajoutées au lot IA. Analyse groupée dans un instant.`
      : "Offre ajoutée au lot IA. Analyse groupée dans un instant.";
    render();
    if (aiManualQueueTimer) clearTimeout(aiManualQueueTimer);
    aiManualQueueTimer = setTimeout(async () => {
      const batch = [...aiManualQueue.values()];
      aiManualQueue.clear();
      aiManualQueueTimer = null;
      await analyzeJobsWithAi(batch, true);
    }, 1200);
  }

  function collectionChecklist() {
    return `Checklist collecte Taf Sniffer

1. Ouvrir une recherche depuis le panneau Collecte réelle.
2. Copier le texte complet d'une annonce.
3. Coller l'annonce dans Import rapide.
4. Ajouter la source si elle n'est pas détectée.
5. Lancer Analyser.
6. Annoter l'annonce dans Validation réelle.
7. Chercher au moins 10 annonces, idéalement 20.

Sources à couvrir :
- France Travail
- Indeed
- Hellowork
- LinkedIn
- Jooble
- Apec
- Meteojob
- Welcome to the Jungle
- Jobijoba
- Talent.com
- Optioncarriere
- Google / sites carrières`;
  }

  function searchPlanText(plan) {
    return `Recherche Taf Sniffer

Métier : ${strategy.targetJob}
Zone : ${strategy.location}
Salaire net mini : ${strategy.salaryMin} €
Expérience : ${experienceLabel(strategy.experienceLevel)}
Objectif : ${strategy.objective}

Mots-clés :
${plan.keywords.map((keyword) => `- ${keyword}`).join("\n")}

Sources :
${plan.links.slice(0, 12).map((link) => `- ${link.label} : ${link.url}`).join("\n")}`;
  }

  function openPrioritySearches(plan) {
    const preferred = ["France Travail", "Hellowork", "Jooble", "Indeed", "Apec", "Meteojob", "LinkedIn", "Google"];
    const opened = [];

    for (const source of preferred) {
      const link = plan.links.find((item) => item.source === source && !opened.some((entry) => entry.source === source));
      if (link) opened.push(link);
    }

    opened.slice(0, 8).forEach((link) => window.open(link.url, "_blank", "noopener,noreferrer"));
    return opened.length;
  }

  function simpleIntro(analyses) {
    if (analyses.length) return "";

    return `
      <section class="simple-intro">
        <div>
          <p class="eyebrow">Mode simple</p>
          <h2>Entre tes critères. Clique sur Rechercher.</h2>
          <p>Taf Sniffer lance la recherche locale, importe les offres lisibles, les classe et sort un Top 3 exploitable.</p>
        </div>
      </section>
    `;
  }

  function riskLabel(riskPenalty) {
    if (riskPenalty >= 45) return "élevé";
    if (riskPenalty >= 20) return "modéré";
    return "faible";
  }

  function pickOfferType(score, trainingScore, cashflowScore, trajectoryScore, auditScore, riskLevel, signals) {
    if (signals.trap || riskLevel === "élevé" || score < 45) return "Offre piège";
    if (signals.strategicPath || (auditScore >= 72 && trajectoryScore >= 72 && score >= 68)) return "Offre stratégique";
    if (signals.tremplin || (trainingScore >= 78 && score >= 58)) return "Offre tremplin";
    if (signals.stableCashflow || cashflowScore >= 78) return "Offre cashflow";
    if (score < 55) return "Offre hors trajectoire";
    return "A creuser";
  }

  function verdictFor(score, offerType, riskLevel) {
    if (offerType === "Offre piège") return "Attention piège";
    if (riskLevel === "élevé") return "Trop risqué";
    if (score >= 82) return "Ca sent bon";
    if (score >= 68) return "A creuser";
    if (score >= 52) return "Trop flou";
    return "Pas aligne avec ton plan";
  }

  function cleanManualField(value) {
    return String(value || "").trim();
  }

  function cleanAiField(value) {
    const clean = cleanManualField(value);
    const text = normalize(clean);
    if (!clean || /^(non detecte|non renseigne|non precise|inconnu|n\/a|na)$/.test(text)) return "";
    return clean;
  }

  function manualExtractionLines(job) {
    const manual = job.manualExtraction || {};
    return [
      ["Poste", cleanManualField(manual.title)],
      ["Entreprise", cleanManualField(manual.company)],
      ["Lieu", cleanManualField(manual.location)],
      ["Contrat", cleanManualField(manual.contract)],
      ["Temps de travail", cleanManualField(manual.workTime)],
      ["Salaire", cleanManualField(manual.salary)],
      ["Primes", cleanManualField(manual.bonus)],
      ["Expérience demandée", cleanManualField(manual.requiredExperience)],
      ["Avantages", cleanManualField(manual.benefits)],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label} : ${value}`)
      .join("\n");
  }

  function aiExtraction(job) {
    return job.aiReview && job.aiReview.status === "done" && job.aiReview.extraction ? job.aiReview.extraction : null;
  }

  function aiExtractionLines(job) {
    const extraction = aiExtraction(job);
    if (!extraction) return "";
    return [
      ["Poste", cleanManualField(extraction.title)],
      ["Entreprise", cleanManualField(extraction.company)],
      ["Lieu", cleanManualField(extraction.location)],
      ["Contrat", cleanManualField(extraction.contract)],
      ["Temps de travail", cleanManualField(extraction.workTime)],
      ["Salaire", cleanManualField(extraction.salary)],
      ["Brut / net", cleanManualField(extraction.salaryKind)],
      ["Primes", cleanManualField(extraction.bonus)],
      ["Primes estimées", cleanManualField(extraction.bonusEstimate)],
      ["Expérience demandée", cleanManualField(extraction.requiredExperience)],
      ["Avantages", cleanManualField(extraction.benefits)],
      ["Signal POEI", extraction.poeiSignal ? "oui" : ""],
      ["Signal audit", extraction.auditSignal ? "oui" : ""],
      ["Signal indépendant", extraction.independentSignal ? "oui" : ""],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label} : ${value}`)
      .join("\n");
  }

  function labelledValue(rawText, labels) {
    const labelPattern = labels.map(escapeRegExp).join("|");
    return firstMatch(rawText, [new RegExp(`^(?:${labelPattern})\\s*:\\s*(.+)$`, "im")]);
  }

  function salaryKindValue(value) {
    const text = normalize(value || "");
    if (text.includes("brut")) return "brut";
    if (text.includes("net")) return "net";
    if (text.includes("non precise") || text.includes("non renseigne")) return "non précisé";
    return "";
  }

  function structuredExtraction(job) {
    const rawText = job.rawText || "";
    const title = cleanInfoValue(labelledValue(rawText, ["Poste", "Titre", "Intitulé", "Intitule"]), 140);
    const company =
      cleanCompanyValue(labelledValue(rawText, ["Entreprise", "Employeur", "Société", "Societe"])) ||
      cleanInfoValue(labelledValue(rawText, ["Entreprise", "Employeur", "Société", "Societe"]), 90);
    const location = cleanLocationCandidate(labelledValue(rawText, ["Lieu", "Localisation", "Ville", "Zone", "Département", "Departement"]));
    const contract = cleanInfoValue(labelledValue(rawText, ["Contrat", "Type de contrat"]), 80);
    const workTime =
      cleanWorkTimeValue(labelledValue(rawText, ["Temps de travail", "Durée du travail", "Duree du travail", "Horaire", "Horaires"])) ||
      cleanInfoValue(labelledValue(rawText, ["Temps de travail", "Durée du travail", "Duree du travail", "Horaire", "Horaires"]), 90);
    const salary =
      cleanSalaryValue(labelledValue(rawText, ["Salaire", "Rémunération", "Remuneration"])) ||
      cleanInfoValue(labelledValue(rawText, ["Salaire", "Rémunération", "Remuneration"]), 140);
    const salaryKind = salaryKindValue(labelledValue(rawText, ["Brut / net", "Brut/net", "Salaire brut net", "Type salaire"]));
    const bonus = cleanInfoValue(labelledValue(rawText, ["Primes", "Prime", "Variable", "Commissions"]), 180);
    const bonusEstimate = cleanInfoValue(labelledValue(rawText, ["Primes estimées", "Prime estimée", "Variable estimé"]), 120);
    const requiredExperience = cleanInfoValue(labelledValue(rawText, ["Expérience demandée", "Experience demandee", "Expérience", "Experience"]), 120);
    const benefits = cleanInfoValue(labelledValue(rawText, ["Avantages", "Bénéfices", "Benefits"]), 220);
    return {
      ...(title ? { title } : {}),
      ...(company ? { company } : {}),
      ...(location ? { location } : {}),
      ...(contract ? { contract } : {}),
      ...(workTime ? { workTime } : {}),
      ...(salary ? { salary } : {}),
      ...(salaryKind ? { salaryKind } : {}),
      ...(bonus ? { bonus } : {}),
      ...(bonusEstimate ? { bonusEstimate } : {}),
      ...(requiredExperience ? { requiredExperience } : {}),
      ...(benefits ? { benefits } : {}),
    };
  }

  function aiScoreAdjustment(job) {
    if (!job.aiReview || job.aiReview.status !== "done") return 0;
    const value = Math.round(Number(job.aiReview.scoreAdjustment || 0));
    if (!Number.isFinite(value)) return 0;
    return Math.max(-12, Math.min(12, value));
  }

  function qualityWeight(status) {
    if (status === "conflict") return 3;
    if (status === "verify") return 2;
    return 1;
  }

  const qualityFieldAliases = {
    title: ["title", "poste", "intitule", "intitulé", "titre"],
    company: ["company", "entreprise", "employeur", "societe", "société"],
    location: ["location", "lieu", "localisation", "ville", "zone"],
    contract: ["contract", "contrat", "cdi", "cdd", "alternance"],
    workTime: ["worktime", "temps", "temps de travail", "horaire", "horaires", "duree", "durée"],
    salary: ["salary", "salaire", "remuneration", "rémunération"],
    salaryKind: ["salarykind", "brut", "net", "brut net", "brut/net"],
    bonus: ["bonus", "prime", "primes", "variable", "commission", "commissions"],
    bonusEstimate: ["bonusestimate", "prime estimee", "primes estimees", "variable estime"],
    requiredExperience: ["experience", "expérience", "xp", "requiredexperience", "experience demandee", "expérience demandée"],
    benefits: ["benefits", "avantages", "vehicule", "véhicule", "tickets", "mutuelle"],
    poeiSignal: ["poei", "poe", "afpr", "preparation operationnelle", "préparation opérationnelle"],
    auditSignal: ["audit", "audit energetique", "audit énergétique", "dpe"],
    independentSignal: ["independent", "independant", "indépendant", "agent commercial", "franchise"],
  };

  function qualityCheckForField(job, field) {
    if (!job.aiReview || job.aiReview.status !== "done" || !job.aiReview.qualityCheck) return null;
    const aliases = (qualityFieldAliases[field] || [field]).map(normalize);
    const checks = []
      .concat(job.aiReview.qualityCheck.fieldChecks || [])
      .concat(job.aiReview.qualityCheck.suggestedCorrections || []);
    return checks
      .filter((check) => {
        const haystack = normalize(`${check.field || ""} ${check.reason || ""}`);
        return aliases.some((alias) => haystack.includes(alias));
      })
      .sort((left, right) => qualityWeight(right.status) - qualityWeight(left.status))[0] || null;
  }

  function controlledField(job, field, manualValue, structuredValue, aiValue, localValue) {
    const manual = cleanManualField(manualValue);
    if (manual) return { field, value: manual, source: "manual", quality: "ok" };
    const structured = cleanManualField(structuredValue);
    const ai = cleanAiField(aiValue);
    const check = ai ? qualityCheckForField(job, field) : null;
    const local = cleanManualField(localValue);
    if (structured) {
      return {
        field,
        value: structured,
        source: "structured",
        quality: check ? check.status : "ok",
        suggestedValue: (check && check.suggestedValue) || (check && check.status === "conflict" ? ai : ""),
        reason: check && check.reason ? check.reason : "",
      };
    }
    if (field === "title" && ai && local && !isGenericTitle(local) && isGenericTitle(ai)) {
      return {
        field,
        value: local,
        source: "local",
        quality: check && check.status === "verify" ? "verify" : "ok",
        suggestedValue: ai,
        reason: "Titre source plus précis que le titre générique IA.",
      };
    }
    if (ai && (!check || check.status !== "conflict")) {
      return {
        field,
        value: ai,
        source: "ai",
        quality: check ? check.status : "ok",
        suggestedValue: check && check.suggestedValue ? check.suggestedValue : "",
        reason: check && check.reason ? check.reason : "",
      };
    }
    return {
      field,
      value: local,
      source: "local",
      quality: check && check.status === "conflict" ? "conflict" : "ok",
      suggestedValue: check && check.suggestedValue ? check.suggestedValue : ai,
      reason: check && check.reason ? check.reason : "",
    };
  }

  function aiSignalUsable(job, field, value) {
    if (!value || !job.aiReview || job.aiReview.status !== "done") return false;
    const check = qualityCheckForField(job, field);
    return !check || check.status !== "conflict";
  }

  function isGenericTitle(value) {
    const text = normalize(value);
    return diagnosticImmobilierProfile.analysis.genericTitles.includes(text);
  }

  function getControlledExtraction(job, analysis) {
    const manual = job.manualExtraction || {};
    const ai = aiExtraction(job) || {};
    const structured = structuredExtraction(job);
    const fields = {
      title: controlledField(job, "title", manual.title, structured.title, ai.title, analysis.normalizedTitle),
      company: controlledField(job, "company", manual.company, structured.company, ai.company, analysis.company),
      location: controlledField(job, "location", manual.location, structured.location, ai.location, analysis.location),
      contract: controlledField(job, "contract", manual.contract, structured.contract, ai.contract, analysis.contract),
      workTime: controlledField(job, "workTime", manual.workTime, structured.workTime, ai.workTime, analysis.workTime),
      salary: controlledField(job, "salary", manual.salary, structured.salary, ai.salary, analysis.salary),
      salaryKind: controlledField(job, "salaryKind", "", structured.salaryKind, ai.salaryKind, analysis.salaryKind),
      bonus: controlledField(job, "bonus", manual.bonus, structured.bonus, ai.bonus, analysis.bonus),
      bonusEstimate: controlledField(job, "bonusEstimate", manual.bonusEstimate, structured.bonusEstimate, ai.bonusEstimate, analysis.bonusEstimate),
      requiredExperience: controlledField(job, "requiredExperience", manual.requiredExperience, structured.requiredExperience, ai.requiredExperience, analysis.requiredExperience),
      benefits: controlledField(job, "benefits", manual.benefits, structured.benefits, ai.benefits, analysis.benefits),
    };
    const values = Object.fromEntries(Object.entries(fields).map(([field, meta]) => [field, meta.value]));
    const alerts = Object.values(fields).filter((field) => field.quality !== "ok");
    return { values, fields, alerts };
  }

  function controlledExtractionLines(controlled, job) {
    const values = controlled.values;
    const ai = aiExtraction(job) || {};
    return [
      ["Poste", values.title],
      ["Entreprise", values.company],
      ["Lieu", values.location],
      ["Contrat", values.contract],
      ["Temps de travail", values.workTime],
      ["Salaire", values.salary],
      ["Brut / net", values.salaryKind],
      ["Primes", values.bonus],
      ["Primes estimées", values.bonusEstimate],
      ["Expérience demandée", values.requiredExperience],
      ["Avantages", values.benefits],
      ["Signal POEI", aiSignalUsable(job, "poeiSignal", ai.poeiSignal) ? "oui" : ""],
      ["Signal audit", aiSignalUsable(job, "auditSignal", ai.auditSignal) ? "oui" : ""],
      ["Signal indépendant", aiSignalUsable(job, "independentSignal", ai.independentSignal) ? "oui" : ""],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label} : ${value}`)
      .join("\n");
  }

  function getEffectiveExtraction(job, analysis) {
    return getControlledExtraction(job, analysis).values;
  }

  function buildScoringSignals(text, combined, fields, profile = getActiveProfile()) {
    const bonusText = normalize(fields.bonus);
    const workTimeText = normalize(fields.workTime);
    const beginnerFriendly = hasAny(text, [
      "debutant accepte",
      "debutant bienvenu",
      "junior",
      "profil debutant",
      "profil junior",
      "sans experience",
      "sans experience exigee",
      "premiere experience acceptee",
      "reconversion",
      "transition professionnelle",
      "formation assuree",
      "formation avant embauche",
    ]);
    const employerTraining = hasAny(text, [
      "formation assuree par nos soins",
      "formation assurée par nos soins",
      "formation assuree",
      "formation assurée",
      "formation interne",
      "formation complete",
      "formation complète",
      "nous vous formons",
      "nous formons",
      "vous serez forme",
      "vous serez formé",
      "parcours d'integration",
      "parcours d'intégration",
      "montee en competence",
      "montée en compétence",
      "accompagnement terrain",
      "accompagnement technique",
      "tutorat",
      "ecole interne",
      "école interne",
    ]);
    const employerTrainingEquivalent = employerTraining && beginnerFriendly;
    const poei = hasAny(text, [
      "poei",
      "poe",
      "afpr",
      "preparation operationnelle a l'emploi",
      "preparation operationnelle a l emploi",
      "preparation operationnelle a l'emploi individuelle",
      "preparation operationnelle a l emploi individuelle",
      "preparations operationnelles a l'emploi",
      "preparations operationnelles a l emploi",
      "préparation opérationnelle à l'emploi",
      "action de formation prealable au recrutement",
      "actions de formations prealables au recrutement",
      "action de formation préalable au recrutement",
      "formation prealable au recrutement",
      "formations prealables au recrutement",
      "formation préalable au recrutement",
      "formation de preparation",
      "formations de preparation",
    ]) ||
      /\bpreparations?\s+operationnelles?\s+(?:(?:a|pour)\s+l(?:'|’|\s)?)?emploi\b/.test(text) ||
      /\bpreparations?\s+operationnelles?\s+(?:a\s+)?l(?:'|’|\s)?emploi\s+individuelles?\b/.test(text) ||
      /\bactions?\s+de\s+formations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
      /\bformations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
      /\bformations?\s+de\s+preparations?\b/.test(text);
    const fundedCerts = hasAny(text, [
      "certification financee",
      "certifications financees",
      "certifications prises en charge",
      "formation prise en charge",
      "formation financee",
      "financement opco",
      "financement france travail",
      "financement pole emploi",
      "financement pôle emploi",
    ]);
    const trainingClear =
      poei ||
      fundedCerts ||
      employerTraining;
    const vagueTraining = hasAny(text, [
      "formation possible",
      "profil debutant etudie",
      "profil débutant étudié",
      "idealement certifie",
      "idéalement certifié",
      "accompagnement prevu",
      "accompagnement prévu",
    ]);
    const cdi = hasAny(text, ["cdi", "duree indeterminee", "durée indéterminée"]);
    const audit = hasAny(combined, profile.analysis.strategicTerms);
    const renovation = hasAny(text, profile.analysis.trajectoryTerms);
    const independent = hasAny(text, [
      "statut independant",
      "independant impose",
      "indépendant imposé",
      "auto-entrepreneur",
      "micro-entrepreneur",
      "agent commercial",
      "mandataire",
      "franchise",
      "statut non salarie",
      "statut non salarié",
      "a votre compte",
      "à votre compte",
      "developper votre portefeuille",
      "développer votre portefeuille",
    ]);
    const variableDominant = hasAny(`${text} ${bonusText}`, [
      "100% variable",
      "remuneration selon performance",
      "rémunération selon performance",
      "commissions uniquement",
      "non plafonne",
      "non plafonné",
      "fort potentiel de revenu",
      "objectifs ambitieux",
    ]);
    const variableMentioned = hasAny(`${text} ${bonusText}`, ["prime", "primes", "variable", "commission", "commissions", "13eme mois", "treizieme mois"]);
    const salaryVague = hasAny(text, ["selon profil", "package attractif", "remuneration motivante", "rémunération motivante", "salaire a negocier", "salaire à négocier"]);
    const payTraining = hasAny(text, [
      "formation a votre charge",
      "formation à votre charge",
      "formation a payer",
      "formation à payer",
      "certification a votre charge",
      "certification à votre charge",
      "pack de demarrage",
      "pack de démarrage",
    ]);
    const fullTime = hasAny(workTimeText, ["35h", "37h", "39h", "temps plein"]);
    const partTime = hasAny(workTimeText, ["temps partiel"]);

    return {
      beginnerFriendly,
      employerTraining,
      employerTrainingEquivalent,
      poei,
      trainingClear,
      fundedCerts,
      vagueTraining,
      cdi,
      audit,
      renovation,
      independent,
      variableDominant,
      variableMentioned,
      salaryVague,
      payTraining,
      fullTime,
      partTime,
    };
  }

  function analyzeJob(job) {
    const profile = getActiveProfile();
    const originalRawText = job.rawText.trim();
    const localText = normalize(originalRawText);
    const target = normalize(strategy.targetJob + " " + strategy.objective);
    const localCombined = localText + " " + target;
    const localSalary = findSalary(originalRawText);
    const localSalaryKind = salaryKindFor(originalRawText, localSalary);
    const localBonus = findBonus(originalRawText);
    const localNormalizedSalary = normalizeSalaryValue(localSalary, localSalaryKind, originalRawText);
    const localTitle = findTitle(originalRawText, localText, profile);
    const localBase = {
      normalizedTitle: localTitle && localTitle !== "Offre importée" ? localTitle : normalizeTitle(localCombined, profile),
      company: findCompany(originalRawText),
      location: findLocation(originalRawText, localText),
      contract: findContract(localText),
      workTime: findWorkTime(originalRawText, localText),
      salary: localSalary,
      salaryKind: localSalaryKind,
      bonus: localBonus,
      bonusEstimate: estimateBonusValue(localBonus, localNormalizedSalary, ""),
      requiredExperience: findRequiredExperience(originalRawText, localText),
      benefits: findBenefits(originalRawText, localText),
    };
    const controlled = getControlledExtraction(job, localBase);
    const ai = aiExtraction(job) || {};
    const rawText = [controlledExtractionLines(controlled, job), originalRawText].filter(Boolean).join("\n\n");
    const text = normalize(rawText);
    const combined = text + " " + target;

    const positiveSignals = [];
    const redFlags = [];
    const uncertainties = [];
    const scoreLines = [];

    const priorityPoei = strategy.priorityPoei || false;
    const salary = controlled.values.salary || findSalary(rawText);
    const salaryClear = salary !== "Non indiqué";
    const salaryKind = controlled.values.salaryKind || salaryKindFor(rawText, salary);
    const bonus = controlled.values.bonus || findBonus(rawText);
    const normalizedSalary = normalizeSalaryValue(salary, salaryKind, rawText);
    const bonusEstimate = controlled.values.bonusEstimate || estimateBonusValue(bonus, normalizedSalary, cleanManualField(ai.bonusEstimate));
    const workTime = controlled.values.workTime || findWorkTime(rawText, text);
    const requiredExperience = controlled.values.requiredExperience || findRequiredExperience(rawText, text);
    const experienceFit = experienceFitFor(requiredExperience);
    const benefits = controlled.values.benefits || findBenefits(rawText, text);
    const scoringSignals = buildScoringSignals(text, combined, { salary, salaryKind, bonus, workTime }, profile);
    const {
      beginnerFriendly,
      employerTraining,
      employerTrainingEquivalent,
      poei,
      trainingClear,
      fundedCerts,
      vagueTraining,
      cdi,
      audit,
      renovation,
      independent,
      variableDominant,
      variableMentioned,
      salaryVague,
      payTraining,
      fullTime,
      partTime,
    } = scoringSignals;
    const training = trainingClear;
    const poeiEquivalent = !poei && employerTrainingEquivalent;
    const strategicPriority =
      Boolean(strategy.priorityAudit) &&
      (profile.id === DIAGNOSTIC_PROFILE_ID || strategy.auditRequirement === "required" || Boolean(String(strategy.objective || "").trim()));
    const vehicle = hasAny(text, ["vehicule fourni", "voiture de service", "vehicule de service", "outils fournis"]);
    const mentoring = hasAny(text, ["tutorat", "accompagnement terrain", "accompagnement technique", "binome", "autonomie progressive"]);
    const knownStructure = hasAny(text, profile.analysis.knownStructureTerms);
    const copro = hasAny(text, ["copropriete", "coproprietes", "syndic", "syndics", "tertiaire"]);
    const volumePressure = hasAny(text, ["rythme soutenu", "planning dense", "nombreuses interventions", "objectifs ambitieux", "secteur elargi", "forte autonomie"]);
    const hugeArea = hasAny(text, ["departements limitrophes", "region entiere", "secteur national", "grande mobilite", "déplacements fréquents"]);

    addSignal(positiveSignals, beginnerFriendly && !employerTrainingEquivalent, "Débutant ou junior accepté");
    addSignal(positiveSignals, employerTrainingEquivalent, "Débutant accepté + formation employeur");
    addSignal(positiveSignals, poei, "POEI / POE / AFPR détectée");
    addSignal(positiveSignals, employerTraining && !employerTrainingEquivalent, "Formation employeur détectée");
    addSignal(positiveSignals, training && !employerTraining && !poei && !fundedCerts, "Formation interne détectée");
    addSignal(positiveSignals, fundedCerts, "Formation ou certifications financées");
    addSignal(positiveSignals, cdi, "CDI détecté");
    addSignal(positiveSignals, salaryClear, "Salaire indiqué");
    addSignal(positiveSignals, salaryClear && salaryKind !== "non précisé", `Salaire ${salaryKind} précisé`);
    addSignal(positiveSignals, fullTime, "Temps plein détecté");
    addSignal(positiveSignals, vehicle, "Véhicule ou outils fournis");
    addSignal(positiveSignals, mentoring, "Accompagnement terrain");
    addSignal(positiveSignals, audit, profile.ui.strategicDetectedLabel);
    addSignal(positiveSignals, renovation, profile.id === DIAGNOSTIC_PROFILE_ID ? "Lien rénovation / conseil travaux" : "Perspective d'évolution détectée");
    addSignal(positiveSignals, copro, "Exposition copropriété / tertiaire");

    addSignal(redFlags, independent, "Statut indépendant ou assimilé");
    addSignal(redFlags, variableDominant, "Rémunération trop dépendante du variable");
    addSignal(redFlags, payTraining, "Formation potentiellement à payer");
    addSignal(redFlags, volumePressure, "Rythme ou volume possiblement élevé");
    addSignal(redFlags, hugeArea, "Zone de déplacement large");

    addSignal(uncertainties, !salaryClear, "Salaire non indiqué");
    addSignal(uncertainties, salaryClear && salaryKind === "non précisé", "Salaire brut/net non précisé");
    addSignal(uncertainties, salaryVague, "Salaire formulé de manière floue");
    addSignal(uncertainties, variableMentioned && !variableDominant, "Primes ou variable à clarifier");
    addSignal(uncertainties, partTime, "Temps partiel à vérifier avec ton objectif cashflow");
    addSignal(uncertainties, priorityPoei && poeiEquivalent, "POEI non mentionnée, formation employeur à vérifier");
    addSignal(uncertainties, priorityPoei && !poei && !poeiEquivalent, "POEI non mentionnée");
    addSignal(uncertainties, !training && vagueTraining, "Formation mentionnée mais floue");
    addSignal(uncertainties, !fundedCerts && hasAny(text, ["certification", "certifications"]), "Financement des certifications à vérifier");
    addSignal(uncertainties, strategicPriority && !audit, profile.ui.strategicMissingLabel);
    addSignal(uncertainties, !vehicle, "Véhicule ou frais non précisés");

    let global = 42;
    let trainingScore = 38;
    let cashflowScore = 40;
    let trajectoryScore = 38;
    let auditScore = 30;
    let riskPenalty = 0;

    function award(label, points) {
      global += points;
      scoreLines.push({ label, value: points });
    }

    function penalize(label, points) {
      global -= points;
      riskPenalty += points;
      scoreLines.push({ label, value: -points });
    }

    if (beginnerFriendly) {
      award("Débutant / reconversion accepté", 16);
      trainingScore += 24;
    }
    if (training) {
      award("Formation claire ou parcours d'intégration", 14);
      trainingScore += 22;
    }
    if (poeiEquivalent) {
      award("Formation employeur assimilée POEI à vérifier", 6);
      trainingScore += 10;
    }
    if (poei) {
      award("POEI / POE / AFPR mentionnée", 28);
      trainingScore += 34;
    }
    if (fundedCerts) {
      award("Formation ou certifications financées", 20);
      trainingScore += 26;
    }
    if (cdi) {
      award("Contrat stable", 8);
      cashflowScore += 18;
    }
    if (salaryClear) {
      award(salaryKind === "non précisé" ? "Salaire indiqué, brut/net à confirmer" : `Salaire ${salaryKind} indiqué`, salaryKind === "non précisé" ? 5 : 8);
      cashflowScore += salaryKind === "non précisé" ? 10 : 16;
    }
    if (cdi && training && beginnerFriendly) {
      award("Tremplin reconversion solide", 10);
      trainingScore += 12;
      trajectoryScore += 10;
    }
    if (vehicle) {
      award("Véhicule ou outils fournis", 7);
      cashflowScore += 10;
    }
    if (mentoring) {
      award("Accompagnement terrain", 8);
      trainingScore += 12;
    }
    if (knownStructure) {
      award("Structure potentiellement formatrice", 5);
      trajectoryScore += 8;
    }
    if (audit) {
      award(profile.ui.strategicDetectedLabel, 16);
      auditScore += 36;
      trajectoryScore += 18;
    }
    if (renovation) {
      award(profile.id === DIAGNOSTIC_PROFILE_ID ? "Lien rénovation / conseil travaux" : "Perspective d'évolution détectée", 12);
      auditScore += 20;
      trajectoryScore += 18;
    }
    if (copro) {
      award("Copropriété, syndic ou tertiaire", 7);
      trajectoryScore += 12;
    }

    if (vagueTraining && !training) penalize("Formation mentionnée mais floue", 6);
    if (independent && strategy.rejectIndependent) penalize("Statut indépendant imposé", 42);
    if (variableDominant) penalize("Rémunération dominée par variable / commissions", 32);
    if (payTraining) penalize("Formation à la charge du candidat", 34);
    if (volumePressure) penalize("Pression volume possible", 14);
    if (hugeArea) penalize("Zone de déplacement large", 10);
    if (!salaryClear) penalize("Salaire absent", strategy.prioritySalary ? 14 : 8);
    if (salaryClear && salaryKind === "non précisé") penalize("Brut/net non précisé", strategy.prioritySalary ? 8 : 4);
    if (salaryVague) penalize("Salaire flou", strategy.prioritySalary ? 10 : 5);
    if (partTime && strategy.prioritySalary) penalize("Temps partiel à vérifier pour le cashflow", 8);
    if (!audit && strategicPriority) penalize(profile.ui.strategicMissingLabel, 8);
    if (!training && strategy.priorityTraining) penalize("Formation non confirmée", 8);
    if (!poei && priorityPoei) penalize(poeiEquivalent ? "POEI non mentionnée, formation employeur à vérifier" : "POEI non mentionnée", poeiEquivalent ? 3 : 10);

    if (strategy.priorityTraining) trainingScore += training ? 8 : -8;
    if (priorityPoei) trainingScore += poei ? 12 : poeiEquivalent ? 4 : -8;
    if (strategy.prioritySalary) cashflowScore += salaryClear && salaryKind !== "non précisé" ? 10 : -12;
    if (strategicPriority) auditScore += audit || renovation ? 8 : -8;

    const riskLevel = riskLabel(riskPenalty);
    const riskScore = clampScore(100 - riskPenalty * 1.5 - uncertainties.length * 4);
    const finalTraining = clampScore(trainingScore);
    const finalCashflow = clampScore(cashflowScore);
    const finalTrajectory = clampScore(trajectoryScore);
    const finalAudit = clampScore(auditScore);
    const localGlobal = clampScore(
      global +
        (strategy.priorityTraining ? finalTraining * 0.06 : 0) +
        (priorityPoei ? finalTraining * 0.04 : 0) +
        (strategy.prioritySalary ? finalCashflow * 0.04 : 0) +
        (strategicPriority ? finalAudit * 0.06 : 0),
    );
    const adjustment = aiScoreAdjustment(job);
    if (adjustment !== 0) {
      scoreLines.push({ label: `Avis intelligent : ${adjustment > 0 ? "bonus" : "malus"} IA`, value: adjustment });
    }
    const finalGlobal = clampScore(localGlobal + adjustment);

    const trapOffer = (independent && strategy.rejectIndependent) || variableDominant || payTraining;
    const tremplinOffer = cdi && beginnerFriendly && (training || poei || fundedCerts || employerTrainingEquivalent) && riskLevel !== "élevé";
    const stableCashflowOffer = cdi && salaryClear && salaryKind !== "non précisé" && !variableDominant && riskLevel === "faible";
    const strategicPathOffer = (audit || renovation) && finalAudit >= 66 && finalTrajectory >= 58 && !trapOffer;
    const offerType = pickOfferType(finalGlobal, finalTraining, finalCashflow, finalTrajectory, finalAudit, riskLevel, {
      trap: trapOffer,
      tremplin: tremplinOffer,
      stableCashflow: stableCashflowOffer,
      strategicPath: strategicPathOffer,
    });
    const verdict = verdictFor(finalGlobal, offerType, riskLevel);
    const normalizedTitle = controlled.values.title || normalizeTitle(combined, profile);
    const company = controlled.values.company || findCompany(rawText);
    const companyType = companyTypeFor(company, combined);
    const companySearchUrl = companySearchUrlFor(company, profile);
    const location = controlled.values.location || findLocation(rawText, text);
    const contract = controlled.values.contract || findContract(text);
    const title = controlled.values.title || findTitle(rawText, text, profile);
    const confidence = confidenceFor(rawText, salaryClear, company, location, contract, uncertainties);

    const questions = [
      poei
        ? profile.analysis.questions.poeiKnown
        : employerTraining
          ? "La formation assurée par vos soins peut-elle être formalisée en POEI, AFPR ou autre financement France Travail ?"
          : training || vagueTraining
            ? profile.analysis.questions.trainingKnown
            : profile.analysis.questions.trainingMissing,
      "Combien d'interventions sont prévues par jour en moyenne ?",
      audit ? profile.analysis.questions.strategicKnown : profile.analysis.questions.strategicMissing,
      salaryClear ? "Quelle part du salaire est fixe et quelle part dépend du variable ?" : "Quel est le fixe exact, hors primes et variables ?",
    ];

    const summary =
      positiveSignals.length > 0
        ? `${positiveSignals.slice(0, 3).join(", ")}. ${redFlags[0] ? "Point de vigilance : " + redFlags[0].toLowerCase() + "." : "Peu de signaux bloquants détectés."}`
        : "Annonce encore trop peu qualifiée. Il faut récupérer plus d'informations avant de décider.";

    const applicationAngle =
      audit || renovation
        ? profile.analysis.applicationAngles.strategic
        : profile.analysis.applicationAngles.default;
    const verdictReasons = redFlags.concat(positiveSignals, uncertainties).slice(0, 3);

    return {
      id: job.id,
      title,
      normalizedTitle,
      company,
      companyType,
      companySearchUrl,
      location,
      contract,
      workTime,
      salary,
      salaryKind,
      normalizedSalary,
      bonus,
      bonusEstimate,
      requiredExperience,
      experienceFit,
      benefits,
      summary,
      verdict,
      verdictReasons,
      offerType,
      riskLevel,
      localScore: localGlobal,
      aiScoreAdjustment: adjustment,
      aiScoreReasons: job.aiReview && job.aiReview.status === "done" && Array.isArray(job.aiReview.scoreReasons) ? job.aiReview.scoreReasons.slice(0, 4) : [],
      scores: {
        global: finalGlobal,
        training: finalTraining,
        cashflow: finalCashflow,
        trajectory: finalTrajectory,
        audit: finalAudit,
        risk: riskScore,
      },
      positiveSignals,
      redFlags,
      uncertainties,
      questions,
      applicationAngle,
      scoreLines,
      scoreConfidence: confidence.level,
      confidenceReasons: confidence.reasons,
      rawText: originalRawText,
    };
  }

  function scoreClass(score) {
    if (score >= 82) return "score high";
    if (score >= 68) return "score good";
    if (score >= 52) return "score mid";
    return "score low";
  }

  function metricTone(value) {
    if (value >= 80) return "metric-green";
    if (value >= 50) return "metric-lime";
    if (value >= 35) return "metric-yellow";
    if (value >= 20) return "metric-orange";
    return "metric-red";
  }

  function riskClass(risk) {
    if (risk === "élevé") return "risk danger";
    if (risk === "modéré") return "risk warning";
    return "risk ok";
  }

  function confidenceClass(confidence) {
    if (confidence === "bonne") return "confidence good";
    if (confidence === "moyenne") return "confidence medium";
    return "confidence low";
  }

  function includesAny(items, fragments) {
    return items.some((item) => fragments.some((fragment) => item.toLowerCase().includes(fragment)));
  }

  function detectedValidationTags(analysis) {
    const positives = analysis.positiveSignals;
    const redFlags = analysis.redFlags;
    const uncertainties = analysis.uncertainties;
    const scoreLabels = analysis.scoreLines.map((line) => line.label);
    const tags = [];

    if (includesAny([...positives, ...scoreLabels], ["poei", "poe", "afpr"])) tags.push("POEI");
    if (includesAny([...positives, ...scoreLabels], ["formation", "certification", "parcours"])) tags.push("formation");
    if (includesAny([...positives, ...scoreLabels], ["audit", "rénovation", "renovation"])) tags.push("audit");
    if (includesAny([...redFlags, ...scoreLabels], ["indépendant", "independant", "agent commercial", "franchise"])) tags.push("indépendant");
    if (includesAny([...uncertainties, ...redFlags, ...scoreLabels], ["salaire", "rémunération", "remuneration", "variable"])) tags.push("salaire flou");
    if (includesAny([...positives, ...scoreLabels], ["débutant", "debutant", "junior", "reconversion"])) tags.push("débutant accepté");
    if (includesAny([...redFlags, ...scoreLabels], ["volume", "rythme", "planning", "interventions", "déplacement"])) tags.push("volume");

    return tags;
  }

  function predictedVerdict(analysis) {
    if (analysis.offerType === "Offre piège" || analysis.riskLevel === "élevé") return "piège";
    if (analysis.offerType === "Offre hors trajectoire" || analysis.scores.global < 55) return "hors trajectoire";
    if (analysis.scores.global >= 78 || analysis.offerType === "Offre stratégique") return "prioritaire";
    return "à creuser";
  }

  function normalizeExpectedReview(job) {
    const review = job.expectedReview || {};
    return {
      expectedVerdict: review.expectedVerdict || "",
      expectedTags: Array.isArray(review.expectedTags) ? review.expectedTags : [],
      expectedExtraction: {
        title: review.expectedExtraction && typeof review.expectedExtraction.title === "string" ? review.expectedExtraction.title : "",
        company: review.expectedExtraction && typeof review.expectedExtraction.company === "string" ? review.expectedExtraction.company : "",
        location: review.expectedExtraction && typeof review.expectedExtraction.location === "string" ? review.expectedExtraction.location : "",
        contract: review.expectedExtraction && typeof review.expectedExtraction.contract === "string" ? review.expectedExtraction.contract : "",
        salary: review.expectedExtraction && typeof review.expectedExtraction.salary === "string" ? review.expectedExtraction.salary : "",
        workTime: review.expectedExtraction && typeof review.expectedExtraction.workTime === "string" ? review.expectedExtraction.workTime : "",
      },
      notes: review.notes || "",
    };
  }

  function hasExpectedExtraction(review) {
    return Object.values(review.expectedExtraction || {}).some((value) => String(value || "").trim());
  }

  const expectedExtractionInputs = [
    ["title", "Titre attendu", "Chef de Projet AMO - Investisseurs F/H"],
    ["company", "Entreprise attendue", "Kardham"],
    ["location", "Lieu attendu", "Paris 17 - 75"],
    ["contract", "Contrat attendu", "CDI"],
    ["salary", "Salaire attendu", "45-60 k brut/an"],
    ["workTime", "Temps attendu", "35H, temps partiel..."],
  ];

  function isRealWorldJob(job) {
    return !job.datasetLabel || job.datasetLabel === "jeu réel";
  }

  function isAnnotatedJob(job) {
    const review = normalizeExpectedReview(job);
    return Boolean(review.expectedVerdict || review.expectedTags.length || hasExpectedExtraction(review) || String(review.notes || "").trim());
  }

  function correctedExtractionLabels(job) {
    const manual = job.manualExtraction || null;
    if (!manual) return [];
    return [
      ["title", "Titre"],
      ["company", "Entreprise"],
      ["location", "Lieu"],
      ["contract", "Contrat"],
      ["workTime", "Temps de travail"],
      ["salary", "Salaire"],
      ["bonus", "Primes"],
      ["requiredExperience", "Expérience"],
      ["benefits", "Avantages"],
    ]
      .filter(([field]) => String(manual[field] || "").trim())
      .map(([, label]) => label);
  }

  function isCorrectedJob(job) {
    return correctedExtractionLabels(job).length > 0 || job.extractionReview === "manual";
  }

  function terrainQualityLabel(job) {
    if (job.extractionQuality) return job.extractionQuality;
    if (job.extractionReview === "manual") return "corrigée manuellement";
    if (job.extractionReview === "ok") return "Extraction OK";
    return "À vérifier";
  }

  function terrainLooksMissing(value, fragments) {
    const text = normalize(value || "");
    return !text.trim() || fragments.some((fragment) => text.includes(fragment));
  }

  function terrainAiQualityReasons(job) {
    const checks = job.aiReview && job.aiReview.status === "done" && job.aiReview.qualityCheck ? job.aiReview.qualityCheck.fieldChecks || [] : [];
    const important = ["entreprise", "company", "lieu", "location", "contrat", "temps", "worktime", "salaire", "salary", "brut", "net", "prime"];
    return checks
      .filter((item) => item && item.status !== "ok")
      .filter((item) => important.some((term) => normalize(`${item.field} ${item.reason}`).includes(term)))
      .slice(0, 2)
      .map((item) => `${item.field} IA à vérifier`);
  }

  function terrainCorrectionReasons(item) {
    const { job, analysis } = item;
    const reasons = [
      /vérifier|verifier|partielle/i.test(terrainQualityLabel(job)) ? "extraction à vérifier" : "",
      job.extractionReview === "needs_review" ? "statut extraction à vérifier" : "",
      terrainLooksMissing(analysis.company, ["non precise", "non precisee", "source inconnue"]) ? "entreprise absente" : "",
      terrainLooksMissing(analysis.location, ["non detecte", "non detectee", "lieu non"]) ? "lieu absent" : "",
      terrainLooksMissing(analysis.contract, ["non precise", "non precisee"]) ? "contrat absent" : "",
      terrainLooksMissing(analysis.salary, ["non indique", "non indiquee", "salaire non"]) ? "salaire absent" : "",
      ...terrainAiQualityReasons(job),
    ].filter(Boolean);
    return [...new Set(reasons)].slice(0, 4);
  }

  function isTerrainSorted(job) {
    return normalizeReviewStatus(job) !== "a_traiter" || job.favorite || job.ignored;
  }

  function prefillExpectedExtraction(analysis) {
    return {
      title: analysis.normalizedTitle,
      company: analysis.company,
      location: analysis.location,
      contract: analysis.contract,
      salary: analysis.salary,
      workTime: analysis.workTime,
    };
  }

  function terrainQueueRows(analyses) {
    const real = analyses.filter(({ job }) => isRealWorldJob(job));
    const correctionRows = real
      .map((item) => ({ item, reasons: terrainCorrectionReasons(item) }))
      .filter(({ reasons }) => reasons.length > 0)
      .sort((a, b) => b.item.analysis.scores.global - a.item.analysis.scores.global);
    const annotationRows = real
      .filter(({ job }) => !isAnnotatedJob(job))
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
    const readyRows = real
      .filter((item) => isAnnotatedJob(item.job) && isTerrainSorted(item.job) && terrainCorrectionReasons(item).length === 0)
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
    return { correctionRows, annotationRows, readyRows };
  }

  function terrainValidationStatus(item) {
    const correctionReasons = terrainCorrectionReasons(item);
    if (correctionReasons.length) {
      return {
        label: "à corriger",
        tone: "correct",
        message: correctionReasons.join(" · "),
      };
    }
    if (!isTerrainSorted(item.job)) {
      return {
        label: "à trier",
        tone: "sort",
        message: "Décide si l’offre est à creuser, favorite ou ignorée.",
      };
    }
    if (!isAnnotatedJob(item.job)) {
      return {
        label: "à annoter",
        tone: "annotate",
        message: "Ajoute verdict attendu, tags ou notes terrain.",
      };
    }
    return {
      label: "prête scoring",
      tone: "ready",
      message: "Triée, annotée et extraction exploitable.",
    };
  }

  function terrainNotReadyRows(analyses) {
    const queues = terrainQueueRows(analyses);
    const real = analyses.filter(({ job }) => isRealWorldJob(job));
    const rows = [];
    const seen = new Set();
    const add = (item, reason) => {
      if (seen.has(item.job.id)) return;
      seen.add(item.job.id);
      rows.push({ item, reason });
    };
    queues.correctionRows.forEach(({ item, reasons }) => add(item, reasons.join(" · ")));
    real.filter(({ job }) => !isTerrainSorted(job)).forEach((item) => add(item, "tri à décider"));
    queues.annotationRows.forEach((item) => add(item, "annotation manquante"));
    return rows.sort((a, b) => b.item.analysis.scores.global - a.item.analysis.scores.global);
  }

  function buildTerrainBlockers(analyses, target = 20) {
    const report = buildTerrainReport(analyses, target);
    const queues = terrainQueueRows(analyses);
    const unsortedCount = report.real.filter(({ job }) => !isTerrainSorted(job)).length;
    const missingVerdictCount = report.real.filter(({ job }) => !normalizeExpectedReview(job).expectedVerdict).length;
    const missingTagsCount = report.real.filter(({ job }) => normalizeExpectedReview(job).expectedTags.length === 0).length;
    const missingNotesCount = report.real.filter(({ job }) => !normalizeExpectedReview(job).notes.trim()).length;
    const fragileSourceCount = report.sourceRows.filter((source) => source.message !== "source exploitable").length;
    const annotatedGap = Math.max(0, target - report.annotatedCount);
    const blockers = [
      { label: "annonces à annoter", count: annotatedGap, tone: "annotate" },
      { label: "infos à corriger", count: queues.correctionRows.length, tone: "correct" },
      { label: "tri à décider", count: unsortedCount, tone: "sort" },
      { label: "verdicts manquants", count: missingVerdictCount, tone: "annotate" },
      { label: "tags manquants", count: missingTagsCount, tone: "annotate" },
      { label: "notes manquantes", count: missingNotesCount, tone: "annotate" },
      { label: "sources fragiles", count: fragileSourceCount, tone: "correct" },
    ].filter((item) => item.count > 0);
    const readyForScoring = report.annotatedCount >= target && queues.correctionRows.length === 0 && unsortedCount === 0;
    return {
      blockers,
      readyForScoring,
      recommendation: readyForScoring
        ? "Scoring prêt à ajuster : le lot terrain est assez annoté pour regarder les erreurs récurrentes."
        : "Scoring gelé : complète d’abord les corrections, le tri et les annotations terrain.",
    };
  }

  function buildTerrainActionPlan(analyses, target = 20) {
    const report = buildTerrainReport(analyses, target);
    const queues = terrainQueueRows(analyses);
    const unsortedCount = report.real.filter(({ job }) => !isTerrainSorted(job)).length;
    const remainingCollection = Math.max(0, target - report.realCount);
    const remainingAnnotations = Math.max(0, target - report.annotatedCount);

    if (remainingCollection > 0) {
      return {
        title: `Collecter encore ${remainingCollection} annonce${remainingCollection > 1 ? "s" : ""}`,
        message: "Lance une recherche ou importe des offres réelles avant de toucher au scoring.",
        tone: "collect",
        nextId: (queues.annotationRows[0] && queues.annotationRows[0].job.id) || (queues.correctionRows[0] && queues.correctionRows[0].item.job.id) || "",
      };
    }
    if (queues.correctionRows.length > 0) {
      return {
        title: `Corriger ${queues.correctionRows.length} offre${queues.correctionRows.length > 1 ? "s" : ""}`,
        message: "Commence par les infos extraites douteuses pour éviter de calibrer sur des données sales.",
        tone: "correct",
        nextId: queues.correctionRows[0].item.job.id,
      };
    }
    if (unsortedCount > 0) {
      const next = report.real.find(({ job }) => !isTerrainSorted(job));
      return {
        title: `Trier ${unsortedCount} offre${unsortedCount > 1 ? "s" : ""}`,
        message: "Passe les offres en favori, à creuser ou ignorée pour clarifier tes préférences terrain.",
        tone: "sort",
        nextId: next ? next.job.id : "",
      };
    }
    if (remainingAnnotations > 0) {
      return {
        title: `Annoter encore ${remainingAnnotations} annonce${remainingAnnotations > 1 ? "s" : ""}`,
        message: "Ajoute verdict attendu, tags ou notes pour rendre le jeu exploitable.",
        tone: "annotate",
        nextId: (queues.annotationRows[0] && queues.annotationRows[0].job.id) || "",
      };
    }
    return {
      title: "Jeu terrain prêt",
      message: "Les 20 annonces sont annotées : tu peux lancer une vraie passe de calibration scoring.",
      tone: "ready",
      nextId: (queues.readyRows[0] && queues.readyRows[0].job.id) || "",
    };
  }

  function buildTerrainReport(analyses, target = 20) {
    const real = analyses.filter(({ job }) => isRealWorldJob(job));
    const annotated = real.filter(({ job }) => isAnnotatedJob(job));
    const corrected = real.filter(({ job }) => isCorrectedJob(job));
    const favorite = real.filter(({ job }) => normalizeReviewStatus(job) === "favori" || job.favorite);
    const explore = real.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser");
    const ignored = real.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree");
    const correctedFieldCounts = countLabels(real.flatMap(({ job }) => correctedExtractionLabels(job)));
    const bySource = {};

    real.forEach((item) => {
      const source = item.job.source || "Source inconnue";
      bySource[source] = bySource[source] || [];
      bySource[source].push(item);
    });

    const sourceRows = Object.entries(bySource)
      .map(([source, items]) => {
        const annotatedCount = items.filter(({ job }) => isAnnotatedJob(job)).length;
        const favoriteCount = items.filter(({ job }) => normalizeReviewStatus(job) === "favori" || job.favorite).length;
        const exploreCount = items.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser").length;
        const ignoredCount = items.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree").length;
        const qualityCounts = countLabels(items.map(({ job }) => terrainQualityLabel(job)));
        const warnings = [
          items.length < 2 ? "peu d'offres" : "",
          ignoredCount > Math.max(1, items.length / 2) ? "bruit élevé" : "",
          qualityCounts.some(([label]) => /vérifier|partielle/i.test(label)) ? "extraction à surveiller" : "",
        ].filter(Boolean);
        return {
          source,
          total: items.length,
          annotated: annotatedCount,
          favorite: favoriteCount,
          explore: exploreCount,
          ignored: ignoredCount,
          qualityCounts,
          message: warnings.length ? warnings.join(" · ") : "source exploitable",
        };
      })
      .sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));

    return {
      target,
      realCount: real.length,
      annotatedCount: annotated.length,
      correctedCount: corrected.length,
      favoriteCount: favorite.length,
      exploreCount: explore.length,
      ignoredCount: ignored.length,
      progress: Math.min(100, Math.round((annotated.length / target) * 100)),
      sourceRows,
      correctedFieldCounts,
      real,
      annotated,
    };
  }

  const expectedExtractionFields = [
    { field: "title", label: "Titre", actual: (analysis) => analysis.normalizedTitle },
    { field: "company", label: "Entreprise", actual: (analysis) => analysis.company },
    { field: "location", label: "Lieu", actual: (analysis) => analysis.location },
    { field: "contract", label: "Contrat", actual: (analysis) => analysis.contract },
    { field: "salary", label: "Salaire", actual: (analysis) => analysis.salary },
    { field: "workTime", label: "Temps de travail", actual: (analysis) => analysis.workTime },
  ];

  function extractionMatches(analysis, expectedExtraction) {
    return expectedExtractionFields
      .map(({ field, label, actual }) => {
        const expected = String((expectedExtraction && expectedExtraction[field]) || "").trim();
        const actualValue = actual(analysis) || "";
        const expectedNormalized = normalize(expected);
        const actualNormalized = normalize(actualValue);
        const match =
          !expected ||
          expectedNormalized === actualNormalized ||
          (expectedNormalized.length > 3 && actualNormalized.includes(expectedNormalized)) ||
          (actualNormalized.length > 3 && expectedNormalized.includes(actualNormalized));
        return { field, label, expected, actual: actualValue, match };
      })
      .filter((item) => item.expected);
  }

  function compareValidation(analysis, expectedReview) {
    const detectedTags = detectedValidationTags(analysis);
    const expectedTags = expectedReview.expectedTags || [];
    const missedTags = expectedTags.filter((tag) => !detectedTags.includes(tag));
    const extraTags = detectedTags.filter((tag) => !expectedTags.includes(tag));
    const actualVerdict = predictedVerdict(analysis);
    const verdictMatch = expectedReview.expectedVerdict ? expectedReview.expectedVerdict === actualVerdict : null;
    const extractionFieldMatches = extractionMatches(analysis, expectedReview.expectedExtraction);
    const missedExtractionFields = extractionFieldMatches.filter((item) => !item.match).map((item) => item.label);
    let scoreWarning = null;

    if (analysis.scoreConfidence === "faible") scoreWarning = "Confiance faible";
    else if (expectedReview.expectedVerdict === "piège" && analysis.scores.global >= 65) scoreWarning = "Piège possiblement surcoté";
    else if (expectedReview.expectedVerdict === "prioritaire" && analysis.scores.global < 65) scoreWarning = "Priorité possiblement sous-cotée";

    return {
      match: (verdictMatch ?? true) && missedTags.length === 0 && missedExtractionFields.length === 0 && !scoreWarning,
      verdictMatch,
      detectedTags,
      missedTags,
      extraTags,
      extractionFieldMatches,
      missedExtractionFields,
      scoreWarning,
      actualVerdict,
    };
  }

  function getAnalyses() {
    return jobs
      .map((job) => ({ job, analysis: analyzeJob(job) }))
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
  }

  function getVisibleAnalyses(analyses) {
    return analyses.filter(({ job, analysis }) => {
      const status = normalizeReviewStatus(job);
      if (filter === "all") return true;
      if (filter === "to_review" || filter === "active") {
        const decision = evaluateDecisionFit(analysis);
        return !job.ignored && !job.favorite && status !== "a_creuser" && !hasRequiredMismatch(analysis) && (!strategy.hideWeakOffers || decision.fit !== "weak");
      }
      if (filter === "to_explore") return !job.ignored && status === "a_creuser";
      if (filter === "favorites") return job.favorite;
      if (filter === "ignored") return job.ignored;
      return !job.ignored;
    }).filter((item) => rankingSearchMatches(item, rankingSearch));
  }

  function getTabFilteredAnalyses(analyses) {
    return analyses.filter(({ job, analysis }) => {
      const status = normalizeReviewStatus(job);
      if (filter === "all") return true;
      if (filter === "to_review" || filter === "active") {
        const decision = evaluateDecisionFit(analysis);
        return !job.ignored && !job.favorite && status !== "a_creuser" && !hasRequiredMismatch(analysis) && (!strategy.hideWeakOffers || decision.fit !== "weak");
      }
      if (filter === "to_explore") return !job.ignored && status === "a_creuser";
      if (filter === "favorites") return job.favorite;
      if (filter === "ignored") return job.ignored;
      return !job.ignored;
    });
  }

  function rankingSearchMatches(item, query) {
    const normalizedQuery = normalize(query || "");
    if (!normalizedQuery) return true;
    const { job, analysis } = item;
    const manual = job.manualExtraction || {};
    const companyProfile = job.companyProfile || {};
    const employerRating = companyProfile.employerRating || {};
    const aiReview = job.aiReview || {};
    const haystack = normalize([
      analysis.normalizedTitle,
      analysis.company,
      analysis.companyType,
      analysis.location,
      analysis.contract,
      analysis.workTime,
      analysis.salary,
      analysis.salaryKind,
      analysis.bonus,
      analysis.benefits,
      analysis.requiredExperience,
      analysis.offerType,
      analysis.verdict,
      analysis.positiveSignals.join(" "),
      analysis.redFlags.join(" "),
      analysis.uncertainties.join(" "),
      manual.title || "",
      manual.company || "",
      manual.location || "",
      manual.contract || "",
      manual.salary || "",
      manual.bonus || "",
      manual.benefits || "",
      manual.requiredExperience || "",
      job.source || "",
      job.sourceId || "",
      job.sourceUrl || "",
      job.extractionQuality || "",
      (job.extractionNotes || []).join(" "),
      companyProfile.estimatedType || "",
      companyProfile.website || "",
      (companyProfile.signals || []).join(" "),
      companyProfile.summary || "",
      employerRating.label || "",
      employerRating.summary || "",
      aiReview.summary || "",
      (aiReview.decisionReasons || []).join(" "),
      (aiReview.recruiterQuestions || []).join(" "),
      aiReview.applicationPrep ? JSON.stringify(aiReview.applicationPrep) : "",
      aiReview.extraction ? JSON.stringify(aiReview.extraction) : "",
      job.rawText,
    ].join(" "));
    return normalizedQuery.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  }

  function pickBest(candidates, usedIds, scorer) {
    return candidates
      .filter(({ job }) => !usedIds.has(job.id))
      .slice()
      .sort((a, b) => scorer(b.analysis) - scorer(a.analysis))[0];
  }

  function getTopPicks(analyses, activeProfile = getActiveProfile()) {
    const candidates = analyses.filter(({ job, analysis }) => !job.ignored && !hasRequiredMismatch(analysis));
    const usedIds = new Set();
    const picks = [];

    const strategic = pickBest(
      candidates,
      usedIds,
      (analysis) => analysis.scores.audit * 1.4 + analysis.scores.trajectory + analysis.scores.global * 0.45,
    );
    if (strategic) {
      usedIds.add(strategic.job.id);
      picks.push({
        kind: "Stratégique",
        reason: `Meilleure passerelle vers ${activeProfile.ui.strategicScoreLabel.toLowerCase()}, ${activeProfile.ui.trajectoryScoreLabel.toLowerCase()} ou progression long terme.`,
        item: strategic,
      });
    }

    const secure = pickBest(
      candidates,
      usedIds,
      (analysis) => analysis.scores.cashflow * 1.2 + analysis.scores.risk + analysis.scores.global * 0.35,
    );
    if (secure) {
      usedIds.add(secure.job.id);
      picks.push({
        kind: "Sécurisante",
        reason: "Bon compromis revenu, clarté et risque maîtrisé.",
        item: secure,
      });
    }

    const explore = pickBest(
      candidates,
      usedIds,
      (analysis) => analysis.scores.global + analysis.scores.training * 0.5 + analysis.scores.audit * 0.35,
    );
    if (explore) {
      picks.push({
        kind: "À creuser",
        reason: "Offre intéressante mais avec des points à vérifier.",
        item: explore,
      });
    }

    return picks;
  }

  function validationSummary(analyses) {
    const reviewed = analyses
      .map(({ job, analysis }) => {
        const review = normalizeExpectedReview(job);
        return { job, analysis, review, comparison: compareValidation(analysis, review) };
      })
      .filter(({ review }) => review.expectedVerdict || review.expectedTags.length || hasExpectedExtraction(review) || review.notes);

    const missedCount = reviewed.reduce((sum, item) => sum + item.comparison.missedTags.length, 0);
    const extraCount = reviewed.reduce((sum, item) => sum + item.comparison.extraTags.length, 0);
    const warnings = reviewed.filter((item) => item.comparison.scoreWarning || item.analysis.scoreConfidence === "faible");
    const verdicts = reviewed.filter((item) => item.comparison.verdictMatch !== null);
    const verdictMatches = verdicts.filter((item) => item.comparison.verdictMatch).length;
    const rulesToAdjust = [];

    reviewed.forEach(({ analysis, comparison }) => {
      if (comparison.missedTags.includes("POEI")) rulesToAdjust.push("POEI manquée : enrichir les synonymes formation préalable.");
      if (comparison.missedTags.includes("audit")) rulesToAdjust.push("Audit manqué : renforcer rénovation, DPE avec mention, conseil travaux.");
      if (comparison.missedTags.includes("indépendant")) rulesToAdjust.push("Indépendant manqué : durcir agent commercial, franchise, à votre compte.");
      if (comparison.missedTags.includes("salaire flou")) rulesToAdjust.push("Salaire flou manqué : mieux traiter package, selon profil, variable.");
      if (comparison.missedExtractionFields.includes("Titre")) rulesToAdjust.push("Titre mal extrait : privilégier le titre source structuré avant les mots présents dans la description.");
      if (comparison.missedExtractionFields.includes("Entreprise")) rulesToAdjust.push("Entreprise mal extraite : renforcer les blocs Employeur, enseigne et pictos source.");
      if (comparison.missedExtractionFields.includes("Lieu")) rulesToAdjust.push("Lieu mal extrait : conserver les champs source hors description quand ils existent.");
      if (comparison.scoreWarning) rulesToAdjust.push(`${analysis.normalizedTitle} : ${comparison.scoreWarning}.`);
    });

    return {
      reviewed,
      missedCount,
      extraCount,
      warnings,
      verdictMatches,
      verdictCount: verdicts.length,
      rulesToAdjust: [...new Set(rulesToAdjust)].slice(0, 6),
    };
  }

  function countTags(items) {
    const counts = {};
    items.flat().forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  function countLabels(items) {
    const counts = {};
    items.filter(Boolean).forEach((label) => {
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  function calibrationRuleFor(tag, kind, count) {
    const priority = count >= 2 ? "Priorité haute" : "À surveiller";
    const missedRules = {
      POEI: "POEI manquée : enrichir les formulations POE, AFPR, formation préalable et embauche après parcours.",
      formation: "Formation manquée : mieux distinguer formation financée, tutorat, intégration et certifications prises en charge.",
      audit: "Audit manqué : renforcer rénovation énergétique, DPE avec mention, conseil travaux et scénarios.",
      indépendant: "Indépendant manqué : durcir agent commercial, franchise, mandataire et activité à son compte.",
      "salaire flou": "Salaire flou manqué : mieux traiter selon profil, variable, package, commissions et non plafonné.",
      "débutant accepté": "Débutant manqué : enrichir junior, reconversion, sans expérience et première expérience acceptée.",
      volume: "Volume manqué : mieux repérer cadence, planning chargé, nombreuses interventions et grands secteurs.",
    };
    const extraRules = {
      POEI: "POEI surdétectée : vérifier que POE/AFPR indique bien un dispositif de recrutement.",
      formation: "Formation surdétectée : séparer simple intégration, formation vague et vraie prise en charge.",
      audit: "Audit surdétecté : ne pas confondre DPE standard et vraie trajectoire audit/rénovation.",
      indépendant: "Indépendant surdétecté : distinguer autonomie terrain et statut indépendant imposé.",
      "salaire flou": "Salaire flou surdétecté : ne pas pénaliser les fourchettes salariales suffisamment claires.",
      "débutant accepté": "Débutant surdétecté : distinguer junior réel et simple première expérience souhaitée.",
      volume: "Volume surdétecté : distinguer mobilité normale et pression de cadence.",
    };

    return `${priority} (${count}) - ${kind === "missed" ? missedRules[tag] : extraRules[tag]}`;
  }

  function buildCalibrationReport(analyses) {
    const reviewed = analyses
      .map(({ job, analysis }) => {
        const review = normalizeExpectedReview(job);
        return { job, analysis, review, comparison: compareValidation(analysis, review) };
      })
      .filter(({ review }) => review.expectedVerdict || review.expectedTags.length || hasExpectedExtraction(review) || review.notes);
    const verdicts = reviewed.filter((item) => item.comparison.verdictMatch !== null);
    const verdictMatches = verdicts.filter((item) => item.comparison.verdictMatch).length;
    const missedTagCounts = countTags(reviewed.map((item) => item.comparison.missedTags));
    const extraTagCounts = countTags(reviewed.map((item) => item.comparison.extraTags));
    const overratedOffers = reviewed.filter(
      ({ review, analysis }) => ["piège", "hors trajectoire"].includes(review.expectedVerdict) && analysis.scores.global >= 65,
    );
    const underratedOffers = reviewed.filter(({ review, analysis }) => review.expectedVerdict === "prioritaire" && analysis.scores.global < 65);
    const priorityRules = [
      ...missedTagCounts.map(([tag, count]) => calibrationRuleFor(tag, "missed", count)),
      ...extraTagCounts.map(([tag, count]) => calibrationRuleFor(tag, "extra", count)),
    ].slice(0, 8);
    const extractionChecks = reviewed.flatMap((item) => item.comparison.extractionFieldMatches);
    const extractionMatchCount = extractionChecks.filter((item) => item.match).length;
    const extractionMissCounts = countLabels(extractionChecks.filter((item) => !item.match).map((item) => item.label));
    const genericTitleMisses = extractionChecks.filter(
      (item) =>
        item.field === "title" &&
        !item.match &&
        ["technicien diagnostic immobilier", "auditeur énergétique junior", "technicien dpe", "poste à qualifier"].some((generic) =>
          item.actual.toLowerCase().includes(generic),
        ),
    ).length;
    const fragileSources = countLabels(
      reviewed
        .filter((item) => item.comparison.missedExtractionFields.length)
        .map((item) => item.job.source || "Source inconnue"),
    );

    return {
      reviewedCount: reviewed.length,
      verdictMatchRate: verdicts.length ? Math.round((verdictMatches / verdicts.length) * 100) : null,
      verdictMatches,
      verdictCount: verdicts.length,
      missedTagCounts,
      extraTagCounts,
      overratedOffers,
      underratedOffers,
      priorityRules,
      extractionCheckCount: extractionChecks.length,
      extractionMatchCount,
      extractionMissCounts,
      genericTitleMisses,
      fragileSources,
      reviewed,
    };
  }

  function offerMarkdown(analysis) {
    return `# ${analysis.normalizedTitle}

Entreprise : ${analysis.company}
Type entreprise : ${analysis.companyType}
Lieu : ${analysis.location}
Contrat : ${analysis.contract}
Temps de travail : ${analysis.workTime}
Salaire : ${analysis.salary}
Brut / net : ${analysis.salaryKind}
Salaire comparable : ${analysis.normalizedSalary.label}
Primes : ${analysis.bonus}
Primes estimées : ${analysis.bonusEstimate}
Expérience demandée : ${analysis.requiredExperience}
Avantages : ${analysis.benefits}

Verdict : ${analysis.verdict}
Type : ${analysis.offerType}
Score global : ${analysis.scores.global}/100
Score local : ${analysis.localScore}/100
Ajustement IA : ${analysis.aiScoreAdjustment > 0 ? "+" : ""}${analysis.aiScoreAdjustment}
Confiance : ${analysis.scoreConfidence}

## Résumé
${analysis.summary}

## Raisons IA
${analysis.aiScoreReasons && analysis.aiScoreReasons.length ? analysis.aiScoreReasons.map((item) => `- ${item}`).join("\n") : "- Aucun ajustement IA"}

## Signaux positifs
${analysis.positiveSignals.length ? analysis.positiveSignals.map((item) => `- ${item}`).join("\n") : "- Aucun signal fort détecté"}

## Red flags
${analysis.redFlags.length ? analysis.redFlags.map((item) => `- ${item}`).join("\n") : "- Pas de gros red flag"}

## À vérifier
${analysis.uncertainties.length ? analysis.uncertainties.map((item) => `- ${item}`).join("\n") : "- Peu d'incertitudes"}

## Questions à poser
${analysis.questions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Angle candidature
${analysis.applicationAngle}
`;
  }

  function exportMarkdown(analyses) {
    const topPicks = getTopPicks(analyses);
    const header = `# Taf Sniffer - Synthèse

Offres analysées : ${analyses.length}
Offres actives : ${analyses.filter(({ job }) => !job.ignored).length}

## Top 3
${topPicks
  .map(({ kind, reason, item }, index) => `${index + 1}. ${kind} - ${item.analysis.normalizedTitle} (${item.analysis.scores.global}/100)
   ${reason}`)
  .join("\n")}
`;

    return `${header}\n\n${analyses.map(({ analysis }) => offerMarkdown(analysis)).join("\n---\n")}`;
  }

  function exportTerrainMarkdown(analyses) {
    const terrain = buildTerrainReport(analyses);
    const action = buildTerrainActionPlan(analyses);
    const queues = terrainQueueRows(analyses);
    const blockers = buildTerrainBlockers(analyses);
    const notReadyRows = terrainNotReadyRows(analyses);
    const calibration = buildCalibrationReport(analyses);
    const topPicks = getTopPicks(analyses);
    const sourceLines = terrain.sourceRows.length
      ? terrain.sourceRows
          .map(
            (source) =>
              `- ${source.source} : ${source.total} offre(s), ${source.annotated} annotée(s), ${source.favorite} favori(s), ${source.explore} à creuser, ${source.ignored} ignorée(s) · ${source.message}`,
          )
          .join("\n")
      : "- Aucune source réelle collectée.";
    const correctionLines = terrain.correctedFieldCounts.length
      ? terrain.correctedFieldCounts.map(([label, count]) => `- ${label} : ${count}`).join("\n")
      : "- Aucune correction manuelle enregistrée.";
    const missedTags = calibration.missedTagCounts.length
      ? calibration.missedTagCounts.map(([tag, count]) => `- ${tag} : ${count}`).join("\n")
      : "- Aucun tag manqué observé.";
    const extraTags = calibration.extraTagCounts.length
      ? calibration.extraTagCounts.map(([tag, count]) => `- ${tag} : ${count}`).join("\n")
      : "- Aucun faux positif observé.";
    const pendingAnnotationLines = queues.annotationRows.length
      ? queues.annotationRows
          .slice(0, 12)
          .map(({ analysis, job }) => `- ${analysis.normalizedTitle} (${analysis.scores.global}/100) · ${analysis.company} · ${job.source || "source inconnue"}`)
          .join("\n")
      : "- Aucune offre en attente d'annotation.";
    const notReadyLines = notReadyRows.length
      ? notReadyRows
          .slice(0, 15)
          .map(({ item, reason }) => `- ${item.analysis.normalizedTitle} (${item.analysis.scores.global}/100) · ${reason}`)
          .join("\n")
      : "- Toutes les offres terrain du lot actuel sont prêtes scoring.";
    const blockerLines = blockers.blockers.length
      ? blockers.blockers.map((item) => `- ${item.label} : ${item.count}`).join("\n")
      : "- Aucun blocage majeur.";
    const extractionIssueLines = calibration.extractionMissCounts.length
      ? calibration.extractionMissCounts.map(([label, count]) => `- ${label} : ${count}`).join("\n")
      : correctionLines;
    const scoringDivergenceLines = [
      ...calibration.overratedOffers.slice(0, 5).map(({ analysis }) => `- Surcotée possible : ${analysis.normalizedTitle} (${analysis.scores.global}/100)`),
      ...calibration.underratedOffers.slice(0, 5).map(({ analysis }) => `- Sous-cotée possible : ${analysis.normalizedTitle} (${analysis.scores.global}/100)`),
      ...calibration.priorityRules.slice(0, 5).map((rule) => `- ${rule}`),
    ].join("\n") || "- Pas encore assez de divergence observée.";
    const fragileSourceLines = terrain.sourceRows.filter((source) => source.message !== "source exploitable").length
      ? terrain.sourceRows
          .filter((source) => source.message !== "source exploitable")
          .map((source) => `- ${source.source} : ${source.message}`)
          .join("\n")
      : "- Aucune source fragile évidente.";

    return `# Taf Sniffer - Rapport terrain V1

Objectif : ${terrain.target} annonces réelles annotées
Progression : ${terrain.annotatedCount}/${terrain.target} annotées (${terrain.progress}%)
Offres réelles : ${terrain.realCount}
Corrigées : ${terrain.correctedCount}
Favoris : ${terrain.favoriteCount}
À creuser : ${terrain.exploreCount}
Ignorées : ${terrain.ignoredCount}

## Prochaines actions
- ${action.title} : ${action.message}

## Ce qui bloque la calibration
${blockerLines}

Recommandation : ${blockers.recommendation}

## Offres non prêtes
${notReadyLines}

## Offres encore à annoter
${pendingAnnotationLines}

## Top 3 actuel
${topPicks.length ? topPicks.map(({ kind, reason, item }, index) => `${index + 1}. ${kind} - ${item.analysis.normalizedTitle} (${item.analysis.scores.global}/100)\n   ${reason}`).join("\n") : "- Pas encore de Top 3 exploitable."}

## Sources
${sourceLines}

## Sources fragiles
${fragileSourceLines}

## Champs souvent corrigés
${correctionLines}

## Erreurs d'extraction à surveiller
${extractionIssueLines}

## Calibration observée
Annonces annotées : ${calibration.reviewedCount}
Verdicts alignés : ${calibration.verdictMatchRate !== null ? `${calibration.verdictMatchRate}%` : "non mesuré"}

### Divergences scoring
${scoringDivergenceLines}

### Tags manqués
${missedTags}

### Faux positifs
${extraTags}

## Prochaine action
${action.title} - ${action.message}
`;
  }

  function updateJob(id, patch) {
    jobs = jobs.map((job) => (job.id === id ? Object.assign({}, job, patch, { updatedAt: new Date().toISOString() }) : job));
    save();
    render();
  }

  function buildExtractionPatch(job, values) {
    const detected = analyzeJob(Object.assign({}, job, { manualExtraction: undefined, extractionReview: undefined }));
    const manual = {};
    [
      ["title", detected.normalizedTitle],
      ["company", detected.company],
      ["location", detected.location],
      ["contract", detected.contract],
      ["workTime", detected.workTime],
      ["salary", detected.salary],
      ["bonus", detected.bonus],
      ["requiredExperience", detected.requiredExperience],
      ["benefits", detected.benefits],
    ].forEach(([field, detectedValue]) => {
      const value = cleanManualField(values[field]);
      if (value && value !== detectedValue) manual[field] = value;
    });

    const hasManual = Object.keys(manual).length > 0;
    const review = values.extractionReview === "manual" || values.extractionReview === "needs_review" || values.extractionReview === "ok"
      ? values.extractionReview
      : "ok";

    return {
      manualExtraction: hasManual ? Object.assign({}, manual, { updatedAt: new Date().toISOString() }) : undefined,
      extractionReview: hasManual ? "manual" : review,
      source: cleanManualField(values.source),
      sourceUrl: cleanManualField(values.sourceUrl),
    };
  }

  function updateExpectedReview(id, patch) {
    jobs = jobs.map((job) => {
      if (job.id !== id) return job;

      return {
        ...job,
        expectedReview: {
          ...normalizeExpectedReview(job),
          ...patch,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    save();
    render();
  }

  function deleteJob(id) {
    jobs = jobs.filter((job) => job.id !== id);
    if (selectedId === id) selectedId = jobs[0] ? jobs[0].id : null;
    save();
    render();
  }

  function addOffers(text, meta = {}) {
    const chunks = splitDraftOffers(text);

    if (!chunks.length) return { importedCount: 0, duplicateCount: 0 };
    const next = chunks.map((chunk) => createJob(chunk, meta));
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = next.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = next.length - unique.length;
    jobs = unique.concat(jobs);
    selectedId = bestSelectableId(jobs) || selectedId;
    filter = "to_review";
    statusMessage = unique.length
      ? `${unique.length} offre${unique.length > 1 ? "s" : ""} analysée${unique.length > 1 ? "s" : ""}.`
      : "Recherche relancée : aucune nouvelle offre à ajouter.";
    save();
    render();
    return { importedCount: unique.length, duplicateCount };
  }

  function addJobRecords(records, message, meta = {}) {
    const preparedRecords = records.map((record) => prepareImportedRecord(record, meta));
    const rejected = preparedRecords.filter((record) => importRejectReason(record));
    const validRecords = preparedRecords.filter((record) => !importRejectReason(record));
    if (!validRecords.length) {
      const reason = rejected[0] ? ` (${importRejectReason(rejected[0])})` : "";
      statusMessage = `Aucune offre assez propre à importer${reason}.`;
      return { importedCount: 0, duplicateCount: 0, rejectedCount: rejected.length };
    }

    const next = validRecords;
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = next.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = next.length - unique.length;
    jobs = unique.concat(jobs);
    selectedId = bestSelectableId(jobs) || next[0].id || selectedId;
    filter = "to_review";
    statusMessage = unique.length ? message : "Recherche relancée : aucune nouvelle offre à ajouter.";
    save();
    render();
    return { importedCount: unique.length, duplicateCount, rejectedCount: rejected.length };
  }

  function metric(label, value) {
    return `
      <div class="metric ${metricTone(value)}">
        <span>${escapeHtml(label)}</span>
        <strong>${value}</strong>
        <div class="meter" aria-hidden="true"><span style="width:${value}%"></span></div>
      </div>
    `;
  }

  function scoreMetricsView(analysis, className = "") {
    const activeProfile = getActiveProfile();
    return `
      <div class="summary-grid ${escapeHtml(className)}">
        ${metric("Formation", analysis.scores.training)}
        ${metric("Cashflow", analysis.scores.cashflow)}
        ${metric(activeProfile.ui.trajectoryScoreLabel, analysis.scores.trajectory)}
        ${metric(activeProfile.ui.strategicScoreLabel, analysis.scores.audit)}
        ${metric("Risque maîtrisé", analysis.scores.risk)}
      </div>
    `;
  }

  function signalList(title, items, empty, tone) {
    const body = items.length
      ? `<ul>${items.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(empty)}</p>`;
    return `
      <section class="signal-box ${tone}">
        <h3>${escapeHtml(title)}</h3>
        ${body}
      </section>
    `;
  }

  function qualityStatusLabel(status) {
    if (status === "conflict") return "incohérent";
    if (status === "verify") return "à vérifier";
    return "ok";
  }

  function importantQualityIssues(review) {
    const quality = review && review.status === "done" ? review.qualityCheck : null;
    const fields = quality && Array.isArray(quality.fieldChecks) ? quality.fieldChecks : [];
    const important = ["entreprise", "company", "lieu", "location", "contrat", "temps", "worktime", "salaire", "salary", "brut", "net", "prime", "poei", "audit", "independant"];
    return fields
      .filter((item) => item && item.status !== "ok")
      .filter((item) => important.some((term) => normalize(`${item.field} ${item.reason}`).includes(term)))
      .slice(0, 3);
  }

  function qualityCheckView(quality) {
    if (!quality) return "";
    const issues = (quality.fieldChecks || []).filter((item) => item.status !== "ok").slice(0, 6);
    const warnings = (quality.warnings || []).slice(0, 4);
    const body = issues.length
      ? `<ul>${issues.map((item) => `
          <li>
            <strong>${escapeHtml(item.field)}</strong>
            <span>${escapeHtml(item.reason || "Champ à vérifier.")}</span>
            ${item.suggestedValue ? `<em>Proposition : ${escapeHtml(item.suggestedValue)}</em>` : ""}
          </li>
        `).join("")}</ul>`
      : "<p>Aucune incohérence majeure détectée.</p>";
    return `
      <div class="quality-check ${escapeHtml(quality.status || "ok")}">
        <div class="quality-check-header">
          <strong>Contrôle qualité</strong>
          <span>${escapeHtml(qualityStatusLabel(quality.status))} · confiance ${escapeHtml(quality.confidence || "faible")}</span>
        </div>
        ${body}
        ${warnings.length ? `<div class="quality-warning-list">${warnings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      </div>
    `;
  }

  function scoreLineItem(line) {
    return `
      <div class="score-line">
        <span>${escapeHtml(line.label)}</span>
        <strong class="${line.value > 0 ? "positive-text" : "negative-text"}">${line.value > 0 ? "+" : ""}${line.value}</strong>
      </div>
    `;
  }

  function scoreExplanationView(analysis) {
    const bonuses = analysis.scoreLines.filter((line) => line.value > 0);
    const maluses = analysis.scoreLines.filter((line) => line.value < 0);
    return `
      <div class="score-explanation">
        <div class="score-line-group bonus">
          <strong>Bonus</strong>
          ${bonuses.length ? bonuses.map(scoreLineItem).join("") : "<p>Aucun bonus fort.</p>"}
        </div>
        <div class="score-line-group malus">
          <strong>Malus</strong>
          ${maluses.length ? maluses.map(scoreLineItem).join("") : "<p>Aucun malus fort.</p>"}
        </div>
        <div class="score-line-group uncertainty">
          <strong>Incertitudes</strong>
          ${
            analysis.uncertainties.length
              ? analysis.uncertainties.slice(0, 5).map((item) => `<span>${escapeHtml(item)}</span>`).join("")
              : "<p>Peu d'incertitudes.</p>"
          }
        </div>
      </div>
    `;
  }

  function aiDecisionLabel(verdict) {
    if (verdict === "bonne_piste") return "Bonne piste";
    if (verdict === "risque") return "Risque";
    if (verdict === "hors_cible") return "Hors cible";
    return "À creuser";
  }

  function aiDecisionClass(verdict) {
    if (verdict === "bonne_piste") return "good";
    if (verdict === "risque") return "risk";
    if (verdict === "hors_cible") return "off";
    return "review";
  }

  function compactDecisionList() {
    const seen = new Set();
    const items = [];
    Array.from(arguments)
      .flatMap((group) => group || [])
      .forEach((item) => {
        const value = String(item || "").trim();
        const key = normalize(value);
        if (value && !seen.has(key)) {
          seen.add(key);
          items.push(value);
        }
      });
    return items.slice(0, 3);
  }

  function localQuickDecisionVerdict(analysis, decision) {
    const redFlagsText = normalize((analysis.redFlags || []).join(" "));
    const hardRisk =
      redFlagsText.includes("independant") ||
      redFlagsText.includes("formation potentiellement a payer") ||
      redFlagsText.includes("variable") ||
      analysis.riskLevel === "élevé";
    if (decision.fit === "weak") {
      return analysis.scores.global < 35 || decision.reasons.some((reason) => reason.includes("obligatoire")) ? "Hors cible" : "Risque";
    }
    if (hardRisk) return "Risque";
    if (decision.fit === "review" || analysis.scores.global < 65 || analysis.scoreConfidence === "faible") return "À creuser";
    return "Bonne piste";
  }

  function quickActionFor(job, analysis, verdict, source) {
    if (extractionReviewValue(job) === "needs_review" || analysis.scoreConfidence === "faible") return "corriger les infos";
    if (source === "local") return "analyser avec IA";
    if (verdict === "Hors cible" || verdict === "Risque") return "ignorer";
    if (verdict === "Bonne piste" && analysis.scores.global >= 72) return "appeler";
    return "postuler";
  }

  function quickDecisionVerdictClass(verdict) {
    if (verdict === "Bonne piste") return "good";
    if (verdict === "Risque") return "risk";
    if (verdict === "Hors cible") return "off";
    return "review";
  }

  function buildQuickDecisionSummary(job, analysis, decision, currentStrategy = strategy) {
    const review = job.aiReview || {};
    const aiUsable = review.status === "done" && Boolean(review.decisionVerdict);
    const qualityWarnings = review.status === "done" ? importantQualityIssues(review).map((item) => item.reason || `${item.field} à vérifier`) : [];
    const localWarnings = compactDecisionList(decision.reasons, analysis.redFlags, analysis.uncertainties);
    const confidence =
      review.confidence ||
      (analysis.scoreConfidence === "bonne" && extractionReviewValue(job) !== "needs_review" ? "bonne" : analysis.scoreConfidence);

    if (aiUsable) {
      const verdict = aiDecisionLabel(review.decisionVerdict);
      const reasons = compactDecisionList(review.decisionReasons, review.scoreReasons, review.strengths);
      const warnings = compactDecisionList(qualityWarnings, review.blockers, review.uncertainties, localWarnings);
      return {
        verdict,
        reasons: reasons.length ? reasons : compactDecisionList([review.summary], analysis.positiveSignals),
        warnings,
        nextAction: quickActionFor(job, analysis, verdict, "ia"),
        source: "ia",
        confidence,
      };
    }

    const verdict = localQuickDecisionVerdict(analysis, decision);
    const reasons = compactDecisionList(
      decision.fit === "match" ? analysis.positiveSignals : decision.reasons,
      analysis.verdictReasons,
      [`Score ${analysis.scores.global}/100`],
    );
    const activeProfile = getActiveProfile(currentStrategy);
    const warnings = compactDecisionList(
      localWarnings,
      decision.fit === "match" && analysis.scoreConfidence === "bonne" ? [] : [`${activeProfile.ui.strategicRequirementLabel}, POEI ou salaire à confirmer si besoin.`],
    );
    return {
      verdict,
      reasons: reasons.length ? reasons : [analysis.summary],
      warnings,
      nextAction: quickActionFor(job, analysis, verdict, "local"),
      source: "local",
      confidence,
    };
  }

  function quickDecisionView(job, analysis, decision) {
    if (uiState.mode !== "simple") return "";
    const summary = buildQuickDecisionSummary(job, analysis, decision);
    const review = job.aiReview || {};
    const prep = summary.source === "ia" && review.status === "done" ? review.applicationPrep || {} : {};
    const hasPrep = Boolean(prep.callAngle || prep.message || (prep.checkpoints && prep.checkpoints.length));
    const needsVerification = summary.confidence === "faible" || extractionReviewValue(job) === "needs_review" || summary.warnings.length > 0;
    const sourceLabel = summary.source === "ia" ? "IA" : "local";
    const sourceChip = infoChip(
      "span",
      `field-source-chip ${summary.source === "ia" ? "ai" : "local"}`,
      sourceLabel,
      summary.source === "ia" ? "Résumé basé sur l'avis Gemini déjà généré." : "Résumé local calculé avec les règles Taf Sniffer.",
    );
    const verifyChip = needsVerification
      ? infoChip("span", "field-quality-chip verify", "à vérifier", "Des champs ou signaux restent à vérifier avant de décider définitivement.")
      : "";
    let action = "";
    if (summary.nextAction === "analyser avec IA") {
      action = `<button class="primary-button compact ${buttonLoadingClass("ai-analyze")}" data-action="analyze-ai-offer" data-id="${escapeHtml(job.id)}">${buttonSpinner("ai-analyze")}Analyser cette offre avec IA</button>`;
    } else if (summary.nextAction === "corriger les infos") {
      action = `<button class="primary-button compact" data-action="edit-extraction" data-id="${escapeHtml(job.id)}">Corriger les infos</button>`;
    } else if (summary.nextAction === "ignorer") {
      action = `<button class="ghost-button compact danger-text" data-action="ignore" data-id="${escapeHtml(job.id)}">${job.ignored ? "Restaurer" : "Ignorer"}</button>`;
    } else if (hasPrep) {
      action = `
        <details class="quick-approach">
          <summary class="primary-button compact">Préparer mon approche</summary>
          <div class="quick-approach-content">
            ${prep.callAngle ? `<p><strong>Angle d'appel</strong>${escapeHtml(prep.callAngle)}</p>` : ""}
            ${prep.message ? `<p><strong>Message candidature</strong>${escapeHtml(prep.message)}</p>` : ""}
            ${prep.checkpoints && prep.checkpoints.length ? `<ul>${prep.checkpoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          </div>
        </details>
      `;
    } else if (summary.source === "ia") {
      action = `<button class="ghost-button compact" data-action="scroll-ai-review">Voir l’avis IA</button>`;
    } else {
      action = `<button class="ghost-button compact" data-action="analyze-ai-offer" data-id="${escapeHtml(job.id)}">Affiner avec IA</button>`;
    }

    return `
      <section class="quick-decision-card ${escapeHtml(quickDecisionVerdictClass(summary.verdict))} ${escapeHtml(summary.source)}">
        <div class="quick-decision-head">
          <div>
            <span class="eyebrow">Décision rapide</span>
            <h3>${escapeHtml(summary.verdict)}</h3>
          </div>
          <div class="quick-decision-chips">${sourceChip}${verifyChip}</div>
        </div>
        <div class="quick-decision-grid">
          <div>
            <strong>Pourquoi</strong>
            <ul>${summary.reasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
          </div>
          <div>
            <strong>Vigilance</strong>
            ${
              summary.warnings.length
                ? `<ul>${summary.warnings.slice(0, 3).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
                : "<p>Pas de point bloquant majeur détecté.</p>"
            }
          </div>
          <div class="quick-next-action">
            <strong>Prochaine action</strong>
            <p>${escapeHtml(summary.nextAction)}</p>
            ${action}
            ${
              summary.nextAction !== "ignorer" && decision.fit === "weak"
                ? `<button class="ghost-button compact danger-text" data-action="ignore" data-id="${escapeHtml(job.id)}">${job.ignored ? "Restaurer" : "Ignorer"}</button>`
                : ""
            }
          </div>
        </div>
      </section>
    `;
  }

  function aiReviewView(job, analysis, options = {}) {
    const review = job.aiReview;
    const showQuestions = options.showQuestions !== false;
    if (!review || review.status === "idle") {
      return `
        <section class="ai-review-card muted-card">
          <div class="section-title"><h3>Avis intelligent</h3></div>
          <p>Pas encore d'avis IA pour cette offre.</p>
          <button class="ghost-button compact ${buttonLoadingClass("ai-analyze")}" data-action="analyze-ai-offer" data-id="${job.id}">
            ${buttonSpinner("ai-analyze")}
            Analyser cette offre
          </button>
        </section>
      `;
    }
    if (review.status === "loading") {
      return `
        <section class="ai-review-card muted-card">
          <div class="section-title"><h3>Avis intelligent</h3></div>
          <p>Analyse intelligente en cours...</p>
        </section>
      `;
    }
    if (review.status === "skipped") {
      return `
        <section class="ai-review-card muted-card">
          <div class="section-title"><h3>Avis intelligent</h3></div>
          <p>${escapeHtml(review.errorMessage || "Analyse intelligente non configurée.")}</p>
          <button class="ghost-button compact ${buttonLoadingClass("ai-analyze")}" data-action="analyze-ai-offer" data-id="${job.id}">
            ${buttonSpinner("ai-analyze")}
            Réessayer l'analyse IA
          </button>
        </section>
      `;
    }
    if (review.status === "error") {
      return `
        <section class="ai-review-card warning">
          <div class="section-title"><h3>Avis intelligent</h3></div>
          <p>${escapeHtml(review.errorMessage || "Analyse intelligente indisponible.")}</p>
          <button class="ghost-button compact ${buttonLoadingClass("ai-analyze")}" data-action="analyze-ai-offer" data-id="${job.id}">
            ${buttonSpinner("ai-analyze")}
            Réessayer l'analyse IA
          </button>
        </section>
      `;
    }

    const adjustment = analysis.aiScoreAdjustment || 0;
    const decisionReasons = (review.decisionReasons && review.decisionReasons.length ? review.decisionReasons : review.scoreReasons || []).slice(0, 3);
    const recruiterQuestions = (review.recruiterQuestions && review.recruiterQuestions.length ? review.recruiterQuestions : review.questions || []).slice(0, 5);
    const prep = review.applicationPrep || {};
    return `
      <section class="ai-review-card">
        <div class="section-title">
          <h3>Avis IA clair</h3>
          <span class="${adjustment >= 0 ? "positive-text" : "negative-text"}">${adjustment >= 0 ? "+" : ""}${adjustment} pts IA</span>
        </div>
        <div class="ai-decision-verdict ${escapeHtml(aiDecisionClass(review.decisionVerdict))}">
          <strong>${escapeHtml(aiDecisionLabel(review.decisionVerdict))}</strong>
          ${infoChip(
            "span",
            `confidence-chip ${review.confidence === "bonne" ? "done" : ""}`,
            review.confidence ? `Confiance ${escapeHtml(review.confidence)}` : "Avis à confirmer",
            confidenceTooltip(review.confidence),
          )}
        </div>
        ${
          decisionReasons.length
            ? `<ul class="ai-decision-reasons">${decisionReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`
            : ""
        }
        <p>${escapeHtml(review.summary || "Avis intelligent à vérifier.")}</p>
        <p class="muted">Score local ${analysis.localScore}/100 → score final ${analysis.scores.global}/100.</p>
        ${qualityCheckView(review.qualityCheck)}
        ${
          showQuestions && recruiterQuestions.length
            ? `<div class="ai-question-block"><strong>Questions recruteur IA</strong><ol>${recruiterQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol></div>`
            : ""
        }
        ${
          prep.callAngle || prep.message || (prep.checkpoints && prep.checkpoints.length)
            ? `<details class="application-prep-block">
                <summary class="ghost-button compact">Préparer mon approche</summary>
                <div class="application-prep-content">
                  ${prep.callAngle ? `<p><strong>Angle d'appel</strong>${escapeHtml(prep.callAngle)}</p>` : ""}
                  ${prep.message ? `<p><strong>Message candidature</strong>${escapeHtml(prep.message)}</p>` : ""}
                  ${prep.checkpoints && prep.checkpoints.length ? `<ul>${prep.checkpoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
                </div>
              </details>`
            : ""
        }
        <div class="ai-review-grid">
          ${signalList("Points forts IA", review.strengths || [], "Aucun point fort IA.", "positive")}
          ${signalList("Points bloquants IA", review.blockers || [], "Aucun blocage IA.", "negative")}
          ${signalList("À vérifier IA", (review.uncertainties || []).concat(analysis.aiScoreReasons || []).slice(0, 5), "Peu d'incertitudes IA.", "warning")}
        </div>
      </section>
    `;
  }

  function quickNotesView(job) {
    const review = normalizeExpectedReview(job);
    return `
      <section class="quick-notes-card">
        <div class="section-title"><h3>Notes rapides</h3></div>
        <textarea data-expected="notes" data-id="${escapeHtml(job.id)}" rows="2" placeholder="Ton avis perso : appeler, éviter, question à clarifier...">${escapeHtml(review.notes || "")}</textarea>
      </section>
    `;
  }

  function compactDetail(title, content) {
    return `
      <details class="compact-detail-panel">
        <summary>${escapeHtml(title)}</summary>
        <div class="compact-detail-content">${content}</div>
      </details>
    `;
  }

  function companyProfileCard(profile) {
    return `
      <div class="company-profile-card ${escapeHtml(profile.status || "")}">
        <div>
          <strong>${escapeHtml(profile.estimatedType || "À vérifier")}</strong>
          ${infoChip(
            "span",
            `confidence-chip ${profile.confidence === "bonne" ? "done" : ""}`,
            `Confiance ${escapeHtml(profile.confidence || "faible")}`,
            confidenceTooltip(profile.confidence),
          )}
        </div>
        <p>${escapeHtml(profile.summary || "Fiche entreprise à vérifier.")}</p>
        ${profile.website ? `<a href="${escapeHtml(profile.website)}" target="_blank" rel="noopener noreferrer">site probable</a>` : ""}
        ${
          profile.signals && profile.signals.length
            ? `<div class="company-profile-signals">${profile.signals.slice(0, 4).map((signal) => `<span>${escapeHtml(signal)}</span>`).join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  function extractionFieldForLabel(label) {
    return {
      Entreprise: "company",
      Lieu: "location",
      Contrat: "contract",
      "Temps de travail": "workTime",
      Salaire: "salary",
      Primes: "bonus",
      "Expérience demandée": "requiredExperience",
      Avantages: "benefits",
    }[label];
  }

  function extractionSourceLabel(source) {
    if (source === "manual") return "manuel";
    if (source === "structured") return "source";
    if (source === "ai") return "IA";
    return "local";
  }

  function extractedInfoView(job, analysis) {
    const controlled = getControlledExtraction(job, analysis);
    const effective = controlled.values;
    const reviewValue = extractionReviewValue(job);
    const sourceValue = job.source || "";
    const sourceUrlValue = job.sourceUrl || "";
    const isEditing = editingExtractionId === job.id;

    if (isEditing) {
      return `
        <section class="extracted-info editing" aria-label="Corriger les infos extraites">
          <div class="extracted-info-header">
            <h3>Infos extraites</h3>
            <span class="extraction-status">${escapeHtml(extractionReviewLabel(reviewValue))}</span>
          </div>
          <div class="extraction-edit-form" data-extraction-form="${job.id}">
            <label>
              Titre
              <input data-extraction-field="title" value="${escapeHtml(effective.title)}" />
            </label>
            <label>
              Entreprise
              <input data-extraction-field="company" value="${escapeHtml(effective.company)}" />
            </label>
            <label>
              Lieu
              <input data-extraction-field="location" value="${escapeHtml(effective.location)}" />
            </label>
            <label>
              Contrat
              <input data-extraction-field="contract" value="${escapeHtml(effective.contract)}" />
            </label>
            <label>
              Temps de travail
              <input data-extraction-field="workTime" value="${escapeHtml(effective.workTime)}" placeholder="35H, 39H, temps partiel..." />
            </label>
            <label>
              Salaire
              <input data-extraction-field="salary" value="${escapeHtml(effective.salary)}" />
            </label>
            <label>
              Primes
              <input data-extraction-field="bonus" value="${escapeHtml(effective.bonus)}" placeholder="Non mentionnées, variable, 13e mois..." />
            </label>
            <label>
              Expérience demandée
              <input data-extraction-field="requiredExperience" value="${escapeHtml(effective.requiredExperience)}" placeholder="Débutant accepté, 2 ans, confirmé..." />
            </label>
            <label>
              Avantages
              <input data-extraction-field="benefits" value="${escapeHtml(effective.benefits)}" placeholder="Véhicule, tickets restaurant, mutuelle..." />
            </label>
            <label>
              Source
              <input data-extraction-field="source" value="${escapeHtml(sourceValue)}" placeholder="France Travail, Indeed..." />
            </label>
            <label>
              URL source
              <input data-extraction-field="sourceUrl" value="${escapeHtml(sourceUrlValue)}" placeholder="https://..." />
            </label>
            <label>
              Statut extraction
              <select data-extraction-field="extractionReview">
                ${[
                  ["ok", "Extraction OK"],
                  ["needs_review", "À vérifier"],
                  ["manual", "Corrigée manuellement"],
                ]
                  .map(([value, label]) => `<option value="${value}" ${reviewValue === value ? "selected" : ""}>${label}</option>`)
                  .join("")}
              </select>
            </label>
          </div>
          <div class="button-row">
            <button class="primary-button compact" data-action="save-extraction" data-id="${job.id}">Enregistrer</button>
            <button class="ghost-button compact" data-action="cancel-extraction" data-id="${job.id}">Annuler</button>
            <button class="ghost-button compact danger-text" data-action="clear-extraction" data-id="${job.id}">Effacer corrections</button>
          </div>
        </section>
      `;
    }

    const companyProfile = job.companyProfile;
    const companyAction = `identify-company-${job.id}`;
    const companyLoading = loadingAction === companyAction || (companyProfile && companyProfile.status === "loading");
    const companyProfileVisible = Boolean(companyProfile && companyProfile.status !== "idle" && companyProfile.status !== "loading");
    const canIdentifyCompany = Boolean(analysis.companySearchUrl);
    const qualityIssues = importantQualityIssues(job.aiReview);
    const mainItems = [
      ["Entreprise", effective.company],
      ["Lieu", effective.location],
      ["Contrat", effective.contract],
      ["Temps de travail", effective.workTime],
      ["Salaire", effective.salary],
      ["Salaire comparable", analysis.normalizedSalary && analysis.normalizedSalary.label],
      ["Primes", effective.bonus],
      ["Expérience demandée", effective.requiredExperience],
      ["Avantages", effective.benefits],
    ];
    if (uiState.mode === "advanced" || uiState.showDebugInfo) {
      mainItems.splice(7, 0, ["Primes estimées", analysis.bonusEstimate]);
    }
    const debugItems = [
      ["Origine", `${datasetDisplayLabel(job.datasetLabel)}${job.source ? ` · ${job.source}` : ""}`],
      ["Statut extraction", extractionReviewLabel(reviewValue)],
      ["Qualité source", extractionLabel(job.extractionQuality)],
    ];
    const items = uiState.showDebugInfo ? mainItems.concat(debugItems) : mainItems;

    return `
      <section class="extracted-info" aria-label="Infos extraites de l'annonce">
        <div class="extracted-info-header">
          <h3>Infos extraites</h3>
          <div class="extracted-info-actions">
            ${job.sourceUrl && !isSearchResultUrl(job.sourceUrl) ? `<a href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">ouvrir l'annonce</a>` : ""}
            <button class="ghost-button compact" data-action="edit-extraction" data-id="${job.id}">Corriger</button>
          </div>
        </div>
        ${
          qualityIssues.length
            ? `<p class="quality-inline-warning">IA : ${qualityIssues.map((item) => `${escapeHtml(item.field)} à vérifier`).join(" · ")}</p>`
            : ""
        }
        <div class="extracted-info-grid">
          ${items
            .map(
              ([label, value]) => {
                const fieldKey = extractionFieldForLabel(label);
                const fieldMeta = fieldKey ? controlled.fields[fieldKey] : null;
                return `
                <div class="extracted-info-item">
                  <strong class="extracted-info-label">
                    <span>${escapeHtml(label)}</span>
                    ${
                      uiState.showDebugInfo && fieldMeta
                        ? infoChip(
                            "span",
                            `field-source-chip ${escapeHtml(fieldMeta.source)}`,
                            escapeHtml(extractionSourceLabel(fieldMeta.source)),
                            extractionSourceTooltip(fieldMeta.source),
                          )
                        : ""
                    }
                    ${
                      fieldMeta && fieldMeta.quality === "verify"
                        ? infoChip("span", "field-quality-chip verify", "à vérifier", fieldQualityTooltip("verify", fieldMeta.reason))
                        : ""
                    }
                    ${
                      fieldMeta && fieldMeta.quality === "conflict"
                        ? infoChip("span", "field-quality-chip conflict", "conflit IA", fieldQualityTooltip("conflict", fieldMeta.reason))
                        : ""
                    }
                    ${
                      label === "Entreprise"
                        ? infoChip(
                            "span",
                            "company-type-chip",
                            escapeHtml(companyTypeDisplay(analysis.companyType)),
                            companyTypeTooltip(companyTypeDisplay(analysis.companyType)),
                          )
                        : ""
                    }
                    ${
                      label === "Salaire"
                        ? infoChip(
                            "span",
                            `salary-kind-chip ${analysis.salaryKind === "non précisé" ? "unknown" : "known"}`,
                            escapeHtml(analysis.salaryKind),
                            salaryKindTooltip(analysis.salaryKind),
                          )
                        : ""
                    }
                    ${
                      label === "Expérience demandée"
                        ? infoChip(
                            "span",
                            `experience-fit-chip ${escapeHtml(analysis.experienceFit)}`,
                            escapeHtml(experienceFitLabel(analysis.experienceFit)),
                            experienceFitTooltip(analysis.experienceFit),
                          )
                        : ""
                    }
                  </strong>
                  <span class="extracted-info-value">${escapeHtml(value || "Non détecté")}</span>
                  ${uiState.showDebugInfo && fieldMeta && fieldMeta.quality !== "ok" && fieldMeta.reason ? `<small class="field-quality-reason">${escapeHtml(fieldMeta.reason)}</small>` : ""}
                  ${
                    label === "Entreprise" && canIdentifyCompany
                      ? `<div class="company-profile-actions">
                          ${
                            companyLoading
                              ? `<span class="company-profile-loading">Identification...</span>`
                              : companyProfileVisible
                                ? companyProfileCard(companyProfile)
                                : `<button class="ghost-button compact" data-action="identify-company" data-id="${job.id}">Identifier</button>`
                          }
                          ${
                            companyProfile && (companyProfile.status === "error" || companyProfile.status === "not_found") && !companyLoading
                              ? `<button class="ghost-button compact" data-action="identify-company" data-id="${job.id}">Réessayer</button>`
                              : ""
                          }
                          <a class="company-search-link" href="${escapeHtml(analysis.companySearchUrl)}" target="_blank" rel="noopener noreferrer">Vérifier sur le web</a>
                        </div>`
                      : ""
                  }
                </div>
              `;
              },
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function topPicksView(picks) {
    if (!picks.length) {
      return `
        <section class="top-picks empty-top">
          <div class="section-title"><h2>Top 3</h2></div>
          <p>Ajoute au moins une annonce pour obtenir tes priorités.</p>
        </section>
      `;
    }

    return `
      <section class="top-picks">
        <div class="section-title"><h2>Top 3</h2></div>
        <div class="top-pick-list">
          ${picks
            .map(
              ({ kind, reason, item }, index) => `
                <button class="top-pick-card" data-action="select" data-id="${item.job.id}">
                  <span class="top-pick-rank">Top ${index + 1}</span>
                  <strong>${escapeHtml(kind)}</strong>
                  <span>${escapeHtml(item.analysis.normalizedTitle)}</span>
                  <small>${escapeHtml(reason)}</small>
                  <em>${item.analysis.scores.global}/100 · ${escapeHtml(compactSalaryLabel(item.analysis))}</em>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function top3AiComparisonView(comparison) {
    if (!comparison) return "";
    return `
      <section class="top3-ai-comparison">
        <div class="section-title"><h2>Comparaison IA du Top 3</h2></div>
        <div class="top3-ai-grid">
          <div><strong>Pourquoi #1</strong><p>${escapeHtml(comparison.whyFirst || "À confirmer après lecture des offres.")}</p></div>
          <div><strong>Plus risquée</strong><p>${escapeHtml(comparison.riskierOffer || "Aucun risque clairement prioritaire.")}</p></div>
          <div><strong>Appeler en premier</strong><p>${escapeHtml(comparison.callFirst || "Commencer par l'offre la plus claire.")}</p></div>
        </div>
        ${comparison.actionSummary ? `<p class="top3-ai-action">${escapeHtml(comparison.actionSummary)}</p>` : ""}
      </section>
    `;
  }

  function terrainQuickReview(job, analysis) {
    const review = normalizeExpectedReview(job);
    const terrainStatus = terrainValidationStatus({ job, analysis });
    return `
      <section class="terrain-quick-review">
        <div class="section-title">
          <h3>Annotation terrain</h3>
          <button class="ghost-button compact" data-action="prefill-terrain-review" data-id="${escapeHtml(job.id)}">
            Préremplir avec infos extraites
          </button>
        </div>

        <div class="terrain-review-status">
          <span class="terrain-status-pill ${escapeHtml(terrainStatus.tone)}">${escapeHtml(terrainStatus.label)}</span>
          <small>${escapeHtml(terrainStatus.message)}</small>
        </div>

        <div class="terrain-review-grid terrain-review-main">
          <label>
            Verdict attendu
            <select data-expected="verdict" data-id="${escapeHtml(job.id)}">
              ${["", "prioritaire", "à creuser", "piège", "hors trajectoire"]
                .map((value) => `<option value="${escapeHtml(value)}" ${review.expectedVerdict === value ? "selected" : ""}>${escapeHtml(value || "Non noté")}</option>`)
                .join("")}
            </select>
          </label>
        </div>

        <div class="validation-tags compact-tags">
          ${validationTags
            .map(
              (tag) => `
                <label class="tag-check">
                  <input data-expected="tag" data-id="${escapeHtml(job.id)}" value="${escapeHtml(tag)}" type="checkbox" ${review.expectedTags.includes(tag) ? "checked" : ""} />
                  ${escapeHtml(tag)}
                </label>
              `,
            )
            .join("")}
        </div>

        <label class="terrain-notes-field">
          Notes terrain
          <input data-expected="notes" data-id="${escapeHtml(job.id)}" value="${escapeHtml(review.notes || "")}" placeholder="Pourquoi tu gardes, ignores ou questionnes cette offre ?" />
        </label>

        <details class="validation-extraction">
          <summary>Champs attendus</summary>
          <div class="validation-extraction-grid">
            ${expectedExtractionInputs
              .map(
                ([field, label, placeholder]) => `
                  <label>
                    ${escapeHtml(label)}
                    <input data-expected="extraction" data-field="${escapeHtml(field)}" data-id="${escapeHtml(job.id)}" value="${escapeHtml((review.expectedExtraction && review.expectedExtraction[field]) || "")}" placeholder="${escapeHtml(placeholder)}" />
                  </label>
                `,
              )
              .join("")}
          </div>
        </details>
      </section>
    `;
  }

  function employerRankingView(ranking) {
    if (!ranking && loadingAction !== "rank-employers") return "";
    const winner = ranking && ranking.items && ranking.items[0];
    return `
      <section class="employer-ranking">
        <div class="section-title">
          <h2>Meilleur employeur</h2>
          ${
            ranking
              ? infoChip(
                  "span",
                  `confidence-chip ${escapeHtml(ranking.status)}`,
                  ranking.status === "done" ? "note trouvée" : "à vérifier",
                  ranking.status === "done" ? "Une note employeur publique a été trouvée automatiquement." : "La note employeur reste à vérifier manuellement.",
                )
              : ""
          }
        </div>
        ${loadingAction === "rank-employers" ? `<p class="ai-progress">Comparaison employeurs en cours...</p>` : ""}
        ${
          winner
            ? `
              <div class="employer-winner">
                <div>
                  <span class="top-pick-rank">#1</span>
                  <strong>${escapeHtml(winner.company)}</strong>
                  <p>${escapeHtml(winner.bestTitle)}</p>
                </div>
                ${infoChip("span", scoreClass(winner.score), String(winner.score), "Score employeur calculé depuis salaire estimé, avantages, note publique et meilleure offre détectée.")}
              </div>
              <div class="employer-winner-metrics" aria-label="Pourquoi cet employeur ressort">
                <span><strong>${escapeHtml(winner.salaryLabel)}</strong><small>Salaire</small></span>
                <span><strong>${escapeHtml(winner.benefits.length ? winner.benefits.slice(0, 3).join(", ") : "Avantages à vérifier")}</strong><small>Avantages</small></span>
                <span><strong>${escapeHtml(winner.rating.score !== null ? winner.rating.label : "À vérifier")}</strong><small>Note employeur</small></span>
              </div>
              <div class="employer-ranking-list">
                ${ranking.items
                  .slice(0, 5)
                  .map(
                    (item) => `
                      <button class="employer-ranking-row" data-action="select" data-id="${escapeHtml(item.bestJobId)}">
                        <span><strong>${escapeHtml(item.company)}</strong><small>${escapeHtml(item.companyType)} · ${item.offerCount} offre${item.offerCount > 1 ? "s" : ""}</small></span>
                        <span>${escapeHtml(item.salaryLabel)}</span>
                        <span>${item.benefitsCount} avantage${item.benefitsCount > 1 ? "s" : ""}</span>
                        <span>${escapeHtml(item.rating.label)}</span>
                        <b class="${scoreClass(item.score)}">${item.score}</b>
                      </button>
                    `,
                  )
                  .join("")}
              </div>
              <p class="helper-text">${escapeHtml(winner.reasons.join(" · "))}
                ${winner.warnings.length ? ` · ${escapeHtml(winner.warnings.join(" · "))}` : ""}
              </p>
              ${winner.rating.sourceUrl ? `<a class="company-search-link" href="${escapeHtml(winner.rating.sourceUrl)}" target="_blank" rel="noopener noreferrer">vérifier la note employeur</a>` : ""}
            `
            : `<p class="helper-text">${escapeHtml((ranking && ranking.message) || "Analyse employeur en cours.")}</p>`
        }
      </section>
    `;
  }

  function terrainPanel(analyses) {
    const report = buildTerrainReport(analyses);
    const action = buildTerrainActionPlan(analyses);
    const queues = terrainQueueRows(analyses);
    const blockers = buildTerrainBlockers(analyses);
    const queueView = (title, rows, empty) => `
      <div class="terrain-queue">
        <strong>${escapeHtml(title)}</strong>
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
                    <button class="terrain-queue-row" data-action="select" data-id="${escapeHtml(row.id)}">
                      <span class="${scoreClass(row.score)}">${row.score}</span>
                      <span>
                        <b>${escapeHtml(row.title)}</b>
                        <small>${escapeHtml(row.meta)}</small>
                        <em>${escapeHtml(row.reason)}</em>
                      </span>
                    </button>
                  `,
                )
                .join("")
            : `<p>${escapeHtml(empty)}</p>`
        }
      </div>
    `;
    const correctionRows = queues.correctionRows.slice(0, 5).map(({ item, reasons }) => ({
      id: item.job.id,
      title: item.analysis.normalizedTitle,
      meta: `${item.analysis.company} · ${item.analysis.location}`,
      score: item.analysis.scores.global,
      reason: reasons.join(" · "),
    }));
    const annotationRows = queues.annotationRows.slice(0, 5).map(({ job, analysis }) => ({
      id: job.id,
      title: analysis.normalizedTitle,
      meta: `${analysis.company} · ${analysis.location}`,
      score: analysis.scores.global,
      reason: "Verdict, tags ou notes à compléter",
    }));
    const readyRows = queues.readyRows.slice(0, 5).map(({ job, analysis }) => ({
      id: job.id,
      title: analysis.normalizedTitle,
      meta: `${analysis.company} · ${reviewStatusLabel(normalizeReviewStatus(job))}`,
      score: analysis.scores.global,
      reason: "Triée, annotée et extraction exploitable",
    }));
    return `
      <section class="terrain-panel">
        <div class="section-title">
          <h2>Terrain V1</h2>
          ${infoChip("span", "confidence-chip done", "objectif 20 annonces réelles annotées", "Objectif terrain : obtenir un jeu de 20 annonces réelles annotées avant d'ajuster le scoring.")}
        </div>
        <div class="terrain-progress">
          <div><strong>${report.annotatedCount}/${report.target}</strong><span>annonces annotées</span></div>
          <progress max="${report.target}" value="${Math.min(report.annotatedCount, report.target)}"></progress>
          <small>${report.progress}% du jeu terrain</small>
        </div>
        <div class="terrain-next-action ${escapeHtml(action.tone)}">
          <div>
            <span>Prochaine action</span>
            <strong>${escapeHtml(action.title)}</strong>
            <p>${escapeHtml(action.message)}</p>
          </div>
          ${action.nextId ? `<button class="ghost-button compact" data-action="select" data-id="${escapeHtml(action.nextId)}">Ouvrir la prochaine annonce terrain</button>` : ""}
        </div>
        <div class="terrain-blockers ${blockers.readyForScoring ? "ready" : ""}">
          <strong>Ce qui bloque la calibration</strong>
          <div>
            ${
              blockers.blockers.length
                ? blockers.blockers
                    .slice(0, 7)
                    .map((blocker) => `<span class="terrain-blocker ${escapeHtml(blocker.tone)}">${escapeHtml(blocker.label)} <b>${blocker.count}</b></span>`)
                    .join("")
                : `<span class="terrain-blocker ready">aucun blocage</span>`
            }
          </div>
          <p>${escapeHtml(blockers.recommendation)}</p>
        </div>
        <div class="terrain-stats">
          <div><strong>${report.realCount}</strong><span>réelles</span></div>
          <div><strong>${report.correctedCount}</strong><span>corrigées</span></div>
          <div><strong>${report.favoriteCount}</strong><span>favoris</span></div>
          <div><strong>${report.exploreCount}</strong><span>à creuser</span></div>
          <div><strong>${report.ignoredCount}</strong><span>ignorées</span></div>
        </div>
        <div class="terrain-queue-grid">
          ${queueView("À corriger", correctionRows, "Aucune correction prioritaire.")}
          ${queueView("À annoter", annotationRows, "Toutes les offres réelles sont annotées.")}
          ${queueView("Prêtes scoring", readyRows, "Pas encore d’offre prête scoring.")}
        </div>
        <div class="terrain-workflow">
          <span>Rechercher</span>
          <span>Corriger infos extraites</span>
          <span>Trier</span>
          <span>Annoter</span>
          <span>Exporter JSON</span>
        </div>
        <div class="terrain-source-list">
          ${
            report.sourceRows.length
              ? report.sourceRows
                  .map(
                    (source) => `
                      <div class="terrain-source-row">
                        <strong>${escapeHtml(source.source)}</strong>
                        <span>${source.total} offre${source.total > 1 ? "s" : ""}</span>
                        <span>${source.annotated} annotée${source.annotated > 1 ? "s" : ""}</span>
                        <span>${source.favorite} favori · ${source.explore} à creuser · ${source.ignored} ignorée${source.ignored > 1 ? "s" : ""}</span>
                        <small>${escapeHtml(source.qualityCounts.map(([label, count]) => `${label} ${count}`).join(" · ") || "qualité à vérifier")} · ${escapeHtml(source.message)}</small>
                      </div>
                    `,
                  )
                  .join("")
              : `<p class="helper-text">Aucune annonce réelle collectée pour l’instant.</p>`
          }
        </div>
        <div class="button-row">
          <button class="ghost-button compact ${buttonLoadingClass("copy-terrain-report")}" data-action="copy-terrain-report">
            ${buttonSpinner("copy-terrain-report")}
            Copier rapport terrain Markdown
          </button>
        </div>
      </section>
    `;
  }

  function validationPanel(analyses) {
    const summary = validationSummary(analyses);
    const calibration = buildCalibrationReport(analyses);
    const validationItems = analyses.slice().sort((a, b) => {
      const priority = (item) => {
        if (isRealWorldJob(item.job) && !isAnnotatedJob(item.job)) return 0;
        if (isRealWorldJob(item.job)) return 1;
        return 2;
      };
      return priority(a) - priority(b) || b.analysis.scores.global - a.analysis.scores.global;
    });

    if (!analyses.length) {
      return `
        <section class="validation-panel">
          <div class="section-title">
            <h2>Validation</h2>
            <button class="ghost-button compact" data-action="load-extraction-tests">Charger tests extraction</button>
          </div>
          <p class="helper-text">Charge des exemples ou colle de vraies annonces pour commencer le banc de test.</p>
        </section>
      `;
    }

    return `
      <section class="validation-panel">
        <div class="section-title">
          <h2>Validation réelle</h2>
          <button class="ghost-button compact" data-action="load-extraction-tests">Charger tests extraction</button>
        </div>
        <div class="validation-stats">
          <div><strong>${summary.reviewed.length}</strong><span>annotées</span></div>
          <div><strong>${summary.verdictCount ? `${summary.verdictMatches}/${summary.verdictCount}` : "-"}</strong><span>verdicts OK</span></div>
          <div><strong>${summary.missedCount}</strong><span>tags manqués</span></div>
          <div><strong>${summary.extraCount}</strong><span>faux positifs</span></div>
          <div><strong>${summary.warnings.length}</strong><span>scores fragiles</span></div>
        </div>

        ${calibrationReportView(calibration)}

        ${
          summary.rulesToAdjust.length
            ? `<div class="rules-box"><strong>Règles à ajuster</strong><ul>${summary.rulesToAdjust
                .map((rule) => `<li>${escapeHtml(rule)}</li>`)
                .join("")}</ul></div>`
            : `<p class="helper-text">Aucune règle évidente à ajuster pour l’instant.</p>`
        }

        <div class="validation-list">
          ${validationItems
            .map(({ job, analysis }) => {
              const review = normalizeExpectedReview(job);
              const comparison = compareValidation(analysis, review);
              return `
                <article class="validation-card">
                  <div class="validation-card-head">
                    <button class="text-button" data-action="select" data-id="${job.id}">
                      ${escapeHtml(analysis.normalizedTitle)}
                    </button>
                    <span class="${comparison.match ? "validation-ok" : "validation-ko"}">
                      ${comparison.match ? "OK" : "À revoir"}
                    </span>
                  </div>

                  <label>
                    Verdict attendu
                    <select data-expected="verdict" data-id="${job.id}">
                      ${["", "prioritaire", "à creuser", "piège", "hors trajectoire"]
                        .map((value) => `<option value="${value}" ${review.expectedVerdict === value ? "selected" : ""}>${value || "Non noté"}</option>`)
                        .join("")}
                    </select>
                  </label>

                  <div class="validation-tags">
                    ${validationTags
                      .map(
                        (tag) => `
                          <label class="tag-check">
                            <input data-expected="tag" data-id="${job.id}" value="${tag}" type="checkbox" ${review.expectedTags.includes(tag) ? "checked" : ""} />
                            ${tag}
                          </label>
                        `,
                      )
                      .join("")}
                  </div>

                  <label>
                    Notes
                    <textarea data-expected="notes" data-id="${job.id}" rows="2" placeholder="Pourquoi tu attendais ce verdict ?">${escapeHtml(review.notes || "")}</textarea>
                  </label>

                  <details class="validation-extraction">
                    <summary>Champs attendus</summary>
                    <div class="validation-extraction-grid">
                      ${expectedExtractionInputs
                        .map(
                          ([field, label, placeholder]) => `
                            <label>
                              ${escapeHtml(label)}
                              <input data-expected="extraction" data-field="${field}" data-id="${job.id}" value="${escapeHtml((review.expectedExtraction && review.expectedExtraction[field]) || "")}" placeholder="${escapeHtml(placeholder)}" />
                            </label>
                          `,
                        )
                        .join("")}
                    </div>
                  </details>

                  <div class="validation-result">
                    <span>Détecté : ${comparison.detectedTags.length ? comparison.detectedTags.map(escapeHtml).join(", ") : "rien"}</span>
                    <span>Verdict Taf : ${escapeHtml(comparison.actualVerdict)}</span>
                    ${
                      comparison.missedTags.length
                        ? `<span class="negative-text">Manqués : ${comparison.missedTags.map(escapeHtml).join(", ")}</span>`
                        : ""
                    }
                    ${
                      comparison.extraTags.length
                        ? `<span class="muted">En plus : ${comparison.extraTags.map(escapeHtml).join(", ")}</span>`
                        : ""
                    }
                    ${
                      comparison.missedExtractionFields.length
                        ? `<span class="negative-text">Champs faux : ${comparison.missedExtractionFields.map(escapeHtml).join(", ")}</span>`
                        : ""
                    }
                    ${comparison.scoreWarning ? `<span class="negative-text">${escapeHtml(comparison.scoreWarning)}</span>` : ""}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function calibrationTagList(title, items, empty) {
    return `
      <div class="calibration-list">
        <strong>${escapeHtml(title)}</strong>
        ${
          items.length
            ? items
                .slice(0, 5)
                .map(([tag, count]) => `<span>${escapeHtml(tag)} <b>${count}</b></span>`)
                .join("")
            : `<em>${escapeHtml(empty)}</em>`
        }
      </div>
    `;
  }

  function calibrationLabelList(title, items, empty) {
    return `
      <div class="calibration-list">
        <strong>${escapeHtml(title)}</strong>
        ${
          items.length
            ? items
                .slice(0, 5)
                .map(([label, count]) => `<span>${escapeHtml(label)} <b>${count}</b></span>`)
                .join("")
            : `<em>${escapeHtml(empty)}</em>`
        }
      </div>
    `;
  }

  function calibrationReportView(report) {
    const problemOffers = report.reviewed.filter(
      (item) =>
        !item.comparison.match ||
        item.comparison.missedTags.length ||
        item.comparison.extraTags.length ||
        item.comparison.missedExtractionFields.length ||
        item.comparison.scoreWarning,
    );

    if (!report.reviewedCount) {
      return `
        <div class="calibration-box">
          <div class="section-title"><h3>Calibration scoring</h3></div>
          <p class="helper-text">Annote quelques offres avec un verdict attendu et des tags pour voir les erreurs récurrentes.</p>
        </div>
      `;
    }

    return `
      <div class="calibration-box">
        <div class="section-title"><h3>Calibration scoring</h3></div>
        <div class="calibration-grid">
          <div><strong>${report.reviewedCount}</strong><span>annotées</span></div>
          <div><strong>${report.verdictMatchRate !== null ? `${report.verdictMatchRate}%` : "-"}</strong><span>verdicts alignés</span></div>
          <div><strong>${report.overratedOffers.length}</strong><span>surcotées</span></div>
          <div><strong>${report.underratedOffers.length}</strong><span>sous-cotées</span></div>
          <div><strong>${report.extractionCheckCount ? `${report.extractionMatchCount}/${report.extractionCheckCount}` : "-"}</strong><span>champs OK</span></div>
          <div><strong>${report.genericTitleMisses}</strong><span>titres génériques</span></div>
        </div>
        <div class="calibration-columns">
          ${calibrationTagList("Tags manqués", report.missedTagCounts, "Aucun tag manqué.")}
          ${calibrationTagList("Faux positifs", report.extraTagCounts, "Aucun faux positif.")}
          ${calibrationLabelList("Champs manqués", report.extractionMissCounts, "Aucun champ manqué.")}
          ${calibrationLabelList("Sources fragiles", report.fragileSources, "Aucune source fragile.")}
        </div>
        ${
          report.priorityRules.length
            ? `<div class="rules-box"><strong>Recommandations de règles</strong><ul>${report.priorityRules
                .map((rule) => `<li>${escapeHtml(rule)}</li>`)
                .join("")}</ul></div>`
            : ""
        }
        ${
          problemOffers.length
            ? `<div class="calibration-offers"><strong>Offres à revoir</strong>${problemOffers
                .slice(0, 6)
                .map(
                  ({ job, analysis, review, comparison }) => `
                    <button class="calibration-offer" data-action="select" data-id="${job.id}">
                      <span>${escapeHtml(analysis.normalizedTitle)}</span>
                      <small>Attendu : ${escapeHtml(review.expectedVerdict || "non noté")} · Taf : ${escapeHtml(comparison.actualVerdict)}${
                        comparison.missedTags.length ? ` · manqués : ${escapeHtml(comparison.missedTags.join(", "))}` : ""
                      }${comparison.extraTags.length ? ` · en trop : ${escapeHtml(comparison.extraTags.join(", "))}` : ""}${
                        comparison.missedExtractionFields.length ? ` · champs : ${escapeHtml(comparison.missedExtractionFields.join(", "))}` : ""
                      }${
                        comparison.scoreWarning ? ` · ${escapeHtml(comparison.scoreWarning)}` : ""
                      }</small>
                    </button>
                  `,
                )
                .join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  function collectionPanel(analyses) {
    const plan = generateSearchQueries();
    const realJobs = analyses.filter(({ job }) => (job.datasetLabel || "jeu réel") === "jeu réel");
    const bySource = realJobs.reduce((acc, { job }) => {
      const source = job.source || "Source inconnue";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return `
      <section class="collection-panel">
        <div class="section-title"><h2>Collecte réelle</h2></div>
        <div class="collection-progress">
          <div>
            <strong>${realJobs.length}/${collectionTarget}</strong>
            <span>annonces collectées</span>
          </div>
          <progress max="${collectionTarget}" value="${Math.min(realJobs.length, collectionTarget)}"></progress>
        </div>

        <div class="button-row">
          <button class="ghost-button compact ${buttonLoadingClass("copy-keywords")}" data-action="copy-keywords">${buttonSpinner("copy-keywords")}Copier mots-clés</button>
          <button class="ghost-button compact ${buttonLoadingClass("copy-checklist")}" data-action="copy-checklist">${buttonSpinner("copy-checklist")}Copier checklist</button>
        </div>

        <div class="keyword-cloud">
          ${plan.keywords.map((keyword) => `<button class="keyword-pill" data-action="copy-keyword" data-keyword="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>`).join("")}
        </div>

        <details class="search-links" open>
          <summary>Liens de recherche prêts à ouvrir</summary>
          <div class="search-link-list">
            ${plan.links
              .slice(0, 24)
              .map(
                (link) => `
                  <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" data-source-link="${escapeHtml(link.source)}">
                    <span>${escapeHtml(link.source)}</span>
                    ${escapeHtml(link.label.replace(` · ${link.source}`, ""))}
                  </a>
                `,
              )
              .join("")}
          </div>
        </details>

        <div class="source-summary">
          ${
            Object.keys(bySource).length
              ? Object.entries(bySource)
                  .map(([source, count]) => `<span>${escapeHtml(source)} : ${count}</span>`)
                  .join("")
              : `<span>Aucune annonce réelle collectée pour l’instant.</span>`
          }
        </div>
      </section>
    `;
  }

  function backupPanel() {
    return `
      <section class="backup-panel">
        <div class="section-title"><h2>Sauvegarde locale</h2></div>
        <p class="helper-text">Exporte ou restaure toutes tes annonces, réglages, favoris, ignorées et validations.</p>
        <div class="button-row">
          <button class="ghost-button ${buttonLoadingClass("export-backup")}" data-action="export-backup">${buttonSpinner("export-backup")}Exporter JSON</button>
          <button class="ghost-button ${buttonLoadingClass("import-backup")}" data-action="import-backup">${buttonSpinner("import-backup")}Importer JSON</button>
        </div>
        <input id="backup-input" class="backup-file-input" type="file" accept="application/json,.json" />
      </section>
    `;
  }

  function searchSessionView(plan) {
    if (!lastSearchSession) return "";
    const ignoredCount = sessionIgnoredCount();
    return `
      <div class="search-compact-metrics" aria-label="Résumé de la dernière recherche">
        <span><strong>${lastSearchSession.importedCount}</strong> nouvelles</span>
        <span><strong>${lastSearchSession.duplicateCount}</strong> doublons</span>
        <span><strong>${ignoredCount}</strong> ignorées</span>
        <span><strong>${lastSearchSession.skippedCount}</strong> trop pauvres</span>
        <span class="search-query-chip">${escapeHtml(lastSearchSession.keywords)}${lastSearchSession.location ? ` · ${escapeHtml(lastSearchSession.location)}` : " · France entière"}</span>
      </div>
    `;
  }

  function sourceReportSummary(reports) {
    const useful = reports.filter((report) => Number(report.count || 0) > 0);
    const blocked = reports.filter((report) => report.status === "blocked");
    const skipped = reports.reduce((total, report) => total + Number(report.skippedCount || 0), 0);
    const missingLinks = reports.reduce((total, report) => total + Number(report.missingDetailCount || 0), 0);
    const poor = reports.reduce((total, report) => total + Number(report.poorQualityCount || 0), 0);
    const required = reports.reduce((total, report) => total + Number(report.requiredFilterCount || 0), 0);
    return {
      usefulCount: useful.length,
      usefulNames: useful.map((report) => report.source).slice(0, 4).join(", "),
      blockedCount: blocked.length,
      skipped,
      missingLinks,
      poor,
      required,
    };
  }

  function importQualitySummary(session) {
    const reports = session && Array.isArray(session.sourceReports) ? session.sourceReports : [];
    const noisySources = reports
      .filter((report) => Number(report.skippedCount || 0) > 0 || Number(report.poorQualityCount || 0) > 0 || Number(report.missingDetailCount || 0) > 0)
      .sort((a, b) =>
        (Number(b.skippedCount || 0) + Number(b.poorQualityCount || 0) + Number(b.missingDetailCount || 0)) -
        (Number(a.skippedCount || 0) + Number(a.poorQualityCount || 0) + Number(a.missingDetailCount || 0)),
      )
      .slice(0, 3)
      .map((report) => report.source);
    return {
      imported: session ? Number(session.importedCount || 0) : 0,
      duplicates: session ? Number(session.duplicateCount || 0) : 0,
      skipped: session ? Number(session.skippedCount || 0) : 0,
      missingLinks: reports.reduce((total, report) => total + Number(report.missingDetailCount || 0), 0),
      poor: reports.reduce((total, report) => total + Number(report.poorQualityCount || 0), 0),
      required: reports.reduce((total, report) => total + Number(report.requiredFilterCount || 0), 0),
      noisySources,
    };
  }

  function sourceHealthCompact(stats, options = {}) {
    const records = sourceHealthRecords(stats);
    if (!records.length) return "";
    const summary = sourceHealthSummary(stats);
    const advice = sourceHealthAdvice(stats);
    const hasEnoughHistory = sourceHealthHasEnoughHistory(records);
    if (!hasEnoughHistory) return "";
    const debugHtml = uiState.showDebugInfo
      ? `<div class="search-debug-details">
          <strong>Détails qualité sources</strong>
          <div class="source-health-debug-list">
            ${records.map((record) => `
              <span title="${escapeHtml(record.lastMessage)}">
                ${escapeHtml(record.source)} · ${record.importedCount} importées · ${record.skippedCount} écartées · ${record.blockedCount} blocages
              </span>
            `).join("")}
          </div>
        </div>`
      : "";

    if (options.embedded) {
      return `
        <div class="source-health-compact embedded-source-health">
          <div class="source-health-title">
            <span class="collapsible-title">
              <strong>Qualité des sources</strong>
              <em>${records.length} sources suivies</em>
            </span>
            <span class="source-health-summary">
              ${summary.useful.length} utiles · ${summary.watch.length} en observation · ${summary.blocked.length} échecs
            </span>
          </div>
          <div class="source-health-pill-row">
            ${infoChip("span", "source-health-pill useful", `Utiles : ${escapeHtml(sourceNames(summary.useful))}`, sourceHealthTooltip("useful"))}
            ${infoChip("span", "source-health-pill watch", `En observation : ${escapeHtml(sourceNames(summary.watch))}`, sourceHealthTooltip("watch"))}
            ${infoChip("span", "source-health-pill blocked", `Échecs répétés : ${escapeHtml(sourceNames(summary.blocked))}`, sourceHealthTooltip("blocked"))}
          </div>
          ${advice ? `<p class="helper-text">${escapeHtml(advice)}</p>` : ""}
          ${debugHtml}
        </div>
      `;
    }

    return `
      <details class="source-health-compact collapsible-panel">
        <summary class="collapsible-summary source-health-title">
          <span class="collapsible-title">
            <strong>Qualité des sources</strong>
            <em>${records.length} sources suivies</em>
          </span>
          <span class="source-health-summary">
            ${summary.useful.length} utiles · ${summary.watch.length} en observation · ${summary.blocked.length} échecs
          </span>
        </summary>
        <div class="collapsible-content">
          <div class="source-health-pill-row">
            ${infoChip("span", "source-health-pill useful", `Utiles : ${escapeHtml(sourceNames(summary.useful))}`, sourceHealthTooltip("useful"))}
            ${infoChip("span", "source-health-pill watch", `En observation : ${escapeHtml(sourceNames(summary.watch))}`, sourceHealthTooltip("watch"))}
            ${infoChip("span", "source-health-pill blocked", `Échecs répétés : ${escapeHtml(sourceNames(summary.blocked))}`, sourceHealthTooltip("blocked"))}
          </div>
          ${advice ? `<p class="helper-text">${escapeHtml(advice)}</p>` : ""}
          ${debugHtml}
        </div>
      </details>
    `;
  }

  function sourceHealthPanel(stats) {
    const records = sourceHealthRecords(stats);
    const rows = records.map((record) => `
      <div class="source-health-row ${sourceHealthKind(record)}">
        <span><strong>${escapeHtml(record.source)}</strong><small>${escapeHtml(record.lastMessage || "À vérifier")}</small></span>
        <span>${sourceUsefulRate(record)}/rech.</span>
        <span>${record.importedCount}</span>
        <span>${record.skippedCount}</span>
        <span>${record.blockedCount}</span>
        <span>${escapeHtml(formatSessionDate(record.lastSearchedAt))}</span>
        ${
          uiState.showDebugInfo
            ? `<small class="source-health-debug">trouvées ${record.foundCount} · liens détail ${record.detailLinkCount} · sans lien ${record.missingDetailCount} · pauvres ${record.poorQualityCount} · qualité ${sourceQualityAverage(record) || "n/a"}</small>`
            : ""
        }
      </div>
    `).join("");

    return `
      <section class="source-health-panel">
        <div class="section-title">
          <h2>Sources</h2>
          <button class="ghost-button compact" data-action="reset-source-health" ${records.length ? "" : "disabled"}>Réinitialiser stats sources</button>
        </div>
        ${networkDiagnosticsCard(networkDiagnostics, { showDetails: uiState.showDebugInfo || Boolean(networkDiagnostics) })}
        ${
          records.length
            ? `<div class="source-health-table">
                <div class="source-health-row header">
                  <span>Source</span>
                  <span>Taux utile</span>
                  <span>Importées</span>
                  <span>Bruit</span>
                  <span>Blocages</span>
                  <span>Dernière recherche</span>
                </div>
                ${rows}
              </div>`
            : `<p class="helper-text">Lance une recherche pour commencer à mesurer les sources utiles et les sources fragiles.</p>`
        }
      </section>
    `;
  }

  function decisionSummaryView(analyses) {
    if (!analyses.length) return "";
    const summary = buildDecisionSummary(analyses);
    const reasons = summary.topReasons.length
      ? summary.topReasons.map(([reason, count]) => `<span>${escapeHtml(reason)} <strong>${count}</strong></span>`).join("")
      : `<span>Aucun écart récurrent détecté.</span>`;

    return `
      <details class="decision-summary-card compact-decision-summary collapsible-panel">
        <summary class="collapsible-summary decision-summary-collapsed">
          <span class="collapsible-title">
            <strong>Bilan décisionnel</strong>
            <em>${strategy.hideWeakOffers ? "bruit masqué" : "tout affiché"}</em>
          </span>
          <span class="decision-summary-line">
            <span class="fit-match"><strong>${summary.match}</strong> dans les critères</span>
            <span class="fit-review"><strong>${summary.review}</strong> à creuser</span>
            <span class="fit-weak"><strong>${summary.hiddenWeak}</strong> faibles masquées</span>
          </span>
        </summary>
        <div class="decision-reasons collapsible-content">${reasons}</div>
      </details>
    `;
  }

  function simpleSearchPanel(analyses) {
    const plan = generateSearchQueries();
    const top3AiCandidates = automaticAiCandidates(jobs);
    const aiButtonDisabled = !uiState.searchReady || !top3AiCandidates.length || loadingAction === "run-search";
    const employerCount = new Set(
      analyses
        .filter(({ job }) => !job.ignored)
        .map(({ analysis }) => analysis.company)
        .filter((company) => !company.toLowerCase().includes("non précisée")),
    ).size;
    const aiButtonTitle = !uiState.searchReady
      ? "Lance d'abord une recherche pour constituer le Top 3."
      : !top3AiCandidates.length
        ? "Aucune offre exploitable à analyser dans le Top 3."
        : "Analyse le Top 3 en un seul appel groupé.";
    const activeProfile = getActiveProfile();
    const criteriaOpen = simpleCriteriaOpen || !uiState.searchReady;
    const experienceLabel = ({
      debutant_reconversion: "Débutant / reconversion",
      junior: "Junior",
      confirme: "Confirmé",
      indifferent: "Indifférent",
    })[strategy.experienceLevel] || "Débutant / reconversion";
    const contractLabel = ({
      any: "Peu importe",
      cdi: "CDI",
      cdd: "CDD",
      alternance: "Alternance",
    })[strategy.contractPreference] || "Peu importe";
    const strictFilters = [
      strategy.poeiRequirement === "required" ? "POEI obligatoire" : "",
      strategy.auditRequirement === "required" ? `${activeProfile.ui.strategicRequirementLabel} obligatoire` : "",
      strategy.independentRequirement === "required" ? "Indépendant refusé" : "",
      strategy.hideWeakOffers !== false ? "Faibles masquées" : "",
    ].filter(Boolean);
    const reports = lastSearchSession && lastSearchSession.sourceReports ? lastSearchSession.sourceReports : [];
    const sourceSummary = sourceReportSummary(reports);
    const importQuality = importQualitySummary(lastSearchSession);
    const decisionSummary = buildDecisionSummary(analyses);
    const hasDecisionSummary = decisionSummary.match + decisionSummary.review + decisionSummary.weak > 0;
    const terrainReport = buildTerrainReport(analyses);
    const terrainQueues = terrainQueueRows(analyses);
    const terrainReminderVisible = uiState.searchReady && terrainReport.realCount > 0;
    const sourceRecords = sourceHealthRecords(sourceHealthStats);
    const hasSearchDetails =
      searchResult.networkStatus !== "blocked" &&
      (sourceRecords.length > 0 || hasDecisionSummary || (uiState.showDebugInfo && reports.length > 0));
    const sourceReportHtml = reports.length
      ? `<div class="source-report-list">${reports
          .map((report) => {
            const statusClass = report.count > 0 ? "ok" : report.status === "blocked" ? "blocked" : "empty";
            const skipped = report.skippedCount ? ` · ${report.skippedCount} écartée${report.skippedCount > 1 ? "s" : ""}` : "";
            const debugCounts = [
              report.foundCount ? `${report.foundCount} trouvée${report.foundCount > 1 ? "s" : ""}` : "",
              report.detailLinkCount ? `${report.detailLinkCount} liens détail` : "",
              report.missingDetailCount ? `${report.missingDetailCount} sans lien` : "",
              report.poorQualityCount ? `${report.poorQualityCount} pauvres` : "",
            ].filter(Boolean).join(" · ");
            return `<span class="source-report ${statusClass}" title="${escapeHtml(report.message)}">${escapeHtml(report.source)} : ${report.count}${skipped}${debugCounts ? ` · ${escapeHtml(debugCounts)}` : ""}</span>`;
          })
          .join("")}</div>`
      : "";
    const detailsSummary = reports.length
      ? `${sourceSummary.usefulCount} sources utiles · ${sourceSummary.skipped} écartées`
      : "Sources et bilan décisionnel";
    const decisionReasons = decisionSummary.topReasons.length
      ? decisionSummary.topReasons.map(([reason, count]) => `<span>${escapeHtml(reason)} <strong>${count}</strong></span>`).join("")
      : `<span>Aucun écart récurrent détecté.</span>`;
    const searchDetailsHtml = hasSearchDetails
      ? `<details class="search-details-panel collapsible-panel">
          <summary class="collapsible-summary search-details-summary">
            <span class="collapsible-title">
              <strong>Détails de recherche</strong>
              <em>${escapeHtml(detailsSummary)}</em>
            </span>
          </summary>
          <div class="search-details-content collapsible-content">
            ${
              lastSearchSession
                ? `<div class="import-quality-card">
                    <strong>Qualité import</strong>
                    <div class="import-quality-grid">
                      <span><b>${importQuality.imported}</b> importées</span>
                      <span><b>${importQuality.duplicates}</b> doublons</span>
                      <span><b>${importQuality.skipped}</b> écartées</span>
                      <span><b>${importQuality.poor}</b> trop pauvres</span>
                      <span><b>${importQuality.missingLinks}</b> sans lien annonce</span>
                      <span><b>${importQuality.required}</b> hors critères obligatoires</span>
                    </div>
                    <small>${
                      importQuality.noisySources.length
                        ? `Sources les plus bruyantes : ${escapeHtml(importQuality.noisySources.join(", "))}.`
                        : "Pas de source particulièrement bruyante sur cette recherche."
                    }</small>
                  </div>`
                : ""
            }
            ${
              reports.length
                ? `<div class="search-source-summary" aria-label="Bilan compact des sources">
                    <span><strong>${sourceSummary.usefulCount}</strong> sources utiles${sourceSummary.usefulNames ? ` · ${escapeHtml(sourceSummary.usefulNames)}` : ""}</span>
                    <span><strong>${sourceSummary.blockedCount}</strong> bloquée${sourceSummary.blockedCount > 1 ? "s" : ""}</span>
                    <span><strong>${sourceSummary.skipped}</strong> écartée${sourceSummary.skipped > 1 ? "s" : ""}</span>
                    ${sourceSummary.missingLinks > 0 ? `<span>${sourceSummary.missingLinks} sans lien détail</span>` : ""}
                    ${sourceSummary.required > 0 ? `<span>${sourceSummary.required} hors critères obligatoires</span>` : ""}
                  </div>`
                : ""
            }
            ${sourceHealthCompact(sourceHealthStats, { embedded: true })}
            ${
              hasDecisionSummary
                ? `<div class="decision-summary-card compact-decision-summary embedded-decision-summary">
                    <div class="decision-summary-collapsed">
                      <span class="collapsible-title">
                        <strong>Bilan décisionnel</strong>
                        <em>${strategy.hideWeakOffers ? "bruit masqué" : "tout affiché"}</em>
                      </span>
                      <span class="decision-summary-line">
                        <span class="fit-match"><strong>${decisionSummary.match}</strong> dans les critères</span>
                        <span class="fit-review"><strong>${decisionSummary.review}</strong> à creuser</span>
                        <span class="fit-weak"><strong>${decisionSummary.hiddenWeak}</strong> faibles masquées</span>
                      </span>
                    </div>
                    <div class="decision-reasons">${decisionReasons}</div>
                  </div>`
                : ""
            }
            ${uiState.showDebugInfo && sourceReportHtml ? `<div class="search-debug-details"><strong>Détails par source</strong>${sourceReportHtml}</div>` : ""}
          </div>
        </details>`
      : "";

    return `
      <section class="simple-search-panel ${uiState.searchReady ? "search-has-results" : ""}">
        <details class="criteria-panel" data-criteria-panel ${criteriaOpen ? "open" : ""}>
          <summary class="criteria-summary" data-action="toggle-criteria">
            <div class="criteria-summary-title">
              <strong>Recherche automatique</strong>
              <span>${criteriaOpen ? "Critères détaillés" : "Critères résumés"}</span>
            </div>
            <div class="criteria-summary-chips">
              <span>${escapeHtml(strategy.targetJob || "Métier à préciser")}</span>
              <span>${escapeHtml(strategy.location.trim() || "France entière")}</span>
              <span>${strategy.salaryMin ? `${strategy.salaryMin} € net mini` : "Salaire libre"}</span>
              <span>${escapeHtml(experienceLabel)}</span>
              <span>${escapeHtml(contractLabel)}</span>
              <span>${escapeHtml(strictFilters.length ? strictFilters.join(" · ") : "Aucun filtre strict")}</span>
            </div>
            <span class="ghost-button compact criteria-edit-button">${criteriaOpen ? "Réduire" : "Modifier"}</span>
          </summary>
          <div class="criteria-body">
        <div class="simple-search-grid">
          <div class="smart-field">
            <div class="smart-field-label">
              <strong>Métier</strong>
              <label class="smart-toggle">
                <input data-simple-strategy="smartSearch" type="checkbox" ${strategy.smartSearch !== false ? "checked" : ""} />
                <span>recherche intelligente</span>
                ${strategy.smartSearch !== false ? `<em>auto</em>` : ""}
              </label>
            </div>
            <input data-simple-strategy="targetJob" value="${escapeHtml(strategy.targetJob)}" placeholder="diagnostiqueur immobilier" />
          </div>
          <div class="smart-field">
            <div class="smart-field-label">
              <strong>Zone</strong>
              <label class="smart-toggle">
                <input data-simple-strategy="smartLocation" type="checkbox" ${strategy.smartLocation !== false ? "checked" : ""} />
                <span>zone intelligente</span>
                ${strategy.smartLocation !== false ? `<em>auto</em>` : ""}
              </label>
            </div>
            <input data-simple-strategy="location" list="zone-suggestions" value="${escapeHtml(strategy.location)}" placeholder="Toute la France" />
          </div>
          <div class="smart-field">
            <div class="smart-field-label">
              <strong>Salaire net mini</strong>
              <span class="smart-hint">mensuel</span>
            </div>
            <input data-simple-strategy="salaryMin" type="number" min="0" step="50" value="${strategy.salaryMin}" />
          </div>
          <div class="smart-field">
            <div class="smart-field-label">
              <strong>Expérience</strong>
              <span class="smart-hint">recherche</span>
            </div>
            <select data-simple-strategy="experienceLevel">
              ${[
                ["debutant_reconversion", "Débutant / reconversion"],
                ["junior", "Junior"],
                ["confirme", "Confirmé"],
                ["indifferent", "Indifférent"],
              ]
                .map(([value, label]) => `<option value="${value}" ${strategy.experienceLevel === value ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </div>
          <div class="smart-field">
            <div class="smart-field-label">
              <strong>Contrat souhaité</strong>
              <span class="smart-hint">filtre</span>
            </div>
            <select data-simple-strategy="contractPreference">
              ${[
                ["any", "Peu importe"],
                ["cdi", "CDI"],
                ["cdd", "CDD"],
                ["alternance", "Alternance"],
              ]
                .map(([value, label]) => `<option value="${value}" ${strategy.contractPreference === value ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </div>
          <div class="smart-field objective-field">
            <div class="smart-field-label">
              <strong>Objectif</strong>
              <span class="smart-hint">optionnel</span>
            </div>
            <input data-simple-strategy="objective" value="${escapeHtml(strategy.objective)}" placeholder="POEI, débutant, audit énergétique..." />
          </div>
        </div>
        <p class="helper-text">Zone vide = toute la France. La recherche intelligente teste aussi les variantes proches, sans accents et les intitulés métier voisins.</p>

        <div class="toggle-row">
          ${requirementChip("poeiRequirement", "POEI", strategy.poeiRequirement)}
          ${requirementChip("auditRequirement", activeProfile.ui.strategicRequirementLabel, strategy.auditRequirement)}
          ${requirementChip("independentRequirement", "Éviter indépendant imposé", strategy.independentRequirement)}
          <label class="toggle">
            <input data-simple-strategy="hideWeakOffers" type="checkbox" ${strategy.hideWeakOffers !== false ? "checked" : ""} />
            Masquer les offres faibles
          </label>
        </div>
          </div>
        </details>

        <div class="simple-action-row">
          <button class="primary-button one-button ${buttonLoadingClass("run-search")}" data-action="run-search">
            ${buttonSpinner("run-search")}
            ${uiState.searchReady ? "Relancer la recherche" : "Rechercher et sortir le Top 3"}
          </button>
          <button
            class="ghost-button one-button ai-one-button ${buttonLoadingClass("ai-analyze")}"
            data-action="analyze-top3-ai"
            title="${escapeHtml(aiButtonTitle)}"
            ${aiButtonDisabled ? "disabled" : ""}
          >
            ${buttonSpinner("ai-analyze")}
            Analyser le Top 3 avec IA
          </button>
          <button
            class="ghost-button one-button ${buttonLoadingClass("rank-employers")}"
            data-action="rank-employers"
            title="${employerCount ? "Compare les employeurs détectés dans les offres." : "Aucun employeur exploitable à comparer."}"
            ${employerCount === 0 || loadingAction === "run-search" ? "disabled" : ""}
          >
            ${buttonSpinner("rank-employers")}
            Meilleur employeur
          </button>
        </div>

        ${
          uiState.searchReady
            ? `<div class="search-ready search-${escapeHtml(searchResult.status)}">
                <div class="search-ready-header compact-search-header">
                  <div class="search-compact-title">
                    <strong>${
                      searchResult.networkStatus === "blocked"
                        ? "Connexion à vérifier"
                        : searchResult.status === "needsConnector"
                          ? "Recherche prête"
                          : "Recherche terminée"
                    }</strong>
                    <small>${
                      searchResult.networkStatus === "blocked"
                        ? "Sites d’emploi injoignables depuis le serveur local"
                        : searchResult.status === "needsConnector"
                        ? "Import manuel disponible"
                        : `${escapeHtml((lastSearchSession && lastSearchSession.keywords) || searchResult.sourceQuery || plan.keywords[0] || "Recherche")} · ${escapeHtml((lastSearchSession && lastSearchSession.location) || "France entière")}`
                    }</small>
                  </div>
                  <div class="search-compact-actions">
                    ${lastSearchSession ? `<span>${formatSessionDate(lastSearchSession.createdAt)}</span>` : ""}
                    ${lastSearchSession ? `<button class="ghost-button compact rerun-button ${buttonLoadingClass("run-search")}" data-action="run-search">${buttonSpinner("run-search")}Relancer</button>` : ""}
                  </div>
                </div>
                <p class="search-ready-message">${searchResult.networkStatus === "blocked" ? escapeHtml(searchResult.message) : "Résumé de la dernière recherche. Les détails restent repliés pour garder les résultats visibles."}</p>
                ${loadingAction === "ai-analyze" ? `<p class="ai-progress">Analyse intelligente en cours...</p>` : ""}
                ${searchResult.status === "needsConnector" ? `<small>Colle une annonce dans Analyse express, ou passe en mode avancé pour préparer ta collecte.</small>` : ""}
                ${searchSessionView(plan)}
                ${
                  terrainReminderVisible
                    ? `<div class="terrain-simple-reminder" aria-label="Rappel validation terrain">
                        <strong>Terrain</strong>
                        <span>${terrainReport.annotatedCount}/${terrainReport.target} annotées</span>
                        <span>${terrainQueues.correctionRows.length} à corriger</span>
                        <span>${terrainQueues.annotationRows.length} à annoter</span>
                        <span>${terrainQueues.readyRows.length} prêtes scoring</span>
                      </div>`
                    : ""
                }
                ${
                  searchResult.networkStatus === "blocked"
                    ? networkDiagnosticsCard(networkDiagnostics, { compact: true, showDetails: uiState.showDebugInfo })
                    : searchDetailsHtml
                }
              </div>`
            : `<p class="helper-text">Un clic lance la recherche locale, importe les offres lisibles et recalcule le Top 3.</p>`
        }
      </section>
    `;
  }

  function offerDetail(selected) {
    if (!selected) {
      return `
        <div class="empty-state">
          <h2>Aucune offre analysée</h2>
          <p>Colle quelques annonces ou charge les exemples pour obtenir un premier classement.</p>
        </div>
      `;
    }

    const { job, analysis } = selected;
    const reviewStatus = normalizeReviewStatus(job);
    const exploreLabel = reviewStatus === "a_creuser" ? "Remettre à traiter" : "À creuser";
    const decision = evaluateDecisionFit(analysis);
    const decisionReason = decision.reasons.length ? decision.reasons.join(" · ") : "Correspond aux critères principaux.";
    const terrainStatus = terrainValidationStatus({ job, analysis });
    const displayedQuestions = job.aiReview && job.aiReview.status === "done" && job.aiReview.recruiterQuestions && job.aiReview.recruiterQuestions.length
      ? job.aiReview.recruiterQuestions.slice(0, 5)
      : analysis.questions;
    const scoreDetails = `
      <section class="decision-strip">
        <div>
          ${infoChip(
            "span",
            confidenceClass(analysis.scoreConfidence),
            `Confiance ${escapeHtml(analysis.scoreConfidence)}`,
            confidenceTooltip(analysis.scoreConfidence),
          )}
          ${
            analysis.confidenceReasons.length
              ? `<p>${analysis.confidenceReasons.map(escapeHtml).join(" · ")}</p>`
              : `<p>Les informations principales sont suffisamment présentes pour un premier tri.</p>`
          }
          ${
            analysis.verdictReasons && analysis.verdictReasons.length
              ? `<p>${analysis.verdictReasons.map(escapeHtml).join(" · ")}</p>`
              : ""
          }
        </div>
        ${
          analysis.scoreConfidence === "faible"
            ? `<strong>Score à confirmer avant décision</strong>`
            : `<strong>${escapeHtml(analysis.verdict)}</strong>`
        }
      </section>

      <div class="three-columns">
        ${signalList("Signaux positifs", analysis.positiveSignals, "Aucun signal fort détecté.", "positive")}
        ${signalList("Red flags", analysis.redFlags, "Pas de gros red flag.", "negative")}
        ${signalList("À vérifier", analysis.uncertainties, "Peu d'incertitudes.", "warning")}
      </div>

      <section class="detail-section">
        <div class="section-title"><h3>Pourquoi ce score ?</h3></div>
        ${scoreExplanationView(analysis)}
      </section>

      <section class="detail-section">
        <h3>Angle candidature</h3>
        <p>${escapeHtml(analysis.applicationAngle)}</p>
      </section>
    `;
    const questionsPanel = `
      <ol class="question-list">
        ${displayedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
      </ol>
      <button class="ghost-button compact" data-action="copy-questions" data-id="${job.id}">Copier questions</button>
    `;
    return `
      <article class="offer-detail ${uiState.mode === "simple" ? "simple-detail" : ""}">
        <div class="offer-hero">
          <div>
          <p class="eyebrow">${escapeHtml(analysis.offerType)}</p>
          <h2>${escapeHtml(analysis.normalizedTitle)}</h2>
          ${scoreMetricsView(analysis, "headline-score-grid")}
          <p class="muted">${escapeHtml(analysis.company)} · ${escapeHtml(analysis.location)} · ${escapeHtml(analysis.contract)}</p>
          <p class="source-line">
            <span>${escapeHtml(datasetDisplayLabel(job.datasetLabel))}</span>
            ${job.source ? `<span>${escapeHtml(job.source)}</span>` : ""}
            <span class="${reviewStatusClass(reviewStatus)}">${reviewStatusLabel(reviewStatus)}</span>
            ${uiState.showDebugInfo ? `<span>${escapeHtml(extractionReviewLabel(extractionReviewValue(job)))}</span>` : ""}
            ${job.sourceUrl && !isSearchResultUrl(job.sourceUrl) ? `<a href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">ouvrir la source</a>` : ""}
          </p>
          ${uiState.mode === "simple" && isRealWorldJob(job) ? `<p class="terrain-status-line">
            <span class="terrain-status-pill ${escapeHtml(terrainStatus.tone)}">${escapeHtml(terrainStatus.label)}</span>
            <small>${escapeHtml(terrainStatus.message)}</small>
          </p>` : ""}
          ${extractionReviewValue(job) === "needs_review" ? `<p class="extraction-warning">Extraction partielle : vérifie l’annonce source avant décision.</p>` : ""}
          ${uiState.mode === "advanced" ? `<p class="criteria-line ${decisionFitClass(decision.fit)}">
            <strong>Critères : ${decisionFitLabel(decision.fit)}</strong>
            <span>${escapeHtml(decisionReason)}</span>
          </p>` : ""}
        </div>
        <div class="hero-score">
            ${infoChip("span", scoreClass(analysis.scores.global), String(analysis.scores.global), "Score final de l'offre : règles locales, corrections et éventuel ajustement IA borné.")}
            ${uiState.mode === "advanced" ? `<small>${escapeHtml(analysis.verdict)}</small>` : ""}
            ${analysis.aiScoreAdjustment ? `<small>local ${analysis.localScore} ${analysis.aiScoreAdjustment > 0 ? "+" : ""}${analysis.aiScoreAdjustment} IA</small>` : ""}
          </div>
        </div>

        ${extractedInfoView(job, analysis)}

        ${quickDecisionView(job, analysis, decision)}


        <div class="action-row">
          <button class="${job.favorite ? "primary-button compact" : "ghost-button compact"}" data-action="favorite" data-id="${job.id}">
            ${job.favorite ? "Favori" : "Marquer favori"}
          </button>
          <button class="${reviewStatus === "a_creuser" ? "primary-button compact" : "ghost-button compact"}" data-action="review-status" data-review="${reviewStatus === "a_creuser" ? "a_traiter" : "a_creuser"}" data-id="${job.id}">
            ${exploreLabel}
          </button>
          ${uiState.mode === "simple" ? `<button class="ghost-button compact" data-action="edit-extraction" data-id="${job.id}">Corriger</button>` : ""}
          ${uiState.mode === "advanced" ? `<button class="ghost-button compact" data-action="copy-summary" data-id="${job.id}">
            Copier résumé
          </button>` : ""}
          ${uiState.mode === "advanced" ? `<button class="ghost-button compact" data-action="copy-questions" data-id="${job.id}">
            Copier questions
          </button>` : ""}
          <button class="ghost-button compact" data-action="ignore" data-id="${job.id}">
            ${job.ignored ? "Restaurer" : "Ignorer"}
          </button>
          <button class="ghost-button compact danger-text" data-action="delete" data-id="${job.id}">
            Supprimer
          </button>
        </div>

        ${uiState.mode === "simple" ? quickNotesView(job) : ""}

        ${uiState.mode === "advanced" ? terrainQuickReview(job, analysis) : ""}

        ${
          uiState.mode === "simple"
            ? `
              ${compactDetail("Avis IA complet", aiReviewView(job, analysis, { showQuestions: false }))}
              ${compactDetail("Questions recruteur", questionsPanel)}
              ${compactDetail("Score détaillé", scoreDetails)}
              ${compactDetail(
                "Texte brut",
                `<textarea class="edit-offer-box" rows="10" readonly>${escapeHtml(analysis.rawText)}</textarea>
                 <button class="ghost-button compact" data-action="copy-raw" data-id="${job.id}">Copier le texte</button>`,
              )}
            `
            : `
        ${aiReviewView(job, analysis)}

        <section class="decision-helper">
          <div>
            <strong>Pourquoi la garder</strong>
            <p>${escapeHtml(analysis.positiveSignals[0] || analysis.summary)}</p>
          </div>
          <div>
            <strong>Ce qui bloque</strong>
            <p>${escapeHtml(analysis.redFlags[0] || analysis.uncertainties[0] || "Pas de blocage majeur détecté.")}</p>
          </div>
          <div>
            <strong>Question clé</strong>
            <p>${escapeHtml(displayedQuestions[0] || "Clarifier le cadre du poste avant candidature.")}</p>
          </div>
        </section>

        ${uiState.mode === "advanced" && uiState.showDebugInfo ? `<div class="source-grid">
          <label>
            Source
            <input data-meta="source" data-id="${job.id}" value="${escapeHtml(job.source || "")}" placeholder="France Travail, Indeed..." />
          </label>
          <label>
            URL source
            <input data-meta="sourceUrl" data-id="${job.id}" value="${escapeHtml(job.sourceUrl || "")}" placeholder="https://..." />
          </label>
        </div>` : ""}

        ${scoreDetails}

      <section class="detail-section">
          <div class="section-title"><h3>Verdict</h3></div>
          <p>${escapeHtml(analysis.summary)}</p>
          <p class="muted">Salaire : ${escapeHtml(analysis.salary)}</p>
        </section>

        <section class="detail-section">
          <div class="section-title"><h3>Questions à poser</h3></div>
          <ol class="question-list">
            ${displayedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
          </ol>
        </section>

        ${uiState.mode === "advanced" && uiState.showDebugInfo ? `<details class="raw-offer">
          <summary>Modifier / voir le texte original</summary>
          <textarea class="edit-offer-box" data-edit="${job.id}" rows="12">${escapeHtml(analysis.rawText)}</textarea>
          <div class="button-row">
            <button class="primary-button compact" data-action="save-edit" data-id="${job.id}">Enregistrer</button>
            <button class="ghost-button compact" data-action="copy-raw" data-id="${job.id}">Copier le texte</button>
          </div>
        </details>` : ""}
        `
        }
      </article>
    `;
  }

  function rankingCard(item, index, isSelected) {
    const { job, analysis } = item;
    const reviewStatus = normalizeReviewStatus(job);
    const decision = evaluateDecisionFit(analysis);
    const salaryLabel = compactSalaryLabel(analysis);
    const contractLabel = compactContractLabel(analysis);
    const locationLabel = compactLocationLabel(analysis);
    return `
      <button class="rank-card ${isSelected ? "selected" : ""}" data-action="select" data-id="${job.id}">
        <span class="rank-index">#${index + 1}</span>
        <span class="rank-score ${scoreClass(analysis.scores.global)}">${analysis.scores.global}</span>
        <span class="rank-content">
          <span class="rank-title-row">
            <strong>${escapeHtml(analysis.normalizedTitle)}</strong>
            <span class="${decisionFitClass(decision.fit)}">${decisionFitLabel(decision.fit)}</span>
          </span>
          <span class="rank-main-line">
            <span>${escapeHtml(analysis.company)}</span>
            <span>${escapeHtml(locationLabel)}</span>
          </span>
          <span class="rank-value-line">
            <strong>${escapeHtml(salaryLabel)}</strong>
            <span>${escapeHtml(contractLabel)}</span>
          </span>
          <span class="rank-meta quiet">
            <span class="${reviewStatusClass(reviewStatus)}">${reviewStatusLabel(reviewStatus)}</span>
            <span class="${riskClass(analysis.riskLevel)}">Risque ${escapeHtml(analysis.riskLevel)}</span>
            ${job.extractionQuality === "complète" ? `<span class="import-quality-ok">fiable</span>` : ""}
            ${extractionReviewValue(job) === "needs_review" ? `<span class="import-quality-review">à vérifier</span>` : ""}
            <span>${escapeHtml(job.source || datasetDisplayLabel(job.datasetLabel))}</span>
            ${uiState.showDebugInfo && job.extractionQuality ? `<span>${escapeHtml(extractionLabel(job.extractionQuality))}</span>` : ""}
          </span>
        </span>
      </button>
    `;
  }

  function importPanel(isAdvanced) {
    return `
      <section class="import-strip ${isAdvanced ? "" : "one-button-import secondary-import bottom-import"}">
        <div class="section-title"><h2>${isAdvanced ? "Import rapide" : "Analyse express"}</h2></div>
        ${isAdvanced ? `<div class="source-grid">
          <label>
            Source
            <input id="draft-source" placeholder="France Travail, Indeed, Hellowork..." />
          </label>
          <label>
            URL source
            <input id="draft-url" placeholder="https://..." />
          </label>
        </div>` : ""}
        <textarea id="draft-offer" class="import-box" rows="${isAdvanced ? 5 : 3}" placeholder="${isAdvanced ? "Colle une annonce ici. Pour plusieurs annonces, sépare-les avec une ligne contenant ---" : "Colle une annonce ici si tu veux l’analyser tout de suite."}"></textarea>
        ${isAdvanced ? `<div class="button-row">
          <button class="primary-button ${buttonLoadingClass("add-offers")}" data-action="add-offers">${buttonSpinner("add-offers")}Analyser et sortir le Top 3</button>
          <button class="ghost-button" data-action="load-demo">Charger exemples</button>
          ${jobs.length ? `<button class="ghost-button ${buttonLoadingClass("copy-export")}" data-action="copy-export">${buttonSpinner("copy-export")}Copier synthèse</button>` : ""}
          ${jobs.length ? `<button class="ghost-button danger-text" data-action="clear">Vider</button>` : ""}
        </div>` : ""}
        ${
          statusMessage
            ? `<p class="status-message">${escapeHtml(statusMessage)}</p>`
            : `<p class="helper-text">${isAdvanced ? "Astuce : colle plusieurs annonces en les séparant par une ligne contenant <strong>---</strong>." : "Analyse express reste disponible en filet de sécurité, sous les résultats."}</p>`
        }
      </section>
    `;
  }

  function render() {
    tooltipCounter = 0;
    const analyses = getAnalyses();
    const tabFiltered = getTabFilteredAnalyses(analyses);
    const visible = getVisibleAnalyses(analyses);
    const eligible = analyses.filter(({ job, analysis }) => !job.ignored && !hasRequiredMismatch(analysis));
    const selectedCandidate = analyses.find(({ job }) => job.id === selectedId);
    const selected = selectedCandidate && !hasRequiredMismatch(selectedCandidate.analysis)
      ? selectedCandidate
      : eligible[0] || selectedCandidate || analyses[0] || null;
    const reviewCount = analyses.filter(
      ({ job, analysis }) =>
        !job.ignored &&
        !job.favorite &&
        normalizeReviewStatus(job) !== "a_creuser" &&
        !hasRequiredMismatch(analysis) &&
        (!strategy.hideWeakOffers || evaluateDecisionFit(analysis).fit !== "weak"),
    ).length;
    const exploreCount = jobs.filter((job) => !job.ignored && normalizeReviewStatus(job) === "a_creuser").length;
    const ignoredCount = jobs.filter((job) => job.ignored).length;
    const topCount = eligible.slice(0, 3).length;
    const topPicks = getTopPicks(analyses);
    const topPickIds = topPicks.map(({ item }) => item.job.id);
    const activeTop3AiComparison =
      lastTop3AiComparison &&
      lastTop3AiComparison.strategyHash === aiStrategyHash() &&
      topPickIds.length &&
      topPickIds.every((id, index) => lastTop3AiComparison.jobIds[index] === id)
        ? lastTop3AiComparison
        : null;
    const isAdvanced = uiState.mode === "advanced";

    app.innerHTML = `
      <div class="app-shell ${isAdvanced ? "mode-advanced" : "mode-simple"}">
        <datalist id="zone-suggestions">
          ${zoneSuggestions.map((zone) => `<option value="${escapeHtml(zone)}"></option>`).join("")}
        </datalist>
        <header class="topbar">
          <div>
            <p class="eyebrow">${isAdvanced ? "Mode avancé" : "Mode simple"}</p>
            <h1 class="app-title">Taf Sniffer <span class="version-chip">${escapeHtml(APP_VERSION_LABEL)}</span></h1>
          </div>
          <div class="mode-switch" role="group" aria-label="Mode d'interface">
            <button class="${!isAdvanced ? "active" : ""}" data-action="set-mode" data-mode="simple">Simple</button>
            <button class="${isAdvanced ? "active" : ""}" data-action="set-mode" data-mode="advanced">Avancé</button>
          </div>
          <div class="topbar-stats" aria-label="Synthese">
            <span>${reviewCount} à traiter</span>
            <span>${exploreCount} à creuser</span>
            <span>${ignoredCount} ignorées</span>
            <span>${topCount} priorités</span>
          </div>
        </header>

        <main class="workspace">
          <section class="main-panel" aria-label="Réglages et détail">
            ${simpleIntro(analyses)}

            ${isAdvanced ? `<section class="strategy-strip">
              <div class="section-title"><h2>Réglages</h2></div>
              <div class="strategy-grid">
                <label>
                  Métier cible
                  <input data-strategy="targetJob" value="${escapeHtml(strategy.targetJob)}" />
                </label>
                <label>
                  Zone
                  <input data-strategy="location" list="zone-suggestions" value="${escapeHtml(strategy.location)}" placeholder="Toute la France" />
                </label>
                <label>
                  Salaire net mini
                  <input data-strategy="salaryMin" type="number" min="0" value="${strategy.salaryMin}" />
                </label>
                <label>
                  Expérience
                  <select data-strategy="experienceLevel">
                    ${[
                      ["debutant_reconversion", "Débutant / reconversion"],
                      ["junior", "Junior"],
                      ["confirme", "Confirmé"],
                      ["indifferent", "Indifférent"],
                    ]
                      .map(([value, label]) => `<option value="${value}" ${strategy.experienceLevel === value ? "selected" : ""}>${label}</option>`)
                      .join("")}
                  </select>
                </label>
                <label>
                  Contrat souhaité
                  <select data-strategy="contractPreference">
                    ${[
                      ["any", "Peu importe"],
                      ["cdi", "CDI"],
                      ["cdd", "CDD"],
                      ["alternance", "Alternance"],
                    ]
                      .map(([value, label]) => `<option value="${value}" ${strategy.contractPreference === value ? "selected" : ""}>${label}</option>`)
                      .join("")}
                  </select>
                </label>
                <label class="objective-field">
                  Objectif
                  <textarea data-strategy="objective" rows="2">${escapeHtml(strategy.objective)}</textarea>
                </label>
              </div>

              <div class="toggle-row" aria-label="Priorites">
                <label class="toggle">
                  <input data-strategy="priorityTraining" type="checkbox" ${strategy.priorityTraining ? "checked" : ""} />
                  Formation
                </label>
                ${requirementChip("poeiRequirement", "POEI", strategy.poeiRequirement)}
                <label class="toggle">
                  <input data-strategy="prioritySalary" type="checkbox" ${strategy.prioritySalary ? "checked" : ""} />
                  Cashflow
                </label>
                ${requirementChip("auditRequirement", getActiveProfile().ui.strategicRequirementLabel, strategy.auditRequirement)}
                ${requirementChip("independentRequirement", "Refuser indépendant imposé", strategy.independentRequirement)}
                <label class="toggle">
                  <input data-strategy="hideWeakOffers" type="checkbox" ${strategy.hideWeakOffers !== false ? "checked" : ""} />
                  Masquer offres faibles
                </label>
                <label class="toggle">
                  <input data-strategy="smartSearch" type="checkbox" ${strategy.smartSearch !== false ? "checked" : ""} />
                  Recherche intelligente
                </label>
                <label class="toggle">
                  <input data-strategy="smartLocation" type="checkbox" ${strategy.smartLocation !== false ? "checked" : ""} />
                  Zone intelligente
                </label>
                <label class="toggle">
                  <input data-ui="showDebugInfo" type="checkbox" ${uiState.showDebugInfo ? "checked" : ""} />
                  Afficher infos debug
                </label>
                <label class="toggle">
                  <input data-ui="aiAutoAnalyze" type="checkbox" ${uiState.aiAutoAnalyze === true ? "checked" : ""} />
                  Analyse IA auto Top 3
                </label>
                <button class="ghost-button compact ${buttonLoadingClass("ai-analyze")}" data-action="reanalyze-ai" ${jobs.length ? "" : "disabled"}>
                  ${buttonSpinner("ai-analyze")}
                  Réanalyser Top 3 IA
                </button>
              </div>
            </section>` : ""}

            ${!isAdvanced ? simpleSearchPanel(analyses) : ""}

            ${isAdvanced ? importPanel(isAdvanced) : ""}

            ${isAdvanced ? collectionPanel(analyses) : ""}
            ${isAdvanced ? sourceHealthPanel(sourceHealthStats) : ""}
            ${isAdvanced ? backupPanel() : ""}

            ${employerRankingView(employerRanking)}
            ${top3AiComparisonView(activeTop3AiComparison)}

            ${isAdvanced ? terrainPanel(analyses) : ""}
            ${isAdvanced ? validationPanel(analyses) : ""}

            <section class="detail-panel" aria-label="Offre sélectionnée">
              ${offerDetail(selected)}
            </section>

            ${!isAdvanced ? importPanel(isAdvanced) : ""}
          </section>

          <aside class="ranking-panel" aria-label="Classement des offres">
            <div class="ranking-header">
              <div class="section-title"><h2>Classement</h2></div>
              <button class="icon-button" title="Recalculer" aria-label="Recalculer" data-action="refresh">↻</button>
            </div>

            <div class="ranking-search" role="search">
              <input data-ranking-search value="${escapeHtml(rankingSearch)}" placeholder="Chercher dans les annonces..." aria-label="Chercher dans les annonces déjà trouvées" />
              ${rankingSearch ? `<button class="ghost-button compact" data-action="clear-ranking-search">Effacer</button>` : ""}
            </div>
            <p class="ranking-search-count">
              ${visible.length}/${tabFiltered.length} affichée${visible.length > 1 ? "s" : ""}${rankingSearch ? ` · recherche « ${escapeHtml(rankingSearch.trim())} »` : ""}
            </p>

            <div class="segmented" aria-label="Filtrer les offres">
              <button class="${filter === "to_review" || filter === "active" ? "active" : ""}" data-filter="to_review">À traiter <span class="filter-count">${reviewCount}</span></button>
              <button class="${filter === "to_explore" ? "active" : ""}" data-filter="to_explore">À creuser</button>
              <button class="${filter === "favorites" ? "active" : ""}" data-filter="favorites">Favoris</button>
              <button class="${filter === "ignored" ? "active" : ""}" data-filter="ignored">Ignorées</button>
              <button class="${filter === "all" ? "active" : ""}" data-filter="all">Toutes</button>
            </div>

            <div class="ranking-list">
              ${
                visible.length
                  ? visible.map((item, index) => rankingCard(item, index, selected && selected.job.id === item.job.id)).join("")
                  : `<div class="ranking-empty">${
                      rankingSearch
                        ? `Aucune annonce ne contient « ${escapeHtml(rankingSearch.trim())} » dans ce filtre. Essaie un autre mot-clé ou passe sur Toutes.`
                        : jobs.length && (filter === "to_review" || filter === "active")
                          ? "Aucune offre à traiter dans ce filtre."
                          : "Aucune offre dans ce filtre."
                    }</div>`
              }
            </div>
          </aside>
        </main>
      </div>
    `;

    bindStrategyFields();
  }

  function bindStrategyFields() {
    document.querySelectorAll("[data-criteria-panel]").forEach((panel) => {
      panel.addEventListener("toggle", (event) => {
        simpleCriteriaOpen = event.currentTarget.open;
      });
    });

    document.querySelectorAll("[data-strategy]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const target = event.currentTarget;
        const key = target.getAttribute("data-strategy");
        if (!key) return;
        if (target.type === "checkbox") {
          strategy[key] = target.checked;
        } else if (target.type === "number") {
          strategy[key] = Number(target.value);
        } else {
          strategy[key] = target.value;
        }
        save();
        render();
      });
    });

    document.querySelectorAll("[data-simple-strategy]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const target = event.currentTarget;
        const key = target.getAttribute("data-simple-strategy");
        if (!key) return;
        if (target.type === "checkbox") {
          strategy[key] = target.checked;
        } else if (target.type === "number") {
          strategy[key] = Number(target.value);
        } else {
          strategy[key] = target.value;
        }
        uiState.searchReady = false;
        simpleCriteriaOpen = true;
        lastSearchSession = null;
        lastTop3AiComparison = null;
        searchResult = { ...searchResult, status: "idle", offers: [], message: "Prêt." };
        save();
        render();
      });
    });

    document.querySelectorAll("[data-requirement]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.currentTarget;
        const key = target.getAttribute("data-requirement");
        if (!key) return;
        const mode = nextRequirementMode(strategy[key] || "off");
        Object.assign(strategy, requirementPatch(key, mode));
        uiState.searchReady = false;
        simpleCriteriaOpen = true;
        lastSearchSession = null;
        lastTop3AiComparison = null;
        searchResult = { ...searchResult, status: "idle", offers: [], message: "Prêt." };
        save();
        render();
      });
    });

    document.querySelectorAll("[data-ui]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const target = event.currentTarget;
        const key = target.getAttribute("data-ui");
        if (!key) return;
        uiState[key] = target.type === "checkbox" ? target.checked : target.value;
        save();
        render();
      });
    });

    const rankingSearchField = document.querySelector("[data-ranking-search]");
    if (rankingSearchField) {
      rankingSearchField.addEventListener("input", (event) => {
        rankingSearch = event.currentTarget.value;
        render();
      });
    }

    const backupInput = document.getElementById("backup-input");
    if (backupInput) {
      backupInput.addEventListener("change", async (event) => {
        const file = event.currentTarget.files && event.currentTarget.files[0];
        event.currentTarget.value = "";
        if (!file) return;

        startLoading("import-backup");
        try {
          const backup = normalizeBackup(JSON.parse(await file.text()));
          jobs = backup.jobs;
          strategy = backup.strategy;
          uiState = backup.uiState;
          lastSearchSession = backup.lastSearchSession;
          lastTop3AiComparison = backup.lastTop3AiComparison || null;
          sourceHealthStats = backup.sourceHealthStats || {};
          selectedId = jobs[0] ? jobs[0].id : null;
          filter = "to_review";
          searchResult = { source: "Taf Sniffer local", sourceQuery: "", status: "idle", offers: [], message: "Prêt." };
          statusMessage = `Sauvegarde importée : ${jobs.length} annonce${jobs.length > 1 ? "s" : ""} restaurée${jobs.length > 1 ? "s" : ""}.`;
          save();
        } catch (error) {
          statusMessage = error instanceof Error ? error.message : "Import impossible : fichier invalide.";
        }
        stopLoading();
      });
    }
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action], [data-filter]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    const nextFilter = button.getAttribute("data-filter");

    if (nextFilter) {
      filter = nextFilter;
      render();
      return;
    }

    if (action === "clear-ranking-search") {
      rankingSearch = "";
      render();
      return;
    }

    if (action === "reset-source-health") {
      sourceHealthStats = {};
      statusMessage = "Stats sources réinitialisées.";
      save();
      render();
      return;
    }

    if (action === "test-network") {
      await runNetworkDiagnostics();
      return;
    }

    if (action === "set-mode") {
      uiState.mode = button.getAttribute("data-mode") === "advanced" ? "advanced" : "simple";
      save();
      render();
      return;
    }

    if (action === "run-search") {
      const draft = document.getElementById("draft-offer");
      const draftText = draft ? draft.value.trim() : "";
      startLoading("run-search");
      const result = await runFranceTravailProxySearch(jobs, draftText);
      searchResult = result;
      uiState.searchReady = true;
      simpleCriteriaOpen = false;
      if (result.networkStatus !== "blocked") {
        sourceHealthStats = updateSourceHealthStats(sourceHealthStats, result);
      }
      const batchId = `search-${Date.now().toString(36)}`;

      if (result.jobs && result.jobs.length) {
        const stats = addJobRecords(result.jobs, result.message, { searchBatchId: batchId });
        const adjustedResult = { ...result, skippedCount: Number(result.skippedCount || 0) + (stats.rejectedCount || 0) };
        lastSearchSession = createSearchSession(adjustedResult, batchId, stats.importedCount, stats.duplicateCount);
        save();
        render();
      } else if (result.offers.length) {
        const stats = addOffers(result.offers.join("\n---\n"), { datasetLabel: "jeu réel", searchBatchId: batchId });
        lastSearchSession = createSearchSession(result, batchId, stats.importedCount, stats.duplicateCount);
        save();
        render();
      } else if (result.status === "readyWithLocalOffers") {
        filter = "to_review";
        selectedId = bestSelectableId(jobs) || selectedId;
        lastSearchSession = createSearchSession(result, batchId, 0, 0);
        statusMessage = result.message;
        save();
        render();
      } else {
        lastSearchSession = null;
        lastTop3AiComparison = null;
        statusMessage = result.message;
        save();
        render();
      }
      if (uiState.aiAutoAnalyze === true && jobs.length && result.status !== "needsConnector") {
        await analyzeJobsWithAi(automaticAiCandidates(jobs), false, false, true);
      }
      stopLoading();
      return;
    }

    if (action === "open-searches") {
      startLoading("open-searches");
      const count = openPrioritySearches(generateSearchQueries());
      statusMessage = `${count} sources ouvertes. Si le navigateur bloque les onglets, utilise les liens en mode avancé.`;
      save();
      stopLoading();
      return;
    }

    if (action === "copy-search-plan") {
      startLoading("copy-search-plan");
      await navigator.clipboard.writeText(searchPlanText(generateSearchQueries()));
      statusMessage = "Plan de recherche copié.";
      stopLoading();
      return;
    }

    if (action === "export-backup") {
      startLoading("export-backup");
      const backup = exportBackupPayload();
      downloadJson(`taf-sniffer-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
      statusMessage = "Sauvegarde JSON exportée.";
      stopLoading();
      return;
    }

    if (action === "import-backup") {
      const backupInput = document.getElementById("backup-input");
      if (backupInput) backupInput.click();
      return;
    }

    if (action === "select" && id) {
      selectedId = id;
      render();
      scrollDetailPanelIntoView();
      return;
    }

    if (action === "edit-extraction" && id) {
      editingExtractionId = id;
      render();
      scrollDetailPanelIntoView();
      return;
    }

    if (action === "identify-company" && id) {
      const job = jobs.find((item) => item.id === id);
      if (!job) return;
      await identifyCompanyProfile(job, analyzeJob(job));
      return;
    }

    if (action === "reanalyze-ai") {
      await analyzeJobsWithAi(automaticAiCandidates(jobs), true, false, true);
      return;
    }

    if (action === "analyze-top3-ai") {
      await analyzeJobsWithAi(automaticAiCandidates(jobs), false, true, true);
      return;
    }

    if (action === "scroll-ai-review") {
      const card = document.querySelector(".ai-review-card");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "rank-employers") {
      await rankEmployers();
      return;
    }

    if (action === "analyze-ai-offer" && id) {
      const job = jobs.find((item) => item.id === id);
      if (job) queueManualAiAnalysis(job);
      return;
    }

    if (action === "cancel-extraction") {
      editingExtractionId = null;
      render();
      return;
    }

    if (action === "clear-extraction" && id) {
      editingExtractionId = null;
      updateJob(id, { manualExtraction: undefined, extractionReview: undefined });
      statusMessage = "Corrections d'extraction effacées.";
      save();
      render();
      return;
    }

    if (action === "save-extraction" && id) {
      const job = jobs.find((item) => item.id === id);
      const form = document.querySelector(`[data-extraction-form="${id}"]`);
      if (!job || !form) return;
      const values = {};
      form.querySelectorAll("[data-extraction-field]").forEach((field) => {
        values[field.getAttribute("data-extraction-field")] = field.value;
      });
      editingExtractionId = null;
      updateJob(id, buildExtractionPatch(job, values));
      statusMessage = "Infos extraites mises à jour.";
      save();
      render();
      return;
    }

    if (action === "add-offers") {
      const draft = document.getElementById("draft-offer");
      const source = document.getElementById("draft-source");
      const sourceUrl = document.getElementById("draft-url");
      const draftText = draft ? draft.value : "";
      const sourceValue = source ? source.value.trim() : "";
      const sourceUrlValue = sourceUrl ? sourceUrl.value.trim() : "";
      startLoading("add-offers");
      addOffers(draftText, {
        source: sourceValue,
        sourceUrl: sourceUrlValue,
        datasetLabel: "jeu réel",
      });
      stopLoading();
      return;
    }

    if (action === "load-demo") {
      jobs = demoOffers.map((offer) => createJob(offer, { datasetLabel: "exemple", source: "Démo" }));
      selectedId = jobs[0] ? jobs[0].id : null;
      filter = "to_review";
      lastSearchSession = null;
      lastTop3AiComparison = null;
      save();
      render();
      return;
    }

    if (action === "load-extraction-tests") {
      jobs = extractionTestOffers.map((test) =>
        createJob(test.rawText, {
          datasetLabel: "test extraction",
          source: test.source,
          sourceUrl: test.sourceUrl,
          expectedReview: {
            expectedVerdict: "",
            expectedTags: [],
            expectedExtraction: test.expectedExtraction,
            notes: "Cas de validation extraction.",
          },
        }),
      );
      selectedId = jobs[0] ? jobs[0].id : null;
      filter = "to_review";
      lastSearchSession = null;
      lastTop3AiComparison = null;
      statusMessage = "Tests d'extraction chargés.";
      save();
      render();
      return;
    }

    if (action === "clear") {
      jobs = [];
      selectedId = null;
      lastSearchSession = null;
      lastTop3AiComparison = null;
      statusMessage = "Données locales réinitialisées.";
      save();
      render();
      return;
    }

    if (action === "favorite" && id) {
      const job = jobs.find((item) => item.id === id);
      if (job) updateJob(id, job.favorite ? reviewPatch("a_traiter") : reviewPatch("favori"));
      return;
    }

    if (action === "review-status" && id) {
      const status = button.getAttribute("data-review") || "a_traiter";
      updateJob(id, reviewPatch(status));
      return;
    }

    if (action === "ignore" && id) {
      const job = jobs.find((item) => item.id === id);
      if (job) updateJob(id, job.ignored ? reviewPatch("a_traiter") : reviewPatch("ignoree"));
      return;
    }

    if (action === "delete" && id) {
      deleteJob(id);
      return;
    }

    if (action === "save-edit" && id) {
      const field = document.querySelector(`[data-edit="${id}"]`);
      if (field && field.value.trim().length > 40) {
        statusMessage = "Offre mise à jour et rescannée.";
        updateJob(id, { rawText: field.value.trim() });
      }
      return;
    }

    if (action === "copy-summary" && id) {
      const item = getAnalyses().find(({ job }) => job.id === id);
      if (item) {
        await navigator.clipboard.writeText(offerMarkdown(item.analysis));
        statusMessage = "Résumé copié en Markdown.";
        render();
      }
      return;
    }

    if (action === "copy-raw" && id) {
      const job = jobs.find((item) => item.id === id);
      if (job) {
        await navigator.clipboard.writeText(job.rawText);
        statusMessage = "Texte original copié.";
        render();
      }
      return;
    }

    if (action === "copy-questions" && id) {
      const item = getAnalyses().find(({ job }) => job.id === id);
      if (item) {
        const questions = item.job.aiReview && item.job.aiReview.status === "done" && item.job.aiReview.recruiterQuestions && item.job.aiReview.recruiterQuestions.length
          ? item.job.aiReview.recruiterQuestions.slice(0, 5)
          : item.analysis.questions;
        await navigator.clipboard.writeText(questions.join("\n"));
        statusMessage = "Questions copiées.";
        render();
      }
      return;
    }

    if (action === "copy-export") {
      startLoading("copy-export");
      await navigator.clipboard.writeText(exportMarkdown(getAnalyses()));
      statusMessage = "Synthèse complète copiée en Markdown.";
      stopLoading();
      return;
    }

    if (action === "copy-terrain-report") {
      startLoading("copy-terrain-report");
      await navigator.clipboard.writeText(exportTerrainMarkdown(getAnalyses()));
      statusMessage = "Rapport terrain copié en Markdown.";
      stopLoading();
      return;
    }

    if (action === "prefill-terrain-review" && id) {
      const item = getAnalyses().find(({ job }) => job.id === id);
      if (item) {
        updateExpectedReview(id, { expectedExtraction: prefillExpectedExtraction(item.analysis) });
        statusMessage = "Champs attendus préremplis avec les infos extraites.";
      }
      return;
    }

    if (action === "copy-keywords") {
      startLoading("copy-keywords");
      await navigator.clipboard.writeText(generateSearchQueries().keywords.join("\n"));
      statusMessage = "Mots-clés copiés.";
      stopLoading();
      return;
    }

    if (action === "copy-checklist") {
      startLoading("copy-checklist");
      await navigator.clipboard.writeText(collectionChecklist());
      statusMessage = "Checklist de collecte copiée.";
      stopLoading();
      return;
    }

    if (action === "copy-keyword") {
      const keyword = button.getAttribute("data-keyword") || "";
      await navigator.clipboard.writeText(keyword);
      statusMessage = `Mot-clé copié : ${keyword}`;
      render();
      return;
    }

    if (action === "refresh") {
      render();
    }
  });

  document.addEventListener("change", (event) => {
    const metaField = event.target.closest("[data-meta]");
    if (metaField) {
      const id = metaField.getAttribute("data-id");
      const key = metaField.getAttribute("data-meta");
      if (id && key) updateJob(id, { [key]: metaField.value.trim() });
      return;
    }

    const field = event.target.closest("[data-expected]");
    if (!field) return;

    const id = field.getAttribute("data-id");
    const kind = field.getAttribute("data-expected");
    if (!id || !kind) return;

    const job = jobs.find((item) => item.id === id);
    if (!job) return;

    const review = normalizeExpectedReview(job);

    if (kind === "verdict") {
      updateExpectedReview(id, { expectedVerdict: field.value });
      return;
    }

    if (kind === "tag") {
      const tag = field.value;
      const expectedTags = field.checked
        ? [...new Set([...review.expectedTags, tag])]
        : review.expectedTags.filter((item) => item !== tag);
      updateExpectedReview(id, { expectedTags });
      return;
    }

    if (kind === "notes") {
      updateExpectedReview(id, { notes: field.value });
      return;
    }

    if (kind === "extraction") {
      const extractionField = field.getAttribute("data-field");
      if (!extractionField) return;
      updateExpectedReview(id, {
        expectedExtraction: Object.assign({}, review.expectedExtraction || {}, {
          [extractionField]: field.value,
        }),
      });
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  render();
})();
