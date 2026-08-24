import type { ChangeEvent } from "react";
import { BACKUP_VERSION } from "../appConstants";
import type { BackupPayload, StoredUiState } from "../appConstants";
import type { JobRecord, SearchSession, SourceHealthStats, Strategy, Top3AIComparison } from "../types";
import { normalizeBackup } from "../utils/normalizers";

export function useBackup({
  jobs,
  strategy,
  uiState,
  lastSearchSession,
  lastTop3AiComparison,
  sourceHealthStats,
  onRestore,
}: {
  jobs: JobRecord[];
  strategy: Strategy;
  uiState: StoredUiState;
  lastSearchSession: SearchSession | null;
  lastTop3AiComparison: Top3AIComparison | null;
  sourceHealthStats: SourceHealthStats;
  onRestore: (backup: BackupPayload) => void;
}) {
  const exportBackup = () => {
    const backup: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      strategy,
      uiState,
      lastSearchSession,
      lastTop3AiComparison,
      sourceHealthStats,
      jobs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taf-sniffer-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return backup;
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return null;

    const raw = await file.text();
    const backup = normalizeBackup(JSON.parse(raw));
    onRestore(backup);
    return backup;
  };

  return {
    exportBackup,
    importBackup,
  };
}
