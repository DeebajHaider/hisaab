import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Budget } from "@/queries/use-budgets";

/**
 * Fetch a single budget by ID.
 * Returns null (not undefined) when the budget doesn't exist or RLS hides it.
 *
 * `enabled: !!id` skips the query when id is falsy — avoids spurious errors
 * during route transitions when the param hasn't been read yet.
 */
export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: ["budgets", id],
    enabled: !!id,
    queryFn: async (): Promise<Budget | null> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", id!)
        .maybeSingle();   // returns null if no row instead of throwing

      if (error) throw error;
      return data;
    },
  });
}