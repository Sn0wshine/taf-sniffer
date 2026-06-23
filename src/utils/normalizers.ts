import type {
  AIReview,
  CompanyProfile,
  CompanyProfileConfidence,
  CompanyProfileStatus,
  EmployerRating,
  JobRecord,
  SearchSession,
  SourceHealthRecord,
  SourceHealthStats,
  Strategy,
  Top3AIComparison,
} from "../types";
import {
  BACKUP_VERSION,
  DEFAULT_AI_MODE,
  LEGACY_DEFAULT_SALARY_MIN,
  LEGACY_DEFAULT_TARGET_JOB,
  SOURCE_HEALTH_HISTORY_LIMIT,
  defaultStrategy,
} from "../appConstants";
import type { AppView, BackupPayload, StoredUiState, UiMode } from "../appConstants";
import { isObject, normalizeRequirementMode, normalizeReviewStatus, terrainText } from "./jobHelpers";

export const companyProfileStatuses: CompanyProfileStatus[] = ["idle", "loading", "found", "partial", "not_found", "error"];
export const companyProfileConfidences: CompanyProfileConfidence[] = ["faible", "moyenne", "bonne"];
export const aiReviewStatuses = ["idle", "loading", "done", "error", "skipped"];

export const normalizeEmployerRating = (value: unknown): EmployerRating | undefined => {
  if (!isObject(value)) return undefined;
  const rawScore = Number(value.score);
  const confidence = typeof value.confidence === "string" && companyProfileConfidences.includes(value.confidence as CompanyProfileConfidence)
    ? value.confidence as CompanyProfileConfidence
    : "faible";
  return {
    score: Number.isFinite(rawScore) ? Math.max(0, Math.min(5, rawScore)) : null,
    label: typeof value.label === "string" ? value.label : "Note employeur à vérifier",
    source: typeof value.source === "string" ? value.source : "",
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : "",
    confidence,
    summary: typeof value.summary === "string" ? value.summary : "Notation employeur non confirmée.",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString(),
  };
};

export const normalizeCompanyProfile = (
  value: unknown,
  fallbackCompany = "",
  fallbackType = "à vérifier",
): CompanyProfile | undefined => {
  if (!isObject(value)) return undefined;
  const rawStatus = typeof value.status === "string" && companyProfileStatuses.includes(value.status as CompanyProfileStatus)
    ? value.status as CompanyProfileStatus
    : "partial";
  const status = rawStatus === "loading" ? "idle" : rawStatus;
  const confidence = typeof value.confidence === "string" && companyProfileConfidences.includes(value.confidence as CompanyProfileConfidence)
    ? value.confidence as CompanyProfileConfidence
    : "faible";

  return {
    status,
    companyName: typeof value.companyName === "string" ? value.companyName : fallbackCompany,
    estimatedType: typeof value.estimatedType === "string" ? value.estimatedType : fallbackType,
    website: typeof value.website === "string" ? value.website : "",
    signals: Array.isArray(value.signals) ? value.signals.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    confidence,
    summary: typeof value.summary === "string" ? value.summary : "Fiche entreprise à vérifier.",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString(),
    sources: Array.isArray(value.sources) ? value.sources.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
    employerRating: normalizeEmployerRating(value.employerRating),
  };
};

