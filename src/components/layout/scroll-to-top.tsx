import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Starts every new page at the top. Without it, a long page you scrolled down
 *  leaves the next page scrolled too, which reads as the new page being cut off.
 *  Only the path counts, so changing a query string (filters) doesn't jump. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
