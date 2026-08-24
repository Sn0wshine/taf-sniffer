import { useState } from "react";
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
  const [rankingWidth] = useState<number>(() => {
    const saved = localStorage.getItem("sniffer.split");
    return saved ? Number(saved) : 380;
  });
  const [isEditingExtraction, setIsEditingExtraction] = useState(false);

  const reviewCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_traiter" && !job.ignored).length;
  const exploreCount = analyses.filter(({ job }) => normalizeReviewStatus(job) === "a_creuser" && !job.ignored).length;
  const favoritesCount = analyses.filter(({ job }) => job.favorite || normalizeReviewStatus(job) === "favori").length;
  const ignoredCount = analyses.filter(({ job }) => job.ignored || normalizeReviewStatus(job) === "ignoree").length;
  const formationCount = analyses.filter(
    ({ job, analysis }) => !job.ignored && buildFormationSignals(analysis.rawText).level === "confirmée",
  ).length;
  const strategyHash = JSON.stringify(strategy);
  const profile = getActiveProfile(strategy);

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

      <div className="results-split-workspace">
        <div className="ranking-pane" style={{ width: `${rankingWidth}px`, minWidth: "300px" }}>
          {filter === "to_review" && !rankingSearch && topPicks.length > 0 && (
            <TopPicks picks={topPicks} onSelect={onSelectOffer} />
          )}

          <div className="ranking-list">
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
                    onSelect={() => onSelectOffer(job.id)}
                    currentStatus={status}
                    onSwipe={(action) => onSwipe(job.id, action, status)}
                  >
                    <span className="rank-index">#{index + 1}</span>
                    <InfoChip
                      className={`rank-score ${scoreClass(aiRankScore ?? analysis.scores.global)} ${aiRankScore !== null ? "ai-rank-score" : ""}`}
                      tooltip={aiRankScore !== null ? "Score IA : Gemini classe cette offre." : "Score local : estimation Taf Sniffer."}
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
              onToggleFavorite={() => {
                onUpdateJob(selectedItem.job.id, {
                  favorite: !selectedItem.job.favorite,
                  reviewStatus: !selectedItem.job.favorite ? "favori" : "a_traiter",
                });
              }}
              onToggleIgnored={() => {
                onUpdateJob(selectedItem.job.id, {
                  ignored: !selectedItem.job.ignored,
                  reviewStatus: !selectedItem.job.ignored ? "ignoree" : "a_traiter",
                });
              }}
              onSetReviewStatus={(status: ReviewStatus) => {
                onUpdateJob(selectedItem.job.id, { reviewStatus: status });
              }}
              loadingAction={loadingAction}
              mode="assistant"
              showDebugInfo={showDebugInfo}
            />
          ) : (
            <div className="detail-empty">
              <h3>Sélectionnez une offre pour voir l'analyse détaillée</h3>
              <p>Scores sur 5 axes, salaire normalisé, détection POEI/formation et profil entreprise.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
