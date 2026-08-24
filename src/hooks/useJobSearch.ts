import { useEffect, useState } from "react";
import { SESSION_KEY, SOURCE_HEALTH_KEY } from "../appConstants";
import { franceTravailProxyProvider, proxyBase } from "../searchProvider";
import type { SearchQueryPlan } from "../searchQueries";
import type {
  JobRecord,
  NetworkDiagnosticsResult,
  SearchProviderResult,
  SearchSession,
  SourceHealthStats,
  Strategy,
} from "../types";
import {
  createSearchSession,
  updateSourceHealthStats,
} from "../utils/jobHelpers";
import {
  normalizeAiSearchPlan,
  normalizeSearchSession,
  normalizeSourceHealthStats,
} from "../utils/normalizers";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function useJobSearch() {
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

  const [sourceHealthStats, setSourceHealthStats] = useState<SourceHealthStats>(() =>
    normalizeSourceHealthStats(loadJson(SOURCE_HEALTH_KEY, {})),
  );

  const [networkDiagnostics, setNetworkDiagnostics] = useState<NetworkDiagnosticsResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  useEffect(() => {
    if (lastSearchSession) localStorage.setItem(SESSION_KEY, JSON.stringify(lastSearchSession));
    else localStorage.removeItem(SESSION_KEY);
  }, [lastSearchSession]);

  useEffect(() => {
    if (Object.keys(sourceHealthStats).length) localStorage.setItem(SOURCE_HEALTH_KEY, JSON.stringify(sourceHealthStats));
    else localStorage.removeItem(SOURCE_HEALTH_KEY);
  }, [sourceHealthStats]);

  const startLoading = (action: string) => setLoadingAction(action);
  const stopLoading = (delay = 0) => {
    if (delay > 0) setTimeout(() => setLoadingAction(""), delay);
    else setLoadingAction("");
  };

  const prepareAssistantSearchStrategy = async (
    currentStrategy: Strategy,
    localGeminiKey = "",
  ): Promise<Strategy | null> => {
    if (!currentStrategy.targetJob.trim() && !currentStrategy.assistantIntent.trim()) {
      setStatusMessage("Indique au moins un métier ou une intention métier pour lancer la recherche.");
      return null;
    }

    if (currentStrategy.aiSearchQueries?.length) {
      return currentStrategy;
    }

    startLoading("ai-search-plan");
    setStatusMessage("Gemini prépare les requêtes utiles...");

    try {
      const response = await fetch(`${proxyBase()}/api/ai/search-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localGeminiKey ? { "x-gemini-api-key": localGeminiKey } : {}),
        },
        body: JSON.stringify({ strategy: currentStrategy }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "Plan IA indisponible.");
      const plan = normalizeAiSearchPlan(payload);
      return {
        ...currentStrategy,
        assistantSummary: plan.summary || currentStrategy.assistantSummary,
        aiSearchQueries: plan.queries,
        aiSearchPlanCheckedAt: new Date().toISOString(),
        radarAxes: plan.radarAxes?.length ? plan.radarAxes : currentStrategy.radarAxes,
      };
    } catch {
      return {
        ...currentStrategy,
        aiSearchQueries: [],
        aiSearchPlanCheckedAt: "",
      };
    } finally {
      stopLoading();
    }
  };

  const runSearch = async ({
    strategy,
    jobs,
    draft = "",
    localGeminiKey = "",
    onImportRecords,
    onImportOffers,
  }: {
    strategy: Strategy;
    jobs: JobRecord[];
    draft?: string;
    localGeminiKey?: string;
    onImportRecords: (records: JobRecord[], message: string, meta?: Partial<JobRecord>) => { importedCount: number; duplicateCount: number; rejectedCount: number; mergedJobs: JobRecord[] };
    onImportOffers: (text: string, meta?: Partial<JobRecord>) => { importedCount: number; duplicateCount: number; mergedJobs: JobRecord[] };
  }) => {
    startLoading("run-search");
    try {
      const searchStrategy = await prepareAssistantSearchStrategy(strategy, localGeminiKey);
      if (!searchStrategy) return null;

      const result = await franceTravailProxyProvider.search(searchStrategy, jobs, draft);
      setSearchResult(result);

      if (result.networkStatus !== "blocked") {
        setSourceHealthStats((current) => updateSourceHealthStats(current, result));
      }

      const batchId = `search-${Date.now().toString(36)}`;
      let targetMergedJobs = jobs;

      if (result.jobs?.length) {
        const stats = onImportRecords(result.jobs, result.message, { searchBatchId: batchId });
        const adjustedResult = { ...result, skippedCount: Number(result.skippedCount || 0) + stats.rejectedCount };
        setLastSearchSession(createSearchSession(searchStrategy, adjustedResult, batchId, stats.importedCount, stats.duplicateCount));
        targetMergedJobs = stats.mergedJobs;
      } else if (result.offers.length > 0) {
        const stats = onImportOffers(result.offers.join("\n---\n"), { searchBatchId: batchId, datasetLabel: "jeu réel" });
        setLastSearchSession(createSearchSession(searchStrategy, result, batchId, stats.importedCount, stats.duplicateCount));
        targetMergedJobs = stats.mergedJobs;
      } else if (result.status === "readyWithLocalOffers") {
        setLastSearchSession(createSearchSession(searchStrategy, result, batchId, 0, 0));
        setStatusMessage(result.message);
      } else {
        setLastSearchSession(null);
        setStatusMessage(result.message);
      }

      return { result, searchStrategy, targetMergedJobs };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recherche indisponible.";
      setStatusMessage(`${message} Tu peux réessayer ou passer en Local rapide.`);
      return null;
    } finally {
      stopLoading();
    }
  };

  const runNetworkDiagnostics = async () => {
    startLoading("network-diagnostics");
    try {
      const response = await fetch(`${proxyBase()}/api/network-diagnostics`);
      const payload = (await response.json().catch(() => null)) as NetworkDiagnosticsResult | null;
      if (!response.ok || !payload) {
        throw new Error("Impossible d'exécuter le diagnostic réseau.");
      }
      setNetworkDiagnostics(payload);
      setStatusMessage(payload.message || "Diagnostic réseau terminé.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Diagnostic réseau impossible.";
      setNetworkDiagnostics({
        status: "error",
        checkedAt: new Date().toISOString(),
        message,
        sources: [],
      });
      setStatusMessage(message);
    } finally {
      stopLoading();
    }
  };

  const openSearches = (queryPlan: SearchQueryPlan) => {
    startLoading("open-searches");
    const preferred = ["France Travail", "Hellowork", "Jooble", "Indeed", "Apec", "Meteojob", "LinkedIn", "Google"];
    const opened = preferred
      .map((source) => queryPlan.links.find((link: { source: string; url: string }) => link.source === source))
      .filter(Boolean)
      .slice(0, 8);
    opened.forEach((link) => window.open(link!.url, "_blank", "noopener,noreferrer"));
    setStatusMessage(`${opened.length} sources ouvertes.`);
    stopLoading();
  };

  const resetSourceHealth = () => {
    setSourceHealthStats({});
    localStorage.removeItem(SOURCE_HEALTH_KEY);
    setStatusMessage("Historique de qualité des sources réinitialisé.");
  };

  const resetSearchState = () => {
    setStatusMessage("");
    setLoadingAction("");
    setSearchResult({ source: "Taf Sniffer local", sourceQuery: "", status: "idle", offers: [], message: "Prêt." });
    setNetworkDiagnostics(null);
  };

  return {
    searchResult,
    setSearchResult,
    lastSearchSession,
    setLastSearchSession,
    sourceHealthStats,
    setSourceHealthStats,
    networkDiagnostics,
    setNetworkDiagnostics,
    statusMessage,
    setStatusMessage,
    loadingAction,
    startLoading,
    stopLoading,
    runSearch,
    prepareAssistantSearchStrategy,
    runNetworkDiagnostics,
    openSearches,
    resetSourceHealth,
    resetSearchState,
  };
}
