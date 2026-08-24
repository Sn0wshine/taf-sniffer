import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Trash2 } from "lucide-react";
import {
  FACILITATED_TRAINING_LABEL,
} from "../../appConstants";
import type { AnalysisItem, AssistantRuntimeState, DictionaryField, RecentDictionaryState } from "../../appConstants";
import { getActiveProfile } from "../../jobProfiles";
import { generateSearchQueries } from "../../searchQueries";
import {
  filterDictionarySuggestions,
  jobSuggestions,
  zoneDictionarySuggestions,
} from "../../suggestionDictionary";
import type { DictionarySuggestion } from "../../suggestionDictionary";
import type {
  NetworkDiagnosticsResult,
  RequirementMode,
  SearchProviderResult,
  SearchSession,
  SourceHealthStats,
  Strategy,
} from "../../types";
import {
  buildDecisionSummary,
  buildTerrainReport,
  formatSessionDate,
  importQualitySummary,
  mergeDictionarySuggestions,
  requirementPatch,
  sourceHealthRecords,
  sourceReportSummary,
  terrainQueueRows,
} from "../../utils/jobHelpers";
import { FieldHelp, HelpTooltip, RequirementChip } from "../ui/Tooltips";
import { NetworkDiagnosticsCard } from "../ui/NetworkDiagnosticsCard";
import { SourceHealthCompact } from "../ui/SourceHealthCompact";
import { SuggestionPanel } from "../ui/SuggestionPanel";

