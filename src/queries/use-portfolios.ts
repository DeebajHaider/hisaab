import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { portfolioKeys } from "./portfolio-keys";

export type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"];

export function usePortfolios() {
  return useQuery({
    queryKey: portfolioKeys.all,
    queryFn: async (): Promise<Portfolio[]> => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
