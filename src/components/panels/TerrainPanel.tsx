import type { AnalysisItem } from "../../appConstants";
import {
  buildTerrainActionPlan,
  buildTerrainBlockers,
  buildTerrainReport,
  normalizeReviewStatus,
  reviewStatusLabel,
  scoreClass,
  terrainQueueRows,
} from "../../utils/jobHelpers";
import { InfoChip } from "../ui/Tooltips";

export function TerrainQueueList({
  title,
  rows,
  empty,
  onSelect,
}: {
  title: string;
  rows: Array<{ id: string; title: string; meta: string; score: number; reason: string }>;
  empty: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="terrain-queue">
      <strong>{title}</strong>
      {rows.length ? (
        rows.map((row) => (
          <button className="terrain-queue-row" key={`${title}-${row.id}`} onClick={() => onSelect(row.id)}>
            <span className={scoreClass(row.score)}>{row.score}</span>
            <span>
              <b>{row.title}</b>
              <small>{row.meta}</small>
              <em>{row.reason}</em>
            </span>
          </button>
        ))
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

export function TerrainPanel({
  analyses,
  loadingAction,
  onSelect,
  onCopyReport,
}: {
  analyses: AnalysisItem[];
  loadingAction: string;
  onSelect: (id: string) => void;
  onCopyReport: () => void;
}) {
  const report = buildTerrainReport(analyses);
  const action = buildTerrainActionPlan(analyses);
  const queues = terrainQueueRows(analyses);
  const blockers = buildTerrainBlockers(analyses);
  const correctionRows = queues.correctionRows.slice(0, 5).map(({ item, reasons }) => ({
    id: item.job.id,
    title: item.analysis.normalizedTitle,
    meta: `${item.analysis.company} · ${item.analysis.location}`,
    score: item.analysis.scores.global,
    reason: reasons.join(" · "),
  }));
  const annotationRows = queues.annotationRows.slice(0, 5).map(({ job, analysis }) => ({
    id: job.id,
    title: analysis.normalizedTitle,
    meta: `${analysis.company} · ${analysis.location}`,
    score: analysis.scores.global,
    reason: "Verdict, tags ou notes à compléter",
  }));
  const readyRows = queues.readyRows.slice(0, 5).map(({ job, analysis }) => ({
    id: job.id,
    title: analysis.normalizedTitle,
    meta: `${analysis.company} · ${reviewStatusLabel(normalizeReviewStatus(job))}`,
    score: analysis.scores.global,
    reason: "Triée, annotée et extraction exploitable",
  }));

  return (
    <section className="terrain-panel">
      <div className="section-title">
        <h2>Terrain V1</h2>
        <InfoChip className="confidence-chip done" tooltip="Objectif terrain : obtenir un jeu de 20 annonces réelles annotées avant d'ajuster le scoring.">
          objectif 20 annonces réelles annotées
        </InfoChip>
      </div>

      <div className="terrain-progress">
        <div>
          <strong>{report.annotatedCount}/{report.target}</strong>
          <span>annonces annotées</span>
        </div>
        <progress max={report.target} value={Math.min(report.annotatedCount, report.target)} />
        <small>{report.progress}% du jeu terrain</small>
      </div>

      <div className={`terrain-next-action ${action.tone}`}>
        <div>
          <span>Prochaine action</span>
          <strong>{action.title}</strong>
          <p>{action.message}</p>
        </div>
        {action.nextId && (
          <button className="ghost-button compact" onClick={() => onSelect(action.nextId)}>
            Ouvrir la prochaine annonce terrain
          </button>
        )}
      </div>

      <div className={`terrain-blockers ${blockers.readyForScoring ? "ready" : ""}`}>
        <strong>Ce qui bloque la calibration</strong>
        <div>
          {blockers.blockers.length ? (
            blockers.blockers.slice(0, 7).map((blocker) => (
              <span className={`terrain-blocker ${blocker.tone}`} key={blocker.label}>
                {blocker.label} <b>{blocker.count}</b>
              </span>
            ))
          ) : (
            <span className="terrain-blocker ready">aucun blocage</span>
          )}
        </div>
        <p>{blockers.recommendation}</p>
      </div>

      <div className="terrain-stats">
        <div><strong>{report.realCount}</strong><span>réelles</span></div>
        <div><strong>{report.correctedCount}</strong><span>corrigées</span></div>
        <div><strong>{report.favoriteCount}</strong><span>favoris</span></div>
        <div><strong>{report.exploreCount}</strong><span>à creuser</span></div>
        <div><strong>{report.ignoredCount}</strong><span>ignorées</span></div>
      </div>

      <div className="terrain-queue-grid">
        <TerrainQueueList title="À corriger" rows={correctionRows} empty="Aucune correction prioritaire." onSelect={onSelect} />
        <TerrainQueueList title="À annoter" rows={annotationRows} empty="Toutes les offres réelles sont annotées." onSelect={onSelect} />
        <TerrainQueueList title="Prêtes scoring" rows={readyRows} empty="Pas encore d’offre prête scoring." onSelect={onSelect} />
      </div>

      <div className="terrain-workflow">
        <span>Rechercher</span>
        <span>Corriger infos extraites</span>
        <span>Trier</span>
        <span>Annoter</span>
        <span>Exporter JSON</span>
      </div>

      <div className="terrain-source-list">
        {report.sourceRows.length ? (
          report.sourceRows.map((source) => (
            <div className="terrain-source-row" key={source.source}>
              <strong>{source.source}</strong>
              <span>{source.total} offre{source.total > 1 ? "s" : ""}</span>
              <span>{source.annotated} annotée{source.annotated > 1 ? "s" : ""}</span>
              <span>{source.favorite} favori · {source.explore} à creuser · {source.ignored} ignorée{source.ignored > 1 ? "s" : ""}</span>
              <small>{source.qualityCounts.map(([label, count]) => `${label} ${count}`).join(" · ") || "qualité à vérifier"} · {source.message}</small>
            </div>
          ))
        ) : (
          <p className="helper-text">Aucune annonce réelle collectée pour l’instant.</p>
        )}
      </div>

      <div className="button-row">
        <button className={`ghost-button compact ${loadingAction === "copy-terrain-report" ? "is-loading" : ""}`} onClick={onCopyReport}>
          {loadingAction === "copy-terrain-report" && <span className="button-spinner" aria-hidden="true" />}
          Copier rapport terrain Markdown
        </button>
      </div>
    </section>
  );
}
