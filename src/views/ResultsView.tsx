import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisItem,
  ExpectedReview,
  ExtractionDraft,
  JobRecord,
  ManualExtraction,
  RankingFilter,
  ReviewStatus,
  Strategy,
  SwipeRankAction,
  TopPick,
} from "../appConstants";
import { OfferDetail } from "../components/OfferDetail";
import { ClipboardImportButton } from "../components/ui/ClipboardImportButton";
import { buildFormationSignals } from "../formationSignals";
import {
  collectMarketSamples,
  formatEuro,
  marketKeyFor,
  recordAndComputeMarketStats,
  type MarketStats,
} from "../marketStats";
import { ScoreArc } from "../components/ui/ScoreArc";
import { SwipeRankCard } from "../components/ui/SwipeRankCard";
import { HelpTooltip, InfoChip } from "../components/ui/Tooltips";
import { TopPicks } from "../components/ui/TopPicks";
import { getActiveProfile } from "../jobProfiles";
import {
  aiRankScoreFor,
  compactContractLabel,
  compactLocationLabel,
  compactSalaryLabel,
  datasetDisplayLabel,
  decisionFitClass,
  decisionFitLabel,
  evaluateDecisionFit,
  extractionLabel,
  extractionReviewValue,
  normalizeReviewStatus,
  reviewStatusClass,
  reviewStatusLabel,
  riskClass,
  scoreClass,
} from "../utils/jobHelpers";

