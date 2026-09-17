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
          <p className="eyebrow">Agrégateur d’offres d’emploi</p>
          <h2 id="dashboard-title">Plusieurs sources, une seule liste d’offres.</h2>
          <p>Rassemble les annonces collectées et tes imports, compare leurs conditions et garde celles qui t’intéressent. La collecte dépend de la disponibilité des sources ; l’import manuel reste possible.</p>
        </div>
        <button className="primary-button" type="button" onClick={onStartSearch}>Lancer une recherche guidée</button>
      </div>

      <dl className="dashboard-metrics" aria-label="Résumé des offres">
        <div><dt>offres rassemblées</dt><dd>{offerCount}</dd></div>
        <div><dt>à traiter</dt><dd>{reviewCount}</dd></div>
        <div><dt>à creuser</dt><dd>{exploreCount}</dd></div>
        <div><dt>priorités</dt><dd>{priorityCount}</dd></div>
      </dl>

      <div className="dashboard-actions">
        <button className="dashboard-action-card" type="button" onClick={onShowTools}>
          <strong>Importer une annonce</strong>
          <span>Analyse locale, sans clé API.</span>
        </button>
        <button className="dashboard-action-card" type="button" onClick={onShowResults}>
          <strong>Voir mes offres</strong>
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
