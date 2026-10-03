import type { QueryClient } from "@tanstack/react-query";
import { transactionKeys } from "./transaction-keys";
import { trendsKeys } from "./trends-keys";

/** Everything derived from a budget's transactions: the day/month/ledger
 *  lists, trend aggregations, the search's recently-used ranking, and target
 *  progress. Call after any write. */
export function invalidateTransactionData(queryClient: QueryClient, budgetId: string) {
  queryClient.invalidateQueries({ queryKey: transactionKeys.byBudget(budgetId) });
  queryClient.invalidateQueries({ queryKey: trendsKeys.byBudget(budgetId) });
  queryClient.invalidateQueries({ queryKey: ["recent-items", budgetId] });
  // Target progress is keyed by target id, not budget, so invalidate the lot.
  queryClient.invalidateQueries({ queryKey: ["target-spent"] });
}
