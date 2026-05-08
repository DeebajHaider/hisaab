import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { savingsKeys } from "./savings-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import type { Database } from "@/types/db";

export type SavingsEntry = Database["public"]["Tables"]["savings_entries"]["Row"];

/**
 * Fetch all savings entries in a budget for a given month.
 * Mirrors useIncome — same shape, different table.
 */
export function useSavings(
  budgetId: string | undefined,
  yearMonth: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && yearMonth
        ? savingsKeys.byMonth(budgetId, yearMonth)
        : ["savings", "noop"],
    enabled: !!budgetId && !!yearMonth,
    queryFn: async (): Promise<SavingsEntry[]> => {
      const start = firstDayOfMonth(yearMonth!);
      const end = lastDayOfMonth(yearMonth!);

      const { data, error } = await supabase
        .from("savings_entries")
        .select("*")
        .eq("budget_id", budgetId!)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}