export const companyAutoKey = (company: string) =>
  terrainText(company || "")
    .replace(/\b(sas|sarl|sa|groupe|france|cabinet|entreprise|recrutement|interim|intérim)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const companyProfileChecked = (profile?: CompanyProfile) =>
  Boolean(profile?.checkedAt && profile.status !== "idle" && profile.status !== "loading");

export const cleanAiField = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const normalizeAiQualityStatus = (value: unknown) => {
  const text = String(value || "").toLowerCase();
  if (text === "conflict" || text.includes("incoherent") || text.includes("contradiction")) return "conflict" as const;
  if (text === "verify" || text.includes("verifier") || text.includes("doute")) return "verify" as const;
  return "ok" as const;
};

export const normalizeAiQualityField = (value: unknown) => {
  const item = isObject(value) ? value : {};
  return {
    field: cleanAiField(item.field),
    status: normalizeAiQualityStatus(item.status),
    currentValue: cleanAiField(item.currentValue),
    suggestedValue: cleanAiField(item.suggestedValue),
    reason: cleanAiField(item.reason),
  };
};

export const normalizeAiConfidence = (value: unknown): NonNullable<AIReview["confidence"]> =>
  value === "bonne" || value === "moyenne" || value === "faible" ? value : "faible";

export const normalizeAiDecisionVerdict = (value: unknown): AIReview["decisionVerdict"] => {
  if (value === "bonne_piste" || value === "a_creuser" || value === "risque" || value === "hors_cible") return value;
  return undefined;
};

export const normalizeAiApplicationPrep = (value: unknown): AIReview["applicationPrep"] | undefined => {
  if (!isObject(value)) return undefined;
  return {
    callAngle: cleanAiField(value.callAngle),
    message: cleanAiField(value.message),
    checkpoints: Array.isArray(value.checkpoints) ? value.checkpoints.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
  };
};

export const normalizeAiRankScore = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const score = Math.round(Number(value));
  if (!Number.isFinite(score)) return undefined;
  return Math.max(0, Math.min(100, score));
};

export const normalizeTop3AiComparison = (value: unknown): Top3AIComparison | null => {
  if (!isObject(value)) return null;
  const jobIds = Array.isArray(value.jobIds) ? value.jobIds.filter((item): item is string => typeof item === "string").slice(0, 3) : [];
  return {
    jobIds,
    strategyHash: typeof value.strategyHash === "string" ? value.strategyHash : "",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
    whyFirst: cleanAiField(value.whyFirst),
    riskierOffer: cleanAiField(value.riskierOffer),
    callFirst: cleanAiField(value.callFirst),
    actionSummary: cleanAiField(value.actionSummary),
  };
};

export const normalizeAiQualityCheck = (value: unknown) => {
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
    status: normalizeAiQualityStatus(typeof quality.status === "string" ? quality.status : fallbackStatus),
    confidence: normalizeAiConfidence(quality.confidence),
    fieldChecks,
    warnings: Array.isArray(quality.warnings) ? quality.warnings.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
    suggestedCorrections,
  };
};

export const normalizeAiReview = (value: unknown): AIReview | undefined => {
  if (!isObject(value)) return undefined;
  const rawStatus = typeof value.status === "string" && aiReviewStatuses.includes(value.status) ? value.status : "skipped";
  const extraction = isObject(value.extraction) ? value.extraction : {};
  const scoreAdjustment = Math.max(-12, Math.min(12, Math.round(Number(value.scoreAdjustment || 0))));
  return {
    status: rawStatus === "loading" ? "idle" : rawStatus as AIReview["status"],
    provider: typeof value.provider === "string" ? value.provider : "Gemini",
    model: typeof value.model === "string" ? value.model : "",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
    rawTextHash: typeof value.rawTextHash === "string" ? value.rawTextHash : "",
    strategyHash: typeof value.strategyHash === "string" ? value.strategyHash : "",
    extraction: {
      title: cleanAiField(extraction.title),
      company: cleanAiField(extraction.company),
      location: cleanAiField(extraction.location),
      contract: cleanAiField(extraction.contract),
      workTime: cleanAiField(extraction.workTime),
      salary: cleanAiField(extraction.salary),
      salaryKind: extraction.salaryKind === "brut" || extraction.salaryKind === "net" || extraction.salaryKind === "non précisé"
        ? extraction.salaryKind
        : undefined,
      bonus: cleanAiField(extraction.bonus),
      bonusEstimate: cleanAiField(extraction.bonusEstimate),
      requiredExperience: cleanAiField(extraction.requiredExperience),
      benefits: cleanAiField(extraction.benefits),
      poeiSignal: Boolean(extraction.poeiSignal),
      auditSignal: Boolean(extraction.auditSignal),
      independentSignal: Boolean(extraction.independentSignal),
    },
    summary: typeof value.summary === "string" ? value.summary : "",
    strengths: Array.isArray(value.strengths) ? value.strengths.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    blockers: Array.isArray(value.blockers) ? value.blockers.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    uncertainties: Array.isArray(value.uncertainties) ? value.uncertainties.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    questions: Array.isArray(value.questions) ? value.questions.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    decisionVerdict: normalizeAiDecisionVerdict(value.decisionVerdict),
    decisionReasons: Array.isArray(value.decisionReasons) ? value.decisionReasons.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
    recruiterQuestions: Array.isArray(value.recruiterQuestions) ? value.recruiterQuestions.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    applicationPrep: normalizeAiApplicationPrep(value.applicationPrep),
    aiRankScore: normalizeAiRankScore(value.aiRankScore),
    aiRankReasons: Array.isArray(value.aiRankReasons) ? value.aiRankReasons.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
    salaryRankScore: normalizeAiRankScore(value.salaryRankScore),
    salaryRankReasons: Array.isArray(value.salaryRankReasons) ? value.salaryRankReasons.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
    salaryComparableLabel: cleanAiField(value.salaryComparableLabel),
    salaryWarnings: Array.isArray(value.salaryWarnings) ? value.salaryWarnings.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    scoreAdjustment: Number.isFinite(scoreAdjustment) ? scoreAdjustment : 0,
    scoreReasons: Array.isArray(value.scoreReasons) ? value.scoreReasons.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
    confidence: normalizeAiConfidence(value.confidence),
    qualityCheck: normalizeAiQualityCheck(value.qualityCheck),
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : "",
  };
};

