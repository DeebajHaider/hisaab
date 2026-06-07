import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { trendsKeys } from "./trends-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import { type MonthlyTotal } from "@/lib/calculations/aggregate-by-month";

/**
 * Fetch monthly spending totals for a budget via server-side aggregation.
 *
 * Replaces the previous client-side aggregation that hit PostgREST's
 * 1000-row default limit, causing older months to show zero on the
 * "All" timeframe. The SQL function pre-aggregates to one row per month
 * instead of fetching every transaction in the range.
 *
 * Returns only months that have data — zero-filling for the chart's
 * continuous X axis happens in the consumer via fillMonthGaps.
 */
export function useMonthlyTotals(
  budgetId: string | undefined,
  from: YearMonth | undefined,
  to: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && from && to
        ? trendsKeys.monthlyTotals(budgetId, from, to)
        : ["trends", "noop"],
    enabled: !!budgetId && !!from && !!to,
    queryFn: async (): Promise<MonthlyTotal[]> => {
      const start = firstDayOfMonth(from!);
      const end = lastDayOfMonth(to!);

      const { data, error } = await supabase.rpc("budget_monthly_totals", {
        b_id: budgetId!,
        start_date: start,
        end_date: end,
      });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        yearMonth: row.year_month,
        total: Number(row.total),
      }));
    },
  });
}
