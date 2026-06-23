import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  ListFilter,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { analyzeJob, createJobRecord, getControlledExtraction } from "./analysis";
import { embeddedDebugGeminiKey } from "./buildFlags";
import { demoOffers, extractionTestOffers } from "./demoData";
import { franceTravailProxyProvider, proxyBase, shouldTryProxy } from "./searchProvider";
import { generateSearchQueries, zoneSuggestions } from "./searchQueries";
import { compareValidation, detectedValidationTags, validationTags } from "./validation";
import { APP_VERSION_LABEL } from "./appVersion";
import { analyzeJobsWithLocalGemini, buildLocalGeminiSearchPlan } from "./clientGeminiProvider";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { DEFAULT_PROFILE_ID, getActiveProfile } from "./jobProfiles";
import {
  filterDictionarySuggestions,
  jobSuggestions,
  normalizeSuggestionText,
  zoneDictionarySuggestions,
  type DictionarySuggestion,
} from "./suggestionDictionary";
import type {
  DecisionFit,
  CompanyProfile,
  CompanyProfileConfidence,
  CompanyProfileStatus,
  EmployerRankingItem,
  EmployerRankingResult,
  EmployerRating,
  ExpectedReview,
  ExtractionReviewStatus,
  JobAnalysis,
  JobRecord,
  ManualExtraction,
  NetworkDiagnosticsResult,
  ReviewStatus,
  RequirementMode,
  ScoreConfidence,
  SearchProviderResult,
  SearchSession,
  SourceHealthRecord,
  SourceHealthStats,
  SourceReport,
  Strategy,
  Top3AIComparison,
  ValidationTag,
  AIReview,
  ControlledExtractionValues,
  ControlledExtractionField,
  AIMode,
  CompanyEnrichment,
} from "./types";
import type {
  AnalysisItem,
  AppView,
  AssistantRuntimeState,
  BackupPayload,
  DictionaryField,
  ExpertTab,
  ExtractionDraft,
  RankingFilter,
  RecentDictionaryItem,
  RecentDictionaryState,
  StoredUiState,
  SwipeRankAction,
  TopPick,
  UiMode,
} from "./appConstants";
import {
  BACKUP_VERSION,
  COLLECTION_TARGET,
  DEFAULT_AI_MODE,
  DICTIONARY_RECENTS_KEY,
  FACILITATED_TRAINING_LABEL,
  LEGACY_DEFAULT_SALARY_MIN,
  LEGACY_DEFAULT_TARGET_JOB,
  LOCAL_GEMINI_KEY,
  RANK_SWIPE_MAX,
  RANK_SWIPE_THRESHOLD,
  SESSION_KEY,
  SOURCE_HEALTH_HISTORY_LIMIT,
  SOURCE_HEALTH_KEY,
  STORAGE_KEY,
  STRATEGY_KEY,
  TOP3_AI_KEY,
  UI_KEY,
  aiModeDescriptions,
  aiModeLabels,
  appViewDescriptions,
  appViewLabels,
  defaultStrategy,
  expertTabLabels,
} from "./appConstants";
import type {
  QuickDecisionSource,
  QuickDecisionNextAction,
  QuickDecisionSummary,
} from "./utils/jobHelpers";
import {
  aiJobHash,
  aiRankScoreFor,
  aiStrategyHash,
  benefitsListFor,
  buildCalibrationReport,
  buildDecisionSummary,
  buildEmployerRanking,
  buildTerrainActionPlan,
  buildTerrainBlockers,
  buildTerrainReport,
  calibrationRuleFor,
  collectionChecklist,
  compactContractLabel,
  compactDecisionList,
  compactLocationLabel,
  compactSalaryLabel,
  companyTypeDisplay,
  confidenceClass,
  contractMatchesPreference,
  contractPreferenceLabel,
  correctedExtractionLabels,
  countLabels,
  countTags,
  createSearchSession,
  datasetDisplayLabel,
  decisionFitClass,
  decisionFitLabel,
  emptyEmployerRating,
  emptyRecentDictionaryState,
  employerRankingScore,
  evaluateDecisionFit,
  experienceFitLabel,
  experienceLabel,
  exportMarkdown,
  exportTerrainMarkdown,
  extractionLabel,
  extractionQualityScore,
  extractionReviewLabel,
  extractionReviewValue,
  formatSessionDate,
  getTopPicks,
  hasFreshAiReview,
  hasManualExtraction,
  hasRequiredMismatch,
  hashString,
  importQualitySummary,
  importRejectReason,
  importTitle,
  inferSource,
  isAnnotatedJob,
  isCorrectedJob,
  isDemo,
  bestSelectableId,
  isObject,
  isRealWorldJob,
  isSearchResultUrl,
  isTerrainSorted,
  isWeakImportTitle,
  jobDedupeKey,
  localQuickDecisionVerdict,
  looksMissing,
  mergeDictionarySuggestions,
  metricTone,
  normalizeExpectedReview,
  normalizeRecentDictionaryItem,
  normalizeRecentDictionaryState,
  normalizeRequirementMode,
  normalizeReviewStatus,
  nextRequirementMode,
  offerMarkdown,
  pickBest,
  prefillExpectedExtraction,
  prepareImportedRecord,
  qualityBySource,
  quickActionFor,
  quickDecisionVerdictClass,
  rankingSearchMatches,
  rawFieldValue,
  recentItemToSuggestion,
  requirementPatch,
  reviewPatch,
  reviewStatusClass,
  reviewStatusLabel,
  riskClass,
  scoreClass,
  searchPlanText,
  sortAnalysisItems,
  sourceHealthKind,
  sourceHealthRecords,
  sourceHealthSummary,
  sourceReportSummary,
  splitOfferText,
  terrainAiQualityReasons,
  terrainCorrectionReasons,
  terrainNotReadyRows,
  terrainQualityLabel,
  terrainQueueRows,
  terrainText,
  terrainValidationStatus,
  updateSourceHealthStats,
  validationSummary,
  hasExpectedExtraction,
  expectedExtractionInputs,
  normalizeDedupe
} from "./utils/jobHelpers";
import {
  aiReviewStatuses,
  cleanAiField,
  companyAutoKey,
  companyProfileChecked,
  companyProfileConfidences,
  companyProfileStatuses,
  normalizeAiApplicationPrep,
  normalizeAiConfidence,
  normalizeAiDecisionVerdict,
  normalizeAiQualityCheck,
  normalizeAiQualityField,
  normalizeAiQualityStatus,
  normalizeAiRankScore,
  normalizeAiReview,
  normalizeAiSearchPlan,
  normalizeBackup,
  normalizeCompanyProfile,
  normalizeEmployerRating,
  normalizeSearchSession,
  normalizeSourceHealthStats,
  normalizeStrategy,
  normalizeTop3AiComparison,
  normalizeUiState,
} from "./utils/normalizers";
import {
  FieldHelp,
  HelpTooltip,
  InfoChip,
  InfoTooltip,
  InlineHelp,
  RequirementChip,
  requirementTooltip,
} from "./components/ui/Tooltips";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const loadLocalGeminiKey = () => {
  try {
    return localStorage.getItem(LOCAL_GEMINI_KEY) || embeddedDebugGeminiKey;
  } catch {
    return embeddedDebugGeminiKey;
  }
};

const saveLocalGeminiKey = (value: string) => {
  try {
    const clean = value.trim();
    if (clean) localStorage.setItem(LOCAL_GEMINI_KEY, clean);
    else localStorage.removeItem(LOCAL_GEMINI_KEY);
  } catch {
    // Local Gemini is optional and must never block the app.
  }
};



const buildQuickDecisionSummary = (
  job: JobRecord,
  analysis: JobAnalysis,
  decision: { fit: DecisionFit; reasons: string[] },
  currentStrategy: Strategy,
): QuickDecisionSummary => {
  const review = job.aiReview;
  const aiUsable = review?.status === "done" && Boolean(review.decisionVerdict);
  const qualityWarnings = review?.status === "done" ? importantQualityIssues(review).map((item) => item.reason || `${item.field} à vérifier`) : [];
  const localWarnings = compactDecisionList(decision.reasons, analysis.redFlags, analysis.uncertainties);
  const confidence: ScoreConfidence =
    review?.confidence ||
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
    decision.fit === "match" && analysis.scoreConfidence === "bonne" ? [] : [`${activeProfile.ui.strategicRequirementLabel}, formation facilitée ou salaire à confirmer si besoin.`],
  );
  return {
    verdict,
    reasons: reasons.length ? reasons : [analysis.summary],
    warnings,
    nextAction: quickActionFor(job, analysis, verdict, "local"),
    source: "local",
    confidence,
  };
};

