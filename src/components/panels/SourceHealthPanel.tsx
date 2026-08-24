import type { NetworkDiagnosticsResult, SourceHealthStats } from "../../types";
import { formatSessionDate, sourceHealthKind, sourceHealthRecords } from "../../utils/jobHelpers";
import { NetworkDiagnosticsCard } from "../ui/NetworkDiagnosticsCard";
import { sourceQualityAverage, sourceUsefulRate } from "../ui/SourceHealthCompact";

export function SourceHealthPanel({
  stats,
  networkDiagnostics,
  showDebugInfo,
  loadingAction,
  onRunNetworkDiagnostics,
  onReset,
}: {
  stats: SourceHealthStats;
  networkDiagnostics: NetworkDiagnosticsResult | null;
  showDebugInfo: boolean;
  loadingAction: string;
  onRunNetworkDiagnostics: () => void;
  onReset: () => void;
}) {
  const records = sourceHealthRecords(stats);
  return (
    <section className="source-health-panel">
      <div className="section-title">
        <h2>Sources</h2>
        <button className="ghost-button compact" onClick={onReset} disabled={!records.length}>
          Réinitialiser stats sources
        </button>
      </div>
      <NetworkDiagnosticsCard
        diagnostics={networkDiagnostics}
        loading={loadingAction === "network-diagnostics"}
        onRun={onRunNetworkDiagnostics}
        showDetails={showDebugInfo || Boolean(networkDiagnostics)}
      />
      {records.length ? (
        <div className="source-health-table">
          <div className="source-health-row header">
            <span>Source</span>
            <span>Taux utile</span>
            <span>Importées</span>
            <span>Bruit</span>
            <span>Blocages</span>
            <span>Dernière recherche</span>
          </div>
          {records.map((record) => (
            <div className={`source-health-row ${sourceHealthKind(record)}`} key={record.source}>
              <span><strong>{record.source}</strong><small>{record.lastMessage || "À vérifier"}</small></span>
              <span>{sourceUsefulRate(record)}/rech.</span>
              <span>{record.importedCount}</span>
              <span>{record.skippedCount}</span>
              <span>{record.blockedCount}</span>
              <span>{formatSessionDate(record.lastSearchedAt)}</span>
              {showDebugInfo && (
                <small className="source-health-debug">
                  trouvées {record.foundCount} · liens détail {record.detailLinkCount} · sans lien {record.missingDetailCount} · pauvres {record.poorQualityCount} · qualité {sourceQualityAverage(record) || "n/a"}
                </small>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="helper-text">Lance une recherche pour commencer à mesurer les sources utiles et les sources fragiles.</p>
      )}
    </section>
  );
}
