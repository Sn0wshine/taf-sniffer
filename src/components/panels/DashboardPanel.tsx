import type { SearchSession } from "../../types";

export function DashboardPanel({
  offerCount,
  reviewCount,
  exploreCount,
  priorityCount,
  lastSearchSession,
  onStartSearch,
  onShowResults,
  onShowTools,
}: {
  offerCount: number;
  reviewCount: number;
  exploreCount: number;
  priorityCount: number;
  lastSearchSession: SearchSession | null;
  onStartSearch: () => void;
  onShowResults: () => void;
  onShowTools: () => void;
}) {
  const hasOffers = offerCount > 0;
  return (
    <section className="dashboard-view" aria-labelledby="dashboard-title">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h2 id="dashboard-title">Ta prochaine opportunité commence ici.</h2>
          <p>Recherche un métier, compare les offres et décide avec des critères lisibles. L'analyse locale fonctionne sans clé API ; l'IA ajoute un éclairage quand elle est disponible.</p>
        </div>
        <button className="primary-button" type="button" onClick={onStartSearch}>Lancer une recherche guidée</button>
      </div>

      <div className="dashboard-metrics" aria-label="Résumé des offres">
        <button type="button" onClick={onShowResults}><strong>{offerCount}</strong><span>offres collectées</span></button>
        <button type="button" onClick={onShowResults}><strong>{reviewCount}</strong><span>à traiter</span></button>
        <button type="button" onClick={onShowResults}><strong>{exploreCount}</strong><span>à creuser</span></button>
        <button type="button" onClick={onShowResults}><strong>{priorityCount}</strong><span>priorités</span></button>
      </div>

      <div className="dashboard-actions">
        <button className="dashboard-action-card" type="button" onClick={onStartSearch}>
          <strong>Rechercher des offres</strong>
          <span>Métier, zone et conditions essentielles.</span>
        </button>
        <button className="dashboard-action-card" type="button" onClick={onShowTools}>
          <strong>Importer une annonce</strong>
          <span>Analyse locale immédiate, sans API.</span>
        </button>
        <button className="dashboard-action-card" type="button" onClick={onShowResults}>
          <strong>Voir mes résultats</strong>
          <span>{hasOffers ? "Reprendre le tri et les favoris." : "Tes offres apparaîtront ici."}</span>
        </button>
      </div>

      <div className="dashboard-status" role="status">
        {lastSearchSession
          ? `Dernière recherche : ${lastSearchSession.keywords || "offres d'emploi"}${lastSearchSession.location ? ` · ${lastSearchSession.location}` : ""}.`
          : "Aucune recherche enregistrée. Commence par définir le poste ou les mots-clés qui t'intéressent."}
      </div>
    </section>
  );
}
