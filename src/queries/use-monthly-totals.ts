import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { trendsKeys } from "./trends-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import {
  aggregateByMonth,
  type MonthlyTotal,
} from "@/lib/calculations/aggregate-by-month";

/**
 * Fetch all transactions in a budget between `from` and `to` (inclusive,
 * both YearMonth values) and aggregate them into monthly totals.
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

      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount")
        .eq("budget_id", budgetId!)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return aggregateByMonth(data ?? []);
    },
  });
}
