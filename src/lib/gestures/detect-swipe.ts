const MIN_DISTANCE = 70;
/** Horizontal travel must beat vertical travel by this factor, so scrolling never counts. */
const DOMINANCE = 2;
/** Touches starting this close to a side edge belong to the browser's back/forward gesture. */
const EDGE_ZONE = 24;

export type SwipeDirection = "left" | "right";

interface SwipeInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  viewportWidth: number;
}

/** Which way the finger swiped, or null if it wasn't a deliberate horizontal swipe. */
export function detectSwipe({
  startX,
  startY,
  endX,
  endY,
  viewportWidth,
}: SwipeInput): SwipeDirection | null {
  if (startX < EDGE_ZONE || startX > viewportWidth - EDGE_ZONE) return null;

  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * DOMINANCE) return null;

  return dx < 0 ? "left" : "right";
}