export const normalizeStrategy = (value: unknown): Strategy => {
  if (!isObject(value)) throw new Error("Stratégie absente ou invalide.");
  const candidate = { ...defaultStrategy, ...value };
  const poeiRequirement = normalizeRequirementMode(candidate.poeiRequirement, Boolean(candidate.priorityPoei));
  const auditRequirement = normalizeRequirementMode(candidate.auditRequirement, Boolean(candidate.priorityAudit));
  const independentRequirement = normalizeRequirementMode(candidate.independentRequirement, Boolean(candidate.rejectIndependent));
  const targetJob = typeof candidate.targetJob === "string" && candidate.targetJob.trim() !== LEGACY_DEFAULT_TARGET_JOB
    ? candidate.targetJob
    : "";
  const salaryMin = Number(candidate.salaryMin);

  return {
    profileId:
      typeof candidate.profileId === "string" && candidate.profileId !== "diagnostic_immobilier"
        ? candidate.profileId
        : defaultStrategy.profileId,
    targetJob,
    location: typeof candidate.location === "string" ? candidate.location : defaultStrategy.location,
    salaryMin: Number.isFinite(salaryMin) && salaryMin !== LEGACY_DEFAULT_SALARY_MIN ? salaryMin : defaultStrategy.salaryMin,
    experienceLevel:
      candidate.experienceLevel === "debutant_reconversion" ||
      candidate.experienceLevel === "junior" ||
      candidate.experienceLevel === "confirme" ||
      candidate.experienceLevel === "indifferent"
        ? candidate.experienceLevel
        : defaultStrategy.experienceLevel,
    contractPreference:
      candidate.contractPreference === "any" ||
      candidate.contractPreference === "cdi" ||
      candidate.contractPreference === "cdd" ||
      candidate.contractPreference === "alternance"
        ? candidate.contractPreference
        : defaultStrategy.contractPreference,
    hideWeakOffers: candidate.hideWeakOffers === true,
    poeiRequirement,
    auditRequirement,
    independentRequirement,
    objective: typeof candidate.objective === "string" ? candidate.objective : defaultStrategy.objective,
    assistantIntent: typeof candidate.assistantIntent === "string" ? candidate.assistantIntent : defaultStrategy.assistantIntent,
    assistantSummary: typeof candidate.assistantSummary === "string" ? candidate.assistantSummary : defaultStrategy.assistantSummary,
    aiSearchQueries: Array.isArray(candidate.aiSearchQueries)
      ? candidate.aiSearchQueries.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
    aiSearchPlanCheckedAt: typeof candidate.aiSearchPlanCheckedAt === "string" ? candidate.aiSearchPlanCheckedAt : "",
    priorityTraining: Boolean(candidate.priorityTraining),
    priorityPoei: poeiRequirement !== "off",
    prioritySalary: Boolean(candidate.prioritySalary),
    priorityAudit: auditRequirement !== "off",
    rejectIndependent: independentRequirement !== "off",
    smartSearch: candidate.smartSearch !== false,
    smartLocation: candidate.smartLocation !== false,
  };
};

