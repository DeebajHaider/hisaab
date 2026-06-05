import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/format/date";
import { holdingKeys } from "./holding-keys";
import { holdingHistoryKeys } from "./holding-history-keys";

interface CreateHoldingInput {
  portfolioId: string;
  assetClassId: string;
  name: string;
  ticker?: string | null;
  currency: string;
  originalInvestment: number;
  currentValue: number;
  asOf: string; // YYYY-MM-DD — the date this initial value is from
  notes?: string | null;
}

export function useCreateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHoldingInput) => {
      // .select() is SAFE here: holdings have no membership-creating trigger and
      // the parent portfolio already exists and is owned, so owns_portfolio() is
      // already true. We need the new id to seed the first value-history point.
      const { data: holding, error } = await supabase
        .from("holdings")
        .insert({
          portfolio_id: input.portfolioId,
          asset_class_id: input.assetClassId,
          name: input.name,
          ticker: input.ticker ?? null,
          currency: input.currency,
          original_investment: input.originalInvestment,
          current_value: input.currentValue,
          current_value_at: input.asOf,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: histError } = await supabase
        .from("holding_value_history")
        .insert({
          holding_id: holding.id,
          portfolio_id: input.portfolioId,
          value: input.currentValue,
          as_of: input.asOf,
        });
      if (histError) throw histError;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: holdingKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't add holding");
    },
  });
}

interface UpdateHoldingInput {
  id: string;
  portfolioId: string;
  assetClassId: string;
  name: string;
  ticker?: string | null;
  currency: string;
  originalInvestment: number;
  notes?: string | null;
}

// Edits the holding's details (and corrects the invested figure if it was
// mis-entered). Does NOT touch current value — that's Update value below.
export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateHoldingInput) => {
      const { error } = await supabase
        .from("holdings")
        .update({
          asset_class_id: input.assetClassId,
          name: input.name,
          ticker: input.ticker ?? null,
          currency: input.currency,
          original_investment: input.originalInvestment,
          notes: input.notes ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: holdingKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update holding");
    },
  });
}

// "Update value" — record what the holding is worth as of a date. Always logs a
// value-history point. Only updates the holding's cached current value when the
// point is the newest one (setAsCurrent), so back-filling an older date doesn't
// rewrite what it's worth today.
export function useUpdateHoldingValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      portfolioId,
      currentValue,
      asOf,
      setAsCurrent,
    }: {
      id: string;
      portfolioId: string;
      currentValue: number;
      asOf: string;
      setAsCurrent: boolean;
    }) => {
      if (setAsCurrent) {
        const { error } = await supabase
          .from("holdings")
          .update({ current_value: currentValue, current_value_at: asOf })
          .eq("id", id);
        if (error) throw error;
      }

      const { error: histError } = await supabase
        .from("holding_value_history")
        .insert({
          holding_id: id,
          portfolio_id: portfolioId,
          value: currentValue,
          as_of: asOf,
        });
      if (histError) throw histError;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: holdingKeys.allForPortfolio(vars.portfolioId),
      });
      qc.invalidateQueries({
        queryKey: holdingHistoryKeys.forHolding(vars.id),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update value");
    },
  });
}

// "Add or withdraw" — a capital change, dated today (a present action). The UI
// computes the new invested and current value; today is always the newest point
// so it updates the cached current value too.
export function useAdjustHoldingInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      portfolioId,
      invested,
      currentValue,
    }: {
      id: string;
      portfolioId: string;
      invested: number;
      currentValue: number;
    }) => {
      const asOf = todayISO();
      const { error } = await supabase
        .from("holdings")
        .update({
          original_investment: invested,
          current_value: currentValue,
          current_value_at: asOf,
        })
        .eq("id", id);
      if (error) throw error;

      const { error: histError } = await supabase
        .from("holding_value_history")
        .insert({
          holding_id: id,
          portfolio_id: portfolioId,
          value: currentValue,
          as_of: asOf,
        });
      if (histError) throw histError;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: holdingKeys.allForPortfolio(vars.portfolioId),
      });
      qc.invalidateQueries({
        queryKey: holdingHistoryKeys.forHolding(vars.id),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't adjust investment");
    },
  });
}

export function useSetHoldingArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isArchived,
    }: {
      id: string;
      portfolioId: string;
      isArchived: boolean;
    }) => {
      const { error } = await supabase
        .from("holdings")
        .update({ is_archived: isArchived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: holdingKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update holding");
    },
  });
}
