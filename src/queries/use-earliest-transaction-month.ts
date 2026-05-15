import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { trendsKeys } from "./trends-keys";
import type { YearMonth } from "@/lib/format/year-month";

/**
 * Fetch the YearMonth of the earliest transaction in a budget.
 * Returns null if the budget has no transactions.
 *
 * Used by the Trends page's "All" timeframe and by the chart caption
 * showing how far back the user's history goes. Cached aggressively
 * (1 hour staleTime) because the answer only changes when the oldest
 * transaction is deleted — extremely rare.
 */
export function useEarliestTransactionMonth(budgetId: string | undefined) {
  return useQuery({
    queryKey: budgetId ? trendsKeys.earliest(budgetId) : ["trends", "noop"],
    enabled: !!budgetId,
    staleTime: 60 * 60 * 1000, // 1 hour
    queryFn: async (): Promise<YearMonth | null> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("date")
        .eq("budget_id", budgetId!)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return data.date.slice(0, 7);
    },
  });
}
