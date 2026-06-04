import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { assetClassKeys } from "./asset-class-keys";

export type AssetClass = Database["public"]["Tables"]["asset_classes"]["Row"];

export function useAssetClasses(
  portfolioId: string | undefined,
  includeArchived = false,
) {
  return useQuery({
    queryKey: assetClassKeys.byPortfolio(portfolioId ?? "", includeArchived),
    enabled: !!portfolioId,
    queryFn: async (): Promise<AssetClass[]> => {
      let query = supabase
        .from("asset_classes")
        .select("*")
        .eq("portfolio_id", portfolioId!)
        .order("name", { ascending: true });

      // Default view hides archived classes; the manage screen can opt in.
      if (!includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
