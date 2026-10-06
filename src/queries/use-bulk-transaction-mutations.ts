import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { invalidateTransactionData } from "./invalidate-transactions";
import type { Transaction } from "./use-transactions";
import type { BulkPatch } from "@/lib/calculations/bulk-edit";

const plural = (n: number) => `${n} transaction${n === 1 ? "" : "s"}`;

function reportError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Unknown error.",
      duration: 6000,
    });
}

interface BulkUpdateInput {
  budgetId: string;
  /** The rows as they are now, so Undo can put them back. */
  rows: Transaction[];
  patch: BulkPatch;
}

async function restoreFields(rows: Transaction[]) {
  const results = await Promise.all(
    rows.map((r) =>
      supabase
        .from("transactions")
        .update({ category_id: r.category_id, item_id: r.item_id, person_id: r.person_id })
        .eq("id", r.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

function offerUndo(
  queryClient: QueryClient,
  budgetId: string,
  message: string,
  undo: () => Promise<void>,
  undoneMessage: string,
) {
  toast(message, {
    duration: 8000,
    action: {
      label: "Undo",
      onClick: () => {
        undo()
          .then(() => {
            invalidateTransactionData(queryClient, budgetId);
            toast.success(undoneMessage);
          })
          .catch(reportError("Couldn't undo."));
      },
    },
  });
}

/** Apply one patch (item/category and/or person) to many transactions. */
export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, patch }: BulkUpdateInput) => {
      const { error } = await supabase
        .from("transactions")
        .update(patch)
        .in(
          "id",
          rows.map((r) => r.id),
        );
      if (error) throw error;
    },
    onSuccess: (_, { budgetId, rows }) => {
      invalidateTransactionData(queryClient, budgetId);
      offerUndo(
        queryClient,
        budgetId,
        `Updated ${plural(rows.length)}.`,
        () => restoreFields(rows),
        "Changes undone.",
      );
    },
    onError: reportError("Couldn't update transactions."),
  });
}

interface BulkDeleteInput {
  budgetId: string;
  rows: Transaction[];
}

/** Delete many transactions at once; Undo re-inserts them with their original ids. */
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows }: BulkDeleteInput) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in(
          "id",
          rows.map((r) => r.id),
        );
      if (error) throw error;
    },
    onSuccess: (_, { budgetId, rows }) => {
      invalidateTransactionData(queryClient, budgetId);
      offerUndo(
        queryClient,
        budgetId,
        `Deleted ${plural(rows.length)}.`,
        async () => {
          const { error } = await supabase.from("transactions").insert(
            rows.map((r) => ({
              id: r.id,
              budget_id: r.budget_id,
              category_id: r.category_id,
              item_id: r.item_id,
              date: r.date,
              amount: r.amount,
              rate: r.rate,
              qty: r.qty,
              person_id: r.person_id,
              notes: r.notes,
            })),
          );
          if (error) throw error;
        },
        `Restored ${plural(rows.length)}.`,
      );
    },
    onError: reportError("Couldn't delete transactions."),
  });
}
