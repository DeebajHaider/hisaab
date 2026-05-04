import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

// Convenience: extract the row type for a budget straight from the generated types.
// This way the type updates automatically if we change the schema.
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];

/**
 * Fetch all budgets the current user has access to.
 * RLS handles filtering — the database returns only budgets where the user
 * is a member, regardless of what we ask for.
 */
export function useBudgets() {
  return useQuery({
    // Cache key. If we later need to invalidate this, we use this exact key.
    queryKey: ["budgets"],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("created_at", { ascending: false });

      // supabase-js doesn't throw on errors — it returns them.
      // We re-throw so TanStack Query treats it as a failed query.
      if (error) throw error;

      return data;
    },
  });
}

