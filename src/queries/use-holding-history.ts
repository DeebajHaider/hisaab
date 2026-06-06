import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { holdingHistoryKeys } from "./holding-history-keys";

export type HoldingHistoryRow =
  Database["public"]["Tables"]["holding_value_history"]["Row"];

// All recorded value points for one holding, oldest-first. RLS already limits
// this to history rows in portfolios you own.
export function useHoldingHistory(holdingId: string | undefined) {
  return useQuery({
    queryKey: holdingHistoryKeys.forHolding(holdingId ?? ""),
    enabled: !!holdingId,
    queryFn: async (): Promise<HoldingHistoryRow[]> => {
      const { data, error } = await supabase
        .from("holding_value_history")
        .select("*")
        .eq("holding_id", holdingId!)
        .order("as_of", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
