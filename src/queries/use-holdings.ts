import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { holdingKeys } from "./holding-keys";

export type Holding = Database["public"]["Tables"]["holdings"]["Row"];

export function useHoldings(
  portfolioId: string | undefined,
  includeArchived = false,
) {
  return useQuery({
    queryKey: holdingKeys.byPortfolio(portfolioId ?? "", includeArchived),
    enabled: !!portfolioId,
    queryFn: async (): Promise<Holding[]> => {
      let query = supabase
        .from("holdings")
        .select("*")
        .eq("portfolio_id", portfolioId!)
        .order("name", { ascending: true });

      if (!includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

