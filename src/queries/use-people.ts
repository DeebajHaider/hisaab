import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { peopleKeys } from "./people-keys";
import type { Database } from "@/types/db";

export type Person = Database["public"]["Tables"]["people"]["Row"];

export function usePeople(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  const includeArchived = opts.includeArchived ?? false;
  return useQuery({
    queryKey: budgetId
      ? peopleKeys.byBudgetWithArchived(budgetId, includeArchived)
      : ["people", "none"],
    enabled: !!budgetId,
    queryFn: async (): Promise<Person[]> => {
      let query = supabase
        .from("people")
        .select("*")
        .eq("budget_id", budgetId!);

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
