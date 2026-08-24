import type { TopPick } from "../../appConstants";
import { compactSalaryLabel } from "../../utils/jobHelpers";

export function TopPicks({ picks, onSelect }: { picks: TopPick[]; onSelect: (id: string) => void }) {
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
