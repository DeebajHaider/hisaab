import { Navigate, useParams } from "react-router-dom";
import { currentYearMonth } from "@/lib/format/year-month";

/**
 * Handles /app/budgets/:budgetId/month with no yearMonth segment.
 * Redirects to the current month, replacing history so back-button
 * behavior stays sane.
 */
export function MonthRedirect() {
  const { budgetId } = useParams<{ budgetId: string }>();
  if (!budgetId) return null;
  return (
    <Navigate
      to={`/app/budgets/${budgetId}/month/${currentYearMonth()}`}
      replace
    />
  );
}

