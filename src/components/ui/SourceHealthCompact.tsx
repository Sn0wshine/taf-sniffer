import type { SourceHealthRecord, SourceHealthStats } from "../../types";
import { sourceHealthKind, sourceHealthRecords, sourceHealthSummary } from "../../utils/jobHelpers";
import { sourceHealthTooltip } from "../OfferDetail";
import { HelpTooltip, InfoChip } from "./Tooltips";

export const sourceNames = (records: SourceHealthRecord[]) =>
  records.length ? records.slice(0, 4).map((record) => record.source).join(", ") : "aucune";

export const sourceUsefulRate = (record: SourceHealthRecord) =>
  Math.round((record.importedCount / Math.max(1, record.searches)) * 10) / 10;

export const sourceQualityAverage = (record: SourceHealthRecord) =>
  record.qualityScoreCount ? Math.round(record.qualityScoreTotal / record.qualityScoreCount) : 0;

export const sourceHealthHasEnoughHistory = (records: SourceHealthRecord[]) =>
  records.some((record) => record.importedCount > 0 || record.searches >= 2 || sourceHealthKind(record) === "blocked");

export const sourceHealthAdvice = (stats: SourceHealthStats) => {
  const records = sourceHealthRecords(stats);
  if (!records.length) return "";
  const summary = sourceHealthSummary(stats);
  const imported = records.reduce((total, record) => total + record.importedCount, 0);
  const skipped = records.reduce((total, record) => total + record.skippedCount, 0);
  const searches = records.reduce((total, record) => total + record.searches, 0);
  if (!sourceHealthHasEnoughHistory(records)) {
    return `${records.length} sources testées. Pas assez de recul pour les classer, les détails restent en debug.`;
  }
  if (summary.blocked.length >= 2 && imported <= 2) {
    return "Peu d'offres exploitables : plusieurs sources échouent de façon répétée ou ne donnent pas de lien fiable.";
  }
  if (skipped > imported * 2 && skipped >= 5) {
    return "Beaucoup de résultats ont été écartés : Taf Sniffer privilégie les annonces propres plutôt que le bruit.";
  }
  if (summary.useful.length) return `Sources utiles pour l'instant : ${sourceNames(summary.useful)}.`;
  if (searches <= records.length) return "Premier relevé seulement : les sources restent à surveiller avant de conclure qu'elles bloquent.";
  return "Encore peu de recul : lance quelques recherches pour repérer les sources fiables.";
};

export function SourceHealthCompact({
  stats,
  showDebugInfo,
  embedded = false,
}: {
  stats: SourceHealthStats;
  showDebugInfo: boolean;
  embedded?: boolean;
}) {
  const records = sourceHealthRecords(stats);
  if (!records.length) return null;
  const summary = sourceHealthSummary(stats);
  const advice = sourceHealthAdvice(stats);
  const hasEnoughHistory = sourceHealthHasEnoughHistory(records);
  if (!hasEnoughHistory) return null;

  if (embedded) {
    return (
      <div className="source-health-compact embedded-source-health">
        <div className="source-health-title">
          <span className="collapsible-title">
            <strong>Qualité des sources</strong>
            <em>{records.length} sources suivies</em>
          </span>
          <span className="source-health-summary">
            {summary.useful.length} utiles · {summary.watch.length} en observation · {summary.blocked.length} échecs
          </span>
        </div>
        <div className="source-health-pill-row">
          <InfoChip className="source-health-pill useful" tooltip={sourceHealthTooltip("useful")}>
            Utiles : {sourceNames(summary.useful)}
          </InfoChip>
          <InfoChip className="source-health-pill watch" tooltip={sourceHealthTooltip("watch")}>
            En observation : {sourceNames(summary.watch)}
          </InfoChip>
          <InfoChip className="source-health-pill blocked" tooltip={sourceHealthTooltip("blocked")}>
            Échecs répétés : {sourceNames(summary.blocked)}
          </InfoChip>
        </div>
        {advice && <p className="helper-text">{advice}</p>}
        {showDebugInfo && (
          <div className="search-debug-details">
            <strong>Détails qualité sources</strong>
            <div className="source-health-debug-list">
              {records.map((record) => (
                <HelpTooltip key={record.source} tooltip={`Historique ${record.source}. ${record.lastMessage}`}>
                  <span>
                    {record.source} · {record.importedCount} importées · {record.skippedCount} écartées · {record.blockedCount} blocages
                  </span>
                </HelpTooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <details className="source-health-compact collapsible-panel">
      <summary className="collapsible-summary source-health-title">
        <span className="collapsible-title">
          <strong>Qualité des sources</strong>
          <em>{records.length} sources suivies</em>
        </span>
        <span className="source-health-summary">
          {summary.useful.length} utiles · {summary.watch.length} en observation · {summary.blocked.length} échecs
        </span>
      </summary>
      <div className="collapsible-content">
        <div className="source-health-pill-row">
          <InfoChip className="source-health-pill useful" tooltip={sourceHealthTooltip("useful")}>
            Utiles : {sourceNames(summary.useful)}
          </InfoChip>
          <InfoChip className="source-health-pill watch" tooltip={sourceHealthTooltip("watch")}>
            En observation : {sourceNames(summary.watch)}
          </InfoChip>
          <InfoChip className="source-health-pill blocked" tooltip={sourceHealthTooltip("blocked")}>
            Échecs répétés : {sourceNames(summary.blocked)}
          </InfoChip>
        </div>
        {advice && <p className="helper-text">{advice}</p>}
        {showDebugInfo && (
          <details className="search-debug-details">
            <summary>Détails qualité sources</summary>
            <div className="source-health-debug-list">
              {records.map((record) => (
                <HelpTooltip key={record.source} tooltip={`Historique ${record.source}. ${record.lastMessage}`}>
                  <span>
                    {record.source} · {record.importedCount} importées · {record.skippedCount} écartées · {record.blockedCount} blocages
                  </span>
                </HelpTooltip>
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}
