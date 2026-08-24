import { useState } from "react";
import { ClipboardCopy, ClipboardPaste } from "lucide-react";
import { HelpTooltip } from "./Tooltips";

export function ClipboardImportButton({
  onImport,
  compact = false,
  className = "",
}: {
  onImport: (text: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error("L'accès au presse-papier n'est pas autorisé ou non supporté.");
      }
      const text = await navigator.clipboard.readText();
      const clean = text.trim();
      if (!clean || clean.length < 25) {
        throw new Error("Le texte copié semble trop court pour une annonce d'emploi.");
      }
      onImport(clean);
      setCopied(true);
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate([40, 30, 40]);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur de lecture du presse-papier.";
      alert(msg);
    }
  };

  return (
    <HelpTooltip tooltip="Colle automatiquement l'annonce copiée depuis Indeed, LinkedIn, France Travail ou un autre site pour l'analyser directement.">
      <button
        type="button"
        className={`ghost-button clipboard-import-button ${compact ? "compact" : ""} ${copied ? "copied" : ""} ${className}`}
        onClick={handlePaste}
        aria-label="Coller et analyser une annonce"
      >
        {copied ? <ClipboardCopy size={16} aria-hidden="true" /> : <ClipboardPaste size={16} aria-hidden="true" />}
        <span>{copied ? "Annonce collée !" : "Coller annonce"}</span>
      </button>
    </HelpTooltip>
  );
}
