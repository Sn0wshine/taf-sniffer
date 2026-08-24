import { COLLECTION_TARGET } from "../../appConstants";
import type { AnalysisItem } from "../../appConstants";
import type { generateSearchQueries } from "../../searchQueries";

export function CollectionPanel({
  analyses,
  queryPlan,
  loadingAction,
  onCopyKeywords,
  onCopyChecklist,
  onCopyKeyword,
}: {
  analyses: AnalysisItem[];
  queryPlan: ReturnType<typeof generateSearchQueries>;
  loadingAction: string;
  onCopyKeywords: () => void;
  onCopyChecklist: () => void;
  onCopyKeyword: (keyword: string) => void;
}) {
  const realJobs = analyses.filter(({ job }) => (job.datasetLabel || "jeu réel") === "jeu réel");
  const bySource = realJobs.reduce<Record<string, number>>((acc, { job }) => {
    const source = job.source || "Source inconnue";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="collection-panel">
      <div className="section-title">
        <h2>Collecte réelle</h2>
      </div>

      <div className="collection-progress">
        <div>
          <strong>
            {realJobs.length}/{COLLECTION_TARGET}
          </strong>
          <span>annonces collectées</span>
        </div>
        <progress max={COLLECTION_TARGET} value={Math.min(realJobs.length, COLLECTION_TARGET)} />
      </div>

      <div className="button-row">
        <button className={`ghost-button compact ${loadingAction === "copy-keywords" ? "is-loading" : ""}`} onClick={onCopyKeywords}>
          {loadingAction === "copy-keywords" && <span className="button-spinner" aria-hidden="true" />}
          Copier mots-clés
        </button>
        <button className={`ghost-button compact ${loadingAction === "copy-checklist" ? "is-loading" : ""}`} onClick={onCopyChecklist}>
          {loadingAction === "copy-checklist" && <span className="button-spinner" aria-hidden="true" />}
          Copier checklist
        </button>
      </div>

      <div className="keyword-cloud">
        {queryPlan.keywords.map((keyword: string) => (
          <button className="keyword-pill" key={keyword} onClick={() => onCopyKeyword(keyword)}>
            {keyword}
          </button>
        ))}
      </div>

      <details className="search-links" open>
        <summary>Liens de recherche prêts à ouvrir</summary>
        <div className="search-link-list">
          {queryPlan.links.slice(0, 24).map((link: { source: string; label: string; url: string }) => (
            <a href={link.url} target="_blank" rel="noopener noreferrer" key={`${link.source}-${link.label}`}>
              <span>{link.source}</span>
              {link.label.replace(` · ${link.source}`, "")}
            </a>
          ))}
        </div>
      </details>

      <div className="source-summary">
        {Object.keys(bySource).length ? (
          Object.entries(bySource).map(([source, count]) => <span key={source}>{`${source} : ${count}`}</span>)
        ) : (
          <span>Aucune annonce réelle collectée pour l’instant.</span>
        )}
      </div>
    </section>
  );
}
