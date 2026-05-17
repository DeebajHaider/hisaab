import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import { trendsKeys } from "./trends-keys";
import type { Database } from "@/types/db";

// ----------------------------------------------------------------------------
// Create
// ----------------------------------------------------------------------------

interface CreateTransactionInput {
  budgetId: string;
  categoryId: string;
  itemId: string;
  date: string; // yyyy-mm-dd
  amount: number;
  rate?: number | null;
  qty?: number | null;
  personId?: string | null;
  notes?: string | null;
}

/**
 * Create a transaction. created_by is filled by the database default (auth.uid()).
 *
 * Note: not using .select() to return the row — same RLS-evaluation issue we
 * hit with budgets. The byDay query refetches via invalidation and the new
 * transaction appears in the UI after a short round trip.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { error } = await supabase.from("transactions").insert({
        budget_id: input.budgetId,
        category_id: input.categoryId,
        item_id: input.itemId,
        date: input.date,
        amount: input.amount,
        rate: input.rate ?? null,
        qty: input.qty ?? null,
        person_id: input.personId ?? null,
        notes: input.notes ?? null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate the budget-scoped transactions root, which cascades to
      // every day/month query for this budget.
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byBudget(variables.budgetId),
      });
      // Trends aggregations also need to refresh when transactions change.
      queryClient.invalidateQueries({
        queryKey: trendsKeys.byBudget(variables.budgetId),
      });
    },
  });
}

// ----------------------------------------------------------------------------
// Update
// ----------------------------------------------------------------------------

interface UpdateTransactionInput {
  id: string;
  budgetId: string;        // for cache invalidation
  patch: {
    categoryId?: string;
    itemId?: string;
    date?: string;
    amount?: number;
    rate?: number | null;
    qty?: number | null;
    personId?: string | null;
    notes?: string | null;
  };
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      // Translate camelCase keys to snake_case columns explicitly.
      const dbPatch: Database["public"]["Tables"]["transactions"]["Update"] = {};
      if (input.patch.categoryId !== undefined) dbPatch.category_id = input.patch.categoryId;
      if (input.patch.itemId !== undefined) dbPatch.item_id = input.patch.itemId;
      if (input.patch.date !== undefined) dbPatch.date = input.patch.date;
      if (input.patch.amount !== undefined) dbPatch.amount = input.patch.amount;
      if (input.patch.rate !== undefined) dbPatch.rate = input.patch.rate;
      if (input.patch.qty !== undefined) dbPatch.qty = input.patch.qty;
      if (input.patch.personId !== undefined) dbPatch.person_id = input.patch.personId;
      if (input.patch.notes !== undefined) dbPatch.notes = input.patch.notes;

      const { error } = await supabase
        .from("transactions")
        .update(dbPatch)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Date may have changed — invalidate the whole budget's transactions
      // rather than trying to figure out the old and new days.
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byBudget(variables.budgetId),
      });
      // Trends aggregations also need to refresh when transactions change.
      queryClient.invalidateQueries({
        queryKey: trendsKeys.byBudget(variables.budgetId),
      });
    },
  });
}

// ----------------------------------------------------------------------------
// Delete
// ----------------------------------------------------------------------------

interface DeleteTransactionInput {
  id: string;
  budgetId: string;
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteTransactionInput) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byBudget(variables.budgetId),
      });
      // Trends aggregations also need to refresh when transactions change.
      queryClient.invalidateQueries({
        queryKey: trendsKeys.byBudget(variables.budgetId),
      });
    },
  });
}