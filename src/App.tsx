import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, RotateCcw, Settings2, Sparkles, Trash2 } from "lucide-react";
import { APP_VERSION_LABEL } from "./appVersion";
import {
  DEFAULT_AI_MODE,
  API_KEY_STORAGE,
  AI_PROVIDER_STORAGE,
  AI_BASE_URL_STORAGE,
  LOCAL_GEMINI_KEY,
  UI_KEY,
  aiModeDescriptions,
  aiModeLabels,
  appViewDescriptions,
  appViewLabels,
} from "./appConstants";
import type { AIMode, AppView, AssistantRuntimeState, StoredUiState } from "./appConstants";
import { useAiReview } from "./hooks/useAiReview";
import { useBackup } from "./hooks/useBackup";
import { useJobs } from "./hooks/useJobs";
import { useJobSearch } from "./hooks/useJobSearch";
import { useStrategy } from "./hooks/useStrategy";
import { getActiveProfile } from "./jobProfiles";
import { generateSearchQueries } from "./searchQueries";
import { HelpTooltip } from "./components/ui/Tooltips";
import { EmployerRankingCard } from "./components/ui/EmployerRankingCard";
import { Top3AIComparisonCard } from "./components/ui/Top3AIComparisonCard";
import { SimpleSearchPanel } from "./components/panels/SimpleSearchPanel";
import { DashboardPanel } from "./components/panels/DashboardPanel";
import { OfferComparisonView } from "./views/ComparisonView";
import { ExpertView } from "./views/ExpertView";
import { ResultsView } from "./views/ResultsView";
import { normalizeUiState } from "./utils/normalizers";
import {
  collectionChecklist,
  exportTerrainMarkdown,
  normalizeReviewStatus,
} from "./utils/jobHelpers";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function App() {
  const [uiState, setUiState] = useState<StoredUiState>(() =>
    normalizeUiState(
      loadJson(UI_KEY, {
        mode: "assistant",
        activeView: "assistant",
        searchReady: false,
        showDebugInfo: false,
        aiAutoAnalyze: false,
        aiMode: DEFAULT_AI_MODE,
      }),
    ),
  );

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || localStorage.getItem(LOCAL_GEMINI_KEY) || "");
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem(AI_PROVIDER_STORAGE) || "gemini");
  const [aiBaseUrl, setAiBaseUrl] = useState(() => localStorage.getItem(AI_BASE_URL_STORAGE) || "");
  const [assistantRuntime, setAssistantRuntime] = useState<AssistantRuntimeState>("idle");
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    strategy,
    updateStrategy,
    recentDictionary,
    rememberDictionaryValue,
    resetCriteria,
  } = useStrategy();

  const {
    jobs,
    setJobs,
    analyses,
    sortedAnalyses,
    filteredAnalyses,
    topPicks,
    decisionSummary,
    setSelectedId,
    selectedItem,
    filter,
    setFilter,
    rankingSearch,
    setRankingSearch,
    updateJob,
    addJobRecords,
    addOffers,
    handleRankSwipe,
    patchManualExtraction,
    patchExpectedReview,
    purgeJobs,
    loadDemo,
    loadExtractionTests,
  } = useJobs(strategy, uiState.aiMode);

  const {
    searchResult,
    lastSearchSession,
    sourceHealthStats,
    networkDiagnostics,
    statusMessage,
    setStatusMessage,
    loadingAction,
    startLoading,
    stopLoading,
    runSearch,
    runNetworkDiagnostics,
    openSearches,
    resetSourceHealth,
    resetSearchState,
    aiAvailability: searchAiAvailability,
  } = useJobSearch();

  const {
    lastTop3AiComparison,
    employerRanking,
    aiFallbackMessage,
    setAiFallbackMessage,
    analyzeJobsWithAi,
    rankEmployers,
    fetchCompanyProfile,
    aiAvailability: reviewAiAvailability,
  } = useAiReview();

  const aiAvailability = reviewAiAvailability !== "unknown" ? reviewAiAvailability : searchAiAvailability;

  const { exportBackup, importBackup } = useBackup({
    jobs,
    strategy,
    uiState,
    lastSearchSession,
    lastTop3AiComparison,
    sourceHealthStats,
    onRestore: (backup) => {
      setJobs(backup.jobs);
      updateStrategy(backup.strategy);
      setUiState(backup.uiState);
    },
  });

  const queryPlan = useMemo(() => generateSearchQueries(strategy), [strategy]);

  useEffect(() => {
    localStorage.setItem(UI_KEY, JSON.stringify(uiState));
  }, [uiState]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    if (!optionsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!optionsMenuRef.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [optionsOpen]);

  const activeView = uiState.activeView;
  const setAppView = (view: AppView) => {
    setUiState((curr) => ({ ...curr, activeView: view, mode: view === "expert" ? "advanced" : "assistant" }));
  };

  const handleLaunchAssistant = () => {
    setAssistantRuntime("active");
    setAppView("assistant");
  };

  const handleExecuteSearch = async () => {
    setAssistantRuntime("searching");
    const outcome = await runSearch({
      strategy,
      jobs,
      apiKey,
      aiProvider,
      aiBaseUrl,
      onImportRecords: (records, _msg, meta) => addJobRecords(records, meta),
      onImportOffers: (text, meta) => addOffers(text, meta),
    });

    if (outcome) {
      setAssistantRuntime("collapsed");
      setUiState((curr) => ({ ...curr, searchReady: true }));
      if (outcome.targetMergedJobs.length > 0) {
        setAppView("results");
      }
      if (uiState.aiMode !== "local" && outcome.targetMergedJobs.length > 0) {
        await analyzeJobsWithAi({
          candidates: outcome.targetMergedJobs.filter((j) => !j.ignored).slice(0, 10),
          strategy,
          apiKey,
          aiProvider,
          aiBaseUrl,
          onUpdateJob: updateJob,
        });
      }
    } else {
      setAssistantRuntime("active");
    }
  };

  const handleAnalyzeTop3 = async () => {
    startLoading("ai-analyze");
    const candidates = sortedAnalyses.map((a) => a.job).filter((j) => !j.ignored).slice(0, 10);
    await analyzeJobsWithAi({
      candidates,
      strategy,
      apiKey,
      aiProvider,
      aiBaseUrl,
      onUpdateJob: updateJob,
      onProgress: setStatusMessage,
    });
    stopLoading();
  };

  const handleRankEmployers = async () => {
    startLoading("rank-employers");
    await rankEmployers(jobs, strategy);
    stopLoading();
  };

  const copyText = async (text: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    setStatusMessage(msg);
  };

  const [confirmAction, setConfirmAction] = useState<"purge" | "full" | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const triggerConfirm = (action: "purge" | "full") => {
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    setConfirmAction(action);
    confirmTimeoutRef.current = window.setTimeout(() => {
      setConfirmAction(null);
    }, 4000);
  };

  const showFeedback = (msg: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setActionFeedback(msg);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  const handlePurgeJobsOnly = () => {
    if (confirmAction !== "purge") {
      triggerConfirm("purge");
      return;
    }
    setConfirmAction(null);
    const count = jobs.length;
    purgeJobs();
    resetSearchState();
    setAssistantRuntime("idle");
    showFeedback(`✓ ${count} annonce${count > 1 ? "s" : ""} effacée${count > 1 ? "s" : ""}`);
  };

  const handleFullReset = () => {
    if (confirmAction !== "full") {
      triggerConfirm("full");
      return;
    }
    setConfirmAction(null);
    purgeJobs();
    resetCriteria();
    resetSearchState();
    resetSourceHealth();
    localStorage.removeItem("sniffer.jobs");
    localStorage.removeItem("sniffer.strategy");
    localStorage.removeItem("sniffer.search.session");
    localStorage.removeItem("sniffer.top3.comparison");
    localStorage.removeItem("sniffer.source.health");
    localStorage.removeItem("sniffer.dictionary");
    localStorage.removeItem("sniffer.market.stats");
    setAssistantRuntime("idle");
    showFeedback("✓ Données réinitialisées");
  };

  const reviewCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_traiter" && !job.ignored).length;
  const exploreCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser" && !job.ignored).length;
  const ignoredCount = analyses.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree").length;

  return (
    <div className={`app-shell view-${activeView}`}>
      <header className="app-header">
        <div className="brand" onClick={() => setAppView("assistant")}>
          <Sparkles className="logo-sparkle" size={24} aria-hidden="true" />
          <h1>
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
          <div className="topbar-stats" aria-label="Synthèse">
            <span onClick={() => { setFilter("to_review"); setAppView("results"); }}>{reviewCount} à traiter</span>
            <span onClick={() => { setFilter("to_explore"); setAppView("results"); }}>{exploreCount} à creuser</span>
            <span onClick={() => { setFilter("ignored"); setAppView("results"); }}>{ignoredCount} ignorées</span>
            <span onClick={() => setAppView("results")}>{topPicks.length} priorités</span>
          </div>

          <button
            className="icon-button"
            onClick={() => setDarkMode((d) => !d)}
            title="Basculer thème sombre/clair"
            aria-label="Basculer thème sombre/clair"
          >
            {darkMode ? "☀" : "☾"}
          </button>

          <div className="options-menu" ref={optionsMenuRef}>
            <HelpTooltip tooltip="Options du moteur IA et réglages de l'application.">
              <button
                className={`icon-button options-trigger ${optionsOpen ? "active" : ""}`}
                type="button"
                aria-label="Ouvrir les options"
                onClick={() => setOptionsOpen((prev) => !prev)}
              >
                <Settings2 size={18} aria-hidden="true" />
              </button>
            </HelpTooltip>

            {optionsOpen && (
              <div className="options-popover" role="menu">
                <div className="options-popover-head">
                  <strong>Options</strong>
                  <span>{appViewLabels[activeView]} · {aiModeLabels[uiState.aiMode]}</span>
                </div>

                <div className="options-section">
                  <span>Moteur d'analyse IA</span>
                  <div className="options-choice-list">
                    {(["ai_top10", "ai_full", "local"] as AIMode[]).map((mode) => (
                      <button
                        key={mode}
                        className={uiState.aiMode === mode ? "active" : ""}
                        type="button"
                        onClick={() => setUiState((c) => ({ ...c, aiMode: mode }))}
                      >
                        <strong>{aiModeLabels[mode]}</strong>
                        <small>{aiModeDescriptions[mode]}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="options-section local-gemini-section">
                  <span>Fournisseur IA et clé API facultative</span>
                  <small>Sans clé : recherche, import et analyse locale restent disponibles.</small>
                  <select value={aiProvider} onChange={(event) => { setAiProvider(event.target.value); localStorage.setItem(AI_PROVIDER_STORAGE, event.target.value); }} aria-label="Fournisseur IA">
                    <option value="gemini">Gemini</option>
                    <option value="openai-compatible">Endpoint compatible OpenAI</option>
                  </select>
                  <input
                    type="password"
                    value={apiKey}
                    placeholder="Clé API"
                    autoComplete="off"
                    onChange={(event) => {
                      const value = event.target.value;
                      setApiKey(value);
                      if (value.trim()) localStorage.setItem(API_KEY_STORAGE, value.trim());
                      else localStorage.removeItem(API_KEY_STORAGE);
                    }}
                    aria-label="Clé API facultative"
                  />
                  {aiProvider === "openai-compatible" && <input type="url" value={aiBaseUrl} placeholder="URL de base API (optionnel)" onChange={(event) => { setAiBaseUrl(event.target.value); localStorage.setItem(AI_BASE_URL_STORAGE, event.target.value); }} aria-label="URL de base API" />}
                </div>

                <div className="options-section">
                  <span>Gestion des données</span>
                  <div className="options-data-actions">
                    <button
                      type="button"
                      className={`options-danger-btn ${confirmAction === "purge" ? "confirming" : ""}`}
                      onClick={handlePurgeJobsOnly}
                      disabled={jobs.length === 0 && confirmAction !== "purge"}
                      title="Supprime toutes les offres collectées"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>
                        {confirmAction === "purge"
                          ? "Confirmer la suppression ?"
                          : `Vider les annonces (${jobs.length})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`options-danger-btn full-reset ${confirmAction === "full" ? "confirming" : ""}`}
                      onClick={handleFullReset}
                      title="Efface les offres et réinitialise tous les critères"
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      <span>
                        {confirmAction === "full"
                          ? "Confirmer la remise à zéro ?"
                          : "Remise à zéro complète"}
                      </span>
                    </button>

                    {actionFeedback && (
                      <div className="options-success-badge" role="status">
                        <Check size={14} aria-hidden="true" />
                        <span>{actionFeedback}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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

      {aiAvailability === "missing_key" && uiState.aiMode !== "local" && !aiFallbackMessage && (
        <div className="local-mode-banner" role="status">
          Mode local actif : ajoute une clé Gemini dans Options seulement si tu veux l'analyse enrichie.
        </div>
      )}

      <main className="workspace">
        {activeView === "assistant" && assistantRuntime === "idle" && (
          <DashboardPanel
            offerCount={analyses.length}
            reviewCount={reviewCount}
            exploreCount={exploreCount}
            priorityCount={topPicks.length}
            lastSearchSession={lastSearchSession}
            onStartSearch={handleLaunchAssistant}
            onShowResults={() => setAppView("results")}
            onShowTools={() => setAppView("expert")}
          />
        )}

        {activeView === "assistant" && assistantRuntime !== "idle" && (
          <div className="assistant-view-container">
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
              sessionIgnoredCount={ignoredCount}
              decisionSummary={decisionSummary}
              loadingAction={loadingAction}
              showDebugInfo={uiState.showDebugInfo}
              top3AiCount={topPicks.length}
              employerCount={new Set(analyses.map((a) => a.analysis.company)).size}
              onUpdateStrategy={updateStrategy}
              onRefineRanking={updateStrategy}
              onRelanceWith={(p) => { updateStrategy(p); handleExecuteSearch(); }}
              onRunSearch={handleExecuteSearch}
              onPrepareSearchPlan={() => {}}
              onOpenSearches={() => openSearches(queryPlan)}
              onRunNetworkDiagnostics={runNetworkDiagnostics}
              onAnalyzeTop3={handleAnalyzeTop3}
              onRankEmployers={handleRankEmployers}
              assistantRuntime={assistantRuntime}
              hasSavedJobs={jobs.length > 0}
              recentDictionary={recentDictionary}
              onStartAssistant={handleLaunchAssistant}
              onShowHistory={() => setAppView("results")}
              onResetAssistantState={() => { setAssistantRuntime("idle"); resetSearchState(); }}
              onRememberDictionaryValue={rememberDictionaryValue}
              onResetCriteria={resetCriteria}
              onPurgeJobs={purgeJobs}
            />
            {lastTop3AiComparison && (
              <Top3AIComparisonCard
                comparison={lastTop3AiComparison}
              />
            )}
            <EmployerRankingCard
              ranking={employerRanking}
              loading={loadingAction === "rank-employers"}
              onSelect={(id: string) => { setSelectedId(id); setAppView("results"); }}
            />
          </div>
        )}

        {activeView === "results" && (
          <ResultsView
            analyses={analyses}
            filteredAnalyses={filteredAnalyses}
            topPicks={topPicks}
            selectedItem={selectedItem}
            filter={filter}
            rankingSearch={rankingSearch}
            strategy={strategy}
            showDebugInfo={uiState.showDebugInfo}
            activeProfile={strategy}
            onSelectOffer={setSelectedId}
            onFilterChange={setFilter}
            onRankingSearchChange={setRankingSearch}
            onSwipe={handleRankSwipe}
            onUpdateJob={updateJob}
            onManualExtraction={patchManualExtraction}
            onExpectedReview={patchExpectedReview}
            onAddFromClipboard={(text) => addOffers(text)}
            onFetchCompanyProfile={fetchCompanyProfile}
            loadingAction={loadingAction}
          />
        )}

        {activeView === "comparison" && (
          <OfferComparisonView
            items={sortedAnalyses.slice(0, 3)}
            activeProfile={getActiveProfile(strategy)}
            onSelect={(id: string) => { setSelectedId(id); setAppView("results"); }}
          />
        )}

        {activeView === "expert" && (
          <ExpertView
            analyses={analyses}
            strategy={strategy}
            queryPlan={queryPlan}
            sourceHealthStats={sourceHealthStats}
            networkDiagnostics={networkDiagnostics}
            showDebugInfo={uiState.showDebugInfo}
            loadingAction={loadingAction}
            onUpdateStrategy={updateStrategy}
            onAddOffers={(text, meta) => addOffers(text, meta)}
            onLoadDemo={loadDemo}
            onLoadExtractionTests={loadExtractionTests}
            onUpdateExpected={patchExpectedReview}
            onSelectOffer={(id) => { setSelectedId(id); setAppView("results"); }}
            onRunNetworkDiagnostics={runNetworkDiagnostics}
            onResetSourceHealth={resetSourceHealth}
            onExportBackup={exportBackup}
            onImportBackup={(e: ChangeEvent<HTMLInputElement>) => importBackup(e)}
            onCopyKeywords={() => copyText(queryPlan.keywords.join(", "), "Mots-clés copiés.")}
            onCopyChecklist={() => copyText(collectionChecklist(), "Checklist copiée.")}
            onCopyKeyword={(kw) => copyText(kw, `Mot-clé « ${kw} » copié.`)}
            onCopyTerrainReport={() => copyText(exportTerrainMarkdown(analyses), "Rapport terrain copié.")}
            activeProfile={strategy}
          />
        )}
      </main>
    </div>
  );
}
