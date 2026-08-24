import { useRef } from "react";
import type { ChangeEvent, RefObject } from "react";
import { Download, ShieldCheck, Upload } from "lucide-react";

export function BackupPanel({
  loadingAction,
  onExport,
  onImport,
  onImportClick,
  inputRef,
}: {
  loadingAction: string;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportClick?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const activeRef = inputRef || localRef;

  const handleImportClick = () => {
    if (onImportClick) {
      onImportClick();
    } else {
      activeRef.current?.click();
    }
  };

  return (
    <section className="backup-panel">
      <div className="section-title">
        <ShieldCheck size={18} aria-hidden="true" />
        <h2>Sauvegarde locale</h2>
      </div>
      <p className="helper-text">Exporte ou restaure toutes tes annonces, réglages, favoris, ignorées et validations.</p>
      <div className="button-row">
        <button className={`ghost-button ${loadingAction === "export-backup" ? "is-loading" : ""}`} onClick={onExport}>
          {loadingAction === "export-backup" && <span className="button-spinner" aria-hidden="true" />}
          <Download size={17} aria-hidden="true" />
          Exporter JSON
        </button>
        <button className={`ghost-button ${loadingAction === "import-backup" ? "is-loading" : ""}`} onClick={handleImportClick}>
          {loadingAction === "import-backup" && <span className="button-spinner" aria-hidden="true" />}
          <Upload size={17} aria-hidden="true" />
          Importer JSON
        </button>
      </div>
      <input ref={activeRef} className="backup-file-input" type="file" accept="application/json,.json" onChange={onImport} />
    </section>
  );
}
