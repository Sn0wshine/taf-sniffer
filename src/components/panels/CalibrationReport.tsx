import type { ValidationTag } from "../../types";
import type { buildCalibrationReport } from "../../utils/jobHelpers";

export function CalibrationTagList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<[ValidationTag, number]>;
  empty: string;
}) {
  return (
    <div className="calibration-list">
      <strong>{title}</strong>
      {items.length ? (
        items.slice(0, 5).map(([tag, count]) => (
          <span key={tag}>
            {tag} <b>{count}</b>
          </span>
        ))
      ) : (
        <em>{empty}</em>
      )}
    </div>
  );
}

export function CalibrationLabelList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<[string, number]>;
  empty: string;
}) {
  return (
    <div className="calibration-list">
      <strong>{title}</strong>
      {items.length ? (
        items.slice(0, 5).map(([label, count]) => (
          <span key={label}>
            {label} <b>{count}</b>
          </span>
        ))
      ) : (
        <em>{empty}</em>
      )}
    </div>
  );
}

export function CalibrationReport({
  report,
  onSelect,
}: {
  report: ReturnType<typeof buildCalibrationReport>;
  onSelect: (id: string) => void;
}) {
  const problemOffers = report.reviewed.filter(
    (item) =>
      !item.comparison.match ||
      item.comparison.missedTags.length ||
      item.comparison.extraTags.length ||
      item.comparison.missedExtractionFields.length ||
      item.comparison.scoreWarning,
  );

  if (report.reviewedCount === 0) {
    return (
      <div className="calibration-box">
        <div className="section-title">
          <h3>Calibration scoring</h3>
        </div>
        <p className="helper-text">Annote quelques offres avec un verdict attendu et des tags pour voir les erreurs récurrentes.</p>
      </div>
    );
  }

  return (
    <div className="calibration-box">
      <div className="section-title">
        <h3>Calibration scoring</h3>
      </div>
      <div className="calibration-grid">
        <div>
          <strong>{report.reviewedCount}</strong>
          <span>annotées</span>
        </div>
        <div>
          <strong>{report.verdictMatchRate !== null ? `${report.verdictMatchRate}%` : "-"}</strong>
          <span>verdicts alignés</span>
        </div>
        <div>
          <strong>{report.overratedOffers.length}</strong>
          <span>surcotées</span>
        </div>
        <div>
          <strong>{report.underratedOffers.length}</strong>
          <span>sous-cotées</span>
        </div>
        <div>
          <strong>{report.extractionCheckCount ? `${report.extractionMatchCount}/${report.extractionCheckCount}` : "-"}</strong>
          <span>champs OK</span>
        </div>
        <div>
          <strong>{report.genericTitleMisses}</strong>
          <span>titres génériques</span>
        </div>
      </div>

      <div className="calibration-columns">
        <CalibrationTagList title="Tags manqués" items={report.missedTagCounts} empty="Aucun tag manqué." />
        <CalibrationTagList title="Faux positifs" items={report.extraTagCounts} empty="Aucun faux positif." />
        <CalibrationLabelList title="Champs manqués" items={report.extractionMissCounts} empty="Aucun champ manqué." />
        <CalibrationLabelList title="Sources fragiles" items={report.fragileSources} empty="Aucune source fragile." />
      </div>

      {report.priorityRules.length > 0 && (
        <div className="rules-box">
          <strong>Recommandations de règles</strong>
          <ul>
            {report.priorityRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {problemOffers.length > 0 && (
        <div className="calibration-offers">
          <strong>Offres à revoir</strong>
          {problemOffers.slice(0, 6).map(({ job, analysis, review, comparison }) => (
            <button className="calibration-offer" key={job.id} onClick={() => onSelect(job.id)}>
              <span>{analysis.normalizedTitle}</span>
              <small>
                Attendu : {review.expectedVerdict || "non noté"} · Taf : {comparison.actualVerdict}
                {comparison.missedTags.length ? ` · manqués : ${comparison.missedTags.join(", ")}` : ""}
                {comparison.extraTags.length ? ` · en trop : ${comparison.extraTags.join(", ")}` : ""}
                {comparison.missedExtractionFields.length ? ` · champs : ${comparison.missedExtractionFields.join(", ")}` : ""}
                {comparison.scoreWarning ? ` · ${comparison.scoreWarning}` : ""}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
