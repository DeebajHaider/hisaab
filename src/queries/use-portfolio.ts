import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { portfolioKeys } from "./portfolio-keys";
import type { Portfolio } from "./use-portfolios";

export function usePortfolio(portfolioId: string | undefined) {
  return useQuery({
    queryKey: portfolioKeys.detail(portfolioId ?? ""),
    enabled: !!portfolioId,
    queryFn: async (): Promise<Portfolio | null> => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .eq("id", portfolioId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

