import type { NetworkDiagnosticsResult } from "../../types";

export const networkStatusLabel = (status?: NetworkDiagnosticsResult["status"]) => {
  if (status === "ok") return "Connexion OK";
  if (status === "partial") return "Connexion partielle";
  if (status === "blocked") return "Connexion à vérifier";
  if (status === "error") return "Diagnostic indisponible";
  return "Diagnostic connexion";
};

export function NetworkDiagnosticsCard({
  diagnostics,
  compact = false,
  loading,
  onRun,
  showDetails,
}: {
  diagnostics: NetworkDiagnosticsResult | null;
  compact?: boolean;
  loading: boolean;
  onRun: () => void;
  showDetails: boolean;
}) {
  const status = diagnostics?.status ?? "error";
  const message = diagnostics?.message || "Teste la connexion sortante du serveur local vers quelques sites d’emploi.";
  return (
    <section className={`network-diagnostic-card ${compact ? "compact" : ""} network-${status}`}>
      <div className="network-diagnostic-header">
        <div>
          <strong>{networkStatusLabel(diagnostics?.status)}</strong>
          <small>{message}</small>
        </div>
        <button className={`ghost-button compact ${loading ? "is-loading" : ""}`} onClick={onRun}>
          {loading && <span className="button-spinner" aria-hidden="true" />}
          {diagnostics ? "Relancer diagnostic" : "Tester la connexion"}
        </button>
      </div>
      {showDetails && diagnostics?.sources?.length ? (
        <div className="network-source-list">
          {diagnostics.sources.map((source) => (
            <div className={`network-source-row ${source.ok ? "ok" : "blocked"}`} key={`${source.source}-${source.url}`}>
              <span>
                <strong>{source.source}</strong>
                <small>{source.message}</small>
              </span>
              <span>{source.status ? `HTTP ${source.status}` : source.error || "sans réponse"}</span>
              <span>{Math.round(source.durationMs)} ms</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
