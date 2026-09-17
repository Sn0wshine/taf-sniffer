import type {
  AIMode,
  ExpectedReview,
  ExtractionReviewStatus,
  JobAnalysis,
  JobRecord,
  ManualExtraction,
  ReviewStatus,
  SearchSession,
  SourceHealthStats,
  Strategy,
  Top3AIComparison,
} from "./types";
import { DEFAULT_PROFILE_ID } from "./jobProfiles";
export { demoOffers, extractionTestOffers } from "./demoData";

export type {
  AIMode,
  ExpectedReview,
  ExtractionReviewStatus,
  JobAnalysis,
  JobRecord,
  ManualExtraction,
  ReviewStatus,
  SearchSession,
  SourceHealthStats,
  Strategy,
  Top3AIComparison,
};

export const STORAGE_KEY = "taf-sniffer.jobs.v1";
export const STRATEGY_KEY = "taf-sniffer.strategy.v1";
export const UI_KEY = "taf-sniffer.ui.v1";
export const SESSION_KEY = "taf-sniffer.lastSearchSession.v1";
export const TOP3_AI_KEY = "taf-sniffer.top3-ai-comparison.v1";
export const SOURCE_HEALTH_KEY = "taf-sniffer.sourceHealthStats.v1";
export const DICTIONARY_RECENTS_KEY = "taf-sniffer.dictionaryRecents.v1";
export const API_KEY_STORAGE = "taf-sniffer.apiKey.v1";
export const AI_PROVIDER_STORAGE = "taf-sniffer.aiProvider.v1";
export const AI_BASE_URL_STORAGE = "taf-sniffer.aiBaseUrl.v1";
export const LOCAL_GEMINI_KEY = "taf-sniffer.localGemini.v1";
export const COLLECTION_TARGET = 20;
export const BACKUP_VERSION = 1;
export const SOURCE_HEALTH_HISTORY_LIMIT = 12;
export const LEGACY_DEFAULT_TARGET_JOB = "Diagnostiqueur immobilier";
export const LEGACY_DEFAULT_SALARY_MIN = 1800;
export const DEFAULT_RADAR_AXES = ["Adéquation", "Salaire", "Contrat", "Évolution", "Risque"];
export const RANK_SWIPE_THRESHOLD = 72;
export const RANK_SWIPE_MAX = 130;

export const defaultStrategy: Strategy = {
  profileId: DEFAULT_PROFILE_ID,
  targetJob: "",
  location: "",
  salaryMin: 0,
  experienceLevel: "indifferent",
  contractPreference: "any",
  hideWeakOffers: false,
  poeiRequirement: "off",
  auditRequirement: "off",
  independentRequirement: "prefer",
  objective: "",
  assistantIntent: "",
  assistantSummary: "",
  aiSearchQueries: [],
  aiSearchPlanCheckedAt: "",
  priorityTraining: false,
  priorityPoei: false,
  prioritySalary: false,
  priorityAudit: false,
  rejectIndependent: false,
  smartSearch: true,
  smartLocation: true,
  radarAxes: DEFAULT_RADAR_AXES,
};

export type RankingFilter = "new" | "to_review" | "to_explore" | "favorites" | "ignored" | "formation" | "all";
export type UiMode = "assistant" | "advanced";
export type AppView = "assistant" | "results" | "comparison" | "expert";
export type ExpertTab = "offer" | "search" | "collection" | "validation" | "tools";
export type StoredUiState = {
  mode: UiMode;
  activeView: AppView;
  searchReady: boolean;
  showDebugInfo: boolean;
  aiAutoAnalyze: boolean;
  aiMode: AIMode;
};
export type AiAvailability = "unknown" | "available" | "missing_key" | "invalid_key" | "quota" | "proxy_unavailable" | "unavailable";
export type AiProviderId = "gemini" | "openai-compatible";
export type AssistantRuntimeState = "idle" | "introFading" | "active" | "searching" | "collapsed";
export type DictionaryField = "job" | "zone";
export type SwipeRankAction = "explore" | "ignore";
export type RecentDictionaryItem = {
  label: string;
  family: string;
  aliases: string[];
  count: number;
  updatedAt: string;
};
export type RecentDictionaryState = Record<DictionaryField, RecentDictionaryItem[]>;

export const DEFAULT_AI_MODE: AIMode = "ai_full";
export const FACILITATED_TRAINING_LABEL = "Formation facilitée";

export const aiModeLabels: Record<AIMode, string> = {
  ai_top10: "IA Top 10",
  ai_full: "Analyse enrichie par IA",
  local: "Analyse locale",
};

export const aiModeDescriptions: Record<AIMode, string> = {
  ai_top10: "Le fournisseur IA enrichit les 10 meilleures offres présélectionnées localement.",
  ai_full: "Le fournisseur IA analyse toutes les offres par lots de 25, avec le score local en garde-fou.",
  local: "Aucun appel IA automatique : recherche et classement locaux complets.",
};

export const appViewLabels: Record<AppView, string> = {
  assistant: "Rechercher",
  results: "Mes offres",
  comparison: "Comparaison",
  expert: "Outils avancés",
};

export const appViewDescriptions: Record<AppView, string> = {
  assistant: "Tableau de bord et recherche guidée.",
  results: "Classement et analyse des offres collectées.",
  comparison: "Comparaison côte à côte des meilleures offres.",
  expert: "Outils avancés et réglages fins.",
};

export const expertTabLabels: Record<ExpertTab, string> = {
  offer: "Analyse express",
  search: "Recherche & critères",
  collection: "Collecte réelle",
  validation: "Validation & règles",
  tools: "Santé sources & sauvegardes",
};

export type ExtractionDraft = {
  title: string;
  company: string;
  location: string;
  contract: string;
  workTime: string;
  salary: string;
  bonus: string;
  requiredExperience: string;
  benefits: string;
  source: string;
  sourceUrl: string;
  extractionReview: ExtractionReviewStatus;
};

export type AnalysisItem = {
  job: JobRecord;
  analysis: JobAnalysis;
};

export type TopPick = {
  kind: string;
  reason: string;
  item: AnalysisItem;
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  strategy: Strategy;
  uiState: StoredUiState;
  lastSearchSession: SearchSession | null;
  lastTop3AiComparison: Top3AIComparison | null;
  sourceHealthStats: SourceHealthStats;
  jobs: JobRecord[];
};
