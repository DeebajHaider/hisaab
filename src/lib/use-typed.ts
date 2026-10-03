import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

/** Types `text` out one character at a time once `start` is true. Returns the
 *  characters shown so far (all of them straight away under reduced motion). */
export function useTyped(text: string, start: boolean, speedMs = 170, delayMs = 400) {
  const instant = prefersReducedMotion();
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant || !start) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c + 1 >= text.length && interval) clearInterval(interval);
          return Math.min(c + 1, text.length);
        });
      }, speedMs);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [text, start, speedMs, delayMs, instant]);

  return text.slice(0, instant ? text.length : count);
}
