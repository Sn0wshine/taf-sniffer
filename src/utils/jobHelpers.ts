import type {
  AIMode,
  DecisionFit,
  EmployerRating,
  EmployerRankingItem,
  EmployerRankingResult,
  ExpectedReview,
  ExtractionReviewStatus,
  JobAnalysis,
  JobRecord,
  ManualExtraction,
  RequirementMode,
  ReviewStatus,
  ScoreConfidence,
  SearchProviderResult,
  SearchSession,
  SourceHealthRecord,
  SourceHealthStats,
  SourceReport,
  Strategy,
  ValidationTag,
  AIReview,
  Top3AIComparison,
} from "../types";
import { analyzeJob } from "../analysis";
import { compareValidation } from "../validation";
import { getActiveProfile } from "../jobProfiles";
import { generateSearchQueries } from "../searchQueries";
import { normalizeSuggestionText } from "../suggestionDictionary";
import type { DictionarySuggestion } from "../suggestionDictionary";
import type {
  AnalysisItem,
  AppView,
  DictionaryField,
  RecentDictionaryItem,
  RecentDictionaryState,
  StoredUiState,
  TopPick,
  UiMode,
} from "../appConstants";
import {
  BACKUP_VERSION,
  DEFAULT_AI_MODE,
  FACILITATED_TRAINING_LABEL,
  LEGACY_DEFAULT_SALARY_MIN,
  LEGACY_DEFAULT_TARGET_JOB,
  SOURCE_HEALTH_HISTORY_LIMIT,
  defaultStrategy,
} from "../appConstants";
export const scoreClass = (score: number) => {
  if (score >= 82) return "score high";
  if (score >= 68) return "score good";
  if (score >= 52) return "score mid";
  return "score low";
};

export const metricTone = (value: number) => {
  if (value >= 80) return "metric-green";
  if (value >= 50) return "metric-lime";
  if (value >= 35) return "metric-yellow";
  if (value >= 20) return "metric-orange";
  return "metric-red";
};

export const riskClass = (risk: JobAnalysis["riskLevel"]) => {
  if (risk === "élevé") return "risk danger";
  if (risk === "modéré") return "risk warning";
  return "risk ok";
};

export const confidenceClass = (confidence: JobAnalysis["scoreConfidence"]) => {
  if (confidence === "bonne") return "confidence good";
  if (confidence === "moyenne") return "confidence medium";
  return "confidence low";
};

export const pickBest = (
  candidates: AnalysisItem[],
  usedIds: Set<string>,
  scorer: (analysis: JobAnalysis) => number,
) =>
  candidates
    .filter(({ job }) => !usedIds.has(job.id))
    .slice()
    .sort((a, b) => scorer(b.analysis) - scorer(a.analysis))[0];

export const getTopPicks = (analyses: AnalysisItem[], activeProfile = getActiveProfile()): TopPick[] => {
  const candidates = analyses.filter(({ job }) => !job.ignored);
  const usedIds = new Set<string>();
  const picks: TopPick[] = [];

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
};

export const normalizeExpectedReview = (job: JobRecord): ExpectedReview => ({
  expectedVerdict: job.expectedReview?.expectedVerdict ?? "",
  expectedTags: job.expectedReview?.expectedTags ?? [],
  expectedExtraction: {
    title: job.expectedReview?.expectedExtraction?.title ?? "",
    company: job.expectedReview?.expectedExtraction?.company ?? "",
    location: job.expectedReview?.expectedExtraction?.location ?? "",
    contract: job.expectedReview?.expectedExtraction?.contract ?? "",
    salary: job.expectedReview?.expectedExtraction?.salary ?? "",
    workTime: job.expectedReview?.expectedExtraction?.workTime ?? "",
  },
  notes: job.expectedReview?.notes ?? "",
});

export const hasExpectedExtraction = (review: ExpectedReview) =>
  Object.values(review.expectedExtraction ?? {}).some((value) => String(value || "").trim());

export const expectedExtractionInputs: Array<{ key: keyof NonNullable<ExpectedReview["expectedExtraction"]>; label: string; placeholder: string }> = [
  { key: "title", label: "Titre attendu", placeholder: "Chef de Projet AMO - Investisseurs F/H" },
  { key: "company", label: "Entreprise attendue", placeholder: "Kardham" },
  { key: "location", label: "Lieu attendu", placeholder: "Paris 17 - 75" },
  { key: "contract", label: "Contrat attendu", placeholder: "CDI" },
  { key: "salary", label: "Salaire attendu", placeholder: "45-60 k brut/an" },
  { key: "workTime", label: "Temps attendu", placeholder: "35H, temps partiel..." },
];

export const isRealWorldJob = (job: JobRecord) => !job.datasetLabel || job.datasetLabel === "jeu réel";

export const isAnnotatedJob = (job: JobRecord) => {
  const review = normalizeExpectedReview(job);
  return Boolean(review.expectedVerdict || review.expectedTags.length || hasExpectedExtraction(review) || review.notes.trim());
};

export const correctedExtractionLabels = (job: JobRecord) => {
  const manual = job.manualExtraction;
  if (!manual) return [];
  const labels: Array<[keyof ManualExtraction, string]> = [
    ["title", "Titre"],
    ["company", "Entreprise"],
    ["location", "Lieu"],
    ["contract", "Contrat"],
    ["workTime", "Temps de travail"],
    ["salary", "Salaire"],
    ["bonus", "Primes"],
    ["requiredExperience", "Expérience"],
    ["benefits", "Avantages"],
  ];
  return labels.filter(([key]) => String(manual[key] || "").trim()).map(([, label]) => label);
};

export const isCorrectedJob = (job: JobRecord) => correctedExtractionLabels(job).length > 0 || job.extractionReview === "manual";

