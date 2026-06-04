import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/format/date";
import { holdingKeys } from "./holding-keys";

interface CreateHoldingInput {
  portfolioId: string;
  assetClassId: string;
  name: string;
  ticker?: string | null;
  currency: string;
  originalInvestment: number;
  currentValue: number;
  notes?: string | null;
}

export function useCreateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHoldingInput) => {
      // .select() is SAFE here, unlike on the budget side. The no-.select() rule
      // existed because budget creation fired a trigger that wrote membership in
      // the same statement the RETURNING clause's SELECT policy tried to read.
      // Holdings have no such trigger, and the parent portfolio already exists and
      // is owned by us — so owns_portfolio() is already true. We need the new id to
      // seed the first value-history point, so returning the row is the clean way.
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
          current_value_at: new Date().toISOString(),
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Seed value history so the progression graph (6.7) has a starting point.
      const { error: histError } = await supabase
        .from("holding_value_history")
        .insert({
          holding_id: holding.id,
          portfolio_id: input.portfolioId,
          value: input.currentValue,
          as_of: todayISO(),
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
  portfolioId: string; // for invalidation
  assetClassId: string;
  name: string;
  ticker?: string | null;
  currency: string;
  originalInvestment: number;
  notes?: string | null;
}

// Edits the holding's *details*. Current value is intentionally NOT here — that
// gets its own "update value" action in 6.4, kept separate so the app can tell
// "I'm fixing details" apart from "the value moved."
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
