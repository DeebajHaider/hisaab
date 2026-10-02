import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { portfolioKeys } from "./portfolio-keys";

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      // created_by is omitted on purpose — the column defaults to auth.uid().
      const { error } = await supabase.from("portfolios").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.all });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't create portfolio");
    },
  });
}

export function useUpdatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("portfolios")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: portfolioKeys.all });
      qc.invalidateQueries({ queryKey: portfolioKeys.detail(vars.id) });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't rename portfolio");
    },
  });
}

/**
 * Persists the manually-entered FX blend rates (overview page). No toast —
 * this fires on blur as the user types, matching the ergonomics of a
 * free-form inline field rather than a dialog's explicit Save action.
 */
export function useUpdatePortfolioFxRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      fxRates,
    }: {
      id: string;
      fxRates: Record<string, number>;
    }) => {
      const { error } = await supabase
        .from("portfolios")
        .update({ fx_rates: fxRates })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: portfolioKeys.detail(vars.id) });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't save exchange rate");
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // FK cascade removes the portfolio's asset classes, holdings, and history.
      const { error } = await supabase.from("portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.all });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't delete portfolio");
    },
  });
}