const scrollDetailPanelIntoView = () => {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

export function App() {
  const [strategy, setStrategy] = useState<Strategy>(() => {
    const stored = {
      ...defaultStrategy,
      ...loadJson(STRATEGY_KEY, defaultStrategy),
    };
    const poeiRequirement = normalizeRequirementMode(stored.poeiRequirement, Boolean(stored.priorityPoei));
    const auditRequirement = normalizeRequirementMode(stored.auditRequirement, Boolean(stored.priorityAudit));
    const independentRequirement = normalizeRequirementMode(stored.independentRequirement, Boolean(stored.rejectIndependent));
    const targetJob = typeof stored.targetJob === "string" && stored.targetJob.trim() !== LEGACY_DEFAULT_TARGET_JOB
      ? stored.targetJob
      : "";
    const salaryMin = Number(stored.salaryMin);

    return {
      ...stored,
      profileId: typeof stored.profileId === "string" && stored.profileId !== "diagnostic_immobilier" ? stored.profileId : defaultStrategy.profileId,
      targetJob,
      poeiRequirement,
      auditRequirement,
      independentRequirement,
      priorityPoei: poeiRequirement !== "off",
      priorityAudit: auditRequirement !== "off",
      rejectIndependent: independentRequirement !== "off",
      salaryMin: Number.isFinite(salaryMin) && salaryMin !== LEGACY_DEFAULT_SALARY_MIN ? salaryMin : defaultStrategy.salaryMin,
      location: stored.location === "Ile-de-France" || stored.location === "Île-de-France" ? "" : stored.location,
      objective:
        stored.objective === "Entrer vite dans le metier avec formation interne, puis evoluer vers audit energetique." ||
        stored.objective === "Entrer vite dans le métier avec formation interne, puis évoluer vers audit énergétique."
          ? ""
          : stored.objective,
      assistantIntent: typeof stored.assistantIntent === "string" ? stored.assistantIntent : "",
      assistantSummary: typeof stored.assistantSummary === "string" ? stored.assistantSummary : "",
      aiSearchQueries: Array.isArray(stored.aiSearchQueries)
        ? stored.aiSearchQueries.filter((item: unknown): item is string => typeof item === "string").slice(0, 8)
        : [],
      aiSearchPlanCheckedAt: typeof stored.aiSearchPlanCheckedAt === "string" ? stored.aiSearchPlanCheckedAt : "",
    };
  });
  const [jobs, setJobs] = useState<JobRecord[]>(() =>
    loadJson<JobRecord[]>(STORAGE_KEY, []).map((job) => ({
      ...job,
      favorite: Boolean(job.favorite),
      ignored: Boolean(job.ignored),
      reviewStatus: normalizeReviewStatus(job),
      companyProfile: normalizeCompanyProfile(job.companyProfile),
      aiReview: normalizeAiReview(job.aiReview),
    })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [editingExtractionId, setEditingExtractionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RankingFilter>("to_review");
  const [rankingSearch, setRankingSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [uiState, setUiState] = useState<StoredUiState>(() =>
    normalizeUiState(loadJson(UI_KEY, { mode: "assistant", activeView: "assistant", searchReady: false, showDebugInfo: false, aiAutoAnalyze: false, aiMode: DEFAULT_AI_MODE })),
  );
  const [loadingAction, setLoadingAction] = useState("");
  const [searchResult, setSearchResult] = useState<SearchProviderResult>({
    source: "Taf Sniffer local",
    sourceQuery: "",
    status: "idle",
    offers: [],
    message: "Prêt.",
  });
  const [lastSearchSession, setLastSearchSession] = useState<SearchSession | null>(() =>
    normalizeSearchSession(loadJson(SESSION_KEY, null)),
  );
  const [lastTop3AiComparison, setLastTop3AiComparison] = useState<Top3AIComparison | null>(() =>
    normalizeTop3AiComparison(loadJson(TOP3_AI_KEY, null)),
  );
  const [sourceHealthStats, setSourceHealthStats] = useState<SourceHealthStats>(() =>
    normalizeSourceHealthStats(loadJson(SOURCE_HEALTH_KEY, {})),
  );
  const [recentDictionary, setRecentDictionary] = useState<RecentDictionaryState>(() =>
    normalizeRecentDictionaryState(loadJson(DICTIONARY_RECENTS_KEY, emptyRecentDictionaryState())),
  );
  const [networkDiagnostics, setNetworkDiagnostics] = useState<NetworkDiagnosticsResult | null>(null);
  const [companyCache, setCompanyCache] = useState<Record<string, CompanyEnrichment | "loading" | "error">>({});
  const [employerRanking, setEmployerRanking] = useState<EmployerRankingResult | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [localGeminiKey, setLocalGeminiKey] = useState(loadLocalGeminiKey);
  const [localGeminiDraft, setLocalGeminiDraft] = useState("");
  const [aiFallbackMessage, setAiFallbackMessage] = useState("");
  const [assistantRuntime, setAssistantRuntime] = useState<AssistantRuntimeState>("idle");
  const [assistantHistoryVisible, setAssistantHistoryVisible] = useState(false);
  const [expertTab, setExpertTab] = useState<ExpertTab>("offer");
  const [darkMode, setDarkMode] = useState<boolean>(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [rankingWidth, setRankingWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sniffer.split');
    return saved ? Number(saved) : 340;
  });
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const aiManualQueueRef = useRef<Map<string, JobRecord>>(new Map());
  const aiManualQueueTimerRef = useRef<number | null>(null);
  const companyAutoQueueRef = useRef<Map<string, { company: string; companyType: string; jobIds: string[] }>>(new Map());
  const companyAutoInFlightRef = useRef<Set<string>>(new Set());
  const companyAutoTimerRef = useRef<number | null>(null);
  const previousStrategyHashRef = useRef<string | null>(null);
  const autoAiTimerRef = useRef<number | null>(null);
  const assistantIntroTimerRef = useRef<number | null>(null);
  const searchPlanPrefetchRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(STRATEGY_KEY, JSON.stringify(strategy));
  }, [strategy]);

  useEffect(() => {
    localStorage.setItem(UI_KEY, JSON.stringify(uiState));
  }, [uiState]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (lastSearchSession) localStorage.setItem(SESSION_KEY, JSON.stringify(lastSearchSession));
    else localStorage.removeItem(SESSION_KEY);
  }, [lastSearchSession]);

  useEffect(() => {
    if (lastTop3AiComparison) localStorage.setItem(TOP3_AI_KEY, JSON.stringify(lastTop3AiComparison));
    else localStorage.removeItem(TOP3_AI_KEY);
  }, [lastTop3AiComparison]);

  useEffect(() => {
    if (Object.keys(sourceHealthStats).length) localStorage.setItem(SOURCE_HEALTH_KEY, JSON.stringify(sourceHealthStats));
    else localStorage.removeItem(SOURCE_HEALTH_KEY);
  }, [sourceHealthStats]);

  useEffect(() => {
    localStorage.setItem(DICTIONARY_RECENTS_KEY, JSON.stringify(recentDictionary));
  }, [recentDictionary]);

  useEffect(() => {
    if (!optionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!optionsMenuRef.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOptionsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [optionsOpen]);

  const currentStrategyHash = aiStrategyHash(strategy);
  const nonDemoJobs = useMemo(() => jobs.filter((job) => !isDemo(job)), [jobs]);

  const localAnalyses = useMemo(
    () =>
      nonDemoJobs
        .map((job) => ({
          job,
          analysis: analyzeJob(job, strategy),
        }))
        .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global),
    [nonDemoJobs, strategy],
  );
  const analyses = useMemo(
    () => sortAnalysisItems(localAnalyses, uiState.aiMode, currentStrategyHash),
    [localAnalyses, uiState.aiMode, currentStrategyHash],
  );

  const latestBatchId = lastSearchSession?.id ?? null;
  const tabFilteredAnalyses = analyses.filter(({ job, analysis }) => {
    const status = normalizeReviewStatus(job);
    if (filter === "all") return true;
    if (filter === "new") return latestBatchId ? job.searchBatchId === latestBatchId : true;
    if (filter === "to_review") {
      const decision = evaluateDecisionFit(analysis, strategy);
      return !job.ignored && !job.favorite && status !== "a_creuser" && !hasRequiredMismatch(analysis, strategy) && (!strategy.hideWeakOffers || decision.fit !== "weak");
    }
    if (filter === "to_explore") return !job.ignored && status === "a_creuser";
    if (filter === "favorites") return job.favorite;
    if (filter === "ignored") return job.ignored;
    return true;
  });
  const visibleAnalyses = tabFilteredAnalyses.filter((item) => rankingSearchMatches(item, rankingSearch));

  const eligibleAnalyses = analyses.filter(({ job, analysis }) => !job.ignored && !hasRequiredMismatch(analysis, strategy));
  const activeView = uiState.activeView;
  const isAssistant = activeView === "assistant";
  const isResultsView = activeView === "results";
  const isComparisonView = activeView === "comparison";
  const isAdvanced = activeView === "expert";
  const selectedCandidate = analyses.find(({ job }) => job.id === selectedId);
  const selected = selectedCandidate && !hasRequiredMismatch(selectedCandidate.analysis, strategy)
    ? selectedCandidate
    : activeView !== "assistant"
      ? eligibleAnalyses[0] ?? selectedCandidate ?? analyses[0] ?? null
      : selectedCandidate ?? null;
  const reviewCount = analyses.filter(
    ({ job, analysis }) =>
      !job.ignored &&
      !job.favorite &&
      normalizeReviewStatus(job) !== "a_creuser" &&
      !hasRequiredMismatch(analysis, strategy) &&
      (!strategy.hideWeakOffers || evaluateDecisionFit(analysis, strategy).fit !== "weak"),
  ).length;
  const exploreCount = nonDemoJobs.filter((job) => !job.ignored && normalizeReviewStatus(job) === "a_creuser").length;
  const favoriteCount = nonDemoJobs.filter((job) => job.favorite).length;
  const newCount = latestBatchId ? nonDemoJobs.filter((job) => job.searchBatchId === latestBatchId).length : 0;
  const ignoredCount = nonDemoJobs.filter((job) => job.ignored).length;
  const topThree = eligibleAnalyses.slice(0, 3);
  const activeProfile = getActiveProfile(strategy);
  const isAiRanking = uiState.aiMode !== "local";
  const topPicks = isAiRanking
    ? topThree.map((item, index) => ({
        kind: index === 0 ? "Priorité IA" : `Choix IA #${index + 1}`,
        reason: item.job.aiReview?.status === "done" && item.job.aiReview.aiRankReasons?.length
          ? item.job.aiReview.aiRankReasons.slice(0, 2).join(" · ")
          : "Préselection locale en attente de score Gemini.",
        item,
      }))
    : getTopPicks(eligibleAnalyses, activeProfile);
  const topPickIds = topPicks.map(({ item }) => item.job.id);
  const activeTop3AiComparison =
    lastTop3AiComparison &&
    lastTop3AiComparison.strategyHash === aiStrategyHash(strategy) &&
    topPickIds.length > 0 &&
    topPickIds.every((id, index) => lastTop3AiComparison.jobIds[index] === id)
      ? lastTop3AiComparison
      : null;
  const queryPlan = generateSearchQueries(strategy);
  const decisionSummary = buildDecisionSummary(analyses, strategy);
  const sessionIgnoredCount = lastSearchSession
    ? nonDemoJobs.filter((job) => job.searchBatchId === lastSearchSession.id && job.ignored).length
    : 0;
  const assistantResultsVisible = isResultsView || assistantRuntime === "collapsed";
  const assistantDetailVisible = isResultsView || (isAdvanced && expertTab === "offer") || (isAssistant && Boolean(selectedId));
  const showAssistantHistoryPanel = isAssistant && !assistantResultsVisible && !assistantHistoryVisible && nonDemoJobs.length > 0;
  const showAssistantHistoryRail = isAssistant && !assistantResultsVisible && assistantHistoryVisible;
  const showRankingRail = isResultsView || (isAssistant && assistantResultsVisible) || showAssistantHistoryPanel || showAssistantHistoryRail;

  const startAssistant = () => {
    if (assistantIntroTimerRef.current !== null) window.clearTimeout(assistantIntroTimerRef.current);
    setAssistantRuntime("introFading");
    assistantIntroTimerRef.current = window.setTimeout(() => {
      assistantIntroTimerRef.current = null;
      setAssistantRuntime("active");
    }, 1000);
  };

  const showAssistantHistory = () => {
    setAssistantHistoryVisible(true);
    setSelectedId(null);
  };

  const resetAssistantRuntimeState = () => {
    if (assistantIntroTimerRef.current !== null) {
      window.clearTimeout(assistantIntroTimerRef.current);
      assistantIntroTimerRef.current = null;
    }
    setAssistantRuntime("idle");
    setAssistantHistoryVisible(false);
    setSelectedId(null);
    setDraft("");
    setDraftSource("");
    setDraftUrl("");
    setEditingExtractionId(null);
    setFilter("to_review");
    setRankingSearch("");
    setStatusMessage("");
    setLoadingAction("");
    setSearchResult({ source: "Taf Sniffer local", sourceQuery: "", status: "idle", offers: [], message: "Prêt." });
    setNetworkDiagnostics(null);
    setEmployerRanking(null);
    setAiFallbackMessage("");
  };

  const rememberDictionaryValue = (field: DictionaryField, label: string, family = "Récent", aliases: string[] = []) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    setRecentDictionary((current) => {
      const key = normalizeSuggestionText(cleanLabel);
      const existing = current[field].find((item) => normalizeSuggestionText(item.label) === key);
      const nextItem: RecentDictionaryItem = {
        label: cleanLabel,
        family,
        aliases,
        count: (existing?.count ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      const nextList = [nextItem, ...current[field].filter((item) => normalizeSuggestionText(item.label) !== key)]
        .sort((a, b) => b.count - a.count || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 8);
      return { ...current, [field]: nextList };
    });
  };

  const addOffers = (text: string, action = "add-offers", meta: Partial<JobRecord> = {}) => {
    startLoading(action);
    const chunks = splitOfferText(text);

    if (chunks.length === 0) {
      if (action !== "run-search") stopLoading(120);
      return { importedCount: 0, duplicateCount: 0, mergedJobs: jobs };
    }

    const nextJobs = chunks.map((chunk) => ({
      ...createJobRecord(chunk),
      reviewStatus: "a_traiter" as ReviewStatus,
      searchBatchId: meta.searchBatchId,
      source: draftSource.trim() || inferSource(chunk),
      sourceUrl: draftUrl.trim(),
      datasetLabel: "jeu réel",
      ...meta,
    }));
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = nextJobs.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = nextJobs.length - unique.length;
    const mergedJobs = [...unique, ...jobs];
    setJobs(mergedJobs);
    setSelectedId(bestSelectableId(mergedJobs, strategy) ?? selectedId);
    setDraft("");
    setDraftSource("");
    setDraftUrl("");
    setFilter("to_review");
    setStatusMessage(
      unique.length
        ? `${unique.length} offre${unique.length > 1 ? "s" : ""} analysée${unique.length > 1 ? "s" : ""}.`
        : "Recherche relancée : aucune nouvelle offre à ajouter.",
    );
    if (action !== "run-search") stopLoading();
    return { importedCount: unique.length, duplicateCount, mergedJobs };
  };

  const addJobRecords = (records: JobRecord[], message: string, meta: Partial<JobRecord> = {}) => {
    const preparedRecords = records.map((record) => prepareImportedRecord(record, meta));
    const rejected = preparedRecords.filter((record) => importRejectReason(record));
    const validRecords = preparedRecords.filter((record) => !importRejectReason(record));
    if (validRecords.length === 0) {
      const reason = rejected[0] ? ` (${importRejectReason(rejected[0])})` : "";
      setStatusMessage(`Aucune offre assez propre à importer${reason}.`);
      return { importedCount: 0, duplicateCount: 0, rejectedCount: rejected.length, mergedJobs: jobs };
    }

    const nextJobs = validRecords;
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = nextJobs.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = nextJobs.length - unique.length;
    const mergedJobs = [...unique, ...jobs];
    setJobs(mergedJobs);
    setSelectedId(bestSelectableId(mergedJobs, strategy) ?? nextJobs[0]?.id ?? selectedId);
    setDraft("");
    setFilter("to_review");
    setStatusMessage(unique.length ? message : "Recherche relancée : aucune nouvelle offre à ajouter.");
    return { importedCount: unique.length, duplicateCount, rejectedCount: rejected.length, mergedJobs };
  };

  const loadDemo = () => {
    const demoJobs = demoOffers.map((offer) => ({
      ...createJobRecord(offer),
      datasetLabel: "exemple",
      source: "Démo",
      reviewStatus: "a_traiter" as ReviewStatus,
    }));
    setJobs(demoJobs);
    setSelectedId(demoJobs[0]?.id ?? null);
    setFilter("to_review");
    setLastSearchSession(null);
    setStatusMessage("Exemples chargés.");
  };

  const loadExtractionTests = () => {
    const testJobs = extractionTestOffers.map((test) => ({
      ...createJobRecord(test.rawText),
      datasetLabel: "test extraction",
      source: test.source,
      sourceUrl: test.sourceUrl,
      reviewStatus: "a_traiter" as ReviewStatus,
      expectedReview: {
        expectedVerdict: "" as const,
        expectedTags: [],
        expectedExtraction: test.expectedExtraction,
        notes: "Cas de validation extraction.",
      },
    }));
    setJobs(testJobs);
    setSelectedId(testJobs[0]?.id ?? null);
    setFilter("to_review");
    setLastSearchSession(null);
    setLastTop3AiComparison(null);
    setStatusMessage("Tests d'extraction chargés.");
  };

  const updateJob = (id: string, patch: Partial<JobRecord>) => {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job)),
    );
  };

  const handleRankSwipe = (id: string, action: SwipeRankAction, currentStatus: ReviewStatus) => {
    let newStatus: ReviewStatus;
    if (action === "explore") {
      newStatus = currentStatus === "a_creuser" ? "favori" : "a_creuser";
    } else {
      newStatus = "ignoree";
    }
    updateJob(id, reviewPatch(newStatus));
    if (selectedId === id) setSelectedId(null);
    setStatusMessage(
      action === "explore"
        ? newStatus === "favori" ? "Offre ajoutée aux favoris." : "Offre gardée pour plus tard."
        : "Offre envoyée dans les ignorées."
    );
  };

  const fetchCompanyProfile = async (company: string, companyType: string) => {
    const response = await fetch(`${proxyBase()}/api/company-profile?company=${encodeURIComponent(company)}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || "Identification indisponible, vérifie manuellement.");
    return normalizeCompanyProfile(payload, company, companyType) ?? {
      status: "partial" as const,
      companyName: company,
      estimatedType: companyType,
      website: "",
      signals: [],
      confidence: "faible" as const,
      summary: "Fiche entreprise à vérifier.",
      checkedAt: new Date().toISOString(),
      sources: [],
    };
  };

  const runCompanyAutoQueue = () => {
    companyAutoTimerRef.current = null;
    while (companyAutoInFlightRef.current.size < 2 && companyAutoQueueRef.current.size > 0) {
      const [key, item] = companyAutoQueueRef.current.entries().next().value as [string, { company: string; companyType: string; jobIds: string[] }];
      companyAutoQueueRef.current.delete(key);
      companyAutoInFlightRef.current.add(key);
      const baseProfile: CompanyProfile = {
        status: "loading",
        companyName: item.company,
        estimatedType: item.companyType,
        website: "",
        signals: [],
        confidence: "faible",
        summary: "Identification en cours.",
        checkedAt: new Date().toISOString(),
        sources: [],
      };
      const targetIds = new Set(item.jobIds);
      setJobs((current) =>
        current.map((job) =>
          targetIds.has(job.id) && !companyProfileChecked(job.companyProfile)
            ? { ...job, companyProfile: baseProfile, updatedAt: new Date().toISOString() }
            : job,
        ),
      );
      void fetchCompanyProfile(item.company, item.companyType)
        .then((profile) => {
          setJobs((current) =>
            current.map((job) =>
              targetIds.has(job.id)
                ? { ...job, companyProfile: profile, updatedAt: new Date().toISOString() }
                : job,
            ),
          );
        })
        .catch(() => {
          setJobs((current) =>
            current.map((job) =>
              targetIds.has(job.id)
                ? {
                    ...job,
                    companyProfile: {
                      ...baseProfile,
                      status: "error",
                      summary: "Identification indisponible, vérifie manuellement.",
                      checkedAt: new Date().toISOString(),
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : job,
            ),
          );
        })
        .finally(() => {
          companyAutoInFlightRef.current.delete(key);
          if (companyAutoQueueRef.current.size > 0 && companyAutoTimerRef.current === null) {
            companyAutoTimerRef.current = window.setTimeout(runCompanyAutoQueue, 350);
          }
        });
    }
  };

  const scheduleCompanyAutoQueue = () => {
    if (companyAutoTimerRef.current !== null) return;
    companyAutoTimerRef.current = window.setTimeout(runCompanyAutoQueue, 450);
  };

  const queueAutomaticCompanyChecks = (items: AnalysisItem[]) => {
    const grouped = new Map<string, { company: string; companyType: string; jobIds: string[]; profile?: CompanyProfile }>();
    items.forEach(({ job, analysis }) => {
      const key = companyAutoKey(analysis.company);
      if (!key || key.includes("non precise") || key.length < 3) return;
      const current = grouped.get(key) || { company: analysis.company, companyType: analysis.companyType, jobIds: [] };
      if (companyProfileChecked(job.companyProfile)) current.profile = current.profile || job.companyProfile;
      else if (job.companyProfile?.status !== "loading") current.jobIds.push(job.id);
      grouped.set(key, current);
    });

    grouped.forEach((item, key) => {
      if (item.profile && item.jobIds.length > 0) {
        const targetIds = new Set(item.jobIds);
        const profile = item.profile;
        setJobs((current) =>
          current.map((job) =>
            targetIds.has(job.id)
              ? { ...job, companyProfile: profile, updatedAt: new Date().toISOString() }
              : job,
          ),
        );
        return;
      }
      if (
        item.jobIds.length === 0 ||
        companyAutoInFlightRef.current.has(key) ||
        companyAutoQueueRef.current.has(key)
      ) {
        return;
      }
      companyAutoQueueRef.current.set(key, item);
    });

    if (companyAutoQueueRef.current.size > 0) scheduleCompanyAutoQueue();
  };

  const buildExtractionPatch = (job: JobRecord, draft: ExtractionDraft): Partial<JobRecord> => {
    const detected = analyzeJob({ ...job, manualExtraction: undefined, extractionReview: undefined }, strategy);
    const manual: ManualExtraction = {};
    const candidates: Array<[keyof ManualExtraction, string, string]> = [
      ["title", draft.title, detected.normalizedTitle],
      ["company", draft.company, detected.company],
      ["location", draft.location, detected.location],
      ["contract", draft.contract, detected.contract],
      ["workTime", draft.workTime, detected.workTime],
      ["salary", draft.salary, detected.salary],
      ["bonus", draft.bonus, detected.bonus],
      ["requiredExperience", draft.requiredExperience, detected.requiredExperience],
      ["benefits", draft.benefits, detected.benefits],
    ];

    candidates.forEach(([field, value, detectedValue]) => {
      const cleanValue = value.trim();
      if (cleanValue && cleanValue !== detectedValue) manual[field] = cleanValue;
    });

    const hasManual = Object.keys(manual).length > 0;
    return {
      manualExtraction: hasManual ? { ...manual, updatedAt: new Date().toISOString() } : undefined,
      extractionReview: hasManual ? "manual" : draft.extractionReview,
      source: draft.source.trim(),
      sourceUrl: draft.sourceUrl.trim(),
    };
  };

  const saveExtraction = (id: string, draft: ExtractionDraft) => {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    updateJob(id, buildExtractionPatch(job, draft));
    setEditingExtractionId(null);
    setStatusMessage("Infos extraites mises à jour.");
  };

  const clearExtraction = (id: string) => {
    updateJob(id, { manualExtraction: undefined, extractionReview: undefined });
    setEditingExtractionId(null);
    setStatusMessage("Corrections d'extraction effacées.");
  };

  const identifyCompany = async (job: JobRecord, analysis: JobAnalysis) => {
    if (!analysis.companySearchUrl) return;
    const action = `identify-company-${job.id}`;
    const baseProfile: CompanyProfile = {
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
      const profile = await fetchCompanyProfile(analysis.company, analysis.companyType);
      updateJob(job.id, { companyProfile: profile });
      setStatusMessage(profile.status === "not_found" ? "Entreprise à vérifier manuellement." : "Fiche entreprise mise à jour.");
    } catch {
      updateJob(job.id, {
        companyProfile: {
          ...baseProfile,
          status: "error",
          summary: "Identification indisponible, vérifie manuellement.",
          checkedAt: new Date().toISOString(),
        },
      });
      setStatusMessage("Identification indisponible, vérifie manuellement.");
    } finally {
      stopLoading();
    }
  };

  const rankEmployers = async () => {
    const companyNames = [
      ...new Set(
        analyses
          .filter(({ job, analysis }) => !job.ignored && !analysis.company.toLowerCase().includes("non précisée"))
          .map(({ analysis }) => analysis.company.trim())
          .filter(Boolean),
      ),
    ].slice(0, 6);

    if (!companyNames.length) {
      setEmployerRanking(buildEmployerRanking(analyses, new Map()));
      setStatusMessage("Aucun employeur identifiable à comparer.");
      return;
    }

    startLoading("rank-employers");
    const ratings = new Map<string, EmployerRating>();
    for (const company of companyNames) {
      try {
        const response = await fetch(`${proxyBase()}/api/employer-rating?company=${encodeURIComponent(company)}`);
        const payload = await response.json().catch(() => null);
        ratings.set(company, response.ok ? normalizeEmployerRating(payload) || emptyEmployerRating(company) : emptyEmployerRating(company));
      } catch {
        ratings.set(company, emptyEmployerRating(company));
      }
    }

    const result = buildEmployerRanking(analyses, ratings);
    setEmployerRanking(result);
    setStatusMessage(result.items.length ? "Classement employeurs mis à jour." : "Aucun employeur exploitable à comparer.");
    stopLoading();
  };

  const updateExpectedReview = (id: string, patch: Partial<ExpectedReview>) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === id
          ? {
              ...job,
              expectedReview: {
                ...normalizeExpectedReview(job),
                ...patch,
              },
              updatedAt: new Date().toISOString(),
            }
          : job,
      ),
    );
  };

  const deleteJob = (id: string) => {
    setJobs((current) => current.filter((job) => job.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const copyQuestions = async (questions: string[]) => {
    await navigator.clipboard.writeText(questions.join("\n"));
    setStatusMessage("Questions copiées.");
  };

  const copySummary = async (analysis: JobAnalysis) => {
    await navigator.clipboard.writeText(offerMarkdown(analysis));
    setStatusMessage("Résumé copié en Markdown.");
  };

  const copyExport = async () => {
    startLoading("copy-export");
    await navigator.clipboard.writeText(exportMarkdown(analyses));
    setStatusMessage("Synthèse complète copiée en Markdown.");
    stopLoading();
  };

  const copyTerrainReport = async () => {
    startLoading("copy-terrain-report");
    await navigator.clipboard.writeText(exportTerrainMarkdown(analyses));
    setStatusMessage("Rapport terrain copié en Markdown.");
    stopLoading();
  };

  const copyKeywords = async () => {
    startLoading("copy-keywords");
    await navigator.clipboard.writeText(queryPlan.keywords.join("\n"));
    setStatusMessage("Mots-clés copiés.");
    stopLoading();
  };

  const copyChecklist = async () => {
    startLoading("copy-checklist");
    await navigator.clipboard.writeText(collectionChecklist());
    setStatusMessage("Checklist de collecte copiée.");
    stopLoading();
  };

  const exportBackup = () => {
    startLoading("export-backup");
    const backup: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      strategy,
      uiState,
      lastSearchSession,
      lastTop3AiComparison,
      sourceHealthStats,
      jobs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taf-sniffer-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Sauvegarde JSON exportée.");
    stopLoading();
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    startLoading("import-backup");
    try {
      const backup = normalizeBackup(JSON.parse(await file.text()));
      setJobs(backup.jobs);
      setStrategy(backup.strategy);
      setUiState(backup.uiState);
      setLastSearchSession(backup.lastSearchSession);
      setLastTop3AiComparison(backup.lastTop3AiComparison ?? null);
      setSourceHealthStats(backup.sourceHealthStats ?? {});
      setSelectedId(backup.jobs[0]?.id ?? null);
      setFilter("to_review");
      setDraft("");
      setDraftSource("");
      setDraftUrl("");
      setSearchResult({ source: "Taf Sniffer local", sourceQuery: "", status: "idle", offers: [], message: "Prêt." });
      setStatusMessage(`Sauvegarde importée : ${backup.jobs.length} annonce${backup.jobs.length > 1 ? "s" : ""} restaurée${backup.jobs.length > 1 ? "s" : ""}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Import impossible : fichier invalide.");
    }
    stopLoading();
  };

  const startLoading = (action: string) => setLoadingAction(action);
  const stopLoading = (delay = 450) => {
    window.setTimeout(() => setLoadingAction(""), delay);
  };

  const setAppView = (view: AppView) => {
    setUiState((current) => ({ ...current, activeView: view, mode: view === "expert" ? "advanced" : "assistant" }));
    if (view === "assistant") {
      setAssistantRuntime("idle");
      setAssistantHistoryVisible(false);
      setSelectedId(null);
    } else {
      setSelectedId((current) => current ?? bestSelectableId(nonDemoJobs, strategy) ?? nonDemoJobs[0]?.id ?? null);
    }
  };
  const setUiMode = (mode: UiMode) => {
    setAppView(mode === "advanced" ? "expert" : "assistant");
  };
  const setAiMode = (aiMode: AIMode) => {
    setUiState((current) => ({ ...current, aiMode }));
    if (aiMode === "local") setAiFallbackMessage("");
  };

  const saveLocalGeminiDraft = () => {
    const clean = localGeminiDraft.trim();
    if (!clean) {
      setStatusMessage("Colle une clé Gemini avant d'enregistrer.");
      return;
    }
    saveLocalGeminiKey(clean);
    setLocalGeminiKey(clean);
    setLocalGeminiDraft("");
    setStatusMessage("Clé Gemini locale enregistrée sur cet appareil.");
  };

  const clearLocalGemini = () => {
    saveLocalGeminiKey("");
    setLocalGeminiKey("");
    setLocalGeminiDraft("");
    setStatusMessage("Clé Gemini locale effacée de cet appareil.");
  };

  const updateSimpleStrategy = (patch: Partial<Strategy>) => {
    setStrategy((current) => ({
      ...current,
      aiSearchQueries: [],
      aiSearchPlanCheckedAt: "",
      ...patch,
    }));
    setUiState((current) => ({ ...current, searchReady: false }));
    setLastSearchSession(null);
    setLastTop3AiComparison(null);
    setSearchResult((current) => ({ ...current, status: "idle", message: "Prêt.", offers: [] }));
  };

  const refineRanking = (patch: Partial<Strategy>) => {
    setStrategy((current) => ({ ...current, ...patch }));
  };

  const relanceWith = (patch: Partial<Strategy>) => {
    const patchedStrategy: Strategy = {
      ...strategy,
      aiSearchQueries: [],
      aiSearchPlanCheckedAt: "",
      ...patch,
    };
    setStrategy(patchedStrategy);
    setUiState((current) => ({ ...current, searchReady: false }));
    setLastSearchSession(null);
    setLastTop3AiComparison(null);
    setSearchResult((current) => ({ ...current, status: "idle", message: "Prêt.", offers: [] }));
    void runSearch(patchedStrategy);
  };

  const selectOffer = (id: string) => {
    setSelectedId(id);
    if (uiState.activeView === "assistant" && assistantHistoryVisible) {
      setUiState((current) => ({ ...current, activeView: "results", mode: "assistant" }));
    } else if (uiState.activeView === "comparison") {
      setUiState((current) => ({ ...current, activeView: "results", mode: "assistant" }));
    }
    scrollDetailPanelIntoView();
  };

  const aiReviewFresh = (job: JobRecord, strategyHash: string) => hasFreshAiReview(job, strategyHash);

  const aiLocalAnalysisPayload = (job: JobRecord) => {
    const analysis = analyzeJob({ ...job, aiReview: undefined }, strategy);
    return {
      title: analysis.normalizedTitle,
      company: analysis.company,
      location: analysis.location,
      contract: analysis.contract,
      workTime: analysis.workTime,
      salary: analysis.salary,
      salaryKind: analysis.salaryKind,
      salaryComparable: analysis.normalizedSalary?.fixedLabel || analysis.normalizedSalary?.label,
      salaryHourlyComparable: analysis.normalizedSalary?.hourlyLabel,
      salaryPackageComparable: analysis.normalizedSalary?.packageLabel,
      bonus: analysis.bonus,
      bonusEstimate: analysis.bonusEstimate,
      requiredExperience: analysis.requiredExperience,
      benefits: analysis.benefits,
      positiveSignals: analysis.positiveSignals.slice(0, 8),
      redFlags: analysis.redFlags.slice(0, 8),
      uncertainties: analysis.uncertainties.slice(0, 8),
    };
  };

  const buildPreferenceMemory = () => {
    const compactOffer = ({ job, analysis }: AnalysisItem) => ({
      title: analysis.normalizedTitle,
      company: analysis.company,
      score: analysis.scores.global,
      status: normalizeReviewStatus(job),
      reasons: analysis.verdictReasons.slice(0, 2),
    });
    const favorites = analyses.filter(({ job }) => job.favorite).slice(0, 5).map(compactOffer);
    const ignored = analyses.filter(({ job }) => job.ignored).slice(0, 5).map(compactOffer);
    const toExplore = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser").slice(0, 5).map(compactOffer);
    const weakHiddenCount = analyses.filter(({ analysis }) => evaluateDecisionFit(analysis, strategy).fit === "weak").length;
    return {
      summary: "Préférences déduites localement des favoris, offres ignorées et offres à creuser. Ne pas inventer de préférence absente.",
      favorites,
      ignored,
      toExplore,
      weakHiddenCount: strategy.hideWeakOffers ? weakHiddenCount : 0,
      defaultBias: "Favoriser les offres formatrices, stables, compatibles reconversion, avec salaire clair et peu de risque indépendant.",
    };
  };

  const automaticAiCandidates = (targetJobs = jobs, mode: AIMode = uiState.aiMode) => {
    if (mode === "local") return [];
    const ranked = targetJobs
      .map((job) => ({ job, analysis: analyzeJob(job, strategy) }))
      .filter(({ job, analysis }) => !job.ignored && !hasRequiredMismatch(analysis, strategy))
      .sort((a, b) => b.analysis.scores.global - a.analysis.scores.global)
      .map(({ job }) => job);
    return mode === "ai_full" ? ranked : ranked.slice(0, 10);
  };

  const analyzeJobsWithAi = async (targetJobs = jobs, force = false, allowWhenAutoDisabled = false, captureTop3Comparison = false) => {
    if (uiState.aiMode === "local") {
      setAiFallbackMessage("");
      if (force || allowWhenAutoDisabled) setStatusMessage("Mode Local rapide actif : aucun appel Gemini.");
      return;
    }
    const strategyHash = currentStrategyHash;
    const candidates = targetJobs
      .filter((job) => !job.ignored)
      .filter((job) => force || !aiReviewFresh(job, strategyHash))
      .slice(0, uiState.aiMode === "ai_full" ? targetJobs.length : 25);
    const targetOrder = new Map(targetJobs.map((job, index) => [job.id, index + 1]));

    if (candidates.length === 0) {
      if (force || allowWhenAutoDisabled) setStatusMessage("Avis intelligents déjà à jour.");
      return;
    }

    startLoading("ai-analyze");
    setStatusMessage(`Analyse intelligente de ${candidates.length} offre${candidates.length > 1 ? "s" : ""}...`);
    try {
      const reviews = new Map<string, AIReview>();
      let latestPayload: Record<string, unknown> | null = null;
      let top3ComparisonPayload: Record<string, unknown> | null = null;
      const preferenceMemory = buildPreferenceMemory();
      for (let index = 0; index < candidates.length; index += 25) {
        const batch = candidates.slice(index, index + 25);
        if (candidates.length > 25) {
          setStatusMessage(`Analyse intelligente lot ${Math.floor(index / 25) + 1}/${Math.ceil(candidates.length / 25)}...`);
        }
        const jobsPayload = batch.map((job) => ({
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
            score: analyzeJob(job, strategy).scores.global,
            verdict: analyzeJob(job, strategy).verdict,
          },
          rawTextHash: aiJobHash(job),
        }));
        let payload: Record<string, unknown> | null = null;
        try {
          if (!shouldTryProxy()) throw new Error("Proxy IA non disponible en mode Android.");
          const response = await fetchWithTimeout(`${proxyBase()}/api/ai/analyze-jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategy,
              strategyHash,
              preferenceMemory,
              jobs: jobsPayload,
            }),
          }, 5000);
          payload = await response.json().catch(() => null);
          const payloadError = isObject(payload?.error) ? payload.error : null;
          if (!response.ok || !payload || payload.configured === false) {
            throw new Error(
              (payloadError && typeof payloadError.message === "string" ? payloadError.message : "")
              || (typeof payload?.message === "string" ? payload.message : "")
              || "Analyse intelligente indisponible.",
            );
          }
        } catch (proxyError) {
          if (!localGeminiKey) throw proxyError;
          setAiFallbackMessage("Proxy IA indisponible, utilisation de la clé Gemini locale.");
          setStatusMessage("Proxy IA indisponible, utilisation de la clé Gemini locale.");
          payload = await analyzeJobsWithLocalGemini({
            strategy,
            strategyHash,
            preferenceMemory,
            jobs: jobsPayload,
            apiKey: localGeminiKey,
          }) as unknown as Record<string, unknown>;
        }
        latestPayload = payload;
        if (!top3ComparisonPayload && isObject(payload.top3Comparison)) {
          top3ComparisonPayload = payload.top3Comparison;
        }
        (Array.isArray(payload.reviews) ? payload.reviews : [])
          .map((raw: unknown) => {
            const review = normalizeAiReview(raw);
            const id = isObject(raw) && typeof raw.id === "string" ? raw.id : "";
            return review && id ? [id, review] as const : null;
          })
          .filter((entry: readonly [string, AIReview] | null): entry is readonly [string, AIReview] => Boolean(entry))
          .forEach((entry: readonly [string, AIReview]) => reviews.set(entry[0], entry[1]));
      }

      setJobs((current) =>
        current.map((job) => {
          const review = reviews.get(job.id);
          return review ? { ...job, aiReview: review, updatedAt: new Date().toISOString() } : job;
        }),
      );
      if (captureTop3Comparison) {
        const comparison = normalizeTop3AiComparison({
          ...(top3ComparisonPayload || {}),
          jobIds: targetJobs.slice(0, 3).map((job) => job.id),
          strategyHash,
          checkedAt: new Date().toISOString(),
        });
        if (comparison && (comparison.whyFirst || comparison.riskierOffer || comparison.callFirst || comparison.actionSummary)) {
          setLastTop3AiComparison(comparison);
        }
      }
      const doneCount = [...reviews.values()].filter((review) => review.status === "done").length;
      if (doneCount > 0) setAiFallbackMessage("");
      else setAiFallbackMessage("Gemini n'a pas renvoyé d'analyse exploitable. Tri local provisoire.");
      setStatusMessage(
        doneCount
          ? `Avis intelligent ajouté sur ${doneCount} offre${doneCount > 1 ? "s" : ""}.`
          : typeof latestPayload?.message === "string" ? latestPayload.message : "Analyse intelligente non configurée.",
      );
    } catch (error) {
      const isAbort = error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
      const message = isAbort ? "Délai dépassé — analyse IA abandonnée." : error instanceof Error ? error.message : "Analyse intelligente indisponible.";
      setStatusMessage(message);
      setAiFallbackMessage(`${message} Tri local provisoire.`);
      const failedIds = new Set(candidates.map((job) => job.id));
      setJobs((current) =>
        current.map((job) =>
          failedIds.has(job.id)
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
            : job,
        ),
      );
    }
    stopLoading();
  };

  const queueManualAiAnalysis = (job: JobRecord) => {
    if (job.ignored) return;
    aiManualQueueRef.current.set(job.id, job);
    const strategyHash = aiStrategyHash(strategy);
    setJobs((current) =>
      current.map((item) =>
        item.id === job.id
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
          : item,
      ),
    );
    const count = aiManualQueueRef.current.size;
    setStatusMessage(
      count > 1
        ? `${count} offres ajoutées au lot IA. Analyse groupée dans un instant.`
        : "Offre ajoutée au lot IA. Analyse groupée dans un instant.",
    );
    if (aiManualQueueTimerRef.current !== null) window.clearTimeout(aiManualQueueTimerRef.current);
    aiManualQueueTimerRef.current = window.setTimeout(async () => {
      const batch = [...aiManualQueueRef.current.values()];
      aiManualQueueRef.current.clear();
      aiManualQueueTimerRef.current = null;
      await analyzeJobsWithAi(batch, true);
    }, 1200);
  };

  const runAutomaticAiAnalysis = async (targetJobs: JobRecord[]) => {
    if (uiState.aiMode === "local") {
      setAiFallbackMessage("");
      return;
    }
    const candidates = automaticAiCandidates(targetJobs);
    if (candidates.length === 0) return;
    await analyzeJobsWithAi(candidates, false, true, true);
  };

  const runNetworkDiagnostics = async () => {
    startLoading("network-diagnostics");
    try {
      const response = await fetch(`${proxyBase()}/api/network-diagnostics`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !isObject(payload)) throw new Error("Diagnostic indisponible");
      const diagnostics = payload as NetworkDiagnosticsResult;
      setNetworkDiagnostics(diagnostics);
      setStatusMessage(diagnostics.message);
    } catch {
      const diagnostics: NetworkDiagnosticsResult = {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: "Diagnostic connexion indisponible : le serveur local ne répond pas.",
        sources: [],
      };
      setNetworkDiagnostics(diagnostics);
      setStatusMessage(diagnostics.message);
    } finally {
      stopLoading();
    }
  };

  const assistantSummaryDraft = (target: Strategy) => {
    const parts = [
      target.targetJob ? `Métier : ${target.targetJob}` : "",
      target.assistantIntent ? `Intention : ${target.assistantIntent}` : "",
      target.location ? `Zone : ${target.location}` : "Zone : France entière",
      target.salaryMin ? `Salaire net mini : ${target.salaryMin} €` : "",
      target.experienceLevel ? `Expérience : ${experienceLabel(target.experienceLevel)}` : "",
      target.contractPreference && target.contractPreference !== "any" ? `Contrat : ${contractPreferenceLabel(target.contractPreference)}` : "",
      target.poeiRequirement === "required" ? `${FACILITATED_TRAINING_LABEL} obligatoire` : target.poeiRequirement === "prefer" ? `${FACILITATED_TRAINING_LABEL} appréciée` : "",
      target.auditRequirement === "required" ? `${getActiveProfile(target).ui.strategicRequirementLabel} obligatoire` : "",
      target.independentRequirement !== "off" ? "Éviter indépendant imposé" : "",
    ].filter(Boolean);
    return parts.join(". ");
  };

  const prepareAssistantSearchStrategy = async (baseStrategy: Strategy) => {
    if (uiState.mode !== "assistant") return baseStrategy;
    const hasIntent = Boolean(baseStrategy.targetJob.trim() || baseStrategy.assistantIntent.trim());
    if (!hasIntent) {
      setStatusMessage("Indique au moins un métier ou une intention métier avant de lancer la recherche.");
      return null;
    }
    if (baseStrategy.aiSearchQueries?.length) return baseStrategy;

    const summary = baseStrategy.assistantSummary.trim() || assistantSummaryDraft(baseStrategy);
    const requestStrategy = { ...baseStrategy, assistantSummary: summary };

    if (uiState.aiMode === "local") {
      const nextStrategy: Strategy = {
        ...requestStrategy,
        aiSearchQueries: [],
        aiSearchPlanCheckedAt: "",
      };
      setStrategy(nextStrategy);
      setAiFallbackMessage("");
      setStatusMessage("Mode Local rapide actif : recherche sans plan Gemini.");
      return nextStrategy;
    }

    setStatusMessage("Préparation du plan de recherche IA...");

    try {
      let rawPayload: unknown = null;
      let fallbackUsed = false;
      try {
        if (!shouldTryProxy()) throw new Error("Proxy IA non disponible en mode Android.");
        const response = await fetchWithTimeout(`${proxyBase()}/api/ai/search-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategy: requestStrategy }),
        }, 20000);
        rawPayload = await response.json().catch(() => null);
        const rawObject = isObject(rawPayload) ? rawPayload : {};
        const payloadError = isObject(rawObject.error) ? rawObject.error : null;
        if (!response.ok || rawObject.configured === false) {
          throw new Error(
            (payloadError && typeof payloadError.message === "string" ? payloadError.message : "")
            || (typeof rawObject.message === "string" ? rawObject.message : "")
            || "Plan IA indisponible.",
          );
        }
      } catch (proxyError) {
        if (!localGeminiKey) throw proxyError;
        fallbackUsed = true;
        setAiFallbackMessage("Proxy IA indisponible, utilisation de la clé Gemini locale.");
        setStatusMessage("Proxy IA indisponible, utilisation de la clé Gemini locale.");
        rawPayload = await buildLocalGeminiSearchPlan(requestStrategy, localGeminiKey);
      }
      const payload = normalizeAiSearchPlan(rawPayload);
      const nextStrategy: Strategy = {
        ...requestStrategy,
        assistantSummary: payload.summary || summary,
        aiSearchQueries: payload.queries,
        aiSearchPlanCheckedAt: new Date().toISOString(),
      };
      setStrategy(nextStrategy);
      if (payload.queries.length) {
        setStatusMessage(
          fallbackUsed
            ? `Plan IA prêt via clé Gemini locale : ${payload.queries.length} requêtes de recherche.`
            : `Plan IA prêt : ${payload.queries.length} requêtes de recherche.`,
        );
      } else {
        setStatusMessage(payload.message || "Plan IA indisponible, recherche locale utilisée.");
      }
      return nextStrategy;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan IA indisponible.";
      const nextStrategy: Strategy = {
        ...requestStrategy,
        aiSearchQueries: [],
        aiSearchPlanCheckedAt: "",
      };
      setStrategy(nextStrategy);
      setAiFallbackMessage(`${message} Recherche locale utilisée.`);
      return nextStrategy;
    }
  };

  // Pré-chauffe le plan Gemini dès que l'utilisateur arrive sur l'étape Résumé, pendant
  // qu'il lit la synthèse — le clic « Valider et rechercher » devient alors quasi instantané
  // au lieu d'attendre le LLM. No-op si un plan existe déjà, en mode local, ou si déjà en vol.
  const prefetchAssistantSearchPlan = () => {
    if (uiState.mode !== "assistant" || uiState.aiMode === "local") return;
    if (searchPlanPrefetchRef.current) return;
    if (strategy.aiSearchQueries?.length) return;
    if (!strategy.targetJob.trim() && !strategy.assistantIntent.trim()) return;
    searchPlanPrefetchRef.current = true;
    void prepareAssistantSearchStrategy(strategy).finally(() => {
      searchPlanPrefetchRef.current = false;
    });
  };

  const runSearch = async (strategyOverride?: Strategy) => {
    const effectiveStrategy = strategyOverride ?? strategy;
    startLoading("run-search");
    if (uiState.mode === "assistant") {
      setAssistantRuntime("searching");
      setAssistantHistoryVisible(false);
    }
    try {
      const searchStrategy = await prepareAssistantSearchStrategy(effectiveStrategy);
      if (!searchStrategy) {
        if (uiState.mode === "assistant") setAssistantRuntime("active");
        return;
      }
      if (uiState.mode === "assistant") {
        rememberDictionaryValue("job", searchStrategy.targetJob);
        rememberDictionaryValue("zone", searchStrategy.location);
      }
      const result = await franceTravailProxyProvider.search(searchStrategy, jobs, draft);
      setSearchResult(result);
      setUiState((current) => ({ ...current, searchReady: true }));
      if (result.networkStatus !== "blocked") {
        setSourceHealthStats((current) => updateSourceHealthStats(current, result));
      }
      const batchId = `search-${Date.now().toString(36)}`;
      let aiTargetJobs: JobRecord[] | null = null;

      if (result.jobs?.length) {
        const stats = addJobRecords(result.jobs, result.message, { searchBatchId: batchId });
        const adjustedResult = { ...result, skippedCount: Number(result.skippedCount || 0) + stats.rejectedCount };
        setLastSearchSession(createSearchSession(searchStrategy, adjustedResult, batchId, stats.importedCount, stats.duplicateCount));
        aiTargetJobs = stats.mergedJobs;
      } else if (result.offers.length > 0) {
        const stats = addOffers(result.offers.join("\n---\n"), "run-search", { searchBatchId: batchId, datasetLabel: "jeu réel" });
        setLastSearchSession(createSearchSession(searchStrategy, result, batchId, stats.importedCount, stats.duplicateCount));
        aiTargetJobs = stats.mergedJobs;
      } else if (result.status === "readyWithLocalOffers") {
        setFilter("to_review");
        setSelectedId(bestSelectableId(nonDemoJobs, searchStrategy) ?? nonDemoJobs[0]?.id ?? null);
        setLastSearchSession(createSearchSession(searchStrategy, result, batchId, 0, 0));
        setStatusMessage(result.message);
        aiTargetJobs = jobs;
      } else {
        setLastSearchSession(null);
        setStatusMessage(result.message);
      }

      if (uiState.mode === "assistant") {
        if (result.status === "needsConnector") {
          setAssistantRuntime("collapsed");
          setAssistantHistoryVisible(true);
        } else if (!result.jobs?.length && result.offers.length === 0 && aiTargetJobs !== jobs) {
          setAssistantRuntime("active");
        } else {
          setAssistantRuntime("collapsed");
          setAssistantHistoryVisible(true);
        }
      }
      if (aiTargetJobs && uiState.aiMode !== "local" && result.status !== "needsConnector") {
        await runAutomaticAiAnalysis(aiTargetJobs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recherche indisponible.";
      setStatusMessage(`${message} Tu peux réessayer ou passer en Local rapide.`);
      if (uiState.mode === "assistant") setAssistantRuntime("active");
    } finally {
      stopLoading();
    }
  };

  const openSearches = () => {
    startLoading("open-searches");
    const preferred = ["France Travail", "Hellowork", "Jooble", "Indeed", "Apec", "Meteojob", "LinkedIn", "Google"];
    const opened = preferred
      .map((source) => queryPlan.links.find((link) => link.source === source))
      .filter(Boolean)
      .slice(0, 8);
    opened.forEach((link) => window.open(link!.url, "_blank", "noopener,noreferrer"));
    setStatusMessage(`${opened.length} sources ouvertes. Si le navigateur bloque les onglets, utilise le mode avancé.`);
    stopLoading();
  };

  const copySearchPlan = async () => {
    startLoading("copy-search-plan");
    await navigator.clipboard.writeText(searchPlanText(strategy, queryPlan));
    setStatusMessage("Plan de recherche copié.");
    stopLoading();
  };

  useEffect(() => {
    if (previousStrategyHashRef.current === null) {
      previousStrategyHashRef.current = currentStrategyHash;
      return;
    }
    if (previousStrategyHashRef.current === currentStrategyHash) return;
    previousStrategyHashRef.current = currentStrategyHash;
    setLastTop3AiComparison(null);
    if (autoAiTimerRef.current !== null) window.clearTimeout(autoAiTimerRef.current);
    if (uiState.aiMode === "local" || nonDemoJobs.length === 0) {
      setAiFallbackMessage("");
      return;
    }
    autoAiTimerRef.current = window.setTimeout(() => {
      autoAiTimerRef.current = null;
      void runAutomaticAiAnalysis(jobs);
    }, 900);
  }, [currentStrategyHash, uiState.aiMode, jobs]);

  useEffect(() => {
    if (analyses.length === 0) return;
    queueAutomaticCompanyChecks(analyses);
  }, [analyses]);

  useEffect(() => () => {
    if (companyAutoTimerRef.current !== null) window.clearTimeout(companyAutoTimerRef.current);
  }, []);

  useEffect(() => {
    const company = selected?.analysis.company;
    if (!company || company.length < 2 || companyCache[company]) return;
    setCompanyCache((prev) => ({ ...prev, [company]: "loading" }));
    fetch(`${proxyBase()}/api/company-info?q=${encodeURIComponent(company)}`)
      .then((r) => r.json())
      .then((data) => {
        const best = data?.results?.[0];
        setCompanyCache((prev) => ({ ...prev, [company]: best || "error" }));
      })
      .catch(() => setCompanyCache((prev) => ({ ...prev, [company]: "error" })));
  }, [selected?.analysis.company]);

  const importPanel = (
    <section className={`import-strip ${isAdvanced ? "" : "one-button-import secondary-import bottom-import"}`}>
      <div className="section-title">
        <FilePlus2 size={18} aria-hidden="true" />
        <h2>{isAdvanced ? "Import rapide" : "Analyse express"}</h2>
      </div>
      {isAdvanced && <div className="source-grid">
        <label>
          Source
          <input
            value={draftSource}
            placeholder="France Travail, Indeed, Hellowork..."
            onChange={(event) => setDraftSource(event.target.value)}
          />
        </label>
        <label>
          URL source
          <input value={draftUrl} placeholder="https://..." onChange={(event) => setDraftUrl(event.target.value)} />
        </label>
      </div>}
      <textarea
        className="import-box"
        rows={isAdvanced ? 5 : 3}
        placeholder={
          isAdvanced
            ? "Colle une annonce ici. Pour plusieurs annonces, sépare-les avec une ligne contenant ---"
            : "Colle une annonce ici si tu veux l’analyser tout de suite."
        }
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {isAdvanced && <div className="button-row">
        <button
          className={`primary-button ${loadingAction === "add-offers" ? "is-loading" : ""}`}
          onClick={() => {
            const stats = addOffers(draft);
            if (stats.importedCount > 0) void runAutomaticAiAnalysis(stats.mergedJobs);
          }}
          disabled={draft.trim().length < 40}
        >
          {loadingAction === "add-offers" && <span className="button-spinner" aria-hidden="true" />}
          <Sparkles size={17} aria-hidden="true" />
          Analyser et sortir le Top 3
        </button>
        <button className="ghost-button" onClick={loadDemo}>
          <ClipboardList size={17} aria-hidden="true" />
          Charger exemples
        </button>
        {jobs.length > 0 && (
          <button className={`ghost-button ${loadingAction === "copy-export" ? "is-loading" : ""}`} onClick={copyExport}>
            {loadingAction === "copy-export" && <span className="button-spinner" aria-hidden="true" />}
            <Copy size={17} aria-hidden="true" />
            Copier synthèse
          </button>
        )}
        {jobs.length > 0 && (
          <button
            className="ghost-button danger-text"
            onClick={() => {
              setJobs([]);
              setSelectedId(null);
              setFilter("to_review");
              setLastSearchSession(null);
              setStatusMessage("Données locales réinitialisées.");
            }}
          >
            <Trash2 size={17} aria-hidden="true" />
            Vider
          </button>
        )}
      </div>}
      {statusMessage ? (
        <p className="status-message">{statusMessage}</p>
      ) : (
        <p className="helper-text">
          {isAdvanced ? (
            <>
              Astuce : colle plusieurs annonces en les séparant par une ligne contenant <strong>---</strong>.
            </>
          ) : (
            "Analyse express reste disponible en filet de sécurité, sous les résultats."
          )}
        </p>
      )}
    </section>
  );

  return (
    <div className={`app-shell ${isAdvanced ? "mode-advanced" : "mode-assistant mode-simple"} view-${activeView} ${selected ? "has-selected-offer" : ""}`}>
      <datalist id="zone-suggestions">
        {zoneSuggestions.map((zone) => (
          <option value={zone} key={zone} />
        ))}
      </datalist>
      <header className="topbar">
        <div>
          <p className="eyebrow">{isAdvanced ? "Mode expert" : activeView === "comparison" ? "Comparaison" : activeView === "results" ? "Résultats" : "Assistant IA"}</p>
          <h1 className="app-title">
            Taf Sniffer <span className="version-chip">{APP_VERSION_LABEL}</span>
          </h1>
        </div>
        <nav className="app-view-tabs" aria-label="Navigation principale">
          {(["assistant", "results", "comparison", "expert"] as AppView[]).map((view) => (
            <button
              key={view}
              className={activeView === view ? "active" : ""}
              type="button"
              onClick={() => setAppView(view)}
              title={appViewDescriptions[view]}
            >
              {appViewLabels[view]}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setDarkMode(d => !d)} title="Basculer thème sombre/clair" aria-label="Basculer thème sombre/clair">{darkMode ? '☀' : '☾'}</button>
          <div className="options-menu" ref={optionsMenuRef}>
            <HelpTooltip tooltip="Options de Taf Sniffer : choisis le moteur d'analyse, l'interface Assistant IA ou Avancé, et garde la main sur les appels Gemini.">
              <button
                className={`icon-button options-trigger ${optionsOpen ? "active" : ""}`}
                type="button"
                aria-label="Ouvrir les options"
                aria-haspopup="menu"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen((current) => !current)}
              >
                <Settings2 size={18} aria-hidden="true" />
              </button>
            </HelpTooltip>
            {optionsOpen && (
              <div className="options-popover" role="menu" aria-label="Options">
                <div className="options-popover-head">
                  <strong>Options</strong>
                  <span>{isAdvanced ? "Mode expert" : appViewLabels[activeView]} · {aiModeLabels[uiState.aiMode]}</span>
                </div>
                <div className="options-section">
                  <span>Moteur d'analyse</span>
                  <div className="options-choice-list" role="group" aria-label="Moteur d'analyse">
                    {(["ai_top10", "ai_full", "local"] as AIMode[]).map((mode) => (
                      <HelpTooltip key={mode} tooltip={`${aiModeLabels[mode]} : ${aiModeDescriptions[mode]} Ce choix change le nombre d'offres envoyées à Gemini et donc la consommation de quota.`}>
                        <button
                          className={uiState.aiMode === mode ? "active" : ""}
                          type="button"
                          onClick={() => setAiMode(mode)}
                        >
                          <strong>{aiModeLabels[mode]}</strong>
                          <small>{aiModeDescriptions[mode]}</small>
                        </button>
                      </HelpTooltip>
                    ))}
                  </div>
                </div>
                <div className="options-section">
                  <span>Interface</span>
                <div className="mode-switch options-mode-switch" role="group" aria-label="Mode d'interface">
                  <HelpTooltip tooltip="Assistant IA : interface guidée pour exprimer une intention métier, générer un plan de recherche et lancer l'analyse sans manipuler tous les réglages.">
                    <button
                      className={isAssistant ? "active" : ""}
                      onClick={() => {
                        setUiMode("assistant");
                        setOptionsOpen(false);
                      }}
                    >
                      Assistant IA
                    </button>
                  </HelpTooltip>
                  <HelpTooltip tooltip="Mode expert : atelier technique pour modifier les critères, collecter, valider, sauvegarder et inspecter les sources.">
                    <button
                      className={isAdvanced ? "active" : ""}
                      onClick={() => {
                        setUiMode("advanced");
                        setOptionsOpen(false);
                      }}
                    >
                      Mode expert
                    </button>
                  </HelpTooltip>
                </div>
                </div>
                <div className="options-section local-gemini-section">
                  <span>Clé Gemini locale</span>
                  <small className="options-helper-text">Utilisée seulement si le proxy local n'est pas disponible. Non exportée.</small>
                  <input
                    aria-label="Clé API Gemini locale"
                    autoComplete="off"
                    placeholder={localGeminiKey ? "Clé enregistrée sur cet appareil" : "AIza..."}
                    type="password"
                    value={localGeminiDraft}
                    onChange={(event) => setLocalGeminiDraft(event.target.value)}
                  />
                  <div className="local-gemini-actions">
                    <button type="button" onClick={saveLocalGeminiDraft} disabled={!localGeminiDraft.trim()}>
                      Enregistrer
                    </button>
                    <button type="button" onClick={clearLocalGemini} disabled={!localGeminiKey && !localGeminiDraft}>
                      Effacer
                    </button>
                  </div>
                  <small className={`local-gemini-status ${localGeminiKey ? "saved" : ""}`}>
                    {localGeminiKey ? "Clé locale prête en secours mobile." : "Aucune clé locale enregistrée."}
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="topbar-stats" aria-label="Synthese">
            <HelpTooltip tooltip="À traiter : offres visibles qui n'ont pas encore été marquées favori, à creuser ou ignorée.">
              <span>{reviewCount} à traiter</span>
            </HelpTooltip>
            <HelpTooltip tooltip="À creuser : offres prometteuses ou incertaines que tu veux revoir avant décision.">
              <span>{exploreCount} à creuser</span>
            </HelpTooltip>
            <HelpTooltip tooltip="Ignorées : offres écartées de ton tri courant, restaurables si besoin.">
              <span>{ignoredCount} ignorées</span>
            </HelpTooltip>
            <HelpTooltip tooltip="Priorités : Top 3 courant, calculé par IA quand disponible puis par règles locales en secours.">
              <span>{topThree.length} priorités</span>
            </HelpTooltip>
          </div>
        </div>
      </header>

      {aiFallbackMessage && uiState.aiMode !== "local" && (
        <div className="ai-fallback-banner" role="status">
          <Sparkles size={16} aria-hidden="true" />
          <span>{aiFallbackMessage}</span>
          <button type="button" onClick={() => setAiFallbackMessage("")}>Masquer</button>
        </div>
      )}

      <main className={`workspace ${selected ? "result-focused" : ""}`}>
        <section className="main-panel" aria-label="Réglages et détail">
          {isAdvanced && (
            <div className="expert-tabs" role="tablist" aria-label="Sections du mode expert">
              {(["offer", "search", "collection", "validation", "tools"] as ExpertTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={expertTab === tab}
                  className={expertTab === tab ? "active" : ""}
                  onClick={() => setExpertTab(tab)}
                >
                  {expertTabLabels[tab]}
                </button>
              ))}
            </div>
          )}

          {isAdvanced && expertTab === "search" && analyses.length === 0 && <SimpleIntro />}

          {isAdvanced && expertTab === "search" && <section className="strategy-strip">
            <div className="section-title">
              <Settings2 size={18} aria-hidden="true" />
              <h2>Réglages</h2>
            </div>

            <div className="strategy-grid">
                <label>
                  Métier cible
                  <input
                    value={strategy.targetJob}
                    onChange={(event) => setStrategy({ ...strategy, targetJob: event.target.value })}
                />
              </label>

                <label>
                  Zone
                  <input
                    list="zone-suggestions"
                    value={strategy.location}
                    placeholder="Toute la France"
                    onChange={(event) => setStrategy({ ...strategy, location: event.target.value })}
                  />
                </label>

              <label>
                Salaire net mini
                <input
                  type="number"
                  min={0}
                  placeholder="peu importe"
                  value={strategy.salaryMin || ""}
                  onChange={(event) => setStrategy({ ...strategy, salaryMin: Number(event.target.value) })}
                />
              </label>

              <label>
                Expérience
                <select
                  value={strategy.experienceLevel}
                  onChange={(event) => setStrategy({ ...strategy, experienceLevel: event.target.value as Strategy["experienceLevel"] })}
                >
                  <option value="debutant_reconversion">Débutant / reconversion</option>
                  <option value="junior">Junior</option>
                  <option value="confirme">Confirmé</option>
                  <option value="indifferent">Indifférent</option>
                </select>
              </label>

              <label>
                Contrat souhaité
                <select
                  value={strategy.contractPreference}
                  onChange={(event) => setStrategy({ ...strategy, contractPreference: event.target.value as Strategy["contractPreference"] })}
                >
                  <option value="any">Peu importe</option>
                  <option value="cdi">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="alternance">Alternance</option>
                </select>
              </label>

              <label className="objective-field">
                Objectif
                <textarea
                  rows={2}
                  value={strategy.objective}
                  onChange={(event) => setStrategy({ ...strategy, objective: event.target.value })}
                />
              </label>
            </div>

            <div className="toggle-row" aria-label="Priorites">
              <HelpTooltip tooltip="Formation : favorise les offres qui annoncent une vraie prise en charge, utile en reconversion.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.priorityTraining}
                    onChange={(event) => setStrategy({ ...strategy, priorityTraining: event.target.checked })}
                  />
                  Formation
                </label>
              </HelpTooltip>
              <RequirementChip
                label={FACILITATED_TRAINING_LABEL}
                mode={strategy.poeiRequirement}
                onChange={(mode) => setStrategy({ ...strategy, ...requirementPatch("poeiRequirement", mode) })}
              />
              <HelpTooltip tooltip="Cashflow : donne plus de poids aux salaires clairs et comparables, surtout net mensuel, fixe et primes lisibles.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.prioritySalary}
                    onChange={(event) => setStrategy({ ...strategy, prioritySalary: event.target.checked })}
                  />
                  Cashflow
                </label>
              </HelpTooltip>
              <RequirementChip
                label={activeProfile.ui.strategicRequirementLabel}
                mode={strategy.auditRequirement}
                onChange={(mode) => setStrategy({ ...strategy, ...requirementPatch("auditRequirement", mode) })}
              />
              <RequirementChip
                label="Refuser indépendant imposé"
                mode={strategy.independentRequirement}
                onChange={(mode) => setStrategy({ ...strategy, ...requirementPatch("independentRequirement", mode) })}
              />
              <HelpTooltip tooltip="Masquer offres faibles : cache les annonces qui semblent peu compatibles, sans les supprimer.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.hideWeakOffers !== false}
                    onChange={(event) => setStrategy({ ...strategy, hideWeakOffers: event.target.checked })}
                  />
                  Masquer offres faibles
                </label>
              </HelpTooltip>
              <HelpTooltip tooltip="Recherche intelligente locale : ajoute variantes, accents et intitulés voisins sans appel Gemini.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.smartSearch !== false}
                    onChange={(event) => setStrategy({ ...strategy, smartSearch: event.target.checked })}
                  />
                  Recherche intelligente
                </label>
              </HelpTooltip>
              <HelpTooltip tooltip="Zone intelligente : élargit une zone comme Île-de-France vers départements et formulations proches.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.smartLocation !== false}
                    onChange={(event) => setStrategy({ ...strategy, smartLocation: event.target.checked })}
                  />
                  Zone intelligente
                </label>
              </HelpTooltip>
              <HelpTooltip tooltip="Debug : affiche les détails techniques utiles pour comprendre sources, extraction, scoring et corrections.">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={uiState.showDebugInfo}
                    onChange={(event) => setUiState((current) => ({ ...current, showDebugInfo: event.target.checked }))}
                  />
                  Afficher infos debug
                </label>
              </HelpTooltip>
              <button
                className={`ghost-button compact ${loadingAction === "ai-analyze" ? "is-loading" : ""}`}
                onClick={() => analyzeJobsWithAi(automaticAiCandidates(jobs, uiState.aiMode === "local" ? "ai_top10" : uiState.aiMode), true, true, true)}
                disabled={nonDemoJobs.length === 0}
              >
                {loadingAction === "ai-analyze" && <span className="button-spinner" aria-hidden="true" />}
                Réanalyser avec Gemini
              </button>
            </div>
          </section>}

          {isAssistant && (
            <SimpleSearchPanel
              analyses={analyses}
              strategy={strategy}
              queryPlan={queryPlan}
              searchReady={uiState.searchReady}
              searchResult={searchResult}
              statusMessage={statusMessage}
              lastSearchSession={lastSearchSession}
              sourceHealthStats={sourceHealthStats}
              networkDiagnostics={networkDiagnostics}
              sessionIgnoredCount={sessionIgnoredCount}
              decisionSummary={decisionSummary}
              loadingAction={loadingAction}
              showDebugInfo={uiState.showDebugInfo}
              top3AiCount={automaticAiCandidates(jobs).length}
              employerCount={new Set(analyses.filter(({ job }) => !job.ignored).map(({ analysis }) => analysis.company).filter((company) => !company.toLowerCase().includes("non précisée"))).size}
              onUpdateStrategy={updateSimpleStrategy}
              onRefineRanking={refineRanking}
              onRelanceWith={relanceWith}
              onRunSearch={runSearch}
              onPrepareSearchPlan={prefetchAssistantSearchPlan}
              onOpenSearches={openSearches}
              onRunNetworkDiagnostics={runNetworkDiagnostics}
              onAnalyzeTop3={() => analyzeJobsWithAi(automaticAiCandidates(jobs), false, true, true)}
              onRankEmployers={rankEmployers}
              assistantRuntime={assistantRuntime}
              hasSavedJobs={nonDemoJobs.length > 0}
              recentDictionary={recentDictionary}
              onStartAssistant={startAssistant}
              onShowHistory={showAssistantHistory}
              onResetAssistantState={resetAssistantRuntimeState}
              onRememberDictionaryValue={rememberDictionaryValue}
              onResetCriteria={() => updateSimpleStrategy({
                ...defaultStrategy,
                targetJob: "",
                aiSearchQueries: [],
                aiSearchPlanCheckedAt: "",
              })}
            />
          )}

          {isAdvanced && expertTab === "search" && importPanel}

          {isAdvanced && expertTab === "collection" && (
            <CollectionPanel
              analyses={analyses}
              queryPlan={queryPlan}
              loadingAction={loadingAction}
              onCopyKeywords={copyKeywords}
              onCopyChecklist={copyChecklist}
              onCopyKeyword={async (keyword) => {
                await navigator.clipboard.writeText(keyword);
                setStatusMessage(`Mot-clé copié : ${keyword}`);
              }}
            />
          )}

          {isAdvanced && expertTab === "tools" && (
            <SourceHealthPanel
              stats={sourceHealthStats}
              networkDiagnostics={networkDiagnostics}
              showDebugInfo={uiState.showDebugInfo}
              loadingAction={loadingAction}
              onRunNetworkDiagnostics={runNetworkDiagnostics}
              onReset={() => {
                setSourceHealthStats({});
                setStatusMessage("Stats sources réinitialisées.");
              }}
            />
          )}

          {isAdvanced && expertTab === "tools" && (
            <BackupPanel
              loadingAction={loadingAction}
              onExport={exportBackup}
              onImportClick={() => backupInputRef.current?.click()}
              onImport={importBackup}
              inputRef={backupInputRef}
            />
          )}

          {isResultsView && <EmployerRankingCard ranking={employerRanking} loading={loadingAction === "rank-employers"} onSelect={selectOffer} />}
          {isResultsView && <Top3AIComparisonCard comparison={activeTop3AiComparison} />}

          {isComparisonView && (
            <OfferComparisonView
              items={eligibleAnalyses.slice(0, 5)}
              activeProfile={activeProfile}
              onSelect={selectOffer}
            />
          )}

          {isAdvanced && expertTab === "validation" && (
            <TerrainPanel
              analyses={analyses}
              loadingAction={loadingAction}
              onSelect={selectOffer}
              onCopyReport={copyTerrainReport}
            />
          )}

          {isAdvanced && expertTab === "validation" && (
            <ValidationPanel
              analyses={analyses}
              onSelect={selectOffer}
              onUpdateExpected={updateExpectedReview}
              onLoadExtractionTests={loadExtractionTests}
            />
          )}

          {assistantDetailVisible && <section className="detail-panel" aria-label="Offre sélectionnée">
            {selected ? (
              <OfferDetail
                job={selected.job}
                analysis={selected.analysis}
                decision={evaluateDecisionFit(selected.analysis, strategy)}
                strategy={strategy}
                activeProfile={activeProfile}
                isEditingExtraction={editingExtractionId === selected.job.id}
                onEditExtraction={() => setEditingExtractionId(selected.job.id)}
                onCancelExtraction={() => setEditingExtractionId(null)}
                onSaveExtraction={(draft) => saveExtraction(selected.job.id, draft)}
                onClearExtraction={() => clearExtraction(selected.job.id)}
                onCopyQuestions={copyQuestions}
                onCopySummary={copySummary}
                onSaveRaw={(rawText) => {
                  setStatusMessage("Offre mise à jour et rescannée.");
                  updateJob(selected.job.id, { rawText });
                }}
                onUpdateMeta={(patch) => updateJob(selected.job.id, patch)}
                onUpdateExpectedReview={(patch) => updateExpectedReview(selected.job.id, patch)}
                onIdentifyCompany={() => identifyCompany(selected.job, selected.analysis)}
                onAnalyzeAi={() => queueManualAiAnalysis(selected.job)}
                onToggleFavorite={() =>
                  updateJob(selected.job.id, selected.job.favorite ? reviewPatch("a_traiter") : reviewPatch("favori"))
                }
                onToggleIgnored={() =>
                  updateJob(selected.job.id, selected.job.ignored ? reviewPatch("a_traiter") : reviewPatch("ignoree"))
                }
                onSetReviewStatus={(status) => updateJob(selected.job.id, reviewPatch(status))}
                loadingAction={loadingAction}
                mode={uiState.mode}
                showDebugInfo={uiState.showDebugInfo}
                companyEnrichment={typeof companyCache[selected?.analysis.company || ""] === "object" ? companyCache[selected?.analysis.company || ""] as CompanyEnrichment : undefined}
              />
            ) : (
              <div className="empty-state">
                <Sparkles size={32} aria-hidden="true" />
                <h2>Aucune offre analysée</h2>
                <p>Colle quelques annonces ou charge les exemples pour obtenir un premier classement.</p>
              </div>
            )}
          </section>}

          {isAssistant && assistantResultsVisible && importPanel}
        </section>

        {showRankingRail && <div
          className="split-resizer"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = rankingWidth;
            const onMove = (ev: PointerEvent) => {
              const next = Math.max(220, Math.min(520, startW + ev.clientX - startX));
              setRankingWidth(next);
              localStorage.setItem('sniffer.split', String(next));
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
        />}

        {showRankingRail && <aside className="ranking-panel" style={{ width: rankingWidth }} aria-label="Classement des offres">
          {showAssistantHistoryPanel ? (
            <div className="assistant-history-panel">
              <div className="section-title">
                <ListFilter size={18} aria-hidden="true" />
                <h2>Anciennes recherches</h2>
              </div>
              <p className="helper-text">
                {nonDemoJobs.length} offre{nonDemoJobs.length > 1 ? "s" : ""} sauvegardée{nonDemoJobs.length > 1 ? "s" : ""}. Le détail reste masqué tant que tu ne sélectionnes pas une offre.
              </p>
              <button className="primary-button one-button" type="button" onClick={showAssistantHistory}>
                Voir anciennes recherches/offres
              </button>
              {lastSearchSession && (
                <div className="assistant-history-stats">
                  <span>{lastSearchSession.keywords || "Recherche précédente"}</span>
                  <span>{lastSearchSession.location || "France entière"}</span>
                  <span>{formatSessionDate(lastSearchSession.createdAt)}</span>
                </div>
              )}
            </div>
          ) : isResultsView || (isAssistant && assistantResultsVisible) || showAssistantHistoryRail ? (
          <>
          <div className="ranking-header">
            <div className="section-title">
              <ListFilter size={18} aria-hidden="true" />
              <h2>Classement</h2>
            </div>
            <HelpTooltip tooltip="Recalculer : rafraîchit l'affichage du classement avec les critères actuels, sans supprimer les offres.">
              <button className="icon-button" aria-label="Recalculer">
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            </HelpTooltip>
          </div>

          <div className="ranking-search" role="search">
            <input
              value={rankingSearch}
              placeholder="Chercher dans les annonces..."
              aria-label="Chercher dans les annonces déjà trouvées"
              onChange={(event) => setRankingSearch(event.target.value)}
            />
            {rankingSearch && (
              <button className="ghost-button compact" onClick={() => setRankingSearch("")}>
                Effacer
              </button>
            )}
          </div>
          <p className="ranking-search-count">
            {visibleAnalyses.length}/{tabFilteredAnalyses.length} affichée{visibleAnalyses.length > 1 ? "s" : ""}
            {rankingSearch ? ` · recherche « ${rankingSearch.trim()} »` : ""}
          </p>

          <div className="segmented" aria-label="Filtrer les offres">
            {newCount > 0 && (
              <HelpTooltip tooltip="Nouveau : offres de la dernière recherche, fraîches à trier en priorité.">
                <button className={filter === "new" ? "active" : ""} onClick={() => setFilter("new")}>
                  Nouveau <span className="filter-count">{newCount}</span>
                </button>
              </HelpTooltip>
            )}
            <HelpTooltip tooltip="À traiter : offres encore en attente de décision. C'est ta file de tri principale.">
              <button className={filter === "to_review" ? "active" : ""} onClick={() => setFilter("to_review")}>
                À traiter <span className="filter-count">{reviewCount}</span>
              </button>
            </HelpTooltip>
            <HelpTooltip tooltip="À creuser : offres gardées pour vérification, appel recruteur ou comparaison plus fine.">
              <button className={filter === "to_explore" ? "active" : ""} onClick={() => setFilter("to_explore")}>
                À creuser <span className="filter-count">{exploreCount}</span>
              </button>
            </HelpTooltip>
            <HelpTooltip tooltip="Favoris : offres que tu considères comme sérieuses ou prioritaires.">
              <button className={filter === "favorites" ? "active" : ""} onClick={() => setFilter("favorites")}>
                Favoris <span className="filter-count">{favoriteCount}</span>
              </button>
            </HelpTooltip>
            <HelpTooltip tooltip="Ignorées : offres écartées du tri courant, mais pas supprimées.">
              <button className={filter === "ignored" ? "active" : ""} onClick={() => setFilter("ignored")}>
                Ignorées <span className="filter-count">{ignoredCount}</span>
              </button>
            </HelpTooltip>
            <HelpTooltip tooltip="Toutes : affiche toutes les offres, y compris celles déjà marquées ou moins pertinentes.">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
                Toutes <span className="filter-count">{nonDemoJobs.length}</span>
              </button>
            </HelpTooltip>
          </div>

          <div className="ranking-list">
            {visibleAnalyses.length > 0 ? (
              visibleAnalyses.map(({ job, analysis }, index) => {
                const status = normalizeReviewStatus(job);
                const decision = evaluateDecisionFit(analysis, strategy);
                const salaryLabel = compactSalaryLabel(analysis);
                const contractLabel = compactContractLabel(analysis);
                const locationLabel = compactLocationLabel(analysis);
                const aiRankScore = aiRankScoreFor(job, currentStrategyHash);
                const salaryRankScore = job.aiReview?.status === "done" && Number.isFinite(Number(job.aiReview.salaryRankScore))
                  ? Math.round(Number(job.aiReview.salaryRankScore))
                  : null;
                return (
                  <SwipeRankCard
                    key={job.id}
                    selected={selected?.job.id === job.id}
                    onSelect={() => selectOffer(job.id)}
                    currentStatus={status}
                    onSwipe={(action) => handleRankSwipe(job.id, action, status)}
                  >
                    <span className="rank-index">#{index + 1}</span>
                    <InfoChip
                      className={`rank-score ${scoreClass(aiRankScore ?? analysis.scores.global)} ${aiRankScore !== null ? "ai-rank-score" : ""}`}
                      tooltip={aiRankScore !== null ? "Score IA : Gemini classe cette offre selon ton intention, les critères et les garde-fous locaux." : "Score local : estimation par règles Taf Sniffer quand Gemini n'a pas encore produit de classement frais."}
                    >
                      <ScoreArc score={aiRankScore ?? analysis.scores.global} />
                    </InfoChip>
                    <span className="rank-content">
                      <span className="rank-title-row">
                        <strong>{analysis.normalizedTitle}</strong>
                        <InfoChip className={decisionFitClass(decision.fit)} tooltip="Critères : indique si l'offre colle bien, mérite vérification, ou semble faible avec les critères actuels.">
                          {decisionFitLabel(decision.fit)}
                        </InfoChip>
                      </span>
                      <span className="rank-main-line">
                        <span>{analysis.company}</span>
                        <span>{locationLabel}</span>
                      </span>
                      <span className="rank-value-line">
                        <strong>{salaryLabel}</strong>
                        <span>{contractLabel}</span>
                      </span>
                      <span className="rank-meta quiet">
                        <span className={reviewStatusClass(status)}>{reviewStatusLabel(status)}</span>
                        <span className={riskClass(analysis.riskLevel)}>Risque {analysis.riskLevel}</span>
                        {aiRankScore !== null && <span className="ai-rank-chip">score IA</span>}
                        {salaryRankScore !== null && <span className="salary-rank-chip">salaire IA {salaryRankScore}</span>}
                        {job.extractionQuality === "complète" && <span className="import-quality-ok">fiable</span>}
                        {extractionReviewValue(job) === "needs_review" && <span className="import-quality-review">à vérifier</span>}
                        <span>{job.source || datasetDisplayLabel(job.datasetLabel)}</span>
                        {job.alsoFoundOn && job.alsoFoundOn.length > 0 && (
                          <span className="multisource-chip" title={`Aussi sur : ${job.alsoFoundOn.join(', ')}`}>
                            +{job.alsoFoundOn.length} source{job.alsoFoundOn.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {uiState.showDebugInfo && job.extractionQuality && <span>{extractionLabel(job.extractionQuality)}</span>}
                      </span>
                    </span>
                  </SwipeRankCard>
                );
              })
            ) : (
              !rankingSearch && nonDemoJobs.length === 0 && !lastSearchSession ? (
                <div className="ranking-empty-state">
                  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="120" height="90">
                    <circle cx="52" cy="42" r="28" stroke="var(--teal)" strokeWidth="3" fill="var(--teal-soft)" opacity=".7"/>
                    <circle cx="52" cy="42" r="18" fill="var(--teal-soft)"/>
                    <line x1="72" y1="62" x2="90" y2="78" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="52" cy="42" r="6" fill="var(--teal)" opacity=".5"/>
                    <path d="M44 42 Q52 32 60 42" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  </svg>
                  <strong>Aucune offre à explorer</strong>
                  <p>Lance l'assistant pour importer et classer des offres automatiquement.</p>
                </div>
              ) : (
                <div className="ranking-empty">
                  {rankingSearch
                    ? `Aucune annonce ne contient « ${rankingSearch.trim()} » dans ce filtre. Essaie un autre mot-clé ou passe sur Toutes.`
                    : nonDemoJobs.length > 0 && filter === "to_review"
                      ? "Aucune offre à traiter dans ce filtre."
                      : "Aucune offre dans ce filtre."}
                </div>
              )
            )}
          </div>
          </>
          ) : null}
        </aside>}
      </main>
    </div>
  );
}

function ScoreArc({ score, size = 36 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -200;
  const endAngle = 20;
  const totalDeg = endAngle - startAngle;
  const fillDeg = (score / 100) * totalDeg;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const s = arc(startAngle);
  const e = arc(startAngle + fillDeg);
  const largeArc = fillDeg > 180 ? 1 : 0;
  const color = score >= 70 ? "var(--green)" : score >= 45 ? "var(--teal)" : "var(--amber)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path
        d={`M ${arc(startAngle).x} ${arc(startAngle).y} A ${r} ${r} 0 1 1 ${arc(endAngle).x} ${arc(endAngle).y}`}
        fill="none" stroke="var(--line)" strokeWidth="3.5" strokeLinecap="round"
      />
      {fillDeg > 2 && (
        <path
          d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`}
          fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={color}>{score}</text>
    </svg>
  );
}

function TopPicks({ picks, onSelect }: { picks: TopPick[]; onSelect: (id: string) => void }) {
  if (picks.length === 0) {
    return (
      <section className="top-picks empty-top">
        <div className="section-title">
          <h2>Top 3</h2>
        </div>
        <p>Ajoute au moins une annonce pour obtenir tes priorités.</p>
      </section>
    );
  }

  return (
    <section className="top-picks">
      <div className="section-title">
        <h2>Top 3</h2>
      </div>
      <div className="top-pick-list">
        {picks.map(({ kind, reason, item }, index) => (
          <button key={`${kind}-${item.job.id}`} className="top-pick-card" onClick={() => onSelect(item.job.id)}>
            <span className="top-pick-rank">Top {index + 1}</span>
            <strong>{kind}</strong>
            <span>{item.analysis.normalizedTitle}</span>
            <small>{reason}</small>
            <em>
              {item.analysis.scores.global}/100 · {compactSalaryLabel(item.analysis)}
            </em>
          </button>
        ))}
	      </div>
	    </section>
  );
}

function SwipeRankCard({
  selected,
  onSelect,
  onSwipe,
  currentStatus,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  onSwipe: (action: SwipeRankAction) => void;
  currentStatus?: ReviewStatus;
  children: ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const swipedRef = useRef(false);
  const swipeAction: SwipeRankAction | null =
    Math.abs(dragX) >= RANK_SWIPE_THRESHOLD ? (dragX > 0 ? "explore" : "ignore") : null;

  const resetDrag = () => {
    pointerIdRef.current = null;
    draggingRef.current = false;
    dragXRef.current = 0;
    setDragX(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    startRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
    swipedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) return;
      draggingRef.current = true;
    }
    event.preventDefault();
    const nextDragX = Math.max(-RANK_SWIPE_MAX, Math.min(RANK_SWIPE_MAX, dx));
    dragXRef.current = nextDragX;
    setDragX(nextDragX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const finalDragX = dragXRef.current;
    const action = Math.abs(finalDragX) >= RANK_SWIPE_THRESHOLD ? (finalDragX > 0 ? "explore" : "ignore") : null;
    const wasDragging = draggingRef.current;
    resetDrag();
    if (action) {
      swipedRef.current = true;
      onSwipe(action);
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 160);
      return;
    }
    if (wasDragging) {
      swipedRef.current = true;
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 80);
    }
  };

  return (
    <div className={`rank-swipe-shell ${swipeAction ? `swipe-${swipeAction}` : ""}`}>
      <div className="rank-swipe-action keep" aria-hidden="true">
        {currentStatus === "a_creuser" ? <Star size={16} /> : <ListFilter size={16} />}
        <span>{currentStatus === "a_creuser" ? "Favori" : "À creuser"}</span>
      </div>
      <div className="rank-swipe-action ignore" aria-hidden="true">
        <Trash2 size={16} />
        <span>Ignorer</span>
      </div>
      <button
        className={`rank-card ${selected ? "selected" : ""} ${draggingRef.current ? "dragging" : ""}`}
        onClick={() => {
          if (!swipedRef.current) onSelect();
        }}
        onPointerCancel={resetDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        style={{ transform: dragX ? `translateX(${dragX}px)` : undefined }}
      >
        {children}
      </button>
    </div>
  );
}

function Top3AIComparisonCard({ comparison }: { comparison: Top3AIComparison | null }) {
  if (!comparison) return null;
  return (
    <section className="top3-ai-comparison">
      <div className="section-title">
        <Sparkles size={18} aria-hidden="true" />
        <h2>Comparaison IA du Top 3</h2>
      </div>
      <div className="top3-ai-grid">
        <div>
          <strong>Pourquoi #1</strong>
          <p>{comparison.whyFirst || "À confirmer après lecture des offres."}</p>
        </div>
        <div>
          <strong>Plus risquée</strong>
          <p>{comparison.riskierOffer || "Aucun risque clairement prioritaire."}</p>
        </div>
        <div>
          <strong>Appeler en premier</strong>
          <p>{comparison.callFirst || "Commencer par l'offre la plus claire."}</p>
        </div>
      </div>
      {comparison.actionSummary && <p className="top3-ai-action">{comparison.actionSummary}</p>}
    </section>
  );
}

function OfferComparisonView({
  items,
  activeProfile,
  onSelect,
}: {
  items: AnalysisItem[];
  activeProfile: ReturnType<typeof getActiveProfile>;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <section className="comparison-view empty-state">
        <Sparkles size={32} aria-hidden="true" />
        <h2>Aucune offre à comparer</h2>
        <p>Lance une recherche ou affiche les anciennes offres pour construire un Top exploitable.</p>
      </section>
    );
  }

  const axisRows = [
    ["Formation", (analysis: JobAnalysis) => analysis.scores.formationFacilitee ?? analysis.scores.training],
    ["Salaire", (analysis: JobAnalysis) => analysis.scores.salaryPackage ?? analysis.scores.cashflow],
    [activeProfile.ui.trajectoryScoreLabel, (analysis: JobAnalysis) => analysis.scores.trajectory],
    ["Employeur", (analysis: JobAnalysis) => analysis.scores.employer ?? analysis.scores.audit],
    ["Risque", (analysis: JobAnalysis) => analysis.scores.risk],
  ] as const;

  return (
    <section className="comparison-view" aria-label="Comparaison des meilleures offres">
      <div className="comparison-head">
        <div>
          <p className="eyebrow">Top offres</p>
          <h2>Comparaison rapide</h2>
        </div>
        <p>Lecture côte à côte des scores déjà calculés, sans nouveau classement.</p>
      </div>
      <div className="comparison-grid">
        {items.map(({ job, analysis }, index) => (
          <article className="comparison-card" key={job.id}>
            <div className="comparison-card-head">
              <span className="top-pick-rank">#{index + 1}</span>
              <InfoChip className={scoreClass(analysis.scores.global)} tooltip="Score global déjà calculé pour cette offre.">
                {analysis.scores.global}
              </InfoChip>
            </div>
            <ScoreRadar analysis={analysis} activeProfile={activeProfile} />
            <h3>{analysis.normalizedTitle}</h3>
            <p>{analysis.company} · {compactLocationLabel(analysis)}</p>
            <strong>{compactSalaryLabel(analysis)}</strong>
            <div className="comparison-badges">
              <span className={riskClass(analysis.riskLevel)}>Risque {analysis.riskLevel}</span>
              <span>{analysis.contract}</span>
              <span>{analysis.verdict}</span>
            </div>
            <div className="comparison-axis-list">
              {axisRows.map(([label, getter]) => {
                const value = getter(analysis);
                return (
                  <span key={label}>
                    <small>{label}</small>
                    <b>{value}</b>
                  </span>
                );
              })}
            </div>
            <button className="primary-button compact" type="button" onClick={() => onSelect(job.id)}>
              Ouvrir cette offre
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmployerRankingCard({
  ranking,
  loading,
  onSelect,
}: {
  ranking: EmployerRankingResult | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (!ranking && !loading) return null;
  const winner = ranking?.items[0];

  return (
    <section className="employer-ranking">
      <div className="section-title">
        <h2>Meilleur employeur</h2>
        {ranking && (
          <InfoChip
            className={`confidence-chip ${ranking.status}`}
            tooltip={ranking.status === "done" ? "Une note employeur publique a été trouvée automatiquement." : "La note employeur reste à vérifier manuellement."}
          >
            {ranking.status === "done" ? "note trouvée" : "à vérifier"}
          </InfoChip>
        )}
      </div>
      {loading && <p className="ai-progress">Comparaison employeurs en cours...</p>}
      {winner ? (
        <>
          <div className="employer-winner">
            <div>
              <span className="top-pick-rank">#1</span>
              <strong>{winner.company}</strong>
              <p>{winner.bestTitle}</p>
            </div>
            <InfoChip className={scoreClass(winner.score)} tooltip="Score employeur calculé depuis salaire estimé, avantages, note publique et meilleure offre détectée.">
              {winner.score}
            </InfoChip>
          </div>
          <div className="employer-winner-metrics" aria-label="Pourquoi cet employeur ressort">
            <span>
              <strong>{winner.salaryLabel}</strong>
              <small>Salaire</small>
            </span>
            <span>
              <strong>{winner.benefits.length ? winner.benefits.slice(0, 3).join(", ") : "Avantages à vérifier"}</strong>
              <small>Avantages</small>
            </span>
            <span>
              <strong>{winner.rating.score !== null ? winner.rating.label : "À vérifier"}</strong>
              <small>Note employeur</small>
            </span>
          </div>
          <div className="employer-ranking-list">
            {ranking.items.slice(0, 5).map((item) => (
              <button className="employer-ranking-row" key={item.company} onClick={() => onSelect(item.bestJobId)}>
                <span>
                  <strong>{item.company}</strong>
                  <small>{item.companyType} · {item.offerCount} offre{item.offerCount > 1 ? "s" : ""}</small>
                </span>
                <span>{item.salaryLabel}</span>
                <span>{item.benefitsCount} avantage{item.benefitsCount > 1 ? "s" : ""}</span>
                <span>{item.rating.label}</span>
                <b className={scoreClass(item.score)}>{item.score}</b>
              </button>
            ))}
          </div>
          <p className="helper-text">
            {winner.reasons.join(" · ")}
            {winner.warnings.length ? ` · ${winner.warnings.join(" · ")}` : ""}
          </p>
          {winner.rating.sourceUrl && (
            <a className="company-search-link" href={winner.rating.sourceUrl} target="_blank" rel="noopener noreferrer">
              vérifier la note employeur
            </a>
          )}
        </>
      ) : (
        <p className="helper-text">{ranking?.message || "Analyse employeur en cours."}</p>
      )}
    </section>
  );
}

function SimpleIntro() {
  return (
    <section className="simple-intro">
      <div>
        <p className="eyebrow">Assistant IA</p>
        <h2>Décris ce que tu cherches, puis lance la recherche.</h2>
        <p>L'assistant transforme ton intention métier en requêtes utiles, importe les offres lisibles, puis Gemini aide à classer sans multiplier les appels.</p>
      </div>
    </section>
  );
}

function SimpleSearchPanel({
  analyses,
  strategy,
  queryPlan,
  searchReady,
  searchResult,
  statusMessage,
  lastSearchSession,
  sourceHealthStats,
  networkDiagnostics,
  sessionIgnoredCount,
  decisionSummary,
  loadingAction,
  showDebugInfo,
  top3AiCount,
  employerCount,
  onUpdateStrategy,
  onRefineRanking,
  onRelanceWith,
  onRunSearch,
  onPrepareSearchPlan,
  onOpenSearches,
  onRunNetworkDiagnostics,
  onAnalyzeTop3,
  onRankEmployers,
  assistantRuntime,
  hasSavedJobs,
  recentDictionary,
  onStartAssistant,
  onShowHistory,
  onResetAssistantState,
  onRememberDictionaryValue,
  onResetCriteria,
}: {
  analyses: AnalysisItem[];
  strategy: Strategy;
  queryPlan: ReturnType<typeof generateSearchQueries>;
  searchReady: boolean;
  searchResult: SearchProviderResult;
  statusMessage: string;
  lastSearchSession: SearchSession | null;
  sourceHealthStats: SourceHealthStats;
  networkDiagnostics: NetworkDiagnosticsResult | null;
  sessionIgnoredCount: number;
  decisionSummary: ReturnType<typeof buildDecisionSummary>;
  loadingAction: string;
  showDebugInfo: boolean;
  top3AiCount: number;
  employerCount: number;
  onUpdateStrategy: (patch: Partial<Strategy>) => void;
  onRefineRanking: (patch: Partial<Strategy>) => void;
  onRelanceWith: (patch: Partial<Strategy>) => void;
  onRunSearch: () => void;
  onPrepareSearchPlan: () => void;
  onOpenSearches: () => void;
  onRunNetworkDiagnostics: () => void;
  onAnalyzeTop3: () => void;
  onRankEmployers: () => void;
  assistantRuntime: AssistantRuntimeState;
  hasSavedJobs: boolean;
  recentDictionary: RecentDictionaryState;
  onStartAssistant: () => void;
  onShowHistory: () => void;
  onResetAssistantState: () => void;
  onRememberDictionaryValue: (field: DictionaryField, label: string, family?: string, aliases?: string[]) => void;
  onResetCriteria: () => void;
}) {
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [assistantStep, setAssistantStep] = useState<"objective" | "zone" | "conditions" | "constraints" | "summary">("objective");
  const [activeSuggestionField, setActiveSuggestionField] = useState<"job" | "zone" | null>(null);
  const prevAssistantStepRef = useRef<string | null>(null);
  const sourceReports = lastSearchSession?.sourceReports ?? [];
  const sourceSummary = sourceReportSummary(sourceReports);
  const importQuality = importQualitySummary(lastSearchSession);
  const hasDecisionSummary = decisionSummary.match + decisionSummary.review + decisionSummary.weak > 0;
  const terrainReport = buildTerrainReport(analyses);
  const terrainQueues = terrainQueueRows(analyses);
  const terrainReminderVisible = searchReady && terrainReport.realCount > 0;
  const hasSearchDetails =
    searchResult.networkStatus !== "blocked" &&
    (sourceHealthRecords(sourceHealthStats).length > 0 || hasDecisionSummary || (showDebugInfo && sourceReports.length > 0));
  const aiButtonDisabled = !searchReady || top3AiCount === 0 || loadingAction === "run-search";
  const aiButtonTitle = !searchReady
    ? "Lance d'abord une recherche pour constituer une sélection d'offres."
    : top3AiCount === 0
      ? "Aucune offre exploitable à analyser avec Gemini."
      : `Analyse ${top3AiCount} offre${top3AiCount > 1 ? "s" : ""} avec Gemini.`;
  const activeProfile = getActiveProfile(strategy);
  const jobDictionaryMatches = mergeDictionarySuggestions(
    "job",
    recentDictionary.job,
    filterDictionarySuggestions(jobSuggestions, strategy.targetJob, 8),
    strategy.targetJob,
    8,
  );
  const zoneDictionaryMatches = mergeDictionarySuggestions(
    "zone",
    recentDictionary.zone,
    filterDictionarySuggestions(zoneDictionarySuggestions, strategy.location, 8),
    strategy.location,
    8,
  );
  const applyDictionarySuggestion = (field: "job" | "zone", suggestion: DictionarySuggestion) => {
    if (field === "job") onUpdateStrategy({ targetJob: suggestion.label });
    else onUpdateStrategy({ location: suggestion.label });
    onRememberDictionaryValue(field, suggestion.label, suggestion.family, suggestion.aliases);
    setActiveSuggestionField(null);
  };
  const experienceLabel = {
    debutant_reconversion: "Débutant / reconversion",
    junior: "Junior",
    confirme: "Confirmé",
    indifferent: "Indifférent",
  }[strategy.experienceLevel];
  const contractLabel = {
    any: "Peu importe",
    cdi: "CDI",
    cdd: "CDD",
    alternance: "Alternance",
  }[strategy.contractPreference];
  const strictFilters = [
    strategy.poeiRequirement === "required" ? `${FACILITATED_TRAINING_LABEL} obligatoire` : "",
    strategy.auditRequirement === "required" ? `${activeProfile.ui.strategicRequirementLabel} obligatoire` : "",
    strategy.independentRequirement === "required" ? "Indépendant refusé" : "",
    strategy.hideWeakOffers !== false ? "Faibles masquées" : "",
  ].filter(Boolean);
  const assistantSteps = [
    { key: "objective" as const, label: "Objectif", tooltip: "Objectif : indique le métier ou la direction recherchée. L'IA transformera cette intention en requêtes utiles au lancement." },
    { key: "zone" as const, label: "Zone", tooltip: "Zone : précise le territoire voulu, ou laisse vide pour chercher large en France entière." },
    { key: "conditions" as const, label: "Conditions", tooltip: "Conditions : salaire, expérience et contrat servent surtout à classer les offres, pas à tout bloquer." },
    { key: "constraints" as const, label: "Contraintes", tooltip: "Contraintes : garde-fous comme formation facilitée, audit ou indépendant imposé. Obligatoire devient un filtre fort." },
    { key: "summary" as const, label: "Résumé", tooltip: "Résumé : synthèse éditable envoyée à Gemini comme contexte de recherche et de classement." },
  ];
  const activeStepIndex = assistantSteps.findIndex((step) => step.key === assistantStep);
  const canSearch = Boolean(strategy.targetJob.trim() || strategy.assistantIntent.trim());
  const assistantSummaryFallback = [
    strategy.targetJob ? `Métier : ${strategy.targetJob}` : "",
    strategy.assistantIntent ? `Intention : ${strategy.assistantIntent}` : "",
    strategy.location.trim() ? `Zone : ${strategy.location}` : "Zone : France entière",
    strategy.salaryMin ? `Salaire net mini : ${strategy.salaryMin} €` : "",
    experienceLabel,
    contractLabel !== "Peu importe" ? contractLabel : "",
    strictFilters.length ? strictFilters.join(" · ") : "",
  ].filter(Boolean).join(". ");
  const goToStep = (offset: number) => {
    const next = Math.max(0, Math.min(assistantSteps.length - 1, activeStepIndex + offset));
    setActiveSuggestionField(null);
    setAssistantStep(assistantSteps[next].key);
  };
  const validateCurrentStep = () => {
    if (assistantStep !== "summary") goToStep(1);
  };
  const handleEnterAdvance = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (event.key !== "Enter" || (event.currentTarget instanceof HTMLTextAreaElement && event.shiftKey)) return;
    event.preventDefault();
    validateCurrentStep();
  };
  const showSearchResult = assistantRuntime === "collapsed" && searchReady;
  const primaryAssistantLabel = assistantRuntime === "active"
    ? assistantStep === "summary" ? "Valider et rechercher" : "Valider cette étape"
    : searchReady ? "Relancer la recherche" : "Rechercher et sortir le Top 3";
  const runPrimaryAssistantAction = () => {
    if (assistantRuntime === "active" && assistantStep !== "summary") {
      validateCurrentStep();
      return;
    }
    onRunSearch();
  };

  useEffect(() => {
    if (assistantRuntime === "introFading") setAssistantStep("objective");
    if (assistantRuntime === "active") setCriteriaOpen(true);
    if (assistantRuntime === "idle" || assistantRuntime === "introFading") setCriteriaOpen(false);
  }, [assistantRuntime]);

  // Pré-chauffe le plan Gemini à l'arrivée sur l'étape Résumé : le clic « rechercher »
  // n'attend plus le LLM. On ne déclenche qu'à la transition VERS summary (pas à chaque
  // render) pour éviter de re-spammer Gemini si le plan revient vide. Le parent dédup aussi.
  useEffect(() => {
    const enteredSummary = assistantStep === "summary" && prevAssistantStepRef.current !== "summary";
    prevAssistantStepRef.current = assistantStep;
    if (assistantRuntime === "active" && enteredSummary) onPrepareSearchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantStep, assistantRuntime]);

  const assistantStageClass = [
    "simple-search-panel",
    "assistant-stage",
    assistantRuntime === "introFading" ? "is-fading" : "",
    assistantRuntime === "searching" ? "is-searching" : "",
    assistantRuntime === "collapsed" ? "is-collapsed" : "",
    searchReady ? "search-has-results" : "",
  ].filter(Boolean).join(" ");

  if (assistantRuntime === "idle" || assistantRuntime === "introFading") {
    return (
      <section className={assistantStageClass}>
        <div className="assistant-stage-content assistant-launch-card">
          <p className="eyebrow">Recherche guidée</p>
          <h2>Prêt à flairer les bonnes offres ?</h2>
          <p>Un bouton, puis l'assistant te pose les questions utiles. Les anciennes offres restent disponibles à droite.</p>
          <div className="assistant-launch-actions">
            <button className="primary-button one-button" type="button" onClick={onStartAssistant}>
              Lancer l'assistant
            </button>
            {hasSavedJobs && (
              <button className="ghost-button one-button" type="button" onClick={onShowHistory}>
                Voir anciennes recherches/offres
              </button>
            )}
            <HelpTooltip tooltip="Remet l'écran comme au lancement, sans supprimer les offres sauvegardées.">
              <button className="ghost-button compact" type="button" onClick={onResetAssistantState}>
                Réinitialiser l'état
              </button>
            </HelpTooltip>
          </div>
        </div>
      </section>
    );
  }

  if (assistantRuntime === "searching") {
    return (
      <section className={assistantStageClass}>
        <div className="assistant-stage-content assistant-loader-card" role="status" aria-live="polite">
          <span className="assistant-ring" aria-hidden="true" />
          <strong>Recherche en cours</strong>
          <p>{statusMessage || "Je prépare le plan IA, collecte les offres lisibles et garde le tri local en secours."}</p>
        </div>
      </section>
    );
  }

  const diagnosisActive = lastSearchSession !== null && (
    lastSearchSession.importedCount < 8 ||
    (decisionSummary.match === 0 && decisionSummary.review === 0) ||
    Boolean(strategy.hideWeakOffers && decisionSummary.hiddenWeak > 0)
  );

  const diagnosticActions: { key: string; icon: string; label: string; why: string; onAct: () => void }[] = [];
  if (diagnosisActive) {
    if (strategy.location?.trim()) {
      diagnosticActions.push({
        key: "zone",
        icon: "↻",
        label: "Élargir à toute la France",
        why: `Zone actuelle : « ${strategy.location} ». Élargir peut multiplier les offres disponibles.`,
        onAct: () => onRelanceWith({ location: "" }),
      });
    }
    const hasRequiredConstraints = strategy.poeiRequirement === "required" || strategy.auditRequirement === "required";
    if (hasRequiredConstraints) {
      const constraintLabels: string[] = [];
      if (strategy.poeiRequirement === "required") constraintLabels.push(FACILITATED_TRAINING_LABEL);
      if (strategy.auditRequirement === "required") constraintLabels.push(activeProfile.ui.strategicRequirementLabel);
      const constraintPatch: Partial<Strategy> = {};
      if (strategy.poeiRequirement === "required") Object.assign(constraintPatch, requirementPatch("poeiRequirement", "prefer"));
      if (strategy.auditRequirement === "required") Object.assign(constraintPatch, requirementPatch("auditRequirement", "prefer"));
      diagnosticActions.push({
        key: "constraints",
        icon: "↻",
        label: "Assouplir les contraintes",
        why: `${constraintLabels.join(" et ")} est en mode obligatoire — le passer en préféré élargit les résultats.`,
        onAct: () => onRelanceWith(constraintPatch),
      });
    }
    if (strategy.experienceLevel !== "indifferent") {
      diagnosticActions.push({
        key: "experience",
        icon: "↻",
        label: "Accepter tous niveaux",
        why: `Filtré sur « ${experienceLabel} ». Passer en indifférent lève ce filtre pour cette relance.`,
        onAct: () => onRelanceWith({ experienceLevel: "indifferent" }),
      });
    }
    if (strategy.salaryMin > 0) {
      diagnosticActions.push({
        key: "salary",
        icon: "⚡",
        label: `Retirer le seuil ${strategy.salaryMin} €`,
        why: `Le salaire mini de ${strategy.salaryMin} €/mois masque les offres sans salaire déclaré. Reclassement instantané.`,
        onAct: () => onRefineRanking({ salaryMin: 0 }),
      });
    }
    if (strategy.hideWeakOffers && decisionSummary.hiddenWeak > 0) {
      diagnosticActions.push({
        key: "weak",
        icon: "⚡",
        label: `Voir les ${decisionSummary.hiddenWeak} offres faibles`,
        why: `${decisionSummary.hiddenWeak} offre${decisionSummary.hiddenWeak > 1 ? "s" : ""} masquée${decisionSummary.hiddenWeak > 1 ? "s" : ""} jugée${decisionSummary.hiddenWeak > 1 ? "s" : ""} faibles. Les afficher ne relance pas la recherche.`,
        onAct: () => onRefineRanking({ hideWeakOffers: false }),
      });
    }
    if (!strategy.aiSearchQueries?.length) {
      diagnosticActions.push({
        key: "ai-plan",
        icon: "✦",
        label: "Régénérer le plan IA",
        why: "La dernière recherche a utilisé uniquement les mots-clés locaux. Forcer un nouveau plan Gemini peut découvrir d'autres offres.",
        onAct: () => onRelanceWith({}),
      });
    }
  }

  const diagnosisTitle = lastSearchSession?.importedCount === 0
    ? "Aucune offre importée —"
    : lastSearchSession && lastSearchSession.importedCount < 8
      ? `Seulement ${lastSearchSession.importedCount} offre${lastSearchSession.importedCount > 1 ? "s" : ""} —`
      : decisionSummary.match === 0 && decisionSummary.review === 0
        ? "Aucun bon match —"
        : `${decisionSummary.hiddenWeak} masquée${decisionSummary.hiddenWeak > 1 ? "s" : ""} —`;

  if (assistantRuntime === "collapsed") {
    return (
      <section className={assistantStageClass}>
        <div className="assistant-stage-content assistant-collapsed-card">
          <div className="assistant-collapsed-main">
            <div>
              <p className="eyebrow">{searchResult.status === "needsConnector" ? "Recherche à ouvrir" : "Recherche terminée"}</p>
              <strong>
                {lastSearchSession?.keywords || strategy.targetJob || strategy.assistantIntent || "Recherche assistant"}
              </strong>
              <span>
                {lastSearchSession?.location || strategy.location || "France entière"}
                {lastSearchSession ? ` · ${formatSessionDate(lastSearchSession.createdAt)}` : ""}
              </span>
            </div>
            {lastSearchSession && (
              <div className="assistant-collapsed-metrics" aria-label="Résumé compact de recherche">
                <span><b>{lastSearchSession.importedCount}</b> nouvelles</span>
                <span><b>{lastSearchSession.duplicateCount}</b> doublons</span>
                <span><b>{lastSearchSession.skippedCount}</b> écartées</span>
              </div>
            )}
          </div>
          <div className="assistant-collapsed-actions">
            <HelpTooltip tooltip="Relance la recherche avec les critères actuels.">
              <button className={`ghost-button compact ${loadingAction === "run-search" ? "is-loading" : ""}`} onClick={onRunSearch}>
                {loadingAction === "run-search" && <span className="button-spinner" aria-hidden="true" />}
                Relancer
              </button>
            </HelpTooltip>
            {searchResult.status === "needsConnector" && (
              <HelpTooltip tooltip="Ouvre les recherches préparées dans le navigateur pour copier une annonce réelle.">
                <button className={`ghost-button compact ${loadingAction === "open-searches" ? "is-loading" : ""}`} onClick={onOpenSearches}>
                  {loadingAction === "open-searches" && <span className="button-spinner" aria-hidden="true" />}
                  Ouvrir
                </button>
              </HelpTooltip>
            )}
            <HelpTooltip tooltip="Réouvre les questions de l'assistant pour modifier les critères.">
              <button className="ghost-button compact" type="button" onClick={() => setCriteriaOpen(true)}>
                Modifier
              </button>
            </HelpTooltip>
            <HelpTooltip tooltip="Remet l'écran comme au lancement, sans supprimer les offres sauvegardées.">
              <button className="ghost-button compact" type="button" onClick={onResetAssistantState} disabled={loadingAction === "run-search"}>
                Réinitialiser
              </button>
            </HelpTooltip>
            {top3AiCount > 0 && (
              <HelpTooltip tooltip={aiButtonTitle}>
                <button className={`ghost-button compact ${loadingAction === "ai-analyze" ? "is-loading" : ""}`} onClick={onAnalyzeTop3} disabled={aiButtonDisabled}>
                  {loadingAction === "ai-analyze" && <span className="button-spinner" aria-hidden="true" />}
                  IA
                </button>
              </HelpTooltip>
            )}
          </div>
          {diagnosisActive && diagnosticActions.length > 0 && (
            <div className="search-weak-banner">
              <span className="search-weak-title">{diagnosisTitle} essaie :</span>
              <div className="search-weak-actions">
                {diagnosticActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="search-weak-btn"
                    title={action.why}
                    onClick={action.onAct}
                    disabled={loadingAction === "run-search"}
                  >
                    <span className="search-weak-icon" aria-hidden="true">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {criteriaOpen && (
            <details className="assistant-collapsed-details" open>
              <summary>Critères</summary>
              <p>{assistantSummaryFallback || "Aucun critère détaillé."}</p>
            </details>
          )}
          {searchResult.networkStatus === "blocked" && <p className="helper-text warning-text">{searchResult.message}</p>}
          {searchResult.status === "needsConnector" && (
            <div className="android-search-pack assistant-android-search-pack" aria-label="Recherches prêtes à ouvrir">
              <strong>Liens prêts</strong>
              <div className="android-search-links">
                {queryPlan.links.slice(0, 6).map((link) => (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" key={`${link.source}-${link.label}`}>
                    <span>{link.source}</span>
                    {link.label.replace(` · ${link.source}`, "")}
                  </a>
                ))}
              </div>
              <small>Ouvre un lien, copie une annonce complète, puis colle-la dans Analyse express.</small>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={assistantStageClass}>
      <div className="assistant-stage-content assistant-question-card">
      <details
        className="criteria-panel"
        open={criteriaOpen}
        onToggle={(event) => setCriteriaOpen(event.currentTarget.open)}
      >
        <summary className="criteria-summary">
          <div className="criteria-summary-title">
            <strong>Recherche automatique</strong>
            <span>{criteriaOpen ? "Critères détaillés" : "Critères résumés"}</span>
          </div>
          <span className="ghost-button compact criteria-edit-button">{criteriaOpen ? "Réduire" : "Modifier"}</span>
        </summary>
        <div className="criteria-body assistant-body">
          <div className="assistant-pager" role="tablist" aria-label="Étapes assistant">
            {assistantSteps.map((step, index) => (
              <HelpTooltip key={step.key} tooltip={step.tooltip}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={assistantStep === step.key}
                  className={assistantStep === step.key ? "active" : ""}
                  onClick={() => setAssistantStep(step.key)}
                >
                  <span>{index + 1}</span>
                  {step.label}
                </button>
              </HelpTooltip>
            ))}
          </div>

          {assistantStep === "objective" && (
            <div className="assistant-page">
              <div className="assistant-page-head">
                <h3>Ce que tu cherches</h3>
                <p>Donne une direction métier. L'IA fera le travail de traduction en requêtes au moment de lancer.</p>
              </div>
              <div className="simple-search-grid">
                <div className="smart-field dictionary-field">
                  <div className="dictionary-input-row">
                    <div className="smart-field-label">
                      <FieldHelp label="Métier recherché" hint="semi-auto" tooltip="Métier recherché : tape un métier ou choisis une suggestion du dictionnaire. Rien ne lance la recherche automatiquement." />
                      {strategy.targetJob && (
                        <button className="ghost-button compact clear-field-button" type="button" aria-label="Effacer le métier recherché" onClick={() => onUpdateStrategy({ targetJob: "" })}>
                          X
                        </button>
                      )}
                    </div>
                    <input
                      value={strategy.targetJob}
                      placeholder="Exemple : technicien de maintenance, assistant RH, diagnostiqueur immobilier..."
                      onChange={(event) => {
                        onUpdateStrategy({ targetJob: event.target.value });
                        setActiveSuggestionField("job");
                      }}
                      onFocus={() => setActiveSuggestionField("job")}
                      onKeyDown={handleEnterAdvance}
                    />
                  </div>
                  {activeSuggestionField === "job" && (
                    <SuggestionPanel
                      title="Suggestions métier"
                      suggestions={jobDictionaryMatches}
                      emptyLabel="Aucune suggestion métier. Tu peux garder ton texte libre."
                      onPick={(suggestion) => applyDictionarySuggestion("job", suggestion)}
                    />
                  )}
                </div>
                <div className="smart-field objective-field">
                  <FieldHelp label="Intention libre" hint="contexte IA" tooltip="Intention libre : écris ce que tu veux vraiment. Gemini s'en sert pour trouver les bons intitulés sans te demander toutes les variantes de mots-clés." />
                  <textarea
                    rows={5}
                    value={strategy.assistantIntent}
                    placeholder="Exemple : je cherche un poste terrain accessible en reconversion, avec formation interne, pas commercial pur, proche diagnostic immo ou audit énergétique."
                    onChange={(event) => onUpdateStrategy({ assistantIntent: event.target.value })}
                    onKeyDown={handleEnterAdvance}
                  />
                </div>
              </div>
              {strategy.targetJob.trim() && queryPlan.keywords.length > 0 && (
                <div className="objective-preview">
                  <span className="objective-preview-label">On cherchera déjà ({queryPlan.keywords.length}) :</span>
                  <div className="keyword-cloud compact">
                    {queryPlan.keywords.slice(0, 8).map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                    {queryPlan.keywords.length > 8 && <span className="more">+{queryPlan.keywords.length - 8}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {assistantStep === "zone" && (
            <div className="assistant-page">
              <div className="assistant-page-head">
                <h3>Où chercher</h3>
                <p>Laisse vide pour chercher large. La zone intelligente garde les variantes utiles.</p>
              </div>
              <div className="simple-search-grid">
                <div className="smart-field dictionary-field">
                  <div className="dictionary-input-row">
                    <div className="smart-field-label">
                      <HelpTooltip tooltip="Zone : ville, région, département ou rien du tout. Vide signifie France entière.">
                        <strong>Zone</strong>
                      </HelpTooltip>
                      <label className="smart-toggle">
                        <input
                          type="checkbox"
                          checked={strategy.smartLocation !== false}
                          onChange={(event) => onUpdateStrategy({ smartLocation: event.target.checked })}
                        />
                        <span>zone intelligente</span>
                        {strategy.smartLocation !== false && <em>auto</em>}
                      </label>
                      {strategy.location && (
                        <button className="ghost-button compact clear-field-button" type="button" aria-label="Effacer la zone" onClick={() => onUpdateStrategy({ location: "" })}>
                          X
                        </button>
                      )}
                    </div>
                    <input
                      value={strategy.location}
                      placeholder="Exemple : Paris, IDF, Bretagne, Lyon..."
                      onChange={(event) => {
                        onUpdateStrategy({ location: event.target.value });
                        setActiveSuggestionField("zone");
                      }}
                      onFocus={() => setActiveSuggestionField("zone")}
                      onKeyDown={handleEnterAdvance}
                      onBlur={() => validateCurrentStep()}
                    />
                  </div>
                  {activeSuggestionField === "zone" && (
                    <SuggestionPanel
                      title="Suggestions zone"
                      suggestions={zoneDictionaryMatches}
                      emptyLabel="Aucune suggestion zone. Tu peux garder ton texte libre."
                      onPick={(suggestion) => applyDictionarySuggestion("zone", suggestion)}
                    />
                  )}
                </div>
                <div className="smart-field objective-field">
                  <FieldHelp label="Objectif complémentaire" hint="optionnel" tooltip="Objectif complémentaire : ajoute une nuance utile, par exemple formation interne, terrain, évolution, mobilité ou rythme souhaité." />
                  <input
                    value={strategy.objective}
                    placeholder="mobilité, formation, rythme terrain, évolution..."
                    onChange={(event) => onUpdateStrategy({ objective: event.target.value })}
                    onKeyDown={handleEnterAdvance}
                    onBlur={() => validateCurrentStep()}
                  />
                </div>
              </div>
            </div>
          )}

          {assistantStep === "conditions" && (
            <div className="assistant-page">
              <div className="assistant-page-head">
                <h3>Conditions de départ</h3>
                <p>Ces champs restent simples : ils aident à classer, pas à fermer toutes les portes.</p>
              </div>
              <div className="simple-search-grid">
                <div className="smart-field">
                  <FieldHelp label="Salaire net mini" hint="mensuel" tooltip="Salaire net mini : repère de cashflow. L'IA compare aussi brut/net, primes, variable et avantages quand les infos existent." />
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="peu importe"
                    value={strategy.salaryMin || ""}
                    onChange={(event) => onUpdateStrategy({ salaryMin: Number(event.target.value) })}
                    onKeyDown={handleEnterAdvance}
                    onBlur={() => validateCurrentStep()}
                  />
                </div>
                <div className="smart-field">
                  <FieldHelp label="Expérience" hint="recherche" tooltip="Expérience : aide à distinguer reconversion, junior ou confirmé. En reconversion, les offres avec formation claire remontent mieux." />
                  <select
                    value={strategy.experienceLevel}
                    onChange={(event) => {
                      onUpdateStrategy({ experienceLevel: event.target.value as Strategy["experienceLevel"] });
                      validateCurrentStep();
                    }}
                  >
                    <option value="debutant_reconversion">Débutant / reconversion</option>
                    <option value="junior">Junior</option>
                    <option value="confirme">Confirmé</option>
                    <option value="indifferent">Indifférent</option>
                  </select>
                </div>
                <div className="smart-field">
                  <FieldHelp label="Contrat souhaité" hint="souple" tooltip="Contrat souhaité : préférence de tri. Ce n'est strict que si les garde-fous ou règles locales l'exigent." />
                  <select
                    value={strategy.contractPreference}
                    onChange={(event) => {
                      onUpdateStrategy({ contractPreference: event.target.value as Strategy["contractPreference"] });
                      validateCurrentStep();
                    }}
                  >
                    <option value="any">Peu importe</option>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="alternance">Alternance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {assistantStep === "constraints" && (
            <div className="assistant-page">
              <div className="assistant-page-head">
                <h3>Garde-fous</h3>
                <p>Ces choix disent à Taf Sniffer ce qui est un bonus, une obligation ou un refus.</p>
              </div>
              <div className="toggle-row">
                <RequirementChip
                  label={FACILITATED_TRAINING_LABEL}
                  mode={strategy.poeiRequirement}
                  onChange={(mode) => onUpdateStrategy(requirementPatch("poeiRequirement", mode))}
                />
                <RequirementChip
                  label={activeProfile.ui.strategicRequirementLabel}
                  mode={strategy.auditRequirement}
                  onChange={(mode) => onUpdateStrategy(requirementPatch("auditRequirement", mode))}
                />
                <RequirementChip
                  label="Éviter indépendant imposé"
                  mode={strategy.independentRequirement}
                  onChange={(mode) => onUpdateStrategy(requirementPatch("independentRequirement", mode))}
                />
                <label className="toggle">
                  <input type="checkbox" checked={strategy.hideWeakOffers !== false} onChange={(event) => onUpdateStrategy({ hideWeakOffers: event.target.checked })} />
                  Masquer les offres faibles
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strategy.smartSearch !== false}
                    onChange={(event) => onUpdateStrategy({ smartSearch: event.target.checked })}
                  />
                  Recherche intelligente locale
                </label>
              </div>
            </div>
          )}

          {assistantStep === "summary" && (
            <div className="assistant-page">
              <div className="assistant-page-head">
                <h3>Résumé avant recherche</h3>
                <p>Corrige cette synthèse si besoin. Elle sert de contexte à Gemini et au classement.</p>
              </div>
              <div className="smart-field objective-field">
                <div className="smart-field-label">
                  <HelpTooltip tooltip="Synthèse assistant : résumé humain de ta recherche. Corrige-le si l'IA ou les règles doivent comprendre une nuance importante.">
                    <strong>Synthèse assistant</strong>
                  </HelpTooltip>
                  <span className="smart-hint">éditable</span>
                </div>
                <textarea
                  rows={4}
                  value={strategy.assistantSummary || assistantSummaryFallback}
                  onChange={(event) => onUpdateStrategy({ assistantSummary: event.target.value })}
                />
              </div>
              <details className="assistant-search-plan">
                <summary>
                  <HelpTooltip tooltip="Stratégie de recherche : requêtes générées par l'IA au lancement. Elles guident la collecte, puis les variantes locales restent en secours.">
                    <span>Stratégie de recherche</span>
                  </HelpTooltip>
                </summary>
                {strategy.aiSearchQueries?.length ? (
                  <div className="keyword-cloud">
                    {strategy.aiSearchQueries.map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>
                ) : queryPlan.keywords.length ? (
                  <>
                    <p className="helper-text">{queryPlan.keywords.length} intitulé{queryPlan.keywords.length > 1 ? "s" : ""} local{queryPlan.keywords.length > 1 ? "aux" : ""} déjà prêt{queryPlan.keywords.length > 1 ? "s" : ""}. Gemini en ajoute au lancement.</p>
                    <div className="keyword-cloud">
                      {queryPlan.keywords.slice(0, 12).map((keyword) => (
                        <span key={keyword}>{keyword}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="helper-text">Les requêtes IA seront générées au lancement de la recherche.</p>
                )}
              </details>
            </div>
          )}

          <div className="assistant-nav">
            <button className="ghost-button compact assistant-arrow" type="button" onClick={() => goToStep(-1)} disabled={activeStepIndex === 0} aria-label="Étape précédente">
              ←
            </button>
            <span>{activeStepIndex + 1}/{assistantSteps.length} · {assistantSteps[activeStepIndex].label}</span>
            <button className="ghost-button compact assistant-arrow" type="button" onClick={() => goToStep(1)} disabled={activeStepIndex === assistantSteps.length - 1} aria-label="Étape suivante">
              →
            </button>
            <button className="ghost-button compact danger-text" type="button" onClick={onResetCriteria}>
              Réinitialiser les critères
            </button>
          </div>
          {!canSearch && <p className="helper-text warning-text">Indique au moins un métier ou une intention métier pour lancer la recherche.</p>}
        </div>
      </details>

      <div className="simple-action-row">
        <HelpTooltip tooltip="Lance la collecte : l'assistant prépare un plan IA une seule fois, cherche les offres, puis le classement utilise Gemini si disponible.">
          <button className={`primary-button one-button ${loadingAction === "run-search" ? "is-loading" : ""}`} onClick={runPrimaryAssistantAction} disabled={!canSearch}>
            {loadingAction === "run-search" && <span className="button-spinner" aria-hidden="true" />}
            {primaryAssistantLabel}
          </button>
        </HelpTooltip>
        <HelpTooltip tooltip="Remet l'écran comme au lancement, sans supprimer les offres sauvegardées.">
          <button className="ghost-button compact" type="button" onClick={onResetAssistantState} disabled={loadingAction === "run-search"}>
            Réinitialiser l'état
          </button>
        </HelpTooltip>
        {showSearchResult && (
          <HelpTooltip tooltip={aiButtonTitle}>
            <button
              className={`ghost-button one-button ai-one-button ${loadingAction === "ai-analyze" ? "is-loading" : ""}`}
              onClick={onAnalyzeTop3}
              disabled={aiButtonDisabled}
            >
              {loadingAction === "ai-analyze" && <span className="button-spinner" aria-hidden="true" />}
              Analyser avec IA
            </button>
          </HelpTooltip>
        )}
        {showSearchResult && (
          <HelpTooltip tooltip={employerCount ? "Compare les employeurs détectés : salaire, avantages, note publique éventuelle et meilleure offre associée." : "Aucun employeur exploitable à comparer pour l'instant."}>
            <button
              className={`ghost-button one-button ${loadingAction === "rank-employers" ? "is-loading" : ""}`}
              onClick={onRankEmployers}
              disabled={employerCount === 0 || loadingAction === "run-search"}
            >
              {loadingAction === "rank-employers" && <span className="button-spinner" aria-hidden="true" />}
              Meilleur employeur
            </button>
          </HelpTooltip>
        )}
      </div>

      {showSearchResult ? (
        <div className={`search-ready search-${searchResult.status}`}>
          <div className="search-ready-header compact-search-header">
            <div className="search-compact-title">
              <strong>
                {searchResult.networkStatus === "blocked"
                  ? "Connexion à vérifier"
                  : searchResult.status === "needsConnector"
                    ? "Recherche prête"
                    : "Recherche terminée"}
              </strong>
              <small>
                {searchResult.networkStatus === "blocked"
                  ? "Sites d’emploi injoignables depuis le serveur local"
                  : searchResult.status === "needsConnector"
                  ? "Import manuel disponible"
                  : `${lastSearchSession?.keywords || searchResult.sourceQuery || queryPlan.keywords[0] || "Recherche"} · ${lastSearchSession?.location || "France entière"}`}
              </small>
            </div>
            <div className="search-compact-actions">
              {lastSearchSession && <span>{formatSessionDate(lastSearchSession.createdAt)}</span>}
              {lastSearchSession && (
                <button className={`ghost-button compact rerun-button ${loadingAction === "run-search" ? "is-loading" : ""}`} onClick={onRunSearch}>
                  {loadingAction === "run-search" && <span className="button-spinner" aria-hidden="true" />}
                  Relancer
                </button>
              )}
              {searchResult.status === "needsConnector" && (
                <button className={`ghost-button compact ${loadingAction === "open-searches" ? "is-loading" : ""}`} onClick={onOpenSearches}>
                  {loadingAction === "open-searches" && <span className="button-spinner" aria-hidden="true" />}
                  Ouvrir
                </button>
              )}
            </div>
          </div>
          <p className="search-ready-message">
            {searchResult.networkStatus === "blocked" || searchResult.status === "needsConnector"
              ? searchResult.message
              : "Résumé de la dernière recherche. Les détails restent repliés pour garder les résultats visibles."}
          </p>
          {loadingAction === "ai-analyze" && <p className="ai-progress">Analyse intelligente en cours...</p>}
          {searchResult.status === "needsConnector" && (
            <div className="android-search-pack" aria-label="Recherches prêtes à ouvrir">
              <strong>Recherches prêtes</strong>
              <div className="android-search-links">
                {queryPlan.links.slice(0, 6).map((link) => (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" key={`${link.source}-${link.label}`}>
                    <span>{link.source}</span>
                    {link.label.replace(` · ${link.source}`, "")}
                  </a>
                ))}
              </div>
              <small>Ouvre un lien, copie une annonce complète, puis colle-la dans Analyse express.</small>
            </div>
          )}
          {lastSearchSession && (
            <>
              <div className="search-compact-metrics" aria-label="Résumé de la dernière recherche">
                <span><strong>{lastSearchSession.importedCount}</strong> nouvelles</span>
                <span><strong>{lastSearchSession.duplicateCount}</strong> doublons</span>
                <span><strong>{sessionIgnoredCount}</strong> ignorées</span>
                <span><strong>{lastSearchSession.skippedCount}</strong> trop pauvres</span>
                <span className="search-query-chip">
                  {lastSearchSession.keywords}
                  {lastSearchSession.location ? ` · ${lastSearchSession.location}` : " · France entière"}
                </span>
              </div>
            </>
          )}
          {terrainReminderVisible && (
            <div className="terrain-simple-reminder" aria-label="Rappel validation terrain">
              <strong>Terrain</strong>
              <span>{terrainReport.annotatedCount}/{terrainReport.target} annotées</span>
              <span>{terrainQueues.correctionRows.length} à corriger</span>
              <span>{terrainQueues.annotationRows.length} à annoter</span>
              <span>{terrainQueues.readyRows.length} prêtes scoring</span>
            </div>
          )}
          {searchResult.networkStatus === "blocked" ? (
            <NetworkDiagnosticsCard
              diagnostics={networkDiagnostics}
              compact
              loading={loadingAction === "network-diagnostics"}
              onRun={onRunNetworkDiagnostics}
              showDetails={showDebugInfo}
            />
          ) : hasSearchDetails && (
            <details className="search-details-panel collapsible-panel">
              <summary className="collapsible-summary search-details-summary">
                <span className="collapsible-title">
                  <strong>Détails de recherche</strong>
                  <em>
                    {sourceReports.length > 0
                      ? `${sourceSummary.usefulCount} sources utiles · ${sourceSummary.skipped} écartées`
                      : "Sources et bilan décisionnel"}
                  </em>
                </span>
              </summary>
              <div className="search-details-content collapsible-content">
                {lastSearchSession && (
                  <div className="import-quality-card">
                    <strong>Qualité import</strong>
                    <div className="import-quality-grid">
                      <span><b>{importQuality.imported}</b> importées</span>
                      <span><b>{importQuality.duplicates}</b> doublons</span>
                      <span><b>{importQuality.skipped}</b> écartées</span>
                      <span><b>{importQuality.poor}</b> trop pauvres</span>
                      <span><b>{importQuality.missingLinks}</b> sans lien annonce</span>
                      <span><b>{importQuality.required}</b> hors critères obligatoires</span>
                    </div>
                    <small>
                      {importQuality.noisySources.length
                        ? `Sources les plus bruyantes : ${importQuality.noisySources.join(", ")}.`
                        : "Pas de source particulièrement bruyante sur cette recherche."}
                    </small>
                  </div>
                )}
                {sourceReports.length > 0 && (
                  <div className="search-source-summary" aria-label="Bilan compact des sources">
                    <span><strong>{sourceSummary.usefulCount}</strong> sources utiles{sourceSummary.usefulNames ? ` · ${sourceSummary.usefulNames}` : ""}</span>
                    <span><strong>{sourceSummary.blockedCount}</strong> bloquée{sourceSummary.blockedCount > 1 ? "s" : ""}</span>
                    <span><strong>{sourceSummary.skipped}</strong> écartée{sourceSummary.skipped > 1 ? "s" : ""}</span>
                    {sourceSummary.missingLinks > 0 && <span>{sourceSummary.missingLinks} sans lien détail</span>}
                    {sourceSummary.required > 0 && <span>{sourceSummary.required} hors critères obligatoires</span>}
                  </div>
                )}
                <SourceHealthCompact stats={sourceHealthStats} showDebugInfo={showDebugInfo} embedded />
                {hasDecisionSummary && (
                  <div className="decision-summary-card compact-decision-summary embedded-decision-summary">
                    <div className="decision-summary-collapsed">
                      <span className="collapsible-title">
                        <strong>Bilan décisionnel</strong>
                        <em>{strategy.hideWeakOffers ? "bruit masqué" : "tout affiché"}</em>
                      </span>
                      <span className="decision-summary-line">
                        <span className="fit-match"><strong>{decisionSummary.match}</strong> dans les critères</span>
                        <span className="fit-review"><strong>{decisionSummary.review}</strong> à creuser</span>
                        <span className="fit-weak"><strong>{decisionSummary.hiddenWeak}</strong> faibles masquées</span>
                      </span>
                    </div>
                    <div className="decision-reasons">
                      {decisionSummary.topReasons.length ? (
                        decisionSummary.topReasons.map(([reason, count]) => (
                          <span key={reason}>
                            {reason} <strong>{count}</strong>
                          </span>
                        ))
                      ) : (
                        <span>Aucun écart récurrent détecté.</span>
                      )}
                    </div>
                  </div>
                )}
                {sourceReports.length > 0 && (
                  <div className="search-debug-details">
                    <strong>Détails par source</strong>
                    <div className="source-report-list">
                    {sourceReports.map((report) => {
                      const statusClass = report.count > 0 ? "ok" : report.status === "blocked" ? "blocked" : "empty";
                      const skipped = report.skippedCount ? ` · ${report.skippedCount} écartée${report.skippedCount > 1 ? "s" : ""}` : "";
                      const debugCounts = [
                        report.foundCount ? `${report.foundCount} trouvée${report.foundCount > 1 ? "s" : ""}` : "",
                        report.detailLinkCount ? `${report.detailLinkCount} liens détail` : "",
                        report.missingDetailCount ? `${report.missingDetailCount} sans lien` : "",
                        report.poorQualityCount ? `${report.poorQualityCount} pauvres` : "",
                      ].filter(Boolean).join(" · ");
                      return (
                        <HelpTooltip key={report.source} tooltip={`Source ${report.source}. ${report.message}`}>
                          <span className={`source-report ${statusClass}`}>
                            {report.source} : {report.count}
                            {skipped}
                            {debugCounts ? ` · ${debugCounts}` : ""}
                          </span>
                        </HelpTooltip>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      ) : (
        <p className="helper-text">Un clic lance la recherche locale, importe les offres lisibles et recalcule le Top 3.</p>
      )}
      </div>
    </section>
  );
}

function SuggestionPanel({
  title,
  suggestions,
  emptyLabel,
  onPick,
}: {
  title: string;
  suggestions: DictionarySuggestion[];
  emptyLabel: string;
  onPick: (suggestion: DictionarySuggestion) => void;
}) {
  return (
    <div className="dictionary-suggestions" role="listbox" aria-label={title}>
      <strong>{title}</strong>
      {suggestions.length > 0 ? (
        <div className="dictionary-suggestion-list">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(suggestion)}>
              <b>{suggestion.label}</b>
            </button>
          ))}
        </div>
      ) : (
        <p className="helper-text">{emptyLabel}</p>
      )}
    </div>
  );
}

const sourceNames = (records: SourceHealthRecord[]) =>
  records.length ? records.slice(0, 4).map((record) => record.source).join(", ") : "aucune";

const sourceUsefulRate = (record: SourceHealthRecord) =>
  Math.round((record.importedCount / Math.max(1, record.searches)) * 10) / 10;

const sourceQualityAverage = (record: SourceHealthRecord) =>
  record.qualityScoreCount ? Math.round(record.qualityScoreTotal / record.qualityScoreCount) : 0;

const sourceHealthHasEnoughHistory = (records: SourceHealthRecord[]) =>
  records.some((record) => record.importedCount > 0 || record.searches >= 2 || sourceHealthKind(record) === "blocked");

const sourceHealthAdvice = (stats: SourceHealthStats) => {
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
  if (summary.useful.length) return `Sources utiles pour l'instant : ${sourceNames(summary.useful)}.`;
  if (searches <= records.length) return "Premier relevé seulement : les sources restent à surveiller avant de conclure qu'elles bloquent.";
  return "Encore peu de recul : lance quelques recherches pour repérer les sources fiables.";
};

function SourceHealthCompact({ stats, showDebugInfo, embedded = false }: { stats: SourceHealthStats; showDebugInfo: boolean; embedded?: boolean }) {
  const records = sourceHealthRecords(stats);
  if (!records.length) return null;
  const summary = sourceHealthSummary(stats);
  const advice = sourceHealthAdvice(stats);
  const hasEnoughHistory = sourceHealthHasEnoughHistory(records);
  if (!hasEnoughHistory) return null;
  if (embedded) {
    return (
      <div className="source-health-compact embedded-source-health">
        <div className="source-health-title">
          <span className="collapsible-title">
            <strong>Qualité des sources</strong>
            <em>{records.length} sources suivies</em>
          </span>
          <span className="source-health-summary">
            {summary.useful.length} utiles · {summary.watch.length} en observation · {summary.blocked.length} échecs
          </span>
        </div>
        <div className="source-health-pill-row">
          <InfoChip className="source-health-pill useful" tooltip={sourceHealthTooltip("useful")}>
            Utiles : {sourceNames(summary.useful)}
          </InfoChip>
          <InfoChip className="source-health-pill watch" tooltip={sourceHealthTooltip("watch")}>
            En observation : {sourceNames(summary.watch)}
          </InfoChip>
          <InfoChip className="source-health-pill blocked" tooltip={sourceHealthTooltip("blocked")}>
            Échecs répétés : {sourceNames(summary.blocked)}
          </InfoChip>
        </div>
        {advice && <p className="helper-text">{advice}</p>}
        {showDebugInfo && (
          <div className="search-debug-details">
            <strong>Détails qualité sources</strong>
            <div className="source-health-debug-list">
              {records.map((record) => (
                <HelpTooltip key={record.source} tooltip={`Historique ${record.source}. ${record.lastMessage}`}>
                  <span>
                    {record.source} · {record.importedCount} importées · {record.skippedCount} écartées · {record.blockedCount} blocages
                  </span>
                </HelpTooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <details className="source-health-compact collapsible-panel">
      <summary className="collapsible-summary source-health-title">
        <span className="collapsible-title">
          <strong>Qualité des sources</strong>
          <em>{records.length} sources suivies</em>
        </span>
        <span className="source-health-summary">
          {summary.useful.length} utiles · {summary.watch.length} en observation · {summary.blocked.length} échecs
        </span>
      </summary>
      <div className="collapsible-content">
        <div className="source-health-pill-row">
          <InfoChip className="source-health-pill useful" tooltip={sourceHealthTooltip("useful")}>
            Utiles : {sourceNames(summary.useful)}
          </InfoChip>
          <InfoChip className="source-health-pill watch" tooltip={sourceHealthTooltip("watch")}>
            En observation : {sourceNames(summary.watch)}
          </InfoChip>
          <InfoChip className="source-health-pill blocked" tooltip={sourceHealthTooltip("blocked")}>
            Échecs répétés : {sourceNames(summary.blocked)}
          </InfoChip>
        </div>
        {advice && <p className="helper-text">{advice}</p>}
        {showDebugInfo && (
          <details className="search-debug-details">
            <summary>Détails qualité sources</summary>
            <div className="source-health-debug-list">
              {records.map((record) => (
                <HelpTooltip key={record.source} tooltip={`Historique ${record.source}. ${record.lastMessage}`}>
                  <span>
                    {record.source} · {record.importedCount} importées · {record.skippedCount} écartées · {record.blockedCount} blocages
                  </span>
                </HelpTooltip>
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

const networkStatusLabel = (status?: NetworkDiagnosticsResult["status"]) => {
  if (status === "ok") return "Connexion OK";
  if (status === "partial") return "Connexion partielle";
  if (status === "blocked") return "Connexion à vérifier";
  if (status === "error") return "Diagnostic indisponible";
  return "Diagnostic connexion";
};

function NetworkDiagnosticsCard({
  diagnostics,
  compact = false,
  loading,
  onRun,
  showDetails,
}: {
  diagnostics: NetworkDiagnosticsResult | null;
  compact?: boolean;
  loading: boolean;
  onRun: () => void;
  showDetails: boolean;
}) {
  const status = diagnostics?.status ?? "error";
  const message = diagnostics?.message || "Teste la connexion sortante du serveur local vers quelques sites d’emploi.";
  return (
    <section className={`network-diagnostic-card ${compact ? "compact" : ""} network-${status}`}>
      <div className="network-diagnostic-header">
        <div>
          <strong>{networkStatusLabel(diagnostics?.status)}</strong>
          <small>{message}</small>
        </div>
        <button className={`ghost-button compact ${loading ? "is-loading" : ""}`} onClick={onRun}>
          {loading && <span className="button-spinner" aria-hidden="true" />}
          {diagnostics ? "Relancer diagnostic" : "Tester la connexion"}
        </button>
      </div>
      {showDetails && diagnostics?.sources?.length ? (
        <div className="network-source-list">
          {diagnostics.sources.map((source) => (
            <div className={`network-source-row ${source.ok ? "ok" : "blocked"}`} key={`${source.source}-${source.url}`}>
              <span>
                <strong>{source.source}</strong>
                <small>{source.message}</small>
              </span>
              <span>{source.status ? `HTTP ${source.status}` : source.error || "sans réponse"}</span>
              <span>{Math.round(source.durationMs)} ms</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SourceHealthPanel({
  stats,
  networkDiagnostics,
  showDebugInfo,
  loadingAction,
  onRunNetworkDiagnostics,
  onReset,
}: {
  stats: SourceHealthStats;
  networkDiagnostics: NetworkDiagnosticsResult | null;
  showDebugInfo: boolean;
  loadingAction: string;
  onRunNetworkDiagnostics: () => void;
  onReset: () => void;
}) {
  const records = sourceHealthRecords(stats);
  return (
    <section className="source-health-panel">
      <div className="section-title">
        <h2>Sources</h2>
        <button className="ghost-button compact" onClick={onReset} disabled={!records.length}>
          Réinitialiser stats sources
        </button>
      </div>
      <NetworkDiagnosticsCard
        diagnostics={networkDiagnostics}
        loading={loadingAction === "network-diagnostics"}
        onRun={onRunNetworkDiagnostics}
        showDetails={showDebugInfo || Boolean(networkDiagnostics)}
      />
      {records.length ? (
        <div className="source-health-table">
          <div className="source-health-row header">
            <span>Source</span>
            <span>Taux utile</span>
            <span>Importées</span>
            <span>Bruit</span>
            <span>Blocages</span>
            <span>Dernière recherche</span>
          </div>
          {records.map((record) => (
            <div className={`source-health-row ${sourceHealthKind(record)}`} key={record.source}>
              <span><strong>{record.source}</strong><small>{record.lastMessage || "À vérifier"}</small></span>
              <span>{sourceUsefulRate(record)}/rech.</span>
              <span>{record.importedCount}</span>
              <span>{record.skippedCount}</span>
              <span>{record.blockedCount}</span>
              <span>{formatSessionDate(record.lastSearchedAt)}</span>
              {showDebugInfo && (
                <small className="source-health-debug">
                  trouvées {record.foundCount} · liens détail {record.detailLinkCount} · sans lien {record.missingDetailCount} · pauvres {record.poorQualityCount} · qualité {sourceQualityAverage(record) || "n/a"}
                </small>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="helper-text">Lance une recherche pour commencer à mesurer les sources utiles et les sources fragiles.</p>
      )}
    </section>
  );
}

function BackupPanel({
  loadingAction,
  onExport,
  onImportClick,
  onImport,
  inputRef,
}: {
  loadingAction: string;
  onExport: () => void;
  onImportClick: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <section className="backup-panel">
      <div className="section-title">
        <ShieldCheck size={18} aria-hidden="true" />
        <h2>Sauvegarde locale</h2>
      </div>
      <p className="helper-text">Exporte ou restaure toutes tes annonces, réglages, favoris, ignorées et validations.</p>
      <div className="button-row">
        <button className={`ghost-button ${loadingAction === "export-backup" ? "is-loading" : ""}`} onClick={onExport}>
          {loadingAction === "export-backup" && <span className="button-spinner" aria-hidden="true" />}
          <Download size={17} aria-hidden="true" />
          Exporter JSON
        </button>
        <button className={`ghost-button ${loadingAction === "import-backup" ? "is-loading" : ""}`} onClick={onImportClick}>
          {loadingAction === "import-backup" && <span className="button-spinner" aria-hidden="true" />}
          <Upload size={17} aria-hidden="true" />
          Importer JSON
        </button>
      </div>
      <input ref={inputRef} className="backup-file-input" type="file" accept="application/json,.json" onChange={onImport} />
    </section>
  );
}

function TerrainPanel({
  analyses,
  loadingAction,
  onSelect,
  onCopyReport,
}: {
  analyses: AnalysisItem[];
  loadingAction: string;
  onSelect: (id: string) => void;
  onCopyReport: () => void;
}) {
  const report = buildTerrainReport(analyses);
  const action = buildTerrainActionPlan(analyses);
  const queues = terrainQueueRows(analyses);
  const blockers = buildTerrainBlockers(analyses);
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

  return (
    <section className="terrain-panel">
      <div className="section-title">
        <h2>Terrain V1</h2>
        <InfoChip className="confidence-chip done" tooltip="Objectif terrain : obtenir un jeu de 20 annonces réelles annotées avant d'ajuster le scoring.">
          objectif 20 annonces réelles annotées
        </InfoChip>
      </div>

      <div className="terrain-progress">
        <div>
          <strong>{report.annotatedCount}/{report.target}</strong>
          <span>annonces annotées</span>
        </div>
        <progress max={report.target} value={Math.min(report.annotatedCount, report.target)} />
        <small>{report.progress}% du jeu terrain</small>
      </div>

      <div className={`terrain-next-action ${action.tone}`}>
        <div>
          <span>Prochaine action</span>
          <strong>{action.title}</strong>
          <p>{action.message}</p>
        </div>
        {action.nextId && (
          <button className="ghost-button compact" onClick={() => onSelect(action.nextId)}>
            Ouvrir la prochaine annonce terrain
          </button>
        )}
      </div>

      <div className={`terrain-blockers ${blockers.readyForScoring ? "ready" : ""}`}>
        <strong>Ce qui bloque la calibration</strong>
        <div>
          {blockers.blockers.length ? (
            blockers.blockers.slice(0, 7).map((blocker) => (
              <span className={`terrain-blocker ${blocker.tone}`} key={blocker.label}>
                {blocker.label} <b>{blocker.count}</b>
              </span>
            ))
          ) : (
            <span className="terrain-blocker ready">aucun blocage</span>
          )}
        </div>
        <p>{blockers.recommendation}</p>
      </div>

      <div className="terrain-stats">
        <div><strong>{report.realCount}</strong><span>réelles</span></div>
        <div><strong>{report.correctedCount}</strong><span>corrigées</span></div>
        <div><strong>{report.favoriteCount}</strong><span>favoris</span></div>
        <div><strong>{report.exploreCount}</strong><span>à creuser</span></div>
        <div><strong>{report.ignoredCount}</strong><span>ignorées</span></div>
      </div>

      <div className="terrain-queue-grid">
        <TerrainQueueList title="À corriger" rows={correctionRows} empty="Aucune correction prioritaire." onSelect={onSelect} />
        <TerrainQueueList title="À annoter" rows={annotationRows} empty="Toutes les offres réelles sont annotées." onSelect={onSelect} />
        <TerrainQueueList title="Prêtes scoring" rows={readyRows} empty="Pas encore d’offre prête scoring." onSelect={onSelect} />
      </div>

      <div className="terrain-workflow">
        <span>Rechercher</span>
        <span>Corriger infos extraites</span>
        <span>Trier</span>
        <span>Annoter</span>
        <span>Exporter JSON</span>
      </div>

      <div className="terrain-source-list">
        {report.sourceRows.length ? (
          report.sourceRows.map((source) => (
            <div className="terrain-source-row" key={source.source}>
              <strong>{source.source}</strong>
              <span>{source.total} offre{source.total > 1 ? "s" : ""}</span>
              <span>{source.annotated} annotée{source.annotated > 1 ? "s" : ""}</span>
              <span>{source.favorite} favori · {source.explore} à creuser · {source.ignored} ignorée{source.ignored > 1 ? "s" : ""}</span>
              <small>{source.qualityCounts.map(([label, count]) => `${label} ${count}`).join(" · ") || "qualité à vérifier"} · {source.message}</small>
            </div>
          ))
        ) : (
          <p className="helper-text">Aucune annonce réelle collectée pour l’instant.</p>
        )}
      </div>

      <div className="button-row">
        <button className={`ghost-button compact ${loadingAction === "copy-terrain-report" ? "is-loading" : ""}`} onClick={onCopyReport}>
          {loadingAction === "copy-terrain-report" && <span className="button-spinner" aria-hidden="true" />}
          Copier rapport terrain Markdown
        </button>
      </div>
    </section>
  );
}

function TerrainQueueList({
  title,
  rows,
  empty,
  onSelect,
}: {
  title: string;
  rows: Array<{ id: string; title: string; meta: string; score: number; reason: string }>;
  empty: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="terrain-queue">
      <strong>{title}</strong>
      {rows.length ? (
        rows.map((row) => (
          <button className="terrain-queue-row" key={`${title}-${row.id}`} onClick={() => onSelect(row.id)}>
            <span className={scoreClass(row.score)}>{row.score}</span>
            <span>
              <b>{row.title}</b>
              <small>{row.meta}</small>
              <em>{row.reason}</em>
            </span>
          </button>
        ))
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

function CollectionPanel({
  analyses,
  queryPlan,
  loadingAction,
  onCopyKeywords,
  onCopyChecklist,
  onCopyKeyword,
}: {
  analyses: AnalysisItem[];
  queryPlan: ReturnType<typeof generateSearchQueries>;
  loadingAction: string;
  onCopyKeywords: () => void;
  onCopyChecklist: () => void;
  onCopyKeyword: (keyword: string) => void;
}) {
  const realJobs = analyses.filter(({ job }) => (job.datasetLabel || "jeu réel") === "jeu réel");
  const bySource = realJobs.reduce<Record<string, number>>((acc, { job }) => {
    const source = job.source || "Source inconnue";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="collection-panel">
      <div className="section-title">
        <h2>Collecte réelle</h2>
      </div>

      <div className="collection-progress">
        <div>
          <strong>
            {realJobs.length}/{COLLECTION_TARGET}
          </strong>
          <span>annonces collectées</span>
        </div>
        <progress max={COLLECTION_TARGET} value={Math.min(realJobs.length, COLLECTION_TARGET)} />
      </div>

      <div className="button-row">
        <button className={`ghost-button compact ${loadingAction === "copy-keywords" ? "is-loading" : ""}`} onClick={onCopyKeywords}>
          {loadingAction === "copy-keywords" && <span className="button-spinner" aria-hidden="true" />}
          Copier mots-clés
        </button>
        <button className={`ghost-button compact ${loadingAction === "copy-checklist" ? "is-loading" : ""}`} onClick={onCopyChecklist}>
          {loadingAction === "copy-checklist" && <span className="button-spinner" aria-hidden="true" />}
          Copier checklist
        </button>
      </div>

      <div className="keyword-cloud">
        {queryPlan.keywords.map((keyword) => (
          <button className="keyword-pill" key={keyword} onClick={() => onCopyKeyword(keyword)}>
            {keyword}
          </button>
        ))}
      </div>

      <details className="search-links" open>
        <summary>Liens de recherche prêts à ouvrir</summary>
        <div className="search-link-list">
          {queryPlan.links.slice(0, 24).map((link) => (
            <a href={link.url} target="_blank" rel="noopener noreferrer" key={`${link.source}-${link.label}`}>
              <span>{link.source}</span>
              {link.label.replace(` · ${link.source}`, "")}
            </a>
          ))}
        </div>
      </details>

      <div className="source-summary">
        {Object.keys(bySource).length ? (
          Object.entries(bySource).map(([source, count]) => <span key={source}>{`${source} : ${count}`}</span>)
        ) : (
          <span>Aucune annonce réelle collectée pour l’instant.</span>
        )}
      </div>
    </section>
  );
}

function ValidationPanel({
  analyses,
  onSelect,
  onUpdateExpected,
  onLoadExtractionTests,
}: {
  analyses: AnalysisItem[];
  onSelect: (id: string) => void;
  onUpdateExpected: (id: string, patch: Partial<ExpectedReview>) => void;
  onLoadExtractionTests: () => void;
}) {
  const summary = validationSummary(analyses);
  const calibration = buildCalibrationReport(analyses);
  const validationItems = analyses.slice().sort((a, b) => {
    const priority = (item: AnalysisItem) => {
      if (isRealWorldJob(item.job) && !isAnnotatedJob(item.job)) return 0;
      if (isRealWorldJob(item.job)) return 1;
      return 2;
    };
    return priority(a) - priority(b) || b.analysis.scores.global - a.analysis.scores.global;
  });

  if (analyses.length === 0) {
    return (
      <section className="validation-panel">
        <div className="section-title">
          <h2>Validation</h2>
          <button className="ghost-button compact" onClick={onLoadExtractionTests}>Charger tests extraction</button>
        </div>
        <p className="helper-text">Charge des exemples ou colle de vraies annonces pour commencer le banc de test.</p>
      </section>
    );
  }

  return (
    <section className="validation-panel">
      <div className="section-title">
        <h2>Validation réelle</h2>
        <button className="ghost-button compact" onClick={onLoadExtractionTests}>Charger tests extraction</button>
      </div>

      <div className="validation-stats">
        <div>
          <strong>{summary.reviewed.length}</strong>
          <span>annotées</span>
        </div>
        <div>
          <strong>{summary.verdictCount ? `${summary.verdictMatches}/${summary.verdictCount}` : "-"}</strong>
          <span>verdicts OK</span>
        </div>
        <div>
          <strong>{summary.missedCount}</strong>
          <span>tags manqués</span>
        </div>
        <div>
          <strong>{summary.extraCount}</strong>
          <span>faux positifs</span>
        </div>
        <div>
          <strong>{summary.warnings.length}</strong>
          <span>scores fragiles</span>
        </div>
      </div>

      <CalibrationReport report={calibration} onSelect={onSelect} />

      {summary.rulesToAdjust.length > 0 ? (
        <div className="rules-box">
          <strong>Règles à ajuster</strong>
          <ul>
            {summary.rulesToAdjust.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="helper-text">Aucune règle évidente à ajuster pour l’instant.</p>
      )}

      <div className="validation-list">
        {validationItems.map(({ job, analysis }) => {
          const review = normalizeExpectedReview(job);
          const comparison = compareValidation(analysis, review);
          const detectedTags = detectedValidationTags(analysis);

          return (
            <article className="validation-card" key={job.id}>
              <div className="validation-card-head">
                <button className="text-button" onClick={() => onSelect(job.id)}>
                  {analysis.normalizedTitle}
                </button>
                <span className={comparison.match ? "validation-ok" : "validation-ko"}>
                  {comparison.match ? "OK" : "À revoir"}
                </span>
              </div>

              <label>
                Verdict attendu
                <select
                  value={review.expectedVerdict}
                  onChange={(event) => onUpdateExpected(job.id, { expectedVerdict: event.target.value as ExpectedReview["expectedVerdict"] })}
                >
                  {["", "prioritaire", "à creuser", "piège", "hors trajectoire"].map((value) => (
                    <option value={value} key={value}>
                      {value || "Non noté"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="validation-tags">
                {validationTags.map((tag) => (
                  <label className="tag-check" key={tag}>
                    <input
                      type="checkbox"
                      checked={review.expectedTags.includes(tag)}
                      onChange={(event) => {
                        const expectedTags = event.target.checked
                          ? ([...new Set([...review.expectedTags, tag])] as ValidationTag[])
                          : review.expectedTags.filter((item) => item !== tag);
                        onUpdateExpected(job.id, { expectedTags });
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>

              <label>
                Notes
                <textarea
                  rows={2}
                  value={review.notes}
                  placeholder="Pourquoi tu attendais ce verdict ?"
                  onChange={(event) => onUpdateExpected(job.id, { notes: event.target.value })}
                />
              </label>

              <details className="validation-extraction">
                  <summary>Champs attendus</summary>
                  <div className="validation-extraction-grid">
                  {expectedExtractionInputs.map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        value={review.expectedExtraction?.[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          onUpdateExpected(job.id, {
                            expectedExtraction: {
                              ...(review.expectedExtraction ?? {}),
                              [field.key]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>

              <div className="validation-result">
                <span>Détecté : {detectedTags.length ? detectedTags.join(", ") : "rien"}</span>
                <span>Verdict Taf : {comparison.actualVerdict}</span>
                {comparison.missedTags.length > 0 && <span className="negative-text">Manqués : {comparison.missedTags.join(", ")}</span>}
                {comparison.extraTags.length > 0 && <span className="muted">En plus : {comparison.extraTags.join(", ")}</span>}
                {comparison.missedExtractionFields.length > 0 && (
                  <span className="negative-text">Champs faux : {comparison.missedExtractionFields.join(", ")}</span>
                )}
                {comparison.scoreWarning && <span className="negative-text">{comparison.scoreWarning}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CalibrationReport({
  report,
  onSelect,
}: {
  report: ReturnType<typeof buildCalibrationReport>;
  onSelect: (id: string) => void;
}) {
  const problemOffers = report.reviewed.filter(
    (item) =>
      !item.comparison.match ||
      item.comparison.missedTags.length ||
      item.comparison.extraTags.length ||
      item.comparison.missedExtractionFields.length ||
      item.comparison.scoreWarning,
  );

  if (report.reviewedCount === 0) {
    return (
      <div className="calibration-box">
        <div className="section-title">
          <h3>Calibration scoring</h3>
        </div>
        <p className="helper-text">Annote quelques offres avec un verdict attendu et des tags pour voir les erreurs récurrentes.</p>
      </div>
    );
  }

  return (
    <div className="calibration-box">
      <div className="section-title">
        <h3>Calibration scoring</h3>
      </div>
      <div className="calibration-grid">
        <div>
          <strong>{report.reviewedCount}</strong>
          <span>annotées</span>
        </div>
        <div>
          <strong>{report.verdictMatchRate !== null ? `${report.verdictMatchRate}%` : "-"}</strong>
          <span>verdicts alignés</span>
        </div>
        <div>
          <strong>{report.overratedOffers.length}</strong>
          <span>surcotées</span>
        </div>
        <div>
          <strong>{report.underratedOffers.length}</strong>
          <span>sous-cotées</span>
        </div>
        <div>
          <strong>{report.extractionCheckCount ? `${report.extractionMatchCount}/${report.extractionCheckCount}` : "-"}</strong>
          <span>champs OK</span>
        </div>
        <div>
          <strong>{report.genericTitleMisses}</strong>
          <span>titres génériques</span>
        </div>
      </div>

      <div className="calibration-columns">
        <CalibrationTagList title="Tags manqués" items={report.missedTagCounts} empty="Aucun tag manqué." />
        <CalibrationTagList title="Faux positifs" items={report.extraTagCounts} empty="Aucun faux positif." />
        <CalibrationLabelList title="Champs manqués" items={report.extractionMissCounts} empty="Aucun champ manqué." />
        <CalibrationLabelList title="Sources fragiles" items={report.fragileSources} empty="Aucune source fragile." />
      </div>

      {report.priorityRules.length > 0 && (
        <div className="rules-box">
          <strong>Recommandations de règles</strong>
          <ul>
            {report.priorityRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {problemOffers.length > 0 && (
        <div className="calibration-offers">
          <strong>Offres à revoir</strong>
          {problemOffers.slice(0, 6).map(({ job, analysis, review, comparison }) => (
            <button className="calibration-offer" key={job.id} onClick={() => onSelect(job.id)}>
              <span>{analysis.normalizedTitle}</span>
              <small>
                Attendu : {review.expectedVerdict || "non noté"} · Taf : {comparison.actualVerdict}
                {comparison.missedTags.length ? ` · manqués : ${comparison.missedTags.join(", ")}` : ""}
                {comparison.extraTags.length ? ` · en trop : ${comparison.extraTags.join(", ")}` : ""}
                {comparison.missedExtractionFields.length ? ` · champs : ${comparison.missedExtractionFields.join(", ")}` : ""}
                {comparison.scoreWarning ? ` · ${comparison.scoreWarning}` : ""}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CalibrationTagList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<[ValidationTag, number]>;
  empty: string;
}) {
  return (
    <div className="calibration-list">
      <strong>{title}</strong>
      {items.length ? (
        items.slice(0, 5).map(([tag, count]) => (
          <span key={tag}>
            {tag} <b>{count}</b>
          </span>
        ))
      ) : (
        <em>{empty}</em>
      )}
    </div>
  );
}

function CalibrationLabelList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<[string, number]>;
  empty: string;
}) {
  return (
    <div className="calibration-list">
      <strong>{title}</strong>
      {items.length ? (
        items.slice(0, 5).map(([label, count]) => (
          <span key={label}>
            {label} <b>{count}</b>
          </span>
        ))
      ) : (
        <em>{empty}</em>
      )}
    </div>
  );
}

function ScoreExplanation({ analysis }: { analysis: JobAnalysis }) {
  const axisLabels: Record<NonNullable<JobAnalysis["scoreLines"][number]["axis"]>, string> = {
    formationFacilitee: "Formation facilitée",
    salaryPackage: "Salaire / package",
    trajectory: "Trajectoire",
    employer: "Employeur",
    risk: "Risque maîtrisé",
    ai: "Ajustement IA",
  };
  const axisOrder: Array<NonNullable<JobAnalysis["scoreLines"][number]["axis"]>> = [
    "formationFacilitee",
    "salaryPackage",
    "trajectory",
    "employer",
    "risk",
    "ai",
  ];
  const fallbackLines = analysis.scoreLines.filter((line) => !line.axis);

  return (
    <details className="score-explanation score-explanation-collapsible">
      <summary>Voir les détails du score</summary>
      <div className="score-explanation-body">
      {axisOrder.map((axis) => {
        const lines = analysis.scoreLines.filter((line) => line.axis === axis);
        if (!lines.length) return null;
        return (
          <div className={`score-line-group ${axis === "risk" ? "malus" : axis === "ai" ? "uncertainty" : "bonus"}`} key={axis}>
            <strong>{axisLabels[axis]}</strong>
            {lines.map((line) => <ScoreLineItem line={line} key={`${axis}-${line.label}-${line.value}`} />)}
          </div>
        );
      })}
      {fallbackLines.length > 0 && (
        <div className="score-line-group uncertainty">
          <strong>Autres signaux</strong>
          {fallbackLines.map((line) => <ScoreLineItem line={line} key={`${line.label}-${line.value}`} />)}
        </div>
      )}
      <div className="score-line-group uncertainty">
        <strong>Incertitudes</strong>
        {analysis.uncertainties.length ? analysis.uncertainties.slice(0, 5).map((item) => <span key={item}>{item}</span>) : <p>Peu d'incertitudes.</p>}
      </div>
      </div>
    </details>
  );
}

function ScoreLineItem({ line }: { line: JobAnalysis["scoreLines"][number] }) {
  return (
    <div className="score-line">
      <span>{line.label}</span>
      <strong className={line.value > 0 ? "positive-text" : "negative-text"}>
        {line.value > 0 ? "+" : ""}
        {line.value}
      </strong>
    </div>
  );
}

const qualityStatusLabel = (status?: string) => {
  if (status === "conflict") return "incohérent";
  if (status === "verify") return "à vérifier";
  return "ok";
};

const aiDecisionLabel = (verdict?: AIReview["decisionVerdict"]) => {
  if (verdict === "bonne_piste") return "Bonne piste";
  if (verdict === "risque") return "Risque";
  if (verdict === "hors_cible") return "Hors cible";
  return "À creuser";
};

const aiDecisionClass = (verdict?: AIReview["decisionVerdict"]) => {
  if (verdict === "bonne_piste") return "good";
  if (verdict === "risque") return "risk";
  if (verdict === "hors_cible") return "off";
  return "review";
};

const aiDecisionTooltip = (verdict?: AIReview["decisionVerdict"]) => {
  if (verdict === "bonne_piste") return "Bonne piste : l'offre semble compatible avec ton objectif et mérite une action rapide. Vérifie surtout les points pratiques : formation, salaire, statut et zone.";
  if (verdict === "risque") return "Risque : l'offre contient un signal qui peut coûter cher ou te faire perdre du temps. Cherche les pièges classiques : variable dominant, indépendant imposé, formation payante ou salaire flou.";
  if (verdict === "hors_cible") return "Hors cible : l'offre s'éloigne trop de ta recherche actuelle. Elle peut être intéressante autrement, mais elle ne doit pas piloter ton Top prioritaire.";
  return "À creuser : l'offre a du potentiel, mais il manque une information métier avant décision. Appelle ou lis la source pour confirmer formation, salaire, contrat et conditions.";
};

const aiScoreTooltip =
  "Score IA : Gemini classe l'offre selon ton intention, les critères et les garde-fous. Il complète le score local, mais ne remplace pas les filtres stricts comme formation facilitée obligatoire, audit ou indépendant.";

const salaryAiTooltip =
  "Salaire IA : compare le fixe avant les primes, puis le package si les primes sont estimables. Brut/net, variable, 13e mois, avantages et temps de travail changent beaucoup la lecture cashflow.";

const decisionReasonsTooltip =
  "Raisons IA : ce sont les facteurs métier qui expliquent la recommandation. Cherche si l'IA parle de formation facilitée, POEI/AFPR, audit, indépendant, expérience, contrat, salaire ou avantages.";

const recruiterQuestionsTooltip =
  "Questions recruteur : elles servent à lever les zones floues avant de t'engager. Priorité aux sujets qui changent la décision : prise en charge formation, salaire fixe/variable, statut, rythme terrain et certifications.";

const qualityCheckTooltip =
  "Contrôle qualité : compare les infos extraites, la source et l'avis IA. Ok signifie cohérent, à vérifier signifie ambigu, conflit signifie que deux sources ne racontent pas la même chose.";

const signalListTooltip = (title: string) => {
  const text = normalizeDedupe(title);
  if (text.includes("fort")) return "Points forts : signaux qui rendent l'offre plus intéressante. Exemple : formation prise en charge, débutant accepté, CDI clair, avantages ou trajectoire vers audit.";
  if (text.includes("bloquant")) return "Points bloquants : risques qui peuvent rendre l'offre coûteuse ou hors cible. Exemple : indépendant imposé, formation payante, variable dominant, salaire absent ou exigences trop hautes.";
  return "À vérifier : informations encore floues. Ce n'est pas forcément négatif, mais il faut confirmer avant de garder l'offre haut dans le classement.";
};

const qualityText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const importantQualityIssues = (review?: AIReview) => {
  const checks = review?.status === "done" && review.qualityCheck ? review.qualityCheck.fieldChecks : [];
  const important = ["entreprise", "company", "lieu", "location", "contrat", "temps", "worktime", "salaire", "salary", "brut", "net", "prime", "poei", "audit", "independant"];
  return checks
    .filter((item) => item.status !== "ok")
    .filter((item) => important.some((term) => qualityText(`${item.field} ${item.reason}`).includes(term)))
    .slice(0, 3);
};

function QualityCheckView({ quality }: { quality?: AIReview["qualityCheck"] }) {
  if (!quality) return null;
  const issues = quality.fieldChecks.filter((item) => item.status !== "ok").slice(0, 6);
  return (
    <div className={`quality-check ${quality.status}`}>
      <div className="quality-check-header">
        <strong>
          Contrôle qualité
          <InlineHelp tooltip={qualityCheckTooltip} />
        </strong>
        <span>{qualityStatusLabel(quality.status)} · confiance {quality.confidence}</span>
      </div>
      {issues.length > 0 ? (
        <ul>
          {issues.map((item) => (
            <li key={`${item.field}-${item.reason}`}>
              <strong>{item.field}</strong>
              <span>{item.reason || "Champ à vérifier."}</span>
              {item.suggestedValue && <em>Proposition : {item.suggestedValue}</em>}
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune incohérence majeure détectée.</p>
      )}
      {quality.warnings.length > 0 && (
        <div className="quality-warning-list">
          {quality.warnings.slice(0, 4).map((warning) => <span key={warning}>{warning}</span>)}
        </div>
      )}
    </div>
  );
}

function QuickDecisionCard({
  job,
  analysis,
  decision,
  strategy,
  loadingAction,
  onAnalyze,
  onEditExtraction,
  onIgnore,
}: {
  job: JobRecord;
  analysis: JobAnalysis;
  decision: { fit: DecisionFit; reasons: string[] };
  strategy: Strategy;
  loadingAction: string;
  onAnalyze: () => void;
  onEditExtraction: () => void;
  onIgnore: () => void;
}) {
  const [showPrep, setShowPrep] = useState(false);
  const summary = buildQuickDecisionSummary(job, analysis, decision, strategy);
  const review = job.aiReview;
  const prep = summary.source === "ia" && review?.status === "done" ? review.applicationPrep : undefined;
  const hasPrep = Boolean(prep && (prep.callAngle || prep.message || prep.checkpoints.length > 0));
  const needsVerification = summary.confidence === "faible" || extractionReviewValue(job) === "needs_review" || summary.warnings.length > 0;
  const sourceLabel = summary.source === "ia" ? "IA" : "local";
  const actionButton =
    summary.nextAction === "analyser avec IA" ? (
      <button className={`primary-button compact ${loadingAction === "ai-analyze" ? "is-loading" : ""}`} onClick={onAnalyze}>
        {loadingAction === "ai-analyze" && <span className="button-spinner" aria-hidden="true" />}
        Analyser cette offre avec IA
      </button>
    ) : summary.nextAction === "corriger les infos" ? (
      <button className="primary-button compact" onClick={onEditExtraction}>
        Corriger les infos
      </button>
    ) : summary.nextAction === "ignorer" ? (
      <button className="ghost-button compact danger-text" onClick={onIgnore}>
        Ignorer
      </button>
    ) : hasPrep ? (
      <button className="primary-button compact" onClick={() => setShowPrep((current) => !current)}>
        Préparer mon approche
      </button>
    ) : summary.source === "ia" ? (
      <button className="ghost-button compact" onClick={() => document.querySelector(".ai-review-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        Voir l’avis IA
      </button>
    ) : (
      <button className="ghost-button compact" onClick={onAnalyze}>
        Affiner avec IA
      </button>
    );

  return (
    <section className={`quick-decision-card ${quickDecisionVerdictClass(summary.verdict)} ${summary.source}`}>
      <div className="quick-decision-head">
        <div>
          <span className="eyebrow">Décision rapide</span>
          <h3>{summary.verdict}</h3>
        </div>
        <div className="quick-decision-chips">
          <InfoChip className={`field-source-chip ${summary.source === "ia" ? "ai" : "local"}`} tooltip={summary.source === "ia" ? "Résumé basé sur l'avis Gemini déjà généré." : "Résumé local calculé avec les règles Taf Sniffer."}>
            {sourceLabel}
          </InfoChip>
          {needsVerification && (
            <InfoChip className="field-quality-chip verify" tooltip="Des champs ou signaux restent à vérifier avant de décider définitivement.">
              à vérifier
            </InfoChip>
          )}
        </div>
      </div>
      <div className="quick-decision-grid">
        <div>
          <strong>Pourquoi</strong>
          <ul>
            {summary.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
        <div>
          <strong>Vigilance</strong>
          {summary.warnings.length ? (
            <ul>
              {summary.warnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : (
            <p>Pas de point bloquant majeur détecté.</p>
          )}
        </div>
        <div className="quick-next-action">
          <strong>Prochaine action</strong>
          <p>{summary.nextAction}</p>
          {actionButton}
          {summary.nextAction !== "ignorer" && decision.fit === "weak" && (
            <button className="ghost-button compact danger-text" onClick={onIgnore}>
              {job.ignored ? "Restaurer" : "Ignorer"}
            </button>
          )}
        </div>
      </div>
      {showPrep && prep && (
        <div className="quick-approach-content">
          {prep.callAngle && <p><strong>Angle d'appel</strong>{prep.callAngle}</p>}
          {prep.message && <p><strong>Message candidature</strong>{prep.message}</p>}
          {prep.checkpoints.length > 0 && (
            <ul>
              {prep.checkpoints.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AIReviewCard({
  job,
  analysis,
  onAnalyze,
  loadingAction,
  showQuestions = true,
}: {
  job: JobRecord;
  analysis: JobAnalysis;
  onAnalyze: () => void;
  loadingAction: string;
  showQuestions?: boolean;
}) {
  const review = job.aiReview;
  const [showPrep, setShowPrep] = useState(false);
  const analyzeButton = (label: string) => (
    <button className={`ghost-button compact ${loadingAction === "ai-analyze" ? "is-loading" : ""}`} onClick={onAnalyze}>
      {loadingAction === "ai-analyze" && <span className="button-spinner" aria-hidden="true" />}
      {label}
    </button>
  );

  if (!review || review.status === "idle") {
    return (
      <section className="ai-review-card muted-card">
        <div className="section-title"><h3>Avis intelligent</h3></div>
        <p>Pas encore d'avis IA pour cette offre.</p>
        {analyzeButton("Analyser cette offre")}
      </section>
    );
  }

  if (review.status === "loading") {
    return (
      <section className="ai-review-card muted-card">
        <div className="section-title"><h3>Avis intelligent</h3></div>
        <p>Analyse intelligente en cours...</p>
      </section>
    );
  }

  if (review.status === "skipped") {
    return (
      <section className="ai-review-card muted-card">
        <div className="section-title"><h3>Avis intelligent</h3></div>
        <p>{review.errorMessage || "Analyse intelligente non configurée."}</p>
        {analyzeButton("Réessayer l'analyse IA")}
      </section>
    );
  }

  if (review.status === "error") {
    return (
      <section className="ai-review-card warning">
        <div className="section-title"><h3>Avis intelligent</h3></div>
        <p>{review.errorMessage || "Analyse intelligente indisponible."}</p>
        {analyzeButton("Réessayer l'analyse IA")}
      </section>
    );
  }

  const adjustment = analysis.aiScoreAdjustment || 0;
  const uncertainties = [...(review.uncertainties || []), ...(analysis.aiScoreReasons || [])].slice(0, 5);
  const decisionReasons = (review.decisionReasons && review.decisionReasons.length ? review.decisionReasons : review.scoreReasons || []).slice(0, 3);
  const recruiterQuestions = (review.recruiterQuestions && review.recruiterQuestions.length ? review.recruiterQuestions : review.questions || []).slice(0, 5);
  const aiRankReasons = review.aiRankReasons || [];
  const salaryRankReasons = review.salaryRankReasons || [];
  const salaryWarnings = review.salaryWarnings || [];
  const prep = review.applicationPrep;
  return (
    <section className="ai-review-card">
      <div className="section-title">
        <h3>
          Avis IA clair
          <InlineHelp tooltip="Avis IA : synthèse métier générée par Gemini à partir de l'annonce et de tes critères. Elle aide à décider, mais les corrections manuelles et les garde-fous restent prioritaires." />
        </h3>
        <span className={adjustment >= 0 ? "positive-text" : "negative-text"}>
          {adjustment >= 0 ? "+" : ""}{adjustment} pts IA
          <InlineHelp tooltip="Ajustement IA : petit bonus ou malus borné qui corrige ce que les règles locales peuvent mal lire. Il ne doit pas transformer une mauvaise offre en priorité sans raison concrète." />
        </span>
      </div>
      <div className={`ai-decision-verdict ${aiDecisionClass(review.decisionVerdict)}`}>
        <strong>
          {aiDecisionLabel(review.decisionVerdict)}
          <InlineHelp tooltip={aiDecisionTooltip(review.decisionVerdict)} />
        </strong>
        <InfoChip className={`confidence-chip ${review.confidence === "bonne" ? "done" : ""}`} tooltip={confidenceTooltip(review.confidence)}>
          {review.confidence ? `Confiance ${review.confidence}` : "Avis à confirmer"}
        </InfoChip>
      </div>
      {Number.isFinite(Number(review.aiRankScore)) && (
        <p className="ai-rank-summary">
          <span>
            Score IA {Math.round(Number(review.aiRankScore))}/100
            <InlineHelp tooltip={aiScoreTooltip} />
          </span>
          {aiRankReasons.length ? ` · ${aiRankReasons.slice(0, 2).join(" · ")}` : ""}
        </p>
      )}
      {Number.isFinite(Number(review.salaryRankScore)) && (
        <div className="salary-rank-summary">
          <div>
            <strong>
              Salaire IA {Math.round(Number(review.salaryRankScore))}/100
              <InlineHelp tooltip={salaryAiTooltip} />
            </strong>
            <span>{review.salaryComparableLabel || analysis.normalizedSalary.packageLabel || analysis.normalizedSalary.fixedLabel || analysis.normalizedSalary.label || analysis.salary}</span>
          </div>
          {salaryRankReasons.length > 0 && (
            <ul>
              {salaryRankReasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
          {salaryWarnings.length > 0 && (
            <p>{salaryWarnings.slice(0, 3).join(" · ")}</p>
          )}
        </div>
      )}
      {decisionReasons.length > 0 && (
        <div className="ai-list-block">
          <strong>
            Raisons IA
            <InlineHelp tooltip={decisionReasonsTooltip} />
          </strong>
          <ul className="ai-decision-reasons">
            {decisionReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}
      <p>{review.summary || "Avis intelligent à vérifier."}</p>
      <p className="muted">Score local {analysis.localScore}/100 → score final {analysis.scores.global}/100.</p>
      <QualityCheckView quality={review.qualityCheck} />
      {showQuestions && recruiterQuestions.length > 0 && (
        <div className="ai-question-block">
          <strong>
            Questions recruteur IA
            <InlineHelp tooltip={recruiterQuestionsTooltip} />
          </strong>
          <ol>
            {recruiterQuestions.map((question) => <li key={question}>{question}</li>)}
          </ol>
        </div>
      )}
      {prep && (prep.callAngle || prep.message || prep.checkpoints.length > 0) && (
        <div className="application-prep-block">
          <button className="ghost-button compact" onClick={() => setShowPrep((current) => !current)}>
            Préparer mon approche
          </button>
          {showPrep && (
            <div className="application-prep-content">
              {prep.callAngle && <p><strong>Angle d'appel<InlineHelp tooltip="Angle d'appel : façon simple d'aborder le recruteur. Il sert à vérifier vite les points décisifs sans réciter toute l'annonce." /></strong>{prep.callAngle}</p>}
              {prep.message && <p><strong>Message candidature<InlineHelp tooltip="Message candidature : formulation courte adaptée à l'offre. Elle doit rester factuelle et mettre en avant les signaux utiles : formation, terrain, expérience ou motivation." /></strong>{prep.message}</p>}
              {prep.checkpoints.length > 0 && (
                <ul>
                  {prep.checkpoints.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      <div className="ai-review-grid">
        <SignalList title="Points forts IA" tooltip={signalListTooltip("Points forts IA")} items={review.strengths || []} empty="Aucun point fort IA." tone="positive" />
        <SignalList title="Points bloquants IA" tooltip={signalListTooltip("Points bloquants IA")} items={review.blockers || []} empty="Aucun blocage IA." tone="negative" />
        <SignalList title="À vérifier IA" tooltip={signalListTooltip("À vérifier IA")} items={uncertainties} empty="Peu d'incertitudes IA." tone="warning" />
      </div>
    </section>
  );
}

function QuickNotesCard({
  job,
  onUpdateExpectedReview,
}: {
  job: JobRecord;
  onUpdateExpectedReview: (patch: Partial<ExpectedReview>) => void;
}) {
  const review = normalizeExpectedReview(job);
  return (
    <section className="quick-notes-card">
      <div className="section-title">
        <h3>Notes rapides</h3>
      </div>
      <textarea
        value={review.notes}
        rows={2}
        placeholder="Ton avis perso : appeler, éviter, question à clarifier..."
        onChange={(event) => onUpdateExpectedReview({ notes: event.target.value })}
      />
    </section>
  );
}

function CollapsibleDetail({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="compact-detail-panel">
      <summary>{title}</summary>
      <div className="compact-detail-content">{children}</div>
    </details>
  );
}

function ExtractedInfoValue({ label, value }: { label: string; value?: string }) {
  const displayValue = value || "Non détecté";
  const alwaysExpandable = ["Avantages", "Primes", "Primes estimées", "Expérience demandée"].includes(label);
  const isExpandable = alwaysExpandable || displayValue.length > 110;

  if (!isExpandable) {
    return <span className="extracted-info-value">{displayValue}</span>;
  }

  return (
    <details className="extracted-info-value extracted-info-expandable">
      <summary>
        <span className="extracted-info-clamp">{displayValue}</span>
        <span className="extracted-info-toggle" aria-hidden="true">
          <span className="more">ouvrir</span>
          <span className="less">réduire</span>
        </span>
      </summary>
      <p>{displayValue}</p>
    </details>
  );
}

function ExtractedFieldBadges({
  label,
  fieldMeta,
  showDebugInfo,
  analysis,
}: {
  label: string;
  fieldMeta?: ControlledExtractionField;
  showDebugInfo: boolean;
  analysis: JobAnalysis;
}) {
  return (
    <>
      {fieldMeta?.source === "ai" && (
        <InfoChip className="field-source-chip ai" tooltip={extractionSourceTooltip("ai")}>
          IA
        </InfoChip>
      )}
      {showDebugInfo && fieldMeta && fieldMeta.source !== "ai" && (
        <InfoChip className={`field-source-chip ${fieldMeta.source}`} tooltip={extractionSourceTooltip(fieldMeta.source)}>
          {extractionSourceLabel(fieldMeta.source)}
        </InfoChip>
      )}
      {fieldMeta?.quality === "verify" && (
        <InfoChip className="field-quality-chip verify" tooltip={fieldQualityTooltip("verify", fieldMeta.reason)}>
          à vérifier
        </InfoChip>
      )}
      {fieldMeta?.quality === "conflict" && (
        <InfoChip className="field-quality-chip conflict" tooltip={fieldQualityTooltip("conflict", fieldMeta.reason)}>
          conflit IA
        </InfoChip>
      )}
      {label === "Entreprise" && (
        <InfoChip className="company-type-chip" tooltip={companyTypeTooltip(companyTypeDisplay(analysis.companyType))}>
          {companyTypeDisplay(analysis.companyType)}
        </InfoChip>
      )}
      {label === "Expérience demandée" && (
        <InfoChip className={`experience-fit-chip ${analysis.experienceFit}`} tooltip={experienceFitTooltip(analysis.experienceFit)}>
          {experienceFitLabel(analysis.experienceFit)}
        </InfoChip>
      )}
    </>
  );
}

function CompanyProfileCard({ profile }: { profile: CompanyProfile }) {
  return (
    <div className={`company-profile-card ${profile.status}`}>
      <div>
        <strong>{profile.estimatedType || "À vérifier"}</strong>
        <InfoChip className={`confidence-chip ${profile.confidence === "bonne" ? "done" : ""}`} tooltip={confidenceTooltip(profile.confidence)}>
          Confiance {profile.confidence}
        </InfoChip>
      </div>
      <p>{profile.summary || "Fiche entreprise à vérifier."}</p>
      {profile.website && (
        <a href={profile.website} target="_blank" rel="noopener noreferrer">
          site probable
        </a>
      )}
      {profile.signals.length > 0 && (
        <div className="company-profile-signals">
          {profile.signals.slice(0, 4).map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const QUICK_FACT_LABELS = ["Lieu", "Contrat", "Expérience demandée", "Temps de travail"];

const extractionFieldForLabel = (label: string): keyof ControlledExtractionValues | undefined => {
  const map: Partial<Record<string, keyof ControlledExtractionValues>> = {
    Entreprise: "company",
    Lieu: "location",
    Contrat: "contract",
    "Temps de travail": "workTime",
    Salaire: "salary",
    Primes: "bonus",
    "Expérience demandée": "requiredExperience",
    Avantages: "benefits",
  };
  return map[label];
};

const extractionSourceLabel = (source: string) => {
  if (source === "manual") return "manuel";
  if (source === "structured") return "source";
  if (source === "ai") return "IA";
  return "local";
};

const extractionSourceTooltip = (source: string) => {
  if (source === "manual") return "Correction manuelle : elle prime sur l'IA, la source et la détection locale.";
  if (source === "structured") return "Champ fourni directement par la source de l'annonce quand elle expose une donnée fiable.";
  if (source === "ai") return "Champ réécrit par l'IA après lecture de l'annonce. À vérifier si une alerte apparaît.";
  return "Champ détecté localement par Taf Sniffer à partir du texte de l'annonce.";
};

const fieldQualityTooltip = (quality: "verify" | "conflict", reason?: string) => {
  const base = quality === "conflict"
    ? "Conflit détecté : Taf Sniffer garde la valeur la plus sûre et te propose de corriger si besoin."
    : "À vérifier : le champ est exploitable, mais un détail peut être ambigu.";
  return reason ? `${base} ${reason}` : base;
};

const salaryKindTooltip = (kind: JobAnalysis["salaryKind"]) => {
  if (kind === "brut") return "Salaire annoncé en brut : Taf Sniffer l'utilise avec prudence pour comparer le cashflow.";
  if (kind === "net") return "Salaire annoncé en net : comparaison cashflow plus directe.";
  return "Brut ou net non précisé : le salaire reste à clarifier avant décision.";
};

const salaryKindDisplay = (kind: string) => {
  const normalized = terrainText(kind);
  if (normalized.includes("brut")) return "brut";
  if (normalized.includes("net")) return "net";
  return "non précisé";
};

const companyTypeTooltip = (type: string) =>
  type === "à identifier" || type === "type inconnu"
    ? "Type d'employeur non confirmé. Utilise Identifier ou vérifie le site employeur."
    : `Type estimé : ${type}. Cette info aide à repérer cabinet métier, groupe, franchise ou intérim.`;

const experienceFitTooltip = (fit: JobAnalysis["experienceFit"]) => {
  if (fit === "reconversion_ok") return "Signal favorable : l'annonce semble accepter 0 à 1 an d'expérience ou une reconversion.";
  if (fit === "junior") return "Profil junior accepté ou probable : estimation 0 à 2 ans, à confirmer avec le recruteur.";
  if (fit === "confirme") return "Profil confirmé attendu : estimation 3 ans ou plus, risque d'être moins adapté à une entrée métier.";
  return "Expérience demandée peu claire : à vérifier dans l'annonce ou par téléphone.";
};

const sourceHealthTooltip = (kind: "useful" | "watch" | "blocked") => {
  if (kind === "useful") return "Sources qui ont récemment donné des annonces exploitables dans Taf Sniffer.";
  if (kind === "watch") return "Sources encore en observation : il faut plus de recherches avant de juger leur fiabilité.";
  return "Sources en échec répété sur plusieurs recherches, sans annonce exploitable importée.";
};

const confidenceTooltip = (confidence?: string) => {
  if (confidence === "bonne") return "Confiance bonne : les champs clés sont assez présents pour trier l'offre.";
  if (confidence === "moyenne") return "Confiance moyenne : l'offre est exploitable, mais quelques points restent à vérifier.";
  if (confidence === "faible") return "Confiance faible : lis l'annonce ou corrige les infos avant de décider.";
  return "Indicateur de confiance : il signale si l'information est assez solide pour décider.";
};

function TerrainQuickReview({
  job,
  analysis,
  onUpdateExpectedReview,
}: {
  job: JobRecord;
  analysis: JobAnalysis;
  onUpdateExpectedReview: (patch: Partial<ExpectedReview>) => void;
}) {
  const review = normalizeExpectedReview(job);
  const terrainStatus = terrainValidationStatus({ job, analysis });
  return (
    <section className="terrain-quick-review">
      <div className="section-title">
        <h3>Annotation terrain</h3>
        <button
          className="ghost-button compact"
          onClick={() => onUpdateExpectedReview({ expectedExtraction: prefillExpectedExtraction(analysis) })}
        >
          Préremplir avec infos extraites
        </button>
      </div>

      <div className="terrain-review-status">
        <span className={`terrain-status-pill ${terrainStatus.tone}`}>{terrainStatus.label}</span>
        <small>{terrainStatus.message}</small>
      </div>

      <div className="terrain-review-grid terrain-review-main">
        <label>
          Verdict attendu
          <select
            value={review.expectedVerdict}
            onChange={(event) => onUpdateExpectedReview({ expectedVerdict: event.target.value as ExpectedReview["expectedVerdict"] })}
          >
            {["", "prioritaire", "à creuser", "piège", "hors trajectoire"].map((value) => (
              <option value={value} key={value}>
                {value || "Non noté"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="validation-tags compact-tags">
        {validationTags.map((tag) => (
          <label className="tag-check" key={tag}>
            <input
              type="checkbox"
              checked={review.expectedTags.includes(tag)}
              onChange={(event) => {
                const expectedTags = event.target.checked
                  ? ([...new Set([...review.expectedTags, tag])] as ValidationTag[])
                  : review.expectedTags.filter((item) => item !== tag);
                onUpdateExpectedReview({ expectedTags });
              }}
            />
            {tag}
          </label>
        ))}
      </div>

      <label className="terrain-notes-field">
        Notes terrain
        <input
          value={review.notes}
          placeholder="Pourquoi tu gardes, ignores ou questionnes cette offre ?"
          onChange={(event) => onUpdateExpectedReview({ notes: event.target.value })}
        />
      </label>

      <details className="validation-extraction">
        <summary>Champs attendus</summary>
        <div className="validation-extraction-grid">
          {expectedExtractionInputs.map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                value={review.expectedExtraction?.[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) =>
                  onUpdateExpectedReview({
                    expectedExtraction: {
                      ...(review.expectedExtraction ?? {}),
                      [field.key]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}

function OfferDetail({
  job,
  analysis,
  decision,
  strategy,
  activeProfile,
  isEditingExtraction,
  onEditExtraction,
  onCancelExtraction,
  onSaveExtraction,
  onClearExtraction,
  onCopyQuestions,
  onCopySummary,
  onSaveRaw,
  onUpdateMeta,
  onUpdateExpectedReview,
  onIdentifyCompany,
  onAnalyzeAi,
  onToggleFavorite,
  onToggleIgnored,
  onSetReviewStatus,
  loadingAction,
  mode,
  showDebugInfo,
  companyEnrichment,
}: {
  job: JobRecord;
  analysis: JobAnalysis;
  decision: { fit: DecisionFit; reasons: string[] };
  strategy: Strategy;
  activeProfile: ReturnType<typeof getActiveProfile>;
  isEditingExtraction: boolean;
  onEditExtraction: () => void;
  onCancelExtraction: () => void;
  onSaveExtraction: (draft: ExtractionDraft) => void;
  onClearExtraction: () => void;
  onCopyQuestions: (questions: string[]) => void;
  onCopySummary: (analysis: JobAnalysis) => void;
  onSaveRaw: (rawText: string) => void;
  onUpdateMeta: (patch: Partial<JobRecord>) => void;
  onUpdateExpectedReview: (patch: Partial<ExpectedReview>) => void;
  onIdentifyCompany: () => void;
  onAnalyzeAi: () => void;
  onToggleFavorite: () => void;
  onToggleIgnored: () => void;
  onSetReviewStatus: (status: ReviewStatus) => void;
  loadingAction: string;
  mode: UiMode;
  showDebugInfo: boolean;
  companyEnrichment?: CompanyEnrichment;
}) {
  const [editText, setEditText] = useState(job.rawText);
  const reviewStatus = normalizeReviewStatus(job);
  const decisionReason = decision.reasons.length ? decision.reasons.join(" · ") : "Correspond aux critères principaux.";
  const controlled = getControlledExtraction(job, analysis);
  const effective = controlled.values;
  const reviewValue = extractionReviewValue(job);
  const companyProfile = job.companyProfile;
  const companyAction = `identify-company-${job.id}`;
  const companyLoading = loadingAction === companyAction || companyProfile?.status === "loading";
  const companyProfileVisible = Boolean(companyProfile && companyProfile.status !== "idle" && companyProfile.status !== "loading");
  const canIdentifyCompany = Boolean(analysis.companySearchUrl);
  const qualityIssues = importantQualityIssues(job.aiReview);
  const aiRankScore = aiRankScoreFor(job, aiStrategyHash(strategy));
  const terrainStatus = terrainValidationStatus({ job, analysis });
  const displayedQuestions = job.aiReview?.status === "done" && job.aiReview.recruiterQuestions?.length
    ? job.aiReview.recruiterQuestions.slice(0, 5)
    : analysis.questions;
  const [extractionDraft, setExtractionDraft] = useState<ExtractionDraft>(() => ({
    title: effective.title,
    company: effective.company,
    location: effective.location,
    contract: effective.contract,
    workTime: effective.workTime,
    salary: effective.salary,
    bonus: effective.bonus,
    requiredExperience: effective.requiredExperience,
    benefits: effective.benefits,
    source: job.source || "",
    sourceUrl: job.sourceUrl || "",
    extractionReview: reviewValue,
  }));
  const extractedInfo: Array<[string, string | undefined]> = [
    ["Entreprise", effective.company],
    ["Lieu", effective.location],
    ["Contrat", effective.contract],
    ["Temps de travail", effective.workTime],
    ["Primes", effective.bonus],
    ["Expérience demandée", effective.requiredExperience],
    ["Avantages", effective.benefits],
  ];
  if (mode === "advanced" || showDebugInfo) {
    extractedInfo.splice(5, 0, ["Primes estimées", analysis.bonusEstimate]);
  }
  const debugExtractedInfo = [
    ["Origine", `${datasetDisplayLabel(job.datasetLabel)}${job.source ? ` · ${job.source}` : ""}`],
    ["Statut extraction", extractionReviewLabel(reviewValue)],
    ["Qualité source", extractionLabel(job.extractionQuality)],
  ];
  const assistantExtractedInfo = extractedInfo.filter(([label]) =>
    ["Entreprise", "Lieu", "Contrat", "Expérience demandée", "Avantages"].includes(label),
  );
  const visibleExtractedInfo = showDebugInfo
    ? [...extractedInfo, ...debugExtractedInfo]
    : mode === "assistant"
      ? assistantExtractedInfo
      : extractedInfo;
  const quickFacts = visibleExtractedInfo.filter(([label]) => QUICK_FACT_LABELS.includes(label));
  const detailFacts = visibleExtractedInfo.filter(([label]) => !QUICK_FACT_LABELS.includes(label));
  const displayedSalaryKind = salaryKindDisplay(analysis.salaryKind);
  const salaryFieldMeta = controlled.fields.salary;
  const salaryMetrics: Array<[string, string | undefined]> = [
    ["Fixe net mensuel", analysis.normalizedSalary?.fixedLabel || analysis.normalizedSalary?.label],
    ["Annonce", effective.salary],
    ["Taux horaire", analysis.normalizedSalary?.hourlyLabel],
    ["Package primes", analysis.normalizedSalary?.packageLabel || analysis.normalizedSalary?.bonusLabel],
  ];
  const scoreValue = aiRankScore ?? analysis.scores.global;
  const scoreLabel = aiRankScore !== null ? "Classement IA" : "Score global";
  const actionBar = (
    <div className="action-row dashboard-action-row">
      <button className={job.favorite ? "primary-button compact" : "ghost-button compact"} onClick={onToggleFavorite}>
        <Star size={16} aria-hidden="true" />
        {job.favorite ? "Favori" : "Marquer favori"}
      </button>
      <button
        className={reviewStatus === "a_creuser" ? "primary-button compact" : "ghost-button compact"}
        onClick={() => onSetReviewStatus(reviewStatus === "a_creuser" ? "a_traiter" : "a_creuser")}
      >
        <ListFilter size={16} aria-hidden="true" />
        {reviewStatus === "a_creuser" ? "Remettre à traiter" : "À creuser"}
      </button>
      {mode === "assistant" && <button className="ghost-button compact" onClick={onEditExtraction}>
        <Settings2 size={16} aria-hidden="true" />
        Corriger
      </button>}
      {mode === "advanced" && <button className="ghost-button compact" onClick={() => onCopySummary(analysis)}>
        <Copy size={16} aria-hidden="true" />
        Copier résumé
      </button>}
      {mode === "advanced" && <button className="ghost-button compact" onClick={() => onCopyQuestions(displayedQuestions)}>
        <Copy size={16} aria-hidden="true" />
        Copier questions
      </button>}
      <button className="ghost-button compact" onClick={onToggleIgnored}>
        <Eye size={16} aria-hidden="true" />
        {job.ignored ? "Restaurer" : "Ignorer"}
      </button>
      {job.sourceUrl && !isSearchResultUrl(job.sourceUrl) && (
        <a className="ghost-button compact" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Ouvrir l'offre
        </a>
      )}
    </div>
  );

  useEffect(() => {
    setEditText(job.rawText);
  }, [job.rawText, job.id]);

  useEffect(() => {
    setExtractionDraft({
      title: effective.title,
      company: effective.company,
      location: effective.location,
      contract: effective.contract,
      workTime: effective.workTime,
      salary: effective.salary,
      bonus: effective.bonus,
      requiredExperience: effective.requiredExperience,
      benefits: effective.benefits,
      source: job.source || "",
      sourceUrl: job.sourceUrl || "",
      extractionReview: reviewValue,
    });
  }, [job.id, isEditingExtraction]);

  const updateExtractionDraft = (field: keyof ExtractionDraft, value: string) => {
    setExtractionDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <>
    <article className={`offer-detail ${mode === "assistant" ? "simple-detail" : ""}`}>
      <section className="offer-dashboard" aria-label="Synthèse de l'offre">
        <div className="offer-dashboard-main">
          <div className="offer-hero">
            <div>
              <p className="eyebrow">{analysis.offerType}</p>
              <h2>{analysis.normalizedTitle}</h2>
              <p className="muted offer-hero-meta">
                <strong>{analysis.company}</strong>
                <span>{analysis.location}</span>
                <span>{analysis.contract}</span>
              </p>
              {analysis.normalizedSalary?.monthlyNetMin && analysis.normalizedSalary.confidence === "bonne" ? (
                <p className="offer-hero-salary">
                  <strong>{analysis.normalizedSalary.fixedLabel || analysis.normalizedSalary.label}</strong>
                  {analysis.salaryKind === "brut" && <span className="salary-kind-note">brut → net estimé</span>}
                  {analysis.salaryKind === "net" && <span className="salary-kind-note">net</span>}
                </p>
              ) : null}
              {companyEnrichment && (
                <div className="company-enrichment">
                  {companyEnrichment.legalForm && <span>{companyEnrichment.legalForm}</span>}
                  {companyEnrichment.employeesLabel && <span>{companyEnrichment.employeesLabel} salariés</span>}
                  {companyEnrichment.createdAt && <span>créée {new Date(companyEnrichment.createdAt).getFullYear()}</span>}
                  {companyEnrichment.sector && <span className="company-sector">{companyEnrichment.sector}</span>}
                  {companyEnrichment.siren && (
                    <a href={`https://www.pappers.fr/entreprise/${companyEnrichment.name?.toLowerCase().replace(/\s+/g, '-')}-${companyEnrichment.siren}`} target="_blank" rel="noopener noreferrer" className="company-pappers-link">
                      Pappers
                    </a>
                  )}
                </div>
              )}
              <p className="source-line">
                <span>{datasetDisplayLabel(job.datasetLabel)}</span>
                {job.source && <span>{job.source}</span>}
                <span className={reviewStatusClass(reviewStatus)}>{reviewStatusLabel(reviewStatus)}</span>
                {showDebugInfo && <span>{extractionReviewLabel(reviewValue)}</span>}
                {job.sourceUrl && !isSearchResultUrl(job.sourceUrl) && (
                  <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                    ouvrir la source
                  </a>
                )}
              </p>
              {mode === "assistant" && isRealWorldJob(job) && (
                <p className="terrain-status-line">
                  <span className={`terrain-status-pill ${terrainStatus.tone}`}>{terrainStatus.label}</span>
                  <small>{terrainStatus.message}</small>
                </p>
              )}
              {reviewValue === "needs_review" && (
                <p className="extraction-warning">Extraction partielle : vérifie l’annonce source avant décision.</p>
              )}
              {mode === "advanced" && (
                <p className={`criteria-line ${decisionFitClass(decision.fit)}`}>
                  <strong>Critères : {decisionFitLabel(decision.fit)}</strong>
                  <span>{decisionReason}</span>
                </p>
              )}
            </div>
          </div>

          {mode === "assistant" && (
            <QuickDecisionCard
              job={job}
              analysis={analysis}
              decision={decision}
              strategy={strategy}
              loadingAction={loadingAction}
              onAnalyze={onAnalyzeAi}
              onEditExtraction={onEditExtraction}
              onIgnore={onToggleIgnored}
            />
          )}

          {mode === "advanced" && (
            <div className="dashboard-verdict-card">
              <span className="eyebrow">Verdict</span>
              <strong>{analysis.verdict}</strong>
              <p>{analysis.summary}</p>
            </div>
          )}

        </div>

        <aside className="offer-dashboard-score" aria-label="Scores de l'offre">
          <ScoreRadar analysis={analysis} activeProfile={activeProfile} />
          <div className="dashboard-score-corner">
            <span>{scoreLabel}</span>
            <InfoChip
              className={`${scoreClass(scoreValue)} ${aiRankScore !== null ? "ai-rank-score" : ""}`}
              tooltip={aiRankScore !== null ? "Score de classement Gemini utilisé en mode IA." : "Score final de l'offre : règles locales, corrections et éventuel ajustement IA borné."}
            >
              {scoreValue}
            </InfoChip>
          </div>
        </aside>
      </section>

      {mode === "advanced" && (
        <section className="decision-helper">
          <div>
            <strong>Pourquoi la garder</strong>
            <p>{analysis.positiveSignals[0] || analysis.summary}</p>
          </div>
          <div>
            <strong>Ce qui bloque</strong>
            <p>{analysis.redFlags[0] || analysis.uncertainties[0] || "Pas de blocage majeur détecté."}</p>
          </div>
          <div>
            <strong>Question clé</strong>
            <p>{displayedQuestions[0] || "Clarifier le cadre du poste avant candidature."}</p>
          </div>
        </section>
      )}

      {mode === "advanced" && showDebugInfo && <div className="source-grid">
        <label>
          Source
          <input value={job.source || ""} placeholder="France Travail, Indeed..." onChange={(event) => onUpdateMeta({ source: event.target.value })} />
        </label>
        <label>
          URL source
          <input value={job.sourceUrl || ""} placeholder="https://..." onChange={(event) => onUpdateMeta({ sourceUrl: event.target.value })} />
        </label>
      </div>}

      {mode === "advanced" && (
        <section className="decision-strip">
          <div>
            <InfoChip className={confidenceClass(analysis.scoreConfidence)} tooltip={confidenceTooltip(analysis.scoreConfidence)}>
              Confiance {analysis.scoreConfidence}
            </InfoChip>
            <p>
              {analysis.confidenceReasons.length > 0
                ? analysis.confidenceReasons.join(" · ")
                : "Les informations principales sont suffisamment présentes pour un premier tri."}
            </p>
            {analysis.verdictReasons.length > 0 && <p>{analysis.verdictReasons.join(" · ")}</p>}
          </div>
          <strong>{analysis.scoreConfidence === "faible" ? "Score à confirmer avant décision" : analysis.verdict}</strong>
        </section>
      )}

      {mode === "advanced" && (
        <section className="detail-section">
          <div className="section-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <h3>Verdict</h3>
          </div>
          <p>{analysis.summary}</p>
          <p className="muted">Salaire : {analysis.salary}</p>
        </section>
      )}

      {mode === "advanced" && <AIReviewCard job={job} analysis={analysis} onAnalyze={onAnalyzeAi} loadingAction={loadingAction} />}

      {mode === "advanced" && (
        <div className="three-columns">
          <SignalList title="Signaux positifs" items={analysis.positiveSignals} empty="Aucun signal fort détecté." tone="positive" />
          <SignalList title="Red flags" items={analysis.redFlags} empty="Pas de gros red flag." tone="negative" />
          <SignalList title="À vérifier" items={analysis.uncertainties} empty="Peu d'incertitudes." tone="warning" />
        </div>
      )}

      <section className="extracted-info" aria-label="Infos extraites de l'annonce">
        <div className="extracted-info-header">
          <h3>Infos extraites</h3>
          {isEditingExtraction ? (
            <span className="extraction-status">{extractionReviewLabel(extractionDraft.extractionReview)}</span>
          ) : (
            <div className="extracted-info-actions">
              {job.sourceUrl && !isSearchResultUrl(job.sourceUrl) && (
                <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                  ouvrir l'annonce
                </a>
              )}
              <button className="ghost-button compact" onClick={onEditExtraction}>
                Corriger
              </button>
            </div>
          )}
        </div>
        {!isEditingExtraction && qualityIssues.length > 0 && (
          <p className="quality-inline-warning">
            IA : {qualityIssues.map((item) => `${item.field} à vérifier`).join(" · ")}
          </p>
        )}
        {!isEditingExtraction && (
          <div className="salary-normalized-panel" aria-label="Salaire normalisé">
            <div className="salary-normalized-head">
              <div>
                <strong>Salaire normalisé</strong>
                <span>Fixe sans primes, puis package si estimable.</span>
              </div>
              <div className="extracted-info-badges">
                {salaryFieldMeta?.source === "ai" && (
                  <InfoChip className="field-source-chip ai" tooltip={extractionSourceTooltip("ai")}>
                    IA
                  </InfoChip>
                )}
                {showDebugInfo && salaryFieldMeta && salaryFieldMeta.source !== "ai" && (
                  <InfoChip className={`field-source-chip ${salaryFieldMeta.source}`} tooltip={extractionSourceTooltip(salaryFieldMeta.source)}>
                    {extractionSourceLabel(salaryFieldMeta.source)}
                  </InfoChip>
                )}
                {salaryFieldMeta?.quality === "verify" && (
                  <InfoChip className="field-quality-chip verify" tooltip={fieldQualityTooltip("verify", salaryFieldMeta.reason)}>
                    à vérifier
                  </InfoChip>
                )}
                {salaryFieldMeta?.quality === "conflict" && (
                  <InfoChip className="field-quality-chip conflict" tooltip={fieldQualityTooltip("conflict", salaryFieldMeta.reason)}>
                    conflit IA
                  </InfoChip>
                )}
                <InfoChip
                  className={`salary-kind-chip ${displayedSalaryKind === "non précisé" ? "unknown" : "known"}`}
                  tooltip={salaryKindTooltip(analysis.salaryKind)}
                >
                  {displayedSalaryKind}
                </InfoChip>
              </div>
            </div>
            <div className="salary-normalized-grid">
              {salaryMetrics.map(([label, value], index) => (
                <div className={`salary-normalized-item ${index === 0 ? "primary" : ""}`} key={label}>
                  <span>{label}</span>
                  <strong>{value || "Non disponible"}</strong>
                </div>
              ))}
            </div>
            {showDebugInfo && salaryFieldMeta && salaryFieldMeta.quality !== "ok" && salaryFieldMeta.reason && (
              <small className="field-quality-reason">{salaryFieldMeta.reason}</small>
            )}
          </div>
        )}
        {isEditingExtraction ? (
          <>
            <div className="extraction-edit-form">
              <label>
                Titre
                <input value={extractionDraft.title} onChange={(event) => updateExtractionDraft("title", event.target.value)} />
              </label>
              <label>
                Entreprise
                <input value={extractionDraft.company} onChange={(event) => updateExtractionDraft("company", event.target.value)} />
              </label>
              <label>
                Lieu
                <input value={extractionDraft.location} onChange={(event) => updateExtractionDraft("location", event.target.value)} />
              </label>
              <label>
                Contrat
                <input value={extractionDraft.contract} onChange={(event) => updateExtractionDraft("contract", event.target.value)} />
              </label>
              <label>
                Temps de travail
                <input value={extractionDraft.workTime} placeholder="35H, 39H, temps partiel..." onChange={(event) => updateExtractionDraft("workTime", event.target.value)} />
              </label>
              <label>
                Salaire
                <input value={extractionDraft.salary} onChange={(event) => updateExtractionDraft("salary", event.target.value)} />
              </label>
              <label>
                Primes
                <input value={extractionDraft.bonus} placeholder="Non mentionnées, variable, 13e mois..." onChange={(event) => updateExtractionDraft("bonus", event.target.value)} />
              </label>
              <label>
                Expérience demandée
                <input value={extractionDraft.requiredExperience} placeholder="Débutant accepté, 2 ans, confirmé..." onChange={(event) => updateExtractionDraft("requiredExperience", event.target.value)} />
              </label>
              <label>
                Avantages
                <input value={extractionDraft.benefits} placeholder="Véhicule, tickets restaurant, mutuelle..." onChange={(event) => updateExtractionDraft("benefits", event.target.value)} />
              </label>
              <label>
                Source
                <input value={extractionDraft.source} placeholder="France Travail, Indeed..." onChange={(event) => updateExtractionDraft("source", event.target.value)} />
              </label>
              <label>
                URL source
                <input value={extractionDraft.sourceUrl} placeholder="https://..." onChange={(event) => updateExtractionDraft("sourceUrl", event.target.value)} />
              </label>
              <label>
                Statut extraction
                <select
                  value={extractionDraft.extractionReview}
                  onChange={(event) => updateExtractionDraft("extractionReview", event.target.value)}
                >
                  <option value="ok">Extraction OK</option>
                  <option value="needs_review">À vérifier</option>
                  <option value="manual">Corrigée manuellement</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button compact" onClick={() => onSaveExtraction(extractionDraft)}>
                Enregistrer
              </button>
              <button className="ghost-button compact" onClick={onCancelExtraction}>
                Annuler
              </button>
              <button className="ghost-button compact danger-text" onClick={onClearExtraction}>
                Effacer corrections
              </button>
            </div>
          </>
        ) : (
          <>
            {quickFacts.length > 0 && (
              <div className="extracted-info-quickstrip">
                {quickFacts.map(([label, value]) => {
                  const fieldKey = extractionFieldForLabel(label);
                  const fieldMeta = fieldKey ? controlled.fields[fieldKey] : undefined;
                  return (
                    <div className={`quickfact field-${fieldKey || label.toLowerCase().replace(/\s+/g, "-")}`} key={label}>
                      <span className="quickfact-label">{label}</span>
                      <span className="quickfact-value">{value || "Non détecté"}</span>
                      <div className="quickfact-badges">
                        <ExtractedFieldBadges label={label} fieldMeta={fieldMeta} showDebugInfo={showDebugInfo} analysis={analysis} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {detailFacts.length > 0 && (
              <div className="extracted-info-table">
                {detailFacts.map(([label, value]) => {
                  const fieldKey = extractionFieldForLabel(label);
                  const fieldMeta = fieldKey ? controlled.fields[fieldKey] : undefined;
                  const showCompanyActions = label === "Entreprise" && canIdentifyCompany && (mode === "advanced" || showDebugInfo);
                  return (
                    <div className={`eit-block field-${fieldKey || label.toLowerCase().replace(/\s+/g, "-")}`} key={label}>
                      <div className="eit-row">
                        <span className="eit-label">{label}</span>
                        <div className="eit-value">
                          <ExtractedInfoValue label={label} value={value} />
                        </div>
                        <div className="eit-badges">
                          <ExtractedFieldBadges label={label} fieldMeta={fieldMeta} showDebugInfo={showDebugInfo} analysis={analysis} />
                        </div>
                      </div>
                      {showDebugInfo && fieldMeta && fieldMeta.quality !== "ok" && fieldMeta.reason && (
                        <small className="field-quality-reason eit-reason">{fieldMeta.reason}</small>
                      )}
                      {showCompanyActions && (
                        <div className="company-profile-actions eit-company">
                          {companyLoading ? (
                            <span className="company-profile-loading">Identification...</span>
                          ) : companyProfileVisible ? (
                            <CompanyProfileCard profile={companyProfile!} />
                          ) : (
                            <button className="ghost-button compact" onClick={onIdentifyCompany}>
                              Identifier
                            </button>
                          )}
                          {(companyProfile?.status === "error" || companyProfile?.status === "not_found") && !companyLoading && (
                            <button className="ghost-button compact" onClick={onIdentifyCompany}>
                              Réessayer
                            </button>
                          )}
                          <a className="company-search-link" href={analysis.companySearchUrl} target="_blank" rel="noopener noreferrer">
                            Vérifier sur le web
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {mode === "assistant" && (
        <QuickNotesCard job={job} onUpdateExpectedReview={onUpdateExpectedReview} />
      )}

      {mode === "advanced" && (
        <TerrainQuickReview job={job} analysis={analysis} onUpdateExpectedReview={onUpdateExpectedReview} />
      )}

      {mode === "assistant" ? (
        <>
          <CollapsibleDetail title="Avis IA complet">
            <AIReviewCard job={job} analysis={analysis} onAnalyze={onAnalyzeAi} loadingAction={loadingAction} showQuestions={false} />
          </CollapsibleDetail>

          <CollapsibleDetail title="Questions recruteur">
            <ol className="question-list">
              {displayedQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <button className="ghost-button compact" onClick={() => onCopyQuestions(displayedQuestions)}>
              <Copy size={16} aria-hidden="true" />
              Copier questions
            </button>
          </CollapsibleDetail>

          <CollapsibleDetail title="Score détaillé">
            <section className="decision-strip">
              <div>
                <InfoChip className={confidenceClass(analysis.scoreConfidence)} tooltip={confidenceTooltip(analysis.scoreConfidence)}>
                  Confiance {analysis.scoreConfidence}
                </InfoChip>
                <p>
                  {analysis.confidenceReasons.length > 0
                    ? analysis.confidenceReasons.join(" · ")
                    : "Les informations principales sont suffisamment présentes pour un premier tri."}
                </p>
                {analysis.verdictReasons.length > 0 && <p>{analysis.verdictReasons.join(" · ")}</p>}
              </div>
              <strong>{analysis.scoreConfidence === "faible" ? "Score à confirmer avant décision" : analysis.verdict}</strong>
            </section>
            <div className="three-columns">
              <SignalList title="Signaux positifs" items={analysis.positiveSignals} empty="Aucun signal fort détecté." tone="positive" />
              <SignalList title="Red flags" items={analysis.redFlags} empty="Pas de gros red flag." tone="negative" />
              <SignalList title="À vérifier" items={analysis.uncertainties} empty="Peu d'incertitudes." tone="warning" />
            </div>
            <section className="detail-section">
              <div className="section-title">
                <AlertTriangle size={18} aria-hidden="true" />
                <h3>Pourquoi ce score ?</h3>
              </div>
              <ScoreExplanation analysis={analysis} />
            </section>
            <section className="detail-section">
              <h3>Angle candidature</h3>
              <p>{analysis.applicationAngle}</p>
            </section>
          </CollapsibleDetail>

          <CollapsibleDetail title="Texte brut">
            <textarea className="edit-offer-box" rows={10} value={job.rawText} readOnly />
            <button className="ghost-button compact" onClick={() => navigator.clipboard.writeText(job.rawText)}>
              Copier le texte
            </button>
          </CollapsibleDetail>
        </>
      ) : (
        <>
          <section className="detail-section">
            <div className="section-title">
              <AlertTriangle size={18} aria-hidden="true" />
              <h3>Pourquoi ce score ?</h3>
            </div>
            <ScoreExplanation analysis={analysis} />
          </section>

          <section className="detail-section">
            <div className="section-title">
              <ClipboardList size={18} aria-hidden="true" />
              <h3>Questions à poser</h3>
            </div>
            <ol className="question-list">
              {displayedQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>

          <section className="detail-section">
            <h3>Angle candidature</h3>
            <p>{analysis.applicationAngle}</p>
          </section>

          {showDebugInfo && <details className="raw-offer">
            <summary>Modifier / voir le texte original</summary>
            <textarea className="edit-offer-box" rows={12} value={editText} onChange={(event) => setEditText(event.target.value)} />
            <div className="button-row">
              <button className="primary-button compact" onClick={() => onSaveRaw(editText.trim())} disabled={editText.trim().length < 40}>
                Enregistrer
              </button>
              <button className="ghost-button compact" onClick={() => navigator.clipboard.writeText(job.rawText)}>
                Copier le texte
              </button>
            </div>
          </details>}
        </>
      )}
    </article>
    {actionBar}
    </>
  );
}

function ScoreMetrics({
  analysis,
  activeProfile,
  className = "",
}: {
  analysis: JobAnalysis;
  activeProfile: ReturnType<typeof getActiveProfile>;
  className?: string;
}) {
  const trajectoryLabel = activeProfile.ui.trajectoryScoreLabel;
  const metricTooltips = {
    formation:
      "Formation facilitée : ce que Taf Sniffer comprend comme aide réelle à l'entrée dans le métier : POEI, POEC, AFPR, formation prise en charge, certification financée, tutorat ou parcours d'intégration clair.",
    salary:
      "Salaire / package : lisibilité et intérêt économique de l'offre. L'axe regarde le fixe, brut/net, primes, avantages, frais, temps de travail et zones de flou.",
    trajectory:
      `${trajectoryLabel} : potentiel de progression vers ton objectif. L'axe valorise les missions qui construisent une suite logique : montée en compétence, spécialisation, audit, conseil, responsabilités ou passerelle métier.`,
    employer:
      "Employeur : qualité estimée du cadre. L'axe repère une structure formatrice, stable ou crédible, les avantages concrets, et les signaux qui rendent l'entreprise plus ou moins rassurante.",
    risk:
      "Risque maîtrisé : absence de pièges probables. L'axe pénalise indépendant imposé, salaire trop flou, variable dominant, formation à payer, pression commerciale ou incompatibilité avec les critères.",
  };

  return (
    <div className={`summary-grid ${className}`.trim()}>
      <Metric label="Formation facilitée" value={analysis.scores.formationFacilitee ?? analysis.scores.training} tooltip={metricTooltips.formation} />
      <Metric label="Salaire / package" value={analysis.scores.salaryPackage ?? analysis.scores.cashflow} tooltip={metricTooltips.salary} />
      <Metric label={trajectoryLabel} value={analysis.scores.trajectory} tooltip={metricTooltips.trajectory} />
      <Metric label="Employeur" value={analysis.scores.employer ?? analysis.scores.audit} tooltip={metricTooltips.employer} />
      <Metric label="Risque maîtrisé" value={analysis.scores.risk} tooltip={metricTooltips.risk} />
    </div>
  );
}

function ScoreRadar({
  analysis,
  activeProfile,
}: {
  analysis: JobAnalysis;
  activeProfile: ReturnType<typeof getActiveProfile>;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const axes = [
    { label: "Formation", value: analysis.scores.formationFacilitee ?? analysis.scores.training, tooltip: "Formation facilitée : POEI, POE, AFPR, formation employeur, CPF ou certification financée détectés dans l'offre." },
    { label: "Salaire", value: analysis.scores.salaryPackage ?? analysis.scores.cashflow, tooltip: "Salaire / package : adéquation du salaire annoncé avec ton objectif, plus primes, avantages et statut." },
    { label: activeProfile.ui.trajectoryScoreLabel, value: analysis.scores.trajectory, tooltip: "Trajectoire : cohérence du poste avec ton projet — intitulé, missions terrain, progression possible." },
    { label: "Employeur", value: analysis.scores.employer ?? analysis.scores.audit, tooltip: "Employeur : signaux sur la solidité, le sérieux et l'adéquation de la structure avec ton projet." },
    { label: "Risque", value: analysis.scores.risk, tooltip: "Risque maîtrisé : absence de pièges — statut imposé, variable dominant, salaire flou ou exigences bloquantes." },
  ];
  const center = 50;
  const maxRadius = 30;
  const labelRadius = maxRadius + 13;

  const angleFor = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / axes.length;

  const pointFor = (index: number, value: number) => {
    const angle = angleFor(index);
    const radius = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  };
  const outerPointFor = (index: number, radius = maxRadius) => {
    const angle = angleFor(index);
    return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  };

  const polygon = axes.map((_, index) => {
    const p = pointFor(index, axes[index].value);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
  const grid = [0.33, 0.66, 1].map((ratio) =>
    axes.map((_, index) => {
      const p = outerPointFor(index, maxRadius * ratio);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" "),
  );

  return (
    <div className="score-radar" aria-label="Radar des axes de score">
      <svg viewBox="-16 -18 132 136" role="img" aria-label="Radar score" onMouseLeave={() => setHoveredIdx(null)}>
        {grid.map((points, index) => <polygon className="score-radar-grid" points={points} key={index} />)}
        {axes.map((_, index) => {
          const p = outerPointFor(index);
          return <line className="score-radar-axis" x1={center} y1={center} x2={p.x} y2={p.y} key={index} />;
        })}
        <polygon className="score-radar-shape" points={polygon} />
        {axes.map((axis, index) => {
          const p = pointFor(index, axis.value);
          return <circle className="score-radar-dot" cx={p.x} cy={p.y} r="2" key={axis.label} />;
        })}
        {axes.map((axis, index) => {
          const angle = angleFor(index);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          const lp = { x: center + cos * labelRadius, y: center + sin * labelRadius };
          const anchor: "start" | "middle" | "end" = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
          const active = hoveredIdx === index;
          const labelColor = active ? "#3d6b1a" : "#526170";
          const baseValueColor = axis.value >= 70 ? "#16a34a" : axis.value >= 50 ? "#ca8a04" : axis.value >= 30 ? "#f97316" : "#dc2626";
          const valueColor = active ? "#3d6b1a" : baseValueColor;

          // position label+value lines relative to anchor point, going away from center
          let labelY: number;
          let valueY: number;
          if (sin < -0.5) {
            // top axis: text goes upward
            valueY = lp.y + 1;
            labelY = lp.y - 5.5;
          } else if (sin > 0.5) {
            // bottom axes: text goes downward
            labelY = lp.y + 1;
            valueY = lp.y + 7;
          } else {
            // side axes: center the two lines
            labelY = lp.y - 2.5;
            valueY = lp.y + 4;
          }

          return (
            <g
              key={`label-${axis.label}`}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "default" }}
            >
              <circle cx={lp.x} cy={lp.y} r="14" fill="transparent" />
              <text x={lp.x} y={labelY} textAnchor={anchor} fontSize="3.6" fontWeight="700" fill={labelColor}>
                {axis.label.toUpperCase()}
              </text>
              <text x={lp.x} y={valueY} textAnchor={anchor} fontSize="6" fontWeight="900" fill={valueColor}>
                {axis.value}
              </text>
            </g>
          );
        })}
      </svg>
    {hoveredIdx !== null && (
      <div className="radar-axis-tooltip">
        {axes[hoveredIdx].tooltip}
      </div>
    )}
    </div>
  );
}

function Metric({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  return (
    <InfoTooltip tooltip={tooltip}>
      {(tooltipId) => (
        <span className={`metric ${metricTone(value)}`} tabIndex={0} aria-describedby={tooltipId}>
          <span>{label}</span>
          <strong>{value}</strong>
          <span className="meter" aria-hidden="true">
            <span style={{ width: `${value}%` }} />
          </span>
        </span>
      )}
    </InfoTooltip>
  );
}

function SignalList({
  title,
  tooltip,
  items,
  empty,
  tone,
}: {
  title: string;
  tooltip?: string;
  items: string[];
  empty: string;
  tone: "positive" | "negative" | "warning";
}) {
  return (
    <section className={`signal-box ${tone}`}>
      <h3>
        {title}
        {tooltip && <InlineHelp tooltip={tooltip} />}
      </h3>
      {items.length > 0 ? (
        <ul>
          {items.slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}