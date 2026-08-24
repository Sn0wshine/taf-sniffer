import { Sparkles } from "lucide-react";
import type { AnalysisItem } from "../appConstants";
import type { JobAnalysis } from "../types";
import { getActiveProfile } from "../jobProfiles";
import { ScoreRadar } from "../components/OfferDetail";
import { InfoChip } from "../components/ui/Tooltips";
import { compactLocationLabel, compactSalaryLabel, riskClass, scoreClass } from "../utils/jobHelpers";

export function OfferComparisonView({
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