export function ResultsView({
  analyses,
  filteredAnalyses,
  topPicks,
  selectedItem,
  filter,
  rankingSearch,
  strategy,
  showDebugInfo,
  onSelectOffer,
  onFilterChange,
  onRankingSearchChange,
  onSwipe,
  onUpdateJob,
  onManualExtraction,
  onExpectedReview,
  onAddFromClipboard,
  onAiAnalyzeSingle,
  onFetchCompanyProfile,
  loadingAction = "",
}: {
  analyses: AnalysisItem[];
  filteredAnalyses: AnalysisItem[];
  topPicks: TopPick[];
  selectedItem: AnalysisItem | null;
  filter: RankingFilter;
  rankingSearch: string;
  strategy: Strategy;
  showDebugInfo: boolean;
  activeProfile?: any;
  onSelectOffer: (id: string) => void;
  onFilterChange: (filter: RankingFilter) => void;
  onRankingSearchChange: (query: string) => void;
  onSwipe: (id: string, action: SwipeRankAction, currentStatus: ReviewStatus) => void;
  onUpdateJob: (id: string, patch: Partial<JobRecord>) => void;
  onManualExtraction: (id: string, patch: Partial<ManualExtraction>) => void;
  onExpectedReview: (id: string, patch: Partial<ExpectedReview>) => void;
  onAddFromClipboard: (text: string) => void;
  onAiAnalyzeSingle?: (job: JobRecord) => void;
  onFetchCompanyProfile?: (company: string, companyType: string) => Promise<any>;
  loadingAction?: string;
}) {
  const [rankingWidth, setRankingWidth] = useState<number>(() => {
    const saved = localStorage.getItem("sniffer.split");
    return saved ? Math.max(300, Math.min(560, Number(saved))) : 380;
  });
  const [isEditingExtraction, setIsEditingExtraction] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const isResizingRef = useRef(false);

  const marketKey = useMemo(() => marketKeyFor(strategy.targetJob, strategy.location), [strategy.targetJob, strategy.location]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const marketSamples = useMemo(
    () => collectMarketSamples(analyses.map(({ analysis }) => analysis)),
    [analyses],
  );

  useEffect(() => {
    setMarketStats(recordAndComputeMarketStats(marketKey, marketSamples));
  }, [marketKey, marketSamples]);

  const reviewCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_traiter" && !job.ignored).length;
  const exploreCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser" && !job.ignored).length;
  const favoritesCount = analyses.filter(({ job }) => job.favorite || normalizeReviewStatus(job) === "favori").length;
  const ignoredCount = analyses.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree").length;
  const formationCount = analyses.filter(
    ({ job, analysis }) => !job.ignored && buildFormationSignals(analysis.rawText).level === "confirmée",
  ).length;
  const strategyHash = JSON.stringify(strategy);
  const profile = getActiveProfile(strategy);

  const currentIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return filteredAnalyses.findIndex((item) => item.job.id === selectedItem.job.id);
  }, [filteredAnalyses, selectedItem]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredAnalyses.length - 1;

  const handleNavigatePrevious = () => {
    if (hasPrevious) {
      onSelectOffer(filteredAnalyses[currentIndex - 1].job.id);
    }
  };

  const handleNavigateNext = () => {
    if (hasNext) {
      onSelectOffer(filteredAnalyses[currentIndex + 1].job.id);
    }
  };

  const advanceToNext = (fromId: string) => {
    const currentIdx = filteredAnalyses.findIndex((item) => item.job.id === fromId);
    if (currentIdx !== -1) {
      const nextItem = filteredAnalyses[currentIdx + 1] ?? filteredAnalyses[currentIdx - 1] ?? null;
      if (nextItem) {
        onSelectOffer(nextItem.job.id);
      }
    }
  };

  const handleToggleFavorite = (job: JobRecord) => {
    const nextFavorite = !job.favorite;
    onUpdateJob(job.id, {
      favorite: nextFavorite,
      ignored: nextFavorite ? false : job.ignored,
      reviewStatus: nextFavorite ? "favori" : "a_traiter",
    });
    if (filter === "to_review" || filter === "favorites") {
      advanceToNext(job.id);
    }
  };

  const handleToggleExplore = (job: JobRecord) => {
    const status = normalizeReviewStatus(job);
    const nextStatus: ReviewStatus = status === "a_creuser" ? "a_traiter" : "a_creuser";
    onUpdateJob(job.id, {
      reviewStatus: nextStatus,
    });
    if (filter === "to_review" || filter === "to_explore") {
      advanceToNext(job.id);
    }
  };

  const handleToggleIgnored = (job: JobRecord) => {
    const nextIgnored = !job.ignored;
    onUpdateJob(job.id, {
      ignored: nextIgnored,
      favorite: nextIgnored ? false : job.favorite,
      reviewStatus: nextIgnored ? "ignoree" : "a_traiter",
    });
    if (filter !== "ignored" && filter !== "all") {
      advanceToNext(job.id);
    }
  };

  const handleSelectOffer = (id: string) => {
    onSelectOffer(id);
    setMobileView("detail");
  };

  // Redimensionnement de volet interactif
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.classList.add("is-resizing");

    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const splitWorkspace = document.querySelector(".results-split-workspace") as HTMLElement | null;
      if (!splitWorkspace) return;
      const rect = splitWorkspace.getBoundingClientRect();
      const newWidth = Math.max(300, Math.min(560, rect.right - event.clientX));
      setRankingWidth(newWidth);
      localStorage.setItem("sniffer.split", String(newWidth));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.classList.remove("is-resizing");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Raccourcis clavier pour le tri rapide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        if (hasNext) {
          e.preventDefault();
          onSelectOffer(filteredAnalyses[currentIndex + 1].job.id);
        }
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        if (hasPrevious) {
          e.preventDefault();
          onSelectOffer(filteredAnalyses[currentIndex - 1].job.id);
        }
      } else if (selectedItem && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        handleToggleIgnored(selectedItem.job);
      } else if (selectedItem && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        handleToggleFavorite(selectedItem.job);
      } else if (selectedItem && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        handleToggleExplore(selectedItem.job);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasNext, hasPrevious, filteredAnalyses, selectedItem]);

  // Auto-scroll pour maintenir l'offre sélectionnée visible dans la liste
  const rankingListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedItem || !rankingListRef.current) return;
    const selectedEl = rankingListRef.current.querySelector(".rank-card.selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedItem?.job.id]);

  return (
    <div className="results-view-container">
      <div className="results-toolbar">
        <div className="ranking-filter-pills" role="tablist" aria-label="Filtrer les annonces">
          <HelpTooltip tooltip="Afficher les offres à traiter (nouvelles et non encore triées).">
            <button
              className={`filter-pill ${filter === "to_review" ? "active" : ""}`}
              onClick={() => onFilterChange("to_review")}
            >
              À traiter <span className="filter-count">{reviewCount}</span>
            </button>
          </HelpTooltip>
          <HelpTooltip tooltip="Afficher les offres marquées à creuser pour plus tard.">
            <button
              className={`filter-pill ${filter === "to_explore" ? "active" : ""}`}
              onClick={() => onFilterChange("to_explore")}
            >
              À creuser <span className="filter-count">{exploreCount}</span>
            </button>
          </HelpTooltip>
          <HelpTooltip tooltip="Afficher vos offres favorites sélectionnées.">
            <button
              className={`filter-pill ${filter === "favorites" ? "active" : ""}`}
              onClick={() => onFilterChange("favorites")}
            >
              Favoris <span className="filter-count">{favoritesCount}</span>
            </button>
          </HelpTooltip>
          <HelpTooltip tooltip="Uniquement les offres avec un dispositif de formation financée détecté (POEI, OPCO, CPF, formation employeur...).">
            <button
              className={`filter-pill ${filter === "formation" ? "active" : ""}`}
              onClick={() => onFilterChange("formation")}
            >
              🎓 Formation <span className="filter-count">{formationCount}</span>
            </button>
          </HelpTooltip>
          <HelpTooltip tooltip="Afficher les offres ignorées (restaurables).">
            <button
              className={`filter-pill ${filter === "ignored" ? "active" : ""}`}
              onClick={() => onFilterChange("ignored")}
            >
              Ignorées <span className="filter-count">{ignoredCount}</span>
            </button>
          </HelpTooltip>
          <HelpTooltip tooltip="Afficher toutes les offres sans filtre de statut.">
            <button
              className={`filter-pill ${filter === "all" ? "active" : ""}`}
              onClick={() => onFilterChange("all")}
            >
              Toutes <span className="filter-count">{analyses.length}</span>
            </button>
          </HelpTooltip>
        </div>

        {marketStats && (
          <div className="market-banner" aria-label="Statistiques de salaire du marché">
            💰 Marché observé · <strong>{strategy.targetJob || "tous métiers"}</strong>
            {strategy.location ? (
              <>
                {" @ "}
                <strong>{strategy.location}</strong>
              </>
            ) : null}
            {" — "}
            médiane <strong>{formatEuro(marketStats.median)}</strong> net/mois, fourchette{" "}
            {formatEuro(marketStats.min)} – {formatEuro(marketStats.max)} ({marketStats.sampleCount} offres avec
            salaire)
          </div>
        )}

        <div className="results-search-row">
          <input
            type="search"
            className="ranking-search-input"
            placeholder="Rechercher par métier, ville, entreprise..."
            value={rankingSearch}
            onChange={(e) => onRankingSearchChange(e.target.value)}
          />
          <ClipboardImportButton onImport={onAddFromClipboard} compact />
        </div>
      </div>

      <div className={`results-split-workspace mobile-view-${mobileView}`}>
        {/* Volet central / gauche : Offre sélectionnée */}
        <div className="detail-pane">
          {selectedItem ? (
            <OfferDetail
              job={selectedItem.job}
              analysis={selectedItem.analysis}
              decision={evaluateDecisionFit(selectedItem.analysis, strategy)}
              strategy={strategy}
              activeProfile={profile}
              isEditingExtraction={isEditingExtraction}
              onEditExtraction={() => setIsEditingExtraction(true)}
              onCancelExtraction={() => setIsEditingExtraction(false)}
              onSaveExtraction={(draft: ExtractionDraft) => {
                onManualExtraction(selectedItem.job.id, draft);
                setIsEditingExtraction(false);
              }}
              onClearExtraction={() => onManualExtraction(selectedItem.job.id, {})}
              onCopyQuestions={() => {
                const questions = selectedItem.job.aiReview?.recruiterQuestions?.join("\n") || "";
                if (questions) navigator.clipboard.writeText(questions);
              }}
              onCopySummary={() => {
                navigator.clipboard.writeText(selectedItem.analysis.summary);
              }}
              onSaveRaw={(rawText) => onUpdateJob(selectedItem.job.id, { rawText })}
              onUpdateMeta={(patch) => onUpdateJob(selectedItem.job.id, patch)}
              onUpdateExpectedReview={(patch) => onExpectedReview(selectedItem.job.id, patch)}
              onIdentifyCompany={() => {
                onFetchCompanyProfile?.(selectedItem.analysis.company, selectedItem.analysis.companyType);
              }}
              onAnalyzeAi={() => onAiAnalyzeSingle?.(selectedItem.job)}
              onToggleFavorite={() => handleToggleFavorite(selectedItem.job)}
              onToggleIgnored={() => handleToggleIgnored(selectedItem.job)}
              onSetReviewStatus={(status: ReviewStatus) => {
                onUpdateJob(selectedItem.job.id, { reviewStatus: status });
              }}
              loadingAction={loadingAction}
              mode="assistant"
              showDebugInfo={showDebugInfo}
              onNavigatePrevious={handleNavigatePrevious}
              onNavigateNext={handleNavigateNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              offerIndex={currentIndex >= 0 ? currentIndex + 1 : undefined}
              totalOffers={filteredAnalyses.length}
              onBackToList={() => setMobileView("list")}
            />
          ) : (
            <div className="detail-empty">
              <h3>Sélectionnez une offre pour voir l'analyse détaillée</h3>
              <p>Scores sur 5 axes, salaire normalisé, détection POEI/formation et profil entreprise.</p>
            </div>
          )}
        </div>

        {/* Poignée de redimensionnement de volet */}
        <div
          className="split-resizer"
          onMouseDown={handleStartResize}
          role="separator"
          aria-orientation="vertical"
          title="Glisser pour redimensionner la liste des offres"
        />

        {/* Volet droit : Liste des offres */}
        <div className="ranking-pane" style={{ width: `${rankingWidth}px` }}>
          {filter === "to_review" && !rankingSearch && topPicks.length > 0 && (
            <TopPicks picks={topPicks} onSelect={handleSelectOffer} />
          )}

          <div className="ranking-list" ref={rankingListRef}>
            {filteredAnalyses.length > 0 ? (
              filteredAnalyses.map(({ job, analysis }, index) => {
                const status = normalizeReviewStatus(job);
                const decision = evaluateDecisionFit(analysis, strategy);
                const salaryLabel = compactSalaryLabel(analysis);
                const contractLabel = compactContractLabel(analysis);
                const locationLabel = compactLocationLabel(analysis);
                const aiRankScore = aiRankScoreFor(job, strategyHash);

                return (
                  <SwipeRankCard
                    key={job.id}
                    selected={selectedItem?.job.id === job.id}
                    onSelect={() => handleSelectOffer(job.id)}
                    currentStatus={status}
                    isFavorite={job.favorite || status === "favori"}
                    isIgnored={job.ignored || status === "ignoree"}
                    onSwipe={(action) => onSwipe(job.id, action, status)}
                    onToggleFavorite={() => handleToggleFavorite(job)}
                    onToggleExplore={() => handleToggleExplore(job)}
                    onToggleIgnore={() => handleToggleIgnored(job)}
                  >
                    <span className="rank-index">#{index + 1}</span>
                    <InfoChip
                      className={`rank-score ${scoreClass(aiRankScore ?? analysis.scores.global)} ${aiRankScore !== null ? "ai-rank-score" : ""}`}
                      tooltip={aiRankScore !== null ? "Score IA : le fournisseur IA classe cette offre." : "Score local : estimation Taf Sniffer."}
                    >
                      <ScoreArc score={aiRankScore ?? analysis.scores.global} />
                    </InfoChip>
                    <span className="rank-content">
                      <span className="rank-title-row">
                        <strong>{analysis.normalizedTitle}</strong>
                        <InfoChip className={decisionFitClass(decision.fit)} tooltip="Adéquation avec vos critères.">
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
                        {analysis.remoteMode === "full_remote" && <span className="meta-chip-universal remote">100% Remote</span>}
                        {analysis.remoteMode === "hybrid" && <span className="meta-chip-universal hybrid">Hybride</span>}
                        {analysis.experienceFit === "reconversion_ok" && <span className="meta-chip-universal debutant">Débutant ok</span>}
                        {analysis.employmentNature === "independent_network" && <span className="meta-chip-universal warning">Indépendant</span>}
                        <span className={riskClass(analysis.riskLevel)}>Risque {analysis.riskLevel}</span>
                        {aiRankScore !== null && <span className="ai-rank-chip">score IA</span>}
                        {job.extractionQuality === "complète" && <span className="import-quality-ok">fiable</span>}
                        {extractionReviewValue(job) === "needs_review" && <span className="import-quality-review">à vérifier</span>}
                        <span>{job.source || datasetDisplayLabel(job.datasetLabel)}</span>
                        {job.alsoFoundOn && job.alsoFoundOn.length > 0 && (
                          <span className="multisource-chip" title={`Aussi sur : ${job.alsoFoundOn.join(", ")}`}>
                            +{job.alsoFoundOn.length}
                          </span>
                        )}
                        {showDebugInfo && job.extractionQuality && <span>{extractionLabel(job.extractionQuality)}</span>}
                      </span>
                    </span>
                  </SwipeRankCard>
                );
              })
            ) : (
              <div className="ranking-empty">
                {rankingSearch
                  ? `Aucune annonce ne correspond à « ${rankingSearch} ».`
                  : "Aucune offre dans cette catégorie."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
