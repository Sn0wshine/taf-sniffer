import { useState } from "react";
import type { ChangeEvent } from "react";
import { PlusCircle, Settings2 } from "lucide-react";
import type { AnalysisItem, ExpectedReview, ExpertTab, ManualExtraction, Strategy } from "../appConstants";
import { FACILITATED_TRAINING_LABEL } from "../appConstants";
import { BackupPanel } from "../components/panels/BackupPanel";
import { CollectionPanel } from "../components/panels/CollectionPanel";
import { SourceHealthPanel } from "../components/panels/SourceHealthPanel";
import { TerrainPanel } from "../components/panels/TerrainPanel";
import { ValidationPanel } from "../components/panels/ValidationPanel";
import { ClipboardImportButton } from "../components/ui/ClipboardImportButton";
import { RequirementChip } from "../components/ui/Tooltips";
import { requirementPatch } from "../utils/jobHelpers";

const expertTabLabels: Record<ExpertTab, string> = {
  offer: "Analyse express",
  search: "Critères & Filtres",
  collection: "Collecte réelle",
  validation: "Validation & Tests",
  tools: "Santé & Sauvegardes",
};

export function ExpertView({
  analyses,
  strategy,
  queryPlan,
  sourceHealthStats,
  networkDiagnostics,
  showDebugInfo,
  loadingAction,
  onUpdateStrategy,
  onAddOffers,
  onLoadDemo,
  onLoadExtractionTests,
  onUpdateExpected,
  onSelectOffer,
  onRunNetworkDiagnostics,
  onResetSourceHealth,
  onExportBackup,
  onImportBackup,
  onCopyKeywords,
  onCopyChecklist,
  onCopyKeyword,
  onCopyTerrainReport,
  activeProfile,
}: {
  analyses: AnalysisItem[];
  strategy: Strategy;
  queryPlan: any;
  sourceHealthStats: any;
  networkDiagnostics: any;
  showDebugInfo: boolean;
  loadingAction: string;
  onUpdateStrategy: (patch: Partial<Strategy>) => void;
  onAddOffers: (text: string, meta?: any) => void;
  onLoadDemo: () => void;
  onLoadExtractionTests: () => void;
  onUpdateExpected: (id: string, patch: Partial<ExpectedReview>) => void;
  onSelectOffer: (id: string) => void;
  onRunNetworkDiagnostics: () => void;
  onResetSourceHealth: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: ChangeEvent<HTMLInputElement>) => void;
  onCopyKeywords: () => void;
  onCopyChecklist: () => void;
  onCopyKeyword: (kw: string) => void;
  onCopyTerrainReport: () => void;
  activeProfile: any;
}) {
  const [expertTab, setExpertTab] = useState<ExpertTab>("offer");
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const handleManualSubmit = () => {
    if (!draft.trim()) return;
    onAddOffers(draft, { source: draftSource.trim(), sourceUrl: draftUrl.trim() });
    setDraft("");
    setDraftSource("");
    setDraftUrl("");
  };

  return (
    <div className="expert-view-container">
      <div className="expert-tabs" role="tablist" aria-label="Sections du mode expert">
        {(["offer", "search", "collection", "validation", "tools"] as ExpertTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={expertTab === tab}
            className={expertTab === tab ? "active" : ""}
            onClick={() => setExpertTab(tab)}
          >
            {expertTabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="expert-tab-content">
        {expertTab === "offer" && (
          <section className="offer-input-card">
            <div className="section-title">
              <PlusCircle size={18} aria-hidden="true" />
              <h2>Coller une annonce brute</h2>
              <div className="quick-actions-row">
                <ClipboardImportButton onImport={(text) => onAddOffers(text)} />
                <button className="ghost-button compact" type="button" onClick={onLoadDemo}>
                  Charger démo
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={draft}
              placeholder="Colle ici le texte intégral d'une offre d'emploi trouvée sur Indeed, LinkedIn, France Travail..."
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="offer-meta-grid">
              <input
                placeholder="Source (ex: Indeed, Apec, France Travail...)"
                value={draftSource}
                onChange={(e) => setDraftSource(e.target.value)}
              />
              <input
                placeholder="URL de l'annonce originale"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
              />
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={handleManualSubmit}
              disabled={!draft.trim()}
            >
              Analyser cette annonce
            </button>
          </section>
        )}

        {expertTab === "search" && (
          <section className="strategy-strip">
            <div className="section-title">
              <Settings2 size={18} aria-hidden="true" />
              <h2>Critères & Filtres</h2>
            </div>
            <div className="strategy-grid">
              <label>
                Métier cible
                <input
                  value={strategy.targetJob}
                  onChange={(e) => onUpdateStrategy({ targetJob: e.target.value })}
                />
              </label>
              <label>
                Zone géographique
                <input
                  value={strategy.location}
                  placeholder="France entière si vide"
                  onChange={(e) => onUpdateStrategy({ location: e.target.value })}
                />
              </label>
              <label>
                Salaire net minimum (€/mois)
                <input
                  type="number"
                  min={0}
                  value={strategy.salaryMin || ""}
                  placeholder="0"
                  onChange={(e) => onUpdateStrategy({ salaryMin: Number(e.target.value) })}
                />
              </label>
              <label>
                Expérience
                <select
                  value={strategy.experienceLevel}
                  onChange={(e) => onUpdateStrategy({ experienceLevel: e.target.value as Strategy["experienceLevel"] })}
                >
                  <option value="debutant_reconversion">Débutant / reconversion</option>
                  <option value="junior">Junior</option>
                  <option value="confirme">Confirmé</option>
                  <option value="indifferent">Indifférent</option>
                </select>
              </label>
              <label>
                Contrat souhaité
                <select
                  value={strategy.contractPreference}
                  onChange={(e) => onUpdateStrategy({ contractPreference: e.target.value as Strategy["contractPreference"] })}
                >
                  <option value="any">Peu importe</option>
                  <option value="cdi">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="alternance">Alternance</option>
                </select>
              </label>
              <label className="objective-field">
                Objectif libre
                <textarea
                  rows={2}
                  value={strategy.objective}
                  onChange={(e) => onUpdateStrategy({ objective: e.target.value })}
                />
              </label>
            </div>
            <div className="toggle-row">
              <RequirementChip
                label={FACILITATED_TRAINING_LABEL}
                mode={strategy.poeiRequirement}
                onChange={(mode) => onUpdateStrategy(requirementPatch("poeiRequirement", mode))}
              />
              <RequirementChip
                label={activeProfile.ui.strategicRequirementLabel}
                mode={strategy.auditRequirement}
                onChange={(mode) => onUpdateStrategy(requirementPatch("auditRequirement", mode))}
              />
              <RequirementChip
                label="Refuser indépendant imposé"
                mode={strategy.independentRequirement}
                onChange={(mode) => onUpdateStrategy(requirementPatch("independentRequirement", mode))}
              />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={strategy.hideWeakOffers !== false}
                  onChange={(e) => onUpdateStrategy({ hideWeakOffers: e.target.checked })}
                />
                Masquer offres faibles
              </label>
            </div>
          </section>
        )}

        {expertTab === "collection" && (
          <CollectionPanel
            analyses={analyses}
            queryPlan={queryPlan}
            loadingAction={loadingAction}
            onCopyKeywords={onCopyKeywords}
            onCopyChecklist={onCopyChecklist}
            onCopyKeyword={onCopyKeyword}
          />
        )}

        {expertTab === "validation" && (
          <ValidationPanel
            analyses={analyses}
            onSelect={onSelectOffer}
            onUpdateExpected={onUpdateExpected}
            onLoadExtractionTests={onLoadExtractionTests}
          />
        )}

        {expertTab === "tools" && (
          <div className="tools-grid">
            <SourceHealthPanel
              stats={sourceHealthStats}
              networkDiagnostics={networkDiagnostics}
              showDebugInfo={showDebugInfo}
              loadingAction={loadingAction}
              onRunNetworkDiagnostics={onRunNetworkDiagnostics}
              onReset={onResetSourceHealth}
            />
            <BackupPanel
              loadingAction={loadingAction}
              onExport={onExportBackup}
              onImport={onImportBackup}
            />
            <TerrainPanel
              analyses={analyses}
              loadingAction={loadingAction}
              onSelect={onSelectOffer}
              onCopyReport={onCopyTerrainReport}
            />
          </div>
        )}
      </div>
    </div>
  );
}
