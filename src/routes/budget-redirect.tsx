import { Navigate, useParams } from "react-router-dom";
import { useCategories } from "@/queries/use-categories";
import { todayISO } from "@/lib/format/date";

/**
 * Renders at /app/budgets/:budgetId (no trailing path).
 * Decides where to send the user based on whether the budget has any
 * categories set up yet.
 *
 * Shows nothing while loading — parent layout's skeleton covers the gap.
 */
export function BudgetRedirect() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { data: categories, isLoading } = useCategories(budgetId);

  if (isLoading || !budgetId) {
    return null;
  }

  // Empty budget → onboarding via Manage page
  if (!categories || categories.length === 0) {
    return <Navigate to={`/app/budgets/${budgetId}/manage`} replace />;
  }

  // Established budget → today's day view
  const today = todayISO();
  return <Navigate to={`/app/budgets/${budgetId}/day/${today}`} replace />;
}