export const normalizeUiState = (value: unknown): StoredUiState => {
  const fallback: StoredUiState = { mode: "assistant", activeView: "assistant", searchReady: false, showDebugInfo: false, aiAutoAnalyze: false, aiMode: DEFAULT_AI_MODE };
  if (!isObject(value)) return fallback;
  const aiMode = value.aiMode === "ai_full" || value.aiMode === "local" || value.aiMode === "ai_top10"
    ? value.aiMode
    : DEFAULT_AI_MODE;
  const mode: UiMode = value.mode === "advanced" ? "advanced" : "assistant";
  const activeView: AppView =
    value.activeView === "results" || value.activeView === "comparison" || value.activeView === "expert" || value.activeView === "assistant"
      ? value.activeView
      : mode === "advanced"
        ? "expert"
        : "assistant";
  return {
    mode: activeView === "expert" ? "advanced" : "assistant",
    activeView,
    searchReady: Boolean(value.searchReady),
    showDebugInfo: Boolean(value.showDebugInfo),
    aiAutoAnalyze: value.aiAutoAnalyze === true,
    aiMode,
  };
};

export const normalizeSearchSession = (value: unknown): SearchSession | null => {
  if (!isObject(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    keywords: typeof value.keywords === "string" ? value.keywords : "",
    location: typeof value.location === "string" ? value.location : "",
    sourceReports: Array.isArray(value.sourceReports) ? value.sourceReports as SearchSession["sourceReports"] : [],
    importedCount: Number.isFinite(Number(value.importedCount)) ? Number(value.importedCount) : 0,
    duplicateCount: Number.isFinite(Number(value.duplicateCount)) ? Number(value.duplicateCount) : 0,
    skippedCount: Number.isFinite(Number(value.skippedCount)) ? Number(value.skippedCount) : 0,
  };
};

export const normalizeAiSearchPlan = (value: unknown) => {
  if (!isObject(value)) {
    return { queries: [] as string[], summary: "", reasons: [] as string[], message: "Plan IA indisponible." };
  }
  return {
    queries: Array.isArray(value.queries)
      ? value.queries.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : [],
    summary: typeof value.summary === "string" ? value.summary : "",
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 4)
      : [],
    message: typeof value.message === "string" ? value.message : "",
    model: typeof value.model === "string" ? value.model : "",
  };
};

export const normalizeSourceHealthStats = (value: unknown): SourceHealthStats => {
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
      } satisfies SourceHealthRecord]];
    }),
  );
};

export const normalizeBackup = (payload: unknown): BackupPayload => {
  if (!isObject(payload)) throw new Error("Le fichier n'est pas une sauvegarde Taf Sniffer valide.");
  if (payload.version !== BACKUP_VERSION) throw new Error("Version de sauvegarde non prise en charge.");
  if (!Array.isArray(payload.jobs)) throw new Error("La liste des annonces est absente ou invalide.");

  const jobs = payload.jobs.map((job, index) => {
    if (!isObject(job) || typeof job.id !== "string" || typeof job.rawText !== "string") {
      throw new Error(`Annonce invalide à la position ${index + 1}.`);
    }

    return {
      ...job,
      favorite: Boolean(job.favorite),
      ignored: Boolean(job.ignored),
      reviewStatus: normalizeReviewStatus({ ...job, favorite: Boolean(job.favorite), ignored: Boolean(job.ignored) }),
      companyProfile: normalizeCompanyProfile(job.companyProfile),
      aiReview: normalizeAiReview(job.aiReview),
    } as JobRecord;
  });

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : new Date().toISOString(),
    strategy: normalizeStrategy(payload.strategy),
    uiState: normalizeUiState(payload.uiState),
    lastSearchSession: normalizeSearchSession(payload.lastSearchSession),
    lastTop3AiComparison: normalizeTop3AiComparison(payload.lastTop3AiComparison),
    sourceHealthStats: normalizeSourceHealthStats(payload.sourceHealthStats),
    jobs,
  };
};
