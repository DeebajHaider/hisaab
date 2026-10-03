import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Counts from 0 up to `target` once `start` is true. Shows the final value
 *  immediately under reduced motion. */
export function useCountUp(target: number, start: boolean, durationMs = 1400, delayMs = 0) {
  const instant = prefersReducedMotion();
  const [value, setValue] = useState(instant ? target : 0);

  useEffect(() => {
    if (instant || !start) return;
    let frame = 0;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - t0) / durationMs, 1);
        setValue(Math.round(target * easeOutCubic(progress)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, start, durationMs, delayMs, instant]);

  return instant ? target : value;
}
