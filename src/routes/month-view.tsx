import { useParams } from "react-router-dom";
import { MonthHeader } from "@/components/transactions/month-header";
import { useMonthTransactions } from "@/queries/use-month-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Phase 3.1 month view: shell + data wiring only.
 * Renders the header, handles loading and empty states, and shows a
 * placeholder count of fetched transactions to confirm the query works.
 *
 * Real summary content (totals, per-person breakdown, charts) arrives
 * in 3.2 and 3.4-3.6.
 */
export function MonthView() {
  const { budgetId, yearMonth } = useParams<{
    budgetId: string;
    yearMonth: string;
  }>();

  const { data: transactions, isLoading } = useMonthTransactions(
    budgetId,
    yearMonth,
  );

  if (!budgetId || !yearMonth) {
    return null; // Router guarantees these; satisfies TS.
  }

  return (
    <div className="space-y-6">
      <MonthHeader budgetId={budgetId} yearMonth={yearMonth} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No transactions logged this month yet.</p>
            <p className="mt-1 text-sm">
              Switch to the Day view to start logging.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"} logged this month.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Summary card and charts coming in Phase 3.2+.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}