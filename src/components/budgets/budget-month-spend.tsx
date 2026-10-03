import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyTotals } from "@/queries/use-monthly-totals";
import { addMonths, currentYearMonth, formatMonthLabel } from "@/lib/format/year-month";

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** This month's spending (and last month's, for reference) for a budget card. */
export function BudgetMonthSpend({
  budgetId,
  currency,
}: {
  budgetId: string;
  currency: string;
}) {
  const thisMonth = currentYearMonth();
  const lastMonth = addMonths(thisMonth, -1);
  const { data, isLoading, isError } = useMonthlyTotals(budgetId, lastMonth, thisMonth);

  if (isError) return null;

  if (isLoading || !data) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-36" />
      </div>
    );
  }

  const totalFor = (ym: string) => data.find((row) => row.yearMonth === ym)?.total ?? 0;
  const current = totalFor(thisMonth);
  const previous = totalFor(lastMonth);

  return (
    <div>
      <p className="text-xs text-muted-foreground">{formatMonthLabel(thisMonth)}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
        {currency} {formatMoney(current)}
      </p>
      {previous > 0 && (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          Last month {currency} {formatMoney(previous)}
        </p>
      )}
    </div>
  );
}
