import { Sparkles } from "lucide-react";
import type { Top3AIComparison } from "../../types";

export function Top3AIComparisonCard({ comparison }: { comparison: Top3AIComparison | null }) {
  if (!comparison) return null;
  return (
    <section className="top3-ai-comparison">
      <div className="section-title">
        <Sparkles size={18} aria-hidden="true" />
        <h2>Comparaison IA du Top 3</h2>
      </div>
      <div className="top3-ai-grid">
        <div>
          <strong>Pourquoi #1</strong>
          <p>{comparison.whyFirst || "À confirmer après lecture des offres."}</p>
        </div>
        <div>
          <strong>Plus risquée</strong>
          <p>{comparison.riskierOffer || "Aucun risque clairement prioritaire."}</p>
        </div>
        <div>
          <strong>Appeler en premier</strong>
          <p>{comparison.callFirst || "Commencer par l'offre la plus claire."}</p>
        </div>
      </div>
      {comparison.actionSummary && <p className="top3-ai-action">{comparison.actionSummary}</p>}
    </section>
  );
}
