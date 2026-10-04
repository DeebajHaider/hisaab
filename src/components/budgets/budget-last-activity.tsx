import { useLastTransactionDate } from "@/queries/use-last-transaction-date";
import { formatDayLabel } from "@/lib/format/date";

/** When a budget last had a transaction, for its card. Quiet while loading or on error. */
export function BudgetLastActivity({ budgetId }: { budgetId: string }) {
  const { data, isError } = useLastTransactionDate(budgetId);
  if (isError || data === undefined) return null;

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {data ? `Last transaction ${formatDayLabel(data)}` : "No transactions yet"}
    </p>
  );
}