export const countTags = (items: ValidationTag[][]) => {
  const counts = new Map<ValidationTag, number>();
  items.flat().forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const countLabels = (items: string[]) => {
  const counts = new Map<string, number>();
  items.filter(Boolean).forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const terrainQualityLabel = (job: JobRecord) => {
  if (job.extractionQuality) return job.extractionQuality;
  if (job.extractionReview === "manual") return "corrigée manuellement";
  if (job.extractionReview === "ok") return "Extraction OK";
  return "À vérifier";
};

export const terrainText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export const terrainLooksMissing = (value: string, fragments: string[]) => {
  const text = terrainText(value || "");
  return !text.trim() || fragments.some((fragment) => text.includes(fragment));
};

export const terrainAiQualityReasons = (job: JobRecord) => {
  const checks = job.aiReview?.status === "done" && job.aiReview.qualityCheck ? job.aiReview.qualityCheck.fieldChecks : [];
  const important = ["entreprise", "company", "lieu", "location", "contrat", "temps", "worktime", "salaire", "salary", "brut", "net", "prime"];
  return checks
    .filter((item) => item.status !== "ok")
    .filter((item) => important.some((term) => terrainText(`${item.field} ${item.reason}`).includes(term)))
    .slice(0, 2)
    .map((item) => `${item.field} IA à vérifier`);
};

export const terrainCorrectionReasons = ({ job, analysis }: AnalysisItem) => {
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
};

export const isTerrainSorted = (job: JobRecord) => normalizeReviewStatus(job) !== "a_traiter" || job.favorite || job.ignored;

export const prefillExpectedExtraction = (analysis: JobAnalysis) => ({
  title: analysis.normalizedTitle,
  company: analysis.company,
  location: analysis.location,
  contract: analysis.contract,
  salary: analysis.salary,
  workTime: analysis.workTime,
});

export const terrainQueueRows = (analyses: AnalysisItem[]) => {
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
};

export const terrainValidationStatus = (item: AnalysisItem) => {
  const correctionReasons = terrainCorrectionReasons(item);
  if (correctionReasons.length > 0) {
    return {
      label: "à corriger",
      tone: "correct" as const,
      message: correctionReasons.join(" · "),
    };
  }
  if (!isTerrainSorted(item.job)) {
    return {
      label: "à trier",
      tone: "sort" as const,
      message: "Décide si l’offre est à creuser, favorite ou ignorée.",
    };
  }
  if (!isAnnotatedJob(item.job)) {
    return {
      label: "à annoter",
      tone: "annotate" as const,
      message: "Ajoute verdict attendu, tags ou notes terrain.",
    };
  }
  return {
    label: "prête scoring",
    tone: "ready" as const,
    message: "Triée, annotée et extraction exploitable.",
  };
};

export const terrainNotReadyRows = (analyses: AnalysisItem[]) => {
  const queues = terrainQueueRows(analyses);
  const real = analyses.filter(({ job }) => isRealWorldJob(job));
  const rows: Array<{ item: AnalysisItem; reason: string }> = [];
  const seen = new Set<string>();
  const add = (item: AnalysisItem, reason: string) => {
    if (seen.has(item.job.id)) return;
    seen.add(item.job.id);
    rows.push({ item, reason });
  };

  queues.correctionRows.forEach(({ item, reasons }) => add(item, reasons.join(" · ")));
  real.filter(({ job }) => !isTerrainSorted(job)).forEach((item) => add(item, "tri à décider"));
  queues.annotationRows.forEach((item) => add(item, "annotation manquante"));

  return rows.sort((a, b) => b.item.analysis.scores.global - a.item.analysis.scores.global);
};

export const buildTerrainBlockers = (analyses: AnalysisItem[], target = 20) => {
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
};

export const buildTerrainActionPlan = (analyses: AnalysisItem[], target = 20) => {
  const report = buildTerrainReport(analyses, target);
  const queues = terrainQueueRows(analyses);
  const unsortedCount = report.real.filter(({ job }) => !isTerrainSorted(job)).length;
  const remainingCollection = Math.max(0, target - report.realCount);
  const remainingAnnotations = Math.max(0, target - report.annotatedCount);

  if (remainingCollection > 0) {
    return {
      title: `Collecter encore ${remainingCollection} annonce${remainingCollection > 1 ? "s" : ""}`,
      message: "Lance une recherche ou importe des offres réelles avant de toucher au scoring.",
      tone: "collect" as const,
      nextId: queues.annotationRows[0]?.job.id ?? queues.correctionRows[0]?.item.job.id ?? "",
    };
  }
  if (queues.correctionRows.length > 0) {
    return {
      title: `Corriger ${queues.correctionRows.length} offre${queues.correctionRows.length > 1 ? "s" : ""}`,
      message: "Commence par les infos extraites douteuses pour éviter de calibrer sur des données sales.",
      tone: "correct" as const,
      nextId: queues.correctionRows[0].item.job.id,
    };
  }
  if (unsortedCount > 0) {
    return {
      title: `Trier ${unsortedCount} offre${unsortedCount > 1 ? "s" : ""}`,
      message: "Passe les offres en favori, à creuser ou ignorée pour clarifier tes préférences terrain.",
      tone: "sort" as const,
      nextId: report.real.find(({ job }) => !isTerrainSorted(job))?.job.id ?? "",
    };
  }
  if (remainingAnnotations > 0) {
    return {
      title: `Annoter encore ${remainingAnnotations} annonce${remainingAnnotations > 1 ? "s" : ""}`,
      message: "Ajoute verdict attendu, tags ou notes pour rendre le jeu exploitable.",
      tone: "annotate" as const,
      nextId: queues.annotationRows[0]?.job.id ?? "",
    };
  }
  return {
    title: "Jeu terrain prêt",
    message: "Les 20 annonces sont annotées : tu peux lancer une vraie passe de calibration scoring.",
    tone: "ready" as const,
    nextId: queues.readyRows[0]?.job.id ?? "",
  };
};

export const buildTerrainReport = (analyses: AnalysisItem[], target = 20) => {
  const real = analyses.filter(({ job }) => isRealWorldJob(job));
  const annotated = real.filter(({ job }) => isAnnotatedJob(job));
  const corrected = real.filter(({ job }) => isCorrectedJob(job));
  const favorite = real.filter(({ job }) => normalizeReviewStatus(job) === "favori" || job.favorite);
  const explore = real.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser");
  const ignored = real.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree");
  const correctedFieldCounts = countLabels(real.flatMap(({ job }) => correctedExtractionLabels(job)));
  const bySource = new Map<string, AnalysisItem[]>();

  real.forEach((item) => {
    const source = item.job.source || "Source inconnue";
    bySource.set(source, [...(bySource.get(source) ?? []), item]);
  });

  const sourceRows = [...bySource.entries()]
    .map(([source, items]) => {
      const sourceAnnotated = items.filter(({ job }) => isAnnotatedJob(job)).length;
      const sourceFavorite = items.filter(({ job }) => normalizeReviewStatus(job) === "favori" || job.favorite).length;
      const sourceExplore = items.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser").length;
      const sourceIgnored = items.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree").length;
      const qualityCounts = countLabels(items.map(({ job }) => terrainQualityLabel(job)));
      const warnings = [
        items.length < 2 ? "peu d'offres" : "",
        sourceIgnored > Math.max(1, items.length / 2) ? "bruit élevé" : "",
        qualityCounts.some(([label]) => /vérifier|partielle/i.test(label)) ? "extraction à surveiller" : "",
      ].filter(Boolean);
      return {
        source,
        total: items.length,
        annotated: sourceAnnotated,
        favorite: sourceFavorite,
        explore: sourceExplore,
        ignored: sourceIgnored,
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
};

export const calibrationRuleFor = (tag: ValidationTag, kind: "missed" | "extra", count: number) => {
  const priority = count >= 2 ? "Priorité haute" : "À surveiller";
  const missedRules: Record<ValidationTag, string> = {
    POEI: "POEI manquée : enrichir les formulations POE, AFPR, formation préalable et embauche après parcours.",
    "formation facilitée": "Formation facilitée manquée : mieux capter formation employeur, financement, intégration certifiante et prise en charge.",
    formation: "Formation manquée : mieux distinguer formation financée, tutorat, intégration et certifications prises en charge.",
    audit: "Audit manqué : renforcer rénovation énergétique, DPE avec mention, conseil travaux et scénarios.",
    indépendant: "Indépendant manqué : durcir agent commercial, franchise, mandataire et activité à son compte.",
    "salaire flou": "Salaire flou manqué : mieux traiter selon profil, variable, package, commissions et non plafonné.",
    "débutant accepté": "Débutant manqué : enrichir junior, reconversion, sans expérience et première expérience acceptée.",
    volume: "Volume manqué : mieux repérer cadence, planning chargé, nombreuses interventions et grands secteurs.",
  };
  const extraRules: Record<ValidationTag, string> = {
    POEI: "POEI surdétectée : vérifier que POE/AFPR indique bien un dispositif de recrutement.",
    "formation facilitée": "Formation facilitée surdétectée : distinguer vraie prise en charge et simple accompagnement vague.",
    formation: "Formation surdétectée : séparer simple intégration, formation vague et vraie prise en charge.",
    audit: "Audit surdétecté : ne pas confondre DPE standard et vraie trajectoire audit/rénovation.",
    indépendant: "Indépendant surdétecté : distinguer autonomie terrain et statut indépendant imposé.",
    "salaire flou": "Salaire flou surdétecté : ne pas pénaliser les fourchettes salariales suffisamment claires.",
    "débutant accepté": "Débutant surdétecté : distinguer junior réel et simple première expérience souhaitée.",
    volume: "Volume surdétecté : distinguer mobilité normale et pression de cadence.",
  };

  return `${priority} (${count}) - ${kind === "missed" ? missedRules[tag] : extraRules[tag]}`;
};

export const buildCalibrationReport = (analyses: AnalysisItem[]) => {
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
  const underratedOffers = reviewed.filter(
    ({ review, analysis }) => review.expectedVerdict === "prioritaire" && analysis.scores.global < 65,
  );
  const priorityRules = [
    ...missedTagCounts.map(([tag, count]) => calibrationRuleFor(tag, "missed", count)),
    ...extraTagCounts.map(([tag, count]) => calibrationRuleFor(tag, "extra", count)),
  ].slice(0, 8);
  const extractionChecks = reviewed.flatMap((item) => item.comparison.extractionFieldMatches);
  const extractionMatchCount = extractionChecks.filter((item) => item.match).length;
  const extractionMissCounts = countLabels(
    extractionChecks.filter((item) => !item.match).map((item) => item.label),
  );
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
};

export const validationSummary = (analyses: AnalysisItem[]) => {
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
  const rulesToAdjust = new Set<string>();

  reviewed.forEach(({ analysis, comparison }) => {
    if (comparison.missedTags.includes("POEI")) rulesToAdjust.add("POEI manquée : enrichir les synonymes formation préalable.");
    if (comparison.missedTags.includes("formation facilitée")) rulesToAdjust.add("Formation facilitée manquée : enrichir formation employeur, financement, intégration et certification prise en charge.");
    if (comparison.missedTags.includes("audit")) rulesToAdjust.add("Audit manqué : renforcer rénovation, DPE avec mention, conseil travaux.");
    if (comparison.missedTags.includes("indépendant")) rulesToAdjust.add("Indépendant manqué : durcir agent commercial, franchise, à votre compte.");
    if (comparison.missedTags.includes("salaire flou")) rulesToAdjust.add("Salaire flou manqué : mieux traiter package, selon profil, variable.");
    if (comparison.missedExtractionFields.includes("Titre")) rulesToAdjust.add("Titre mal extrait : privilégier le titre source structuré avant les mots présents dans la description.");
    if (comparison.missedExtractionFields.includes("Entreprise")) rulesToAdjust.add("Entreprise mal extraite : renforcer les blocs Employeur, enseigne et pictos source.");
    if (comparison.missedExtractionFields.includes("Lieu")) rulesToAdjust.add("Lieu mal extrait : conserver les champs source hors description quand ils existent.");
    if (comparison.scoreWarning) rulesToAdjust.add(`${analysis.normalizedTitle} : ${comparison.scoreWarning}.`);
  });

  return {
    reviewed,
    missedCount,
    extraCount,
    warnings,
    verdictMatches,
    verdictCount: verdicts.length,
    rulesToAdjust: [...rulesToAdjust].slice(0, 6),
  };
};

export const offerMarkdown = (analysis: JobAnalysis) => `# ${analysis.normalizedTitle}

Entreprise : ${analysis.company}
export Type entreprise : ${analysis.companyType}
Lieu : ${analysis.location}
Contrat : ${analysis.contract}
Temps de travail : ${analysis.workTime}
Salaire : ${analysis.salary}
Brut / net : ${analysis.salaryKind}
Salaire fixe normalise : ${analysis.normalizedSalary.fixedLabel || analysis.normalizedSalary.label}
Taux horaire normalise : ${analysis.normalizedSalary.hourlyLabel || "non disponible"}
Package avec primes : ${analysis.normalizedSalary.packageLabel || "non estimable"}
Primes : ${analysis.bonus}
Primes estimées : ${analysis.bonusEstimate}
Expérience demandée : ${analysis.requiredExperience}
Avantages : ${analysis.benefits}

Verdict : ${analysis.verdict}
export Type : ${analysis.offerType}
Score global : ${analysis.scores.global}/100
Score local : ${analysis.localScore}/100
Ajustement IA : ${analysis.aiScoreAdjustment > 0 ? "+" : ""}${analysis.aiScoreAdjustment}
Confiance : ${analysis.scoreConfidence}

## Résumé
${analysis.summary}

## Raisons IA
${analysis.aiScoreReasons.length ? analysis.aiScoreReasons.map((item) => `- ${item}`).join("\n") : "- Aucun ajustement IA"}

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

export const exportMarkdown = (analyses: AnalysisItem[]) => {
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
};

export const exportTerrainMarkdown = (analyses: AnalysisItem[]) => {
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
};

export const inferSource = (rawText: string) => {
  const text = rawText
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (text.includes("france travail") || text.includes("pole emploi")) return "France Travail";
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
};

export const collectionChecklist = () => `Checklist collecte Taf Sniffer

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

export const searchPlanText = (strategy: Strategy, queryPlan: ReturnType<typeof generateSearchQueries>) => `Recherche Taf Sniffer

Métier : ${strategy.targetJob}
Zone : ${strategy.location}
Salaire net mini : ${strategy.salaryMin ? `${strategy.salaryMin} €` : "aucun minimum"}
Expérience : ${experienceLabel(strategy.experienceLevel)}
Objectif : ${strategy.objective}

Mots-clés :
${queryPlan.keywords.map((keyword) => `- ${keyword}`).join("\n")}

Sources :
${queryPlan.links.slice(0, 12).map((link) => `- ${link.label} : ${link.url}`).join("\n")}`;


export const emptyRecentDictionaryState = (): RecentDictionaryState => ({ job: [], zone: [] });

export const normalizeRecentDictionaryItem = (value: unknown): RecentDictionaryItem | null => {
  if (!isObject(value) || typeof value.label !== "string" || !value.label.trim()) return null;
  return {
    label: value.label.trim(),
    family: typeof value.family === "string" && value.family.trim() ? value.family.trim() : "Récent",
    aliases: Array.isArray(value.aliases)
      ? value.aliases.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 5)
      : [],
    count: Number.isFinite(Number(value.count)) ? Math.max(1, Number(value.count)) : 1,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
};

export const normalizeRecentDictionaryState = (value: unknown): RecentDictionaryState => {
  if (!isObject(value)) return emptyRecentDictionaryState();
  const normalizeList = (items: unknown) =>
    Array.isArray(items)
      ? items.map(normalizeRecentDictionaryItem).filter((item): item is RecentDictionaryItem => Boolean(item)).slice(0, 8)
      : [];
  return {
    job: normalizeList(value.job),
    zone: normalizeList(value.zone),
  };
};

export const recentItemToSuggestion = (field: DictionaryField, item: RecentDictionaryItem): DictionarySuggestion => ({
  id: `recent-${field}-${normalizeSuggestionText(item.label).replace(/\s+/g, "-")}`,
  label: item.label,
  family: item.family,
  aliases: item.count > 1 ? [`utilisé ${item.count} fois`, ...item.aliases] : item.aliases,
});

export const mergeDictionarySuggestions = (
  field: DictionaryField,
  recentItems: RecentDictionaryItem[],
  dictionaryItems: DictionarySuggestion[],
  query: string,
  limit = 8,
) => {
  const cleanQuery = normalizeSuggestionText(query);
  const recentSuggestions = recentItems
    .filter((item) => {
      if (!cleanQuery) return true;
      const haystack = normalizeSuggestionText([item.label, item.family, ...item.aliases].join(" "));
      return haystack.includes(cleanQuery) || haystack.split(" ").some((word) => word.startsWith(cleanQuery));
    })
    .sort((a, b) => b.count - a.count || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((item) => recentItemToSuggestion(field, item));
  const seen = new Set<string>();
  return [...recentSuggestions, ...dictionaryItems]
    .filter((suggestion) => {
      const key = normalizeSuggestionText(suggestion.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
};

export const splitOfferText = (text: string) =>
  text
    .split(/\n\s*(?:---|###)\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 40);

export const normalizeDedupe = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export const rawFieldValue = (rawText: string, label: string) => {
  const match = rawText.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
};

export const rankingSearchMatches = (item: AnalysisItem, query: string) => {
  const normalizedQuery = normalizeDedupe(query);
  if (!normalizedQuery) return true;
  const { job, analysis } = item;
  const manual = job.manualExtraction ?? {};
  const companyProfile = job.companyProfile;
  const aiReview = job.aiReview;
  const haystack = normalizeDedupe([
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
    job.extractionNotes?.join(" ") || "",
    companyProfile?.estimatedType || "",
    companyProfile?.website || "",
    companyProfile?.signals?.join(" ") || "",
    companyProfile?.summary || "",
    companyProfile?.employerRating?.label || "",
    companyProfile?.employerRating?.summary || "",
    aiReview?.summary || "",
    aiReview?.decisionReasons?.join(" ") || "",
    aiReview?.recruiterQuestions?.join(" ") || "",
    aiReview?.applicationPrep ? JSON.stringify(aiReview.applicationPrep) : "",
    aiReview?.extraction ? JSON.stringify(aiReview.extraction) : "",
    job.rawText,
  ].join(" "));
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

export const looksMissing = (value: string | undefined, fragments: string[]) => {
  const text = normalizeDedupe(value || "");
  return !text || fragments.some((fragment) => text.includes(fragment));
};

export const compactSalaryLabel = (analysis: JobAnalysis) => {
  const salary = analysis.normalizedSalary?.fixedLabel || analysis.normalizedSalary?.label || analysis.salary;
  return looksMissing(salary, ["non indique", "non detecte", "non precise", "salaire non"])
    ? "salaire à vérifier"
    : salary;
};

export const compactContractLabel = (analysis: JobAnalysis) =>
  looksMissing(analysis.contract, ["non precise", "non detecte"]) ? "contrat à vérifier" : analysis.contract;

export const compactLocationLabel = (analysis: JobAnalysis) =>
  looksMissing(analysis.location, ["non detecte", "lieu non"]) ? "lieu à vérifier" : analysis.location;

export const hashString = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};

export const aiJobHash = (job: JobRecord) => hashString(`${job.rawText || ""}\n${JSON.stringify(job.manualExtraction || {})}`);

export const aiStrategyHash = (strategy: Strategy) =>
  hashString(JSON.stringify({
    targetJob: strategy.targetJob,
    location: strategy.location,
    salaryMin: strategy.salaryMin,
    experienceLevel: strategy.experienceLevel,
    contractPreference: strategy.contractPreference,
    poeiRequirement: strategy.poeiRequirement,
    auditRequirement: strategy.auditRequirement,
    independentRequirement: strategy.independentRequirement,
    objective: strategy.objective,
    assistantIntent: strategy.assistantIntent,
    assistantSummary: strategy.assistantSummary,
  }));

export const aiRankScoreFor = (job: JobRecord, strategyHash: string) => {
  const review = job.aiReview;
  if (
    review?.status !== "done" ||
    review.rawTextHash !== aiJobHash(job) ||
    review.strategyHash !== strategyHash ||
    !Number.isFinite(Number(review.aiRankScore))
  ) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(Number(review.aiRankScore))));
};

export const hasFreshAiReview = (job: JobRecord, strategyHash: string) =>
  job.aiReview?.status === "done" &&
  job.aiReview.rawTextHash === aiJobHash(job) &&
  job.aiReview.strategyHash === strategyHash &&
  Boolean(job.aiReview.decisionVerdict);

export const sortAnalysisItems = (items: AnalysisItem[], aiMode: AIMode, strategyHash: string) =>
  items.slice().sort((a, b) => {
    if (aiMode !== "local") {
      const leftAiScore = aiRankScoreFor(a.job, strategyHash);
      const rightAiScore = aiRankScoreFor(b.job, strategyHash);
      if (leftAiScore !== null || rightAiScore !== null) {
        if (leftAiScore === null) return 1;
        if (rightAiScore === null) return -1;
        return rightAiScore - leftAiScore || b.analysis.scores.global - a.analysis.scores.global;
      }
    }
    return b.analysis.scores.global - a.analysis.scores.global;
  });

export const jobDedupeKey = (job: Pick<JobRecord, "id" | "rawText" | "sourceUrl" | "sourceId" | "source">) => {
  if (job.sourceUrl) return `url:${normalizeDedupe(job.sourceUrl)}`;
  if (job.sourceId) return `source:${normalizeDedupe(job.sourceId)}`;
  if (job.id.startsWith("france-travail-")) return `id:${job.id}`;
  const title = rawFieldValue(job.rawText, "Poste");
  const company = rawFieldValue(job.rawText, "Entreprise");
  const location = rawFieldValue(job.rawText, "Lieu");
  if (title && company && location) return `fields:${normalizeDedupe(`${title} ${company} ${location}`)}`;
  return `text:${normalizeDedupe(job.rawText).slice(0, 180)}`;
};

export const isSearchResultUrl = (url?: string) => {
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
    /jobijoba\.com\/fr\/emploi(?:\?|$)/i,
    /talent\.com\/jobs\?/i,
    /optioncarriere\.com\/recherche\/emplois/i,
  ].some((pattern) => pattern.test(value));
};

export const importTitle = (job: Pick<JobRecord, "rawText">) =>
  rawFieldValue(job.rawText, "Poste") ||
  rawFieldValue(job.rawText, "Titre") ||
  rawFieldValue(job.rawText, "Intitulé");

export const isWeakImportTitle = (title: string) => {
  const text = normalizeDedupe(title);
  return !text || text.length < 4 || ["offre importee", "recherche", "emploi", "annonce"].some((term) => text === term || text.includes(`${term} sans titre`));
};

export const importRejectReason = (job: JobRecord) => {
  const title = importTitle(job);
  if (isSearchResultUrl(job.sourceUrl)) return "lien de recherche";
  if (isWeakImportTitle(title)) return "titre inexploitable";
  if (!String(job.source || "").trim()) return "source absente";
  if (!String(job.rawText || "").trim() || job.rawText.length < 260) return "contenu trop court";
  if (!job.sourceUrl && !job.searchUrl && job.rawText.length < 700) return "lien détail absent";
  if (job.extractionQuality === "à vérifier" && !job.sourceUrl && job.rawText.length < 900) return "extraction trop fragile";
  return "";
};

export const prepareImportedRecord = (record: JobRecord, meta: Partial<JobRecord>): JobRecord => {
  const needsReview =
    record.extractionReview === "needs_review" ||
    record.extractionQuality === "à vérifier" ||
    !record.sourceUrl ||
    !record.extractionQuality;
  return {
    ...record,
    favorite: false,
    ignored: false,
    reviewStatus: "a_traiter" as ReviewStatus,
    searchBatchId: meta.searchBatchId ?? record.searchBatchId,
    source: record.source || "",
    datasetLabel: record.datasetLabel || "jeu réel",
    extractionReview: needsReview ? "needs_review" : record.extractionReview || "ok",
    extractionNotes: needsReview
      ? Array.from(new Set([...(record.extractionNotes || []), !record.sourceUrl ? "Lien annonce absent" : "", record.extractionQuality === "à vérifier" ? "Extraction fragile" : ""].filter(Boolean)))
      : record.extractionNotes,
    updatedAt: new Date().toISOString(),
  };
};

export const extractionLabel = (quality?: JobRecord["extractionQuality"]) => quality || "manuelle";

export const hasManualExtraction = (job: JobRecord) => {
  const manual = job.manualExtraction;
  if (!manual) return false;
  return ["title", "company", "location", "contract", "workTime", "salary", "bonus", "requiredExperience", "benefits"].some((field) =>
    Boolean((manual[field as keyof ManualExtraction] || "").trim()),
  );
};

export const extractionReviewValue = (job: JobRecord): ExtractionReviewStatus => {
  if (job.extractionReview === "ok" || job.extractionReview === "needs_review" || job.extractionReview === "manual") {
    return job.extractionReview;
  }
  if (hasManualExtraction(job)) return "manual";
  if (job.extractionQuality === "à vérifier") return "needs_review";
  return "ok";
};

export const extractionReviewLabel = (value: ExtractionReviewStatus) => {
  if (value === "manual") return "Corrigée manuellement";
  if (value === "needs_review") return "À vérifier";
  return "Extraction OK";
};

export const datasetDisplayLabel = (label?: string) => {
  if (!label || label === "jeu réel") return "Recherche";
  if (label === "exemple") return "Exemple";
  return label;
};

export const experienceLabel = (value: Strategy["experienceLevel"]) => {
  if (value === "junior") return "Junior";
  if (value === "confirme") return "Confirmé";
  if (value === "indifferent") return "Indifférent";
  return "Débutant / reconversion";
};

export const contractPreferenceLabel = (value: Strategy["contractPreference"]) => {
  if (value === "cdi") return "CDI";
  if (value === "cdd") return "CDD";
  if (value === "alternance") return "Alternance";
  return "Peu importe";
};

export const normalizeRequirementMode = (value: unknown, legacyEnabled: boolean): RequirementMode => {
  if (value === "off" || value === "prefer" || value === "required") return value;
  return legacyEnabled ? "prefer" : "off";
};

export const nextRequirementMode = (value: RequirementMode): RequirementMode => {
  if (value === "off") return "prefer";
  if (value === "prefer") return "required";
  return "off";
};

export const requirementPatch = (
  key: "poeiRequirement" | "auditRequirement" | "independentRequirement",
  mode: RequirementMode,
): Partial<Strategy> => {
  const patch: Partial<Strategy> = { [key]: mode } as Partial<Strategy>;
  if (key === "poeiRequirement") patch.priorityPoei = mode !== "off";
  if (key === "auditRequirement") patch.priorityAudit = mode !== "off";
  if (key === "independentRequirement") patch.rejectIndependent = mode !== "off";
  return patch;
};

export const contractMatchesPreference = (contractText: string, preference: Strategy["contractPreference"]) => {
  if (preference === "any") return true;
  if (preference === "cdi") return ["cdi", "duree indeterminee"].some((term) => contractText.includes(term));
  if (preference === "cdd") return ["cdd", "duree determinee"].some((term) => contractText.includes(term));
  if (preference === "alternance") {
    return ["alternance", "apprentissage", "professionnalisation"].some((term) => contractText.includes(term));
  }
  return true;
};

export const evaluateDecisionFit = (analysis: JobAnalysis, currentStrategy: Strategy): { fit: DecisionFit; reasons: string[] } => {
  const reasons: string[] = [];
  const activeProfile = getActiveProfile(currentStrategy);
  const contractText = normalizeDedupe(analysis.contract);
  const redFlagsText = normalizeDedupe(analysis.redFlags.join(" "));
  const uncertaintiesText = normalizeDedupe(analysis.uncertainties.join(" "));
  const positivesText = normalizeDedupe(analysis.positiveSignals.join(" "));
  const scoreLabelsText = normalizeDedupe(analysis.scoreLines.map((line) => line.label).join(" "));
  const allSignals = `${redFlagsText} ${uncertaintiesText} ${scoreLabelsText}`;
  const positiveAndScore = `${positivesText} ${scoreLabelsText}`;
  const facilitatedTrainingSignal = [
    "formation facilitee",
    "formation employeur",
    "formation financee",
    "certifications financees",
    "parcours d integration",
    "poei",
    "afpr",
  ].some((term) => positiveAndScore.includes(term) || allSignals.includes(term));
  const strategicPositive = [
    ...activeProfile.analysis.strategicTerms,
    ...activeProfile.analysis.trajectoryTerms,
    activeProfile.ui.strategicDetectedLabel,
    "audit",
    "renovation",
  ].some((term) => positiveAndScore.includes(normalizeDedupe(term)));
  const strategicMissing = allSignals.includes(normalizeDedupe(activeProfile.ui.strategicMissingLabel)) || allSignals.includes("audit energetique non confirme");
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
  if (poeiRequirement === "required" && !facilitatedTrainingSignal) {
    reasons.push("Formation facilitée obligatoire absente");
  }
  if (auditRequirement === "required" && !strategicPositive) {
    reasons.push(activeProfile.ui.strategicRequiredMissingLabel);
  }
  if (analysis.scores.global < 45 || analysis.riskLevel === "élevé") reasons.push("Score faible ou risque élevé");
  if (allSignals.includes("salaire absent") || analysis.salary === "Non indiqué") reasons.push("Salaire absent");
  if (currentStrategy.priorityTraining && allSignals.includes("formation non confirmee")) reasons.push("Formation non confirmée");
  if (poeiRequirement === "prefer" && allSignals.includes("formation facilitee non confirmee")) {
    reasons.push("Formation facilitée non confirmée");
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
  const fit: DecisionFit = hardMismatch ? "weak" : reasons.length ? "review" : "match";
  return { fit, reasons: reasons.slice(0, 3) };
};

export const hasRequiredMismatch = (analysis: JobAnalysis, currentStrategy: Strategy) => {
  const reasons = evaluateDecisionFit(analysis, currentStrategy).reasons.join(" ");
  return (
    reasons.includes("obligatoire") ||
    (currentStrategy.independentRequirement === "required" && reasons.includes("Statut indépendant"))
  );
};

export const decisionFitLabel = (fit: DecisionFit) => {
  if (fit === "match") return "Dans les critères";
  if (fit === "weak") return "Écartée";
  return "À creuser";
};

export const decisionFitClass = (fit: DecisionFit) => {
  if (fit === "match") return "fit-match";
  if (fit === "weak") return "fit-weak";
  return "fit-review";
};

export type QuickDecisionSource = "ia" | "local";
export type QuickDecisionNextAction = "appeler" | "postuler" | "corriger les infos" | "ignorer" | "analyser avec IA";

export type QuickDecisionSummary = {
  verdict: "Bonne piste" | "À creuser" | "Risque" | "Hors cible";
  reasons: string[];
  warnings: string[];
  nextAction: QuickDecisionNextAction;
  source: QuickDecisionSource;
  confidence: ScoreConfidence;
};

export const compactDecisionList = (...groups: Array<Array<string | undefined> | undefined>) => {
  const seen = new Set<string>();
  const items: string[] = [];
  groups.flatMap((group) => group ?? []).forEach((item) => {
    const value = (item || "").trim();
    const key = normalizeDedupe(value);
    if (value && !seen.has(key)) {
      seen.add(key);
      items.push(value);
    }
  });
  return items.slice(0, 3);
};

export const localQuickDecisionVerdict = (
  analysis: JobAnalysis,
  decision: { fit: DecisionFit; reasons: string[] },
): QuickDecisionSummary["verdict"] => {
  const redFlagsText = normalizeDedupe(analysis.redFlags.join(" "));
  const hardRisk =
    redFlagsText.includes("independant") ||
    redFlagsText.includes("formation potentiellement a payer") ||
    redFlagsText.includes("variable") ||
    analysis.riskLevel === "élevé";
  if (decision.fit === "weak") return analysis.scores.global < 35 || decision.reasons.some((reason) => reason.includes("obligatoire")) ? "Hors cible" : "Risque";
  if (hardRisk) return "Risque";
  if (decision.fit === "review" || analysis.scores.global < 65 || analysis.scoreConfidence === "faible") return "À creuser";
  return "Bonne piste";
};

export const quickActionFor = (
  job: JobRecord,
  analysis: JobAnalysis,
  verdict: QuickDecisionSummary["verdict"],
  source: QuickDecisionSource,
): QuickDecisionNextAction => {
  if (extractionReviewValue(job) === "needs_review" || analysis.scoreConfidence === "faible") return "corriger les infos";
  if (source === "local") return "analyser avec IA";
  if (verdict === "Hors cible" || verdict === "Risque") return "ignorer";
  if (verdict === "Bonne piste" && analysis.scores.global >= 72) return "appeler";
  return "postuler";
};

export const quickDecisionVerdictClass = (verdict: QuickDecisionSummary["verdict"]) => {
  if (verdict === "Bonne piste") return "good";
  if (verdict === "Risque") return "risk";
  if (verdict === "Hors cible") return "off";
  return "review";
};

export const companyTypeDisplay = (value: string) => (value === "à identifier" ? "type inconnu" : value);

export const experienceFitLabel = (value: JobAnalysis["experienceFit"]) => {
  if (value === "reconversion_ok") return "0-1 an ok";
  if (value === "junior") return "0-2 ans";
  if (value === "confirme") return "3 ans+";
  return "à vérifier";
};

export const buildDecisionSummary = (analyses: AnalysisItem[], strategy: Strategy) => {
  const reasonCounts = new Map<string, number>();
  const summary = {
    match: 0,
    review: 0,
    weak: 0,
    hiddenWeak: 0,
    topReasons: [] as Array<[string, number]>,
  };

  analyses
    .filter(({ job }) => !job.ignored)
    .forEach(({ analysis }) => {
      const decision = evaluateDecisionFit(analysis, strategy);
      summary[decision.fit] += 1;
      if (decision.fit === "weak" && strategy.hideWeakOffers) summary.hiddenWeak += 1;
      decision.reasons.forEach((reason) => reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1));
    });

  summary.topReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  return summary;
};

export const emptyEmployerRating = (company: string): EmployerRating => ({
  score: null,
  label: "Note à vérifier",
  source: "",
  sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${company} avis employeur salaire avantages`)}`,
  confidence: "faible",
  summary: "Notation employeur non trouvée automatiquement.",
  checkedAt: new Date().toISOString(),
});

export const benefitsListFor = (analysis: JobAnalysis) =>
  analysis.benefits
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && !/non mentionn/i.test(item));

export const employerRankingScore = (salaryMonthlyNet: number, benefitsCount: number, rating: EmployerRating, bestOfferScore: number) => {
  const salaryScore = salaryMonthlyNet ? Math.min(100, Math.max(0, (salaryMonthlyNet / 2800) * 100)) : 35;
  const benefitScore = Math.min(100, benefitsCount * 14);
  const ratingScore = rating.score !== null ? (rating.score / 5) * 100 : 45;
  return Math.round(salaryScore * 0.35 + benefitScore * 0.25 + ratingScore * 0.25 + bestOfferScore * 0.15);
};

export const buildEmployerRanking = (
  analyses: AnalysisItem[],
  ratings: Map<string, EmployerRating>,
): EmployerRankingResult => {
  const groups = new Map<string, AnalysisItem[]>();
  analyses
    .filter(({ job, analysis }) => !job.ignored && !analysis.company.toLowerCase().includes("non précisée"))
    .forEach((item) => {
      const key = item.analysis.company.trim();
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

  const items: EmployerRankingItem[] = [...groups.entries()]
    .map(([company, itemsForCompany]) => {
      const ranked = itemsForCompany.slice().sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
      const best = ranked[0];
      const salaries = itemsForCompany
        .map(({ analysis }) => analysis.normalizedSalary.monthlyNetMax || analysis.normalizedSalary.monthlyNetMin || 0)
        .filter((value) => value > 0);
      const salaryMonthlyNet = salaries.length ? Math.max(...salaries) : 0;
      const benefits = [...new Set(itemsForCompany.flatMap(({ analysis }) => benefitsListFor(analysis)))].slice(0, 8);
      const rating = ratings.get(company) || best.job.companyProfile?.employerRating || emptyEmployerRating(company);
      const score = employerRankingScore(salaryMonthlyNet, benefits.length, rating, best.analysis.scores.global);
      const reasons = [
        salaryMonthlyNet ? `Salaire comparable jusqu'à ${Math.round(salaryMonthlyNet)} € net/mois estimé` : "Salaire à clarifier",
        benefits.length ? `${benefits.length} avantage${benefits.length > 1 ? "s" : ""} détecté${benefits.length > 1 ? "s" : ""}` : "Avantages peu visibles",
        rating.score !== null ? `Note employeur ${rating.label}` : "Note employeur non confirmée",
      ];
      const warnings = [
        ...(rating.score === null ? ["Notation en ligne à vérifier"] : []),
        ...(salaries.length ? [] : ["Salaire non comparable"]),
      ];
      return {
        company,
        companyType: best.analysis.companyType,
        score,
        salaryLabel: salaryMonthlyNet ? `${Math.round(salaryMonthlyNet)} € net/mois estimé` : "Salaire à vérifier",
        salaryMonthlyNet,
        benefits,
        benefitsCount: benefits.length,
        rating,
        offerCount: itemsForCompany.length,
        bestJobId: best.job.id,
        bestTitle: best.analysis.normalizedTitle,
        reasons,
        warnings,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    status: items.some((item) => item.rating.score !== null) ? "done" : "partial",
    checkedAt: new Date().toISOString(),
    message: items.length
      ? "Classement employeurs calculé depuis salaires, avantages et notation publique disponible."
      : "Aucun employeur exploitable à comparer pour l'instant.",
    items,
  };
};

export const normalizeReviewStatus = (job: Pick<JobRecord, "reviewStatus" | "favorite" | "ignored">): ReviewStatus => {
  if (job.reviewStatus === "a_creuser" || job.reviewStatus === "favori" || job.reviewStatus === "ignoree") return job.reviewStatus;
  if (job.ignored) return "ignoree";
  if (job.favorite) return "favori";
  return "a_traiter";
};

export const reviewStatusLabel = (status: ReviewStatus) => {
  if (status === "a_creuser") return "À creuser";
  if (status === "favori") return "Favori";
  if (status === "ignoree") return "Ignorée";
  return "À traiter";
};

export const reviewStatusClass = (status: ReviewStatus) => {
  if (status === "a_creuser") return "status-explore";
  if (status === "favori") return "status-favorite";
  if (status === "ignoree") return "status-ignored";
  return "status-review";
};

export const reviewPatch = (status: ReviewStatus): Partial<JobRecord> => {
  if (status === "favori") return { favorite: true, ignored: false, reviewStatus: "favori" };
  if (status === "ignoree") return { favorite: false, ignored: true, reviewStatus: "ignoree" };
  if (status === "a_creuser") return { favorite: false, ignored: false, reviewStatus: "a_creuser" };
  return { favorite: false, ignored: false, reviewStatus: "a_traiter" };
};

export const isDemo = (job: JobRecord) => job.source === "Démo" || job.datasetLabel === "exemple";

export const bestSelectableId = (jobList: JobRecord[], strategy: Strategy) =>
  (() => {
    const ranked = jobList
      .map((job) => ({ job, analysis: analyzeJob(job, strategy) }))
      .filter(({ job }) => !job.ignored)
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global);
    const bestVisible = ranked.find(({ analysis }) => evaluateDecisionFit(analysis, strategy).fit !== "weak");
    return (bestVisible ?? ranked[0])?.job.id ?? null;
  })();

export const formatSessionDate = (value: string) => {
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
};


export const createSearchSession = (
  strategy: Strategy,
  result: SearchProviderResult,
  batchId: string,
  importedCount: number,
  duplicateCount: number,
): SearchSession => {
  const sourceReports = result.sourceReports ?? [];
  return {
    id: batchId,
    createdAt: new Date().toISOString(),
    keywords: strategy.targetJob || getActiveProfile(strategy).defaultTargetJob,
    location: strategy.location || "",
    sourceReports,
    importedCount,
    duplicateCount,
    skippedCount:
      Number(result.skippedCount || 0) ||
      sourceReports.reduce((total, report) => total + Number(report.skippedCount || 0), 0),
  };
};

export const sourceReportSummary = (reports: SourceReport[]) => {
  const useful = reports.filter((report) => report.count > 0);
  const blocked = reports.filter((report) => report.status === "blocked");
  const skipped = reports.reduce((total, report) => total + Number(report.skippedCount || 0), 0);
  const missingLinks = reports.reduce((total, report) => total + Number(report.missingDetailCount || 0), 0);
  const poor = reports.reduce((total, report) => total + Number(report.poorQualityCount || 0), 0);
  const required = reports.reduce((total, report) => total + Number(report.requiredFilterCount || 0), 0);
  const usefulNames = useful.map((report) => report.source).slice(0, 4).join(", ");
  return {
    usefulCount: useful.length,
    usefulNames,
    blockedCount: blocked.length,
    skipped,
    missingLinks,
    poor,
    required,
  };
};

export const importQualitySummary = (session: SearchSession | null) => {
  const reports = session?.sourceReports ?? [];
  const noisySources = reports
    .filter((report) => Number(report.skippedCount || 0) > 0 || Number(report.poorQualityCount || 0) > 0 || Number(report.missingDetailCount || 0) > 0)
    .sort((a, b) =>
      (Number(b.skippedCount || 0) + Number(b.poorQualityCount || 0) + Number(b.missingDetailCount || 0)) -
      (Number(a.skippedCount || 0) + Number(a.poorQualityCount || 0) + Number(a.missingDetailCount || 0)),
    )
    .slice(0, 3)
    .map((report) => report.source);
  return {
    imported: session?.importedCount ?? 0,
    duplicates: session?.duplicateCount ?? 0,
    skipped: session?.skippedCount ?? 0,
    missingLinks: reports.reduce((total, report) => total + Number(report.missingDetailCount || 0), 0),
    poor: reports.reduce((total, report) => total + Number(report.poorQualityCount || 0), 0),
    required: reports.reduce((total, report) => total + Number(report.requiredFilterCount || 0), 0),
    noisySources,
  };
};

export const extractionQualityScore = (quality?: JobRecord["extractionQuality"]) => {
  if (quality === "complète") return 100;
  if (quality === "partielle") return 65;
  if (quality === "à vérifier") return 35;
  return 50;
};

export const qualityBySource = (jobs: JobRecord[] = []) => {
  const map = new Map<string, { total: number; count: number }>();
  jobs.forEach((job) => {
    const source = job.source || "Source inconnue";
    const current = map.get(source) || { total: 0, count: 0 };
    map.set(source, {
      total: current.total + extractionQualityScore(job.extractionQuality),
      count: current.count + 1,
    });
  });
  return map;
};

export const updateSourceHealthStats = (current: SourceHealthStats, result: SearchProviderResult): SourceHealthStats => {
  const reports = result.sourceReports ?? [];
  if (!reports.length) return current;
  const checkedAt = new Date().toISOString();
  const qualityMap = qualityBySource(result.jobs ?? []);
  const next: SourceHealthStats = { ...current };

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
      qualityScoreTotal: previous.qualityScoreTotal + (quality?.total || 0),
      qualityScoreCount: previous.qualityScoreCount + (quality?.count || 0),
      lastStatus: report.status || "",
      lastMessage: report.message || "",
      lastSearchedAt: checkedAt,
      history: [...previous.history, snapshot].slice(-SOURCE_HEALTH_HISTORY_LIMIT),
    };
  });

  return next;
};

export const sourceHealthRecords = (stats: SourceHealthStats) =>
  Object.values(stats).sort((left, right) => {
    const leftUseful = left.searches ? left.importedCount / left.searches : 0;
    const rightUseful = right.searches ? right.importedCount / right.searches : 0;
    return rightUseful - leftUseful || right.importedCount - left.importedCount || left.source.localeCompare(right.source);
  });

export const sourceHealthKind = (record: SourceHealthRecord) => {
  const searches = Math.max(1, record.searches);
  const blockedRate = record.blockedCount / searches;
  const usefulRate = record.importedCount / searches;
  const noiseRate = record.skippedCount / Math.max(1, record.importedCount + record.skippedCount);
  if (record.importedCount >= 2 && usefulRate >= 0.35 && noiseRate < 0.75) return "useful";
  if (record.searches >= 3 && record.blockedCount >= 2 && blockedRate >= 0.6 && record.importedCount === 0) return "blocked";
  return "watch";
};

export const sourceHealthSummary = (stats: SourceHealthStats) => {
  const grouped = sourceHealthRecords(stats).reduce(
    (acc, record) => {
      acc[sourceHealthKind(record)].push(record);
      return acc;
    },
    { useful: [] as SourceHealthRecord[], watch: [] as SourceHealthRecord[], blocked: [] as SourceHealthRecord[] },
  );
  return grouped;
};


export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
