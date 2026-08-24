import type { EmployerRankingResult } from "../../types";
import { InfoChip } from "./Tooltips";
import { scoreClass } from "../../utils/jobHelpers";

export function EmployerRankingCard({
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
