import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { trendsKeys } from "./trends-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import {
  aggregateByCategoryAndMonth,
  type AggregateResult,
} from "@/lib/calculations/aggregate-by-category-month";

/**
 * Fetch transactions in a budget across a YearMonth range, joining
 * category names, and aggregate into Recharts-friendly rows.
 *
 * Backs both the category comparison and composition charts on the
 * Trends page — one query, two visualisations. Cache key is separate
 * from useMonthlyTotals (3.5) because the SELECT shape differs (this
 * one includes the category join) and they're consumed differently.
 */
export function useMonthlyCategoryTotals(
  budgetId: string | undefined,
  from: YearMonth | undefined,
  to: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && from && to
        ? trendsKeys.monthlyCategoryTotals(budgetId, from, to)
        : ["trends", "noop"],
    enabled: !!budgetId && !!from && !!to,
    queryFn: async (): Promise<AggregateResult> => {
      const start = firstDayOfMonth(from!);
      const end = lastDayOfMonth(to!);

      const { data, error } = await supabase
        .from("transactions")
        .select("date, amount, category:categories(name)")
        .eq("budget_id", budgetId!)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return aggregateByCategoryAndMonth(
        (data ?? []) as unknown as Array<{
          date: string;
          amount: number;
          category: { name: string } | null;
        }>,
      );
    },
  });
}

