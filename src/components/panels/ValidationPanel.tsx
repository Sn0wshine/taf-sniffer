import type { AnalysisItem } from "../../appConstants";
import type { ExpectedReview, ValidationTag } from "../../types";
import {
  buildCalibrationReport,
  expectedExtractionInputs,
  isAnnotatedJob,
  isRealWorldJob,
  normalizeExpectedReview,
  validationSummary,
} from "../../utils/jobHelpers";
import { compareValidation, detectedValidationTags, validationTags } from "../../validation";
import { CalibrationReport } from "./CalibrationReport";

export function ValidationPanel({
  analyses,
  onSelect,
  onUpdateExpected,
  onLoadExtractionTests,
}: {
  analyses: AnalysisItem[];
  onSelect: (id: string) => void;
  onUpdateExpected: (id: string, patch: Partial<ExpectedReview>) => void;
  onLoadExtractionTests: () => void;
}) {
  const summary = validationSummary(analyses);
  const calibration = buildCalibrationReport(analyses);
  const validationItems = analyses.slice().sort((a, b) => {
    const priority = (item: AnalysisItem) => {
      if (isRealWorldJob(item.job) && !isAnnotatedJob(item.job)) return 0;
      if (isRealWorldJob(item.job)) return 1;
      return 2;
    };
    return priority(a) - priority(b) || b.analysis.scores.global - a.analysis.scores.global;
  });

  if (analyses.length === 0) {
    return (
      <section className="validation-panel">
        <div className="section-title">
          <h2>Validation</h2>
          <button className="ghost-button compact" onClick={onLoadExtractionTests}>Charger tests extraction</button>
        </div>
        <p className="helper-text">Charge des exemples ou colle de vraies annonces pour commencer le banc de test.</p>
      </section>
    );
  }

  return (
    <section className="validation-panel">
      <div className="section-title">
        <h2>Validation réelle</h2>
        <button className="ghost-button compact" onClick={onLoadExtractionTests}>Charger tests extraction</button>
      </div>

      <div className="validation-stats">
        <div>
          <strong>{summary.reviewed.length}</strong>
          <span>annotées</span>
        </div>
        <div>
          <strong>{summary.verdictCount ? `${summary.verdictMatches}/${summary.verdictCount}` : "-"}</strong>
          <span>verdicts OK</span>
        </div>
        <div>
          <strong>{summary.missedCount}</strong>
          <span>tags manqués</span>
        </div>
        <div>
          <strong>{summary.extraCount}</strong>
          <span>faux positifs</span>
        </div>
        <div>
          <strong>{summary.warnings.length}</strong>
          <span>scores fragiles</span>
        </div>
      </div>

      <CalibrationReport report={calibration} onSelect={onSelect} />

      {summary.rulesToAdjust.length > 0 ? (
        <div className="rules-box">
          <strong>Règles à ajuster</strong>
          <ul>
            {summary.rulesToAdjust.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="helper-text">Aucune règle évidente à ajuster pour l’instant.</p>
      )}

      <div className="validation-list">
        {validationItems.map(({ job, analysis }) => {
          const review = normalizeExpectedReview(job);
          const comparison = compareValidation(analysis, review);
          const detectedTags = detectedValidationTags(analysis);

          return (
            <article className="validation-card" key={job.id}>
              <div className="validation-card-head">
                <button className="text-button" onClick={() => onSelect(job.id)}>
                  {analysis.normalizedTitle}
                </button>
                <span className={comparison.match ? "validation-ok" : "validation-ko"}>
                  {comparison.match ? "OK" : "À revoir"}
                </span>
              </div>

              <label>
                Verdict attendu
                <select
                  value={review.expectedVerdict}
                  onChange={(event) => onUpdateExpected(job.id, { expectedVerdict: event.target.value as ExpectedReview["expectedVerdict"] })}
                >
                  {["", "prioritaire", "à creuser", "piège", "hors trajectoire"].map((value) => (
                    <option value={value} key={value}>
                      {value || "Non noté"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="validation-tags">
                {validationTags.map((tag: ValidationTag) => (
                  <label className="tag-check" key={tag}>
                    <input
                      type="checkbox"
                      checked={review.expectedTags.includes(tag)}
                      onChange={(event) => {
                        const expectedTags = event.target.checked
                          ? ([...new Set([...review.expectedTags, tag])] as ValidationTag[])
                          : review.expectedTags.filter((item) => item !== tag);
                        onUpdateExpected(job.id, { expectedTags });
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>

              <label>
                Notes
                <textarea
                  rows={2}
                  value={review.notes}
                  placeholder="Pourquoi tu attendais ce verdict ?"
                  onChange={(event) => onUpdateExpected(job.id, { notes: event.target.value })}
                />
              </label>

              <details className="validation-extraction">
                <summary>Champs attendus</summary>
                <div className="validation-extraction-grid">
                  {expectedExtractionInputs.map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        value={review.expectedExtraction?.[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          onUpdateExpected(job.id, {
                            expectedExtraction: {
                              ...(review.expectedExtraction ?? {}),
                              [field.key]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>

              <div className="validation-result">
                <span>Détecté : {detectedTags.length ? detectedTags.join(", ") : "rien"}</span>
                <span>Verdict Taf : {comparison.actualVerdict}</span>
                {comparison.missedTags.length > 0 && <span className="negative-text">Manqués : {comparison.missedTags.join(", ")}</span>}
                {comparison.extraTags.length > 0 && <span className="muted">En plus : {comparison.extraTags.join(", ")}</span>}
                {comparison.missedExtractionFields.length > 0 && (
                  <span className="negative-text">Champs faux : {comparison.missedExtractionFields.join(", ")}</span>
                )}
                {comparison.scoreWarning && <span className="negative-text">{comparison.scoreWarning}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
