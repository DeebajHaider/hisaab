import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

/** Becomes true (and stays true) once the element scrolls into view. Without
 *  IntersectionObserver, or with reduced motion, it is true immediately so
 *  nothing is ever left hidden. */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === "undefined" || prefersReducedMotion(),
  );

  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen, threshold]);

  return [ref, seen] as const;
}
