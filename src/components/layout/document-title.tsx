import { useEffect } from "react";
import { useLocation, useMatch } from "react-router-dom";
import { getPageTitle } from "@/lib/format/page-title";
import { useBudget } from "@/queries/use-budget";
import { usePortfolio } from "@/queries/use-portfolio";

/** Keeps the browser tab title in step with the page. Renders nothing. */
export function DocumentTitle() {
  const { pathname } = useLocation();
  const budgetId = useMatch("/app/budgets/:budgetId/*")?.params.budgetId;
  const portfolioId = useMatch("/app/portfolio/:portfolioId/*")?.params.portfolioId;
  const budgetName = useBudget(budgetId).data?.name;
  const portfolioName = usePortfolio(portfolioId).data?.name;

  useEffect(() => {
    const previous = document.title;
    document.title = getPageTitle(pathname, { budgetName, portfolioName });
    return () => {
      document.title = previous;
    };
  }, [pathname, budgetName, portfolioName]);

  return null;
}
