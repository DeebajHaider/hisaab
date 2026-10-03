import { useRef, type TouchEvent } from "react";
import { detectSwipe, type SwipeDirection } from "./detect-swipe";

const INTERACTIVE = "input, textarea, select, [contenteditable='true'], [role='slider']";

/** Horizontal-swipe handlers for one container. Spread `handlers` and `ref`
 *  onto it. Touches that start in a form field, or in a portaled dialog or
 *  menu (which React still bubbles here), are ignored. */
export function useSwipe(onSwipe: (direction: SwipeDirection) => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const handlers = {
    onTouchStart(e: TouchEvent) {
      const target = e.target as Element;
      const usable =
        enabled &&
        e.touches.length === 1 &&
        !!ref.current?.contains(target) &&
        !target.closest(INTERACTIVE);
      start.current = usable ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    },
    onTouchEnd(e: TouchEvent) {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const touch = e.changedTouches[0];
      const direction = detectSwipe({
        startX: from.x,
        startY: from.y,
        endX: touch.clientX,
        endY: touch.clientY,
        viewportWidth: window.innerWidth,
      });
      if (direction) onSwipe(direction);
    },
    onTouchCancel() {
      start.current = null;
    },
  };

  return { ref, ...handlers };
}
