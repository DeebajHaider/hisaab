import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { collectTags } from "@/lib/tags";

/** Tags in use in a budget, most used first. Feeds suggestions and the Ledger filter. */
export function useTags(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["tags", budgetId],
    enabled: !!budgetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("tags")
        .eq("budget_id", budgetId!)
        .filter("tags", "neq", "{}")
        .limit(5000);
      if (error) throw error;
      return collectTags(data ?? []);
    },
  });
}
