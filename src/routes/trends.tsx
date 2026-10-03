import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeframeSelector } from "@/components/trends/timeframe-selector";
import { MonthlyTotalsChart } from "@/components/charts/monthly-totals-chart";
import { CategoryComparisonChart } from "@/components/charts/category-comparison-chart";
import { CategoryCompositionChart } from "@/components/charts/category-composition-chart";
import { useMonthlyTotals } from "@/queries/use-monthly-totals";
import { useMonthlyCategoryTotals } from "@/queries/use-monthly-category-totals";
import { useEarliestTransactionMonth } from "@/queries/use-earliest-transaction-month";
import {
  resolveTimeframe,
  type Timeframe,
} from "@/lib/calculations/resolve-timeframe";
import { fillMonthGaps } from "@/lib/calculations/fill-month-gaps";
import { defaultSelectedCategories } from "@/lib/calculations/default-selected-categories";
import { assignCategoryColors } from "@/lib/calculations/assign-category-colors";
import {
  currentYearMonth,
  formatMonthLabel,
} from "@/lib/format/year-month";

const NO_CATEGORIES: string[] = [];

export function Trends() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const [timeframe, setTimeframe] = useState<Timeframe>("6M");

  // User's manual chip selection overrides; null means "use default for
  // current data". Reset to null implicitly when timeframe changes by
  // letting useMemo recompute the default and treating null as a sentinel.
  const [manualSelected, setManualSelected] = useState<string[] | null>(null);

  const earliestQuery = useEarliestTransactionMonth(budgetId);
  const earliest = earliestQuery.data ?? null;

  const current = currentYearMonth();
  const range = useMemo(
    () => resolveTimeframe(timeframe, current, earliest),
    [timeframe, current, earliest],
  );

  // Two queries fire in parallel — the 3.5 monthly totals query for the
  // line chart, and the new category-totals query for the two new charts.
  const totalsQuery = useMonthlyTotals(budgetId, range.from, range.to);
  const categoryQuery = useMonthlyCategoryTotals(
    budgetId,
    range.from,
    range.to,
  );

  // Compute defaults for the comparison chart. Recomputed when the data
  // changes (timeframe shift or mutation invalidation).
  const aggregateResult = categoryQuery.data;
  const allCategories = aggregateResult?.categories ?? NO_CATEGORIES;
  const colors = useMemo(
    () => assignCategoryColors(allCategories),
    [allCategories],
  );

  const defaultSelection = useMemo(() => {
    if (!aggregateResult) return [];
    // Compute totals per category for ranking input
    const totals = new Map<string, number>();
    for (const row of aggregateResult.rows) {
      for (const [key, val] of Object.entries(row)) {
        if (key === "yearMonth") continue;
        totals.set(key, (totals.get(key) ?? 0) + (val as number));
      }
    }
    const ranked = aggregateResult.categories.map((name) => ({
      name,
      total: totals.get(name) ?? 0,
    }));
    const totalSpend = Array.from(totals.values()).reduce((s, v) => s + v, 0);
    return defaultSelectedCategories(ranked, totalSpend);
  }, [aggregateResult]);

  // If the user hasn't manually toggled anything, follow the default.
  // Once they toggle, their selection persists across timeframe changes
  // (but categories that no longer appear get filtered out).
  const effectiveSelected =
    manualSelected === null
      ? defaultSelection
      : manualSelected.filter((name) => allCategories.includes(name));

  const handleToggle = (name: string) => {
    const current = manualSelected ?? defaultSelection;
    if (current.includes(name)) {
      setManualSelected(current.filter((n) => n !== name));
    } else {
      setManualSelected([...current, name]);
    }
  };

  if (!budgetId) return null;

  const isLoading =
    earliestQuery.isLoading || totalsQuery.isLoading || categoryQuery.isLoading;
  const sparse = totalsQuery.data ?? [];
  const filled = fillMonthGaps(sparse, range.from, range.to);

  const hasAnyHistory = earliest !== null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Trends</h1>
        <p className="text-sm text-muted-foreground">
          Spending patterns across time.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        {earliest && timeframe !== "1M" && (
          <p className="text-xs text-muted-foreground">
            Tracking since {formatMonthLabel(earliest)}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
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
        <>
          <MonthlyTotalsChart data={filled} />

          <CategoryComparisonChart
            rows={aggregateResult?.rows ?? []}
            available={allCategories}
            selected={effectiveSelected}
            colors={colors}
            onToggleCategory={handleToggle}
          />

          <CategoryCompositionChart
            rows={aggregateResult?.rows ?? []}
            categories={allCategories}
            colors={colors}
          />
        </>
      )}
    </div>
  );
}

