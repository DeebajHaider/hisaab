import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyTotals } from "@/queries/use-monthly-totals";
import { addMonths, currentYearMonth, formatMonthLabel } from "@/lib/format/year-month";
import { sparkBars } from "@/lib/calculations/spark-bars";

const SPARK_MONTHS = 6;

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
  const firstMonth = addMonths(thisMonth, -(SPARK_MONTHS - 1));
  const { data, isLoading, isError } = useMonthlyTotals(budgetId, firstMonth, thisMonth);

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
  const months = Array.from({ length: SPARK_MONTHS }, (_, i) => addMonths(firstMonth, i));
  const bars = sparkBars(
    months,
    Object.fromEntries(data.map((row) => [row.yearMonth, row.total])),
  );
  const hasHistory = bars.some((b) => b.total > 0);

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
      {hasHistory && (
        <div
          className="mt-3 flex h-8 items-end gap-1"
          role="img"
          aria-label={`Spending over the last ${SPARK_MONTHS} months`}
        >
          {bars.map((bar) => (
            <div
              key={bar.yearMonth}
              title={`${formatMonthLabel(bar.yearMonth)}: ${currency} ${formatMoney(bar.total)}`}
              className={`flex-1 rounded-sm ${
                bar.yearMonth === thisMonth ? "bg-accent-solid" : "bg-muted-foreground/30"
              }`}
              style={{ height: `${Math.max(bar.height * 100, bar.total > 0 ? 8 : 3)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
