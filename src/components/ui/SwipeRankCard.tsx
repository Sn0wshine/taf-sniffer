import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { ListFilter, Star, Trash2 } from "lucide-react";
import { RANK_SWIPE_MAX, RANK_SWIPE_THRESHOLD } from "../../appConstants";
import type { SwipeRankAction } from "../../appConstants";
import type { ReviewStatus } from "../../types";

export function SwipeRankCard({
  selected,
  onSelect,
  onSwipe,
  onToggleFavorite,
  onToggleExplore,
  onToggleIgnore,
  currentStatus,
  isFavorite,
  isIgnored,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  onSwipe: (action: SwipeRankAction) => void;
  onToggleFavorite?: () => void;
  onToggleExplore?: () => void;
  onToggleIgnore?: () => void;
  currentStatus?: ReviewStatus;
  isFavorite?: boolean;
  isIgnored?: boolean;
  children: ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const swipedRef = useRef(false);
  const swipeAction: SwipeRankAction | null =
    Math.abs(dragX) >= RANK_SWIPE_THRESHOLD ? (dragX > 0 ? "explore" : "ignore") : null;

  const resetDrag = () => {
    pointerIdRef.current = null;
    draggingRef.current = false;
    dragXRef.current = 0;
    setDragX(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    startRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
    swipedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) return;
      draggingRef.current = true;
    }
    event.preventDefault();
    const nextDragX = Math.max(-RANK_SWIPE_MAX, Math.min(RANK_SWIPE_MAX, dx));
    dragXRef.current = nextDragX;
    setDragX(nextDragX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const finalDragX = dragXRef.current;
    const action = Math.abs(finalDragX) >= RANK_SWIPE_THRESHOLD ? (finalDragX > 0 ? "explore" : "ignore") : null;
    const wasDragging = draggingRef.current;
    resetDrag();
    if (action) {
      swipedRef.current = true;
      onSwipe(action);
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 160);
      return;
    }
    if (wasDragging) {
      swipedRef.current = true;
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 80);
    }
  };

  return (
    <div className={`rank-swipe-shell ${swipeAction ? `swipe-${swipeAction}` : ""}`}>
      <div className="rank-swipe-action keep" aria-hidden="true">
        {currentStatus === "a_creuser" ? <Star size={16} /> : <ListFilter size={16} />}
        <span>{currentStatus === "a_creuser" ? "Favori" : "À creuser"}</span>
      </div>
      <div className="rank-swipe-action ignore" aria-hidden="true">
        <Trash2 size={16} />
        <span>Ignorer</span>
      </div>
      <div
        className={`rank-card ${selected ? "selected" : ""} ${draggingRef.current ? "dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!swipedRef.current) onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        onPointerCancel={resetDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        style={{ transform: dragX ? `translateX(${dragX}px)` : undefined }}
      >
        {children}
        {(onToggleFavorite || onToggleExplore || onToggleIgnore) && (
          <span className="rank-card-hover-actions" onClick={(e) => e.stopPropagation()}>
            {onToggleFavorite && (
              <button
                type="button"
                className={`card-hover-btn star ${isFavorite ? "active" : ""}`}
                title={isFavorite ? "Retirer des favoris" : "Marquer favori (F)"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Star size={13} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
            {onToggleExplore && (
              <button
                type="button"
                className={`card-hover-btn explore ${currentStatus === "a_creuser" ? "active" : ""}`}
                title={currentStatus === "a_creuser" ? "Déjà à creuser" : "Mettre à creuser (C)"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExplore();
                }}
              >
                <ListFilter size={13} />
              </button>
            )}
            {onToggleIgnore && (
              <button
                type="button"
                className={`card-hover-btn ignore ${isIgnored ? "active" : ""}`}
                title={isIgnored ? "Restaurer l'offre" : "Ignorer l'offre (I)"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleIgnore();
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
