import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  ListFilter,
  Settings2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { getControlledExtraction } from "../analysis";
import { getActiveProfile } from "../jobProfiles";
import { validationTags } from "../validation";
import type {
  AIReview,
  CompanyProfile,
  ControlledExtractionField,
  ControlledExtractionValues,
  DecisionFit,
  ExpectedReview,
  JobAnalysis,
  JobRecord,
  ReviewStatus,
  ScoreConfidence,
  Strategy,
  ValidationTag,
  CompanyEnrichment,
} from "../types";
import type { ExtractionDraft, UiMode } from "../appConstants";
import {
  aiRankScoreFor,
  aiStrategyHash,
  compactDecisionList,
  companyTypeDisplay,
  confidenceClass,
  datasetDisplayLabel,
  decisionFitClass,
  decisionFitLabel,
  experienceFitLabel,
  extractionLabel,
  extractionReviewLabel,
  extractionReviewValue,
  isRealWorldJob,
  isSearchResultUrl,
  localQuickDecisionVerdict,
  metricTone,
  normalizeExpectedReview,
  normalizeReviewStatus,
  prefillExpectedExtraction,
  quickActionFor,
  quickDecisionVerdictClass,
  reviewStatusClass,
  reviewStatusLabel,
  scoreClass,
  terrainText,
  terrainValidationStatus,
  expectedExtractionInputs,
  normalizeDedupe,
} from "../utils/jobHelpers";
import type {
  QuickDecisionNextAction,
  QuickDecisionSource,
  QuickDecisionSummary,
} from "../utils/jobHelpers";
import { InfoChip, InfoTooltip, InlineHelp } from "./ui/Tooltips";

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
          <span className="eyebrow">Résumé de l'offre</span>
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
      <div className="quick-decision-summary-body" style={{ marginTop: "12px", marginBottom: "16px" }}>
        <p style={{ margin: 0, fontSize: "14.5px", lineHeight: "1.55" }}>{review?.summary || analysis.summary}</p>
      </div>
      <div className="quick-decision-action-bar" style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: "8px", borderTop: "1px solid var(--line-soft)", paddingTop: "12px" }}>
        {actionButton}
        {summary.nextAction !== "ignorer" && decision.fit === "weak" && (
          <button className="ghost-button compact danger-text" onClick={onIgnore}>
            {job.ignored ? "Restaurer" : "Ignorer"}
          </button>
        )}
      </div>
      {showPrep && prep && (
        <div className="quick-approach-content" style={{ marginTop: "12px", borderTop: "1px solid var(--line-soft)", paddingTop: "12px" }}>
          {prep.callAngle && <p><strong>Angle d'appel : </strong>{prep.callAngle}</p>}
          {prep.message && <p><strong>Message candidature : </strong>{prep.message}</p>}
          {prep.checkpoints.length > 0 && (
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
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

export const sourceHealthTooltip = (kind: "useful" | "watch" | "blocked") => {
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

export function OfferDetail({
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

      {mode === "advanced" && (
        <TerrainQuickReview job={job} analysis={analysis} onUpdateExpectedReview={onUpdateExpectedReview} />
      )}

      {mode === "assistant" ? (
        <CollapsibleDetail title="Avis IA complet">
          <AIReviewCard job={job} analysis={analysis} onAnalyze={onAnalyzeAi} loadingAction={loadingAction} showQuestions={false} />
        </CollapsibleDetail>
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

export function ScoreRadar({
  analysis,
  activeProfile,
}: {
  analysis: JobAnalysis;
  activeProfile: ReturnType<typeof getActiveProfile>;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const radarAxes = analysis.customAxesScores
    ? Object.keys(analysis.customAxesScores)
    : ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"];

  const axes = radarAxes.map((axis) => {
    const lowerAxis = axis.toLowerCase();
    let value = 50;
    if (analysis.customAxesScores) {
      value = analysis.customAxesScores[axis] ?? 50;
    } else {
      if (lowerAxis === "formation") value = analysis.scores.formationFacilitee ?? analysis.scores.training;
      else if (lowerAxis === "salaire") value = analysis.scores.salaryPackage ?? analysis.scores.cashflow;
      else if (lowerAxis === "trajectoire") value = analysis.scores.trajectory;
      else if (lowerAxis === "employeur") value = analysis.scores.employer ?? analysis.scores.audit;
      else if (lowerAxis === "risque") value = analysis.scores.risk;
    }

    let tooltip = `Axe d'évaluation : ${axis}. Note de ${value}/100.`;
    if (lowerAxis === "formation") {
      tooltip = "Formation facilitée : POEI, POE, AFPR, formation employeur, CPF ou certification financée détectés dans l'offre.";
    } else if (lowerAxis === "salaire") {
      tooltip = "Salaire / package : adéquation du salaire annoncé avec ton objectif, plus primes, avantages et statut.";
    } else if (lowerAxis === "trajectoire") {
      tooltip = `Trajectoire : cohérence du poste avec ton projet (${activeProfile.ui.trajectoryScoreLabel.toLowerCase()}).`;
    } else if (lowerAxis === "employeur") {
      tooltip = "Employeur : signaux sur la solidité, le sérieux et l'adéquation de la structure avec ton projet.";
    } else if (lowerAxis === "risque") {
      tooltip = "Risque maîtrisé : absence de pièges — statut indépendant imposé, variable dominant, salaire flou ou exigences bloquantes.";
    }

    return { label: axis, value, tooltip };
  });
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
