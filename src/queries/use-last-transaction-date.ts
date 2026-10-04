import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Date (YYYY-MM-DD) of a budget's most recent transaction, or null if it has none. */
export function useLastTransactionDate(budgetId: string) {
  return useQuery({
    queryKey: ["last-transaction", budgetId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("date")
        .eq("budget_id", budgetId)
        .order("date", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.date ?? null;
    },
  });
}