export function SimpleIntro() {
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

export function SimpleSearchPanel({
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
  onPurgeJobs,
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
  onPurgeJobs: () => void;
}) {
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [activeSuggestionField, setActiveSuggestionField] = useState<"job" | "zone" | null>(null);
  const [newAxisDraft, setNewAxisDraft] = useState("");
  const prevAssistantStepRef = useRef<string | null>(null);

  const handleUpdateRadarAxis = (index: number, value: string) => {
    const nextAxes = [...(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"])];
    nextAxes[index] = value;
    onUpdateStrategy({ radarAxes: nextAxes });
  };

  const handleAddRadarAxis = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const nextAxes = [...(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"])];
    if (nextAxes.length >= 6) return;
    nextAxes.push(clean);
    onUpdateStrategy({ radarAxes: nextAxes });
  };

  const handleRemoveRadarAxis = (index: number) => {
    const nextAxes = [...(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"])];
    if (nextAxes.length <= 3) return;
    nextAxes.splice(index, 1);
    onUpdateStrategy({ radarAxes: nextAxes });
  };
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
  const assistantStep = assistantSteps[activeStepIndex].key;
  const canSearch = Boolean((strategy.targetJob || "").trim() || (strategy.assistantIntent || "").trim());
  const assistantSummaryFallback = [
    strategy.targetJob ? `Métier : ${strategy.targetJob}` : "",
    strategy.assistantIntent ? `Intention : ${strategy.assistantIntent}` : "",
    (strategy.location || "").trim() ? `Zone : ${strategy.location}` : "Zone : France entière",
    strategy.salaryMin ? `Salaire net mini : ${strategy.salaryMin} €` : "",
    experienceLabel,
    contractLabel !== "Peu importe" ? contractLabel : "",
    strictFilters.length ? strictFilters.join(" · ") : "",
  ].filter(Boolean).join(". ");

  const changeStep = (index: number) => {
    if (index <= maxStepIndex) {
      setActiveStepIndex(index);
    }
  };

  const validateCurrentStep = () => {
    if (assistantStep !== "summary") {
      const next = activeStepIndex + 1;
      if (next > maxStepIndex) {
        setMaxStepIndex(next);
      }
      setActiveStepIndex(next);
      setTimeout(() => {
        const nextCard = document.querySelector(`.assistant-card[data-step="${assistantSteps[next].key}"]`);
        nextCard?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      onRunSearch();
    }
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
    if (assistantRuntime === "introFading" || assistantRuntime === "active") {
      setActiveStepIndex(0);
      setMaxStepIndex(0);
    }
    if (assistantRuntime === "active") setCriteriaOpen(true);
    if (assistantRuntime === "idle" || assistantRuntime === "introFading") setCriteriaOpen(false);
  }, [assistantRuntime]);

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
                {queryPlan.links.slice(0, 6).map((link: { source: string; label: string; url: string }) => (
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
        <div className="criteria-body assistant-body assistant-cards-stack">
          {maxStepIndex >= 0 && (
            <div
              className={`assistant-card ${activeStepIndex === 0 ? "is-active" : "is-inactive"}`}
              onClick={() => changeStep(0)}
              data-step="objective"
            >
              <div className="assistant-card-header">
                <span className="card-step-num">1</span>
                <h3>Objectif professionnel</h3>
              </div>
              <div className="assistant-card-content">
                <div className="simple-search-grid">
                  <div className="smart-field dictionary-field">
                    <div className="dictionary-input-row">
                      <div className="smart-field-label">
                        <FieldHelp label="Métier recherché" hint="semi-auto" tooltip="Métier recherché : tape un métier ou choisis une suggestion du dictionnaire. Rien ne lance la recherche automatiquement." />
                        {strategy.targetJob && (
                          <button className="ghost-button compact clear-field-button" type="button" aria-label="Effacer le métier recherché" onClick={(e) => { e.stopPropagation(); onUpdateStrategy({ targetJob: "" }); }}>
                            X
                          </button>
                        )}
                      </div>
                      <input
                        value={strategy.targetJob}
                        placeholder="Exemple : diagnostiqueur immobilier, auditeur..."
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
                  <div className="smart-field intent-field">
                    <FieldHelp label="Intention libre" hint="contexte IA" tooltip="Intention libre : écris ce que tu veux vraiment. Gemini s'en sert pour trouver les bons intitulés sans te demander toutes les variantes de mots-clés." />
                    <textarea
                      rows={4}
                      value={strategy.assistantIntent}
                      placeholder="Exemple : je cherche un poste terrain accessible en reconversion, avec formation interne, pas commercial pur, proche diagnostic immo ou audit énergétique."
                      onChange={(event) => onUpdateStrategy({ assistantIntent: event.target.value })}
                      onKeyDown={handleEnterAdvance}
                    />
                  </div>
                </div>
                {(strategy.targetJob || "").trim() && queryPlan.keywords.length > 0 && (
                  <div className="objective-preview">
                    <span className="objective-preview-label">On cherchera déjà ({queryPlan.keywords.length}) :</span>
                    <div className="keyword-cloud compact">
                      {queryPlan.keywords.slice(0, 8).map((keyword: string) => (
                        <span key={keyword}>{keyword}</span>
                      ))}
                      {queryPlan.keywords.length > 8 && <span className="more">+{queryPlan.keywords.length - 8}</span>}
                    </div>
                  </div>
                )}
              </div>
              {activeStepIndex === 0 && (
                <div className="assistant-card-actions">
                  <button className="primary-button validate-step-button" type="button" onClick={(e) => { e.stopPropagation(); validateCurrentStep(); }}>
                    Valider et continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {maxStepIndex >= 1 && (
            <div
              className={`assistant-card ${activeStepIndex === 1 ? "is-active" : "is-inactive"}`}
              onClick={() => changeStep(1)}
              data-step="zone"
            >
              <div className="assistant-card-header">
                <span className="card-step-num">2</span>
                <h3>Zone géographique</h3>
              </div>
              <div className="assistant-card-content">
                <div className="simple-search-grid">
                  <div className="smart-field dictionary-field">
                    <div className="dictionary-input-row">
                      <div className="smart-field-label">
                        <FieldHelp label="Département ou Ville" hint="France entière si vide" tooltip="Zone géographique : tape un département (ex: 35, 44), une région ou une ville. Laisse vide pour chercher partout." />
                        {strategy.location && (
                          <button className="ghost-button compact clear-field-button" type="button" aria-label="Effacer la zone de recherche" onClick={(e) => { e.stopPropagation(); onUpdateStrategy({ location: "" }); }}>
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
                    />
                  </div>
                </div>
              </div>
              {activeStepIndex === 1 && (
                <div className="assistant-card-actions">
                  <button className="primary-button validate-step-button" type="button" onClick={(e) => { e.stopPropagation(); validateCurrentStep(); }}>
                    Valider et continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {maxStepIndex >= 2 && (
            <div
              className={`assistant-card ${activeStepIndex === 2 ? "is-active" : "is-inactive"}`}
              onClick={() => changeStep(2)}
              data-step="conditions"
            >
              <div className="assistant-card-header">
                <span className="card-step-num">3</span>
                <h3>Conditions de travail</h3>
              </div>
              <div className="assistant-card-content">
                <div className="simple-search-grid">
                  <div className="smart-field">
                    <FieldHelp label="Salaire net minimum" hint="en euros/mois" tooltip="Salaire net minimum : préférence pour trier et pénaliser les offres trop basses. Laisse à 0 pour ignorer." />
                    <input
                      type="number"
                      value={strategy.salaryMin || ""}
                      placeholder="0"
                      onChange={(event) => onUpdateStrategy({ salaryMin: Number(event.target.value) })}
                      onKeyDown={handleEnterAdvance}
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
              {activeStepIndex === 2 && (
                <div className="assistant-card-actions">
                  <button className="primary-button validate-step-button" type="button" onClick={(e) => { e.stopPropagation(); validateCurrentStep(); }}>
                    Valider et continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {maxStepIndex >= 3 && (
            <div
              className={`assistant-card ${activeStepIndex === 3 ? "is-active" : "is-inactive"}`}
              onClick={() => changeStep(3)}
              data-step="constraints"
            >
              <div className="assistant-card-header">
                <span className="card-step-num">4</span>
                <h3>Contraintes & Garde-fous</h3>
              </div>
              <div className="assistant-card-content">
                <div className="toggle-row">
                  <RequirementChip
                    label={FACILITATED_TRAINING_LABEL}
                    mode={strategy.poeiRequirement}
                    onChange={(mode: RequirementMode) => onUpdateStrategy(requirementPatch("poeiRequirement", mode))}
                  />
                  <RequirementChip
                    label={activeProfile.ui.strategicRequirementLabel}
                    mode={strategy.auditRequirement}
                    onChange={(mode: RequirementMode) => onUpdateStrategy(requirementPatch("auditRequirement", mode))}
                  />
                  <RequirementChip
                    label="Éviter indépendant imposé"
                    mode={strategy.independentRequirement}
                    onChange={(mode: RequirementMode) => onUpdateStrategy(requirementPatch("independentRequirement", mode))}
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
              {activeStepIndex === 3 && (
                <div className="assistant-card-actions">
                  <button className="primary-button validate-step-button" type="button" onClick={(e) => { e.stopPropagation(); validateCurrentStep(); }}>
                    Valider et continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {maxStepIndex >= 4 && (
            <div
              className={`assistant-card ${activeStepIndex === 4 ? "is-active" : "is-inactive"}`}
              onClick={() => changeStep(4)}
              data-step="summary"
            >
              <div className="assistant-card-header">
                <span className="card-step-num">5</span>
                <h3>Résumé avant recherche</h3>
              </div>
              <div className="assistant-card-content">
                <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>
                  Corrige cette synthèse si besoin. Elle sert de contexte à Gemini et au classement.
                </p>
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
                <div className="smart-field axes-field">
                  <div className="smart-field-label">
                    <HelpTooltip tooltip="Axes du radar : critères sur lesquels les offres d'emploi seront évaluées. Suggérés par l'IA et modifiables manuellement (entre 3 et 6 axes).">
                      <strong>Axes d'évaluation (Diagramme en étoile)</strong>
                    </HelpTooltip>
                    <span className="smart-hint">{(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"]).length}/6 axes</span>
                  </div>
                  <div className="axes-edit-container">
                    <div className="axes-chips-list">
                      {(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"]).map((axis, index) => (
                        <div key={index} className="axis-edit-chip">
                          <input
                            type="text"
                            aria-label={`Nom de l'axe ${index + 1}`}
                            value={axis}
                            onChange={(e) => handleUpdateRadarAxis(index, e.target.value)}
                          />
                          <button
                            type="button"
                            className="axis-remove-button"
                            title="Supprimer cet axe"
                            disabled={(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"]).length <= 3}
                            onClick={() => handleRemoveRadarAxis(index)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    {(strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"]).length < 6 && (
                      <div className="axis-add-form">
                        <input
                          type="text"
                          placeholder="Nouvel axe (ex: Voiture de fonction)"
                          value={newAxisDraft}
                          maxLength={25}
                          onChange={(e) => setNewAxisDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddRadarAxis(newAxisDraft);
                              setNewAxisDraft("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleAddRadarAxis(newAxisDraft);
                            setNewAxisDraft("");
                          }}
                        >
                          Ajouter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <details className="assistant-search-plan" style={{ marginTop: "12px" }}>
                  <summary>
                    <HelpTooltip tooltip="Stratégie de recherche : requêtes générées par l'IA au lancement. Elles guident la collecte, puis les variantes locales restent en secours.">
                      <span>Stratégie de recherche</span>
                    </HelpTooltip>
                  </summary>
                  {strategy.aiSearchQueries?.length ? (
                    <div className="keyword-cloud">
                      {strategy.aiSearchQueries.map((keyword: string) => (
                        <span key={keyword}>{keyword}</span>
                      ))}
                    </div>
                  ) : queryPlan.keywords.length ? (
                    <>
                      <p className="helper-text">{queryPlan.keywords.length} intitulé{queryPlan.keywords.length > 1 ? "s" : ""} local{queryPlan.keywords.length > 1 ? "aux" : ""} déjà prêt{queryPlan.keywords.length > 1 ? "s" : ""}. Gemini en ajoute au lancement.</p>
                      <div className="keyword-cloud">
                        {queryPlan.keywords.slice(0, 12).map((keyword: string) => (
                          <span key={keyword}>{keyword}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="helper-text">Les requêtes IA seront générées au lancement de la recherche.</p>
                  )}
                </details>
              </div>
              {activeStepIndex === 4 && (
                <div className="assistant-card-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button className="primary-button validate-step-button" type="button" onClick={(e) => { e.stopPropagation(); validateCurrentStep(); }} disabled={!canSearch}>
                    Valider et lancer la recherche
                  </button>
                  <button className="ghost-button compact danger-text" type="button" onClick={(e) => { e.stopPropagation(); onResetCriteria(); }}>
                    Réinitialiser les critères
                  </button>
                </div>
              )}
            </div>
          )}
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
        {hasSavedJobs && (
          <HelpTooltip tooltip="Supprime toutes les offres sauvegardées et remet l'app à zéro.">
            <button className="options-purge-button compact" type="button" onClick={onPurgeJobs} disabled={loadingAction === "run-search"}>
              <Trash2 size={14} aria-hidden="true" />
              Purger les offres
            </button>
          </HelpTooltip>
        )}
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
                {queryPlan.links.slice(0, 6).map((link: { source: string; label: string; url: string }) => (
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
