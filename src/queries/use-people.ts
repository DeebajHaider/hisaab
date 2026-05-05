import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

export type Person = Database["public"]["Tables"]["people"]["Row"];

export function usePeople(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  return useQuery({
    queryKey: ["people", budgetId, opts.includeArchived ?? false],
    enabled: !!budgetId,
    queryFn: async (): Promise<Person[]> => {
      let query = supabase
        .from("people")
        .select("*")
        .eq("budget_id", budgetId!);

      if (!opts.includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}