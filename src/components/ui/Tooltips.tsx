import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { RequirementMode } from "../../types";
import { FACILITATED_TRAINING_LABEL } from "../../appConstants";
import { nextRequirementMode, normalizeDedupe } from "../../utils/jobHelpers";

export function InfoTooltip({
  tooltip,
  children,
}: {
  tooltip: string;
  children: (tooltipId: string) => ReactNode;
}) {
  const tooltipId = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  const updatePosition = () => {
    const target = wrapRef.current;
    const bubble = tooltipRef.current;
    if (!target || !bubble) return;
    const targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const margin = 12;
    const gap = 8;
    const width = Math.min(bubbleRect.width || 260, window.innerWidth - margin * 2);
    const height = bubbleRect.height || 40;
    const centeredLeft = targetRect.left + targetRect.width / 2 - width / 2;
    const left = Math.max(margin, Math.min(centeredLeft, window.innerWidth - width - margin));
    const canOpenAbove = targetRect.top >= height + gap + margin;
    const canOpenBelow = window.innerHeight - targetRect.bottom >= height + gap + margin;
    const top = canOpenAbove || !canOpenBelow
      ? Math.max(margin, targetRect.top - height - gap)
      : Math.min(window.innerHeight - height - margin, targetRect.bottom + gap);
    setStyle({ left, top, maxWidth: `min(320px, calc(100vw - ${margin * 2}px))` });
  };

  const show = () => {
    setVisible(true);
    window.requestAnimationFrame(updatePosition);
  };

  const hide = () => setVisible(false);

  useEffect(() => {
    if (!visible) return undefined;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible, tooltip]);

  return (
    <span className="info-chip-wrap" ref={wrapRef} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children(tooltipId)}
      {createPortal(
        <span
          className={`info-tooltip ${visible ? "is-visible" : ""}`}
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={style}
        >
          {tooltip}
        </span>,
        document.body
      )}
    </span>
  );
}

export function InfoChip({
  className,
  tooltip,
  children,
}: {
  className: string;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <InfoTooltip tooltip={tooltip}>
      {(tooltipId) => (
        <span className={`info-chip-trigger ${className}`} tabIndex={0} aria-describedby={tooltipId}>
          {children}
        </span>
      )}
    </InfoTooltip>
  );
}

export function HelpTooltip({
  tooltip,
  className = "",
  children,
}: {
  tooltip: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <InfoTooltip tooltip={tooltip}>
      {(tooltipId) => (
        <span className={`help-tooltip-target ${className}`} tabIndex={0} aria-describedby={tooltipId}>
          {children}
        </span>
      )}
    </InfoTooltip>
  );
}

export function InlineHelp({ tooltip }: { tooltip: string }) {
  return (
    <InfoTooltip tooltip={tooltip}>
      {(tooltipId) => (
        <span className="inline-help" tabIndex={0} aria-describedby={tooltipId}>
          ?
        </span>
      )}
    </InfoTooltip>
  );
}

export function FieldHelp({
  label,
  hint,
  tooltip,
}: {
  label: string;
  hint?: string;
  tooltip: string;
}) {
  return (
    <div className="smart-field-label">
      <HelpTooltip tooltip={tooltip} className="field-help-label">
        <strong>{label}</strong>
      </HelpTooltip>
      {hint && <span className="smart-hint">{hint}</span>}
    </div>
  );
}

export const requirementTooltip = (label: string, mode: RequirementMode) => {
  const normalized = normalizeDedupe(label);
  if (label === FACILITATED_TRAINING_LABEL) {
    if (mode === "required") return "Obligatoire : Taf Sniffer cherche une formation prise en charge ou facilitée, comme POEI, AFPR, formation employeur, financement ou parcours certifiant.";
    if (mode === "prefer") return "Souhaité : favorise les offres où la formation est prise en charge ou clairement facilitée, sans exclure automatiquement les autres.";
    return "Ignoré : la prise en charge de formation ne pèse pas dans le tri actuel.";
  }
  if (normalized.includes("independant")) {
    if (mode === "required") return "Filtre strict : les offres avec indépendant imposé sont écartées du tri prioritaire.";
    if (mode === "prefer") return "Signal surveillé : les offres indépendantes sont pénalisées mais restent visibles.";
    return "Ce risque n'est pas utilisé pour filtrer ou pénaliser les offres.";
  }
  if (mode === "required") return "Obligatoire : Taf Sniffer cherche ce signal et écarte les offres qui ne le montrent pas clairement.";
  if (mode === "prefer") return "Souhaité : ce signal aide le classement, sans exclure automatiquement les autres offres.";
  return "Ignoré : ce critère ne pèse pas dans le tri actuel.";
};

export function RequirementChip({
  label,
  mode,
  onChange,
}: {
  label: string;
  mode: RequirementMode;
  onChange: (mode: RequirementMode) => void;
}) {
  const title = mode === "required" ? "Obligatoire" : mode === "prefer" ? "Souhaité" : "Ignoré";
  return (
    <InfoTooltip tooltip={`${title}. ${requirementTooltip(label, mode)}`}>
      {(tooltipId) => (
        <button
          type="button"
          className={`info-chip-trigger requirement-chip ${mode}`}
          onClick={() => onChange(nextRequirementMode(mode))}
          aria-describedby={tooltipId}
        >
          <span className="chip-check">{mode === "off" ? "" : "✓"}</span>
          {label}
          {mode === "required" && <em>obligatoire</em>}
        </button>
      )}
    </InfoTooltip>
  );
}
