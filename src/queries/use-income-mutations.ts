import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { incomeKeys } from "./income-keys";
import type { Database } from "@/types/db";

// ----------------------------------------------------------------------------
// Create
// ----------------------------------------------------------------------------

interface CreateIncomeInput {
  budgetId: string;
  source: string;
  amount: number;
  date: string; // yyyy-mm-dd
  notes?: string | null;
}

/**
 * Create an income entry. created_by defaults to auth.uid() at the DB level.
 * No .select() — invalidate and refetch instead, mirroring useCreateTransaction.
 */
export function useCreateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      const { error } = await supabase.from("income_entries").insert({
        budget_id: input.budgetId,
        source: input.source,
        amount: input.amount,
        date: input.date,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: incomeKeys.byBudget(variables.budgetId),
      });
    },
  });
}

// ----------------------------------------------------------------------------
// Update
// ----------------------------------------------------------------------------

interface UpdateIncomeInput {
  id: string;
  budgetId: string;
  patch: {
    source?: string;
    amount?: number;
    date?: string;
    notes?: string | null;
  };
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateIncomeInput) => {
      const dbPatch: Database["public"]["Tables"]["income_entries"]["Update"] = {};
      if (input.patch.source !== undefined) dbPatch.source = input.patch.source;
      if (input.patch.amount !== undefined) dbPatch.amount = input.patch.amount;
      if (input.patch.date !== undefined) dbPatch.date = input.patch.date;
      if (input.patch.notes !== undefined) dbPatch.notes = input.patch.notes;

      const { error } = await supabase
        .from("income_entries")
        .update(dbPatch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: incomeKeys.byBudget(variables.budgetId),
      });
    },
  });
}

// ----------------------------------------------------------------------------
// Delete
// ----------------------------------------------------------------------------

interface DeleteIncomeInput {
  id: string;
  budgetId: string;
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteIncomeInput) => {
      const { error } = await supabase
        .from("income_entries")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: incomeKeys.byBudget(variables.budgetId),
      });
    },
  });
}