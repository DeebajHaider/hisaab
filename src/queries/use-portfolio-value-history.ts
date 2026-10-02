import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { HoldingHistoryRow } from "./use-holding-history";

// All value-history rows across every holding in a portfolio. Currency
// isn't denormalized onto this table — the caller joins it from the
// holdings it already has loaded (portfolio-overview.tsx fetches them via
// useHoldings anyway), rather than re-fetching here.
export function usePortfolioValueHistory(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-history", portfolioId ?? ""],
    enabled: !!portfolioId,
    queryFn: async (): Promise<HoldingHistoryRow[]> => {
      const { data, error } = await supabase
        .from("holding_value_history")
        .select("*")
        .eq("portfolio_id", portfolioId!)
        .order("as_of", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
