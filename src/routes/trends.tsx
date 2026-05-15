import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeframeSelector } from "@/components/trends/timeframe-selector";
import { MonthlyTotalsChart } from "@/components/charts/monthly-totals-chart";
import { useMonthlyTotals } from "@/queries/use-monthly-totals";
import { useEarliestTransactionMonth } from "@/queries/use-earliest-transaction-month";
import {
  resolveTimeframe,
  type Timeframe,
} from "@/lib/calculations/resolve-timeframe";
import { fillMonthGaps } from "@/lib/calculations/fill-month-gaps";
import {
  currentYearMonth,
  formatMonthLabel,
} from "@/lib/format/year-month";

export function Trends() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const [timeframe, setTimeframe] = useState<Timeframe>("6M");

  const earliestQuery = useEarliestTransactionMonth(budgetId);
  const earliest = earliestQuery.data ?? null;

  const current = currentYearMonth();
  const range = useMemo(
    () => resolveTimeframe(timeframe, current, earliest),
    [timeframe, current, earliest],
  );

  const totalsQuery = useMonthlyTotals(budgetId, range.from, range.to);

  if (!budgetId) return null;

  const isLoading = earliestQuery.isLoading || totalsQuery.isLoading;
  const sparse = totalsQuery.data ?? [];
  const filled = fillMonthGaps(sparse, range.from, range.to);

  const hasAnyHistory = earliest !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trends</h1>
        <p className="text-sm text-muted-foreground">
          Spending patterns across time.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        {earliest && timeframe !== "1M" && (
          <p className="text-xs text-muted-foreground">
            Tracking since {formatMonthLabel(earliest)}
          </p>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : !hasAnyHistory ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No spending data yet.</p>
            <p className="mt-1 text-sm">
              Log transactions from the Day view to see trends here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MonthlyTotalsChart data={filled} />
      )}
    </div>
  );
}

